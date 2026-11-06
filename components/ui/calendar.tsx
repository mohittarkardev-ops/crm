"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";
import {
  MONTHS,
  MONTHS_SHORT,
  daysInMonth,
  mondayIndex,
  parseISO,
  shiftMonth,
  todayIST,
  toISO,
} from "@/lib/dates";

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

type View = "days" | "months" | "years";

type CalendarProps = {
  /** Selected day (single-date pickers). */
  selected?: string;
  /** Highlighted range (range pickers). `rangeTo` may be empty while the end is still being chosen. */
  rangeFrom?: string;
  rangeTo?: string;
  onPick: (iso: string) => void;
  /** Days outside min / max cannot be picked. */
  min?: string;
  max?: string;
};

const NAV =
  "grid size-8 place-items-center rounded-[6px] text-ink-muted transition-colors hover:bg-accent-soft hover:text-ink";
const TITLE =
  "h-8 rounded-[6px] px-2 text-sm font-semibold text-ink transition-colors hover:bg-accent-soft";

/**
 * The CRM calendar (design.md section 4). Days view with Monday-first weeks; click the title for a month grid and
 * again for a year grid, so far-away dates (a date of birth, a policy years ahead) take two clicks.
 */
export function Calendar({ selected, rangeFrom, rangeTo, onPick, min, max }: CalendarProps) {
  const today = todayIST();
  const anchor = parseISO(selected || rangeFrom || "") ?? parseISO(today)!;
  const [view, setView] = useState<View>("days");
  const [cursor, setCursor] = useState({ y: anchor.y, m: anchor.m });

  const yearPageStart = Math.floor(cursor.y / 12) * 12;

  // 6 weeks, always, so the popover never changes height between months.
  const days = (() => {
    const first = mondayIndex(cursor.y, cursor.m, 1);
    const inMonth = daysInMonth(cursor.y, cursor.m);
    const prev = shiftMonth(cursor.y, cursor.m, -1);
    const next = shiftMonth(cursor.y, cursor.m, 1);
    const prevDays = daysInMonth(prev.y, prev.m);
    return Array.from({ length: 42 }, (_, i) => {
      const day = i - first + 1;
      if (day < 1) return { iso: toISO(prev.y, prev.m, prevDays + day), d: prevDays + day, outside: true };
      if (day > inMonth) return { iso: toISO(next.y, next.m, day - inMonth), d: day - inMonth, outside: true };
      return { iso: toISO(cursor.y, cursor.m, day), d: day, outside: false };
    });
  })();

  const lo = rangeFrom && rangeTo ? (rangeFrom <= rangeTo ? rangeFrom : rangeTo) : rangeFrom;
  const hi = rangeFrom && rangeTo ? (rangeFrom <= rangeTo ? rangeTo : rangeFrom) : undefined;

  function pick(iso: string, outside: boolean) {
    if (outside) {
      const parsed = parseISO(iso)!;
      setCursor({ y: parsed.y, m: parsed.m });
    }
    onPick(iso);
  }

  return (
    <div className="w-[17.5rem] select-none" role="group" aria-label="Calendar">
      {/* Header */}
      <div className="mb-2 flex items-center justify-between gap-1">
        <button
          type="button"
          aria-label="Previous"
          className={NAV}
          onClick={() => {
            if (view === "days") setCursor((c) => shiftMonth(c.y, c.m, -1));
            else if (view === "months") setCursor((c) => ({ ...c, y: c.y - 1 }));
            else setCursor((c) => ({ ...c, y: c.y - 12 }));
          }}
        >
          <ChevronLeft size={16} strokeWidth={1.75} aria-hidden="true" />
        </button>

        {view === "days" && (
          <button type="button" className={TITLE} onClick={() => setView("months")}>
            {MONTHS[cursor.m - 1]} {cursor.y}
          </button>
        )}
        {view === "months" && (
          <button type="button" className={TITLE} onClick={() => setView("years")}>
            {cursor.y}
          </button>
        )}
        {view === "years" && (
          <span className="px-2 text-sm font-semibold text-ink">
            {yearPageStart} – {yearPageStart + 11}
          </span>
        )}

        <button
          type="button"
          aria-label="Next"
          className={NAV}
          onClick={() => {
            if (view === "days") setCursor((c) => shiftMonth(c.y, c.m, 1));
            else if (view === "months") setCursor((c) => ({ ...c, y: c.y + 1 }));
            else setCursor((c) => ({ ...c, y: c.y + 12 }));
          }}
        >
          <ChevronRight size={16} strokeWidth={1.75} aria-hidden="true" />
        </button>
      </div>

      {view === "days" && (
        <>
          <div className="grid grid-cols-7">
            {WEEKDAYS.map((day) => (
              <span
                key={day}
                className="grid h-8 place-items-center text-[10px] font-semibold uppercase tracking-wider text-ink-muted"
              >
                {day}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {days.map(({ iso, d, outside }) => {
              const disabled = Boolean((min && iso < min) || (max && iso > max));
              const isEnd = iso === selected || iso === rangeFrom || (rangeTo ? iso === rangeTo : false);
              const inRange = Boolean(lo && hi && iso > lo && iso < hi);
              const isToday = iso === today;
              const label = `${d} ${MONTHS[Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}`;

              return (
                <div key={iso} className={cn("flex h-9 items-center justify-center", inRange && "bg-accent-soft")}>
                  <button
                    type="button"
                    disabled={disabled}
                    aria-label={label}
                    aria-pressed={isEnd}
                    onClick={() => pick(iso, outside)}
                    className={cn(
                      "relative grid size-9 place-items-center rounded-[6px] text-sm tabular-nums transition-colors",
                      isEnd
                        ? "bg-ink font-semibold text-white"
                        : disabled
                          ? "cursor-not-allowed text-ink-faint/50"
                          : outside
                            ? "text-ink-faint hover:bg-accent-soft hover:text-ink"
                            : "text-ink hover:bg-accent-soft",
                      isToday &&
                        "after:absolute after:bottom-1 after:left-1/2 after:size-1 after:-translate-x-1/2 after:rounded-full",
                      isToday && (isEnd ? "after:bg-accent" : "after:bg-accent-strong"),
                    )}
                  >
                    {d}
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}

      {view === "months" && (
        <div className="grid grid-cols-3 gap-1.5 py-1">
          {MONTHS_SHORT.map((name, i) => {
            const isCurrent = i + 1 === cursor.m && anchor.y === cursor.y && i + 1 === anchor.m;
            return (
              <button
                key={name}
                type="button"
                onClick={() => {
                  setCursor((c) => ({ ...c, m: i + 1 }));
                  setView("days");
                }}
                className={cn(
                  "h-11 rounded-[6px] text-sm transition-colors",
                  isCurrent ? "bg-ink font-semibold text-white" : "text-ink hover:bg-accent-soft",
                )}
              >
                {name}
              </button>
            );
          })}
        </div>
      )}

      {view === "years" && (
        <div className="grid grid-cols-3 gap-1.5 py-1">
          {Array.from({ length: 12 }, (_, i) => yearPageStart + i).map((year) => (
            <button
              key={year}
              type="button"
              onClick={() => {
                setCursor((c) => ({ ...c, y: year }));
                setView("months");
              }}
              className={cn(
                "h-11 rounded-[6px] text-sm tabular-nums transition-colors",
                year === anchor.y ? "bg-ink font-semibold text-white" : "text-ink hover:bg-accent-soft",
                year === Number(today.slice(0, 4)) && year !== anchor.y && "font-semibold",
              )}
            >
              {year}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
