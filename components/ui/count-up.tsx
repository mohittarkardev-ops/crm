"use client";

import { useEffect, useState } from "react";
import { formatINR, formatNumber } from "@/lib/format";

type Kind = "number" | "inr" | "percent";

/** Counts up once on first load (600ms); skips the animation for reduced-motion users. */
export function CountUp({
  value,
  kind = "number",
  prefix = "",
  duration = 600,
}: {
  value: number;
  kind?: Kind;
  prefix?: string;
  duration?: number;
}) {
  const [shown, setShown] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(value);
      return;
    }
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      setShown(value * (1 - Math.pow(1 - t, 3)));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, duration]);

  const rounded = Math.round(shown);
  const text =
    kind === "inr" ? formatINR(rounded) : kind === "percent" ? `${rounded}%` : formatNumber(rounded);

  return (
    <span className="tabular-nums">
      {prefix}
      {text}
    </span>
  );
}
