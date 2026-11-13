import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowUpRight, TrendingDown, TrendingUp, type LucideIcon } from "lucide-react";
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

/** Dashboard stat card: coloured left bar, bold number, UPPERCASE label, optional clickable link (design.md section 4). */
export function StatCard({
  title,
  icon: Icon,
  value,
  kind,
  prefix,
  trend,
  visual,
  index = 0,
  href,
  actionLabel = "View clients",
  subtitle = "Registered client accounts",
}: {
  title: string;
  icon: LucideIcon;
  value: number;
  kind?: "number" | "inr" | "percent";
  prefix?: string;
  trend?: { direction: "up" | "down"; value: string; label?: string };
  visual?: ReactNode;
  index?: number;
  href?: string;
  actionLabel?: string;
  subtitle?: string;
}) {
  return (
    <Card
      index={index}
      className={cn(
        "group relative flex flex-col justify-between transition-all duration-150 hover:border-divider",
      )}
    >
      <div>
        <div className="flex items-start justify-between gap-2 border-l-[3px] border-accent pl-3">
          <div className="min-w-0">
            <p className="text-[28px] font-bold leading-9 text-ink tabular-nums">
              <CountUp value={value} kind={kind} prefix={prefix} />
            </p>
            <h2 className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
              {title}
            </h2>
            <p className="mt-0.5 text-[11px] text-ink-faint">{subtitle}</p>
          </div>

          <div className="flex flex-col items-end gap-1.5 shrink-0">
            {href && (
              <Link
                href={href}
                className="inline-flex items-center gap-0.5 rounded-[4px] px-1.5 py-0.5 text-[11px] font-semibold text-ink hover:text-accent-strong transition-colors"
                aria-label={`View ${title}`}
              >
                <span>View</span>
                <ArrowUpRight size={13} strokeWidth={2} />
              </Link>
            )}
            {visual}
          </div>
        </div>

        {/* Quick status row */}
        <div className="mt-4 flex items-center justify-between gap-2 border-t border-divider/60 pt-3">
          <span className="text-[11px] font-medium text-ink-muted">
            {trend ? `${trend.value} ${trend.label}` : "Active CRM portfolio"}
          </span>
          {href && (
            <Link
              href={href}
              className="inline-flex items-center gap-1 text-xs font-semibold text-ink hover:text-accent-strong transition-colors"
            >
              <span>{actionLabel}</span>
              <ArrowUpRight size={13} strokeWidth={2} />
            </Link>
          )}
        </div>
      </div>
    </Card>
  );
}
