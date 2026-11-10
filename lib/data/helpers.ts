import { createClient } from "@/lib/supabase/server";

export type Db = Awaited<ReturnType<typeof createClient>>;

type Failure = { message: string } | null;

/** Returns the rows of a query, or throws a readable error (shown by app/(dashboard)/error.tsx). */
export function rowsOf<T>(res: { data: unknown; error: Failure }, label: string): T[] {
  if (res.error) throw new Error(`${label}: ${res.error.message}`);
  return (res.data ?? []) as T[];
}

/**
 * Fetches rows in 1,000-row PostgREST pages using `.range(from, to)` so CRM lists are not
 * silently capped at 1,000 rows. Stops cleanly once fewer than 1,000 rows come back or `maxRows` is reached.
 */
export async function pagedRows<T>(
  fetchRange: (from: number, to: number) => PromiseLike<{ data: unknown; error: Failure }>,
  label: string,
  maxRows = 10_000,
): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; out.length < maxRows; from += 1000) {
    const res = await fetchRange(from, from + 999);
    const chunk = rowsOf<T>(res, label);
    out.push(...chunk);
    if (chunk.length < 1000) break;
  }
  if (out.length > maxRows) out.length = maxRows;
  return out;
}

/** Returns the count of a `{ count: "exact", head: true }` query. */
export function countOf(res: { count: number | null; error: Failure }, label: string): number {
  if (res.error) throw new Error(`${label}: ${res.error.message}`);
  return res.count ?? 0;
}

/** PostgREST returns embedded many-to-one rows as an object (typed as array by some clients). */
export function one<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : (value ?? null);
}

const DAY = 86_400_000;

/** Today in India (the policy trigger also uses IST), as YYYY-MM-DD. */
export function todayIST(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

/** A timestamptz as an IST calendar date (YYYY-MM-DD), or null. */
export function dateIST(timestamp: string | null | undefined): string | null {
  return timestamp ? new Date(timestamp).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }) : null;
}

export function addDays(iso: string, days: number): string {
  return new Date(Date.parse(`${iso}T00:00:00Z`) + days * DAY).toISOString().slice(0, 10);
}

export function daysBetween(fromIso: string, toIso: string): number {
  return Math.round((Date.parse(`${toIso}T00:00:00Z`) - Date.parse(`${fromIso}T00:00:00Z`)) / DAY);
}

export function monthStart(iso: string): string {
  return `${iso.slice(0, 8)}01`;
}

export type PolicyState = "active" | "expiring" | "expired";

/** Same rule as the database trigger: expired before today, expiring within 30 days, otherwise active. */
export function policyState(dueDate: string, today: string): PolicyState {
  if (dueDate < today) return "expired";
  return dueDate <= addDays(today, 30) ? "expiring" : "active";
}
