"use client";

import { useState } from "react";
import { UserPlus } from "lucide-react";
import { BarChartCard } from "@/components/charts/bar-chart-card";
import { Card, CardHeader } from "@/components/ui/card";
import { WelcomeClientMini } from "@/components/ui/characters";
import { Chip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty-state";
import { Segmented } from "@/components/ui/segmented";
import type { ChartDatum, DashboardTimeRange } from "@/lib/data/types";

const TIME_OPTIONS: { value: DashboardTimeRange; label: string }[] = [
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "year", label: "Year" },
];

/** "New Customers" bar chart replacing Renewals due, with Day / Week / Month / Year filter & total count badge. */
export function NewCustomersCard({
  index,
  data,
}: {
  index?: number;
  data: {
    total: number;
    breakdown: Record<DashboardTimeRange, ChartDatum[]>;
    periodTotals: Record<DashboardTimeRange, number>;
  };
}) {
  const [range, setRange] = useState<DashboardTimeRange>("month");

  const currentList = data.breakdown[range] ?? [];
  const currentTotal = data.periodTotals[range] ?? 0;
  const hasData = currentList.some((d) => d.value > 0);

  return (
    <Card index={index}>
      <CardHeader
        title={
          <div className="flex flex-col">
            <span>New Customers</span>
            <span className="text-xs font-normal text-ink-muted">
              <span className="font-semibold tabular-nums text-ink">{currentTotal}</span> registered in this{" "}
              {range} · <span className="tabular-nums">{data.total}</span> total
            </span>
          </div>
        }
        action={
          <Segmented
            label="Time range"
            options={TIME_OPTIONS}
            value={range}
            onChange={setRange}
          />
        }
      />
      <div className="h-56">
        {hasData ? (
          <BarChartCard key={range} data={currentList} seriesName="New Customers" />
        ) : (
          <EmptyState
            label={`No new customers registered in this ${range}`}
            icon={UserPlus}
            illustration={<WelcomeClientMini />}
            className="h-full"
          />
        )}
      </div>
    </Card>
  );
}
