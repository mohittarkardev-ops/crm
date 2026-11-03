"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { buttonStyles } from "@/components/ui/button";
import { cn } from "@/lib/cn";

const DURATION_MS = 320;

/**
 * Right-side drawer for forms (design.md 4.10). Slides in over a fading backdrop and slides back out on close.
 * Closes on Escape or a backdrop click.
 */
export function Drawer({
  open,
  title,
  onClose,
  children,
  footer,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const [mounted, setMounted] = useState(open);
  const [shown, setShown] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Mount first, then flip to "shown" on the next frames so the CSS transition has a starting point.
  useEffect(() => {
    if (open) {
      setMounted(true);
      let inner = 0;
      const outer = requestAnimationFrame(() => {
        inner = requestAnimationFrame(() => {
          setShown(true);
          panelRef.current?.focus();
        });
      });
      return () => {
        cancelAnimationFrame(outer);
        cancelAnimationFrame(inner);
      };
    }
    setShown(false);
    const timer = window.setTimeout(() => setMounted(false), DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!mounted) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label={title}>
      <button
        type="button"
        aria-label="Close"
        tabIndex={-1}
        onClick={onClose}
        className={cn(
          "absolute inset-0 bg-[rgba(28,28,28,0.35)] backdrop-blur-[4px] transition-opacity ease-out",
          shown ? "opacity-100" : "opacity-0",
        )}
        style={{ transitionDuration: `${DURATION_MS}ms` }}
      />
      <div
        ref={panelRef}
        tabIndex={-1}
        className={cn(
          "relative flex h-full w-full max-w-[480px] flex-col rounded-l-card bg-surface-strong shadow-card-hover outline-none transition-transform ease-[cubic-bezier(0.32,0.72,0,1)]",
          shown ? "translate-x-0" : "translate-x-full",
        )}
        style={{ transitionDuration: `${DURATION_MS}ms` }}
      >
        <header className="flex items-center justify-between border-b border-divider px-6 py-4">
          <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
          <button type="button" aria-label="Close" onClick={onClose} className={buttonStyles("icon")}>
            <X size={18} strokeWidth={1.75} aria-hidden="true" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && <footer className="flex justify-end gap-2 border-t border-divider px-6 py-4">{footer}</footer>}
      </div>
    </div>
  );
}
