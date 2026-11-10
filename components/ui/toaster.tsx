"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, TriangleAlert, X } from "lucide-react";
import { cn } from "@/lib/cn";

type Tone = "success" | "error";
type Item = {
  id: number;
  message: string;
  tone: Tone;
  durationMs: number;
  leaving?: boolean;
};

const EVENT = "crm:toast";
const EXIT_MS = 280;
let counter = 0;

/** Shows a short message at the bottom of the screen. Call it from any client code. */
export function toast(message: string, tone: Tone = "success") {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(EVENT, { detail: { message, tone } }));
}

function ToastCard({ item, onRemove }: { item: Item; onRemove: (id: number) => void }) {
  const [entered, setEntered] = useState(false);
  const [paused, setPaused] = useState(false);

  const cardRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLSpanElement>(null);
  const remainingRef = useRef<number>(item.durationMs);
  const dismissedRef = useRef(false);
  const onRemoveRef = useRef(onRemove);

  useEffect(() => {
    onRemoveRef.current = onRemove;
  }, [onRemove]);

  const dismiss = useCallback(() => {
    if (dismissedRef.current) return;
    dismissedRef.current = true;
    onRemoveRef.current(item.id);
  }, [item.id]);

  // Smooth bottom-up entrance after first paint + initial hover check (if toast spawned under cursor).
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

  // Unified rAF loop driving both the countdown timer AND hairline bar so hover pause stays 100% locked.
  useEffect(() => {
    if (paused || item.leaving || dismissedRef.current) return;

    let rafId = 0;
    let lastTs = performance.now();

    const tick = (now: number) => {
      const elapsed = now - lastTs;
      lastTs = now;
      remainingRef.current = Math.max(0, remainingRef.current - elapsed);
      const ratio = item.durationMs > 0 ? remainingRef.current / item.durationMs : 0;

      if (barRef.current) {
        barRef.current.style.transform = `scaleX(${ratio})`;
      }

      if (remainingRef.current <= 0) {
        dismiss();
        return;
      }
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [paused, item.leaving, item.durationMs, dismiss]);

  const visible = entered && !item.leaving;

  return (
    <div
      ref={cardRef}
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      className={cn(
        "relative flex items-start gap-3 overflow-hidden rounded-tile border border-divider/70 bg-surface-strong p-3 pb-3.5 shadow-card-hover transition-[opacity,transform] duration-[280ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
        visible ? "translate-y-0 scale-100 opacity-100" : "translate-y-4 scale-[0.98] opacity-0",
        item.leaving && "pointer-events-none",
      )}
    >
      {item.tone === "success" ? (
        <CheckCircle2 size={18} strokeWidth={1.75} className="check-pop mt-0.5 shrink-0 text-positive" aria-hidden="true" />
      ) : (
        <TriangleAlert size={18} strokeWidth={1.75} className="mt-0.5 shrink-0 text-negative" aria-hidden="true" />
      )}
      <p className={cn("select-text flex-1 break-words text-sm", item.tone === "error" ? "text-negative" : "text-ink")}>
        {item.message}
      </p>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={dismiss}
        className="grid size-6 shrink-0 place-items-center rounded-control text-ink-faint transition-colors hover:bg-surface-muted hover:text-ink"
      >
        <X size={14} strokeWidth={1.75} aria-hidden="true" />
      </button>

      {/* Subtle track + 3px hairline countdown bar driven cleanly by the shared rAF timer */}
      <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-[3px] bg-divider/20">
        <span
          ref={barRef}
          className={cn(
            "block h-full w-full origin-left will-change-transform",
            item.tone === "success" ? "bg-positive" : "bg-negative",
          )}
          style={{ transform: "scaleX(1)" }}
        />
      </span>
    </div>
  );
}

/** Mounted once in the dashboard layout. */
export function Toaster() {
  const [items, setItems] = useState<Item[]>([]);

  const beginDismiss = useCallback((id: number) => {
    setItems((current) => current.map((item) => (item.id === id ? { ...item, leaving: true } : item)));
    window.setTimeout(() => {
      setItems((current) => current.filter((item) => item.id !== id));
    }, EXIT_MS);
  }, []);

  useEffect(() => {
    const onToast = (event: Event) => {
      const { message, tone } = (event as CustomEvent<{ message: string; tone: Tone }>).detail;
      const id = ++counter;
      const durationMs = tone === "error" ? 9000 : 5000;
      setItems((current) => [...current, { id, message, tone, durationMs }].slice(-3));
    };
    window.addEventListener(EVENT, onToast);
    return () => window.removeEventListener(EVENT, onToast);
  }, []);

  if (items.length === 0) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 left-1/2 z-[95] flex w-[28rem] max-w-[calc(100vw-2rem)] -translate-x-1/2 flex-col gap-2"
    >
      {items.map((item) => (
        <ToastCard key={item.id} item={item} onRemove={beginDismiss} />
      ))}
    </div>
  );
}
