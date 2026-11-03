"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/cn";

/** Open pages re-fetch every minute while visible. Returning to a tab refreshes it if the data is older than 15 seconds. */
const INTERVAL_MS = 60_000;
const STALE_MS = 15_000;

function clock(date: Date) {
  return date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

/**
 * Keeps the CRM current without a manual reload. router.refresh() re-runs the server queries and keeps
 * client state (search text, filters, tabs, an open form) untouched. Shows when the data was last updated.
 */
export function AutoRefresh() {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const lastRefresh = useRef(0);
  const wasPending = useRef(false);

  const refresh = useCallback(() => {
    lastRefresh.current = Date.now();
    startTransition(() => {
      router.refresh();
    });
  }, [router]);

  // Opening a page already fetches fresh data.
  useEffect(() => {
    lastRefresh.current = Date.now();
    setUpdatedAt(new Date());
  }, [pathname]);

  // Stamp the time when a refresh finishes.
  useEffect(() => {
    if (wasPending.current && !pending) setUpdatedAt(new Date());
    wasPending.current = pending;
  }, [pending]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, INTERVAL_MS);
    const onReturn = () => {
      if (document.visibilityState === "visible" && Date.now() - lastRefresh.current > STALE_MS) refresh();
    };
    document.addEventListener("visibilitychange", onReturn);
    window.addEventListener("focus", onReturn);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onReturn);
      window.removeEventListener("focus", onReturn);
    };
  }, [refresh]);

  return (
    <button
      type="button"
      onClick={refresh}
      aria-label="Refresh data"
      title="Refresh data"
      className="glass flex h-10 items-center gap-2 rounded-control px-3 text-xs text-ink-muted transition-colors hover:text-ink"
    >
      <RefreshCw size={16} strokeWidth={1.75} className={cn(pending && "animate-spin")} aria-hidden="true" />
      {updatedAt && <span className="hidden tabular-nums lg:inline">Updated {clock(updatedAt)}</span>}
    </button>
  );
}
