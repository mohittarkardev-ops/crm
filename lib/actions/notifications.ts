"use server";

import { createClient } from "@/lib/supabase/server";
import { one } from "@/lib/data/helpers";
import { formatDate } from "@/lib/format";
import type { ActionState, PreviewResult } from "@/lib/module-types";
import {
  authorize,
  allIds,
  audit,
  dbMessage,
  done,
  fail,
  formValues,
  normalizeMobile,
  parseDate,
  text,
  type Db,
} from "@/lib/actions/shared";
import { categoryLabel } from "@/lib/status";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const KINDS = ["renewal", "offer", "greeting", "announcement"]; // notifications_kind_check
const AUDIENCES = ["everyone", "advisor_clients", "general_users", "user", "expiring"];
const CATEGORIES = ["car", "bike", "health", "term", "other"];
const TEMPLATE_TYPES = ["broadcast", "automated", "user_specific"];
const MAX_RANGE_DAYS = 366;
const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

type Named<T> = T | T[] | null;
type Person = { name: string; mobile: string };
type Found = { reachable: string[]; unreachable: Person[] };

type AudienceInput = {
  audience: string;
  mobile: string | null;
  from: string | null;
  to: string | null;
  category: string;
};

/** Reads and checks the "who gets this" part of the form. */
function readAudience(formData: FormData): { input: AudienceInput; fieldErrors: Record<string, string> } {
  const audience = text(formData, "audience");
  const mobile = audience === "user" ? normalizeMobile(text(formData, "target")) : null;
  const from = parseDate(text(formData, "expiryFrom"));
  const to = parseDate(text(formData, "expiryTo"));
  const category = text(formData, "category");

  const fieldErrors: Record<string, string> = {};
  if (!AUDIENCES.includes(audience)) fieldErrors.audience = "Choose who should receive it.";
  if (audience === "user" && !mobile) fieldErrors.target = "Enter the user's 10-digit mobile number.";
  if (audience === "expiring") {
    if (!from) fieldErrors.expiryFrom = "Enter the first expiry date.";
    if (!to) fieldErrors.expiryTo = "Enter the last expiry date.";
    if (from && to && to < from) fieldErrors.expiryTo = "Must be on or after the first date.";
    if (from && to && to >= from) {
      const days = (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000;
      if (days > MAX_RANGE_DAYS) fieldErrors.expiryTo = "Choose a range of one year or less.";
    }
    if (category && !CATEGORIES.includes(category)) fieldErrors.category = "Choose a valid category.";
  }
  return { input: { audience, mobile, from, to, category }, fieldErrors };
}

/** Clients with a policy expiring in the range (not already renewed), split into reachable and not on the app yet. */
async function expiringRecipients(db: Db, from: string, to: string, category: string): Promise<Found | { error: string }> {
  const select = category
    ? "user_id, renewals(status, created_at), users(full_name, mobile_number, auth_user_id), policy_types!inner(code)"
    : "user_id, renewals(status, created_at), users(full_name, mobile_number, auth_user_id)";

  const people = new Map<string, Person & { registered: boolean }>();

  for (let start = 0; ; start += 1000) {
    let query = db
      .from("policies")
      .select(select)
      .gte("due_date", from)
      .lte("due_date", to)
      .not("user_id", "is", null)
      .order("id");
    if (category) query = query.eq("policy_types.code", category);

    const { data, error } = await query.range(start, start + 999);
    if (error) return { error: dbMessage(error) };

    const rows = (data ?? []) as unknown as {
      user_id: string | null;
      renewals: { status: string | null; created_at: string }[] | null;
      users: Named<{ full_name: string | null; mobile_number: string; auth_user_id: string | null }>;
    }[];

    for (const row of rows) {
      const latest = [...(row.renewals ?? [])].sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
      if (latest?.status === "renewed") continue; // already renewed: no reminder needed
      const user = one(row.users);
      if (!row.user_id || !user) continue;
      people.set(row.user_id, {
        name: user.full_name ?? user.mobile_number,
        mobile: user.mobile_number,
        registered: user.auth_user_id !== null,
      });
    }
    if (rows.length < 1000) break;
  }

  const reachable: string[] = [];
  const unreachable: Person[] = [];
  for (const [id, person] of people) {
    if (person.registered) reachable.push(id);
    else unreachable.push({ name: person.name, mobile: person.mobile });
  }
  return { reachable, unreachable };
}

async function findRecipients(db: Db, input: AudienceInput): Promise<Found | { error: string; field?: string }> {
  if (input.audience === "user") {
    const user = await db.from("users").select("id").eq("mobile_number", input.mobile!).limit(2);
    if (user.error) return { error: dbMessage(user.error) };
    const matches = user.data ?? [];
    if (matches.length === 0) return { error: "No user has this mobile number.", field: "target" };
    if (matches.length > 1) {
      return { error: "Multiple user accounts share this mobile number. Deduplicate them first.", field: "target" };
    }
    return { reachable: [matches[0].id as string], unreachable: [] };
  }

  if (input.audience === "expiring") {
    return expiringRecipients(db, input.from!, input.to!, input.category);
  }

  try {
    const reachable = await allIds((from, to) => {
      const query = db.from("users").select("id").not("auth_user_id", "is", null).order("id");
      if (input.audience === "advisor_clients") return query.eq("is_advisor_client", true).range(from, to);
      if (input.audience === "general_users") {
        return query.or("is_advisor_client.is.null,is_advisor_client.eq.false").range(from, to);
      }
      return query.range(from, to);
    });
    return { reachable, unreachable: [] };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not find the recipients." };
  }
}

function describeExpiry(input: AudienceInput) {
  const range =
    input.from === input.to ? `on ${formatDate(input.from!)}` : `between ${formatDate(input.from!)} and ${formatDate(input.to!)}`;
  return `policies expiring ${range}${input.category ? ` (${categoryLabel(input.category)})` : ""}`;
}

/**
 * Dispatches Expo push alerts to registered `device_tokens` for `userIds`.
 * Never throws: notification feed rows remain saved even if Expo Push is temporarily unreachable.
 */
async function dispatchPushAlerts(
  db: Db,
  userIds: string[],
  title: string,
  body: string,
  kind: string,
): Promise<{ totalTokens: number; sent: number }> {
  const tokens: string[] = [];
  for (let i = 0; i < userIds.length; i += 500) {
    const { data, error } = await db
      .from("device_tokens")
      .select("token")
      .in("user_id", userIds.slice(i, i + 500));
    if (error) return { totalTokens: 0, sent: 0 };
    for (const row of data ?? []) {
      if (row.token) tokens.push(row.token as string);
    }
  }
  if (tokens.length === 0) return { totalTokens: 0, sent: 0 };

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (process.env.EXPO_ACCESS_TOKEN) {
    headers.Authorization = `Bearer ${process.env.EXPO_ACCESS_TOKEN}`;
  }

  let sent = 0;
  const staleTokens: string[] = [];
  for (let i = 0; i < tokens.length; i += 100) {
    const batch = tokens.slice(i, i + 100);
    const messages = batch.map((to) => ({ to, sound: "default", title, body, data: { kind } }));
    try {
      const res = await fetch(EXPO_PUSH_URL, {
        method: "POST",
        headers,
        body: JSON.stringify(messages),
      });
      if (!res.ok) continue;
      const json = (await res.json()) as {
        data?: { status?: string; details?: { error?: string } }[];
      };
      const tickets = json.data ?? [];
      for (let idx = 0; idx < batch.length; idx++) {
        const ticket = tickets[idx];
        if (ticket?.status === "ok") {
          sent++;
        } else if (ticket?.details?.error === "DeviceNotRegistered") {
          staleTokens.push(batch[idx]);
        }
      }
    } catch {
      /* push delivery failure does not roll back in-app Updates feed notifications */
    }
  }

  for (let i = 0; i < staleTokens.length; i += 200) {
    await db.from("device_tokens").delete().in("token", staleTokens.slice(i, i + 200));
  }

  return { totalTokens: tokens.length, sent };
}

/** "How many people will this reach?" Nothing is sent. */
export async function previewNotification(formData: FormData): Promise<PreviewResult> {
  const auth = await authorize("notifications.send");
  if (!auth.staff) return { ok: false, error: auth.error.error ?? "You do not have permission to do this." };

  const { input, fieldErrors } = readAudience(formData);
  const problem = Object.values(fieldErrors)[0];
  if (problem) return { ok: false, error: problem };

  const db = await createClient();
  const found = await findRecipients(db, input);
  if ("error" in found) return { ok: false, error: found.error };

  const count = found.reachable.length;
  const who = input.audience === "expiring" ? `clients with ${describeExpiry(input)}` : "users";
  let summary =
    count === 0
      ? `Nobody would receive this: no ${who} are on the app.`
      : `This will reach ${count} ${input.audience === "expiring" ? "client" : "user"}${count === 1 ? "" : "s"}${
          input.audience === "expiring" ? ` with ${describeExpiry(input)}` : ""
        }.`;

  if (found.unreachable.length > 0) {
    summary += ` ${found.unreachable.length} more ${found.unreachable.length === 1 ? "client has" : "clients have"} not logged in to the app yet and cannot see it.`;
  }

  return {
    ok: true,
    summary,
    copyText:
      found.unreachable.length > 0
        ? found.unreachable.map((p) => `${p.name}\t${p.mobile}`).join("\n")
        : undefined,
    copyLabel: "Copy names and numbers of clients not on the app",
  };
}

/**
 * Writes one row per recipient into `notifications` (shown in the app's Updates feed) and dispatches
 * Expo Push alerts to any registered `device_tokens`.
 */
export async function sendNotification(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const auth = await authorize("notifications.send");
  if (!auth.staff) return auth.error;
  const staff = auth.staff;
  const values = formValues(formData);

  const templateId = text(formData, "templateId");
  let title = text(formData, "title");
  let body = text(formData, "body");
  const kind = text(formData, "kind");
  const confirmed = formData.get("confirm") === "on";
  const { input, fieldErrors } = readAudience(formData);

  const db = await createClient();
  let resolvedTemplateId: string | null = null;
  if (templateId) {
    if (!UUID.test(templateId)) {
      fieldErrors.templateId = "Choose a valid template.";
    } else {
      const tpl = await db.from("templates").select("id, title, body").eq("id", templateId).maybeSingle();
      if (tpl.error) return fail(dbMessage(tpl.error), { values });
      if (!tpl.data) {
        fieldErrors.templateId = "That template could not be found.";
      } else {
        resolvedTemplateId = tpl.data.id as string;
        if (!title) title = String(tpl.data.title ?? "").trim();
        if (!body) body = String(tpl.data.body ?? "").trim();
      }
    }
  }

  if (title.length < 3 || title.length > 100) fieldErrors.title = "Title must be 3 to 100 characters.";
  if (body.length < 3 || body.length > 1000) fieldErrors.body = "Message must be 3 to 1000 characters.";
  if (!KINDS.includes(kind)) fieldErrors.kind = "Choose a kind.";
  if (input.audience !== "user" && AUDIENCES.includes(input.audience) && !confirmed) {
    fieldErrors.confirm = "Tick this box to confirm the broadcast.";
  }
  if (Object.keys(fieldErrors).length > 0) return fail("Please fix the highlighted fields.", { fieldErrors, values });

  const found = await findRecipients(db, input);
  if ("error" in found) {
    return fail(found.error, { fieldErrors: found.field ? { [found.field]: "Not found." } : undefined, values });
  }

  const recipients = found.reachable;
  if (recipients.length === 0) return fail("There is nobody to send this to yet.", { values });

  for (let i = 0; i < recipients.length; i += 500) {
    const chunk = recipients.slice(i, i + 500).map((userId) => ({
      user_id: userId,
      template_id: resolvedTemplateId,
      title,
      body,
      kind,
    }));
    const inserted = await db.from("notifications").insert(chunk);
    if (inserted.error) {
      return fail(`Sent to ${i} of ${recipients.length} users, then it failed: ${dbMessage(inserted.error)}`, { values });
    }
  }

  const pushResult = await dispatchPushAlerts(db, recipients, title, body, kind);

  await audit(db, staff.id, `notification.${input.audience}`, "notification", null);

  const pushNote =
    pushResult.totalTokens === 0
      ? " (no devices registered for push alerts yet)"
      : ` (${pushResult.sent} of ${pushResult.totalTokens} device push alerts delivered)`;
  let message = `Sent to ${recipients.length} user${recipients.length === 1 ? "" : "s"}${pushNote}.`;
  if (found.unreachable.length > 0) {
    message += ` ${found.unreachable.length} ${found.unreachable.length === 1 ? "client is" : "clients are"} not on the app yet and did not receive it.`;
  }
  return done(message);
}

/** Deletes a single sent notification from a user's feed. */
export async function deleteNotification(id: string): Promise<ActionState> {
  const auth = await authorize("notifications.send");
  if (!auth.staff) return auth.error;
  const staff = auth.staff;
  if (!UUID.test(id)) return fail("That notification could not be found.");

  const db = await createClient();
  const result = await db.from("notifications").delete().eq("id", id).select("id");
  if (result.error) return fail(dbMessage(result.error));
  if ((result.data ?? []).length === 0) return fail("That notification could not be found.");

  await audit(db, staff.id, "notification.delete", "notification", id);
  return done("Notification removed.");
}

/* ----------------------------- Templates CRUD ----------------------------- */

function readTemplate(formData: FormData) {
  const name = text(formData, "name");
  const title = text(formData, "title");
  const body = text(formData, "body");
  const type = text(formData, "type") || "broadcast";

  const fieldErrors: Record<string, string> = {};
  if (name.length < 2 || name.length > 80) fieldErrors.name = "Template name must be 2 to 80 characters.";
  if (title.length < 3 || title.length > 100) fieldErrors.title = "Title must be 3 to 100 characters.";
  if (body.length < 3 || body.length > 1000) fieldErrors.body = "Message must be 3 to 1000 characters.";
  if (!TEMPLATE_TYPES.includes(type)) fieldErrors.type = "Choose a valid template type.";

  return {
    fieldErrors,
    data: { name, title, body, type },
  };
}

export async function createTemplate(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const auth = await authorize("notifications.send");
  if (!auth.staff) return auth.error;
  const staff = auth.staff;
  const values = formValues(formData);

  const { fieldErrors, data } = readTemplate(formData);
  if (Object.keys(fieldErrors).length > 0) return fail("Please fix the highlighted fields.", { fieldErrors, values });

  const db = await createClient();
  const inserted = await db.from("templates").insert(data).select("id").single();
  if (inserted.error) return fail(dbMessage(inserted.error), { values });

  await audit(db, staff.id, "template.create", "template", inserted.data.id as string);
  return done("Template saved.");
}

export async function updateTemplate(id: string, _previous: ActionState, formData: FormData): Promise<ActionState> {
  const auth = await authorize("notifications.send");
  if (!auth.staff) return auth.error;
  const staff = auth.staff;
  if (!UUID.test(id)) return fail("That template could not be found.");
  const values = formValues(formData);

  const { fieldErrors, data } = readTemplate(formData);
  if (Object.keys(fieldErrors).length > 0) return fail("Please fix the highlighted fields.", { fieldErrors, values });

  const db = await createClient();
  const updated = await db.from("templates").update(data).eq("id", id).select("id");
  if (updated.error) return fail(dbMessage(updated.error), { values });
  if ((updated.data ?? []).length === 0) return fail("That template could not be found.", { values });

  await audit(db, staff.id, "template.update", "template", id);
  return done("Template updated.");
}

export async function deleteTemplate(id: string): Promise<ActionState> {
  const auth = await authorize("notifications.send");
  if (!auth.staff) return auth.error;
  const staff = auth.staff;
  if (!UUID.test(id)) return fail("That template could not be found.");

  const db = await createClient();
  const removed = await db.from("templates").delete().eq("id", id).select("id");
  if (removed.error) return fail(dbMessage(removed.error));
  if ((removed.data ?? []).length === 0) return fail("That template could not be found.");

  await audit(db, staff.id, "template.delete", "template", id);
  return done("Template deleted.");
}
