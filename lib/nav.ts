import {
  Award,
  Bell,
  FileText,
  LayoutDashboard,
  LifeBuoy,
  Megaphone,
  Settings,
  ShieldCheck,
  BarChart3,
  Users,
  RefreshCcw,
  MessageSquareQuote,
  Wallet,
  TableProperties,
  UploadCloud,
  type LucideIcon,
} from "lucide-react";
import type { PermissionKey } from "@/lib/rbac/permissions";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** The permission needed to see this screen. The sidebar hides the item without it. */
  permission: PermissionKey;
};

/** Sidebar modules (design.md section 3 & 6). */
export const NAV_ITEMS: NavItem[] = [
  // Core Operations
  { href: "/", label: "Dashboard", icon: LayoutDashboard, permission: "dashboard.view" },
  { href: "/clients", label: "Clients", icon: Users, permission: "clients.view" },
  { href: "/policies", label: "Policies", icon: FileText, permission: "policies.view" },
  { href: "/renewals", label: "Renewals", icon: RefreshCcw, permission: "renewals.view" },
  { href: "/claims", label: "Claims", icon: Wallet, permission: "claims.view" },
  { href: "/incentives", label: "Incentives", icon: Award, permission: "incentives.view" },
  { href: "/quotes", label: "Quote Requests", icon: MessageSquareQuote, permission: "quotes.view" },

  // Tools & Analytics
  { href: "/data-grid", label: "Data Grid", icon: TableProperties, permission: "datagrid.view" },
  { href: "/import", label: "Data Transfer", icon: UploadCloud, permission: "import.view" },
  { href: "/reports", label: "Reports", icon: BarChart3, permission: "reports.view" },

  // Platform & Communications
  { href: "/notifications", label: "Notifications", icon: Bell, permission: "notifications.view" },
  { href: "/placements", label: "Placements", icon: Megaphone, permission: "placements.view" },
  { href: "/support", label: "Support", icon: LifeBuoy, permission: "support.view" },
  { href: "/ads", label: "Ad Controls", icon: ShieldCheck, permission: "ads.view" },
];

export const SETTINGS_ITEM: NavItem = {
  href: "/settings",
  label: "Settings",
  icon: Settings,
  permission: "settings.view",
};

export const ALL_NAV_ITEMS: NavItem[] = [...NAV_ITEMS, SETTINGS_ITEM];

export function findNavItem(pathname: string): NavItem | undefined {
  if (pathname === "/") return NAV_ITEMS[0];
  return ALL_NAV_ITEMS.find((item) => item.href !== "/" && pathname.startsWith(item.href));
}
