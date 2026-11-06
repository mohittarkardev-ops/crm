"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarDays, ChevronDown } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/cn";
import { addDays, todayIST } from "@/lib/dates";
import { formatDate } from "@/lib/format";

export { todayIST };

export type DateMode = "all" | "today" | "7" | "15" | "30" | "60" | "expired" | "custom";
export type DateRangeValue = { mode: DateMode; from: string; to: string };
export const DEFAULT_DATE_RANGE: DateRangeValue = { mode: "all", from: "", to: "" };

const PRESETS: { mode: DateMode; label: string }[] = [
  { mode: "today", label: "Today" },
  { mode: "7", label: "Next 7 days" },
  { mode: "15", label: "Next 15 days" },
  { mode: "30", label: "Next 30 days" },
  { mode: "60", label: "Next 60 days" },
  { mode: "expired", label: "Already expired" },
];

/** Inclusive date bounds for a selection, or null when no filter applies. A null bound is open-ended. */
export function rangeOf(value: DateRangeValue, today: string): { from: string | null; to: string | null } | null {
  switch (value.mode) {
    case "all":
      return null;
    case "today":
      return { from: today, to: today };
    case "7":
    case "15":
    case "30":
    case "60":
      return { from: today, to: addDays(today, Number(value.mode)) };
    case "expired":
      return { from: null, to: addDays(today, -1) };
    case "custom":
      if (!value.from && !value.to) return null;
      // Only a first date: exactly that day.
      if (value.from && !value.to) return { from: value.from, to: value.from };
      return { from: value.from || null, to: value.to || null };
  }
}

function summary(value: DateRangeValue, label: string) {
  if (value.mode === "all") return label;
  if (value.mode === "custom") {
    if (!value.from && !value.to) return label;
    if (value.from && (!value.to || value.to === value.from)) return `${label}: ${formatDate(value.from)}`;
    if (!value.from) return `${label}: until ${formatDate(value.to)}`;
    return `${label}: ${formatDate(value.from)} – ${formatDate(value.to)}`;
  }
  return `${label}: ${PRESETS.find((p) => p.mode === value.mode)?.label ?? ""}`;
}

type Span = "day" | "range";

/** Date filter: quick presets, or the calendar for one exact day or a range (design.md section 4). */
export function DateRangeFilter({
  label,
  value,
  onChange,
}: {
  label: string;
  value: DateRangeValue;
  onChange: (value: DateRangeValue) => void;
}) {
  const [open, setOpen] = useState(false);
  const [span, setSpan] = useState<Span>(
    value.mode === "custom" && value.from && value.to && value.to !== value.from ? "range" : "day",
  );
  const rootRef = useRef<HTMLDivElement>(null);
  const active = rangeOf(value, "2000-01-01") !== null;
  const waitingForEnd = span === "range" && value.mode === "custom" && Boolean(value.from) && !value.to;

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

  function pickDay(iso: string) {
    if (span === "day") {
      onChange({ mode: "custom", from: iso, to: "" });
      setOpen(false);
      return;
    }
    // Range: the first click sets the start, the second sets the end (in either order).
    if (waitingForEnd) {
      const from = value.from;
      onChange(iso < from ? { mode: "custom", from: iso, to: from } : { mode: "custom", from, to: iso });
      setOpen(false);
    } else {
      onChange({ mode: "custom", from: iso, to: "" });
    }
  }

  const calendarFrom = value.mode === "custom" ? value.from : "";
  const calendarTo = value.mode === "custom" ? value.to : "";

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "flex h-10 items-center gap-2 rounded-control border bg-white/80 px-3 text-sm transition-colors",
          active ? "border-ink text-ink" : "border-divider text-ink-muted hover:text-ink",
        )}
      >
        <CalendarDays size={16} strokeWidth={1.75} aria-hidden="true" />
        <span className="whitespace-nowrap">{summary(value, label)}</span>
        <ChevronDown size={14} strokeWidth={1.75} aria-hidden="true" />
      </button>

      {open && (
        <div className="pop-in absolute right-0 top-12 z-30 flex w-[min(35rem,calc(100vw-2rem))] flex-col gap-3 rounded-tile bg-surface-strong p-3 shadow-card-hover sm:flex-row">
          <div className="sm:w-40 sm:shrink-0">
            <p className="px-1 pb-2 text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
              {label} date
            </p>
            <ul>
              {PRESETS.map((preset) => (
                <li key={preset.mode}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange({ mode: preset.mode, from: "", to: "" });
                      setOpen(false);
                    }}
                    className={cn(
                      "flex h-9 w-full items-center rounded-[4px] px-2 text-sm transition-colors",
                      value.mode === preset.mode ? "bg-ink font-medium text-white" : "text-ink hover:bg-accent-soft/60",
                    )}
                  >
                    {preset.label}
                  </button>
                </li>
              ))}
            </ul>
            {active && (
              <button
                type="button"
                onClick={() => {
                  onChange(DEFAULT_DATE_RANGE);
                  setOpen(false);
                }}
                className="mt-2 h-9 w-full rounded-[4px] text-xs font-medium text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink"
              >
                Clear date filter
              </button>
            )}
          </div>

          <div className="border-t border-divider pt-3 sm:border-l sm:border-t-0 sm:pl-3 sm:pt-0">
            <div
              role="group"
              aria-label="Single day or range"
              className="mb-2 inline-flex overflow-hidden rounded-[4px] border border-ink"
            >
              {(
                [
                  ["day", "Single day"],
                  ["range", "Date range"],
                ] as const
              ).map(([key, text]) => (
                <button
                  key={key}
                  type="button"
                  aria-pressed={span === key}
                  onClick={() => setSpan(key)}
                  className={cn(
                    "h-8 px-3 text-xs font-medium transition-colors",
                    span === key ? "bg-ink text-white" : "bg-transparent text-ink hover:bg-surface-muted",
                  )}
                >
                  {text}
                </button>
              ))}
            </div>

            <Calendar
              selected={span === "day" ? calendarFrom : undefined}
              rangeFrom={span === "range" ? calendarFrom : undefined}
              rangeTo={span === "range" ? calendarTo : undefined}
              onPick={pickDay}
            />

            <p className="mt-2 px-1 text-[11px] text-ink-faint">
              {span === "day"
                ? "Click a day to show only that date."
                : waitingForEnd
                  ? "Now click the last date of the range."
                  : "Click the first date, then the last date."}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
