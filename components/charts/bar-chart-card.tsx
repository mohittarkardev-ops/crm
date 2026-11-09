"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartTooltip } from "@/components/charts/chart-tooltip";

type Datum = { label: string; value: number };

/** Rounded accent bars over a pale full-height track (design.md 4.4). */
export function BarChartCard({ data, seriesName = "Renewals" }: { data: Datum[]; seriesName?: string }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 8, right: 0, left: -16, bottom: 0 }} barCategoryGap="26%">
        <CartesianGrid vertical={false} stroke="var(--divider)" />
        <XAxis
          dataKey="label"
          axisLine={false}
          tickLine={false}
          tick={{ fill: "var(--text-muted)", fontSize: 11 }}
        />
        <YAxis axisLine={false} tickLine={false} tick={{ fill: "var(--text-muted)", fontSize: 11 }} width={44} />
        <Tooltip cursor={false} content={<ChartTooltip />} />
        <Bar
          dataKey="value"
          name={seriesName}
          fill="var(--accent)"
          radius={[8, 8, 8, 8]}
          background={{ fill: "var(--grey)", fillOpacity: 0.35, radius: 8 }}
          animationDuration={600}
          animationEasing="ease-out"
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
