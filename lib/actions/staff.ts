"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ActionState } from "@/lib/module-types";
import { audit, authorize, dbMessage, done, fail, formValues, isEmail, normalizeMobile, text } from "@/lib/actions/shared";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ROLES = ["admin", "staff"]; // staff_users_role_check

const NOT_ADMIN = "Only admins can manage staff.";
const NO_KEY =
  "Staff accounts need the SUPABASE_SERVICE_ROLE_KEY setting on the server. Add it to .env.local (and to Vercel), then restart.";

type Db = Awaited<ReturnType<typeof createClient>>;

async function requireAdmin() {
  const auth = await authorize("staff.manage");
  return auth.staff ?? null;
}

/** Form values to show again after an error. The password is never sent back. */
function safeValues(formData: FormData) {
  const values = formValues(formData);
  delete values.password;
  delete values.newPassword;
  return values;
}

/** Employee code, mobile and designation: optional for everyone. Problems are added to `fieldErrors`. */
function readProfile(formData: FormData, fieldErrors: Record<string, string>) {
  const code = text(formData, "employeeCode").toUpperCase();
  if (code && !/^[A-Z0-9-]{2,20}$/.test(code)) fieldErrors.employeeCode = "Use 2 to 20 letters, numbers or dashes.";

  const mobileRaw = text(formData, "mobile");
  const mobile = mobileRaw ? normalizeMobile(mobileRaw) : null;
  if (mobileRaw && !mobile) fieldErrors.mobile = "Enter a valid 10-digit Indian mobile number.";

  const designation = text(formData, "designation");
  if (designation.length > 60) fieldErrors.designation = "Use 60 characters or fewer.";

  return {
    employee_code: code || null,
    mobile_number: mobile,
    designation: designation || null,
  };
}

/** True when another staff row already uses this employee code. */
async function codeTaken(db: Db, code: string, exceptId?: string) {
  let query = db.from("staff_users").select("id").eq("employee_code", code);
  if (exceptId) query = query.neq("id", exceptId);
  const res = await query.limit(1);
  return { error: res.error, taken: (res.data ?? []).length > 0 };
}

/**
 * Adds a person. Two kinds:
 *  - "Can sign in": a Supabase login (email + password, already confirmed) plus its staff_users row with the chosen
 *    role. A failed second step removes the login again so nothing half-created is left behind.
 *  - "No login": an agent who never signs in (no email, no password, no role). They only exist as a name and details.
 */
export async function addStaff(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  if (!admin) return fail(NOT_ADMIN);
  const values = safeValues(formData);

  const withLogin = text(formData, "access") !== "none";
  const name = text(formData, "name");
  const email = text(formData, "email").toLowerCase();
  const role = text(formData, "role");
  const password = String(formData.get("password") ?? "");

  const fieldErrors: Record<string, string> = {};
  if (name.length < 2 || name.length > 120) fieldErrors.name = "Enter their full name.";
  const profile = readProfile(formData, fieldErrors);
  if (withLogin) {
    if (!isEmail(email)) fieldErrors.email = "Enter a valid email address.";
    if (!ROLES.includes(role)) fieldErrors.role = "Choose a role.";
    else if (role === "admin" && admin.role !== "admin") fieldErrors.role = "Only admins can create admin accounts.";
    if (password.length < 8 || password.length > 72) fieldErrors.password = "Use 8 to 72 characters.";
  }
  if (Object.keys(fieldErrors).length > 0) return fail("Please fix the highlighted fields.", { fieldErrors, values });

  const db = await createClient();

  if (profile.employee_code) {
    const check = await codeTaken(db, profile.employee_code);
    if (check.error) return fail(dbMessage(check.error), { values });
    if (check.taken) {
      return fail("This employee code is already used.", { fieldErrors: { employeeCode: "Used by someone else." }, values });
    }
  }

  if (!withLogin) {
    const agent = await db
      .from("staff_users")
      .insert({ full_name: name, email: null, role: null, auth_user_id: null, ...profile })
      .select("id")
      .single();
    if (agent.error) return fail(dbMessage(agent.error), { values });
    await audit(db, admin.id, "staff.create", "staff_user", agent.data.id as string);
    return done(`${name} was added as an agent without a login.`);
  }

  const auth = createAdminClient();
  if (!auth) return fail(NO_KEY, { values });

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
  const roleId = await resolveSystemRoleId(db, role as "admin" | "staff");
  const inserted = await db
    .from("staff_users")
    .insert({ email, full_name: name, role, ...(roleId ? { role_id: roleId } : {}), auth_user_id: authId, ...profile })
    .select("id")
    .single();
  if (inserted.error) {
    await auth.auth.admin.deleteUser(authId); // roll back the half-created login
    return fail(dbMessage(inserted.error), { values });
  }

  await audit(db, admin.id, "staff.create", "staff_user", inserted.data.id as string);
  return done(`${name} can now sign in as ${role === "admin" ? "an admin" : "staff"}.`);
}

async function adminCount(db: Db) {
  const res = await db.from("staff_users").select("id", { count: "exact", head: true }).eq("role", "admin");
  return res.count ?? 0;
}

async function resolveSystemRoleId(db: Db, systemRole: "admin" | "staff"): Promise<string | null> {
  const roleName = systemRole === "admin" ? "Admin" : "Staff";
  const { data, error } = await db.from("roles").select("id").eq("name", roleName).maybeSingle();
  if (error || !data) return null;
  return data.id as string;
}

/**
 * Changes a person's name and details. For people who sign in it also changes the role and, optionally, sets a new
 * password. For agents without a login the role and password are ignored.
 */
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
  const isActorAdmin = admin.role === "admin";
  if (!isActorAdmin && target.data.role === "admin") {
    return fail("Only admins can edit admin accounts.", { values });
  }
  const hasLogin = Boolean(target.data.auth_user_id);
  const canEditTargetRole = isActorAdmin && id !== admin.id;
  const effectiveRole = hasLogin && !role && !canEditTargetRole ? (target.data.role as string) : role;

  const fieldErrors: Record<string, string> = {};
  if (name.length < 2 || name.length > 120) fieldErrors.name = "Enter their full name.";
  const profile = readProfile(formData, fieldErrors);
  if (hasLogin) {
    if (!ROLES.includes(effectiveRole)) fieldErrors.role = "Choose a role.";
    if (newPassword && (newPassword.length < 8 || newPassword.length > 72)) fieldErrors.newPassword = "Use 8 to 72 characters.";
    if (id === admin.id && effectiveRole !== target.data.role) fieldErrors.role = "You cannot change your own role.";
    else if (!isActorAdmin && effectiveRole === "admin") fieldErrors.role = "Only admins can assign the Admin role.";
  }
  if (Object.keys(fieldErrors).length > 0) return fail("Please fix the highlighted fields.", { fieldErrors, values });

  if (profile.employee_code) {
    const check = await codeTaken(db, profile.employee_code, id);
    if (check.error) return fail(dbMessage(check.error), { values });
    if (check.taken) {
      return fail("This employee code is already used.", { fieldErrors: { employeeCode: "Used by someone else." }, values });
    }
  }

  if (hasLogin && target.data.role === "admin" && effectiveRole !== "admin" && (await adminCount(db)) <= 1) {
    return fail("At least one admin is required.", { fieldErrors: { role: "This is the only admin." }, values });
  }

  const auth = hasLogin && newPassword ? createAdminClient() : null;
  if (hasLogin && newPassword && !auth) return fail(NO_KEY, { values });

  let rolePatch: { role?: string; role_id?: string } = {};
  if (hasLogin) {
    rolePatch.role = effectiveRole;
    if (effectiveRole !== target.data.role) {
      const nextRoleId = await resolveSystemRoleId(db, effectiveRole as "admin" | "staff");
      if (nextRoleId) rolePatch.role_id = nextRoleId;
    }
  }

  const updated = await db
    .from("staff_users")
    .update({ full_name: name, ...rolePatch, ...profile })
    .eq("id", id)
    .select("id");
  if (updated.error) return fail(dbMessage(updated.error), { values });

  if (hasLogin && newPassword && auth) {
    const changed = await auth.auth.admin.updateUserById(target.data.auth_user_id as string, { password: newPassword });
    if (changed.error) return fail(`Saved the details, but the password was not changed: ${changed.error.message}`, { values });
  }

  await audit(db, admin.id, "staff.update", "staff_user", id);
  return done(hasLogin && newPassword ? "Staff updated and the password was changed." : "Staff updated.");
}

/** Switches an agent without a login on or off. People who sign in are removed instead. */
async function setAgentActive(id: string, active: boolean): Promise<ActionState> {
  const admin = await requireAdmin();
  if (!admin) return fail(NOT_ADMIN);
  if (!UUID.test(id)) return fail("That staff member could not be found.");

  const db = await createClient();
  const target = await db.from("staff_users").select("id, auth_user_id").eq("id", id).maybeSingle();
  if (target.error) return fail(dbMessage(target.error));
  if (!target.data) return fail("That staff member could not be found.");
  if (target.data.auth_user_id) return fail("This person signs in. Remove their access instead.");

  const result = await db.from("staff_users").update({ is_active: active }).eq("id", id).select("id");
  if (result.error) return fail(dbMessage(result.error));

  await audit(db, admin.id, active ? "staff.activate" : "staff.deactivate", "staff_user", id);
  return done(active ? "Agent switched on." : "Agent switched off.");
}

export async function deactivateAgent(id: string): Promise<ActionState> {
  return setAgentActive(id, false);
}

export async function activateAgent(id: string): Promise<ActionState> {
  return setAgentActive(id, true);
}

/** Removes a person: deletes their login (if they have one) and their staff_users row. */
export async function removeStaff(id: string): Promise<ActionState> {
  const admin = await requireAdmin();
  if (!admin) return fail(NOT_ADMIN);
  if (!UUID.test(id)) return fail("That staff member could not be found.");
  if (id === admin.id) return fail("You cannot remove your own account.");

  const db = await createClient();
  const target = await db.from("staff_users").select("id, role, auth_user_id").eq("id", id).maybeSingle();
  if (target.error) return fail(dbMessage(target.error));
  if (!target.data) return fail("That staff member could not be found.");
  if (admin.role !== "admin" && target.data.role === "admin") return fail("Only admins can remove admin accounts.");
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
