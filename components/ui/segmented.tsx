"use client";

import { useRef } from "react";
import { cn } from "@/lib/cn";
import { useSlidingPill } from "@/components/ui/use-sliding-pill";

type Option<T extends string> = { value: T; label: string };

/** Bordered toggle with a gliding near-black active segment, e.g. Week / Month / Year (design.md section 4). */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { rect, animated } = useSlidingPill(containerRef, value);

  return (
    <div
      ref={containerRef}
      role="tablist"
      aria-label={label}
      className="relative inline-flex overflow-hidden rounded-[4px] border border-ink"
    >
      {rect && (
        <span
          aria-hidden="true"
          style={{
            left: 0,
            top: 0,
            width: rect.width,
            height: rect.height,
            transform: `translate3d(${rect.left}px, ${rect.top}px, 0)`,
          }}
          className={cn(
            "pointer-events-none absolute z-0 bg-ink",
            animated && "transition-[transform,width,height] duration-200 ease-[cubic-bezier(0.2,0.8,0.2,1)]",
          )}
        />
      )}
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            data-pill-key={option.value}
            aria-selected={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "relative z-10 h-8 px-3 text-xs font-medium transition-colors duration-150",
              active
                ? rect
                  ? "bg-transparent text-white"
                  : "bg-ink text-white"
                : "bg-transparent text-ink hover:bg-surface-muted/70",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
