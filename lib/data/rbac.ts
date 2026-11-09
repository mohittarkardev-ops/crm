import { createClient } from "@/lib/supabase/server";
import { MODULES, type PermissionKey } from "@/lib/rbac/permissions";

export type RoleItem = {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  permissions: string[];
  staffCount: number;
};

export type StaffOverride = {
  permission: string;
  granted: boolean;
};

/**
 * Loads all roles with their assigned permissions and staff user count.
 */
export async function getRoles(): Promise<RoleItem[]> {
  const db = await createClient();

  const [rolesRes, permsRes, staffRes] = await Promise.all([
    db.from("roles").select("id, name, description, is_system").order("is_system", { ascending: false }).order("name"),
    db.from("role_permissions").select("role_id, permission"),
    db.from("staff_users").select("role_id"),
  ]);

  if (rolesRes.error) {
    console.error("Failed to load roles (migration 0010 may be pending):", rolesRes.error.message);
    return [];
  }

  const permsMap = new Map<string, string[]>();
  (permsRes.data ?? []).forEach((rp) => {
    const list = permsMap.get(rp.role_id) || [];
    list.push(rp.permission);
    permsMap.set(rp.role_id, list);
  });

  const staffCountMap = new Map<string, number>();
  (staffRes.data ?? []).forEach((s) => {
    if (s.role_id) {
      staffCountMap.set(s.role_id, (staffCountMap.get(s.role_id) || 0) + 1);
    }
  });

  return (rolesRes.data ?? []).map((r) => ({
    id: r.id as string,
    name: r.name as string,
    description: r.description as string | null,
    isSystem: Boolean(r.is_system),
    permissions: permsMap.get(r.id) || [],
    staffCount: staffCountMap.get(r.id) || 0,
  }));
}

/**
 * Loads individual custom permission overrides for a specific staff member.
 */
export async function getStaffCustomPermissions(staffId: string): Promise<StaffOverride[]> {
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

/** Returns the modules and permissions list for the UI editor. */
export function getAvailablePermissionCatalog() {
  return MODULES;
}
