"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { audit, authorize } from "@/lib/actions/shared";
import { isValidPermissionKey } from "@/lib/rbac/permissions";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type RbacActionState = {
  ok: boolean;
  message?: string;
  error?: string;
};

function normalizePermissions(list: string[]): string[] | null {
  const unique = new Set<string>();
  for (const raw of list) {
    if (!isValidPermissionKey(raw)) return null;
    unique.add(raw);
  }
  return Array.from(unique);
}

/** Creates a new custom role with validated permissions. Rolls back role creation if permissions insert fails. */
export async function createRoleAction(
  name: string,
  description: string,
  permissions: string[],
): Promise<RbacActionState> {
  const auth = await authorize("staff.manage");
  if (!auth.staff) return { ok: false, error: auth.error.error ?? "Not authorized." };
  const staff = auth.staff;

  const cleanName = name.trim();
  if (!cleanName || cleanName.length < 2 || cleanName.length > 60) {
    return { ok: false, error: "Please enter a valid role name (2 to 60 characters)." };
  }

  const validPerms = normalizePermissions(permissions);
  if (!validPerms) {
    return { ok: false, error: "One or more permission keys are invalid." };
  }

  const db = await createClient();

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

  if (validPerms.length > 0) {
    const permInserts = validPerms.map((p) => ({
      role_id: newRole.id,
      permission: p,
    }));
    const { error: permErr } = await db.from("role_permissions").insert(permInserts);
    if (permErr) {
      await db.from("roles").delete().eq("id", newRole.id);
      return { ok: false, error: `Could not save role permissions: ${permErr.message}` };
    }
  }

  await audit(db, staff.id, "role.create", "role", newRole.id);
  revalidatePath("/", "layout");
  return { ok: true, message: `Role "${cleanName}" created successfully.` };
}

/** Updates permissions and details of an existing role atomically. */
export async function updateRoleAction(
  roleId: string,
  name: string,
  description: string,
  permissions: string[],
): Promise<RbacActionState> {
  const auth = await authorize("staff.manage");
  if (!auth.staff) return { ok: false, error: auth.error.error ?? "Not authorized." };
  const staff = auth.staff;

  if (!UUID.test(roleId)) return { ok: false, error: "Role not found." };

  const validPerms = normalizePermissions(permissions);
  if (!validPerms) {
    return { ok: false, error: "One or more permission keys are invalid." };
  }

  const db = await createClient();

  const { data: currentRole, error: findErr } = await db
    .from("roles")
    .select("id, name, is_system")
    .eq("id", roleId)
    .maybeSingle();

  if (findErr || !currentRole) {
    return { ok: false, error: "Role not found." };
  }

  // Update role name & description (system role names cannot be changed)
  const updatePayload: { description: string | null; name?: string } = {
    description: description.trim() || null,
  };
  if (!currentRole.is_system) {
    const cleanName = name.trim();
    if (!cleanName || cleanName.length < 2 || cleanName.length > 60) {
      return { ok: false, error: "Please enter a valid role name (2 to 60 characters)." };
    }
    updatePayload.name = cleanName;
  }

  const { error: updErr } = await db.from("roles").update(updatePayload).eq("id", roleId);
  if (updErr) {
    if (updErr.code === "23505") {
      return { ok: false, error: "A role with that name already exists." };
    }
    return { ok: false, error: `Could not update role: ${updErr.message}` };
  }

  // System role 'Admin' always has all permissions; don't overwrite its table rows.
  if (currentRole.name !== "Admin") {
    const rpcRes = await db.rpc("save_role_permissions", {
      p_role_id: roleId,
      p_permissions: validPerms,
    });

    if (rpcRes.error) {
      if (rpcRes.error.code === "PGRST202" || rpcRes.error.code === "42883") {
        // Fallback when migration 0012 RPC is not yet present: snapshot old permissions to avoid partial wipes.
        const { data: prevRows, error: prevErr } = await db
          .from("role_permissions")
          .select("permission")
          .eq("role_id", roleId);
        if (prevErr) {
          return { ok: false, error: `Could not read current role permissions: ${prevErr.message}` };
        }

        const { error: delErr } = await db.from("role_permissions").delete().eq("role_id", roleId);
        if (delErr) {
          return { ok: false, error: `Could not update role permissions: ${delErr.message}` };
        }

        if (validPerms.length > 0) {
          const { error: insErr } = await db.from("role_permissions").insert(
            validPerms.map((p) => ({ role_id: roleId, permission: p })),
          );
          if (insErr) {
            if (prevRows && prevRows.length > 0) {
              await db
                .from("role_permissions")
                .insert((prevRows as { permission: string }[]).map((r) => ({ role_id: roleId, permission: r.permission })));
            }
            return { ok: false, error: `Could not save role permissions: ${insErr.message}` };
          }
        }
      } else {
        return { ok: false, error: `Could not save role permissions: ${rpcRes.error.message}` };
      }
    }
  }

  await audit(db, staff.id, "role.update", "role", roleId);
  revalidatePath("/", "layout");
  return { ok: true, message: `Role "${updatePayload.name ?? currentRole.name}" updated successfully.` };
}

/** Deletes a custom role (refuses system roles and roles still assigned to staff). */
export async function deleteRoleAction(roleId: string): Promise<RbacActionState> {
  const auth = await authorize("staff.manage");
  if (!auth.staff) return { ok: false, error: auth.error.error ?? "Not authorized." };
  const staff = auth.staff;

  if (!UUID.test(roleId)) return { ok: false, error: "Role not found." };

  const db = await createClient();

  const { data: currentRole, error: findErr } = await db
    .from("roles")
    .select("id, name, is_system")
    .eq("id", roleId)
    .maybeSingle();

  if (findErr || !currentRole) {
    return { ok: false, error: "Role not found." };
  }

  if (currentRole.is_system) {
    return { ok: false, error: `The system role "${currentRole.name}" cannot be deleted.` };
  }

  const { count: assignedCount, error: countErr } = await db
    .from("staff_users")
    .select("id", { count: "exact", head: true })
    .eq("role_id", roleId);

  if (countErr) {
    return { ok: false, error: `Could not check assigned staff: ${countErr.message}` };
  }
  if ((assignedCount ?? 0) > 0) {
    return {
      ok: false,
      error: `Cannot delete "${currentRole.name}" while ${assignedCount} staff member${assignedCount === 1 ? " is" : "s are"} assigned to it. Reassign them first.`,
    };
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
 * Saves primary role and individual permission overrides for a login-enabled staff member,
 * enforcing last-admin, self-lockout, no-login-agent, and permission-catalog guards.
 */
export async function saveStaffPermissionsAction(
  staffId: string,
  roleId: string | null,
  overrides: { permission: string; granted: boolean }[],
): Promise<RbacActionState> {
  const auth = await authorize("staff.manage");
  if (!auth.staff) return { ok: false, error: auth.error.error ?? "Not authorized." };
  const actor = auth.staff;

  if (!UUID.test(staffId)) return { ok: false, error: "Staff member not found." };
  if (roleId && !UUID.test(roleId)) return { ok: false, error: "Invalid role selected." };

  const dedupedOverrides = new Map<string, boolean>();
  for (const item of overrides) {
    if (!isValidPermissionKey(item.permission)) {
      return { ok: false, error: "One or more permission keys are invalid." };
    }
    dedupedOverrides.set(item.permission, Boolean(item.granted));
  }

  const db = await createClient();

  const { data: target, error: targetErr } = await db
    .from("staff_users")
    .select("id, role, role_id, auth_user_id")
    .eq("id", staffId)
    .maybeSingle();

  if (targetErr) return { ok: false, error: `Could not load staff account: ${targetErr.message}` };
  if (!target) return { ok: false, error: "Staff member not found." };

  if (!target.auth_user_id) {
    return { ok: false, error: "Agents without a CRM login cannot be assigned roles or permissions." };
  }

  let targetRoleText: "admin" | "staff" = "staff";
  if (roleId) {
    const { data: roleData, error: roleErr } = await db
      .from("roles")
      .select("id, name")
      .eq("id", roleId)
      .maybeSingle();
    if (roleErr || !roleData) {
      return { ok: false, error: "Selected role could not be found." };
    }
    if (roleData.name === "Admin") {
      targetRoleText = "admin";
    }
  } else {
    return { ok: false, error: "Choose a primary role for this staff member." };
  }

  if (staffId === actor.id && targetRoleText !== target.role) {
    return { ok: false, error: "You cannot change your own admin role." };
  }

  if (target.role === "admin" && targetRoleText !== "admin") {
    const { count: admins, error: adminErr } = await db
      .from("staff_users")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin");
    if (adminErr) return { ok: false, error: `Could not verify admin count: ${adminErr.message}` };
    if ((admins ?? 0) <= 1) {
      return { ok: false, error: "At least one admin is required." };
    }
  }

  const { data: prevOverrides, error: prevErr } = await db
    .from("staff_custom_permissions")
    .select("permission, granted")
    .eq("staff_id", staffId);
  if (prevErr) {
    return { ok: false, error: `Could not read existing overrides: ${prevErr.message}` };
  }

  const { error: staffErr } = await db
    .from("staff_users")
    .update({
      role_id: roleId,
      role: targetRoleText,
    })
    .eq("id", staffId);

  if (staffErr) {
    return { ok: false, error: `Could not update staff role: ${staffErr.message}` };
  }

  const { error: delErr } = await db.from("staff_custom_permissions").delete().eq("staff_id", staffId);
  if (delErr) {
    await db.from("staff_users").update({ role_id: target.role_id, role: target.role }).eq("id", staffId);
    return { ok: false, error: `Could not update overrides: ${delErr.message}` };
  }

  const inserts =
    targetRoleText === "admin"
      ? []
      : Array.from(dedupedOverrides.entries()).map(([permission, granted]) => ({
          staff_id: staffId,
          permission,
          granted,
        }));

  if (inserts.length > 0) {
    const { error: insErr } = await db.from("staff_custom_permissions").insert(inserts);
    if (insErr) {
      // Restore prior role + overrides on insert failure
      await db.from("staff_users").update({ role_id: target.role_id, role: target.role }).eq("id", staffId);
      if (prevOverrides && prevOverrides.length > 0) {
        await db.from("staff_custom_permissions").insert(
          (prevOverrides as { permission: string; granted: boolean }[]).map((o) => ({
            staff_id: staffId,
            permission: o.permission,
            granted: o.granted,
          })),
        );
      }
      return { ok: false, error: `Could not save permission overrides: ${insErr.message}` };
    }
  }

  await audit(db, actor.id, "staff.permissions_update", "staff", staffId);
  revalidatePath("/", "layout");
  return { ok: true, message: "Staff permissions and role updated successfully." };
}

/** Fetches custom permission overrides for a staff member (for the permissions drawer). */
export async function getStaffCustomPermissionsAction(
  staffId: string,
): Promise<{ permission: string; granted: boolean }[]> {
  const auth = await authorize("staff.manage");
  if (!auth.staff || !UUID.test(staffId)) return [];

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
