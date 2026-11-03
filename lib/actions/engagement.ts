"use server";

import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/module-types";
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
} from "@/lib/actions/shared";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const KINDS = ["renewal", "offer", "greeting", "announcement"]; // notifications_kind_check
const AUDIENCES = ["everyone", "advisor_clients", "general_users", "user"];

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
  const audience = text(formData, "audience");
  const target = text(formData, "target");
  const confirmed = formData.get("confirm") === "on";

  const fieldErrors: Record<string, string> = {};
  if (title.length < 3 || title.length > 100) fieldErrors.title = "Title must be 3 to 100 characters.";
  if (body.length < 3 || body.length > 1000) fieldErrors.body = "Message must be 3 to 1000 characters.";
  if (!KINDS.includes(kind)) fieldErrors.kind = "Choose a kind.";
  if (!AUDIENCES.includes(audience)) fieldErrors.audience = "Choose who should receive it.";
  const mobile = audience === "user" ? normalizeMobile(target) : null;
  if (audience === "user" && !mobile) fieldErrors.target = "Enter the user's 10-digit mobile number.";
  if (audience !== "user" && AUDIENCES.includes(audience) && !confirmed) {
    fieldErrors.confirm = "Tick this box to confirm the broadcast.";
  }
  if (Object.keys(fieldErrors).length > 0) return fail("Please fix the highlighted fields.", { fieldErrors, values });

  const db = await createClient();
  let recipients: string[];

  try {
    if (audience === "user") {
      const user = await db.from("users").select("id").eq("mobile_number", mobile!).maybeSingle();
      if (user.error) return fail(dbMessage(user.error), { values });
      if (!user.data) return fail("No user has this mobile number.", { fieldErrors: { target: "Not found." }, values });
      recipients = [user.data.id as string];
    } else {
      recipients = await allIds((from, to) => {
        const query = db.from("users").select("id").not("auth_user_id", "is", null).order("id");
        if (audience === "advisor_clients") return query.eq("is_advisor_client", true).range(from, to);
        if (audience === "general_users") {
          return query.or("is_advisor_client.is.null,is_advisor_client.eq.false").range(from, to);
        }
        return query.range(from, to);
      });
    }
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Could not find the recipients.", { values });
  }

  if (recipients.length === 0) return fail("There is nobody to send this to yet.", { values });

  for (let i = 0; i < recipients.length; i += 500) {
    const chunk = recipients.slice(i, i + 500).map((userId) => ({ user_id: userId, title, body, kind }));
    const inserted = await db.from("notifications").insert(chunk);
    if (inserted.error) {
      return fail(
        `Sent to ${i} of ${recipients.length} users, then it failed: ${dbMessage(inserted.error)}`,
        { values },
      );
    }
  }

  await audit(db, staff.id, `notification.${audience}`, "notification", null);
  return done(`Sent to ${recipients.length} user${recipients.length === 1 ? "" : "s"}. They will see it in the app's Updates feed.`);
}

/** Start of a day in India, or its last second, as a timestamptz string. */
const istStart = (date: string) => `${date}T00:00:00+05:30`;
const istEnd = (date: string) => `${date}T23:59:59+05:30`;

export async function createPlacement(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const staff = await requireStaff();
  if (!staff) return fail(NOT_STAFF);
  const values = formValues(formData);

  const slot = text(formData, "slot").toLowerCase().replace(/\s+/g, "_");
  const title = text(formData, "title");
  const body = text(formData, "body");
  const ctaLabel = text(formData, "ctaLabel");
  const actionUrl = text(formData, "actionUrl");
  const startsRaw = text(formData, "startsOn");
  const endsRaw = text(formData, "endsOn");

  const fieldErrors: Record<string, string> = {};
  if (!/^[a-z0-9_]{2,40}$/.test(slot)) fieldErrors.slot = "Use 2 to 40 letters, numbers or underscores.";
  if (title.length < 2 || title.length > 100) fieldErrors.title = "Title must be 2 to 100 characters.";
  if (body.length > 500) fieldErrors.body = "Message can be at most 500 characters.";
  if (ctaLabel.length > 30) fieldErrors.ctaLabel = "Button label can be at most 30 characters.";
  if (actionUrl) {
    let valid = actionUrl.startsWith("/");
    try {
      new URL(actionUrl);
      valid = true;
    } catch {
      /* relative paths are checked above */
    }
    if (!valid) fieldErrors.actionUrl = "Enter a full link such as https://example.com.";
  }
  const startsOn = startsRaw ? parseDate(startsRaw) : null;
  const endsOn = endsRaw ? parseDate(endsRaw) : null;
  if (startsRaw && !startsOn) fieldErrors.startsOn = "Enter a valid date.";
  if (endsRaw && !endsOn) fieldErrors.endsOn = "Enter a valid date.";
  if (startsOn && endsOn && endsOn < startsOn) fieldErrors.endsOn = "The end date must be on or after the start date.";
  if (Object.keys(fieldErrors).length > 0) return fail("Please fix the highlighted fields.", { fieldErrors, values });

  const db = await createClient();
  const inserted = await db
    .from("placements")
    .insert({
      slot_name: slot,
      title,
      body: body || null,
      cta_label: ctaLabel || null,
      action_url: actionUrl || null,
      starts_at: startsOn ? istStart(startsOn) : null,
      ends_at: endsOn ? istEnd(endsOn) : null,
      is_active: true,
    })
    .select("id")
    .single();
  if (inserted.error) return fail(dbMessage(inserted.error), { values });

  await audit(db, staff.id, "placement.create", "placement", inserted.data.id as string);
  return done("Placement created.");
}

async function setPlacementActive(id: string, active: boolean): Promise<ActionState> {
  const staff = await requireStaff();
  if (!staff) return fail(NOT_STAFF);
  if (!UUID.test(id)) return fail("That placement could not be found.");

  const db = await createClient();
  const result = await db.from("placements").update({ is_active: active }).eq("id", id).select("id");
  if (result.error) return fail(dbMessage(result.error));
  if ((result.data ?? []).length === 0) return fail("That placement could not be found.");

  await audit(db, staff.id, active ? "placement.on" : "placement.off", "placement", id);
  return done(active ? "Placement switched on." : "Placement switched off.");
}

export async function activatePlacement(id: string) {
  return setPlacementActive(id, true);
}

export async function deactivatePlacement(id: string) {
  return setPlacementActive(id, false);
}

export async function deletePlacement(id: string): Promise<ActionState> {
  const staff = await requireStaff();
  if (!staff) return fail(NOT_STAFF);
  if (!UUID.test(id)) return fail("That placement could not be found.");

  const db = await createClient();
  const result = await db.from("placements").delete().eq("id", id).select("id");
  if (result.error) return fail(dbMessage(result.error));
  if ((result.data ?? []).length === 0) return fail("That placement could not be found.");

  await audit(db, staff.id, "placement.delete", "placement", id);
  return done("Placement deleted.");
}
