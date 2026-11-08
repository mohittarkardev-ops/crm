"use server";

import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/module-types";
import { NOT_STAFF, audit, dbMessage, done, fail, formValues, parseDate, requireStaff, text } from "@/lib/actions/shared";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Start of a day in India, or its last second, as a timestamptz string. */
const istStart = (date: string) => `${date}T00:00:00+05:30`;
const istEnd = (date: string) => `${date}T23:59:59+05:30`;

/** Reads and checks the placement form (shared by Create and Edit). */
function readPlacement(formData: FormData) {
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

  return {
    fieldErrors,
    data: {
      slot_name: slot,
      title,
      body: body || null,
      cta_label: ctaLabel || null,
      action_url: actionUrl || null,
      starts_at: startsOn ? istStart(startsOn) : null,
      ends_at: endsOn ? istEnd(endsOn) : null,
    },
  };
}

export async function createPlacement(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const staff = await requireStaff();
  if (!staff) return fail(NOT_STAFF);
  const values = formValues(formData);

  const { fieldErrors, data } = readPlacement(formData);
  if (Object.keys(fieldErrors).length > 0) return fail("Please fix the highlighted fields.", { fieldErrors, values });

  const db = await createClient();
  const inserted = await db.from("placements").insert({ ...data, is_active: true }).select("id").single();
  if (inserted.error) return fail(dbMessage(inserted.error), { values });

  await audit(db, staff.id, "placement.create", "placement", inserted.data.id as string);
  return done("Placement created.");
}

/** Saves changes to an existing placement. Whether it is on or off is not changed here (use Turn on / Turn off). */
export async function updatePlacement(id: string, _previous: ActionState, formData: FormData): Promise<ActionState> {
  const staff = await requireStaff();
  if (!staff) return fail(NOT_STAFF);
  if (!UUID.test(id)) return fail("That placement could not be found.");
  const values = formValues(formData);

  const { fieldErrors, data } = readPlacement(formData);
  if (Object.keys(fieldErrors).length > 0) return fail("Please fix the highlighted fields.", { fieldErrors, values });

  const db = await createClient();
  const updated = await db.from("placements").update(data).eq("id", id).select("id");
  if (updated.error) return fail(dbMessage(updated.error), { values });
  if ((updated.data ?? []).length === 0) return fail("That placement could not be found.", { values });

  await audit(db, staff.id, "placement.update", "placement", id);
  return done("Placement updated.");
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
