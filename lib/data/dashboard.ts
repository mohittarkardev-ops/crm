import { createClient } from "@/lib/supabase/server";
import {
  addDays,
  countOf,
  daysBetween,
  monthStart,
  one,
  policyState,
  rowsOf,
  todayIST,
} from "@/lib/data/helpers";
import type { CategorySlice, DashboardData, UpcomingRenewal } from "@/lib/data/types";
import { categoryLabel, type PolicyStatus } from "@/lib/status";

const head = { count: "exact", head: true } as const;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const COLORS: Record<string, string> = {
  car: "var(--accent)",
  bike: "var(--blue)",
  health: "var(--orange)",
  term: "var(--lavender)",
  other: "var(--grey)",
};

type Named<T> = T | T[] | null;

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

  const [active, fresh, renewedRows, renewed, lapsed, dueDates, typeRows, upcomingRes] = await Promise.all([
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

  return {
    activePolicies: countOf(active, "Active policies count"),
    newClients: countOf(fresh, "New clients count"),
    renewalRevenue: revenue,
    renewalRate: closedCount ? Math.round((renewedCount / closedCount) * 100) : 0,
    renewals,
    categories,
    upcoming,
  };
}
