"use client";

import { useEffect, useState } from "react";

/**
 * True only if `flag` has stayed true for `delay` ms. Used so a loader never flashes for a quick action
 * (design.md: under about a second, show no loader).
 */
export function useDelayedFlag(flag: boolean, delay = 400) {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (!flag) {
      setShown(false);
      return;
    }
    const timer = window.setTimeout(() => setShown(true), delay);
    return () => window.clearTimeout(timer);
  }, [flag, delay]);

  return shown;
}
