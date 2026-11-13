"use server";

import { getStaff } from "@/lib/auth";
import { addDays, todayIST } from "@/lib/data/helpers";
import { can } from "@/lib/rbac/permissions";
import { createClient } from "@/lib/supabase/server";

export type BriefingItem = { key: string; count: number; label: string };

function item(key: string, count: number | null, one: string, many: string): BriefingItem | null {
  if (!count) return null;
  return { key, count, label: count === 1 ? one : many };
}

/**
 * The one-line "what is waiting today" shown on the welcome splash. Each number appears only if the signed-in person
 * is allowed to act on it: renewals due in the next 7 days, claims waiting for review, and user-added policies to
 * verify. Zero counts are left out. Any failure returns an empty list, so the splash just skips the line.
 */
export async function getWelcomeBriefing(): Promise<{ ok: boolean; items: BriefingItem[] }> {
  try {
    const { staff } = await getStaff();
    if (!staff) return { ok: false, items: [] };

    const db = await createClient();
    const today = todayIST();
    const weekEnd = addDays(today, 7);
    const jobs: Promise<BriefingItem | null>[] = [];

    if (can(staff, "renewals.view")) {
      jobs.push(
        (async () => {
          const res = await db
            .from("policies")
            .select("id", { count: "exact", head: true })
            .gte("due_date", today)
            .lte("due_date", weekEnd);
          return res.error ? null : item("renewals", res.count, "renewal due this week", "renewals due this week");
        })(),
      );
    }

    if (can(staff, "claims.approve")) {
      jobs.push(
        (async () => {
          const res = await db.from("claims").select("id", { count: "exact", head: true }).eq("status", "pending");
          return res.error ? null : item("claims", res.count, "claim waiting for review", "claims waiting for review");
        })(),
      );
    }

    if (can(staff, "policies.verify")) {
      jobs.push(
        (async () => {
          const res = await db
            .from("policies")
            .select("id", { count: "exact", head: true })
            .eq("verification_status", "unverified");
          return res.error ? null : item("verify", res.count, "policy to verify", "policies to verify");
        })(),
      );
    }

    const items = (await Promise.all(jobs)).filter((entry): entry is BriefingItem => entry !== null);
    return { ok: true, items };
  } catch {
    return { ok: false, items: [] };
  }
}
