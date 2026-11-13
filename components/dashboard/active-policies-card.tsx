"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Bike, Car, HeartPulse, ShieldCheck, Briefcase } from "lucide-react";
import { Card } from "@/components/ui/card";
import { PolicyKeeperMini } from "@/components/ui/characters";
import { CountUp } from "@/components/ui/count-up";
import { cn } from "@/lib/cn";
import type { ActiveRenewedMetric, DashboardPolicyCategory } from "@/lib/data/types";

const CATEGORY_TABS: {
  key: DashboardPolicyCategory;
  label: string;
  shortLabel: string;
  icon: typeof Car;
}[] = [
  { key: "all", label: "All Categories", shortLabel: "All", icon: ShieldCheck },
  { key: "2w", label: "Two Wheeler (2W)", shortLabel: "2W", icon: Bike },
  { key: "4w", label: "4W Wheeler (4W)", shortLabel: "4W", icon: Car },
  { key: "health", label: "Health", shortLabel: "Health", icon: HeartPulse },
  { key: "term", label: "Term Life", shortLabel: "Term", icon: ShieldCheck },
  { key: "sme", label: "SME & Commercial", shortLabel: "SME", icon: Briefcase },
];

/**
 * "Active Policies" smart agency renewal card:
 * - Real-time count of active policies renewed by our agency based on current year or future due date (second due date).
 * - Active customers count (unique client base).
 * - Interactive category filters: Two Wheeler, 4W Wheeler, Health, Term, SME.
 * - Live category bifurcation breakdown pills.
 * - Clickable navigation into `/policies`.
 */
export function ActivePoliciesCard({
  index = 1,
  data,
  canViewPolicies = true,
}: {
  index?: number;
  data: ActiveRenewedMetric;
  canViewPolicies?: boolean;
}) {
  const [selectedCat, setSelectedCat] = useState<DashboardPolicyCategory>("all");

  const current = data.byCategory[selectedCat] ?? data.byCategory.all;
  const policyHref =
    selectedCat === "all"
      ? "/policies"
      : `/policies?category=${selectedCat}`;

  return (
    <Card
      index={index}
      className="group relative flex flex-col justify-between transition-all duration-150 hover:border-divider"
    >
      <div>
        {/* Top Header Row with Accent Bar and Direct Link */}
        <div className="flex items-start justify-between gap-2 border-l-[3px] border-accent pl-3">
          <div className="min-w-0">
            <div className="flex items-baseline gap-2">
              <p className="text-[28px] font-bold leading-9 text-ink tabular-nums">
                <CountUp value={current.policiesCount} />
              </p>
              <span className="text-xs font-semibold text-ink-muted tabular-nums">
                ({current.customersCount} {current.customersCount === 1 ? "client" : "clients"})
              </span>
            </div>
            <h2 className="mt-0.5 text-xs font-medium text-ink-muted">
              Active policies (agency renewed)
            </h2>
            <p className="mt-0.5 text-[11px] text-ink-faint">
              Renewed for current or future year
            </p>
          </div>

          <div className="flex flex-col items-end gap-1.5 shrink-0">
            {canViewPolicies && (
              <Link
                href={policyHref}
                className="inline-flex items-center gap-0.5 rounded-[4px] px-1.5 py-0.5 text-[11px] font-semibold text-ink hover:text-accent-strong transition-colors"
                aria-label="View active policies in policies table"
              >
                <span>View</span>
                <ArrowUpRight size={13} strokeWidth={2} />
              </Link>
            )}
            <PolicyKeeperMini />
          </div>
        </div>

        {/* Category Filter Chips: All, Two Wheeler (2W), 4W Wheeler, Health, Term, SME */}
        <div className="mt-3.5 flex flex-wrap items-center gap-1 border-t border-divider/60 pt-2.5">
          {CATEGORY_TABS.map((tab) => {
            const isSelected = selectedCat === tab.key;
            const count = data.byCategory[tab.key]?.policiesCount ?? 0;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setSelectedCat(tab.key)}
                className={cn(
                  "inline-flex items-center gap-1 rounded-control px-2 py-1 text-[11px] font-semibold transition-all duration-150",
                  isSelected
                    ? "bg-ink text-surface-strong shadow-xs"
                    : "bg-surface-muted/60 text-ink-muted hover:bg-surface-muted hover:text-ink",
                )}
                aria-pressed={isSelected}
              >
                <span>{tab.shortLabel}</span>
                <span
                  className={cn(
                    "text-[10px] tabular-nums font-bold px-1 py-0.2 rounded-full",
                    isSelected ? "bg-white/20 text-white" : "bg-ink-muted/15 text-ink-muted",
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Category Bifurcation Breakdown Pills */}
        <div className="mt-2.5 grid grid-cols-5 gap-1 rounded-tile border border-divider/50 bg-surface-muted/30 p-1.5 text-center">
          {[
            { label: "2W", count: data.byCategory["2w"].policiesCount },
            { label: "4W", count: data.byCategory["4w"].policiesCount },
            { label: "Health", count: data.byCategory.health.policiesCount },
            { label: "Term", count: data.byCategory.term.policiesCount },
            { label: "SME", count: data.byCategory.sme.policiesCount },
          ].map((item) => (
            <div key={item.label} className="min-w-0">
              <span className="block text-[10px] font-medium text-ink-muted truncate">
                {item.label}
              </span>
              <span className="block text-xs font-bold tabular-nums text-ink">
                {item.count}
              </span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
