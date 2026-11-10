"use client";

import { useState } from "react";
import { WavingShieldCharacter, type MascotShift } from "@/components/ui/characters";
import { Chip } from "@/components/ui/chip";

const SHIFT_ORDER: MascotShift[] = ["morning", "midday", "evening"];

const SHIFT_LABELS: Record<MascotShift, string> = {
  morning: "Morning mug",
  midday: "Sun visor",
  evening: "Desk lamp",
};

/**
 * Interactive Dashboard companion header:
 * displays live shift flair on Pip (morning coffee mug, mid-day sun visor, or evening desk lamp)
 * and lets staff tap Pip or the shift pill to wave and preview any time-of-day mode.
 */
export function CompanionMascot({
  initialShift,
  greeting,
  firstName,
  summary,
}: {
  initialShift: MascotShift;
  greeting: string;
  firstName: string;
  summary: string;
}) {
  const [overrideShift, setOverrideShift] = useState<MascotShift | null>(null);
  const [waveKey, setWaveKey] = useState(0);

  const activeShift = overrideShift ?? initialShift;

  function triggerWaveAndCycle() {
    setWaveKey((n) => n + 1);
    const nextIdx = (SHIFT_ORDER.indexOf(activeShift) + 1) % SHIFT_ORDER.length;
    const nextShift = SHIFT_ORDER[nextIdx];
    setOverrideShift(nextShift === initialShift ? null : nextShift);
  }

  return (
    <div className="flex min-w-0 items-center gap-3.5">
      <button
        type="button"
        onClick={triggerWaveAndCycle}
        aria-label={`Wave to Pip (${SHIFT_LABELS[activeShift]} mode, tap to switch shift flair)`}
        title={`${SHIFT_LABELS[activeShift]} — click to wave & switch shift flair`}
        className="group -m-1 shrink-0 cursor-pointer rounded-control p-1 transition-transform duration-150 hover:scale-[1.04] active:scale-[0.97]"
      >
        <WavingShieldCharacter shift={activeShift} waveKey={waveKey} />
      </button>

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold text-ink sm:text-[15px]">
            {greeting}, {firstName}
          </p>
          <Chip tone="accent">Shield Crew</Chip>
          <button
            type="button"
            onClick={triggerWaveAndCycle}
            title="Click to cycle morning mug, sun visor, and evening desk lamp"
            className="cursor-pointer rounded-full bg-surface-muted px-2 py-0.5 text-[11px] font-medium text-ink-muted transition-colors hover:bg-accent-soft hover:text-ink"
          >
            {SHIFT_LABELS[activeShift]}
          </button>
        </div>
        <p className="mt-0.5 text-xs text-ink-muted tabular-nums">{summary}</p>
      </div>
    </div>
  );
}
