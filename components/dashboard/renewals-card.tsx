"use client";

import { useState } from "react";
import { BarChartCard } from "@/components/charts/bar-chart-card";
import { Card, CardHeader } from "@/components/ui/card";
import { RelaxedEmptyCharacter } from "@/components/ui/characters";
import { Segmented } from "@/components/ui/segmented";
import { EmptyState } from "@/components/ui/empty-state";
import { BarChart3 } from "lucide-react";
import type { ChartDatum, RenewalRange } from "@/lib/data/types";

const OPTIONS: { value: RenewalRange; label: string }[] = [
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "year", label: "Year" },
];

/** "Renewals due" bar chart with the Week / Month / Year toggle. */
export function RenewalsCard({ index, data }: { index?: number; data: Record<RenewalRange, ChartDatum[]> }) {
  const [range, setRange] = useState<RenewalRange>("month");

  return (
    <Card index={index}>
      <CardHeader
        title="Renewals due"
        action={<Segmented label="Time range" options={OPTIONS} value={range} onChange={setRange} />}
      />
      <div className="h-64">
        {data[range].some((d) => d.value > 0) ? (
          <BarChartCard key={range} data={data[range]} />
        ) : (
          <EmptyState
            label="No renewals yet"
            icon={BarChart3}
            illustration={<RelaxedEmptyCharacter />}
            className="h-full"
          />
        )}
      </div>
    </Card>
  );
}
