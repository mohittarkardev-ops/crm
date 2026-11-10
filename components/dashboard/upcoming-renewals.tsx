import Link from "next/link";
import { ArrowUpRight, CalendarClock, Hash } from "lucide-react";
import { Card, CardHeader, Tile } from "@/components/ui/card";
import { CalendarCourierBadge, RelaxedEmptyCharacter } from "@/components/ui/characters";
import { EmptyState } from "@/components/ui/empty-state";
import { Chip, StatusChip } from "@/components/ui/chip";
import { buttonStyles } from "@/components/ui/button";
import { formatDate } from "@/lib/format";
import type { UpcomingRenewal } from "@/lib/data/types";

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

/** "Upcoming Renewals" list (design.md 4.9). */
export function UpcomingRenewals({
  index,
  items,
  canViewPolicies = true,
  canViewRenewals = true,
}: {
  index?: number;
  items: UpcomingRenewal[];
  canViewPolicies?: boolean;
  canViewRenewals?: boolean;
}) {
  if (items.length === 0) {
    return (
      <Card index={index}>
        <CardHeader title="Upcoming Renewals" />
        <EmptyState
          label="No upcoming renewals in the next 60 days"
          icon={CalendarClock}
          illustration={<RelaxedEmptyCharacter />}
        />
      </Card>
    );
  }

  return (
    <Card index={index}>
      <CardHeader
        title="Upcoming Renewals"
        action={
          <div className="flex items-center gap-2">
            <CalendarCourierBadge />
            {canViewRenewals && (
              <Link href="/renewals" className={buttonStyles("ghost", "h-8 px-3 text-xs")}>
                View all
                <ArrowUpRight size={14} strokeWidth={1.75} aria-hidden="true" />
              </Link>
            )}
          </div>
        }
      />

      <div className="grid gap-3 lg:grid-cols-3">
        {items.map((item) => (
          <Tile key={item.id} className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-surface-strong text-xs font-semibold text-ink">
                {initials(item.client)}
              </span>
              <div className="min-w-0">
                {canViewPolicies ? (
                  <Link href={`/policies/${item.id}`} className="block truncate text-sm font-semibold text-ink hover:underline">
                    {item.client}
                  </Link>
                ) : (
                  <p className="truncate text-sm font-semibold text-ink">{item.client}</p>
                )}
                <p className="truncate text-xs text-ink-muted">
                  {item.policy} · {item.insurer}
                </p>
              </div>
              <div className="ml-auto shrink-0">
                <StatusChip status={item.status} />
              </div>
            </div>

            <div className="space-y-1.5 text-xs text-ink-muted">
              <p className="flex items-center gap-2">
                <CalendarClock size={14} strokeWidth={1.75} aria-hidden="true" />
                Expires {formatDate(item.expiry)}
                <Chip className="ml-auto">{item.daysLeft} days left</Chip>
              </p>
              <p className="flex items-center gap-2">
                <Hash size={14} strokeWidth={1.75} aria-hidden="true" />
                <span className="tabular-nums">{item.policyNumber}</span>
              </p>
            </div>
          </Tile>
        ))}
      </div>
    </Card>
  );
}
