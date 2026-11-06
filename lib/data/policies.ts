import { createClient } from "@/lib/supabase/server";
import {
  addDays,
  countOf,
  daysBetween,
  one,
  policyState,
  rowsOf,
  todayIST,
} from "@/lib/data/helpers";
import type { Row } from "@/lib/module-types";
import { categoryLabel } from "@/lib/status";

type Named<T> = T | T[] | null;

type PolicyRecord = {
  id: string;
  policy_number: string;
  due_date: string;
  premium_amount: number | string | null;
  source: string;
  verification_status: string;
  insurer_name: string | null;
  users: Named<{ full_name: string | null; mobile_number: string }>;
  insurers: Named<{ name: string }>;
  policy_types: Named<{ code: string | null }>;
  renewals?: { status: string | null; created_at: string }[] | null;
};

const BASE_SELECT =
  "id, policy_number, due_date, premium_amount, source, verification_status, insurer_name, users(full_name, mobile_number), insurers(name), policy_types(code)";

function clientName(p: PolicyRecord) {
  const user = one(p.users);
  return user?.full_name ?? user?.mobile_number ?? null;
}

/** All policies (latest 1000). Status is recalculated from the end date, like the database does. */
export async function getPolicies() {
  const db = await createClient();
  const today = todayIST();
  const head = { count: "exact", head: true } as const;

  const [list, all, expired, expiring] = await Promise.all([
    db.from("policies").select(BASE_SELECT).order("created_at", { ascending: false }).limit(1000),
    db.from("policies").select("id", head),
    db.from("policies").select("id", head).lt("due_date", today),
    db.from("policies").select("id", head).gte("due_date", today).lte("due_date", addDays(today, 30)),
  ]);

  const rows: Row[] = rowsOf<PolicyRecord>(list, "Policies").map((p) => ({
    id: p.id,
    policyNumber: p.policy_number,
    client: clientName(p),
    category: one(p.policy_types)?.code ?? "other",
    insurer: one(p.insurers)?.name ?? p.insurer_name,
    premium: p.premium_amount === null ? null : Number(p.premium_amount),
    expiry: p.due_date,
    status: policyState(p.due_date, today),
    source: p.source,
    verification: p.verification_status,
  }));

  const total = countOf(all, "Policies count");
  const expiredCount = countOf(expired, "Expired policies count");
  return {
    rows,
    stats: {
      total,
      active: total - expiredCount, // in force: not yet expired
      expiring: countOf(expiring, "Expiring policies count"),
      expired: expiredCount,
    },
  };
}

function windowOf(daysLeft: number): string | null {
  if (daysLeft < 0) return null;
  if (daysLeft <= 1) return "1";
  if (daysLeft <= 7) return "7";
  if (daysLeft <= 15) return "15";
  if (daysLeft <= 30) return "30";
  return "60";
}

/** Renewal tracker: policies expiring in the next 60 days or lapsed in the last 30, with their renewal status. */
export async function getRenewals() {
  const db = await createClient();
  const today = todayIST();

  const res = await db
    .from("policies")
    .select(`${BASE_SELECT}, renewals(status, created_at)`)
    .gte("due_date", addDays(today, -30))
    .lte("due_date", addDays(today, 60))
    .order("due_date", { ascending: true })
    .limit(1000);

  const counts: Record<string, number> = { pending: 0, quote_sent: 0, renewed: 0, lapsed: 0 };

  const rows: Row[] = rowsOf<PolicyRecord>(res, "Renewals").map((p) => {
    const daysLeft = daysBetween(today, p.due_date);
    const latest = [...(p.renewals ?? [])].sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
    const status = latest?.status ?? (daysLeft < 0 ? "lapsed" : "pending");
    counts[status] = (counts[status] ?? 0) + 1;
    const category = one(p.policy_types)?.code ?? "other";
    return {
      id: p.id,
      client: clientName(p),
      policy: `${categoryLabel(category)} · ${p.policy_number}`,
      category,
      insurer: one(p.insurers)?.name ?? p.insurer_name,
      expiry: p.due_date,
      daysLeft,
      window: windowOf(daysLeft),
      status,
    };
  });

  return { rows, stats: counts };
}

/** Policies due in the next 60 days (used by Reports). */
export async function countRenewalsDue() {
  const db = await createClient();
  const today = todayIST();
  const res = await db
    .from("policies")
    .select("id", { count: "exact", head: true })
    .gte("due_date", today)
    .lte("due_date", addDays(today, 60));
  return countOf(res, "Renewals due count");
}
