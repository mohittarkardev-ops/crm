"use server";

import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/module-types";
import { audit, authorize, dbMessage, done, fail, formValues, isEmail, normalizeMobile, parseDate, text } from "@/lib/actions/shared";

/**
 * Adds a client. The mobile number is stored in the same +91XXXXXXXXXX format the app uses, with no auth
 * account attached. When this person later signs in to the app, link_current_user() finds this row by
 * mobile number and attaches their login, so their policies appear automatically.
 */
export async function addClient(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const auth = await authorize("clients.create");
  if (!auth.staff) return auth.error;
  const staff = auth.staff;
  const values = formValues(formData);

  const name = text(formData, "name");
  const mobile = normalizeMobile(text(formData, "mobile"));
  const email = text(formData, "email");
  const type = text(formData, "type");
  const dobRaw = text(formData, "dob");

  const fieldErrors: Record<string, string> = {};
  if (name.length < 2) fieldErrors.name = "Enter the client's full name.";
  if (name.length > 120) fieldErrors.name = "Name is too long.";
  if (!mobile) fieldErrors.mobile = "Enter a valid 10-digit Indian mobile number.";
  if (email && !isEmail(email)) fieldErrors.email = "Enter a valid email address.";
  if (type !== "advisor_client" && type !== "general") fieldErrors.type = "Choose the client type.";
  const dob = dobRaw ? parseDate(dobRaw) : null;
  if (dobRaw && (!dob || dob > new Date().toISOString().slice(0, 10))) fieldErrors.dob = "Enter a valid date of birth.";
  if (Object.keys(fieldErrors).length > 0) return fail("Please fix the highlighted fields.", { fieldErrors, values });

  const db = await createClient();

  const existing = await db.from("users").select("id, full_name").eq("mobile_number", mobile!).maybeSingle();
  if (existing.error) return fail(dbMessage(existing.error), { values });
  if (existing.data) {
    const who = existing.data.full_name ? ` (${existing.data.full_name})` : "";
    return fail("This mobile number is already registered.", {
      fieldErrors: { mobile: `Already in the system${who}.` },
      values,
    });
  }

  const created = await db
    .from("users")
    .insert({
      mobile_number: mobile!,
      full_name: name,
      email: email || null,
      is_advisor_client: type === "advisor_client",
      date_of_birth: dob,
    })
    .select("id")
    .single();

  if (created.error) return fail(dbMessage(created.error), { values });

  await audit(db, staff.id, "client.create", "user", created.data.id);
  return done(`${name} was added.`);
}
