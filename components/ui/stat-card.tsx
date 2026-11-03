import type { ReactNode } from "react";
import { TrendingDown, TrendingUp, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import { Card } from "@/components/ui/card";
import { CountUp } from "@/components/ui/count-up";

function Trend({ direction, value, label }: { direction: "up" | "down"; value: string; label: string }) {
  const up = direction === "up";
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <p className="mt-1 flex items-center gap-1 text-[11px] font-medium leading-[14px] text-ink-muted">
      <span className={cn("inline-flex items-center gap-0.5", up ? "text-positive" : "text-negative")}>
        <Icon size={12} strokeWidth={1.75} aria-hidden="true" />
        {value}
      </span>
      {label}
    </p>
  );
}

/** Dashboard stat card: coloured left bar, bold number, UPPERCASE label (design.md section 4). */
export function StatCard({
  title,
  icon: Icon,
  value,
  kind,
  prefix,
  trend,
  visual,
  index = 0,
}: {
  title: string;
  icon: LucideIcon;
  value: number;
  kind?: "number" | "inr" | "percent";
  prefix?: string;
  trend?: { direction: "up" | "down"; value: string; label?: string };
  visual?: ReactNode;
  index?: number;
}) {
  return (
    <Card index={index}>
      <div
        className={cn(
          "flex items-start justify-between gap-3 border-l-[3px] pl-3",
          index % 2 === 0 ? "border-accent" : "border-ink-faint",
        )}
      >
        <div className="min-w-0">
          <p className="text-[28px] font-bold leading-9 text-ink">
            <CountUp value={value} kind={kind} prefix={prefix} />
          </p>
          <h2 className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-ink-muted">{title}</h2>
          {trend && <Trend direction={trend.direction} value={trend.value} label={trend.label ?? "this month"} />}
        </div>
        <div className="flex flex-col items-end gap-2">
          <Icon size={16} strokeWidth={1.75} className="mt-1 text-ink-faint" aria-hidden="true" />
          {visual}
        </div>
      </div>
    </Card>
  );
}
