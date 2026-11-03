import { PieChart, ShieldCheck } from "lucide-react";
import { DonutChart } from "@/components/charts/donut-chart";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import type { CategorySlice } from "@/lib/data/types";

/** "Policies by Category" donut with legend. Shows an empty state until data exists. */
export function CategoryCard({ index, slices }: { index?: number; slices: CategorySlice[] }) {
  return (
    <Card index={index} className="flex flex-col">
      <CardHeader title="Policies by Category" />

      {slices.length === 0 ? (
        <EmptyState label="No policies yet" icon={PieChart} className="flex-1" />
      ) : (
        <div className="grid flex-1 items-center gap-4 sm:grid-cols-2 xl:grid-cols-1">
          <div className="mx-auto h-48 w-48 xl:h-52 xl:w-52">
            <DonutChart
              data={slices}
              center={
                <span className="grid size-12 place-items-center rounded-full bg-white text-accent-ink shadow-card">
                  <ShieldCheck size={22} strokeWidth={1.75} aria-hidden="true" />
                </span>
              }
            />
          </div>

          <ul className="space-y-2.5">
            {slices.map((item) => (
              <li key={item.name} className="flex items-center gap-2 text-xs">
                <span className="size-2 rounded-full" style={{ backgroundColor: item.color }} aria-hidden="true" />
                <span className="text-ink-muted">{item.name}</span>
                <span className="ml-auto font-medium tabular-nums text-ink">{item.value}%</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
