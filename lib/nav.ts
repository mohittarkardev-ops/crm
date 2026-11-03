import {
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
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

/** Sidebar modules (design.md section 6). */
export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/clients", label: "Clients", icon: Users },
  { href: "/policies", label: "Policies", icon: FileText },
  { href: "/renewals", label: "Renewals", icon: RefreshCcw },
  { href: "/quotes", label: "Quote Requests", icon: MessageSquareQuote },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/placements", label: "Placements", icon: Megaphone },
  { href: "/support", label: "Support", icon: LifeBuoy },
  { href: "/ads", label: "Ad Controls", icon: ShieldCheck },
  { href: "/reports", label: "Reports", icon: BarChart3 },
];

export const SETTINGS_ITEM: NavItem = { href: "/settings", label: "Settings", icon: Settings };

export const ALL_NAV_ITEMS: NavItem[] = [...NAV_ITEMS, SETTINGS_ITEM];

export function findNavItem(pathname: string): NavItem | undefined {
  if (pathname === "/") return NAV_ITEMS[0];
  return ALL_NAV_ITEMS.find((item) => item.href !== "/" && pathname.startsWith(item.href));
}
