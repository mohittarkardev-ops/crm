"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { buttonStyles } from "@/components/ui/button";
import { UnsavedGuardMini } from "@/components/ui/characters";
import { cn } from "@/lib/cn";

const OPEN_MS = 360;
const CLOSE_MS = 240;

type DrawerFooterState = { attached: true; el: HTMLElement | null } | null;
const DrawerFooterContext = createContext<DrawerFooterState>(null);

/**
 * Fixed action bar for forms inside a `<Drawer />`.
 * Portals out of the scrollable form container so Save/Cancel stay pinned to the bottom edge
 * with an opaque contrasting surface and rounded corner clipping regardless of form height.
 */
export function DrawerFooter({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const ctx = useContext(DrawerFooterContext);
  if (ctx?.attached) {
    return ctx.el ? createPortal(children, ctx.el) : null;
  }
  return (
    <div
      className={cn(
        "mt-6 flex flex-wrap items-center justify-end gap-2.5 border-t border-divider bg-surface px-6 py-4",
        className,
      )}
    >
      {children}
    </div>
  );
}

/**
 * Right-side drawer for forms (design.md 4.10). Slides in smoothly over a dim blurred backdrop
 * with body scroll lock, scroll-aware header/footer shadows, a pinned lower footer bar,
 * and an inline unsaved-changes guard when `dirty` is true.
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
  const [scrolledTop, setScrolledTop] = useState(false);
  const [hasMoreBelow, setHasMoreBelow] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [footerEl, setFooterEl] = useState<HTMLElement | null>(null);
  const footerContextValue = useMemo<DrawerFooterState>(
    () => ({ attached: true, el: footerEl }),
    [footerEl],
  );

  const panelRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const contentInnerRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const syncScrollState = useCallback(() => {
    const el = bodyRef.current;
    if (!el) return;
    setScrolledTop(el.scrollTop > 4);
    setHasMoreBelow(el.scrollTop + el.clientHeight < el.scrollHeight - 4);
  }, []);

  const attemptClose = useCallback(() => {
    if (dirty) {
      setConfirmDiscard(true);
      return;
    }
    onClose();
  }, [dirty, onClose]);

  // Mount cleanly, glide in on next frames, restore prior focus after slide-out.
  useEffect(() => {
    if (open) {
      previousFocusRef.current = document.activeElement as HTMLElement | null;
      setMounted(true);
      setConfirmDiscard(false);
      setScrolledTop(false);
      let inner = 0;
      const outer = requestAnimationFrame(() => {
        inner = requestAnimationFrame(() => {
          setShown(true);
          syncScrollState();
          // Preserve child `autoFocus` inputs; otherwise anchor focus on the dialog panel.
          if (panelRef.current && !panelRef.current.contains(document.activeElement)) {
            panelRef.current.focus({ preventScroll: true });
          }
        });
      });
      return () => {
        cancelAnimationFrame(outer);
        cancelAnimationFrame(inner);
      };
    }

    setShown(false);
    setConfirmDiscard(false);
    const timer = window.setTimeout(() => {
      setMounted(false);
      const prev = previousFocusRef.current;
      if (prev && prev.isConnected && typeof prev.focus === "function") {
        prev.focus({ preventScroll: true });
      }
      previousFocusRef.current = null;
    }, CLOSE_MS + 30);
    return () => window.clearTimeout(timer);
  }, [open, syncScrollState]);

  // Lock background page scroll without horizontal scrollbar shift while drawer is open.
  useEffect(() => {
    if (!mounted) return;
    const prevOverflow = document.body.style.overflow;
    const prevPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.paddingRight = prevPaddingRight;
    };
  }, [mounted]);

  // Keep footer overflow shadow accurate whenever form fields expand/collapse (`showWhen`).
  useEffect(() => {
    if (!mounted) return;
    syncScrollState();
    const observer = new ResizeObserver(syncScrollState);
    if (bodyRef.current) observer.observe(bodyRef.current);
    if (contentInnerRef.current) observer.observe(contentInnerRef.current);
    return () => observer.disconnect();
  }, [mounted, children, syncScrollState]);

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
          "absolute inset-0 bg-[rgba(28,28,28,0.35)] backdrop-blur-[5px] transition-opacity",
          shown ? "opacity-100 duration-[300ms] ease-out" : "opacity-0 duration-[220ms] ease-in",
        )}
      />

      <div
        ref={panelRef}
        tabIndex={-1}
        className={cn(
          "relative flex h-full w-full max-w-[480px] flex-col overflow-hidden rounded-l-card bg-surface-strong shadow-card-hover outline-none transition-[transform,opacity]",
          shown
            ? "translate-x-0 opacity-100 duration-[360ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
            : "translate-x-full opacity-95 duration-[240ms] ease-[cubic-bezier(0.4,0,1,1)]",
        )}
        style={{
          transitionDuration: shown ? `${OPEN_MS}ms` : `${CLOSE_MS}ms`,
        }}
      >
        <header
          className={cn(
            "z-10 flex shrink-0 items-center justify-between border-b bg-surface-strong px-6 py-4 transition-[border-color,box-shadow] duration-200",
            scrolledTop
              ? "border-ink/15 shadow-[0_6px_18px_-8px_rgba(28,28,28,0.08)]"
              : "border-divider",
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
            "shrink-0 grid transition-[grid-template-rows,opacity] duration-[260ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
            confirmDiscard ? "grid-rows-[1fr] opacity-100" : "pointer-events-none grid-rows-[0fr] opacity-0",
          )}
        >
          <div className="overflow-hidden">
            <div
              role={confirmDiscard ? "alert" : undefined}
              className="flex flex-wrap items-center justify-between gap-2 border-b border-warning/30 bg-warning-soft px-6 py-2.5 text-xs text-ink"
            >
              <span className="inline-flex items-center gap-2 font-medium">
                <UnsavedGuardMini active={confirmDiscard} />
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

        <DrawerFooterContext.Provider value={footerContextValue}>
          <div
            ref={bodyRef}
            onScroll={syncScrollState}
            className="min-h-0 flex-1 overflow-y-auto px-6 pt-5 pb-6"
          >
            <div ref={contentInnerRef} className="drawer-content-in">
              {children}
            </div>
          </div>
        </DrawerFooterContext.Provider>

        <footer
          ref={setFooterEl}
          className={cn(
            "empty:hidden z-10 flex shrink-0 flex-wrap items-center justify-end gap-2.5 border-t bg-surface px-6 py-4 transition-[border-color,box-shadow] duration-200",
            hasMoreBelow
              ? "border-ink/15 shadow-[0_-6px_18px_-8px_rgba(28,28,28,0.08)]"
              : "border-divider",
          )}
        >
          {footer}
        </footer>
      </div>
    </div>
  );
}
