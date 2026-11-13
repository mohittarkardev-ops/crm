"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { Segmented } from "@/components/ui/segmented";
import { formatNumber } from "@/lib/format";
import type { RenewalRetentionMetric } from "@/lib/data/types";

const RETENTION_MODES: { value: "monthly" | "yearly"; label: string }[] = [
  { value: "monthly", label: "Month" },
  { value: "yearly", label: "Year" },
];

export function RenewalRetentionCard({
  index = 3,
  data,
}: {
  index?: number;
  data: RenewalRetentionMetric;
}) {
  const [mode, setMode] = useState<"monthly" | "yearly">("monthly");
  const current = mode === "monthly" ? data.monthly : data.yearly;
  const rate = current.retentionRate;

  return (
    <Card index={index} className="flex flex-col justify-between">
      <div>
        <CardHeader
          title={<span className="font-semibold text-ink">Renewal Retention</span>}
          action={
            <Segmented
              label="Retention view"
              options={RETENTION_MODES}
              value={mode}
              onChange={setMode}
            />
          }
        />

        <div className="mt-2.5 flex items-baseline justify-between gap-2">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-[28px] font-bold leading-9 tracking-tight text-ink tabular-nums">
                {rate}%
              </span>
            </div>
            <p className="mt-0.5 text-xs text-ink-muted">
              Preserved in <b>{current.currentPeriodLabel}</b> vs <b>{current.basePeriodLabel}</b> closed base
            </p>
          </div>

          <div className="rounded-full bg-surface-muted p-2 text-ink-muted shrink-0">
            <RefreshCw size={16} />
          </div>
        </div>

        {/* Visual Progress Bar (Neutral / Accent, without arbitrary judgment colors) */}
        <div className="mt-3 space-y-1">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-muted">
            <div
              className="h-full rounded-full bg-accent-strong transition-all duration-500 ease-out"
              style={{ width: `${Math.min(100, Math.max(0, rate))}%` }}
            />
          </div>
        </div>

        {/* Detailed Stats Row */}
        <div className="mt-3 grid grid-cols-2 gap-2 rounded-tile border border-divider/60 bg-surface-muted/30 p-2 text-xs">
          <div>
            <span className="text-[11px] font-medium text-ink-muted">Renewed</span>
            <p className="font-bold text-ink tabular-nums">{formatNumber(current.renewedCount)}</p>
          </div>
          <div>
            <span className="text-[11px] font-medium text-ink-muted">Closed base</span>
            <p className="font-bold text-ink tabular-nums">{formatNumber(current.closedBaseCount)}</p>
          </div>
        </div>
      </div>

      <p className="mt-2.5 text-[11px] text-ink-muted">
        {mode === "monthly"
          ? "Preserved / renewed customers this month against same month prior year closed customer base."
          : "Preserved / renewed customers this calendar year against previous calendar year closed customer base."}
      </p>
    </Card>
  );
}
