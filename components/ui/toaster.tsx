"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, TriangleAlert, X } from "lucide-react";
import { cn } from "@/lib/cn";

type Tone = "success" | "error";
type Item = { id: number; message: string; tone: Tone };

const EVENT = "crm:toast";
let counter = 0;

/** Shows a short message at the bottom of the screen. Call it from any client code. */
export function toast(message: string, tone: Tone = "success") {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(EVENT, { detail: { message, tone } }));
}

/** Mounted once in the dashboard layout. */
export function Toaster() {
  const [items, setItems] = useState<Item[]>([]);

  useEffect(() => {
    const onToast = (event: Event) => {
      const { message, tone } = (event as CustomEvent<{ message: string; tone: Tone }>).detail;
      const id = ++counter;
      setItems((current) => [...current, { id, message, tone }].slice(-3));
      window.setTimeout(() => setItems((current) => current.filter((item) => item.id !== id)), tone === "error" ? 9000 : 5000);
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
        <div key={item.id} className="pop-in flex items-start gap-3 rounded-tile bg-surface-strong p-3 shadow-card-hover">
          {item.tone === "success" ? (
            <CheckCircle2 size={18} strokeWidth={1.75} className="mt-0.5 shrink-0 text-positive" aria-hidden="true" />
          ) : (
            <TriangleAlert size={18} strokeWidth={1.75} className="mt-0.5 shrink-0 text-negative" aria-hidden="true" />
          )}
          <p className={cn("select-text flex-1 break-words text-sm", item.tone === "error" ? "text-negative" : "text-ink")}>
            {item.message}
          </p>
          <button
            type="button"
            aria-label="Dismiss"
            onClick={() => setItems((current) => current.filter((i) => i.id !== item.id))}
            className="grid size-6 shrink-0 place-items-center rounded-control text-ink-faint hover:bg-surface-muted hover:text-ink"
          >
            <X size={14} strokeWidth={1.75} aria-hidden="true" />
          </button>
        </div>
      ))}
    </div>
  );
}
