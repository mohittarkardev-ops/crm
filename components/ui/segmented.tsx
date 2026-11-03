"use client";

import { cn } from "@/lib/cn";

type Option<T extends string> = { value: T; label: string };

/** Bordered toggle with a near-black active segment, e.g. Week / Month / Year (design.md section 4). */
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
  return (
    <div role="tablist" aria-label={label} className="inline-flex overflow-hidden rounded-[4px] border border-ink">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "h-8 px-3 text-xs font-medium transition-colors duration-150",
              active ? "bg-ink text-white" : "bg-transparent text-ink hover:bg-surface-muted",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
