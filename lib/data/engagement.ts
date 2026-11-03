import { createClient } from "@/lib/supabase/server";
import { countOf, dateIST, one, rowsOf } from "@/lib/data/helpers";
import type { Row } from "@/lib/module-types";

type Named<T> = T | T[] | null;
type Person = Named<{ full_name: string | null; mobile_number: string; is_advisor_client?: boolean }>;

function personName(value: Person) {
  const user = one(value);
  return user?.full_name ?? user?.mobile_number ?? null;
}

const head = { count: "exact", head: true } as const;

/* ------------------------------ Quote requests ------------------------------ */

type QuoteRecord = {
  id: string;
  status: string;
  created_at: string;
  users: Person;
  policies: Named<{ policy_number: string; policy_types: Named<{ code: string | null }> }>;
};

export async function getQuotes() {
  const db = await createClient();
  const res = await db
    .from("quote_requests")
    .select(
      "id, status, created_at, users(full_name, mobile_number, is_advisor_client), policies(policy_number, policy_types(code))",
    )
    .order("created_at", { ascending: false })
    .limit(1000);

  const counts: Record<string, number> = { new: 0, in_progress: 0, completed: 0, closed: 0 };
  const records = rowsOf<QuoteRecord>(res, "Quote requests");

  const rows: Row[] = records.map((q) => {
    counts[q.status] = (counts[q.status] ?? 0) + 1;
    const policy = one(q.policies);
    return {
      id: q.id,
      user: personName(q.users),
      mobile: one(q.users)?.mobile_number,
      userType: one(q.users)?.is_advisor_client ? "advisor_client" : "general",
      policy: policy?.policy_number,
      category: one(policy?.policy_types)?.code ?? null,
      requestedOn: dateIST(q.created_at),
      status: q.status,
    };
  });

  return { rows, stats: { total: records.length, ...counts } };
}

/* ------------------------------- Notifications ------------------------------ */

type NotificationRecord = {
  id: string;
  title: string;
  kind: string;
  sent_at: string;
  is_read: boolean;
  users: Person;
};

export async function getNotifications() {
  const db = await createClient();
  const [list, all, read, templates] = await Promise.all([
    db
      .from("notifications")
      .select("id, title, kind, sent_at, is_read, users(full_name, mobile_number)")
      .order("sent_at", { ascending: false })
      .limit(1000),
    db.from("notifications").select("id", head),
    db.from("notifications").select("id", head).eq("is_read", true),
    db.from("templates").select("id", head),
  ]);

  const rows: Row[] = rowsOf<NotificationRecord>(list, "Notifications").map((n) => ({
    id: n.id,
    title: n.title,
    recipient: personName(n.users),
    kind: n.kind,
    sentOn: dateIST(n.sent_at),
    read: n.is_read ? "read" : "unread",
  }));

  const total = countOf(all, "Notifications count");
  const readCount = countOf(read, "Read notifications count");
  return {
    rows,
    stats: {
      sent: total,
      unread: total - readCount,
      readRate: total ? Math.round((readCount / total) * 100) : 0,
      templates: countOf(templates, "Templates count"),
    },
  };
}

/* -------------------------------- Placements -------------------------------- */

type PlacementRecord = {
  id: string;
  slot_name: string;
  title: string | null;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
};

export async function getPlacements() {
  const db = await createClient();
  const res = await db
    .from("placements")
    .select("id, slot_name, title, is_active, starts_at, ends_at")
    .order("sort_order", { ascending: true })
    .limit(1000);

  const now = Date.now();
  const counts: Record<string, number> = { live: 0, scheduled: 0, off: 0, ended: 0 };
  const slots = new Set<string>();

  const rows: Row[] = rowsOf<PlacementRecord>(res, "Placements").map((p) => {
    const status = !p.is_active
      ? "off"
      : p.starts_at && Date.parse(p.starts_at) > now
        ? "scheduled"
        : p.ends_at && Date.parse(p.ends_at) <= now
          ? "ended"
          : "live";
    counts[status] += 1;
    slots.add(p.slot_name);
    return {
      id: p.id,
      slot: p.slot_name,
      title: p.title,
      startsOn: dateIST(p.starts_at),
      endsOn: dateIST(p.ends_at),
      status,
    };
  });

  const slotOptions = [...slots].sort().map((value) => ({ value, label: value.replace(/_/g, " ") }));
  return { rows, stats: counts, slotOptions };
}

/* ---------------------------------- Support --------------------------------- */

type TicketRecord = {
  id: string;
  subject: string;
  status: string;
  created_at: string;
  users: Person;
};

export async function getSupport() {
  const db = await createClient();
  const res = await db
    .from("support_tickets")
    .select("id, subject, status, created_at, users(full_name, mobile_number)")
    .order("created_at", { ascending: false })
    .limit(1000);

  const counts: Record<string, number> = { open: 0, in_progress: 0, resolved: 0 };
  const records = rowsOf<TicketRecord>(res, "Support tickets");

  const rows: Row[] = records.map((t) => {
    counts[t.status] = (counts[t.status] ?? 0) + 1;
    return {
      id: t.id,
      user: personName(t.users),
      mobile: one(t.users)?.mobile_number,
      subject: t.subject,
      createdOn: dateIST(t.created_at),
      status: t.status,
    };
  });

  return { rows, stats: { total: records.length, ...counts } };
}
