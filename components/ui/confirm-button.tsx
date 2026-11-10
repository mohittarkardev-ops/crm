"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/cn";
import { Spinner } from "@/components/ui/spinner";

const POPOVER_WIDTH = 280;
const EST_HEIGHT = 156;

type ConfirmButtonProps = {
  /** Short question shown at the top of the popover, e.g. "Delete policy?" */
  title: string;
  /** Explanatory warning sentence. */
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "primary";
  loading?: boolean;
  disabled?: boolean;
  className?: string;
  ariaLabel?: string;
  titleAttr?: string;
  onConfirm: () => Promise<void> | void;
  children: ReactNode;
};

/**
 * Replaces abrupt `window.confirm()` OS alerts with a calm, portal-anchored Hudson popover.
 */
export function ConfirmButton({
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "danger",
  loading = false,
  disabled = false,
  className,
  ariaLabel,
  titleAttr,
  onConfirm,
  children,
}: ConfirmButtonProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ left: number; top?: number; bottom?: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const place = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const openAbove = spaceBelow < EST_HEIGHT && rect.top > spaceBelow;
    const idealLeft = rect.right - POPOVER_WIDTH;
    const left = Math.min(Math.max(8, idealLeft), window.innerWidth - POPOVER_WIDTH - 8);
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

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled || loading}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={ariaLabel}
        aria-busy={loading || undefined}
        title={titleAttr}
        onClick={(e) => {
          e.stopPropagation();
          if (disabled || loading) return;
          setOpen((prev) => !prev);
        }}
        className={className}
      >
        {loading && <Spinner size={12} />}
        {children}
      </button>

      {open &&
        pos &&
        createPortal(
          <div
            ref={panelRef}
            role="dialog"
            aria-label={title}
            style={{
              position: "fixed",
              left: pos.left,
              top: pos.top,
              bottom: pos.bottom,
              width: POPOVER_WIDTH,
              maxWidth: "calc(100vw - 16px)",
            }}
            className="pop-in z-[85] rounded-tile border border-divider bg-surface-strong p-3.5 text-left shadow-card-hover"
          >
            <div className="flex items-start gap-2.5">
              <span
                className={cn(
                  "mt-0.5 grid size-7 shrink-0 place-items-center rounded-control",
                  tone === "danger" ? "bg-negative-soft text-negative" : "bg-accent-soft text-ink",
                )}
              >
                <AlertTriangle size={15} strokeWidth={1.75} aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold leading-5 text-ink">{title}</p>
                {description && <p className="mt-1 text-xs leading-relaxed text-ink-muted">{description}</p>}
              </div>
            </div>

            <div className="mt-3.5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  triggerRef.current?.focus();
                }}
                className="inline-flex h-8 items-center justify-center rounded-control border border-divider bg-white px-3 text-xs font-medium text-ink transition-[background-color,transform] duration-150 hover:bg-surface-muted active:scale-[0.985]"
              >
                {cancelLabel}
              </button>
              <button
                type="button"
                autoFocus
                onClick={() => {
                  setOpen(false);
                  void onConfirm();
                }}
                className={cn(
                  "inline-flex h-8 items-center justify-center rounded-control px-3 text-xs font-semibold transition-[background-color,filter,transform] duration-150 active:scale-[0.985]",
                  tone === "danger"
                    ? "bg-negative text-white hover:brightness-95"
                    : "bg-ink text-white hover:bg-ink/85",
                )}
              >
                {confirmLabel}
              </button>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
