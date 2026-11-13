import Link from "next/link";
import { ArrowUpRight, CalendarClock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { CalendarCourierBadge } from "@/components/ui/characters";
import { CountUp } from "@/components/ui/count-up";
import { cn } from "@/lib/cn";
import type { UpcomingRenewal } from "@/lib/data/types";

/**
 * "Upcoming Renewals" compact count card with clickable link to `/renewals` tab.
 * Replaces the heavy 3-column table with an instant count and direct navigation.
 */
export function UpcomingRenewals({
  index = 3,
  items,
  count,
  canViewRenewals = true,
}: {
  index?: number;
  items?: UpcomingRenewal[];
  count?: number;
  canViewPolicies?: boolean;
  canViewRenewals?: boolean;
}) {
  const total = count ?? items?.length ?? 0;

  return (
    <Card
      index={index}
      className="group relative flex flex-col justify-between transition-all duration-150 hover:border-divider"
    >
      <div>
        <div className="flex items-start justify-between gap-2 border-l-[3px] border-accent pl-3">
          <div className="min-w-0">
            <p className="text-[28px] font-bold leading-9 text-ink tabular-nums">
              <CountUp value={total} />
            </p>
            <h2 className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
              Upcoming Renewals
            </h2>
            <p className="mt-0.5 text-[11px] text-ink-faint">
              Due in next 60 days
            </p>
          </div>

          <div className="flex flex-col items-end gap-1.5 shrink-0">
            {canViewRenewals && (
              <Link
                href="/renewals"
                className="inline-flex items-center gap-0.5 rounded-[4px] px-1.5 py-0.5 text-[11px] font-semibold text-ink hover:text-accent-strong transition-colors"
                aria-label="View upcoming renewals"
              >
                <span>View</span>
                <ArrowUpRight size={13} strokeWidth={2} />
              </Link>
            )}
            <CalendarCourierBadge />
          </div>
        </div>

        {/* Quick status row */}
        <div className="mt-4 flex items-center justify-between gap-2 border-t border-divider/60 pt-3">
          <span className="text-[11px] font-medium text-ink-muted">
            {total > 0 ? `${total} policy on watch` : "All caught up"}
          </span>
          {canViewRenewals && (
            <Link
              href="/renewals"
              className="inline-flex items-center gap-1 text-xs font-semibold text-ink hover:text-accent-strong transition-colors"
            >
              <span>Renewals table</span>
              <ArrowUpRight size={13} strokeWidth={2} />
            </Link>
          )}
        </div>
      </div>
    </Card>
  );
}
