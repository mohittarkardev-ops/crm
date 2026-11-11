/**
 * The single list of what can be allowed or denied in the CRM.
 *
 * - Every module and its permissions are defined here, once. The sidebar, the page guards and the server
 *   actions all read this list, so a new module is protected the moment it is added here.
 * - A permission key is "module.action", for example "placements.manage".
 * - `adminOnly` means staff do not get it by default. Today the only rule is the role (admin or staff); when
 *   role editing is built, only `can()` below changes. No page or action needs to be touched again.
 */

export type Role = "admin" | "staff";

type PermissionDef = { key: string; label: string; adminOnly?: boolean };
type ModuleDef = { key: string; label: string; permissions: readonly PermissionDef[] };

export const MODULES = [
  {
    key: "dashboard",
    label: "Dashboard",
    permissions: [{ key: "dashboard.view", label: "View the dashboard" }],
  },
  {
    key: "clients",
    label: "Clients",
    permissions: [
      { key: "clients.view", label: "View clients" },
      { key: "clients.create", label: "Add clients" },
      { key: "clients.edit", label: "Edit client details" },
    ],
  },
  {
    key: "policies",
    label: "Policies",
    permissions: [
      { key: "policies.view", label: "View policies" },
      { key: "policies.create", label: "Add policies" },
      { key: "policies.edit", label: "Edit policy details and documents" },
      { key: "policies.delete", label: "Delete policies", adminOnly: true },
      { key: "policies.verify", label: "Verify or reject policies" },
    ],
  },
  {
    key: "renewals",
    label: "Renewals",
    permissions: [
      { key: "renewals.view", label: "View renewals" },
      { key: "renewals.update", label: "Change renewal status" },
    ],
  },
  {
    key: "quotes",
    label: "Quote Requests",
    permissions: [
      { key: "quotes.view", label: "View quote requests" },
      { key: "quotes.update", label: "Change quote status" },
    ],
  },
  {
    key: "notifications",
    label: "Notifications",
    permissions: [
      { key: "notifications.view", label: "View notifications" },
      { key: "notifications.send", label: "Send notifications" },
    ],
  },
  {
    key: "placements",
    label: "Placements",
    permissions: [
      { key: "placements.view", label: "View placements" },
      { key: "placements.manage", label: "Create, edit, switch and delete placements" },
    ],
  },
  {
    key: "support",
    label: "Support",
    permissions: [
      { key: "support.view", label: "View support tickets" },
      { key: "support.update", label: "Change ticket status" },
    ],
  },
  {
    key: "ads",
    label: "Ad Controls",
    permissions: [
      { key: "ads.view", label: "View ad controls" },
      { key: "ads.manage", label: "Switch ad slots and ad-free users" },
    ],
  },
  {
    key: "reports",
    label: "Reports",
    permissions: [{ key: "reports.view", label: "View reports" }],
  },
  {
    key: "claims",
    label: "Claims",
    permissions: [
      { key: "claims.view", label: "View claims" },
      { key: "claims.create", label: "Add claims" },
      { key: "claims.approve", label: "Approve or reject claims", adminOnly: true },
    ],
  },
  {
    key: "incentives",
    label: "Incentives",
    permissions: [
      { key: "incentives.view", label: "View incentives dashboard" },
      { key: "incentives.manage", label: "Configure vehicle incentive rules & view all staff payouts", adminOnly: true },
    ],
  },
  {
    key: "datagrid",
    label: "Data Grid",
    permissions: [
      { key: "datagrid.view", label: "Open the data grid (power view)", adminOnly: true },
      { key: "datagrid.edit", label: "Inline-edit cells in the grid", adminOnly: true },
      { key: "datagrid.export", label: "Export grid data to CSV / Excel", adminOnly: true },
    ],
  },
  {
    key: "import",
    label: "Data Transfer",
    permissions: [
      { key: "import.view", label: "Open bulk import and lookup tools", adminOnly: true },
      { key: "import.import", label: "Bulk import policies (CSV/Excel/JSON)", adminOnly: true },
      { key: "import.lookup", label: "Bulk lookup vehicle exporter", adminOnly: true },
    ],
  },
  {
    key: "settings",
    label: "Settings",
    permissions: [
      { key: "settings.view", label: "View settings" },
      { key: "settings.edit", label: "Edit the business profile" },
    ],
  },
  {
    key: "staff",
    label: "Staff",
    permissions: [{ key: "staff.manage", label: "Add, edit and remove staff", adminOnly: true }],
  },
] as const satisfies readonly ModuleDef[];

export type PermissionKey = (typeof MODULES)[number]["permissions"][number]["key"];

const ALL_PERMISSIONS: PermissionKey[] = (MODULES as readonly ModuleDef[]).flatMap((m) =>
  m.permissions.map((p) => p.key as PermissionKey),
);

const ALL_PERMISSIONS_SET = new Set<string>(ALL_PERMISSIONS);
const ADMIN_ONLY_PERMISSIONS_SET = new Set<string>(
  (MODULES as readonly ModuleDef[]).flatMap((m) =>
    m.permissions.filter((p) => p.adminOnly).map((p) => p.key),
  ),
);

export function isValidPermissionKey(key: string): key is PermissionKey {
  return ALL_PERMISSIONS_SET.has(key);
}

export function isAdminOnlyPermission(key: string): boolean {
  return ADMIN_ONLY_PERMISSIONS_SET.has(key);
}

/** Who is asking. Can carry role and the person's own permission list from RBAC. */
export type Subject = {
  role: Role | null;
  permissions?: string[] | readonly string[] | null;
};

/**
 * Can this person do this?
 * 1. Admins can do everything.
 * 2. Non-admins require an explicit permissions array (from roles + individual overrides).
 * 3. Fail closed: if permissions are missing or could not be loaded for a non-admin, allow Dashboard only.
 */
export function can(subject: Subject | null | undefined, permission: PermissionKey): boolean {
  if (!subject) return false;
  if (subject.role === "admin") return true;

  if (Array.isArray(subject.permissions)) {
    return subject.permissions.includes(permission);
  }

  return permission === "dashboard.view";
}

/** Every permission this person has. Sent to the browser only to hide buttons; the server stays the authority. */
export function allowedPermissions(subject: Subject | null | undefined): PermissionKey[] {
  return ALL_PERMISSIONS.filter((permission) => can(subject, permission));
}
