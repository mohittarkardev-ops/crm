"use client";

import Link from "next/link";
import { ArrowUpRight, ClipboardCheck, ExternalLink } from "lucide-react";
import { Card } from "@/components/ui/card";
import { ClaimTrophyMini } from "@/components/ui/characters";
import { CountUp } from "@/components/ui/count-up";
import { cn } from "@/lib/cn";

/**
 * "Agency Claims Desk" clickable dashboard card:
 * - Real-time count of claims submitted by CSEs via `/claim` pending verification.
 * - One-click access to the internal review queue (`/claims`).
 * - Direct quick launcher for the public `/claim` agent portal.
 */
export function AgencyClaimsCard({
  index = 4,
  pendingCount = 0,
  canViewClaims = true,
}: {
  index?: number;
  pendingCount?: number;
  canViewClaims?: boolean;
}) {
  return (
    <Card
      index={index}
      className="group relative flex flex-col justify-between transition-all duration-150 hover:border-divider"
    >
      <div>
        <div className="flex items-start justify-between gap-2 border-l-[3px] border-accent pl-3">
          <div className="min-w-0">
            <div className="flex items-baseline gap-2">
              <p className="text-[28px] font-bold leading-9 text-ink tabular-nums">
                <CountUp value={pendingCount} />
              </p>
              {pendingCount > 0 ? (
                <span className="inline-flex items-center rounded-full bg-warning-soft px-1.5 py-0.5 text-[10px] font-bold text-warning-strong">
                  Review waiting
                </span>
              ) : (
                <span className="inline-flex items-center rounded-full bg-positive-soft px-1.5 py-0.5 text-[10px] font-bold text-positive">
                  All caught up
                </span>
              )}
            </div>
            <h2 className="mt-0.5 text-xs font-medium text-ink-muted">
              Agency claims desk
            </h2>
            <p className="mt-0.5 text-[11px] text-ink-faint">
              CSE submissions via /claim portal
            </p>
          </div>

          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <ClipboardCheck
              size={16}
              strokeWidth={1.75}
              className="mt-1 text-ink-faint group-hover:text-ink transition-colors"
              aria-hidden="true"
            />
            <ClaimTrophyMini />
          </div>
        </div>

        {/* Quick action shortcuts */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-divider/60 pt-3">
          <Link
            href={canViewClaims ? "/claims" : "#"}
            className={cn(
              "inline-flex items-center gap-1 text-xs font-semibold text-ink hover:text-accent-strong transition-colors",
              !canViewClaims && "cursor-default opacity-60",
            )}
            aria-label="Open claims review queue"
          >
            <span>Review queue</span>
            <ArrowUpRight size={13} strokeWidth={2} />
          </Link>

          <Link
            href="/claim"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-control bg-surface-muted/60 px-2 py-0.5 text-[11px] font-semibold text-ink-muted hover:bg-surface-muted hover:text-ink transition-colors"
            aria-label="Open public claim portal in new tab"
          >
            <span>Launch portal</span>
            <ExternalLink size={11} strokeWidth={2} />
          </Link>
        </div>
      </div>
    </Card>
  );
}
