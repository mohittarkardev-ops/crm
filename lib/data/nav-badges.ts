import { createClient } from "@/lib/supabase/server";

export type NavBadgeCounts = {
  claims: number;
  quotes: number;
  support: number;
  notifications: number;
};

/**
 * Real-time urgency counts for CRM drawer/sidebar navigation (Instagram-style badges).
 * Queries pending claims, open quote requests, open support tickets, and unread notifications.
 */
export async function getNavUrgencyBadges(): Promise<NavBadgeCounts> {
  try {
    const db = await createClient();
    const head = { count: "exact", head: true } as const;

    const [claimsRes, quotesRes, supportRes, notifRes] = await Promise.all([
      db.from("claims").select("id", head).eq("status", "pending"),
      db.from("quote_requests").select("id", head).in("status", ["new", "pending", "in_progress"]),
      db.from("support_tickets").select("id", head).in("status", ["open", "in_progress"]),
      db.from("notifications").select("id", head).eq("is_read", false),
    ]);

    return {
      claims: claimsRes.count ?? 0,
      quotes: quotesRes.count ?? 0,
      support: supportRes.count ?? 0,
      notifications: notifRes.count ?? 0,
    };
  } catch {
    return {
      claims: 0,
      quotes: 0,
      support: 0,
      notifications: 0,
    };
  }
}
