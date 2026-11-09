"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { audit, type Db } from "@/lib/actions/shared";
import { requirePermission } from "@/lib/rbac/server";

export type RbacActionState = {
  ok: boolean;
  message?: string;
  error?: string;
};

/** Creates a new custom role with the selected permissions. */
export async function createRoleAction(
  name: string,
  description: string,
  permissions: string[]
): Promise<RbacActionState> {
  const staff = await requirePermission("staff.manage");
  const db = await createClient();

  const cleanName = name.trim();
  if (!cleanName || cleanName.length < 2) {
    return { ok: false, error: "Please enter a valid role name (at least 2 characters)." };
  }

  const { data: newRole, error: roleErr } = await db
    .from("roles")
    .insert({
      name: cleanName,
      description: description.trim() || null,
      is_system: false,
    })
    .select("id")
    .single();

  if (roleErr || !newRole) {
    if (roleErr?.code === "23505") {
      return { ok: false, error: "A role with that name already exists." };
    }
    return { ok: false, error: `Could not create role: ${roleErr?.message}` };
  }

  if (permissions.length > 0) {
    const permInserts = permissions.map((p) => ({
      role_id: newRole.id,
      permission: p,
    }));
    await db.from("role_permissions").insert(permInserts);
  }

  await audit(db, staff.id, "role.create", "role", newRole.id);
  revalidatePath("/", "layout");
  return { ok: true, message: `Role "${cleanName}" created successfully.` };
}

/** Updates permissions and details of an existing role. */
export async function updateRoleAction(
  roleId: string,
  name: string,
  description: string,
  permissions: string[]
): Promise<RbacActionState> {
  const staff = await requirePermission("staff.manage");
  const db = await createClient();

  const { data: currentRole, error: findErr } = await db
    .from("roles")
    .select("id, name, is_system")
    .eq("id", roleId)
    .single();

  if (findErr || !currentRole) {
    return { ok: false, error: "Role not found." };
  }

  // Update role name & description (system role names cannot be changed)
  const updatePayload: Record<string, any> = {
    description: description.trim() || null,
  };
  if (!currentRole.is_system) {
    const cleanName = name.trim();
    if (!cleanName || cleanName.length < 2) {
      return { ok: false, error: "Please enter a valid role name." };
    }
    updatePayload.name = cleanName;
  }

  const { error: updErr } = await db.from("roles").update(updatePayload).eq("id", roleId);
  if (updErr) {
    return { ok: false, error: `Could not update role: ${updErr.message}` };
  }

  // System role 'Admin' always has all permissions; don't wipe them
  if (currentRole.name !== "Admin") {
    await db.from("role_permissions").delete().eq("role_id", roleId);

    if (permissions.length > 0) {
      const inserts = permissions.map((p) => ({
        role_id: roleId,
        permission: p,
      }));
      await db.from("role_permissions").insert(inserts);
    }
  }

  await audit(db, staff.id, "role.update", "role", roleId);
  revalidatePath("/", "layout");
  return { ok: true, message: `Role "${currentRole.name}" updated successfully.` };
}

/** Deletes a custom role (system roles cannot be deleted). */
export async function deleteRoleAction(roleId: string): Promise<RbacActionState> {
  const staff = await requirePermission("staff.manage");
  const db = await createClient();

  const { data: currentRole, error: findErr } = await db
    .from("roles")
    .select("id, name, is_system")
    .eq("id", roleId)
    .single();

  if (findErr || !currentRole) {
    return { ok: false, error: "Role not found." };
  }

  if (currentRole.is_system) {
    return { ok: false, error: `The system role "${currentRole.name}" cannot be deleted.` };
  }

  const { error: delErr } = await db.from("roles").delete().eq("id", roleId);
  if (delErr) {
    return { ok: false, error: `Failed to delete role: ${delErr.message}` };
  }

  await audit(db, staff.id, "role.delete", "role", roleId);
  revalidatePath("/", "layout");
  return { ok: true, message: `Role "${currentRole.name}" deleted.` };
}

/**
 * Saves primary role and individual permission overrides for a specific staff member.
 */
export async function saveStaffPermissionsAction(
  staffId: string,
  roleId: string | null,
  overrides: { permission: string; granted: boolean }[]
): Promise<RbacActionState> {
  const staff = await requirePermission("staff.manage");
  const db = await createClient();

  // If roleId provided, check if it's the Admin role to set staff_users.role accordingly
  let targetRoleText = "staff";
  if (roleId) {
    const { data: roleData } = await db.from("roles").select("name").eq("id", roleId).maybeSingle();
    if (roleData?.name === "Admin") {
      targetRoleText = "admin";
    }
  }

  // Update staff user's role_id and text role
  const { error: staffErr } = await db
    .from("staff_users")
    .update({
      role_id: roleId || null,
      role: targetRoleText,
    })
    .eq("id", staffId);

  if (staffErr) {
    return { ok: false, error: `Could not update staff role: ${staffErr.message}` };
  }

  // Clear existing custom overrides for this staff
  await db.from("staff_custom_permissions").delete().eq("staff_id", staffId);

  // Insert new overrides
  if (overrides.length > 0) {
    const inserts = overrides.map((o) => ({
      staff_id: staffId,
      permission: o.permission,
      granted: o.granted,
    }));
    await db.from("staff_custom_permissions").insert(inserts);
  }

  await audit(db, staff.id, "staff.permissions_update", "staff", staffId);
  revalidatePath("/", "layout");
  return { ok: true, message: "Staff permissions and role updated successfully." };
}

/** Fetches custom permission overrides for a staff member (for the permissions drawer). */
export async function getStaffCustomPermissionsAction(staffId: string): Promise<{ permission: string; granted: boolean }[]> {
  await requirePermission("staff.manage");
  const db = await createClient();
  const { data, error } = await db
    .from("staff_custom_permissions")
    .select("permission, granted")
    .eq("staff_id", staffId);

  if (error) {
    console.error("Failed to load staff custom permissions:", error.message);
    return [];
  }

  return (data ?? []).map((cp) => ({
    permission: cp.permission as string,
    granted: Boolean(cp.granted),
  }));
}
