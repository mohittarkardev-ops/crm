"use client";

import { useCallback, useLayoutEffect, useState, type RefObject } from "react";

export type SlidingPillRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

/**
 * Measures the active `[data-pill-key]` element inside a container so a single dark pill
 * can glide smoothly between options without layout shifts. Skips transition on initial paint.
 */
export function useSlidingPill(
  containerRef: RefObject<HTMLElement | null>,
  activeKey: string | null | undefined,
): { rect: SlidingPillRect | null; animated: boolean } {
  const [rect, setRect] = useState<SlidingPillRect | null>(null);
  const [animated, setAnimated] = useState(false);

  const measure = useCallback(
    (allowAnimation: boolean) => {
      const container = containerRef.current;
      if (!container || activeKey == null || activeKey === "") {
        setRect(null);
        return;
      }
      const candidates = container.querySelectorAll<HTMLElement>("[data-pill-key]");
      let match: HTMLElement | null = null;
      candidates.forEach((el) => {
        if (el.dataset.pillKey === activeKey) match = el;
      });
      if (!match) {
        setRect(null);
        return;
      }
      const next: SlidingPillRect = {
        left: (match as HTMLElement).offsetLeft,
        top: (match as HTMLElement).offsetTop,
        width: (match as HTMLElement).offsetWidth,
        height: (match as HTMLElement).offsetHeight,
      };
      setRect((prev) => {
        if (prev && allowAnimation) setAnimated(true);
        return next;
      });
    },
    [containerRef, activeKey],
  );

  useLayoutEffect(() => {
    measure(true);
    const container = containerRef.current;
    if (!container || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => measure(false));
    observer.observe(container);
    return () => observer.disconnect();
  }, [containerRef, measure]);

  return { rect, animated };
}
