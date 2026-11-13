"use client";

import { useMemo, useState } from "react";
import { PieChart, TrendingDown, TrendingUp } from "lucide-react";
import { DonutChart } from "@/components/charts/donut-chart";
import { Card, CardHeader } from "@/components/ui/card";
import { RelaxedEmptyCharacter } from "@/components/ui/characters";
import { Chip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty-state";
import { Segmented } from "@/components/ui/segmented";
import { cn } from "@/lib/cn";
import type { BusinessPeriodData, DashboardTimeRange } from "@/lib/data/types";

type BusinessUnit = "cr" | "lakh";

const TIME_OPTIONS: { value: DashboardTimeRange; label: string }[] = [
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "year", label: "Year" },
];

export function formatBusinessCurrency(amountINR: number, unit: BusinessUnit): string {
  if (unit === "cr") {
    const cr = amountINR / 10_000_000;
    if (cr === 0) return "₹0 Cr";
    if (cr >= 100) return `₹${cr.toFixed(1)} Cr`;
    if (cr >= 1) return `₹${cr.toFixed(2)} Cr`;
    return `₹${cr.toFixed(3)} Cr`;
  } else {
    const l = amountINR / 100_000;
    if (l === 0) return "₹0 L";
    if (l >= 100) return `₹${l.toFixed(1)} L`;
    if (l >= 1) return `₹${l.toFixed(2)} L`;
    return `₹${l.toFixed(2)} L`;
  }
}

/**
 * "Total Business Payment" category-wise pie/donut chart:
 * - Lakhs / Crores unit toggle chips (default: Crores)
 * - Timing filter (Day, Week, Month, Year)
 * - Comparative growth indicator & visual growth bar vs previous period
 */
export function BusinessPaymentCard({
  index,
  data,
}: {
  index?: number;
  data: Record<DashboardTimeRange, BusinessPeriodData>;
}) {
  const [range, setRange] = useState<DashboardTimeRange>("month");
  const [unit, setUnit] = useState<BusinessUnit>("cr");

  const period = data[range] ?? {
    slices: [],
    totalRaw: 0,
    previousRaw: 0,
    growthPercent: 0,
    periodLabel: range,
    previousLabel: `Previous ${range}`,
  };

  const currentFormatted = formatBusinessCurrency(period.totalRaw, unit);
  const previousFormatted = formatBusinessCurrency(period.previousRaw, unit);

  const growthPercent = period.growthPercent;
  const isPositiveGrowth = growthPercent !== null && growthPercent > 0;
  const isNegativeGrowth = growthPercent !== null && growthPercent < 0;

  // Visual ratio for the comparative growth bar (clamped 0% to 100%)
  const growthBarPercent = useMemo(() => {
    if (period.previousRaw <= 0) {
      return period.totalRaw > 0 ? 100 : 0;
    }
    const ratio = Math.round((period.totalRaw / period.previousRaw) * 100);
    return Math.min(100, Math.max(5, ratio));
  }, [period.totalRaw, period.previousRaw]);

  // Transform slices for DonutChart: value is the percentage share (0-100)
  const chartSlices = useMemo(() => {
    return period.slices.map((s) => ({
      name: s.name,
      value: s.percentage,
      color: s.color,
    }));
  }, [period.slices]);

  return (
    <Card index={index} className="flex flex-col">
      <CardHeader
        title={
          <div className="flex flex-col">
            <span>Total Business Payment</span>
            <span className="text-xs font-normal text-ink-muted">Category-wise premium and timing growth</span>
          </div>
        }
        action={
          <div className="flex flex-wrap items-center gap-2">
            {/* Lakhs / Crores Filter Chips (Default: Crores) */}
            <div className="flex items-center rounded-control border border-divider bg-surface-muted/50 p-0.5">
              <button
                type="button"
                onClick={() => setUnit("cr")}
                className={cn(
                  "rounded-[4px] px-2.5 py-1 text-xs font-semibold transition-all",
                  unit === "cr"
                    ? "bg-white text-ink shadow-xs font-bold"
                    : "text-ink-muted hover:text-ink",
                )}
                aria-pressed={unit === "cr"}
              >
                ₹ Crores
              </button>
              <button
                type="button"
                onClick={() => setUnit("lakh")}
                className={cn(
                  "rounded-[4px] px-2.5 py-1 text-xs font-semibold transition-all",
                  unit === "lakh"
                    ? "bg-white text-ink shadow-xs font-bold"
                    : "text-ink-muted hover:text-ink",
                )}
                aria-pressed={unit === "lakh"}
              >
                ₹ Lakhs
              </button>
            </div>

            {/* Timing Filter: Day / Week / Month / Year */}
            <Segmented
              label="Time period"
              options={TIME_OPTIONS}
              value={range}
              onChange={setRange}
            />
          </div>
        }
      />

      <div className="flex flex-1 flex-col gap-4 p-5 pt-0">
        {/* Comparative Growth Bar Section */}
        <div className="rounded-tile border border-divider bg-surface-muted/40 p-3.5 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 font-medium text-ink-muted">
              {isPositiveGrowth ? (
                <TrendingUp size={15} className="text-positive" />
              ) : isNegativeGrowth ? (
                <TrendingDown size={15} className="text-negative" />
              ) : (
                <TrendingUp size={15} className="text-ink-muted" />
              )}
              <span>Growth vs {period.previousLabel}</span>
            </span>

            <Chip
              tone={
                isPositiveGrowth
                  ? "positive"
                  : isNegativeGrowth
                    ? "negative"
                    : "accent"
              }
            >
              {growthPercent !== null
                ? isPositiveGrowth
                  ? `+${growthPercent}%`
                  : `${growthPercent}%`
                : "0%"}
            </Chip>
          </div>

          {/* Visual comparative growth bar */}
          <div className="space-y-1">
            <div className="h-2 w-full overflow-hidden rounded-full bg-surface-muted border border-divider/40">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  isPositiveGrowth
                    ? "bg-positive"
                    : isNegativeGrowth
                      ? "bg-negative"
                      : "bg-accent-strong",
                )}
                style={{ width: `${growthBarPercent}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-ink-muted tabular-nums">
              <span>
                {period.periodLabel}: <b className="text-ink">{currentFormatted}</b>
              </span>
              <span>
                {period.previousLabel}: <b className="text-ink">{previousFormatted}</b>
              </span>
            </div>
          </div>
        </div>

        {/* Pie / Donut Chart & Category Legend */}
        {chartSlices.length === 0 ? (
          <EmptyState
            label="No business payments recorded"
            icon={PieChart}
            illustration={<RelaxedEmptyCharacter />}
            className="flex-1 py-8"
          />
        ) : (
          <div className="grid flex-1 items-center gap-4 sm:grid-cols-2 xl:grid-cols-1">
            <div className="mx-auto h-48 w-48 xl:h-52 xl:w-52">
              <DonutChart
                data={chartSlices}
                unit="%"
                center={
                  <div className="pointer-events-none flex flex-col items-center justify-center text-center px-2">
                    <span className="text-xs font-medium text-ink-muted">
                      {period.periodLabel}
                    </span>
                    <span className="text-sm font-bold text-ink tabular-nums">
                      {currentFormatted}
                    </span>
                  </div>
                }
              />
            </div>

            {/* Category breakdown legend with values in chosen Lakhs/Crores unit */}
            <ul className="space-y-2.5">
              {period.slices.map((item) => (
                <li key={item.code} className="flex items-center gap-2 text-xs">
                  <span
                    className="size-2 shrink-0 rounded-full"
                    style={{ backgroundColor: item.color }}
                    aria-hidden="true"
                  />
                  <span className="truncate text-ink-muted">{item.name}</span>
                  <div className="ml-auto flex items-center gap-2 tabular-nums">
                    <span className="font-semibold text-ink">
                      {formatBusinessCurrency(item.rawAmount, unit)}
                    </span>
                    <span className="w-9 text-right text-[11px] text-ink-muted">
                      {item.percentage}%
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Card>
  );
}
