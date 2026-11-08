"use client";

import { useDelayedFlag } from "@/lib/use-delayed-flag";

/**
 * Thin moving bar for waits we cannot measure (saving, uploading, sending). It reserves its own height, so the
 * layout never jumps, and only appears if the wait lasts longer than 0.4 seconds.
 */
export function PendingBar({ active, className }: { active: boolean; className?: string }) {
  const visible = useDelayedFlag(active, 400);

  return (
    <div
      className={`relative h-[3px] overflow-hidden rounded-full ${visible ? "bg-surface-muted" : ""} ${className ?? ""}`}
      role={visible ? "progressbar" : undefined}
      aria-label={visible ? "Working" : undefined}
      aria-busy={visible}
    >
      {visible && <div className="indeterminate-bar absolute inset-y-0 w-1/3 rounded-full bg-ink" />}
    </div>
  );
}
