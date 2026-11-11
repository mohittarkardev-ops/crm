import { daysInMonth, mondayIndex, pad2, toISO } from "@/lib/dates";

export type VehicleCategory = "2W" | "4W" | "CV";
export type PayoutMode = "flat_slab" | "per_payment" | "per_bundle";

export type IncentiveSlab = {
  minPayments: number;
  amount: number;
};

export type IncentiveRule = {
  vehicleCategory: VehicleCategory;
  isActive: boolean;
  payoutMode: PayoutMode;
  monthlyMinPayments: number;
  dailyTarget: number;
  dailyBonusAmount: number;
  dailyForfeitAmount: number;
  workingDays: number[]; // ISO weekdays 1 (Mon) .. 7 (Sun)
  slabs: IncentiveSlab[];
};

export type HolidayItem = {
  date: string;
  label: string;
};

export type DailyBreakdown = {
  date: string;
  weekday: number; // 1..7
  status: "met" | "missed" | "holiday" | "weekend";
  holidayLabel?: string;
  approvedCount: number;
  bonus: number;
  forfeit: number;
};

export type CseVehicleIncentive = {
  staffId: string;
  staffName: string;
  employeeCode: string | null;
  vehicleCategory: VehicleCategory;
  approvedCount: number;
  qualified: boolean;
  neededForMin: number;
  activeSlab: IncentiveSlab | null;
  nextSlab: IncentiveSlab | null;
  neededForNextSlab: number;
  potentialSlabIfQualified: number;
  grossSlabIncentive: number;
  evaluatedWorkingDays: number;
  completedDays: number;
  missedDays: number;
  dailyEarned: number;
  dailyPenalty: number;
  dailyMissedBonus: number;
  netIncentive: number;
  days: DailyBreakdown[];
};

export type VehicleDashboardData = {
  category: VehicleCategory;
  label: string;
  rule: IncentiveRule;
  totalApproved: number;
  qualifiedCount: number;
  totalMissedDays: number;
  totalDailyEarned: number;
  totalDailyPenalty: number;
  totalGrossSlab: number;
  totalNetPayable: number;
  entries: CseVehicleIncentive[];
};

export const VEHICLE_CATEGORIES: { key: VehicleCategory; label: string; shortLabel: string }[] = [
  { key: "2W", label: "Two Wheeler (2W)", shortLabel: "2W" },
  { key: "4W", label: "Four Wheeler (4W)", shortLabel: "4W" },
  { key: "CV", label: "Commercial Vehicle (CV)", shortLabel: "CV" },
];

export const PAYOUT_MODE_LABELS: Record<PayoutMode, string> = {
  flat_slab: "Flat slab bonus",
  per_payment: "Rate per payment",
  per_bundle: "Per bundle step",
};

export const WEEKDAYS = [
  { value: 1, short: "Mon", label: "Monday" },
  { value: 2, short: "Tue", label: "Tuesday" },
  { value: 3, short: "Wed", label: "Wednesday" },
  { value: 4, short: "Thu", label: "Thursday" },
  { value: 5, short: "Fri", label: "Friday" },
  { value: 6, short: "Sat", label: "Saturday" },
  { value: 7, short: "Sun", label: "Sunday" },
];

export const DEFAULT_RULES: Record<VehicleCategory, IncentiveRule> = {
  "2W": {
    vehicleCategory: "2W",
    isActive: true,
    payoutMode: "flat_slab",
    monthlyMinPayments: 60,
    dailyTarget: 2,
    dailyBonusAmount: 0,
    dailyForfeitAmount: 50,
    workingDays: [1, 2, 3, 4, 5, 6],
    slabs: [
      { minPayments: 20, amount: 100 },
      { minPayments: 40, amount: 250 },
      { minPayments: 60, amount: 500 },
    ],
  },
  "4W": {
    vehicleCategory: "4W",
    isActive: true,
    payoutMode: "flat_slab",
    monthlyMinPayments: 30,
    dailyTarget: 1,
    dailyBonusAmount: 0,
    dailyForfeitAmount: 75,
    workingDays: [1, 2, 3, 4, 5, 6],
    slabs: [
      { minPayments: 15, amount: 200 },
      { minPayments: 30, amount: 500 },
      { minPayments: 45, amount: 900 },
    ],
  },
  CV: {
    vehicleCategory: "CV",
    isActive: true,
    payoutMode: "flat_slab",
    monthlyMinPayments: 20,
    dailyTarget: 1,
    dailyBonusAmount: 0,
    dailyForfeitAmount: 100,
    workingDays: [1, 2, 3, 4, 5, 6],
    slabs: [
      { minPayments: 10, amount: 300 },
      { minPayments: 20, amount: 750 },
      { minPayments: 35, amount: 1500 },
    ],
  },
};

export function normalizeSlabs(raw: unknown): IncentiveSlab[] {
  if (!Array.isArray(raw)) return [];
  const dedup = new Map<number, number>();
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const min = Math.floor(Number((item as Record<string, unknown>).minPayments));
    const amt = Number((item as Record<string, unknown>).amount);
    if (Number.isFinite(min) && min >= 1 && Number.isFinite(amt) && amt >= 0) {
      dedup.set(min, amt);
    }
  }
  return Array.from(dedup.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([minPayments, amount]) => ({ minPayments, amount }));
}

export function normalizeRule(cat: VehicleCategory, row?: Record<string, unknown> | null): IncentiveRule {
  const def = DEFAULT_RULES[cat];
  if (!row) return def;
  const mode = String(row.payout_mode ?? def.payoutMode);
  const payoutMode: PayoutMode =
    mode === "per_payment" || mode === "per_bundle" ? mode : "flat_slab";
  const workingDays = Array.isArray(row.working_days)
    ? Array.from(
        new Set(
          row.working_days
            .map((d) => Number(d))
            .filter((d) => Number.isInteger(d) && d >= 1 && d <= 7),
        ),
      ).sort((a, b) => a - b)
    : def.workingDays;

  const parsedSlabs = normalizeSlabs(row.slabs);
  return {
    vehicleCategory: cat,
    isActive: typeof row.is_active === "boolean" ? row.is_active : def.isActive,
    payoutMode,
    monthlyMinPayments: Math.max(0, Math.floor(Number(row.monthly_min_payments ?? def.monthlyMinPayments))),
    dailyTarget: Math.max(0, Math.floor(Number(row.daily_target ?? def.dailyTarget))),
    dailyBonusAmount: Math.max(0, Number(row.daily_bonus_amount ?? def.dailyBonusAmount)),
    dailyForfeitAmount: Math.max(0, Number(row.daily_forfeit_amount ?? def.dailyForfeitAmount)),
    workingDays: workingDays.length > 0 ? workingDays : def.workingDays,
    slabs: parsedSlabs.length > 0 ? parsedSlabs : def.slabs,
  };
}

/** Computes active slab, next slab, and raw slab rupee value before min-payment & daily adjustments. */
export function computeSlabBreakdown(rule: IncentiveRule, approvedCount: number) {
  const sorted = [...rule.slabs].sort((a, b) => a.minPayments - b.minPayments);
  let activeSlab: IncentiveSlab | null = null;
  let nextSlab: IncentiveSlab | null = null;

  for (const s of sorted) {
    if (approvedCount >= s.minPayments) {
      activeSlab = s;
    } else if (!nextSlab) {
      nextSlab = s;
    }
  }

  let potentialSlab = 0;
  if (rule.payoutMode === "flat_slab") {
    potentialSlab = activeSlab ? activeSlab.amount : 0;
  } else if (rule.payoutMode === "per_payment") {
    potentialSlab = activeSlab ? approvedCount * activeSlab.amount : 0;
  } else {
    // per_bundle: uses the first slab (e.g. every 20 payments = ₹100) or matched step bundle.
    const step = sorted[0];
    if (step && step.minPayments > 0) {
      potentialSlab = Math.floor(approvedCount / step.minPayments) * step.amount;
    }
  }

  const qualified = rule.isActive && approvedCount >= rule.monthlyMinPayments;
  const grossSlabIncentive = qualified ? potentialSlab : 0;

  return {
    activeSlab,
    nextSlab,
    neededForNextSlab: nextSlab ? Math.max(0, nextSlab.minPayments - approvedCount) : 0,
    neededForMin: Math.max(0, rule.monthlyMinPayments - approvedCount),
    qualified,
    potentialSlabIfQualified: potentialSlab,
    grossSlabIncentive,
  };
}

/** Pure simulator used both in Server calculations and the interactive Rule Editor preview. */
export function simulateRulePayout(
  rule: IncentiveRule,
  approvedCount: number,
  completedDays: number,
  missedDays: number,
) {
  const slab = computeSlabBreakdown(rule, approvedCount);
  const dailyEarned = rule.isActive ? completedDays * rule.dailyBonusAmount : 0;
  const dailyPenalty = rule.isActive ? missedDays * rule.dailyForfeitAmount : 0;
  const dailyMissedBonus = rule.isActive ? missedDays * rule.dailyBonusAmount : 0;
  const netIncentive = rule.isActive ? Math.max(0, slab.grossSlabIncentive + dailyEarned - dailyPenalty) : 0;
  return { ...slab, dailyEarned, dailyPenalty, dailyMissedBonus, netIncentive };
}

/** Evaluates one vehicle category across every CSE for the requested YYYY-MM month up to `todayIso`. */
export function evaluateVehicleDashboard(args: {
  category: VehicleCategory;
  label: string;
  monthIso: string; // YYYY-MM
  todayIso: string; // YYYY-MM-DD
  rule: IncentiveRule;
  holidays: HolidayItem[];
  staffList: { id: string; name: string; employeeCode: string | null }[];
  approvedClaims: { staffId: string; paymentDate: string; vehicleCategory: VehicleCategory }[];
}): VehicleDashboardData {
  const [yearStr, monthStr] = args.monthIso.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const lastDayNum = daysInMonth(year, month);
  const monthEndIso = toISO(year, month, lastDayNum);
  const monthStartIso = toISO(year, month, 1);

  const holidayMap = new Map<string, string>();
  for (const h of args.holidays) {
    if (h.date >= monthStartIso && h.date <= monthEndIso) {
      holidayMap.set(h.date, h.label);
    }
  }

  // Only evaluate working days up to `todayIso` (or end of historical months; 0 days for future months).
  const maxDayIso = args.todayIso < monthStartIso ? "" : args.todayIso < monthEndIso ? args.todayIso : monthEndIso;
  const workingDaySet = new Set(args.rule.workingDays);

  // Pre-index daily approved claim counts per staff member for this vehicle category.
  const countsByStaffDay = new Map<string, Map<string, number>>();
  const totalByStaff = new Map<string, number>();

  for (const c of args.approvedClaims) {
    if (c.vehicleCategory !== args.category) continue;
    totalByStaff.set(c.staffId, (totalByStaff.get(c.staffId) ?? 0) + 1);
    let dayMap = countsByStaffDay.get(c.staffId);
    if (!dayMap) {
      dayMap = new Map();
      countsByStaffDay.set(c.staffId, dayMap);
    }
    dayMap.set(c.paymentDate, (dayMap.get(c.paymentDate) ?? 0) + 1);
  }

  const entries: CseVehicleIncentive[] = args.staffList.map((s) => {
    const dayCounts = countsByStaffDay.get(s.id);
    const approvedCount = totalByStaff.get(s.id) ?? 0;

    const days: DailyBreakdown[] = [];
    let evaluatedWorkingDays = 0;
    let completedDays = 0;
    let missedDays = 0;

    if (maxDayIso) {
      const maxDayNum = Number(maxDayIso.slice(8, 10));
      for (let d = 1; d <= maxDayNum; d++) {
        const date = toISO(year, month, d);
        const weekday = mondayIndex(year, month, d) + 1; // 1=Mon .. 7=Sun
        const count = dayCounts?.get(date) ?? 0;
        const holidayLabel = holidayMap.get(date);

        if (holidayLabel) {
          days.push({ date, weekday, status: "holiday", holidayLabel, approvedCount: count, bonus: 0, forfeit: 0 });
          continue;
        }
        if (!workingDaySet.has(weekday)) {
          days.push({ date, weekday, status: "weekend", approvedCount: count, bonus: 0, forfeit: 0 });
          continue;
        }

        evaluatedWorkingDays += 1;
        const met = args.rule.dailyTarget <= 0 || count >= args.rule.dailyTarget;
        if (met) {
          completedDays += 1;
          days.push({
            date,
            weekday,
            status: "met",
            approvedCount: count,
            bonus: args.rule.isActive ? args.rule.dailyBonusAmount : 0,
            forfeit: 0,
          });
        } else {
          missedDays += 1;
          days.push({
            date,
            weekday,
            status: "missed",
            approvedCount: count,
            bonus: 0,
            forfeit: args.rule.isActive ? args.rule.dailyForfeitAmount : 0,
          });
        }
      }
    }

    const sim = simulateRulePayout(args.rule, approvedCount, completedDays, missedDays);

    return {
      staffId: s.id,
      staffName: s.name,
      employeeCode: s.employeeCode,
      vehicleCategory: args.category,
      approvedCount,
      qualified: sim.qualified,
      neededForMin: sim.neededForMin,
      activeSlab: sim.activeSlab,
      nextSlab: sim.nextSlab,
      neededForNextSlab: sim.neededForNextSlab,
      potentialSlabIfQualified: sim.potentialSlabIfQualified,
      grossSlabIncentive: sim.grossSlabIncentive,
      evaluatedWorkingDays,
      completedDays,
      missedDays,
      dailyEarned: sim.dailyEarned,
      dailyPenalty: sim.dailyPenalty,
      dailyMissedBonus: sim.dailyMissedBonus,
      netIncentive: sim.netIncentive,
      days,
    };
  });

  // Order highest earners / highest approved counts first.
  entries.sort(
    (a, b) =>
      b.netIncentive - a.netIncentive ||
      b.approvedCount - a.approvedCount ||
      a.staffName.localeCompare(b.staffName),
  );

  return {
    category: args.category,
    label: args.label,
    rule: args.rule,
    totalApproved: entries.reduce((sum, e) => sum + e.approvedCount, 0),
    qualifiedCount: entries.filter((e) => e.qualified).length,
    totalMissedDays: entries.reduce((sum, e) => sum + e.missedDays, 0),
    totalDailyEarned: entries.reduce((sum, e) => sum + e.dailyEarned, 0),
    totalDailyPenalty: entries.reduce((sum, e) => sum + e.dailyPenalty, 0),
    totalGrossSlab: entries.reduce((sum, e) => sum + e.grossSlabIncentive, 0),
    totalNetPayable: entries.reduce((sum, e) => sum + e.netIncentive, 0),
    entries,
  };
}

export function formatMonthTitle(monthIso: string): string {
  const [y, m] = monthIso.split("-").map(Number);
  if (!y || !m) return monthIso;
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function shiftMonthIso(monthIso: string, delta: number): string {
  const [y, m] = monthIso.split("-").map(Number);
  if (!y || !m) return monthIso;
  const idx = y * 12 + (m - 1) + delta;
  return `${Math.floor(idx / 12)}-${pad2((idx % 12) + 1)}`;
}
