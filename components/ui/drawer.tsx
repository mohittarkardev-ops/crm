"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { AlertCircle, X } from "lucide-react";
import { buttonStyles } from "@/components/ui/button";
import { cn } from "@/lib/cn";

const DURATION_MS = 320;

/**
 * Right-side drawer for forms (design.md 4.10). Slides in over a fading backdrop and slides back out on close.
 * Supports scroll-aware header emphasis and an inline discard guard when `dirty` is true.
 */
export function Drawer({
  open,
  title,
  onClose,
  dirty = false,
  children,
  footer,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  /** When true, backdrop/Escape/Close prompts briefly before discarding unsaved edits. */
  dirty?: boolean;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const [mounted, setMounted] = useState(open);
  const [shown, setShown] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const attemptClose = useCallback(() => {
    if (dirty) {
      setConfirmDiscard(true);
      return;
    }
    onClose();
  }, [dirty, onClose]);

  // Mount first, then flip to "shown" on the next frames so the CSS transition has a starting point.
  useEffect(() => {
    if (open) {
      setMounted(true);
      setConfirmDiscard(false);
      setScrolled(false);
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
    setConfirmDiscard(false);
    const timer = window.setTimeout(() => setMounted(false), DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!dirty) setConfirmDiscard(false);
  }, [dirty]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") attemptClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, attemptClose]);

  if (!mounted) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label={title}>
      <button
        type="button"
        aria-label="Close"
        tabIndex={-1}
        onClick={attemptClose}
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
        <header
          className={cn(
            "flex items-center justify-between border-b px-6 py-4 transition-colors duration-150",
            scrolled ? "border-ink/25" : "border-divider",
          )}
        >
          <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
          <button type="button" aria-label="Close" onClick={attemptClose} className={buttonStyles("icon")}>
            <X size={18} strokeWidth={1.75} aria-hidden="true" />
          </button>
        </header>

        <div
          aria-hidden={!confirmDiscard}
          className={cn(
            "grid transition-[grid-template-rows,opacity] duration-[280ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
            confirmDiscard ? "grid-rows-[1fr] opacity-100" : "pointer-events-none grid-rows-[0fr] opacity-0",
          )}
        >
          <div className="overflow-hidden">
            <div
              role={confirmDiscard ? "alert" : undefined}
              className="flex flex-wrap items-center justify-between gap-2 border-b border-warning/30 bg-warning-soft px-6 py-2.5 text-xs text-ink"
            >
              <span className="inline-flex items-center gap-1.5 font-medium">
                <AlertCircle size={14} className="shrink-0 text-warning" aria-hidden="true" />
                Discard unsaved changes?
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  tabIndex={confirmDiscard ? 0 : -1}
                  onClick={() => setConfirmDiscard(false)}
                  className="inline-flex h-7 items-center rounded-control border border-divider bg-surface-strong px-2.5 text-xs font-medium text-ink transition-colors duration-150 hover:bg-surface-muted"
                >
                  Keep editing
                </button>
                <button
                  type="button"
                  tabIndex={confirmDiscard ? 0 : -1}
                  onClick={onClose}
                  className="inline-flex h-7 items-center rounded-control bg-negative px-2.5 text-xs font-semibold text-white transition-all duration-150 hover:brightness-95"
                >
                  Discard
                </button>
              </div>
            </div>
          </div>
        </div>

        <div
          onScroll={(event) => setScrolled(event.currentTarget.scrollTop > 4)}
          className="flex-1 overflow-y-auto px-6 py-5"
        >
          {children}
        </div>
        {footer && <footer className="flex justify-end gap-2 border-t border-divider px-6 py-4">{footer}</footer>}
      </div>
    </div>
  );
}
