import { redirect } from "next/navigation";
import { getStaff } from "@/lib/auth";
import { allowedPermissions, can, type PermissionKey } from "@/lib/rbac/permissions";

/**
 * Put this at the top of every page (server component). Signed out goes to the login page; signed in without
 * the permission goes to a "no access" page. Returns the staff member so the page can use it.
 */
export async function requirePermission(permission: PermissionKey) {
  const { user, staff } = await getStaff();
  if (!user || !staff) redirect("/login");
  if (!can(staff, permission)) redirect("/no-access");
  return staff;
}

/**
 * Like requirePermission, but for pages that show something different instead of refusing (for example the
 * Settings page, which hides the staff list from staff). Returns the signed-in staff member and a checker.
 */
export async function getAccess() {
  const { user, staff } = await getStaff();
  if (!user || !staff) redirect("/login");
  return {
    staff,
    can: (permission: PermissionKey) => can(staff, permission),
    allowed: allowedPermissions(staff),
  };
}
