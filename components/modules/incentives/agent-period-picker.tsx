"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/cn";
import {
  MONTHS,
  MONTHS_SHORT,
  addDays,
  daysInMonth,
  mondayIndex,
  pad2,
  parseISO,
  shiftMonth,
  toISO,
} from "@/lib/dates";
import { formatDate, formatINR } from "@/lib/format";
import { formatMonthTitle, shiftMonthIso } from "@/lib/incentives";

export type DayActivityMeta = {
  eligibleClaims: number;
  totalClaims: number;
  provisionalAmount: number;
  isWorkingDay: boolean;
  holidayLabel: string | null;
};

type ViewMode = "days" | "months" | "years";

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const POPOVER_WIDTH = 312;
const POPOVER_HEIGHT = 432;

const NAV_BTN =
  "grid size-8 place-items-center rounded-[6px] text-ink-muted transition-colors hover:bg-accent-soft hover:text-ink disabled:opacity-35 disabled:pointer-events-none";
const HEADER_TITLE_BTN =
  "h-8 rounded-[6px] px-2.5 text-sm font-semibold text-ink transition-colors hover:bg-accent-soft";

export function AgentPeriodPicker({
  monthIso,
  todayIso,
  selectedDay,
  dailyByDate,
  onSelectMonth,
  onSelectDay,
  onClearDay,
}: {
  monthIso: string;
  todayIso: string;
  selectedDay: string | null;
  dailyByDate: Map<string, DayActivityMeta>;
  onSelectMonth: (monthIso: string) => void;
  onSelectDay: (dayIso: string) => void;
  onClearDay: () => void;
}) {
  const currentMonthIso = todayIso.slice(0, 7);
  const anchorParts = useMemo(() => {
    const src = selectedDay ?? `${monthIso}-01`;
    return parseISO(src) ?? parseISO(todayIso)!;
  }, [monthIso, selectedDay, todayIso]);

  const [open, setOpen] = useState(false);
  const [view, setView] = useState<ViewMode>("days");
  const [cursor, setCursor] = useState({ y: anchorParts.y, m: anchorParts.m });
  const [hoveredDay, setHoveredDay] = useState<string | null>(null);
  const [pos, setPos] = useState<{ left: number; top?: number; bottom?: number } | null>(null);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const place = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const openAbove = spaceBelow < POPOVER_HEIGHT && rect.top > spaceBelow;
    const left = Math.min(Math.max(8, rect.right - POPOVER_WIDTH), window.innerWidth - POPOVER_WIDTH - 8);
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
      if (!triggerRef.current?.contains(target) && !panelRef.current?.contains(target)) {
        setOpen(false);
      }
    };
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

  const toggleOpen = () => {
    setOpen((prev) => {
      const next = !prev;
      if (next) {
        setCursor({ y: anchorParts.y, m: anchorParts.m });
        setView("days");
        setHoveredDay(selectedDay);
      }
      return next;
    });
  };

  const cursorMonthIso = `${cursor.y}-${pad2(cursor.m)}`;
  const cursorMonthTitle = formatMonthTitle(cursorMonthIso);
  const yearPageStart = Math.floor(cursor.y / 12) * 12;

  const days = useMemo(() => {
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
  }, [cursor.y, cursor.m]);

  const canStepNext = selectedDay ? selectedDay < todayIso : monthIso < currentMonthIso;

  const handleStep = (delta: -1 | 1) => {
    if (selectedDay) {
      const nextDay = addDays(selectedDay, delta);
      if (nextDay <= todayIso) onSelectDay(nextDay);
      return;
    }
    const targetMonth = shiftMonthIso(monthIso, delta);
    if (delta < 0 || targetMonth <= currentMonthIso) {
      onSelectMonth(targetMonth);
    }
  };

  const handlePickDay = (iso: string) => {
    if (iso > todayIso) return;
    onSelectDay(iso);
    setOpen(false);
  };

  const handlePickFullMonth = (targetMonthIso: string) => {
    if (targetMonthIso > currentMonthIso) return;
    onSelectMonth(targetMonthIso);
    setOpen(false);
  };

  const previewIso = hoveredDay ?? selectedDay;
  const previewMeta = previewIso ? dailyByDate.get(previewIso) : undefined;
  const maxYear = Number(todayIso.slice(0, 4));
  const canCursorNextMonth = cursorMonthIso < currentMonthIso;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="inline-flex h-10 items-center rounded-control border border-divider bg-surface-strong px-1 shadow-xs">
        <button
          type="button"
          onClick={() => handleStep(-1)}
          aria-label={selectedDay ? "Previous day" : "Previous month"}
          className={NAV_BTN}
        >
          <ChevronLeft size={16} />
        </button>

        <button
          ref={triggerRef}
          type="button"
          onClick={toggleOpen}
          aria-haspopup="dialog"
          aria-expanded={open}
          className="inline-flex h-8 items-center gap-2 rounded-[6px] px-2.5 text-xs font-semibold text-ink transition-colors hover:bg-accent-soft/60"
        >
          <CalendarDays size={14} className="text-ink-muted shrink-0" />
          <span className="tabular-nums whitespace-nowrap">
            {selectedDay ? formatDate(selectedDay) : formatMonthTitle(monthIso)}
          </span>
          {selectedDay && (
            <span className="rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-bold leading-none text-ink">
              Day
            </span>
          )}
          <ChevronDown
            size={13}
            className={cn("text-ink-faint transition-transform duration-150", open && "rotate-180")}
          />
        </button>

        <button
          type="button"
          disabled={!canStepNext}
          onClick={() => handleStep(1)}
          aria-label={selectedDay ? "Next day" : "Next month"}
          className={NAV_BTN}
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {selectedDay && (
        <button
          type="button"
          onClick={onClearDay}
          className="inline-flex h-9 items-center gap-1.5 rounded-control border border-divider bg-surface-muted/70 px-3 text-xs font-medium text-ink transition-colors hover:bg-accent-soft"
        >
          <X size={13} />
          <span>Full Month</span>
        </button>
      )}

      {open &&
        pos &&
        createPortal(
          <div
            ref={panelRef}
            role="dialog"
            aria-label="Choose month, year, or specific day"
            style={{ position: "fixed", left: pos.left, top: pos.top, bottom: pos.bottom, width: POPOVER_WIDTH }}
            className="pop-in z-[70] rounded-tile border border-divider bg-surface-strong p-3.5 shadow-card-hover select-none"
          >
            {/* Header Navigation */}
            <div className="mb-2.5 flex items-center justify-between gap-1">
              <button
                type="button"
                aria-label="Previous"
                className={NAV_BTN}
                onClick={() => {
                  if (view === "days") setCursor((c) => shiftMonth(c.y, c.m, -1));
                  else if (view === "months") setCursor((c) => ({ ...c, y: c.y - 1 }));
                  else setCursor((c) => ({ ...c, y: c.y - 12 }));
                }}
              >
                <ChevronLeft size={16} strokeWidth={1.75} />
              </button>

              {view === "days" && (
                <button type="button" className={HEADER_TITLE_BTN} onClick={() => setView("months")}>
                  {MONTHS[cursor.m - 1]} {cursor.y}
                </button>
              )}
              {view === "months" && (
                <button type="button" className={HEADER_TITLE_BTN} onClick={() => setView("years")}>
                  {cursor.y}
                </button>
              )}
              {view === "years" && (
                <span className="px-2 text-sm font-semibold text-ink tabular-nums">
                  {yearPageStart} – {yearPageStart + 11}
                </span>
              )}

              <button
                type="button"
                aria-label="Next"
                disabled={
                  (view === "days" && !canCursorNextMonth) ||
                  (view === "months" && cursor.y >= maxYear) ||
                  (view === "years" && yearPageStart + 11 >= maxYear)
                }
                className={NAV_BTN}
                onClick={() => {
                  if (view === "days") setCursor((c) => shiftMonth(c.y, c.m, 1));
                  else if (view === "months") setCursor((c) => ({ ...c, y: c.y + 1 }));
                  else setCursor((c) => ({ ...c, y: c.y + 12 }));
                }}
              >
                <ChevronRight size={16} strokeWidth={1.75} />
              </button>
            </div>

            {view === "days" && (
              <>
                <div className="grid grid-cols-7">
                  {WEEKDAYS.map((day) => (
                    <span
                      key={day}
                      className="grid h-7 place-items-center text-[10px] font-semibold uppercase tracking-wider text-ink-muted"
                    >
                      {day}
                    </span>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-y-0.5">
                  {days.map(({ iso, d, outside }) => {
                    const disabled = iso > todayIso;
                    const isSelected = iso === selectedDay;
                    const isToday = iso === todayIso;
                    const meta = dailyByDate.get(iso);
                    const hasWork = Boolean(meta && (meta.eligibleClaims > 0 || meta.totalClaims > 0));
                    const earned = Boolean(meta && meta.provisionalAmount > 0);
                    const label = `${d} ${MONTHS[Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}`;

                    return (
                      <div key={iso} className="flex h-9 items-center justify-center">
                        <button
                          type="button"
                          disabled={disabled}
                          aria-label={label}
                          aria-pressed={isSelected}
                          title={
                            meta
                              ? `${formatDate(iso)} · ${meta.eligibleClaims} eligible · ${formatINR(meta.provisionalAmount)}`
                              : formatDate(iso)
                          }
                          onMouseEnter={() => setHoveredDay(iso)}
                          onClick={() => handlePickDay(iso)}
                          className={cn(
                            "relative grid size-9 place-items-center rounded-[7px] text-xs tabular-nums transition-colors",
                            isSelected
                              ? "bg-ink font-semibold text-white"
                              : disabled
                                ? "cursor-not-allowed text-ink-faint/40"
                                : outside
                                  ? "text-ink-faint hover:bg-accent-soft/60 hover:text-ink"
                                  : isToday
                                    ? "bg-accent-soft font-semibold text-ink hover:bg-accent"
                                    : "text-ink hover:bg-accent-soft/70",
                          )}
                        >
                          <span>{d}</span>
                          {hasWork && (
                            <span
                              className={cn(
                                "absolute bottom-1 left-1/2 size-1.5 -translate-x-1/2 rounded-full",
                                isSelected
                                  ? "bg-accent"
                                  : earned
                                    ? "bg-positive"
                                    : "bg-warning",
                              )}
                            />
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* Hovered / Selected Date Summary Strip */}
                <div className="mt-2 rounded-lg bg-surface-muted/65 px-2.5 py-1.5 text-[11px] text-ink-muted">
                  {previewIso ? (
                    previewMeta ? (
                      <div className="flex items-center justify-between gap-2 tabular-nums">
                        <span className="font-medium text-ink">{formatDate(previewIso)}</span>
                        <span>
                          {previewMeta.eligibleClaims} eligible ·{" "}
                          <b className="text-ink">{formatINR(previewMeta.provisionalAmount)}</b>
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-ink">{formatDate(previewIso)}</span>
                        <span>No claims logged</span>
                      </div>
                    )
                  ) : (
                    <span>Click any date for single-day breakdown</span>
                  )}
                </div>
              </>
            )}

            {view === "months" && (
              <div className="space-y-2 py-1">
                <p className="text-center text-[11px] text-ink-muted">
                  Choose a month to pick a date or open the full month
                </p>
                <div className="grid grid-cols-3 gap-1.5">
                  {MONTHS_SHORT.map((name, i) => {
                    const mIso = `${cursor.y}-${pad2(i + 1)}`;
                    const disabled = mIso > currentMonthIso;
                    const isActive = mIso === monthIso;
                    return (
                      <button
                        key={name}
                        type="button"
                        disabled={disabled}
                        onClick={() => {
                          setCursor((c) => ({ ...c, m: i + 1 }));
                          setView("days");
                        }}
                        className={cn(
                          "h-10 rounded-[7px] text-xs font-medium transition-colors",
                          isActive
                            ? "bg-ink font-semibold text-white"
                            : disabled
                              ? "cursor-not-allowed text-ink-faint/40"
                              : "text-ink hover:bg-accent-soft",
                        )}
                      >
                        {name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {view === "years" && (
              <div className="grid grid-cols-3 gap-1.5 py-1">
                {Array.from({ length: 12 }, (_, i) => yearPageStart + i).map((year) => {
                  const disabled = year > maxYear;
                  const isActive = year === cursor.y;
                  return (
                    <button
                      key={year}
                      type="button"
                      disabled={disabled}
                      onClick={() => {
                        setCursor((c) => ({
                          y: year,
                          m: year === maxYear ? Math.min(c.m, Number(todayIso.slice(5, 7))) : c.m,
                        }));
                        setView("months");
                      }}
                      className={cn(
                        "h-10 rounded-[7px] text-xs font-medium tabular-nums transition-colors",
                        isActive
                          ? "bg-ink font-semibold text-white"
                          : disabled
                            ? "cursor-not-allowed text-ink-faint/40"
                            : "text-ink hover:bg-accent-soft",
                      )}
                    >
                      {year}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Popover Footer Quick Actions */}
            <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-divider pt-2.5">
              <button
                type="button"
                onClick={() => handlePickDay(todayIso)}
                className="h-8 rounded-[6px] px-2.5 text-xs font-medium text-ink transition-colors hover:bg-accent-soft"
              >
                Today
              </button>
              <button
                type="button"
                disabled={cursorMonthIso > currentMonthIso}
                onClick={() => handlePickFullMonth(cursorMonthIso)}
                className={cn(
                  "h-8 rounded-[6px] px-3 text-xs font-semibold transition-colors disabled:opacity-40",
                  !selectedDay && cursorMonthIso === monthIso
                    ? "bg-surface-muted text-ink-muted"
                    : "bg-accent text-ink hover:bg-accent-strong",
                )}
              >
                Full Month ({cursorMonthTitle})
              </button>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
