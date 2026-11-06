"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CalendarDays } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/cn";
import { todayIST } from "@/lib/dates";
import { formatDate } from "@/lib/format";

const POPOVER_WIDTH = 296;
const POPOVER_HEIGHT = 372;

type DatePickerProps = {
  /** Form field name. The chosen date is submitted as YYYY-MM-DD through a hidden input. */
  name?: string;
  defaultValue?: string;
  placeholder?: string;
  invalid?: boolean;
  /** Dates after today cannot be picked (for example a date of birth). */
  maxToday?: boolean;
  /** Called after the value has changed and the form has the new value. */
  onValueChange?: () => void;
};

/**
 * Date field with the CRM calendar (replaces the browser's native date input).
 * The panel is drawn in a portal, so it is never clipped by a scrolling form or drawer.
 */
export function DatePicker({
  name,
  defaultValue = "",
  placeholder = "Select date",
  invalid,
  maxToday,
  onValueChange,
}: DatePickerProps) {
  const [value, setValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ left: number; top?: number; bottom?: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const first = useRef(true);

  const place = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const openAbove = spaceBelow < POPOVER_HEIGHT && rect.top > spaceBelow;
    const left = Math.min(Math.max(8, rect.left), window.innerWidth - POPOVER_WIDTH - 8);
    setPos(
      openAbove
        ? { left, bottom: window.innerHeight - rect.top + 8 }
        : { left, top: rect.bottom + 8 },
    );
  }, []);

  useLayoutEffect(() => {
    if (open) place();
  }, [open, place]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!triggerRef.current?.contains(target) && !panelRef.current?.contains(target)) setOpen(false);
    };
    // Capture phase, so Escape closes only the calendar and not the form drawer behind it.
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey, true);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey, true);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, place]);

  // Tell the form (after the hidden input has the new value) that something changed.
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    onValueChange?.();
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  const max = maxToday ? todayIST() : undefined;

  function choose(iso: string) {
    setValue(iso);
    setOpen(false);
    triggerRef.current?.focus();
  }

  return (
    <>
      {name && <input type="hidden" name={name} value={value} />}
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-invalid={invalid}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "flex h-10 w-full items-center justify-between gap-2 rounded-control border bg-white/80 px-3 text-left text-sm outline-none transition-colors focus-visible:border-accent-strong",
          invalid ? "border-negative" : open ? "border-accent-strong" : "border-divider",
        )}
      >
        <span className={cn("truncate tabular-nums", value ? "text-ink" : "text-ink-faint")}>
          {value ? formatDate(value) : placeholder}
        </span>
        <CalendarDays size={16} strokeWidth={1.75} className="shrink-0 text-ink-faint" aria-hidden="true" />
      </button>

      {open &&
        pos &&
        createPortal(
          <div
            ref={panelRef}
            role="dialog"
            aria-label="Choose a date"
            style={{ position: "fixed", left: pos.left, top: pos.top, bottom: pos.bottom, width: POPOVER_WIDTH }}
            className="pop-in z-[70] rounded-tile bg-surface-strong p-3 shadow-card-hover"
          >
            <Calendar selected={value} onPick={choose} max={max} />
            <div className="mt-2 flex items-center justify-between border-t border-divider pt-2">
              <button
                type="button"
                disabled={Boolean(max && todayIST() > max)}
                onClick={() => choose(todayIST())}
                className="h-8 rounded-[6px] px-3 text-xs font-medium text-ink transition-colors hover:bg-accent-soft disabled:opacity-40"
              >
                Today
              </button>
              {value && (
                <button
                  type="button"
                  onClick={() => choose("")}
                  className="h-8 rounded-[6px] px-3 text-xs font-medium text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink"
                >
                  Clear
                </button>
              )}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
