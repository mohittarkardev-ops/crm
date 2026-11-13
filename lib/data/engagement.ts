import { createClient } from "@/lib/supabase/server";
import { countOf, dateIST, one, pagedRows } from "@/lib/data/helpers";
import type { Option, Row } from "@/lib/module-types";

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
  const [records, totalRes] = await Promise.all([
    pagedRows<QuoteRecord>(
      (from, to) =>
        db
          .from("quote_requests")
          .select(
            "id, status, created_at, users(full_name, mobile_number, is_advisor_client), policies(policy_number, policy_types(code))",
          )
          .order("created_at", { ascending: false })
          .order("id", { ascending: false })
          .range(from, to),
      "Quote requests",
    ),
    db.from("quote_requests").select("id", head),
  ]);

  const counts: Record<string, number> = { new: 0, pending: 0, in_progress: 0, completed: 0, closed: 0, renewed: 0 };

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

  return {
    rows,
    totalCount: countOf(totalRes, "Quote requests count"),
    stats: {
      total: records.length,
      new: counts.new,
      pending: counts.pending,
      in_progress: counts.in_progress,
      completed: counts.completed,
      closed: counts.closed,
      renewed: counts.renewed,
    },
  };
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

type TemplateRecord = {
  id: string;
  name: string;
  title: string;
  body: string;
  type: string | null;
  created_at: string;
};

export async function getNotifications() {
  const db = await createClient();
  const [records, all, read, templatesList, tokensCount] = await Promise.all([
    pagedRows<NotificationRecord>(
      (from, to) =>
        db
          .from("notifications")
          .select("id, title, kind, sent_at, is_read, users(full_name, mobile_number)")
          .order("sent_at", { ascending: false })
          .order("id", { ascending: false })
          .range(from, to),
      "Notifications",
    ),
    db.from("notifications").select("id", head),
    db.from("notifications").select("id", head).eq("is_read", true),
    pagedRows<TemplateRecord>(
      (from, to) =>
        db
          .from("templates")
          .select("id, name, title, body, type, created_at")
          .order("created_at", { ascending: false })
          .order("id", { ascending: false })
          .range(from, to),
      "Notification templates",
    ),
    db.from("device_tokens").select("id", head),
  ]);

  const rows: Row[] = records.map((n) => ({
    id: n.id,
    title: n.title,
    recipient: personName(n.users),
    kind: n.kind,
    sentOn: dateIST(n.sent_at),
    read: n.is_read ? "read" : "unread",
  }));

  const templateRows: Row[] = templatesList.map((t) => ({
    id: t.id,
    name: t.name,
    title: t.title,
    body: t.body,
    type: t.type ?? "broadcast",
    createdOn: dateIST(t.created_at),
  }));

  const templateOptions: Option[] = [
    { value: "", label: "Custom message (no template)" },
    ...templatesList.map((t) => ({ value: t.id, label: `${t.name} — ${t.title}` })),
  ];

  const total = countOf(all, "Notifications count");
  const readCount = countOf(read, "Read notifications count");
  const deviceTokenCount = tokensCount.error ? 0 : (tokensCount.count ?? 0);

  return {
    rows,
    totalCount: total,
    templateRows,
    templateOptions,
    deviceTokenCount,
    stats: {
      sent: total,
      unread: total - readCount,
      readRate: total ? Math.round((readCount / total) * 100) : 0,
      templates: templateRows.length,
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
  body: string | null;
  image_url: string | null;
  cta_label: string | null;
  action_url: string | null;
  sort_order: number | null;
};

export async function getPlacements() {
  const db = await createClient();
  const [records, dbNowRes, totalRes] = await Promise.all([
    pagedRows<PlacementRecord>(
      (from, to) =>
        db
          .from("placements")
          .select("id, slot_name, title, is_active, starts_at, ends_at, body, image_url, cta_label, action_url, sort_order")
          .order("sort_order", { ascending: true })
          .order("created_at", { ascending: false })
          .range(from, to),
      "Placements",
    ),
    // Use Postgres `now()` when migration 0011 is applied so CRM status matches mobile RLS clock exactly.
    db.rpc("get_db_now"),
    db.from("placements").select("id", head),
  ]);

  const parsedDbNow = !dbNowRes.error && typeof dbNowRes.data === "string" ? Date.parse(dbNowRes.data) : NaN;
  const now = Number.isFinite(parsedDbNow) ? parsedDbNow : Date.now();

  const counts: Record<string, number> = { live: 0, scheduled: 0, off: 0, ended: 0 };
  const slots = new Set<string>(["home_banner", "policies_notice", "policy_detail_notice"]);

  const rows: Row[] = records.map((p) => {
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
      body: p.body,
      imageUrl: p.image_url,
      ctaLabel: p.cta_label,
      actionUrl: p.action_url,
      startsOn: dateIST(p.starts_at),
      endsOn: dateIST(p.ends_at),
      sortOrder: p.sort_order ?? 0,
      status,
    };
  });

  const slotOptions = [...slots].sort().map((value) => ({ value, label: value.replace(/_/g, " ") }));
  return {
    rows,
    totalCount: countOf(totalRes, "Placements count"),
    stats: counts,
    slotOptions,
  };
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
  const [records, totalRes] = await Promise.all([
    pagedRows<TicketRecord>(
      (from, to) =>
        db
          .from("support_tickets")
          .select("id, subject, status, created_at, users(full_name, mobile_number)")
          .order("created_at", { ascending: false })
          .order("id", { ascending: false })
          .range(from, to),
      "Support tickets",
    ),
    db.from("support_tickets").select("id", head),
  ]);

  const counts: Record<string, number> = { open: 0, in_progress: 0, resolved: 0 };

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

  return {
    rows,
    totalCount: countOf(totalRes, "Support tickets count"),
    stats: {
      total: records.length,
      open: counts.open,
      in_progress: counts.in_progress,
      resolved: counts.resolved,
    },
  };
}
