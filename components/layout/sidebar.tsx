"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, ShieldCheck } from "lucide-react";
import { signOut } from "@/app/login/actions";
import { cn } from "@/lib/cn";
import { NAV_ITEMS, SETTINGS_ITEM, type NavItem } from "@/lib/nav";
import type { PermissionKey } from "@/lib/rbac/permissions";

const GROUPS: NavItem[][] = [
  NAV_ITEMS.slice(0, 6), // Core Operations
  NAV_ITEMS.slice(6, 9), // Tools & Analytics
  NAV_ITEMS.slice(9),    // Platform & Communications
  [SETTINGS_ITEM],       // Settings
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

const ROW = "flex h-8 w-full items-center gap-3 rounded-[4px] px-3 text-[13px] transition-colors duration-150";

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        ROW,
        "group relative",
        active ? "bg-sidebar-active font-semibold text-ink" : "text-ink-muted hover:bg-sidebar-active/60 hover:text-ink",
      )}
    >
      {active && <span aria-hidden="true" className="absolute left-1 top-1.5 bottom-1.5 w-[3px] rounded-full bg-accent" />}
      <Icon
        size={16}
        strokeWidth={1.75}
        className={cn("transition-transform duration-150", !active && "group-hover:translate-x-0.5")}
        aria-hidden="true"
      />
      {item.label}
    </Link>
  );
}

/**
 * Text sidebar (desktop) plus a bottom bar (small screens). Design.md section 3.
 * `allowed` is the list of permissions the signed-in person has; screens they cannot open are not shown.
 * This only hides links. Each page and each action checks the permission again on the server.
 */
export function Sidebar({ allowed }: { allowed: PermissionKey[] }) {
  const pathname = usePathname();
  const visible = (item: NavItem) => allowed.includes(item.permission);
  const groups = GROUPS.map((group) => group.filter(visible)).filter((group) => group.length > 0);
  const mobileItems = NAV_ITEMS.slice(0, 5).filter(visible);

  return (
    <>
      <aside className="fade-up sticky top-4 hidden h-[calc(100vh-2rem)] w-60 shrink-0 flex-col rounded-card bg-sidebar p-3.5 shadow-card lg:flex">
        <Link href="/" className="mb-3.5 flex items-center gap-3 px-1">
          <span className="grid size-9 place-items-center rounded-control bg-ink text-white">
            <ShieldCheck size={18} strokeWidth={1.75} aria-hidden="true" />
          </span>
          <span className="leading-tight">
            <span className="block text-[15px] font-bold text-ink">SecureDrive</span>
            <span className="block text-[11px] text-ink-muted">CRM</span>
          </span>
        </Link>

        <nav aria-label="Main" className="flex-1 overflow-y-auto pr-0.5">
          {groups.map((group, i) => (
            <div key={i} className={cn("space-y-0.5", i > 0 && "mt-2 border-t border-divider pt-2")}>
              {group.map((item) => (
                <NavLink key={item.href} item={item} active={isActive(pathname, item.href)} />
              ))}
            </div>
          ))}
        </nav>

        <form action={signOut} className="mt-2.5 border-t border-divider pt-2.5">
          <button
            type="submit"
            className={cn(ROW, "text-ink-muted hover:bg-sidebar-active/60 hover:text-ink")}
          >
            <LogOut size={16} strokeWidth={1.75} aria-hidden="true" />
            Sign out
          </button>
        </form>
      </aside>

      <nav
        aria-label="Main"
        className="glass fixed inset-x-3 bottom-3 z-30 flex items-center justify-around rounded-card px-2 py-2 shadow-card lg:hidden"
      >
        {mobileItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              aria-current={active ? "page" : undefined}
              className={cn(
                "grid size-11 place-items-center rounded-[4px]",
                active ? "bg-sidebar-active text-ink" : "text-ink-muted",
              )}
            >
              <Icon size={20} strokeWidth={1.75} aria-hidden="true" />
            </Link>
          );
        })}
      </nav>
    </>
  );
}
