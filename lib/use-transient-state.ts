"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** Transient boolean flag that stays true for `durationMs` (drives CRM `<Button saved savedLabel="..." />` morphs). */
export function useSavedFlag(durationMs = 1800): [boolean, () => void] {
  const [saved, setSaved] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const trigger = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setSaved(true);
    timerRef.current = setTimeout(() => setSaved(false), durationMs);
  }, [durationMs]);

  return [saved, trigger];
}

export type FlashTone = "positive" | "accent";

/** Transient row highlight hook matching ModulePage (`flash-positive` / `flash-accent`). */
export function useRowFlash(durationMs = 1300) {
  const [flashed, setFlashed] = useState<{ id: string; tone: FlashTone } | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const triggerFlash = useCallback(
    (id: string, tone: FlashTone = "positive") => {
      if (timerRef.current) clearTimeout(timerRef.current);
      setFlashed({ id, tone });
      timerRef.current = setTimeout(() => setFlashed(null), durationMs);
    },
    [durationMs],
  );

  const flashClassFor = useCallback(
    (id: string) => {
      if (flashed?.id !== id) return undefined;
      return flashed.tone === "positive" ? "flash-positive" : "flash-accent";
    },
    [flashed],
  );

  return { triggerFlash, flashClassFor };
}

/** Validation error state paired with an incrementing pulse key so `micro-shake` replays on every failure. */
export function useErrorNudge() {
  const [error, setErrorState] = useState<string | null>(null);
  const [errorPulse, setErrorPulse] = useState(0);

  const triggerError = useCallback((message: string | null) => {
    setErrorState(message);
    if (message) setErrorPulse((n) => n + 1);
  }, []);

  return { error, errorPulse, setError: triggerError };
}
