import { createClient } from "@/lib/supabase/server";
import type { StaffProfile } from "@/lib/auth";
import { one, pagedRows, todayIST } from "@/lib/data/helpers";
import { daysInMonth, toISO } from "@/lib/dates";
import {
  DEFAULT_RULES,
  VEHICLE_CATEGORIES,
  evaluateVehicleDashboard,
  normalizeRule,
  type HolidayItem,
  type IncentiveRule,
  type VehicleCategory,
  type VehicleDashboardData,
} from "@/lib/incentives";

export type CombinedCsePayout = {
  staffId: string;
  staffName: string;
  employeeCode: string | null;
  counts: Record<VehicleCategory, number>;
  nets: Record<VehicleCategory, number>;
  totalApproved: number;
  totalMissedDays: number;
  totalDailyEarned: number;
  totalDailyPenalty: number;
  totalNet: number;
};

export type IncentivesDashboardPayload = {
  monthIso: string;
  todayIso: string;
  canManage: boolean;
  migrationMissing: boolean;
  rules: Record<VehicleCategory, IncentiveRule>;
  holidays: HolidayItem[];
  dashboards: Record<VehicleCategory, VehicleDashboardData>;
  overallByCse: CombinedCsePayout[];
};

type ClaimJoinRow = {
  id: string;
  staff_id: string | null;
  employee_name: string;
  payment_date: string;
  vehicle_category: string | null;
  policies:
    | { vehicle_category: string | null; policy_types: { code: string } | { code: string }[] | null }
    | { vehicle_category: string | null; policy_types: { code: string } | { code: string }[] | null }[]
    | null;
};

function isMissingRelation(err: { code?: string; message?: string } | null | undefined): boolean {
  if (!err) return false;
  if (err.code === "42P01" || err.code === "PGRST205") return true;
  const msg = err.message ?? "";
  return msg.includes("incentive_rules") || msg.includes("incentive_holidays") || msg.includes("does not exist");
}

function resolveVehicleCategory(row: ClaimJoinRow): VehicleCategory {
  const direct = row.vehicle_category?.toUpperCase();
  if (direct === "2W" || direct === "4W" || direct === "CV") return direct;

  const policy = one(row.policies);
  const pCat = policy?.vehicle_category?.toUpperCase();
  if (pCat === "2W" || pCat === "4W" || pCat === "CV") return pCat;

  const pType = one(policy?.policy_types)?.code;
  if (pType === "bike") return "2W";
  if (pType === "car") return "4W";
  return "CV";
}

/** Loads rules, holidays, approved claims, and calculated dashboards for 2W, 4W, and CV. */
export async function getIncentivesDashboard(
  monthIso: string,
  staff: StaffProfile,
  canManage: boolean,
): Promise<IncentivesDashboardPayload> {
  const db = await createClient();
  const todayIso = todayIST();
  const [y, m] = monthIso.split("-").map(Number);
  const monthStartIso = toISO(y, m, 1);
  const monthEndIso = toISO(y, m, daysInMonth(y, m));

  const [rulesRes, holidaysRes, staffRes, claimRows] = await Promise.all([
    db.from("incentive_rules").select("*"),
    db
      .from("incentive_holidays")
      .select("holiday_date, label")
      .gte("holiday_date", monthStartIso)
      .lte("holiday_date", monthEndIso)
      .order("holiday_date", { ascending: true }),
    canManage
      ? db
          .from("staff_users")
          .select("id, full_name, employee_code, role")
          .eq("is_active", true)
          .order("full_name", { ascending: true })
      : Promise.resolve({ data: null, error: null }),
    pagedRows<ClaimJoinRow>(
      (from, to) => {
        let q = db
          .from("claims")
          .select("id, staff_id, employee_name, payment_date, vehicle_category, policies(vehicle_category, policy_types(code))")
          .eq("status", "approved")
          .gte("payment_date", monthStartIso)
          .lte("payment_date", monthEndIso);
        if (!canManage) {
          q = q.eq("staff_id", staff.id);
        }
        return q.order("payment_date", { ascending: true }).order("id", { ascending: true }).range(from, to);
      },
      "Approved claims for incentives",
    ),
  ]);

  let migrationMissing = false;
  const rules: Record<VehicleCategory, IncentiveRule> = {
    "2W": DEFAULT_RULES["2W"],
    "4W": DEFAULT_RULES["4W"],
    CV: DEFAULT_RULES.CV,
  };

  if (rulesRes.error) {
    if (isMissingRelation(rulesRes.error)) {
      migrationMissing = true;
    } else {
      throw new Error(`Incentive rules: ${rulesRes.error.message}`);
    }
  } else {
    for (const row of rulesRes.data ?? []) {
      const cat = String(row.vehicle_category) as VehicleCategory;
      if (cat === "2W" || cat === "4W" || cat === "CV") {
        rules[cat] = normalizeRule(cat, row as Record<string, unknown>);
      }
    }
  }

  let holidays: HolidayItem[] = [];
  if (holidaysRes.error) {
    if (isMissingRelation(holidaysRes.error)) {
      migrationMissing = true;
    } else {
      throw new Error(`Incentive holidays: ${holidaysRes.error.message}`);
    }
  } else {
    holidays = (holidaysRes.data ?? []).map((h) => ({
      date: h.holiday_date as string,
      label: h.label as string,
    }));
  }

  // Roster scoped cleanly: self-only for CSEs, all active operational staff (+ claim contributors) for Admin.
  const staffMap = new Map<string, { id: string; name: string; employeeCode: string | null }>();
  if (canManage) {
    if (staffRes.error) throw new Error(`Staff roster: ${staffRes.error.message}`);
    for (const row of staffRes.data ?? []) {
      staffMap.set(row.id as string, {
        id: row.id as string,
        name: row.full_name as string,
        employeeCode: (row.employee_code as string | null) ?? null,
      });
    }
    for (const c of claimRows) {
      if (c.staff_id && !staffMap.has(c.staff_id)) {
        staffMap.set(c.staff_id, {
          id: c.staff_id,
          name: c.employee_name || "Unknown agent",
          employeeCode: null,
        });
      }
    }
  } else {
    staffMap.set(staff.id, {
      id: staff.id,
      name: staff.full_name,
      employeeCode: null,
    });
  }

  const staffList = Array.from(staffMap.values());
  const approvedClaims = claimRows
    .filter((c) => Boolean(c.staff_id))
    .map((c) => ({
      staffId: c.staff_id as string,
      paymentDate: c.payment_date,
      vehicleCategory: resolveVehicleCategory(c),
    }));

  const dashboards = {} as Record<VehicleCategory, VehicleDashboardData>;
  for (const cat of VEHICLE_CATEGORIES) {
    dashboards[cat.key] = evaluateVehicleDashboard({
      category: cat.key,
      label: cat.label,
      monthIso,
      todayIso,
      rule: rules[cat.key],
      holidays,
      staffList,
      approvedClaims,
    });
  }

  // Combine 2W + 4W + CV per CSE for overview dashboard ranking.
  const combinedMap = new Map<string, CombinedCsePayout>();
  for (const s of staffList) {
    combinedMap.set(s.id, {
      staffId: s.id,
      staffName: s.name,
      employeeCode: s.employeeCode,
      counts: { "2W": 0, "4W": 0, CV: 0 },
      nets: { "2W": 0, "4W": 0, CV: 0 },
      totalApproved: 0,
      totalMissedDays: 0,
      totalDailyEarned: 0,
      totalDailyPenalty: 0,
      totalNet: 0,
    });
  }

  for (const cat of VEHICLE_CATEGORIES) {
    for (const entry of dashboards[cat.key].entries) {
      const target = combinedMap.get(entry.staffId);
      if (!target) continue;
      target.counts[cat.key] = entry.approvedCount;
      target.nets[cat.key] = entry.netIncentive;
      target.totalApproved += entry.approvedCount;
      target.totalMissedDays += entry.missedDays;
      target.totalDailyEarned += entry.dailyEarned;
      target.totalDailyPenalty += entry.dailyPenalty;
      target.totalNet += entry.netIncentive;
    }
  }

  const overallByCse = Array.from(combinedMap.values()).sort(
    (a, b) =>
      b.totalNet - a.totalNet ||
      b.totalApproved - a.totalApproved ||
      a.staffName.localeCompare(b.staffName),
  );

  return {
    monthIso,
    todayIso,
    canManage,
    migrationMissing,
    rules,
    holidays,
    dashboards,
    overallByCse,
  };
}
