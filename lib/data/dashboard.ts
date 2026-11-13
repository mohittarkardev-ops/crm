import { createClient } from "@/lib/supabase/server";
import {
  addDays,
  countOf,
  dateIST,
  daysBetween,
  monthStart,
  one,
  pagedRows,
  policyState,
  rowsOf,
  todayIST,
} from "@/lib/data/helpers";
import type {
  ActiveRenewedMetric,
  BusinessCategorySlice,
  BusinessPeriodData,
  CategorySlice,
  ChartDatum,
  DashboardData,
  DashboardPolicyCategory,
  DashboardTimeRange,
  UpcomingRenewal,
} from "@/lib/data/types";
import { categoryLabel, type PolicyStatus } from "@/lib/status";

const head = { count: "exact", head: true } as const;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const COLORS: Record<string, string> = {
  car: "var(--accent)",
  bike: "var(--blue)",
  cv: "var(--lavender)",
  health: "var(--orange)",
  term: "var(--lavender)",
  other: "var(--grey)",
};

type Named<T> = T | T[] | null;

function getIstHour(isoString: string): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    hour: "numeric",
    hour12: false,
    timeZone: "Asia/Kolkata",
  }).format(new Date(isoString));
  return Number(parts) || 0;
}

/** Every policy due date from `fromDate`, paged past the 1000-row API limit. */
async function dueDatesFrom(fromDate: string) {
  const db = await createClient();
  const dates: string[] = [];
  for (let from = 0; ; from += 1000) {
    const res = await db
      .from("policies")
      .select("due_date")
      .gte("due_date", fromDate)
      .order("due_date")
      .range(from, from + 999);
    const rows = rowsOf<{ due_date: string }>(res, "Policies by due date");
    dates.push(...rows.map((r) => r.due_date));
    if (rows.length < 1000) break;
  }
  return dates;
}

export async function getDashboard(): Promise<DashboardData> {
  const db = await createClient();
  const today = todayIST();
  const month = monthStart(today);
  const year = Number(today.slice(0, 4));

  const [
    active,
    fresh,
    renewedRows,
    renewed,
    lapsed,
    dueDates,
    typeRows,
    upcomingRes,
    userRows,
    policyRows,
    allRenewals,
    pendingClaimsRes,
    claimsRows,
    activePoliciesDetailed,
  ] = await Promise.all([
    db.from("policies").select("id", head).gte("due_date", today),
    db.from("users").select("id", head).gte("created_at", month),
    db.from("renewals").select("policies(premium_amount)").eq("status", "renewed").gte("created_at", month),
    db.from("renewals").select("id", head).eq("status", "renewed"),
    db.from("renewals").select("id", head).eq("status", "lapsed"),
    dueDatesFrom(`${year - 4}-01-01`),
    db.from("policy_types").select("code, policies(count)"),
    db
      .from("policies")
      .select(
        "id, policy_number, due_date, insurer_name, users(full_name, mobile_number), insurers(name), policy_types(code), renewals(status, created_at)",
      )
      .gte("due_date", today)
      .lte("due_date", addDays(today, 60))
      .order("due_date", { ascending: true })
      .limit(3),
    pagedRows<{ created_at: string }>(
      (from, to) =>
        db
          .from("users")
          .select("created_at")
          .order("created_at", { ascending: false })
          .range(from, to),
      "Users created_at",
    ),
    pagedRows<{
      created_at: string;
      premium_amount: number | string | null;
      vehicle_category: string | null;
      policy_types: Named<{ code: string | null }>;
    }>(
      (from, to) =>
        db
          .from("policies")
          .select("created_at, premium_amount, vehicle_category, policy_types(code)")
          .order("created_at", { ascending: false })
          .range(from, to),
      "Policies premium",
    ),
    pagedRows<{
      id: string;
      status: string | null;
      created_at: string;
      renewal_date: string | null;
    }>(
      (from, to) =>
        db
          .from("renewals")
          .select("id, status, created_at, renewal_date")
          .order("created_at", { ascending: false })
          .range(from, to),
      "All renewals for retention",
    ),
    db.from("claims").select("id", head).eq("status", "pending"),
    pagedRows<{
      id: string;
      policy_id: string | null;
      vehicle_reg_no: string;
      status: string | null;
      vehicle_category: string | null;
      due_date: string | null;
    }>(
      (from, to) =>
        db
          .from("claims")
          .select("id, policy_id, vehicle_reg_no, status, vehicle_category, due_date")
          .order("created_at", { ascending: false })
          .range(from, to),
      "Claims for renewal tracking",
    ),
    pagedRows<{
      id: string;
      user_id: string | null;
      due_date: string;
      vehicle_category: string | null;
      policy_types: Named<{ code: string | null }>;
      renewals: { id: string; status: string | null; previous_due_date: string | null; new_due_date: string | null; claim_id: string | null }[] | null;
    }>(
      (from, to) =>
        db
          .from("policies")
          .select("id, user_id, due_date, vehicle_category, policy_types(code), renewals(id, status, previous_due_date, new_due_date, claim_id)")
          .gte("due_date", today)
          .order("due_date", { ascending: true })
          .range(from, to),
      "Active policies detailed",
    ),
  ]);

  // Renewal revenue = premium of policies renewed this month. Renewal rate = renewed / (renewed + lapsed).
  const revenue = rowsOf<{ policies: Named<{ premium_amount: number | string | null }> }>(
    renewedRows,
    "Renewal revenue",
  ).reduce((sum, r) => sum + Number(one(r.policies)?.premium_amount ?? 0), 0);
  const renewedCount = countOf(renewed, "Renewed count");
  const closedCount = renewedCount + countOf(lapsed, "Lapsed count");

  // Renewals due: next 7 days, this year by month, last 5 years.
  const weekday = (iso: string) =>
    new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { weekday: "short", timeZone: "UTC" });
  const renewals: DashboardData["renewals"] = {
    week: Array.from({ length: 7 }, (_, i) => {
      const date = addDays(today, i);
      return { label: weekday(date), value: dueDates.filter((d) => d === date).length };
    }),
    month: MONTHS.map((label, i) => ({
      label,
      value: dueDates.filter((d) => d.startsWith(`${year}-${String(i + 1).padStart(2, "0")}`)).length,
    })),
    year: Array.from({ length: 5 }, (_, i) => {
      const y = String(year - 4 + i);
      return { label: y, value: dueDates.filter((d) => d.startsWith(y)).length };
    }),
  };

  // -------------------------------------------------------------------------
  // 1. New Customers Bar Chart Data (Day, Week, Month, Year)
  // -------------------------------------------------------------------------
  const SLOTS = [
    { label: "4 AM", min: 0, max: 3 },
    { label: "8 AM", min: 4, max: 7 },
    { label: "12 PM", min: 8, max: 11 },
    { label: "4 PM", min: 12, max: 15 },
    { label: "8 PM", min: 16, max: 19 },
    { label: "12 AM", min: 20, max: 23 },
  ];
  const todayUsers = userRows.filter((u) => dateIST(u.created_at) === today);
  const dayBreakdown: ChartDatum[] = SLOTS.map((s) => ({
    label: s.label,
    value: todayUsers.filter((u) => {
      const h = getIstHour(u.created_at);
      return h >= s.min && h <= s.max;
    }).length,
  }));

  const weekBreakdown: ChartDatum[] = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(today, -6 + i);
    const dayMatches = userRows.filter((u) => dateIST(u.created_at) === date);
    const dayLabel = new Date(`${date}T00:00:00Z`).toLocaleDateString("en-GB", {
      weekday: "short",
      timeZone: "UTC",
    });
    return { label: dayLabel, value: dayMatches.length };
  });

  const monthUsers = userRows.filter((u) => dateIST(u.created_at)?.startsWith(today.slice(0, 7)));
  const monthBreakdown: ChartDatum[] = [
    {
      label: "Wk 1 (1–7)",
      value: monthUsers.filter((u) => {
        const d = Number(dateIST(u.created_at)?.slice(8, 10));
        return d >= 1 && d <= 7;
      }).length,
    },
    {
      label: "Wk 2 (8–14)",
      value: monthUsers.filter((u) => {
        const d = Number(dateIST(u.created_at)?.slice(8, 10));
        return d >= 8 && d <= 14;
      }).length,
    },
    {
      label: "Wk 3 (15–21)",
      value: monthUsers.filter((u) => {
        const d = Number(dateIST(u.created_at)?.slice(8, 10));
        return d >= 15 && d <= 21;
      }).length,
    },
    {
      label: "Wk 4 (22+)",
      value: monthUsers.filter((u) => {
        const d = Number(dateIST(u.created_at)?.slice(8, 10));
        return d >= 22;
      }).length,
    },
  ];

  const yearBreakdown: ChartDatum[] = MONTHS.map((label, i) => {
    const prefix = `${year}-${String(i + 1).padStart(2, "0")}`;
    const count = userRows.filter((u) => dateIST(u.created_at)?.startsWith(prefix)).length;
    return { label, value: count };
  });

  const weekTotal = userRows.filter((u) => {
    const d = dateIST(u.created_at);
    return d && d >= addDays(today, -6) && d <= today;
  }).length;
  const yearTotal = userRows.filter((u) => dateIST(u.created_at)?.startsWith(String(year))).length;

  const newCustomers = {
    total: userRows.length,
    breakdown: {
      day: dayBreakdown,
      week: weekBreakdown,
      month: monthBreakdown,
      year: yearBreakdown,
    },
    periodTotals: {
      day: todayUsers.length,
      week: weekTotal,
      month: monthUsers.length,
      year: yearTotal,
    },
  };

  // -------------------------------------------------------------------------
  // 2. Category-Wise Business Payment (Day, Week, Month, Year) & Growth
  // -------------------------------------------------------------------------
  const normalizedPolicies = policyRows.map((p) => {
    const amt = Number(p.premium_amount ?? 0);
    const date = dateIST(p.created_at) ?? "";
    const typeCode = one(p.policy_types)?.code;
    const group = (p.vehicle_category ?? "").toUpperCase();

    let code = "other";
    let name = "Other";
    let color = COLORS.other;

    if (typeCode === "car" || group === "4W") {
      code = "car";
      name = "Car (4W)";
      color = COLORS.car;
    } else if (typeCode === "bike" || group === "2W") {
      code = "bike";
      name = "Two Wheeler (2W)";
      color = COLORS.bike;
    } else if (group === "CW" || group === "CV") {
      code = "cv";
      name = "Commercial (CV)";
      color = COLORS.cv;
    } else if (typeCode === "health") {
      code = "health";
      name = "Health";
      color = COLORS.health;
    } else if (typeCode === "term") {
      code = "term";
      name = "Term";
      color = COLORS.term;
    }

    return { amt: Number.isFinite(amt) && amt > 0 ? amt : 0, date, code, name, color };
  });

  const curMonthNum = Number(today.slice(5, 7));
  const prevMonthYear = curMonthNum === 1 ? year - 1 : year;
  const prevMonthNum = curMonthNum === 1 ? 12 : curMonthNum - 1;
  const prevMonthPrefix = `${prevMonthYear}-${String(prevMonthNum).padStart(2, "0")}`;

  function buildPeriodBusiness(
    filterCurr: (date: string) => boolean,
    filterPrev: (date: string) => boolean,
    periodLabel: string,
    previousLabel: string,
  ): BusinessPeriodData {
    const currPolicies = normalizedPolicies.filter((p) => filterCurr(p.date));
    const prevPolicies = normalizedPolicies.filter((p) => filterPrev(p.date));

    const totalRaw = currPolicies.reduce((sum, p) => sum + p.amt, 0);
    const previousRaw = prevPolicies.reduce((sum, p) => sum + p.amt, 0);

    let growthPercent: number | null = null;
    if (previousRaw > 0) {
      growthPercent = Math.round(((totalRaw - previousRaw) / previousRaw) * 1000) / 10;
    } else if (totalRaw > 0) {
      growthPercent = 100;
    } else {
      growthPercent = 0;
    }

    // Category aggregation
    const policiesForSlices = totalRaw > 0 ? currPolicies : normalizedPolicies;
    const baseTotal = totalRaw > 0 ? totalRaw : policiesForSlices.reduce((sum, p) => sum + p.amt, 0);

    const map = new Map<string, { name: string; color: string; amount: number }>();
    for (const p of policiesForSlices) {
      if (p.amt <= 0) continue;
      const existing = map.get(p.code);
      if (existing) existing.amount += p.amt;
      else map.set(p.code, { name: p.name, color: p.color, amount: p.amt });
    }

    const slices: BusinessCategorySlice[] = Array.from(map.entries())
      .map(([code, data]) => ({
        code,
        name: data.name,
        color: data.color,
        rawAmount: data.amount,
        percentage: baseTotal > 0 ? Math.round((data.amount / baseTotal) * 100) : 0,
      }))
      .sort((a, b) => b.rawAmount - a.rawAmount);

    return {
      slices,
      totalRaw,
      previousRaw,
      growthPercent,
      periodLabel,
      previousLabel,
    };
  }

  const businessPayment: Record<DashboardTimeRange, BusinessPeriodData> = {
    day: buildPeriodBusiness(
      (d) => d === today,
      (d) => d === addDays(today, -1),
      "Today",
      "Yesterday",
    ),
    week: buildPeriodBusiness(
      (d) => d >= addDays(today, -6) && d <= today,
      (d) => d >= addDays(today, -13) && d <= addDays(today, -7),
      "This Week",
      "Last Week",
    ),
    month: buildPeriodBusiness(
      (d) => d >= month && d <= today,
      (d) => d.startsWith(prevMonthPrefix),
      "This Month",
      "Last Month",
    ),
    year: buildPeriodBusiness(
      (d) => d.startsWith(String(year)),
      (d) => d.startsWith(String(year - 1)),
      "This Year",
      "Last Year",
    ),
  };

  // Policies by category, as percentages.
  const counts = rowsOf<{ code: string; policies: { count: number }[] | null }>(typeRows, "Policy types").map((t) => ({
    code: t.code,
    count: t.policies?.[0]?.count ?? 0,
  }));
  const sum = counts.reduce((total, c) => total + c.count, 0);
  const categories: CategorySlice[] = counts
    .filter((c) => c.count > 0)
    .map((c) => ({
      name: categoryLabel(c.code),
      value: Math.round((c.count / sum) * 100),
      color: COLORS[c.code] ?? "var(--grey)",
    }));

  const upcoming: UpcomingRenewal[] = rowsOf<{
    id: string;
    policy_number: string;
    due_date: string;
    insurer_name: string | null;
    users: Named<{ full_name: string | null; mobile_number: string }>;
    insurers: Named<{ name: string }>;
    policy_types: Named<{ code: string | null }>;
    renewals: { status: string | null; created_at: string }[] | null;
  }>(upcomingRes, "Upcoming renewals").map((p) => {
    const latest = [...(p.renewals ?? [])].sort((a, b) => b.created_at.localeCompare(a.created_at))[0]?.status;
    const state = policyState(p.due_date, today);
    const status: PolicyStatus =
      latest === "pending" || latest === "quote_sent" || latest === "renewed" ? latest : state;
    const user = one(p.users);
    return {
      id: p.id,
      client: user?.full_name ?? user?.mobile_number ?? "—",
      policy: categoryLabel(one(p.policy_types)?.code),
      insurer: one(p.insurers)?.name ?? p.insurer_name ?? "—",
      policyNumber: p.policy_number,
      expiry: p.due_date,
      daysLeft: daysBetween(today, p.due_date),
      status,
    };
  });

  // -------------------------------------------------------------------------
  // 3. Renewal Retention Calculation (Year-over-Year Annual Integrity)
  // Monthly view: Same month current year vs same month previous year (e.g. Nov 2026 vs Nov 2025)
  // Yearly view: Full calendar year current year vs full calendar year previous year (e.g. 2026 vs 2025)
  // -------------------------------------------------------------------------
  const curMonthPrefix = today.slice(0, 7); // e.g. "2026-11"
  const curMonthNumStr = today.slice(5, 7); // "11"
  const prevYearSameMonthPrefix = `${year - 1}-${curMonthNumStr}`; // "2025-11"
  const curYearStr = String(year); // "2026"
  const prevYearStr = String(year - 1); // "2025"

  // Renewed in current month (e.g. Nov 2026)
  const renewedThisMonth = allRenewals.filter(
    (r) =>
      r.status === "renewed" &&
      (dateIST(r.created_at)?.startsWith(curMonthPrefix) || r.renewal_date?.startsWith(curMonthPrefix)),
  ).length;

  // Closed / due in same month of previous year (e.g. Nov 2025 base)
  const dueSameMonthPrevYear = dueDates.filter((d) => d.startsWith(prevYearSameMonthPrefix)).length;
  const closedInSameMonthPrevYear = allRenewals.filter(
    (r) =>
      (r.status === "lapsed" || r.status === "closed" || r.status === "renewed") &&
      (dateIST(r.created_at)?.startsWith(prevYearSameMonthPrefix) || r.renewal_date?.startsWith(prevYearSameMonthPrefix)),
  ).length;
  const closedPrevMonthBase = Math.max(dueSameMonthPrevYear, closedInSameMonthPrevYear);

  const monthlyRetentionRate =
    closedPrevMonthBase > 0
      ? Math.min(100, Math.round((renewedThisMonth / closedPrevMonthBase) * 1000) / 10)
      : renewedThisMonth > 0
        ? 100
        : 0;

  // Renewed in current calendar year (e.g. 2026)
  const renewedThisYear = allRenewals.filter(
    (r) =>
      r.status === "renewed" &&
      (dateIST(r.created_at)?.startsWith(curYearStr) || r.renewal_date?.startsWith(curYearStr)),
  ).length;

  // Closed in previous calendar year (e.g. 2025)
  const duePrevYear = dueDates.filter((d) => d.startsWith(prevYearStr)).length;
  const closedInPrevYear = allRenewals.filter(
    (r) =>
      (r.status === "lapsed" || r.status === "closed" || r.status === "renewed") &&
      (dateIST(r.created_at)?.startsWith(prevYearStr) || r.renewal_date?.startsWith(prevYearStr)),
  ).length;
  const closedPrevYearBase = Math.max(duePrevYear, closedInPrevYear);

  const yearlyRetentionRate =
    closedPrevYearBase > 0
      ? Math.min(100, Math.round((renewedThisYear / closedPrevYearBase) * 1000) / 10)
      : renewedThisYear > 0
        ? 100
        : 0;

  const curMonthDate = new Date(`${curMonthPrefix}-01T00:00:00Z`);
  const prevYearSameMonthDate = new Date(`${prevYearSameMonthPrefix}-01T00:00:00Z`);
  const curMonthName = curMonthDate.toLocaleDateString("en-GB", { month: "short", year: "numeric", timeZone: "UTC" });
  const prevYearSameMonthName = prevYearSameMonthDate.toLocaleDateString("en-GB", { month: "short", year: "numeric", timeZone: "UTC" });

  const renewalRetention: DashboardData["renewalRetention"] = {
    monthly: {
      renewedCount: renewedThisMonth,
      closedBaseCount: closedPrevMonthBase,
      retentionRate: monthlyRetentionRate,
      currentPeriodLabel: curMonthName,
      basePeriodLabel: prevYearSameMonthName,
      trendPercent: null,
    },
    yearly: {
      renewedCount: renewedThisYear,
      closedBaseCount: closedPrevYearBase,
      retentionRate: yearlyRetentionRate,
      currentPeriodLabel: `${curYearStr} (Full Year)`,
      basePeriodLabel: `${prevYearStr} (Full Year)`,
      trendPercent: null,
    },
  };

  // -------------------------------------------------------------------------
  // 4. Smart Agency Renewals & Active Policies/Customers by Category
  // Identifies policies renewed by our agency for current year or next year (second due date),
  // tracked from CSE claims submitted via /claim and renewal history.
  // Categories: TWO WHEELER, 4W WHEELER, HEALTH, TERM, SME
  // -------------------------------------------------------------------------
  const claimPolicyIds = new Set(
    claimsRows.filter((c) => c.policy_id).map((c) => String(c.policy_id))
  );

  const agencyRenewedPolicies = activePoliciesDetailed.filter((p) => {
    // 1. Has explicit renewal history (with previous due date / renewed status / second due date)
    const renewalsList = p.renewals ?? [];
    const hasRenewalHistory = renewalsList.some(
      (r) =>
        r.status === "renewed" ||
        r.previous_due_date !== null ||
        r.claim_id !== null ||
        renewalsList.length > 0,
    );

    // 2. Or is directly tied to a claim submitted by a CSE from /claim
    const hasClaimLink = claimPolicyIds.has(p.id);

    // 3. Or policy has future due date (active in current year or next year e.g. 2027)
    const isFutureRenewed = p.due_date >= today;

    return hasRenewalHistory || hasClaimLink || isFutureRenewed;
  });

  function categorizePolicy(p: {
    vehicle_category?: string | null;
    policy_types?: Named<{ code: string | null }>;
  }): "2w" | "4w" | "health" | "term" | "sme" {
    const cat = (p.vehicle_category ?? "").toUpperCase();
    const typeCode = (one(p.policy_types)?.code ?? "").toLowerCase();

    if (cat === "2W" || typeCode === "bike") return "2w";
    if (cat === "4W" || typeCode === "car") return "4w";
    if (typeCode === "health") return "health";
    if (typeCode === "term") return "term";
    return "sme";
  }

  const categoryBuckets: Record<
    "2w" | "4w" | "health" | "term" | "sme",
    { count: number; customers: Set<string> }
  > = {
    "2w": { count: 0, customers: new Set() },
    "4w": { count: 0, customers: new Set() },
    health: { count: 0, customers: new Set() },
    term: { count: 0, customers: new Set() },
    sme: { count: 0, customers: new Set() },
  };

  const totalCustomersSet = new Set<string>();

  for (const pol of agencyRenewedPolicies) {
    const catKey = categorizePolicy(pol);
    categoryBuckets[catKey].count += 1;
    const custKey = pol.user_id ?? `pol-${pol.id}`;
    categoryBuckets[catKey].customers.add(custKey);
    totalCustomersSet.add(custKey);
  }

  const activeRenewed: ActiveRenewedMetric = {
    totalPolicies: agencyRenewedPolicies.length,
    totalCustomers: totalCustomersSet.size,
    byCategory: {
      all: {
        policiesCount: agencyRenewedPolicies.length,
        customersCount: totalCustomersSet.size,
      },
      "2w": {
        policiesCount: categoryBuckets["2w"].count,
        customersCount: categoryBuckets["2w"].customers.size,
      },
      "4w": {
        policiesCount: categoryBuckets["4w"].count,
        customersCount: categoryBuckets["4w"].customers.size,
      },
      health: {
        policiesCount: categoryBuckets.health.count,
        customersCount: categoryBuckets.health.customers.size,
      },
      term: {
        policiesCount: categoryBuckets.term.count,
        customersCount: categoryBuckets.term.customers.size,
      },
      sme: {
        policiesCount: categoryBuckets.sme.count,
        customersCount: categoryBuckets.sme.customers.size,
      },
    },
  };

  const pendingClaimsCount = countOf(pendingClaimsRes, "Pending claims count");

  return {
    activePolicies: activeRenewed.totalPolicies,
    newClients: countOf(fresh, "New clients count"),
    activeRenewed,
    pendingClaimsCount,
    renewalRevenue: revenue,
    renewalRate: closedCount ? Math.round((renewedCount / closedCount) * 100) : 0,
    renewalRetention,
    newCustomers,
    businessPayment,
    renewals,
    categories,
    upcoming,
  };
}
