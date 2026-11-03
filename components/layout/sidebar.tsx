"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, ShieldCheck } from "lucide-react";
import { signOut } from "@/app/login/actions";
import { cn } from "@/lib/cn";
import { NAV_ITEMS, SETTINGS_ITEM, type NavItem } from "@/lib/nav";

const GROUPS: NavItem[][] = [NAV_ITEMS.slice(0, 5), NAV_ITEMS.slice(5), [SETTINGS_ITEM]];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

const ROW = "flex h-9 w-full items-center gap-3 rounded-[4px] px-3 text-[13px] transition-colors duration-150";

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        ROW,
        active ? "bg-sidebar-active font-semibold text-ink" : "text-ink-muted hover:bg-sidebar-active/60 hover:text-ink",
      )}
    >
      <Icon size={16} strokeWidth={1.75} aria-hidden="true" />
      {item.label}
    </Link>
  );
}

/** Text sidebar (desktop) plus a bottom bar (small screens). Design.md section 3. */
export function Sidebar() {
  const pathname = usePathname();

  return (
    <>
      <aside className="fade-up sticky top-4 hidden h-[calc(100vh-2rem)] w-60 shrink-0 flex-col rounded-card bg-sidebar p-4 shadow-card lg:flex">
        <Link href="/" className="mb-5 flex items-center gap-3 px-1">
          <span className="grid size-9 place-items-center rounded-control bg-ink text-white">
            <ShieldCheck size={18} strokeWidth={1.75} aria-hidden="true" />
          </span>
          <span className="leading-tight">
            <span className="block text-[15px] font-bold text-ink">SecureDrive</span>
            <span className="block text-[11px] text-ink-muted">CRM</span>
          </span>
        </Link>

        <nav aria-label="Main" className="flex-1 overflow-y-auto">
          {GROUPS.map((group, i) => (
            <div key={i} className={cn("space-y-0.5", i > 0 && "mt-3 border-t border-divider pt-3")}>
              {group.map((item) => (
                <NavLink key={item.href} item={item} active={isActive(pathname, item.href)} />
              ))}
            </div>
          ))}
        </nav>

        <form action={signOut} className="mt-3 border-t border-divider pt-3">
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
        {NAV_ITEMS.slice(0, 5).map((item) => {
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
