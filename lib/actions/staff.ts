"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ActionState } from "@/lib/module-types";
import { audit, dbMessage, done, fail, formValues, isEmail, requireStaff, text } from "@/lib/actions/shared";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ROLES = ["admin", "staff"]; // staff_users_role_check

const NOT_ADMIN = "Only admins can manage staff.";
const NO_KEY =
  "Staff accounts need the SUPABASE_SERVICE_ROLE_KEY setting on the server. Add it to .env.local (and to Vercel), then restart.";

async function requireAdmin() {
  const staff = await requireStaff();
  return staff && staff.role === "admin" ? staff : null;
}

/** Form values to show again after an error. The password is never sent back. */
function safeValues(formData: FormData) {
  const values = formValues(formData);
  delete values.password;
  delete values.newPassword;
  return values;
}

/**
 * Creates a staff login: a Supabase sign-in (email + password, already confirmed) and its staff_users row with the
 * chosen role. Everything is allowed or refused by the same admin-only database rules, and a failed second step
 * removes the login again so nothing half-created is left behind.
 */
export async function addStaff(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  if (!admin) return fail(NOT_ADMIN);
  const values = safeValues(formData);

  const name = text(formData, "name");
  const email = text(formData, "email").toLowerCase();
  const role = text(formData, "role");
  const password = String(formData.get("password") ?? "");

  const fieldErrors: Record<string, string> = {};
  if (name.length < 2 || name.length > 120) fieldErrors.name = "Enter their full name.";
  if (!isEmail(email)) fieldErrors.email = "Enter a valid email address.";
  if (!ROLES.includes(role)) fieldErrors.role = "Choose a role.";
  if (password.length < 8 || password.length > 72) fieldErrors.password = "Use 8 to 72 characters.";
  if (Object.keys(fieldErrors).length > 0) return fail("Please fix the highlighted fields.", { fieldErrors, values });

  const auth = createAdminClient();
  if (!auth) return fail(NO_KEY, { values });
  const db = await createClient();

  const existing = await db.from("staff_users").select("id").eq("email", email).maybeSingle();
  if (existing.error) return fail(dbMessage(existing.error), { values });
  if (existing.data) {
    return fail("This email already has a staff account.", { fieldErrors: { email: "Already a staff member." }, values });
  }

  const created = await auth.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: name },
  });
  if (created.error || !created.data.user) {
    const message = created.error?.message ?? "Could not create the login.";
    if (/already|registered|exists/i.test(message)) {
      return fail("A login with this email already exists.", {
        fieldErrors: { email: "Already has a login. Remove it in Supabase first, or use another email." },
        values,
      });
    }
    return fail(message, { values });
  }

  const authId = created.data.user.id;
  const inserted = await db
    .from("staff_users")
    .insert({ email, full_name: name, role, auth_user_id: authId })
    .select("id")
    .single();
  if (inserted.error) {
    await auth.auth.admin.deleteUser(authId); // roll back the half-created login
    return fail(dbMessage(inserted.error), { values });
  }

  await audit(db, admin.id, "staff.create", "staff_user", inserted.data.id as string);
  return done(`${name} can now sign in as ${role === "admin" ? "an admin" : "staff"}.`);
}

async function adminCount(db: Awaited<ReturnType<typeof createClient>>) {
  const res = await db.from("staff_users").select("id", { count: "exact", head: true }).eq("role", "admin");
  return res.count ?? 0;
}

/** Changes a staff member's name or role, and optionally sets a new password. */
export async function updateStaff(id: string, _previous: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  if (!admin) return fail(NOT_ADMIN);
  if (!UUID.test(id)) return fail("That staff member could not be found.");
  const values = safeValues(formData);

  const name = text(formData, "name");
  const role = text(formData, "role");
  const newPassword = String(formData.get("newPassword") ?? "");

  const db = await createClient();
  const target = await db.from("staff_users").select("id, role, auth_user_id").eq("id", id).maybeSingle();
  if (target.error) return fail(dbMessage(target.error), { values });
  if (!target.data) return fail("That staff member could not be found.", { values });

  const fieldErrors: Record<string, string> = {};
  if (name.length < 2 || name.length > 120) fieldErrors.name = "Enter their full name.";
  if (!ROLES.includes(role)) fieldErrors.role = "Choose a role.";
  if (newPassword && (newPassword.length < 8 || newPassword.length > 72)) fieldErrors.newPassword = "Use 8 to 72 characters.";
  if (id === admin.id && role !== target.data.role) fieldErrors.role = "You cannot change your own role.";
  if (Object.keys(fieldErrors).length > 0) return fail("Please fix the highlighted fields.", { fieldErrors, values });

  if (target.data.role === "admin" && role !== "admin" && (await adminCount(db)) <= 1) {
    return fail("At least one admin is required.", { fieldErrors: { role: "This is the only admin." }, values });
  }

  const auth = newPassword ? createAdminClient() : null;
  if (newPassword && !auth) return fail(NO_KEY, { values });

  const updated = await db.from("staff_users").update({ full_name: name, role }).eq("id", id).select("id");
  if (updated.error) return fail(dbMessage(updated.error), { values });

  if (newPassword && auth && target.data.auth_user_id) {
    const changed = await auth.auth.admin.updateUserById(target.data.auth_user_id as string, { password: newPassword });
    if (changed.error) return fail(`Saved the name and role, but the password was not changed: ${changed.error.message}`, { values });
  }

  await audit(db, admin.id, "staff.update", "staff_user", id);
  return done(newPassword ? "Staff updated and the password was changed." : "Staff updated.");
}

/** Removes a staff member's access: deletes their login and their staff_users row. */
export async function removeStaff(id: string): Promise<ActionState> {
  const admin = await requireAdmin();
  if (!admin) return fail(NOT_ADMIN);
  if (!UUID.test(id)) return fail("That staff member could not be found.");
  if (id === admin.id) return fail("You cannot remove your own account.");

  const db = await createClient();
  const target = await db.from("staff_users").select("id, role, auth_user_id").eq("id", id).maybeSingle();
  if (target.error) return fail(dbMessage(target.error));
  if (!target.data) return fail("That staff member could not be found.");
  if (target.data.role === "admin" && (await adminCount(db)) <= 1) return fail("At least one admin is required.");

  const removed = await db.from("staff_users").delete().eq("id", id);
  if (removed.error) return fail(dbMessage(removed.error));

  // Also delete the sign-in itself so the password stops working. Best effort: without the service key the person
  // can still sign in but is refused by the CRM because they are no longer staff.
  const auth = createAdminClient();
  if (auth && target.data.auth_user_id) await auth.auth.admin.deleteUser(target.data.auth_user_id as string);

  await audit(db, admin.id, "staff.remove", "staff_user", id);
  return done("Staff access removed.");
}
