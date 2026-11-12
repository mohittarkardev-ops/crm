"use client";

import { useState } from "react";
import {
  Award,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  Target,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { buttonStyles } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import {
  AgentMilestoneCharacter,
  LedgerAuditorCharacter,
  SettlementBankerCharacter,
} from "@/components/ui/incentive-characters";
import { Chip } from "@/components/ui/chip";
import { CountUp } from "@/components/ui/count-up";
import { EmptyState } from "@/components/ui/empty-state";
import { MiniStat, StatRow } from "@/components/ui/mini-stat";
import { Segmented } from "@/components/ui/segmented";
import { AnimatedProgressBar } from "@/components/modules/incentives/animated-progress-bar";
import { cn } from "@/lib/cn";
import type { IncentivesDashboardPayload } from "@/lib/data/incentives";
import { formatDate, formatINR } from "@/lib/format";
import { SETTLEMENT_STATUS_LABELS, formatMonthTitle, shiftMonthIso, type SettlementStatus } from "@/lib/incentives";
import { chipFor } from "@/lib/status";

type AgentTab = "daily" | "payouts";

export function AgentMyIncentivesView({ data }: { data: IncentivesDashboardPayload }) {
  const [subTab, setSubTab] = useState<AgentTab>("daily");

  const currentMonthIso = data.todayIso.slice(0, 7);
  const prevMonthIso = shiftMonthIso(data.monthIso, -1);
  const nextMonthIso = shiftMonthIso(data.monthIso, 1);
  const canGoNext = data.monthIso < currentMonthIso;

  const me = data.monthlyAgents[0] ?? null;
  const activeAssign =
    data.assignments.find(
      (a) => a.status === "active" && a.effectiveFrom <= data.todayIso && (!a.effectiveUntil || a.effectiveUntil >= data.todayIso),
    ) ??
    data.assignments[0] ??
    null;

  const mySettlement = data.settlements[0] ?? null;

  const fmtInr = (val: number) => `₹${Math.round(val).toLocaleString("en-IN")}`;
  const stretchTiers =
    me && me.stretchMilestones && me.stretchMilestones.length > 0
      ? me.stretchMilestones
      : me && me.stretchTarget && me.stretchTarget > 0
        ? [{ minClaims: me.stretchTarget, rewardAmount: me.stretchSpecialRate }]
        : [];
  const nextStretchTier = me
    ? (stretchTiers.find((t) => me.eligibleClaimsCount < t.minClaims) ?? null)
    : null;
  const matchedStretchTier = me
    ? ([...stretchTiers].reverse().find((t) => me.eligibleClaimsCount >= t.minClaims) ?? null)
    : null;
  const highestStretchTarget = stretchTiers[stretchTiers.length - 1]?.minClaims ?? 0;
  const stretchGoalTargetForBar = nextStretchTier?.minClaims ?? highestStretchTarget;
  const stretchPct =
    me && stretchGoalTargetForBar > 0
      ? Math.min(100, Math.round((me.eligibleClaimsCount / stretchGoalTargetForBar) * 100))
      : 0;

  return (
    <div className="space-y-4">
      {/* Top Assignment & Month Switcher Banner */}
      <Card index={0} className="p-4 sm:px-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="hidden shrink-0 sm:block">
              <AgentMilestoneCharacter
                progressPct={me?.progressPct ?? 0}
                targetAchieved={Boolean(me?.targetAchieved)}
              />
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-[15px] font-semibold text-ink">
                  My Incentives — {formatMonthTitle(data.monthIso)}
                </h2>
                {activeAssign ? (
                  <Chip tone="accent">
                    {activeAssign.vehicleCategory} · {activeAssign.assignedState}
                  </Chip>
                ) : (
                  <Chip tone="neutral">No Active Assignment</Chip>
                )}
              </div>
              <p className="text-xs text-ink-muted">
                {activeAssign
                  ? `Active from ${formatDate(activeAssign.effectiveFrom)}. Only approved claims matching both ${activeAssign.vehicleCategory} and ${activeAssign.assignedState} count toward your target.`
                  : "Contact your admin to configure your vehicle category and state assignment."}
              </p>
            </div>
          </div>

          <div className="inline-flex h-10 items-center rounded-control border border-divider bg-surface-strong px-1">
            <Link href={`/incentives?month=${prevMonthIso}`} aria-label="Previous month" className={buttonStyles("icon", "size-8")}>
              <ChevronLeft size={16} />
            </Link>
            <span className="min-w-[126px] px-2 text-center text-xs font-semibold text-ink tabular-nums">
              {formatMonthTitle(data.monthIso)}
            </span>
            {canGoNext ? (
              <Link href={`/incentives?month=${nextMonthIso}`} aria-label="Next month" className={buttonStyles("icon", "size-8")}>
                <ChevronRight size={16} />
              </Link>
            ) : (
              <span aria-disabled="true" className="grid size-8 place-items-center text-ink-faint opacity-45">
                <ChevronRight size={16} />
              </span>
            )}
          </div>
        </div>
      </Card>

      {/* Personal 4 KPIs (PDF p. 12: Monthly Target, Eligible Claims, Remaining Target, Provisional Earnings) */}
      <StatRow>
        <MiniStat index={1} title="Eligible Claims" icon={CheckCircle2} value={me?.eligibleClaimsCount ?? 0} />
        <MiniStat index={2} title="Monthly Target" icon={Target} value={me?.effectiveTarget ?? 0} />
        <MiniStat index={3} title="Remaining Target" icon={Clock} value={me?.remainingTarget ?? 0} />
        <MiniStat
          index={4}
          title={mySettlement && mySettlement.status !== "forfeited" && mySettlement.finalizedPayable > 0 ? "Payable Incentive" : "Provisional Earnings"}
          icon={Wallet}
          value={me?.provisionalEarnings ?? 0}
          kind="inr"
        />
      </StatRow>

      {/* Target Qualification Progress Card */}
      {me && (
        <Card index={5} className="p-4 space-y-3">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs mb-2">
              <span className="font-semibold text-ink">
                Monthly Target Progress: {me.progressPct}% ({me.eligibleClaimsCount} / {me.effectiveTarget})
              </span>
              <Chip tone={me.targetAchieved ? "positive" : "warning"}>
                {me.targetAchieved
                  ? "Target Achieved — Eligible"
                  : `${me.remainingTarget} more claims needed`}
              </Chip>
            </div>
            <AnimatedProgressBar pct={me.progressPct} positive={me.targetAchieved} />
            {me.nonQualifyingClaimsCount > 0 && (
              <p className="mt-2 text-[11px] text-ink-muted">
                Note: You also processed <b>{me.nonQualifyingClaimsCount}</b> claim(s) outside your assigned vehicle/state or still pending review.
              </p>
            )}
          </div>

          {/* Earnings Composition Breakdown */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-hairline text-xs">
            <div className="rounded-lg bg-surface-2 px-3 py-2">
              <div className="text-[11px] text-ink-muted">Daily Earnings</div>
              <div className="font-semibold text-ink tabular-nums mt-0.5">{fmtInr(me.dailyProvisionalEarnings)}</div>
            </div>
            <div className="rounded-lg bg-surface-2 px-3 py-2">
              <div className="text-[11px] text-ink-muted">Monthly Bonus</div>
              <div className="font-semibold text-ink tabular-nums mt-0.5">{fmtInr(me.monthlyMilestoneBonus)}</div>
            </div>
            <div className="rounded-lg bg-surface-2 px-3 py-2">
              <div className="text-[11px] text-ink-muted">Special Rate Bonus</div>
              <div className="font-semibold text-ink tabular-nums mt-0.5">{fmtInr(me.stretchBonusAmount)}</div>
            </div>
            <div className="rounded-lg bg-accent-soft px-3 py-2">
              <div className="text-[11px] text-accent-text">Total Estimated</div>
              <div className="font-bold text-accent-text tabular-nums mt-0.5">{fmtInr(me.provisionalEarnings)}</div>
            </div>
          </div>

          {/* Monthly Milestone Step Ladder */}
          {me.activeMonthlyMilestones.length > 0 && (
            <div className="pt-2 border-t border-hairline">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs mb-2">
                <span className="font-semibold text-ink">Monthly Bonus Milestones</span>
                {me.nextMonthlyMilestone ? (
                  <span className="text-[11px] text-ink-muted">
                    <b>{Math.max(0, me.nextMonthlyMilestone.minClaims - me.eligibleClaimsCount)}</b> more claim(s) for{" "}
                    <b>{fmtInr(me.nextMonthlyMilestone.rewardAmount)}</b> at {me.nextMonthlyMilestone.minClaims} claims
                  </span>
                ) : (
                  <Chip tone="positive">Top Milestone Reached</Chip>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {me.activeMonthlyMilestones.map((tier) => {
                  const hit = me.eligibleClaimsCount >= tier.minClaims;
                  return (
                    <span
                      key={`${tier.minClaims}-${tier.rewardAmount}`}
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] tabular-nums border ${
                        hit
                          ? "bg-positive-soft text-positive border-positive/30 font-semibold"
                          : "bg-surface-2 text-ink-muted border-hairline"
                      }`}
                    >
                      <span>{tier.minClaims} claims</span>
                      <span>→</span>
                      <span>{fmtInr(tier.rewardAmount)}</span>
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Personal Special Milestones Card */}
      {me && stretchTiers.length > 0 && (
        <Card index={6} className="p-4 border-accent/30 bg-accent-soft/30 space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <span className="text-sm font-semibold text-ink">
                {me.stretchLabel?.trim() || "Your Personal Special Milestones"}
              </span>
              <p className="text-xs text-ink-muted mt-1">
                {me.stretchRateMode === "lump_sum_bonus" ? (
                  <>
                    Common base target is <b>{me.effectiveTarget} claims</b>. Reach any milestone step below to
                    unlock its extra bonus (holds flat between steps):
                  </>
                ) : me.stretchRateMode === "replace_from_base" ? (
                  <>
                    Claims <b>1–{me.effectiveTarget}</b> earn your normal daily rate. Reaching a step below
                    unlocks that special rate on claims from <b>{me.effectiveTarget + 1} onward</b>:
                  </>
                ) : me.stretchRateMode === "extra_per_claim_from_base" ? (
                  <>
                    Reaching a step below adds an extra per-claim reward on claims from{" "}
                    <b>{me.effectiveTarget + 1} onward</b>:
                  </>
                ) : (
                  <>Reaching a step below applies its special rate across all claims in the month:</>
                )}
              </p>
            </div>
            <Chip tone={me.stretchAchieved ? "positive" : "warning"}>
              {me.stretchAchieved && nextStretchTier
                ? `Unlocked (+${fmtInr(me.stretchBonusAmount)}) · ${me.stretchClaimsRemaining} more to ${nextStretchTier.minClaims}`
                : me.stretchAchieved
                  ? `Top Step Unlocked (+${fmtInr(me.stretchBonusAmount)})`
                  : `${me.stretchClaimsRemaining} more claims to ${nextStretchTier?.minClaims ?? stretchTiers[0].minClaims}`}
            </Chip>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {stretchTiers.map((tier) => {
              const hit = me.eligibleClaimsCount >= tier.minClaims;
              const isMatched = matchedStretchTier?.minClaims === tier.minClaims;
              return (
                <span
                  key={tier.minClaims}
                  className={cn(
                    "inline-flex items-center px-2.5 py-1 rounded-md border text-[11.5px] tabular-nums",
                    isMatched
                      ? "border-positive/60 bg-positive-soft text-positive font-semibold"
                      : hit
                        ? "border-positive/30 bg-positive-soft/50 text-ink"
                        : "border-divider bg-surface-strong text-ink-muted",
                  )}
                >
                  {tier.minClaims} claims →{" "}
                  {me.stretchRateMode === "lump_sum_bonus"
                    ? `+${fmtInr(tier.rewardAmount)}`
                    : `${fmtInr(tier.rewardAmount)}/claim`}
                  {hit ? " ✓" : ""}
                </span>
              );
            })}
          </div>

          <div>
            <div className="flex items-center justify-between text-[11px] text-ink-muted mb-1.5 tabular-nums">
              <span>
                Progress to {nextStretchTier ? "next step" : "top step"}: <b>{me.eligibleClaimsCount}</b> /{" "}
                <b>{stretchGoalTargetForBar}</b> claims ({stretchPct}%)
              </span>
              <span>
                Base target: <b>{me.effectiveTarget}</b>
              </span>
            </div>
            <AnimatedProgressBar pct={stretchPct} positive={me.stretchAchieved} />
          </div>
        </Card>
      )}

      {/* Segmented Switcher: Daily Earnings vs Settlement & Payouts (No claim button!) */}
      <Segmented<AgentTab>
        label="My incentive details"
        value={subTab}
        onChange={setSubTab}
        options={[
          { value: "daily", label: "Daily Earnings & Claim Breakdown" },
          { value: "payouts", label: "Finalized Settlements & Payout History" },
        ]}
      />

      {subTab === "daily" && (
        <div key="agent-daily" className="fade-up space-y-4">
          <Card index={6}>
            <CardHeader title={`Daily Earnings Summary (${data.dailyPerformance.length} days)`} />
            {data.dailyPerformance.length === 0 ? (
              <EmptyState label="No daily performance entries yet" className="py-6" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-divider text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
                      <th className="pb-2 pr-4">Date</th>
                      <th className="pb-2 pr-4 text-right">Eligible Claims</th>
                      <th className="pb-2 pr-4">Slab Calculation</th>
                      <th className="pb-2 text-right">Provisional ₹</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-divider/60">
                    {data.dailyPerformance.map((d) => (
                      <tr key={d.id} className="h-11 transition-colors hover:bg-accent-soft/30">
                        <td className="py-2 pr-4 font-semibold text-ink tabular-nums">{formatDate(d.perfDate)}</td>
                        <td className="py-2 pr-4 text-right tabular-nums text-ink">{d.eligibleClaims}</td>
                        <td className="py-2 pr-4 text-ink-muted">{d.slabSummary ?? "—"}</td>
                        <td className="py-2 text-right font-bold text-ink tabular-nums">
                          {formatINR(d.provisionalAmount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card index={7}>
            <CardHeader title={`Claim-by-Claim Breakdown (${data.ledger.length})`} />
            {data.ledger.length === 0 ? (
              <EmptyState
                illustration={<LedgerAuditorCharacter />}
                label="No evaluated claims yet"
                hint="Eligible claims matching your assigned vehicle category and state will appear here."
                className="py-6"
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-divider text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
                      <th className="pb-2 pr-3">Claim / Vehicle</th>
                      <th className="pb-2 pr-3">Date</th>
                      <th className="pb-2 pr-3">State</th>
                      <th className="pb-2 pr-3">Slab / Seq</th>
                      <th className="pb-2 pr-3 text-right">Earning</th>
                      <th className="pb-2">Status &amp; Explanation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-divider/60">
                    {data.ledger.map((l) => {
                      const chip = chipFor(l.earningStatus);
                      return (
                        <tr key={l.id} className="h-12 transition-colors hover:bg-accent-soft/30">
                          <td className="py-2 pr-3">
                            <p className="font-bold text-ink">{l.vehicleRegNo}</p>
                            <p className="text-[11px] text-ink-faint">{l.claimRef}</p>
                          </td>
                          <td className="py-2 pr-3 text-ink-muted tabular-nums">{formatDate(l.submissionDate)}</td>
                          <td className="py-2 pr-3 text-ink-muted">{l.resolvedState ?? "Unresolved"}</td>
                          <td className="py-2 pr-3 text-ink-muted tabular-nums">
                            {l.dailySequenceNo > 0 ? `#${l.dailySequenceNo} · ${l.slabLabel}` : "—"}
                          </td>
                          <td className="py-2 pr-3 text-right font-bold text-ink tabular-nums">
                            {formatINR(l.calculatedAmount)}
                          </td>
                          <td className="py-2">
                            <Chip tone={chip.tone}>{chip.label}</Chip>
                            {l.resolutionNote && l.earningStatus !== "provisional" && l.earningStatus !== "qualified" && (
                              <span className="block text-[11px] text-ink-faint mt-0.5">{l.resolutionNote}</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {subTab === "payouts" && (
        <div key="agent-payouts" className="fade-up space-y-4">
          <Card index={0}>
            <CardHeader title="Finalized Monthly Settlement" action={<Award size={16} className="text-ink-muted" />} />
            {!mySettlement ? (
              <EmptyState
                illustration={<SettlementBankerCharacter state="open" />}
                label="No finalized settlement for this month yet"
                hint="Settlement summaries are published after Admin month-end review."
                className="py-6"
              />
            ) : (
              <div className="grid gap-3 sm:grid-cols-4 text-xs">
                <div className="rounded-tile border border-divider bg-surface-muted/35 p-3">
                  <span className="text-[10px] uppercase text-ink-muted block">Settlement Status</span>
                  <div className="mt-1">
                    <Chip tone={chipFor(mySettlement.status).tone}>
                      {SETTLEMENT_STATUS_LABELS[mySettlement.status as SettlementStatus] ?? mySettlement.status}
                    </Chip>
                  </div>
                </div>
                <div className="rounded-tile border border-divider bg-surface-muted/35 p-3">
                  <span className="text-[10px] uppercase text-ink-muted block">Finalized Payable</span>
                  <b className="mt-1 block text-base text-ink tabular-nums">
                    <CountUp value={mySettlement.finalizedPayable} kind="inr" />
                  </b>
                </div>
                <div className="rounded-tile border border-divider bg-surface-muted/35 p-3">
                  <span className="text-[10px] uppercase text-ink-muted block">Paid to Date</span>
                  <b className="mt-1 block text-base text-positive tabular-nums">
                    <CountUp value={mySettlement.paidAmount} kind="inr" />
                  </b>
                </div>
                <div className="rounded-tile border border-divider bg-surface-muted/35 p-3">
                  <span className="text-[10px] uppercase text-ink-muted block">Outstanding Balance</span>
                  <b className="mt-1 block text-base text-ink tabular-nums">
                    <CountUp value={mySettlement.outstandingAmount} kind="inr" />
                  </b>
                </div>
              </div>
            )}
          </Card>

          <Card index={1}>
            <CardHeader title={`Your Payout Receipts (${data.payouts.length})`} />
            {data.payouts.length === 0 ? (
              <EmptyState label="No payout receipts recorded yet" className="py-6" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-divider text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
                      <th className="pb-2 pr-4">Date</th>
                      <th className="pb-2 pr-4">Mode</th>
                      <th className="pb-2 pr-4">Reference</th>
                      <th className="pb-2 pr-4 text-right">Amount</th>
                      <th className="pb-2 text-right">Receipt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-divider/60">
                    {data.payouts.map((p) => (
                      <tr key={p.id} className="h-11">
                        <td className="py-2 pr-4 tabular-nums text-ink">{formatDate(p.payoutDate)}</td>
                        <td className="py-2 pr-4"><Chip tone="neutral">{p.paymentMode}</Chip></td>
                        <td className="py-2 pr-4 font-medium text-ink select-text">{p.transactionRef}</td>
                        <td className="py-2 pr-4 text-right font-bold text-positive tabular-nums">
                          {formatINR(p.paidAmount)}
                        </td>
                        <td className="py-2 text-right">
                          {p.proofPath ? (
                            <a
                              href={`/incentives/payouts/${p.id}/proof`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-xs font-medium text-ink underline"
                            >
                              Receipt <ExternalLink size={12} />
                            </a>
                          ) : (
                            <span className="text-ink-faint">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
