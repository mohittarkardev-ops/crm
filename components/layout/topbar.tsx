"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { ChevronDown, LogOut, Search } from "lucide-react";
import { signOut } from "@/app/login/actions";
import { AutoRefresh } from "@/components/layout/auto-refresh";
import { NotificationBell } from "@/components/layout/notification-bell";
import { findNavItem } from "@/lib/nav";

export type Account = { id: string; name: string; email: string; role: "admin" | "staff" | null };

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

/** Page title on the left; search, bell and account menu on the right (design.md section 3). */
export function Topbar({ account }: { account: Account }) {
  const pathname = usePathname();
  const title = findNavItem(pathname)?.label ?? "Dashboard";
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const roleLabel = account.role === "admin" ? "Admin" : "Staff";

  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  return (
    <header className="flex items-center justify-between gap-4 border-b-[1.5px] border-rule pb-3">
      <h1 className="text-2xl font-bold leading-8 text-ink">{title}</h1>

      <div className="flex items-center gap-3">
        <AutoRefresh />
        <label className="glass hidden h-10 w-64 items-center gap-2 rounded-control px-3 text-ink-faint focus-within:border-accent md:flex">
          <Search size={16} strokeWidth={1.75} aria-hidden="true" />
          <input
            type="search"
            aria-label="Search"
            placeholder="Search clients, policies…"
            className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink-faint"
          />
        </label>

        <NotificationBell staffId={account.id} />

        <div ref={menuRef} className="relative">
          <button
            type="button"
            aria-label="Account menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
            className="glass flex h-10 items-center gap-2.5 rounded-control py-1 pl-1 pr-3 transition-colors hover:bg-surface-strong"
          >
            <span className="grid size-8 place-items-center rounded-full bg-accent text-xs font-semibold text-ink">
              {initials(account.name)}
            </span>
            <span className="hidden text-left sm:block">
              <span className="block text-xs font-semibold leading-4 text-ink">{account.name}</span>
              <span className="block text-[11px] leading-[14px] text-ink-muted">{roleLabel}</span>
            </span>
            <ChevronDown size={14} strokeWidth={1.75} className="text-ink-muted" aria-hidden="true" />
          </button>

          {menuOpen && (
            <div className="pop-in absolute right-0 top-12 z-40 w-64 rounded-tile bg-surface-strong p-2 shadow-card-hover">
              <div className="px-3 py-2">
                <p className="truncate text-sm font-semibold text-ink">{account.name}</p>
                <p className="truncate text-xs text-ink-muted">{account.email}</p>
              </div>
              <form action={signOut} className="border-t border-divider pt-1">
                <button
                  type="submit"
                  className="flex h-10 w-full items-center gap-2 rounded-control px-3 text-sm text-ink-muted transition-colors hover:bg-accent-soft hover:text-ink"
                >
                  <LogOut size={16} strokeWidth={1.75} aria-hidden="true" />
                  Sign out
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
