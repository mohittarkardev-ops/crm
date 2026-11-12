import { createClient } from "@/lib/supabase/server";
import { addDays, one, rowsOf, todayIST } from "@/lib/data/helpers";

export type FeedKind = "quote" | "ticket" | "policy" | "user";

export type FeedItem = {
  id: string;
  kind: FeedKind;
  title: string;
  detail: string;
  /** Timestamp of the event (ISO). */
  at: string;
  href: string;
};

type Named<T> = T | T[] | null;
type Person = Named<{ full_name: string | null; mobile_number: string }>;

function who(person: Person) {
  const user = one(person);
  return user?.full_name ?? user?.mobile_number ?? "Unknown user";
}

export type FeedScope = {
  quotes?: boolean;
  support?: boolean;
  policies?: boolean;
  clients?: boolean;
};

/**
 * What needs the advisor's attention right now: new quote requests, open support tickets,
 * policies added by users that are still unverified, and users who registered in the last 7 days.
 * Queries only the modules this staff member is allowed to open.
 */
export async function getActivityFeed(scope: FeedScope = {}): Promise<FeedItem[]> {
  const db = await createClient();
  const since = addDays(todayIST(), -7);
  const emptyRes = { data: [] as never[], error: null };

  const [quotes, tickets, policies, users] = await Promise.all([
    scope.quotes !== false
      ? db
          .from("quote_requests")
          .select("id, created_at, users(full_name, mobile_number), policies(policy_number)")
          .eq("status", "new")
          .order("created_at", { ascending: false })
          .limit(10)
      : Promise.resolve(emptyRes),
    scope.support !== false
      ? db
          .from("support_tickets")
          .select("id, subject, created_at, users(full_name, mobile_number)")
          .eq("status", "open")
          .order("created_at", { ascending: false })
          .limit(10)
      : Promise.resolve(emptyRes),
    scope.policies !== false
      ? db
          .from("policies")
          .select("id, policy_number, created_at, users(full_name, mobile_number)")
          .eq("source", "user_added")
          .eq("verification_status", "unverified")
          .order("created_at", { ascending: false })
          .limit(10)
      : Promise.resolve(emptyRes),
    scope.clients !== false
      ? (async () => {
          const primary = await db
            .from("users")
            .select("id, full_name, mobile_number, created_at, app_registered_at")
            .not("auth_user_id", "is", null)
            .gte("app_registered_at", since)
            .order("app_registered_at", { ascending: false })
            .limit(5);
          if (primary.error && primary.error.message.includes("app_registered_at")) {
            return db
              .from("users")
              .select("id, full_name, mobile_number, created_at")
              .not("auth_user_id", "is", null)
              .gte("created_at", since)
              .order("created_at", { ascending: false })
              .limit(5);
          }
          return primary;
        })()
      : Promise.resolve(emptyRes),
  ]);

  const items: FeedItem[] = [
    ...rowsOf<{ id: string; created_at: string; users: Person; policies: Named<{ policy_number: string }> }>(
      quotes,
      "Quote notifications",
    ).map((q) => ({
      id: `quote:${q.id}`,
      kind: "quote" as const,
      title: "New quote request",
      detail: `${who(q.users)} · ${one(q.policies)?.policy_number ?? "General request"}`,
      at: q.created_at,
      href: `/quotes/${q.id}`,
    })),
    ...rowsOf<{ id: string; subject: string; created_at: string; users: Person }>(
      tickets,
      "Ticket notifications",
    ).map((t) => ({
      id: `ticket:${t.id}`,
      kind: "ticket" as const,
      title: "New support ticket",
      detail: `${who(t.users)} · ${t.subject}`,
      at: t.created_at,
      href: `/support/${t.id}`,
    })),
    ...rowsOf<{ id: string; policy_number: string; created_at: string; users: Person }>(
      policies,
      "Policy notifications",
    ).map((p) => ({
      id: `policy:${p.id}`,
      kind: "policy" as const,
      title: "Policy added by a user",
      detail: `${who(p.users)} · ${p.policy_number}`,
      at: p.created_at,
      href: `/policies/${p.id}`,
    })),
    ...rowsOf<{
      id: string;
      full_name: string | null;
      mobile_number: string;
      created_at: string;
      app_registered_at?: string | null;
    }>(
      users,
      "User notifications",
    ).map((u) => ({
      id: `user:${u.id}`,
      kind: "user" as const,
      title: "New user registered",
      detail: u.full_name ?? u.mobile_number,
      at: u.app_registered_at ?? u.created_at,
      href: "/clients",
    })),
  ];

  return items.sort((a, b) => Date.parse(b.at) - Date.parse(a.at)).slice(0, 20);
}
