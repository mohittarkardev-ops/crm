"use server";

import { createClient } from "@/lib/supabase/server";
import { one } from "@/lib/data/helpers";
import { formatDate } from "@/lib/format";
import type { ActionState, PreviewResult } from "@/lib/module-types";
import {
  NOT_STAFF,
  allIds,
  audit,
  dbMessage,
  done,
  fail,
  formValues,
  normalizeMobile,
  parseDate,
  requireStaff,
  text,
  type Db,
} from "@/lib/actions/shared";
import { categoryLabel } from "@/lib/status";

const KINDS = ["renewal", "offer", "greeting", "announcement"]; // notifications_kind_check
const AUDIENCES = ["everyone", "advisor_clients", "general_users", "user", "expiring"];
const CATEGORIES = ["car", "bike", "health", "term", "other"];
const MAX_RANGE_DAYS = 366;

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
    const user = await db.from("users").select("id").eq("mobile_number", input.mobile!).maybeSingle();
    if (user.error) return { error: dbMessage(user.error) };
    if (!user.data) return { error: "No user has this mobile number.", field: "target" };
    return { reachable: [user.data.id as string], unreachable: [] };
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

/** "How many people will this reach?" Nothing is sent. */
export async function previewNotification(formData: FormData): Promise<PreviewResult> {
  const staff = await requireStaff();
  if (!staff) return { ok: false, error: NOT_STAFF };

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
 * Sends a notification by writing one row per recipient into `notifications`; each user sees it in the app's
 * Updates feed. Broadcasts go to registered users only (people who have logged in to the app at least once).
 * Push alerts are not sent yet: that needs a device-token sender (Edge Function), which is a later step.
 */
export async function sendNotification(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const staff = await requireStaff();
  if (!staff) return fail(NOT_STAFF);
  const values = formValues(formData);

  const title = text(formData, "title");
  const body = text(formData, "body");
  const kind = text(formData, "kind");
  const confirmed = formData.get("confirm") === "on";
  const { input, fieldErrors } = readAudience(formData);

  if (title.length < 3 || title.length > 100) fieldErrors.title = "Title must be 3 to 100 characters.";
  if (body.length < 3 || body.length > 1000) fieldErrors.body = "Message must be 3 to 1000 characters.";
  if (!KINDS.includes(kind)) fieldErrors.kind = "Choose a kind.";
  if (input.audience !== "user" && AUDIENCES.includes(input.audience) && !confirmed) {
    fieldErrors.confirm = "Tick this box to confirm the broadcast.";
  }
  if (Object.keys(fieldErrors).length > 0) return fail("Please fix the highlighted fields.", { fieldErrors, values });

  const db = await createClient();
  const found = await findRecipients(db, input);
  if ("error" in found) {
    return fail(found.error, { fieldErrors: found.field ? { [found.field]: "Not found." } : undefined, values });
  }

  const recipients = found.reachable;
  if (recipients.length === 0) return fail("There is nobody to send this to yet.", { values });

  for (let i = 0; i < recipients.length; i += 500) {
    const chunk = recipients.slice(i, i + 500).map((userId) => ({ user_id: userId, title, body, kind }));
    const inserted = await db.from("notifications").insert(chunk);
    if (inserted.error) {
      return fail(`Sent to ${i} of ${recipients.length} users, then it failed: ${dbMessage(inserted.error)}`, { values });
    }
  }

  await audit(db, staff.id, `notification.${input.audience}`, "notification", null);

  let message = `Sent to ${recipients.length} user${recipients.length === 1 ? "" : "s"}. They will see it in the app's Updates feed.`;
  if (found.unreachable.length > 0) {
    message += ` ${found.unreachable.length} ${found.unreachable.length === 1 ? "client is" : "clients are"} not on the app yet and did not receive it.`;
  }
  return done(message);
}
