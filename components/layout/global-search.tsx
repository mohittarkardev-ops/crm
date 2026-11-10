"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  FileText,
  LifeBuoy,
  MessageSquareQuote,
  Search,
  ShieldAlert,
  User,
  X,
} from "lucide-react";
import {
  globalSearch,
  type GlobalSearchGroup,
  type GlobalSearchGroupKey,
  type GlobalSearchItem,
} from "@/lib/actions/search";
import { cn } from "@/lib/cn";
import type { PermissionKey } from "@/lib/rbac/permissions";
import { Chip } from "@/components/ui/chip";
import { InsurerLogo } from "@/components/ui/insurer-logo";
import { Spinner } from "@/components/ui/spinner";

const SEARCHABLE_PERMISSIONS: PermissionKey[] = [
  "policies.view",
  "clients.view",
  "claims.view",
  "quotes.view",
  "support.view",
];

function GroupIcon({ group }: { group: GlobalSearchGroupKey }) {
  switch (group) {
    case "policies":
      return <FileText size={14} strokeWidth={1.75} aria-hidden="true" />;
    case "clients":
      return <User size={14} strokeWidth={1.75} aria-hidden="true" />;
    case "claims":
      return <ShieldAlert size={14} strokeWidth={1.75} aria-hidden="true" />;
    case "quotes":
      return <MessageSquareQuote size={14} strokeWidth={1.75} aria-hidden="true" />;
    case "support":
      return <LifeBuoy size={14} strokeWidth={1.75} aria-hidden="true" />;
  }
}

export function GlobalSearch({ allowed }: { allowed?: PermissionKey[] }) {
  const router = useRouter();
  const canSearchAny = !allowed || SEARCHABLE_PERMISSIONS.some((p) => allowed.includes(p));

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [groups, setGroups] = useState<GlobalSearchGroup[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);

  const rootRef = useRef<HTMLDivElement>(null);
  const resultsContainerRef = useRef<HTMLDivElement>(null);
  const desktopInputRef = useRef<HTMLInputElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);
  const requestSeqRef = useRef(0);

  // Flatten grouped results for crisp ArrowUp / ArrowDown / Enter navigation.
  const flatItems = useMemo(() => {
    const out: GlobalSearchItem[] = [];
    for (const g of groups) out.push(...g.items);
    return out;
  }, [groups]);

  // Quick `/` shortcut focuses desktop search (or opens mobile overlay on small screens).
  useEffect(() => {
    if (!canSearchAny) return;
    const onShortcut = (event: KeyboardEvent) => {
      if (event.key !== "/" || event.ctrlKey || event.metaKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }
      event.preventDefault();
      if (desktopInputRef.current && desktopInputRef.current.offsetParent !== null) {
        desktopInputRef.current.focus();
        desktopInputRef.current.select();
        if (query.trim().length >= 2) setOpen(true);
      } else {
        setMobileOpen(true);
      }
    };
    window.addEventListener("keydown", onShortcut);
    return () => window.removeEventListener("keydown", onShortcut);
  }, [canSearchAny, query]);

  // Auto-focus mobile input when dialog opens.
  useEffect(() => {
    if (mobileOpen) {
      const id = requestAnimationFrame(() => mobileInputRef.current?.focus());
      return () => cancelAnimationFrame(id);
    }
  }, [mobileOpen]);

  // Close desktop popover on outside pointer click.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  // Debounced RBAC search execution with race-condition guard.
  useEffect(() => {
    if (!canSearchAny) return;
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      requestSeqRef.current += 1;
      setGroups([]);
      setLoading(false);
      setActiveIndex(0);
      return;
    }

    const seq = ++requestSeqRef.current;
    setLoading(true);
    const timer = window.setTimeout(async () => {
      try {
        const res = await globalSearch(trimmed);
        if (seq !== requestSeqRef.current) return;
        setGroups(res.ok ? res.groups : []);
        setActiveIndex(0);
      } catch {
        if (seq !== requestSeqRef.current) return;
        setGroups([]);
      } finally {
        if (seq === requestSeqRef.current) setLoading(false);
      }
    }, 200);

    return () => window.clearTimeout(timer);
  }, [query, canSearchAny]);

  // Keep active keyboard selection visible inside scrollable popover.
  useEffect(() => {
    const el = resultsContainerRef.current?.querySelector<HTMLElement>(`[data-search-idx="${activeIndex}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  const navigateTo = useCallback(
    (href: string) => {
      setOpen(false);
      setMobileOpen(false);
      router.push(href);
    },
    [router],
  );

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      if (mobileOpen) {
        setMobileOpen(false);
        return;
      }
      if (open) {
        setOpen(false);
      } else if (query) {
        setQuery("");
      } else {
        event.currentTarget.blur();
      }
      return;
    }

    if (flatItems.length === 0) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!open && !mobileOpen) setOpen(true);
      setActiveIndex((prev) => (prev + 1) % flatItems.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      if (!open && !mobileOpen) setOpen(true);
      setActiveIndex((prev) => (prev - 1 + flatItems.length) % flatItems.length);
    } else if (event.key === "Enter") {
      const selected = flatItems[activeIndex];
      if (selected) {
        event.preventDefault();
        navigateTo(selected.href);
      }
    }
  };

  if (!canSearchAny) return null;

  const trimmed = query.trim();
  const hasMinChars = trimmed.length >= 2;
  const showResultsPanel = open && trimmed.length > 0;

  const renderResults = () => {
    if (!hasMinChars) {
      return (
        <div className="px-4 py-5 text-center text-xs text-ink-muted">
          Type at least 2 characters to search policy no., vehicle reg, mobile, or claim ID.
        </div>
      );
    }

    if (loading && groups.length === 0) {
      return (
        <div className="flex items-center justify-center gap-2 px-4 py-6 text-xs text-ink-muted">
          <Spinner size={14} />
          <span>Searching CRM…</span>
        </div>
      );
    }

    if (groups.length === 0) {
      return (
        <div className="px-4 py-6 text-center">
          <p className="text-xs font-medium text-ink">No matches for &ldquo;{trimmed}&rdquo;</p>
          <p className="mt-1 text-[11px] text-ink-faint">
            Try policy number, plate (e.g. UP85...), client mobile, or CLM reference code.
          </p>
        </div>
      );
    }

    let runningIndex = 0;

    return (
      <>
        <div ref={resultsContainerRef} className="max-h-[min(24rem,65vh)] overflow-y-auto py-1.5">
          {groups.map((group, groupIdx) => (
            <div key={group.key} className={cn(groupIdx > 0 && "mt-1 border-t border-divider/60 pt-1.5")}>
              <div className="flex items-center justify-between px-3.5 py-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
                  {group.label}
                </span>
                {group.viewAllHref && (
                  <Link
                    href={group.viewAllHref}
                    onClick={() => {
                      setOpen(false);
                      setMobileOpen(false);
                    }}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-ink-muted transition-colors hover:text-ink"
                  >
                    Open list
                    <ArrowRight size={11} strokeWidth={2} aria-hidden="true" />
                  </Link>
                )}
              </div>

              <div className="px-1.5 space-y-0.5">
                {group.items.map((item) => {
                  const idx = runningIndex++;
                  const isActive = idx === activeIndex;
                  return (
                    <button
                      key={`${item.group}:${item.id}`}
                      type="button"
                      role="option"
                      data-search-idx={idx}
                      aria-selected={isActive}
                      onMouseEnter={() => setActiveIndex(idx)}
                      onClick={() => navigateTo(item.href)}
                      className={cn(
                        "flex w-full items-center gap-2.5 rounded-[4px] px-2.5 py-2 text-left transition-colors",
                        isActive ? "bg-accent-soft text-ink" : "text-ink hover:bg-surface-muted/70",
                      )}
                    >
                      {item.group === "policies" && item.insurerName ? (
                        <InsurerLogo name={item.insurerName} logoUrl={item.logoUrl} size="sm" />
                      ) : (
                        <span className="grid size-6 shrink-0 place-items-center rounded-[4px] bg-surface-muted text-ink-muted">
                          <GroupIcon group={item.group} />
                        </span>
                      )}

                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-semibold text-ink tabular-nums">
                          {item.title}
                        </span>
                        {item.subtitle && (
                          <span className="block truncate text-[11px] text-ink-muted">
                            {item.subtitle}
                          </span>
                        )}
                      </span>

                      {item.badge && (
                        <Chip tone={item.tone ?? "neutral"} className="shrink-0">
                          {item.badge}
                        </Chip>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <div className="hidden items-center justify-between border-t border-divider/60 bg-surface-muted/35 px-3.5 py-1.5 text-[10px] text-ink-faint sm:flex">
          <span>↑↓ Navigate · Enter Open</span>
          <span>Esc Close</span>
        </div>
      </>
    );
  };

  return (
    <>
      {/* Desktop inline global search */}
      <div ref={rootRef} className="relative hidden md:block">
        <label className="group/search glass flex h-10 w-64 items-center gap-2 rounded-control px-3 text-ink-faint transition-[width,border-color] duration-200 focus-within:w-80 focus-within:border-accent-strong">
          <Search
            size={16}
            strokeWidth={1.75}
            className="shrink-0 transition-colors group-focus-within/search:text-ink"
            aria-hidden="true"
          />
          <input
            ref={desktopInputRef}
            type="text"
            enterKeyHint="search"
            role="combobox"
            aria-label="Search CRM"
            aria-expanded={showResultsPanel}
            aria-autocomplete="list"
            placeholder="Search clients, policies…"
            value={query}
            onFocus={() => {
              if (query.trim().length > 0) setOpen(true);
            }}
            onChange={(event) => {
              setQuery(event.target.value);
              setOpen(true);
            }}
            onKeyDown={handleKeyDown}
            className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink-faint"
          />
          {loading ? (
            <Spinner size={13} className="shrink-0 text-ink-muted" />
          ) : query ? (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => {
                setQuery("");
                setGroups([]);
                desktopInputRef.current?.focus();
              }}
              className="grid size-5 shrink-0 place-items-center rounded-[3px] text-ink-faint transition-colors hover:bg-surface-muted hover:text-ink"
            >
              <X size={12} strokeWidth={2} aria-hidden="true" />
            </button>
          ) : (
            <kbd className="pointer-events-none shrink-0 rounded-[3px] border border-divider bg-surface-muted px-1.5 py-0.5 text-[10px] font-semibold text-ink-faint transition-opacity group-focus-within/search:opacity-0">
              /
            </kbd>
          )}
        </label>

        {showResultsPanel && (
          <div
            role="listbox"
            aria-label="Search results"
            className="pop-in absolute right-0 top-12 z-50 w-[min(30rem,calc(100vw-2rem))] overflow-hidden rounded-tile border border-divider bg-surface-strong shadow-card-hover"
          >
            {renderResults()}
          </div>
        )}
      </div>

      {/* Mobile trigger button */}
      <button
        type="button"
        aria-label="Search CRM"
        onClick={() => setMobileOpen(true)}
        className="glass grid size-10 place-items-center rounded-control text-ink-muted transition-colors hover:text-ink md:hidden"
      >
        <Search size={18} strokeWidth={1.75} aria-hidden="true" />
      </button>

      {/* Mobile spotlight search overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-50 md:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Search CRM"
        >
          <button
            type="button"
            aria-label="Close search"
            onClick={() => setMobileOpen(false)}
            className="absolute inset-0 bg-[rgba(28,28,28,0.35)] backdrop-blur-[4px]"
          />
          <div className="pop-in relative mx-4 mt-4 overflow-hidden rounded-tile border border-divider bg-surface-strong shadow-card-hover">
            <div className="flex items-center gap-2 border-b border-divider px-3 py-2.5">
              <Search size={16} strokeWidth={1.75} className="shrink-0 text-ink-muted" aria-hidden="true" />
              <input
                ref={mobileInputRef}
                type="text"
                enterKeyHint="search"
                aria-label="Search CRM"
                placeholder="Search clients, policies, claims…"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink-faint"
              />
              {loading && <Spinner size={14} className="shrink-0 text-ink-muted" />}
              <button
                type="button"
                aria-label="Close search"
                onClick={() => setMobileOpen(false)}
                className="grid size-7 shrink-0 place-items-center rounded-control text-ink-faint hover:bg-surface-muted hover:text-ink"
              >
                <X size={16} strokeWidth={1.75} aria-hidden="true" />
              </button>
            </div>
            {trimmed.length > 0 && renderResults()}
          </div>
        </div>
      )}
    </>
  );
}
