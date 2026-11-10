"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/cn";
import type { ActionState, Option } from "@/lib/module-types";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toaster";
import { useSlidingPill } from "@/components/ui/use-sliding-pill";

/**
 * A row of status buttons (for example Pending / Quote sent / Renewed / Lapsed). Clicking one saves it
 * through a server action, shows the choice immediately, and confirms with a toast.
 */
export function StatusButtons({
  current,
  options,
  action,
  label,
  readOnly = false,
}: {
  current: string | null;
  options: Option[];
  action: (value: string) => Promise<ActionState>;
  label: string;
  /** Shows the current choice but does not let it be changed (no permission). */
  readOnly?: boolean;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const active = busy ?? current;
  const containerRef = useRef<HTMLDivElement>(null);
  const { rect, animated } = useSlidingPill(containerRef, active);

  async function pick(value: string) {
    if (readOnly || busy || value === current) return;
    setBusy(value);
    try {
      const result = await action(value);
      if (result.ok) toast(result.message ?? "Saved.");
      else toast(result.error ?? "Could not save this change.", "error");
    } catch {
      toast("Something went wrong. Please try again.", "error");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div
      ref={containerRef}
      role="group"
      aria-label={label}
      className="relative inline-flex flex-wrap overflow-hidden rounded-[4px] border border-ink"
    >
      {rect && (
        <span
          aria-hidden="true"
          style={{
            left: 0,
            top: 0,
            width: rect.width,
            height: rect.height,
            transform: `translate3d(${rect.left}px, ${rect.top}px, 0)`,
          }}
          className={cn(
            "pointer-events-none absolute z-0 bg-ink",
            animated && "transition-[transform,width,height] duration-200 ease-[cubic-bezier(0.2,0.8,0.2,1)]",
          )}
        />
      )}
      {options.map((option) => {
        const selected = option.value === active;
        return (
          <button
            key={option.value}
            type="button"
            data-pill-key={option.value}
            aria-pressed={selected}
            disabled={busy !== null || readOnly}
            onClick={() => pick(option.value)}
            className={cn(
              "relative z-10 h-8 px-3 text-xs font-medium transition-colors duration-150",
              busy !== null && "cursor-wait",
              readOnly && "cursor-default",
              selected
                ? rect
                  ? "bg-transparent text-white"
                  : "bg-ink text-white"
                : "bg-transparent text-ink hover:bg-surface-muted/70",
            )}
          >
            {busy === option.value && <Spinner size={12} className="mr-1.5 inline-block align-[-2px]" />}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
