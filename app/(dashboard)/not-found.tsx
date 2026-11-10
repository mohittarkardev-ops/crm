import { NotFoundView } from "@/components/ui/not-found-view";
import { getStaff } from "@/lib/auth";
import { ALL_NAV_ITEMS } from "@/lib/nav";
import { allowedPermissions, type PermissionKey } from "@/lib/rbac/permissions";

const SEARCHABLE_PERMISSIONS: PermissionKey[] = [
  "policies.view",
  "clients.view",
  "claims.view",
  "quotes.view",
  "support.view",
];

/**
 * Custom 404 inside the dashboard shell: displays Pip the Policy Scout, RBAC-safe quick navigation,
 * and a Global Search shortcut when the signed-in role can search records.
 */
export default async function DashboardNotFoundPage() {
  const { staff } = await getStaff();
  const allowed = staff ? allowedPermissions(staff) : [];
  const accessible = ALL_NAV_ITEMS.filter((item) => allowed.includes(item.permission));

  const primary = accessible[0] ?? { href: "/no-access", label: "No access" };
  const quickLinks = accessible
    .filter((item) => item.href !== primary.href)
    .slice(0, 5)
    .map((item) => ({ href: item.href, label: item.label }));
  const canSearch = SEARCHABLE_PERMISSIONS.some((p) => allowed.includes(p));

  return (
    <NotFoundView
      primaryHref={primary.href}
      primaryLabel={`Go to ${primary.label}`}
      quickLinks={quickLinks}
      canSearch={canSearch}
    />
  );
}
