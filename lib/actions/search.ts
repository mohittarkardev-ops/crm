"use server";

import { requireStaff } from "@/lib/actions/shared";
import { dateIST, one, policyState, todayIST } from "@/lib/data/helpers";
import { formatDate } from "@/lib/format";
import { can } from "@/lib/rbac/permissions";
import { chipFor, type ChipTone } from "@/lib/status";
import { createClient } from "@/lib/supabase/server";

export type GlobalSearchGroupKey = "policies" | "clients" | "claims" | "quotes" | "support";

export type GlobalSearchItem = {
  id: string;
  group: GlobalSearchGroupKey;
  title: string;
  subtitle: string;
  href: string;
  badge?: string;
  tone?: ChipTone;
  logoUrl?: string | null;
  insurerName?: string | null;
};

export type GlobalSearchGroup = {
  key: GlobalSearchGroupKey;
  label: string;
  items: GlobalSearchItem[];
  viewAllHref?: string;
};

export type GlobalSearchResponse = {
  ok: boolean;
  groups: GlobalSearchGroup[];
};

const UUID_RE = /^[0-9a-f-]{36}$/i;

function pgOrLike(raw: string): string {
  const escaped = raw.replace(/[\\%_]/g, "\\$&");
  const pattern = `%${escaped}%`;
  return `"${pattern.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

/**
 * RBAC-enforced global search across CRM entities (policies, clients, claims, quotes, support).
 * Returns grouped top matches plus `?q=` handoff links for list screens.
 */
export async function globalSearch(rawQuery: string): Promise<GlobalSearchResponse> {
  const staff = await requireStaff();
  if (!staff) return { ok: false, groups: [] };

  const query = rawQuery.trim().slice(0, 80);
  if (query.length < 2) return { ok: true, groups: [] };

  const allowPolicies = can(staff, "policies.view");
  const allowClients = can(staff, "clients.view");
  const allowClaims = can(staff, "claims.view");
  const allowQuotes = can(staff, "quotes.view");
  const allowSupport = can(staff, "support.view");

  if (!allowPolicies && !allowClients && !allowClaims && !allowQuotes && !allowSupport) {
    return { ok: true, groups: [] };
  }

  const db = await createClient();
  const pat = pgOrLike(query);
  const today = todayIST();
  const encoded = encodeURIComponent(query);

  // Step 1: Resolve matching users once (drives Clients results AND linked Policies/Quotes/Tickets).
  let matchedUsers: {
    id: string;
    full_name: string | null;
    mobile_number: string;
    email: string | null;
    is_advisor_client: boolean;
  }[] = [];

  if (allowClients || allowPolicies || allowQuotes || allowSupport) {
    const usersRes = await db
      .from("users")
      .select("id, full_name, mobile_number, email, is_advisor_client")
      .or(`full_name.ilike.${pat},mobile_number.ilike.${pat},email.ilike.${pat}`)
      .order("created_at", { ascending: false })
      .limit(15);

    if (!usersRes.error && usersRes.data) {
      matchedUsers = usersRes.data as typeof matchedUsers;
    }
  }

  const userIds = matchedUsers.map((u) => u.id).filter((id) => UUID_RE.test(id));
  const userInExpr = userIds.length > 0 ? `,user_id.in.(${userIds.join(",")})` : "";

  // Step 2: Parallel RBAC-gated searches across allowed modules.
  const clmMatch = /^(?:clm-)?([0-9a-f]{4,8})$/i.exec(query);

  const [policiesRes, claimsRes, claimIdRes, quotesRes, supportRes] = await Promise.all([
    allowPolicies
      ? db
          .from("policies")
          .select(
            "id, policy_number, vehicle_reg_no, holder_name, owner_name, insurer_name, due_date, insurers(name, logo_url), users(full_name, mobile_number)",
          )
          .or(
            `policy_number.ilike.${pat},vehicle_reg_no.ilike.${pat},holder_name.ilike.${pat},owner_name.ilike.${pat},insurer_name.ilike.${pat}${userInExpr}`,
          )
          .order("due_date", { ascending: true })
          .limit(6)
      : Promise.resolve(null),

    allowClaims
      ? db
          .from("claims")
          .select("id, vehicle_reg_no, employee_name, customer_name, customer_mobile, payment_date, status")
          .or(
            `vehicle_reg_no.ilike.${pat},customer_name.ilike.${pat},customer_mobile.ilike.${pat},employee_name.ilike.${pat},remarks.ilike.${pat}`,
          )
          .order("created_at", { ascending: false })
          .limit(6)
      : Promise.resolve(null),

    allowClaims && clmMatch
      ? db
          .from("claims")
          .select("id, vehicle_reg_no, employee_name, customer_name, customer_mobile, payment_date, status")
          .order("created_at", { ascending: false })
          .limit(200)
      : Promise.resolve(null),

    allowQuotes
      ? db
          .from("quote_requests")
          .select("id, status, notes, created_at, users(full_name, mobile_number), policies(policy_number)")
          .or(`notes.ilike.${pat}${userInExpr}`)
          .order("created_at", { ascending: false })
          .limit(6)
      : Promise.resolve(null),

    allowSupport
      ? db
          .from("support_tickets")
          .select("id, subject, status, created_at, users(full_name, mobile_number)")
          .or(`subject.ilike.${pat}${userInExpr}`)
          .order("created_at", { ascending: false })
          .limit(6)
      : Promise.resolve(null),
  ]);

  const groups: GlobalSearchGroup[] = [];

  // 1. Policies
  if (allowPolicies && policiesRes && !policiesRes.error && policiesRes.data) {
    type PolicyHit = {
      id: string;
      policy_number: string;
      vehicle_reg_no: string | null;
      holder_name: string | null;
      owner_name: string | null;
      insurer_name: string | null;
      due_date: string;
      insurers: { name: string; logo_url: string | null } | { name: string; logo_url: string | null }[] | null;
      users: { full_name: string | null; mobile_number: string } | { full_name: string | null; mobile_number: string }[] | null;
    };
    const rows = policiesRes.data as PolicyHit[];
    if (rows.length > 0) {
      groups.push({
        key: "policies",
        label: "Policies",
        viewAllHref: `/policies?q=${encoded}`,
        items: rows.slice(0, 5).map((p) => {
          const ins = one(p.insurers);
          const usr = one(p.users);
          const insurerName = ins?.name ?? p.insurer_name;
          const person = p.holder_name ?? p.owner_name ?? usr?.full_name ?? usr?.mobile_number;
          const state = policyState(p.due_date, today);
          const chip = chipFor(state);
          const title = p.vehicle_reg_no ? `${p.policy_number} · ${p.vehicle_reg_no}` : p.policy_number;
          const parts = [insurerName, person, `Due ${formatDate(p.due_date)}`].filter(Boolean);
          return {
            id: p.id,
            group: "policies",
            title,
            subtitle: parts.join(" · "),
            href: `/policies/${p.id}`,
            badge: chip.label,
            tone: chip.tone,
            logoUrl: ins?.logo_url ?? null,
            insurerName: insurerName ?? null,
          };
        }),
      });
    }
  }

  // 2. Clients
  if (allowClients && matchedUsers.length > 0) {
    groups.push({
      key: "clients",
      label: "Clients",
      viewAllHref: `/clients?q=${encoded}`,
      items: matchedUsers.slice(0, 5).map((u) => {
        const displayName = u.full_name || u.mobile_number;
        const chip = chipFor(u.is_advisor_client ? "advisor_client" : "general");
        const parts = [u.mobile_number, u.email].filter(Boolean);
        return {
          id: u.id,
          group: "clients",
          title: displayName,
          subtitle: parts.join(" · "),
          href: `/clients?q=${encodeURIComponent(u.mobile_number || displayName)}`,
          badge: chip.label,
          tone: chip.tone,
        };
      }),
    });
  }

  // 3. Claims (merges text matches + CLM-XXXXXXXX prefix matches)
  if (allowClaims) {
    type ClaimHit = {
      id: string;
      vehicle_reg_no: string;
      employee_name: string;
      customer_name: string | null;
      customer_mobile: string | null;
      payment_date: string;
      status: string;
    };
    const seen = new Set<string>();
    const combined: ClaimHit[] = [];

    if (claimsRes && !claimsRes.error && claimsRes.data) {
      for (const c of claimsRes.data as ClaimHit[]) {
        if (!seen.has(c.id)) {
          seen.add(c.id);
          combined.push(c);
        }
      }
    }
    if (clmMatch && claimIdRes && !claimIdRes.error && claimIdRes.data) {
      const hexQuery = clmMatch[1].toLowerCase();
      for (const c of claimIdRes.data as ClaimHit[]) {
        if (!seen.has(c.id) && c.id.replace(/-/g, "").toLowerCase().startsWith(hexQuery)) {
          seen.add(c.id);
          combined.push(c);
        }
      }
    }

    if (combined.length > 0) {
      groups.push({
        key: "claims",
        label: "Claims",
        viewAllHref: `/claims?q=${encoded}`,
        items: combined.slice(0, 5).map((c) => {
          const refCode = `CLM-${c.id.slice(0, 8).toUpperCase()}`;
          const chip = chipFor(c.status);
          const parts = [c.customer_name, c.employee_name ? `Agent: ${c.employee_name}` : null, formatDate(c.payment_date)].filter(Boolean);
          return {
            id: c.id,
            group: "claims",
            title: `${refCode} · ${c.vehicle_reg_no}`,
            subtitle: parts.join(" · "),
            href: `/claims?q=${encodeURIComponent(refCode)}`,
            badge: chip.label,
            tone: chip.tone,
          };
        }),
      });
    }
  }

  // 4. Quote Requests
  if (allowQuotes && quotesRes && !quotesRes.error && quotesRes.data) {
    type QuoteHit = {
      id: string;
      status: string;
      notes: string | null;
      created_at: string;
      users: { full_name: string | null; mobile_number: string } | { full_name: string | null; mobile_number: string }[] | null;
      policies: { policy_number: string } | { policy_number: string }[] | null;
    };
    const rows = quotesRes.data as QuoteHit[];
    if (rows.length > 0) {
      groups.push({
        key: "quotes",
        label: "Quote Requests",
        viewAllHref: `/quotes?q=${encoded}`,
        items: rows.slice(0, 5).map((q) => {
          const usr = one(q.users);
          const pol = one(q.policies);
          const chip = chipFor(q.status);
          const person = usr?.full_name ?? usr?.mobile_number ?? "Quote request";
          const parts = [pol?.policy_number, q.notes, dateIST(q.created_at) ? formatDate(dateIST(q.created_at)!) : null].filter(Boolean);
          return {
            id: q.id,
            group: "quotes",
            title: person,
            subtitle: parts.join(" · ") || "Quote request",
            href: `/quotes/${q.id}`,
            badge: chip.label,
            tone: chip.tone,
          };
        }),
      });
    }
  }

  // 5. Support Tickets
  if (allowSupport && supportRes && !supportRes.error && supportRes.data) {
    type TicketHit = {
      id: string;
      subject: string;
      status: string;
      created_at: string;
      users: { full_name: string | null; mobile_number: string } | { full_name: string | null; mobile_number: string }[] | null;
    };
    const rows = supportRes.data as TicketHit[];
    if (rows.length > 0) {
      groups.push({
        key: "support",
        label: "Support Tickets",
        viewAllHref: `/support?q=${encoded}`,
        items: rows.slice(0, 5).map((t) => {
          const usr = one(t.users);
          const chip = chipFor(t.status);
          const person = usr?.full_name ?? usr?.mobile_number;
          const parts = [person, dateIST(t.created_at) ? formatDate(dateIST(t.created_at)!) : null].filter(Boolean);
          return {
            id: t.id,
            group: "support",
            title: t.subject,
            subtitle: parts.join(" · "),
            href: `/support/${t.id}`,
            badge: chip.label,
            tone: chip.tone,
          };
        }),
      });
    }
  }

  return { ok: true, groups };
}
