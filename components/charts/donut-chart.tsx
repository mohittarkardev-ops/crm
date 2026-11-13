"use client";

import type { ReactNode } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { ChartTooltip } from "@/components/charts/chart-tooltip";

type Slice = { name: string; value: number; color: string };

/** Thick ring with rounded ends and gaps, plus a centre badge (design.md 4.4). */
export function DonutChart({
  data,
  center,
  unit = "%",
}: {
  data: Slice[];
  center?: ReactNode;
  unit?: string;
}) {
  return (
    <div className="relative h-full w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Tooltip content={<ChartTooltip unit={unit} />} />
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius="62%"
            outerRadius="96%"
            paddingAngle={4}
            cornerRadius={10}
            startAngle={90}
            endAngle={-270}
            stroke="none"
            animationDuration={600}
            animationEasing="ease-out"
          >
            {data.map((slice) => (
              <Cell key={slice.name} fill={slice.color} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      {center && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">{center}</div>
      )}
    </div>
  );
}
