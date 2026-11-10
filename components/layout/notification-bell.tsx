"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, FileText, LifeBuoy, MessageSquareQuote, UserPlus, X, type LucideIcon } from "lucide-react";
import { BellWatcherCharacter } from "@/components/ui/characters";
import { cn } from "@/lib/cn";
import type { FeedItem, FeedKind } from "@/lib/data/feed";
import { fetchFeed } from "@/lib/data/feed-actions";
import { createClient } from "@/lib/supabase/client";

const ICONS: Record<FeedKind, LucideIcon> = {
  quote: MessageSquareQuote,
  ticket: LifeBuoy,
  policy: FileText,
  user: UserPlus,
};

const POLL_MS = 60_000; // safety net in case the live connection drops
const TOAST_MS = 7_000;

function timeAgo(iso: string) {
  const minutes = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60_000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

function Toast({ item, onClose }: { item: FeedItem; onClose: () => void }) {
  const [entered, setEntered] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [paused, setPaused] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const remainingRef = useRef(TOAST_MS);
  const closeRef = useRef(onClose);

  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  const beginClose = useCallback(() => {
    setLeaving(true);
    window.setTimeout(() => closeRef.current(), 280);
  }, []);

  useEffect(() => {
    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => {
        setEntered(true);
        if (cardRef.current?.matches(":hover")) setPaused(true);
      });
    });
    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
    };
  }, []);

  useEffect(() => {
    if (paused || leaving) return;
    const startedAt = Date.now();
    const timer = window.setTimeout(beginClose, Math.max(0, remainingRef.current));
    return () => {
      window.clearTimeout(timer);
      remainingRef.current = Math.max(0, remainingRef.current - (Date.now() - startedAt));
    };
  }, [paused, leaving, beginClose]);

  const Icon = ICONS[item.kind];
  const visible = entered && !leaving;
  return (
    <div
      ref={cardRef}
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      className={cn(
        "flex items-start gap-3 rounded-tile border border-divider/60 bg-surface-strong p-3 shadow-card-hover transition-[opacity,transform] duration-[280ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
        visible ? "translate-y-0 scale-100 opacity-100" : "translate-y-4 scale-[0.98] opacity-0",
      )}
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-accent text-ink">
        <Icon size={16} strokeWidth={1.75} aria-hidden="true" />
      </span>
      <Link href={item.href} onClick={beginClose} className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold text-ink">{item.title}</p>
        <p className="truncate text-xs text-ink-muted">{item.detail}</p>
      </Link>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={beginClose}
        className="grid size-6 shrink-0 place-items-center rounded-control text-ink-faint transition-colors hover:bg-surface-muted hover:text-ink"
      >
        <X size={14} strokeWidth={1.75} aria-hidden="true" />
      </button>
    </div>
  );
}

/**
 * Live notifications for the advisor: new quote requests, open support tickets, user-added policies
 * waiting for verification, and new registrations. Updates instantly through Supabase Realtime, with a
 * one-minute poll as a fallback. "Unread" is remembered per staff member in this browser.
 */
export function NotificationBell({ staffId }: { staffId: string }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [items, setItems] = useState<FeedItem[] | null>(null);
  const [seenAt, setSeenAt] = useState<number | null>(null);
  const [dotsFrom, setDotsFrom] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [toasts, setToasts] = useState<FeedItem[]>([]);
  const rootRef = useRef<HTMLDivElement>(null);
  const known = useRef<Set<string> | null>(null);
  const storageKey = `crm-feed-seen:${staffId}`;

  const load = useCallback(async () => {
    let feed: FeedItem[];
    try {
      feed = await fetchFeed();
    } catch {
      return; // keep what we have; the next poll will try again
    }
    setItems(feed);

    // First load: remember what exists and start "unread" from the newest item.
    if (known.current === null) {
      known.current = new Set(feed.map((item) => item.id));
      try {
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          setSeenAt(Date.parse(stored));
        } else {
          const baseline = feed[0]?.at ?? new Date().toISOString();
          localStorage.setItem(storageKey, baseline);
          setSeenAt(Date.parse(baseline));
        }
      } catch {
        setSeenAt(feed[0] ? Date.parse(feed[0].at) : Date.now());
      }
      return;
    }

    // Later loads: anything we have not seen before pops up as a toast.
    const fresh = feed.filter((item) => !known.current!.has(item.id));
    fresh.forEach((item) => known.current!.add(item.id));
    if (fresh.length > 0) setToasts((current) => [...fresh.slice(0, 3), ...current].slice(0, 3));
  }, [storageKey]);

  // Initial load, polling, and refresh when returning to the tab.
  useEffect(() => {
    void load();
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, POLL_MS);
    const onReturn = () => {
      if (document.visibilityState === "visible") void load();
    };
    document.addEventListener("visibilitychange", onReturn);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onReturn);
    };
  }, [load]);

  // Live updates: new rows in the tables the advisor cares about.
  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    let debounce: number | undefined;
    let cleanup: (() => void) | undefined;

    const onChange = () => {
      window.clearTimeout(debounce);
      debounce = window.setTimeout(() => {
        void load();
        startTransition(() => router.refresh()); // also refresh the table on the current page
      }, 400);
    };

    (async () => {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      if (data.session) supabase.realtime.setAuth(data.session.access_token);

      const channel = supabase
        .channel("crm-live")
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "quote_requests" }, onChange)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "support_tickets" }, onChange)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "policies", filter: "source=eq.user_added" },
          onChange,
        )
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "users" }, onChange)
        .subscribe();
      cleanup = () => void supabase.removeChannel(channel);
    })();

    return () => {
      cancelled = true;
      window.clearTimeout(debounce);
      cleanup?.();
    };
  }, [load, router]);

  // Close the panel on outside click or Escape.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const unread = items && seenAt !== null ? items.filter((item) => Date.parse(item.at) > seenAt).length : 0;

  const toggle = () => {
    if (open) {
      setOpen(false);
      return;
    }
    // Opening marks everything as read, but keeps the dots visible while the panel is open.
    setDotsFrom(seenAt);
    const stamp = items?.[0]?.at ?? new Date().toISOString();
    setSeenAt(Date.parse(stamp));
    try {
      localStorage.setItem(storageKey, stamp);
    } catch {
      /* ignore */
    }
    setOpen(true);
  };

  return (
    <>
      <div ref={rootRef} className="relative">
        <button
          type="button"
          aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
          aria-expanded={open}
          onClick={toggle}
          className="glass relative grid size-10 place-items-center rounded-control text-ink-muted transition-[color,transform] duration-150 hover:text-ink active:scale-[0.97]"
        >
          <Bell size={18} strokeWidth={1.75} aria-hidden="true" />
          {unread > 0 && (
            <span className="check-pop absolute -right-1 -top-1 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-negative px-1 text-[10px] font-semibold tabular-nums text-white">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>

        {open && (
          <div className="pop-in absolute right-0 top-12 z-40 w-[22rem] max-w-[calc(100vw-2rem)] rounded-tile bg-surface-strong shadow-card-hover">
            <div className="flex items-center justify-between border-b-[1.5px] border-rule px-4 py-3">
              <div className="flex items-center gap-2">
                {items && items.length > 0 && <BellWatcherCharacter mood="alert" compact />}
                <h2 className="text-[15px] font-semibold text-ink">Notifications</h2>
              </div>
              <span className="text-[11px] text-ink-muted">
                {items && items.length === 0 ? "All caught up" : "Needs your attention"}
              </span>
            </div>

            <ul className="max-h-96 overflow-y-auto">
              {items === null ? (
                <li className="px-4 py-6 text-center text-sm text-ink-muted">Loading…</li>
              ) : items.length === 0 ? (
                <li className="flex flex-col items-center gap-2.5 px-4 py-8 text-center">
                  <BellWatcherCharacter mood="calm" />
                  <p className="text-xs font-semibold text-ink">All caught up — nothing urgent</p>
                  <p className="text-[11px] text-ink-faint">New quotes, tickets, and policy updates will appear here.</p>
                </li>
              ) : (
                items.map((item) => {
                  const Icon = ICONS[item.kind];
                  const isNew = dotsFrom !== null && Date.parse(item.at) > dotsFrom;
                  return (
                    <li key={item.id} className="border-t border-divider first:border-t-0">
                      <Link
                        href={item.href}
                        onClick={() => setOpen(false)}
                        className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-accent-soft/50"
                      >
                        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-surface-muted text-ink-muted">
                          <Icon size={16} strokeWidth={1.75} aria-hidden="true" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2">
                            <span className="truncate text-[13px] font-semibold text-ink">{item.title}</span>
                            {isNew && <span className="size-2 shrink-0 rounded-full bg-accent-strong" aria-label="New" />}
                          </span>
                          <span className="block truncate text-xs text-ink-muted">{item.detail}</span>
                          <span className="block text-[11px] text-ink-faint">{timeAgo(item.at)}</span>
                        </span>
                      </Link>
                    </li>
                  );
                })
              )}
            </ul>
          </div>
        )}
      </div>

      {toasts.length > 0 && (
        <div className="fixed bottom-4 right-4 z-[90] flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2">
          {toasts.map((item) => (
            <Toast key={item.id} item={item} onClose={() => setToasts((current) => current.filter((t) => t.id !== item.id))} />
          ))}
        </div>
      )}
    </>
  );
}
