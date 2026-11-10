"use server";

import { createClient } from "@/lib/supabase/server";
import { todayIST } from "@/lib/data/helpers";
import type { ActionState } from "@/lib/module-types";
import { audit, authorize, dbMessage, done, fail, formValues, isEmail, normalizeMobile, parseDate, text } from "@/lib/actions/shared";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function readClientForm(formData: FormData) {
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
  if (dobRaw && (!dob || dob > todayIST())) fieldErrors.dob = "Enter a valid date of birth.";

  return {
    fieldErrors,
    data: { name, mobile, email: email || null, isAdvisorClient: type === "advisor_client", dob },
  };
}

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

  const { fieldErrors, data } = readClientForm(formData);
  if (Object.keys(fieldErrors).length > 0) return fail("Please fix the highlighted fields.", { fieldErrors, values });

  const db = await createClient();

  const existing = await db.from("users").select("id, full_name").eq("mobile_number", data.mobile!).maybeSingle();
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
      mobile_number: data.mobile!,
      full_name: data.name,
      email: data.email,
      is_advisor_client: data.isAdvisorClient,
      date_of_birth: data.dob,
    })
    .select("id")
    .single();

  if (created.error) return fail(dbMessage(created.error), { values });

  await audit(db, staff.id, "client.create", "user", created.data.id);
  return done(`${data.name} was added.`);
}

/** Updates an existing client's name, mobile number, email, type and date of birth. */
export async function updateClient(clientId: string, _previous: ActionState, formData: FormData): Promise<ActionState> {
  const auth = await authorize("clients.edit");
  if (!auth.staff) return auth.error;
  const staff = auth.staff;
  if (!UUID.test(clientId)) return fail("That client could not be found.");
  const values = formValues(formData);

  const { fieldErrors, data } = readClientForm(formData);
  if (Object.keys(fieldErrors).length > 0) return fail("Please fix the highlighted fields.", { fieldErrors, values });

  const db = await createClient();

  const duplicate = await db
    .from("users")
    .select("id, full_name")
    .eq("mobile_number", data.mobile!)
    .neq("id", clientId)
    .limit(1);
  if (duplicate.error) return fail(dbMessage(duplicate.error), { values });
  if ((duplicate.data ?? []).length > 0) {
    const existing = duplicate.data![0];
    const who = existing.full_name ? ` (${existing.full_name})` : "";
    return fail("Another client already uses this mobile number.", {
      fieldErrors: { mobile: `Already registered${who}.` },
      values,
    });
  }

  const updated = await db.rpc("crm_update_client", {
    p_user_id: clientId,
    p_mobile: data.mobile!,
    p_full_name: data.name,
    p_email: data.email,
    p_is_advisor_client: data.isAdvisorClient,
    p_dob: data.dob,
  });
  if (updated.error) {
    if (updated.error.code === "PGRST202" || updated.error.code === "42883") {
      return fail("Please run migration 0013_rbac_anti_escalation.sql in the Supabase SQL Editor first.", { values });
    }
    return fail(dbMessage(updated.error), { values });
  }
  if (updated.data !== true) return fail("That client could not be found.", { values });

  await audit(db, staff.id, "client.update", "user", clientId);
  return done(`${data.name} updated.`);
}
