"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";

/** Smoothly animates horizontal fill from 0% on first mount while honoring `prefers-reduced-motion`. */
export function AnimatedProgressBar({
  pct,
  positive = false,
  className,
}: {
  pct: number;
  positive?: boolean;
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(100, Math.round(pct)));
  const [width, setWidth] = useState(0);

  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setWidth(clamped);
      return;
    }
    const frame = requestAnimationFrame(() => setWidth(clamped));
    return () => cancelAnimationFrame(frame);
  }, [clamped]);

  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-surface-muted", className)}>
      <div
        className={cn(
          "h-full rounded-full transition-[width,background-color] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]",
          positive ? "bg-positive" : "bg-accent-strong",
        )}
        style={{ width: `${width}%` }}
      />
    </div>
  );
}
