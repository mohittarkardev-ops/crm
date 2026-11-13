"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Award,
  Calculator,
  CalendarCheck,
  CheckCircle2,
  ChevronRight,
  Clock,
  ExternalLink,
  Info,
  Layers,
  MessageSquareText,
  Search,
  Sparkles,
  Target,
  Wallet,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import {
  AgentMilestoneCharacter,
  LedgerAuditorCharacter,
  SettlementBankerCharacter,
  SpecialStretchMascotCharacter,
} from "@/components/ui/incentive-characters";
import { Chip } from "@/components/ui/chip";
import { CountUp } from "@/components/ui/count-up";
import { EmptyState } from "@/components/ui/empty-state";
import { CONTROL } from "@/components/ui/field";
import { MiniStat, StatRow } from "@/components/ui/mini-stat";
import { Segmented } from "@/components/ui/segmented";
import {
  AgentPeriodPicker,
  type DayActivityMeta,
} from "@/components/modules/incentives/agent-period-picker";
import { AnimatedProgressBar } from "@/components/modules/incentives/animated-progress-bar";
import { cn } from "@/lib/cn";
import type {
  AdjustmentView,
  IncentivesDashboardPayload,
  LedgerEntryView,
} from "@/lib/data/incentives";
import { MONTHS_SHORT, parseISO } from "@/lib/dates";
import { formatDate, formatINR } from "@/lib/format";
import { SETTLEMENT_STATUS_LABELS, formatMonthTitle, type SettlementStatus } from "@/lib/incentives";
import { chipFor } from "@/lib/status";

type AgentTab = "daily" | "adjustments" | "payouts";
type ClaimFilter = "all" | "earning" | "pending_held" | "ineligible";

const CLAIMS_PER_PAGE = 10;
const WEEKDAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const ADJUSTMENT_LABELS: Record<string, string> = {
  earning_override: "Payout Adjustment",
  post_finalization_correction: "Post-Finalization Correction",
  target_override: "Monthly Target Override",
  stretch_config: "Special Target Update",
  exception_resolution: "Exception Resolution",
};

function fmtSignedInr(val: number): string {
  const abs = Math.abs(Math.round(val)).toLocaleString("en-IN");
  return val >= 0 ? `+₹${abs}` : `-₹${abs}`;
}

function fmtInr(val: number): string {
  return `₹${Math.round(val).toLocaleString("en-IN")}`;
}

/** Safely format either YYYY-MM-DD or full ISO timestamps from DB created_at columns. */
function formatSafeDate(value: string | null | undefined): string {
  if (!value) return "—";
  const trimmed = value.trim();
  const datePart = trimmed.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
    return formatDate(datePart);
  }
  const d = new Date(trimmed);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function getWeekdayShort(iso: string): string {
  const parsed = parseISO(iso);
  if (!parsed) return "";
  const idx = new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d)).getUTCDay();
  return WEEKDAY_NAMES[idx] ?? "";
}

function classifyLedgerRow(l: LedgerEntryView): Exclude<ClaimFilter, "all"> {
  if (l.eligibilityStatus === "eligible" && (l.earningStatus === "provisional" || l.earningStatus === "qualified")) {
    return "earning";
  }
  if (l.eligibilityStatus === "held_review" || l.claimStatus === "pending" || l.earningStatus === "pending_hold") {
    return "pending_held";
  }
  return "ineligible";
}

function AdjustmentSummaryBanner({
  adjustments,
  provisionalEarnings,
  adjustmentsTotal,
  onViewDetails,
}: {
  adjustments: AdjustmentView[];
  provisionalEarnings: number;
  adjustmentsTotal: number;
  onViewDetails: () => void;
}) {
  const moneyAdj = adjustments.find((a) => a.deltaAmount !== 0) ?? null;
  const hasMoneyImpact = adjustmentsTotal !== 0;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-2 rounded-tile border px-3.5 py-2.5 text-xs",
        adjustmentsTotal < 0
          ? "border-negative/30 bg-negative-soft/35"
          : adjustmentsTotal > 0
            ? "border-positive/30 bg-positive-soft/35"
            : "border-divider bg-surface-strong",
      )}
    >
      <div className="flex flex-wrap items-center gap-2 text-ink">
        {hasMoneyImpact ? (
          <Calculator size={14} className="shrink-0 text-ink-muted" />
        ) : (
          <Info size={14} className="shrink-0 text-ink-muted" />
        )}
        {hasMoneyImpact ? (
          <span className="tabular-nums">
            <b className={adjustmentsTotal < 0 ? "text-negative" : "text-positive"}>
              Net Adjustment {fmtSignedInr(adjustmentsTotal)}
            </b>{" "}
            <span className="text-ink-muted">
              ({fmtInr(provisionalEarnings)} {fmtSignedInr(adjustmentsTotal)} ={" "}
              <b className="text-ink">{fmtInr(Math.max(0, provisionalEarnings + adjustmentsTotal))}</b>)
            </span>
            {moneyAdj?.reason && (
              <span className="text-ink-muted">
                {" · "}Reason: <span className="text-ink font-medium">{moneyAdj.reason}</span>
              </span>
            )}
          </span>
        ) : (
          <span className="text-ink-muted">
            <b className="text-ink">{adjustments.length}</b> admin update
            {adjustments.length === 1 ? "" : "s"} logged for this period
            {adjustments[0]?.reason ? ` · "${adjustments[0].reason}"` : ""}
          </span>
        )}
      </div>

      <button
        type="button"
        onClick={onViewDetails}
        className="inline-flex items-center gap-1 font-semibold text-ink hover:underline shrink-0"
      >
        <span>View calculation &amp; reasons</span>
        <ChevronRight size={13} />
      </button>
    </div>
  );
}

function AdjustmentDetailsTab({
  adjustments,
  targetAdjustmentReason,
  baseTarget,
  effectiveTarget,
  provisionalEarnings,
  adjustmentsTotal,
}: {
  adjustments: AdjustmentView[];
  targetAdjustmentReason: string | null;
  baseTarget: number;
  effectiveTarget: number;
  provisionalEarnings: number;
  adjustmentsTotal: number;
}) {
  return (
    <div key="agent-adjustments" className="fade-up space-y-4">
      <Card index={0} className="space-y-4">
        <CardHeader
          title={`Admin Adjustments & Calculation History (${adjustments.length})`}
          action={
            adjustmentsTotal !== 0 ? (
              <Chip tone={adjustmentsTotal > 0 ? "positive" : "negative"}>
                Net Impact: {fmtSignedInr(adjustmentsTotal)}
              </Chip>
            ) : (
              <Chip tone="neutral">Rule &amp; Target Log</Chip>
            )
          }
        />

        {/* Single Clean Formula Bar */}
        <div className="grid gap-2 sm:grid-cols-3 rounded-tile border border-divider bg-surface-muted/40 p-3 text-xs tabular-nums">
          <div>
            <span className="text-[11px] text-ink-muted block">Calculated Before Adjustments</span>
            <b className="text-sm text-ink">{fmtInr(provisionalEarnings)}</b>
          </div>
          <div>
            <span className="text-[11px] text-ink-muted block">Admin Net Adjustment</span>
            <b
              className={cn(
                "text-sm",
                adjustmentsTotal > 0 ? "text-positive" : adjustmentsTotal < 0 ? "text-negative" : "text-ink",
              )}
            >
              {fmtSignedInr(adjustmentsTotal)}
            </b>
          </div>
          <div>
            <span className="text-[11px] text-ink-muted block">Adjusted Estimated Payable</span>
            <b className="text-sm text-ink">{fmtInr(Math.max(0, provisionalEarnings + adjustmentsTotal))}</b>
          </div>
        </div>

        {adjustments.length === 0 && targetAdjustmentReason && (
          <div className="rounded-tile border border-divider p-3.5 text-xs space-y-1">
            <div className="flex items-center justify-between gap-2">
              <Chip tone="accent">Monthly Target Override</Chip>
              <span className="font-semibold text-ink tabular-nums">
                {baseTarget} → {effectiveTarget} claims
              </span>
            </div>
            <p className="text-ink-muted pt-1">
              <b className="text-ink">Reason:</b> {targetAdjustmentReason}
            </p>
          </div>
        )}

        {adjustments.length > 0 && (
          <div className="divide-y divide-divider rounded-tile border border-divider bg-surface-strong overflow-hidden">
            {adjustments.map((adj) => {
              const label = ADJUSTMENT_LABELS[adj.adjustmentType] ?? adj.adjustmentType.replace(/_/g, " ");
              const hasMoneyDelta = adj.deltaAmount !== 0;
              const deltaTone = adj.deltaAmount > 0 ? "positive" : adj.deltaAmount < 0 ? "negative" : "neutral";

              return (
                <div
                  key={adj.id}
                  className="flex flex-col gap-2.5 p-3.5 sm:flex-row sm:items-center sm:justify-between text-xs"
                >
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Chip tone={hasMoneyDelta ? deltaTone : "accent"}>{label}</Chip>
                      <span className="text-[11px] text-ink-faint tabular-nums">
                        {formatSafeDate(adj.createdAt)} · by {adj.adminName}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 text-[11.5px] text-ink-muted tabular-nums">
                      <span>Before: <b className="text-ink">{adj.originalValue}</b></span>
                      <ArrowRight size={12} className="text-ink-faint shrink-0" />
                      <span>After: <b className="text-ink">{adj.updatedValue}</b></span>
                    </div>

                    <div className="flex items-start gap-1.5 text-xs text-ink-muted">
                      <MessageSquareText size={13} className="mt-0.5 shrink-0 text-ink-faint" />
                      <span>
                        <b className="text-ink">Why:</b> {adj.reason}
                      </span>
                    </div>
                  </div>

                  <div className="shrink-0 sm:text-right">
                    {hasMoneyDelta ? (
                      <>
                        <span
                          className={cn(
                            "inline-block rounded-full px-2.5 py-0.5 text-xs font-bold tabular-nums",
                            adj.deltaAmount > 0
                              ? "bg-positive-soft text-positive"
                              : "bg-negative-soft text-negative",
                          )}
                        >
                          {fmtSignedInr(adj.deltaAmount)}
                        </span>
                        <span className="block text-[10.5px] text-ink-faint mt-0.5">
                          {adj.deltaAmount > 0 ? "Added to payable" : "Deducted from payable"}
                        </span>
                      </>
                    ) : (
                      <Chip tone="neutral">Rule Update</Chip>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

export function AgentMyIncentivesView({
  data,
  initialSelectedDay = null,
}: {
  data: IncentivesDashboardPayload;
  initialSelectedDay?: string | null;
}) {
  const router = useRouter();
  const [subTab, setSubTab] = useState<AgentTab>("daily");
  const [selectedDay, setSelectedDay] = useState<string | null>(
    initialSelectedDay && initialSelectedDay.slice(0, 7) === data.monthIso ? initialSelectedDay : null,
  );
  const [claimQuery, setClaimQuery] = useState("");
  const [claimFilter, setClaimFilter] = useState<ClaimFilter>("all");
  const [claimPage, setClaimPage] = useState(1);

  useEffect(() => {
    setSelectedDay(
      initialSelectedDay && initialSelectedDay.slice(0, 7) === data.monthIso ? initialSelectedDay : null,
    );
    setClaimPage(1);
  }, [initialSelectedDay, data.monthIso]);

  const me = data.monthlyAgents[0] ?? null;
  const activeAssign =
    data.assignments.find(
      (a) =>
        a.status === "active" &&
        a.effectiveFrom <= data.todayIso &&
        (!a.effectiveUntil || a.effectiveUntil >= data.todayIso),
    ) ??
    data.assignments[0] ??
    null;

  const activeRule = useMemo(() => {
    if (!activeAssign) return null;
    return (
      data.rules.find(
        (r) =>
          r.isActive &&
          r.scope === "exact_state" &&
          r.vehicleCategory === activeAssign.vehicleCategory &&
          r.stateName === activeAssign.assignedState,
      ) ??
      data.rules.find(
        (r) => r.isActive && r.scope === "category_default" && r.vehicleCategory === activeAssign.vehicleCategory,
      ) ??
      data.rules.find((r) => r.isActive && r.scope === "global_fallback") ??
      null
    );
  }, [data.rules, activeAssign]);

  const mySettlement = data.settlements[0] ?? null;

  const dailyByDate = useMemo(() => {
    const map = new Map<string, DayActivityMeta>();
    for (const d of data.dailyPerformance) {
      map.set(d.perfDate, {
        eligibleClaims: d.eligibleClaims,
        totalClaims: d.totalClaims,
        provisionalAmount: d.provisionalAmount,
        isWorkingDay: d.isWorkingDay,
        holidayLabel: d.holidayLabel,
      });
    }
    return map;
  }, [data.dailyPerformance]);

  const syncDayToUrl = (dayIso: string | null) => {
    if (typeof window === "undefined") return;
    const url = dayIso ? `/incentives?month=${data.monthIso}&day=${dayIso}` : `/incentives?month=${data.monthIso}`;
    window.history.replaceState(null, "", url);
  };

  const handleSelectMonth = (targetMonthIso: string) => {
    setSelectedDay(null);
    setClaimPage(1);
    router.push(`/incentives?month=${targetMonthIso}`);
  };

  const handleSelectDay = (dayIso: string) => {
    const targetMonth = dayIso.slice(0, 7);
    setSubTab("daily");
    setClaimPage(1);
    if (targetMonth === data.monthIso) {
      setSelectedDay(dayIso);
      syncDayToUrl(dayIso);
    } else {
      router.push(`/incentives?month=${targetMonth}&day=${dayIso}`);
    }
  };

  const handleClearDay = () => {
    setSelectedDay(null);
    setClaimPage(1);
    syncDayToUrl(null);
  };

  // Stretch milestones calculation
  const stretchTiers =
    me && me.stretchMilestones && me.stretchMilestones.length > 0
      ? me.stretchMilestones
      : me && me.stretchTarget && me.stretchTarget > 0
        ? [{ minClaims: me.stretchTarget, rewardAmount: me.stretchSpecialRate }]
        : [];
  const nextStretchTier = me ? (stretchTiers.find((t) => me.eligibleClaimsCount < t.minClaims) ?? null) : null;
  const matchedStretchTier = me
    ? ([...stretchTiers].reverse().find((t) => me.eligibleClaimsCount >= t.minClaims) ?? null)
    : null;
  const highestStretchTarget = stretchTiers[stretchTiers.length - 1]?.minClaims ?? 0;
  const stretchGoalTargetForBar = nextStretchTier?.minClaims ?? highestStretchTarget;
  const stretchPct =
    me && stretchGoalTargetForBar > 0
      ? Math.min(100, Math.round((me.eligibleClaimsCount / stretchGoalTargetForBar) * 100))
      : 0;

  // Single-Day Focus calculations
  const selectedPerf = useMemo(
    () => (selectedDay ? data.dailyPerformance.find((d) => d.perfDate === selectedDay) ?? null : null),
    [data.dailyPerformance, selectedDay],
  );

  const dayScopedLedger = useMemo(() => {
    if (!selectedDay) return data.ledger;
    return data.ledger.filter((l) => l.effectiveSlabDate === selectedDay || l.submissionDate === selectedDay);
  }, [data.ledger, selectedDay]);

  const dayEligibleCount = selectedDay
    ? (selectedPerf?.eligibleClaims ?? dayScopedLedger.filter((l) => l.eligibilityStatus === "eligible").length)
    : 0;
  const dayTotalCount = selectedDay ? (selectedPerf?.totalClaims ?? dayScopedLedger.length) : 0;
  const dayPendingOrHeld = selectedDay ? Math.max(0, dayTotalCount - dayEligibleCount) : 0;
  const dayEarnings = selectedDay
    ? (selectedPerf?.provisionalAmount ?? dayScopedLedger.reduce((sum, l) => sum + l.calculatedAmount, 0))
    : 0;

  const dailySteps = useMemo(() => {
    if (!activeRule || activeRule.slabs.length === 0) return [];
    return [...activeRule.slabs]
      .sort((a, b) => a.minClaims - b.minClaims)
      .map((s) => ({
        minClaims: s.minClaims,
        reward: s.bonusAmount > 0 ? s.bonusAmount : s.ratePerClaim,
      }));
  }, [activeRule]);

  const nextDailyStepForDay = useMemo(() => {
    if (!selectedDay || dailySteps.length === 0) return null;
    return dailySteps.find((s) => dayEligibleCount < s.minClaims) ?? null;
  }, [selectedDay, dailySteps, dayEligibleCount]);

  const peakDailyAmount = useMemo(
    () =>
      Math.max(
        1,
        ...data.dailyPerformance.map((d) => d.provisionalAmount),
        ...dailySteps.map((s) => s.reward),
      ),
    [data.dailyPerformance, dailySteps],
  );
  const dailyTotals = useMemo(
    () =>
      data.dailyPerformance.reduce(
        (acc, d) => ({
          days: acc.days + 1,
          eligible: acc.eligible + d.eligibleClaims,
          total: acc.total + d.totalClaims,
          amount: acc.amount + d.provisionalAmount,
        }),
        { days: 0, eligible: 0, total: 0, amount: 0 },
      ),
    [data.dailyPerformance],
  );

  // Claim Audit Ledger filtering + pagination
  const ledgerCounts = useMemo(() => {
    const counts = { all: dayScopedLedger.length, earning: 0, pending_held: 0, ineligible: 0 };
    for (const l of dayScopedLedger) {
      counts[classifyLedgerRow(l)] += 1;
    }
    return counts;
  }, [dayScopedLedger]);

  const filteredClaims = useMemo(() => {
    const q = claimQuery.trim().toLowerCase();
    return dayScopedLedger.filter((l) => {
      if (claimFilter !== "all" && classifyLedgerRow(l) !== claimFilter) return false;
      if (!q) return true;
      return (
        l.vehicleRegNo.toLowerCase().includes(q) ||
        l.claimRef.toLowerCase().includes(q) ||
        (l.resolvedState ?? "").toLowerCase().includes(q) ||
        (l.customerPincode ?? "").includes(q) ||
        (l.slabLabel ?? "").toLowerCase().includes(q)
      );
    });
  }, [dayScopedLedger, claimFilter, claimQuery]);

  const totalClaimPages = Math.max(1, Math.ceil(filteredClaims.length / CLAIMS_PER_PAGE));
  const safeClaimPage = Math.min(claimPage, totalClaimPages);
  const paginatedClaims = useMemo(() => {
    const start = (safeClaimPage - 1) * CLAIMS_PER_PAGE;
    return filteredClaims.slice(start, start + CLAIMS_PER_PAGE);
  }, [filteredClaims, safeClaimPage]);

  const hasAdjustments = Boolean(data.adjustments.length > 0 || me?.targetAdjustmentReason);
  const showAdjustmentsCell = Boolean(me && (me.adjustmentsTotal !== 0 || data.adjustments.length > 0));
  const topDailyMilestone = dailySteps[dailySteps.length - 1]?.minClaims ?? 0;

  const estimatedAfterAdjustments = me
    ? me.targetAchieved
      ? me.eligiblePayableAmount
      : Math.max(0, me.provisionalEarnings + me.adjustmentsTotal)
    : 0;

  const tabOptions: { value: AgentTab; label: string }[] = [
    { value: "daily", label: "Daily & Claim Breakdown" },
    ...(hasAdjustments
      ? [{ value: "adjustments" as const, label: `Adjustments (${data.adjustments.length || 1})` }]
      : []),
    { value: "payouts", label: "Settlements & Payouts" },
  ];

  return (
    <div className="space-y-4">
      {/* 1. Compact Header + Custom Period / Day Picker */}
      <Card index={0} className="px-4 py-3.5 sm:px-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3.5">
            <div className="hidden shrink-0 sm:block">
              <AgentMilestoneCharacter
                progressPct={me?.progressPct ?? 0}
                targetAchieved={Boolean(me?.targetAchieved)}
              />
            </div>
            <div className="space-y-0.5">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-[15px] font-semibold text-ink">
                  {selectedDay
                    ? `Day Breakdown · ${formatDate(selectedDay)}`
                    : `My Incentives · ${formatMonthTitle(data.monthIso)}`}
                </h2>
                {activeAssign ? (
                  <Chip tone="accent">
                    {activeAssign.vehicleCategory} · {activeAssign.assignedState}
                  </Chip>
                ) : (
                  <Chip tone="neutral">No Active Assignment</Chip>
                )}
                {selectedDay && (
                  <Chip tone={selectedPerf?.holidayLabel ? "warning" : "info"}>
                    {selectedPerf?.holidayLabel ?? `${getWeekdayShort(selectedDay)}`}
                  </Chip>
                )}
              </div>
              <p className="text-xs text-ink-muted">
                {activeAssign
                  ? `Active from ${formatDate(activeAssign.effectiveFrom)} · ${activeRule?.ruleName ?? "Standard Rule"}`
                  : "Contact your admin to configure your vehicle category and state assignment."}
              </p>
            </div>
          </div>

          <AgentPeriodPicker
            monthIso={data.monthIso}
            todayIso={data.todayIso}
            selectedDay={selectedDay}
            dailyByDate={dailyByDate}
            onSelectMonth={handleSelectMonth}
            onSelectDay={handleSelectDay}
            onClearDay={handleClearDay}
          />
        </div>
      </Card>

      {/* 2. Top Core KPIs (Shown on Single-Day Focus) */}
      {selectedDay && (
        <StatRow>
          <MiniStat index={1} title="Day Eligible Claims" icon={CheckCircle2} value={dayEligibleCount} />
          <MiniStat index={2} title="Day Claims Submitted" icon={Layers} value={dayTotalCount} />
          <MiniStat index={3} title="Pending / Held (Day)" icon={Clock} value={dayPendingOrHeld} />
          <MiniStat index={4} title="Day Provisional Earnings" icon={Wallet} value={dayEarnings} kind="inr" />
        </StatRow>
      )}

      {/* 3A. Single-Day Calculation Bar (when a specific calendar day is active) */}
      {selectedDay && (
        <Card index={5} className="border-accent/40 bg-accent-soft/15 p-4 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <CalendarCheck size={15} className="text-ink shrink-0" />
              <span className="text-xs sm:text-sm font-semibold text-ink">
                {formatDate(selectedDay)} ({getWeekdayShort(selectedDay)}) · Daily Calculation
              </span>
              <span className="text-xs text-ink-muted">
                —{" "}
                {selectedPerf?.slabSummary
                  ? selectedPerf.slabSummary
                  : dayTotalCount === 0
                    ? "No claims logged"
                    : `${dayEligibleCount} qualifying · ${dayPendingOrHeld} pending/held`}
              </span>
            </div>
            <Button variant="secondary" className="h-7 px-2.5 text-[11px]" onClick={handleClearDay}>
              Back to Full Month
            </Button>
          </div>

          {dailySteps.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-divider/60 pt-2.5">
              <div className="flex flex-wrap gap-1.5">
                {dailySteps.map((step) => {
                  const hit = dayEligibleCount >= step.minClaims;
                  return (
                    <span
                      key={step.minClaims}
                      className={cn(
                        "inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] tabular-nums",
                        hit
                          ? "border-positive/40 bg-positive-soft text-positive font-semibold"
                          : "border-divider bg-surface-strong text-ink-muted",
                      )}
                    >
                      {step.minClaims} claims → {fmtInr(step.reward)}
                      {hit ? " ✓" : ""}
                    </span>
                  );
                })}
              </div>
              <span className="text-[11px] text-ink-muted tabular-nums">
                {nextDailyStepForDay ? (
                  <>
                    <b>{nextDailyStepForDay.minClaims - dayEligibleCount}</b> more on this day for{" "}
                    <b>{fmtInr(nextDailyStepForDay.reward)}</b>
                  </>
                ) : (
                  topDailyMilestone > 0 &&
                  dayEligibleCount >= topDailyMilestone && <Chip tone="positive">Top Daily Step Hit</Chip>
                )}
              </span>
            </div>
          )}
        </Card>
      )}

      {/* 3B. Balanced 2-Column Overview Grid in Full-Month Mode (Target + Special Target Spotlight) */}
      {me && !selectedDay && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          {/* Left: Target Progress & Earnings Composition */}
          <Card
            index={5}
            className={cn(
              "p-4 flex flex-col justify-between gap-3",
              stretchTiers.length > 0 ? "lg:col-span-7" : "lg:col-span-12",
            )}
          >
            <div className="space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="font-semibold text-ink">
                  Monthly Target Progress: {me.progressPct}% ({me.eligibleClaimsCount} / {me.effectiveTarget})
                </span>
                <Chip tone={me.targetAchieved ? "positive" : "warning"}>
                  {me.targetAchieved ? "Target Achieved" : `${me.remainingTarget} MORE CLAIMS NEEDED`}
                </Chip>
              </div>
              <AnimatedProgressBar pct={me.progressPct} positive={me.targetAchieved} />
            </div>

            {/* Clean Earnings Composition Strip */}
            <div
              className={cn(
                "grid grid-cols-2 gap-2 pt-2 border-t border-divider/60 text-xs",
                showAdjustmentsCell ? "sm:grid-cols-5" : "sm:grid-cols-4",
              )}
            >
              <div className="rounded-lg bg-surface-muted/45 px-2.5 py-2">
                <div className="text-[10.5px] text-ink-muted">Daily Earnings</div>
                <div className="font-semibold text-ink tabular-nums mt-0.5">{fmtInr(me.dailyProvisionalEarnings)}</div>
              </div>
              <div className="rounded-lg bg-surface-muted/45 px-2.5 py-2">
                <div className="text-[10.5px] text-ink-muted">Monthly Bonus</div>
                <div className="font-semibold text-ink tabular-nums mt-0.5">{fmtInr(me.monthlyMilestoneBonus)}</div>
              </div>
              <div className="rounded-lg bg-surface-muted/45 px-2.5 py-2">
                <div className="text-[10.5px] text-ink-muted">Special Rate Bonus</div>
                <div className="font-semibold text-ink tabular-nums mt-0.5">{fmtInr(me.stretchBonusAmount)}</div>
              </div>
              {showAdjustmentsCell && (
                <div className="rounded-lg bg-surface-muted/45 px-2.5 py-2">
                  <div className="text-[10.5px] text-ink-muted">Adjustments</div>
                  <div
                    className={cn(
                      "font-semibold tabular-nums mt-0.5",
                      me.adjustmentsTotal > 0
                        ? "text-positive"
                        : me.adjustmentsTotal < 0
                          ? "text-negative"
                          : "text-ink",
                    )}
                  >
                    {fmtSignedInr(me.adjustmentsTotal)}
                  </div>
                </div>
              )}
              <div className="rounded-lg border border-accent-strong/40 bg-accent-soft/70 px-2.5 py-2">
                <div className="text-[10.5px] text-ink font-medium">Total Estimated</div>
                <div className="font-bold text-ink tabular-nums mt-0.5">{fmtInr(estimatedAfterAdjustments)}</div>
              </div>
            </div>

            {/* Inline Monthly Bonus Milestones & Pending Note */}
            {(me.activeMonthlyMilestones.length > 0 || me.nonQualifyingClaimsCount > 0) && (
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-divider/60 text-[11px]">
                {me.activeMonthlyMilestones.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-medium text-ink-muted mr-1">Monthly Milestones:</span>
                    {me.activeMonthlyMilestones.map((tier) => {
                      const hit = me.eligibleClaimsCount >= tier.minClaims;
                      return (
                        <span
                          key={`${tier.minClaims}-${tier.rewardAmount}`}
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 tabular-nums border",
                            hit
                              ? "bg-positive-soft text-positive border-positive/30 font-semibold"
                              : "bg-surface-muted/50 text-ink-muted border-divider",
                          )}
                        >
                          {tier.minClaims} → {fmtInr(tier.rewardAmount)}
                          {hit ? " ✓" : ""}
                        </span>
                      );
                    })}
                  </div>
                )}
                {me.nonQualifyingClaimsCount > 0 && (
                  <span className="text-ink-faint ml-auto">
                    +{me.nonQualifyingClaimsCount} pending / non-qualifying claim
                    {me.nonQualifyingClaimsCount === 1 ? "" : "s"}
                  </span>
                )}
              </div>
            )}
          </Card>

          {/* Right: Dedicated Special Target Mascot Spotlight */}
          {stretchTiers.length > 0 && (
            <Card
              index={6}
              className={cn(
                "lg:col-span-5 p-4 flex flex-col justify-between gap-3 border",
                me.stretchAchieved
                  ? "border-positive/35 bg-positive-soft/15"
                  : "border-accent-strong/35 bg-accent-soft/20",
              )}
            >
              <div className="flex items-start gap-3">
                <SpecialStretchMascotCharacter
                  progressPct={stretchPct}
                  stretchAchieved={me.stretchAchieved}
                  className="h-16 w-24 shrink-0"
                />
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center justify-between gap-1.5">
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-ink truncate">
                      <Sparkles size={13} className={me.stretchAchieved ? "text-positive" : "text-ink"} />
                      <span className="truncate">
                        {me.stretchLabel?.trim() || "Personal Special Goal"}
                      </span>
                    </span>
                    <Chip tone={me.stretchAchieved ? "positive" : "warning"}>
                      {me.stretchAchieved
                        ? `+${fmtInr(me.stretchBonusAmount)}`
                        : `${me.stretchClaimsRemaining} to go`}
                    </Chip>
                  </div>
                  <p className="text-xs text-ink-muted leading-snug">
                    {me.stretchAchieved && !nextStretchTier
                      ? `Champion effort! Top Special Bonus (+${fmtInr(me.stretchBonusAmount)}) unlocked.`
                      : me.stretchAchieved && nextStretchTier
                        ? `+${fmtInr(me.stretchBonusAmount)} unlocked — ${me.stretchClaimsRemaining} more for ${nextStretchTier.minClaims} claims.`
                        : `Reach ${nextStretchTier?.minClaims ?? stretchTiers[0].minClaims} claims past your ${me.effectiveTarget} base target.`}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex flex-wrap gap-1.5">
                  {stretchTiers.map((tier) => {
                    const hit = me.eligibleClaimsCount >= tier.minClaims;
                    const isMatched = matchedStretchTier?.minClaims === tier.minClaims;
                    return (
                      <span
                        key={tier.minClaims}
                        className={cn(
                          "inline-flex items-center px-2 py-0.5 rounded-md border text-[11px] tabular-nums",
                          isMatched
                            ? "border-positive/50 bg-positive-soft text-positive font-semibold"
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
                  <div className="flex items-center justify-between text-[11px] text-ink-muted mb-1 tabular-nums">
                    <span>
                      Progress: <b>{me.eligibleClaimsCount}</b> / <b>{stretchGoalTargetForBar}</b> ({stretchPct}%)
                    </span>
                    <span>Base: {me.effectiveTarget}</span>
                  </div>
                  <AnimatedProgressBar pct={stretchPct} positive={me.stretchAchieved} />
                </div>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* 4. Compact 1-Line Adjustment Notice (Never Blocks Daily/Claims Below Fold) */}
      {hasAdjustments && me && (
        <AdjustmentSummaryBanner
          adjustments={data.adjustments}
          provisionalEarnings={me.provisionalEarnings}
          adjustmentsTotal={me.adjustmentsTotal}
          onViewDetails={() => setSubTab("adjustments")}
        />
      )}

      {/* 5. Workspace Switcher Tabs */}
      <Segmented<AgentTab>
        label="My incentive details"
        value={subTab}
        onChange={setSubTab}
        options={tabOptions}
      />

      {/* TAB 1: Side-by-Side Daily Scorecard + Claim-by-Claim Audit Ledger */}
      {subTab === "daily" && (
        <div key="agent-daily" className="fade-up grid grid-cols-1 gap-4 lg:grid-cols-12 items-start">
          {/* Left Panel: Compact Interactive Daily Scorecard */}
          <Card index={6} className="lg:col-span-4 space-y-3 p-4">
            <CardHeader
              title={`Daily Scorecard (${data.dailyPerformance.length})`}
              action={<span className="text-[11px] text-ink-muted">Click day to filter</span>}
            />

            {data.dailyPerformance.length === 0 ? (
              <EmptyState label="No daily performance entries yet" className="py-6" />
            ) : (
              <>
                <div className="max-h-[540px] overflow-y-auto divide-y divide-divider/60 rounded-tile border border-divider bg-surface-strong">
                  {data.dailyPerformance.map((d) => {
                    const parsed = parseISO(d.perfDate);
                    const monthShort = parsed ? MONTHS_SHORT[parsed.m - 1] : "";
                    const dayNum = parsed ? String(parsed.d).padStart(2, "0") : d.perfDate.slice(-2);
                    const weekday = getWeekdayShort(d.perfDate);
                    const isToday = d.perfDate === data.todayIso;
                    const isSelected = d.perfDate === selectedDay;
                    const pendingOrHeld = Math.max(0, d.totalClaims - d.eligibleClaims);
                    const barPct = Math.min(100, Math.round((d.provisionalAmount / peakDailyAmount) * 100));

                    return (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => (isSelected ? handleClearDay() : handleSelectDay(d.perfDate))}
                        className={cn(
                          "w-full text-left px-3 py-2.5 transition-colors flex items-center gap-2.5",
                          isSelected
                            ? "bg-accent-soft/45"
                            : "hover:bg-accent-soft/20",
                        )}
                      >
                        {/* Date Box */}
                        <div
                          className={cn(
                            "grid w-10 shrink-0 place-items-center rounded-md py-1 text-center border tabular-nums",
                            isSelected
                              ? "border-ink bg-ink text-white"
                              : isToday
                                ? "border-accent-strong bg-accent-soft text-ink"
                                : "border-divider bg-surface-muted/60 text-ink",
                          )}
                        >
                          <span className="text-[9px] font-semibold uppercase leading-none opacity-80">
                            {monthShort}
                          </span>
                          <span className="text-sm font-bold leading-tight">{dayNum}</span>
                        </div>

                        {/* Middle Info + Thin Progress Bar */}
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center justify-between gap-1.5 text-[11.5px]">
                            <span className="font-semibold text-ink truncate">
                              {weekday} · {d.eligibleClaims} eligible
                              {pendingOrHeld > 0 && (
                                <span className="text-warning font-medium"> (+{pendingOrHeld} held)</span>
                              )}
                            </span>
                            <span className="font-bold text-ink tabular-nums shrink-0">
                              {formatINR(d.provisionalAmount)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="h-1 flex-1 overflow-hidden rounded-full bg-surface-muted">
                              <div
                                className={cn(
                                  "h-full rounded-full",
                                  d.provisionalAmount > 0 ? "bg-positive" : "bg-ink-faint/35",
                                )}
                                style={{ width: `${Math.max(d.provisionalAmount > 0 ? 6 : 0, barPct)}%` }}
                              />
                            </div>
                            {d.holidayLabel && (
                              <span className="text-[9.5px] font-semibold text-warning shrink-0">
                                {d.holidayLabel}
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Compact Totals Footer */}
                <div className="flex items-center justify-between rounded-lg bg-surface-muted/55 px-3 py-2 text-[11.5px] tabular-nums">
                  <span className="text-ink-muted">
                    Total ({dailyTotals.eligible}/{dailyTotals.total} claims)
                  </span>
                  <b className="text-ink">{formatINR(dailyTotals.amount)}</b>
                </div>
              </>
            )}
          </Card>

          {/* Right Panel: Searchable, Filterable & Paginated Claim-by-Claim Audit Ledger */}
          <Card index={7} className="lg:col-span-8 space-y-3 p-4">
            <CardHeader
              title={
                selectedDay
                  ? `Claims on ${formatDate(selectedDay)} (${filteredClaims.length})`
                  : `Claim-by-Claim Ledger (${filteredClaims.length}${
                      filteredClaims.length !== data.ledger.length ? ` of ${data.ledger.length}` : ""
                    })`
              }
              action={
                selectedDay && (
                  <button
                    type="button"
                    onClick={handleClearDay}
                    className="inline-flex items-center gap-1 rounded-full border border-divider bg-surface-muted/70 px-2.5 py-1 text-[11px] font-medium text-ink hover:bg-accent-soft"
                  >
                    <X size={12} />
                    <span>Show all month</span>
                  </button>
                )
              }
            />

            {data.ledger.length > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="relative flex-1 min-w-[200px]">
                  <Search
                    size={14}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint"
                  />
                  <input
                    type="text"
                    value={claimQuery}
                    onChange={(e) => {
                      setClaimQuery(e.target.value);
                      setClaimPage(1);
                    }}
                    placeholder="Search vehicle reg, claim ref, PIN or state..."
                    className={cn(CONTROL, "h-8 pl-8 pr-8 text-xs")}
                  />
                  {claimQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setClaimQuery("");
                        setClaimPage(1);
                      }}
                      aria-label="Clear search"
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-faint hover:text-ink"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-1">
                  {(
                    [
                      { key: "all", label: `All (${ledgerCounts.all})` },
                      { key: "earning", label: `Qualifying (${ledgerCounts.earning})` },
                      { key: "pending_held", label: `Pending/Held (${ledgerCounts.pending_held})` },
                      { key: "ineligible", label: `Excluded (${ledgerCounts.ineligible})` },
                    ] as const
                  )
                    .filter((item) => item.key === "all" || ledgerCounts[item.key] > 0)
                    .map((item) => {
                      const active = claimFilter === item.key;
                      return (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => {
                            setClaimFilter(item.key);
                            setClaimPage(1);
                          }}
                          className={cn(
                            "h-8 rounded-full border px-2.5 text-[11px] font-medium transition-colors tabular-nums",
                            active
                              ? "border-ink bg-ink text-white"
                              : "border-divider bg-surface-strong text-ink-muted hover:bg-accent-soft/50 hover:text-ink",
                          )}
                        >
                          {item.label}
                        </button>
                      );
                    })}
                </div>
              </div>
            )}

            {filteredClaims.length === 0 ? (
              <EmptyState
                illustration={<LedgerAuditorCharacter />}
                label={selectedDay ? `No claims recorded on ${formatDate(selectedDay)}` : "No matching claims"}
                hint={
                  claimQuery || claimFilter !== "all" || selectedDay
                    ? "Try clearing your search, status filter, or selected date."
                    : "Eligible claims matching your assigned vehicle category and state will appear here."
                }
                className="py-6"
              />
            ) : (
              <>
                <div className="overflow-x-auto rounded-tile border border-divider">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="border-b border-divider bg-surface-muted/45 text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
                        <th className="py-2 pl-3 pr-2">Claim &amp; Vehicle</th>
                        <th className="py-2 pr-2">Date &amp; Place</th>
                        <th className="py-2 pr-2">Day Step</th>
                        <th className="py-2 pr-2 text-right">Credit</th>
                        <th className="py-2 pr-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-divider/60 bg-surface-strong">
                      {paginatedClaims.map((l) => {
                        const chip = chipFor(l.earningStatus);
                        const isFlatStepHold =
                          l.calculatedAmount === 0 &&
                          l.eligibilityStatus === "eligible" &&
                          (l.earningStatus === "provisional" || l.earningStatus === "qualified");

                        return (
                          <tr key={l.id} className="transition-colors hover:bg-accent-soft/15">
                            <td className="py-2 pl-3 pr-2">
                              <p className="font-semibold text-ink">{l.vehicleRegNo}</p>
                              <p className="text-[10.5px] text-ink-faint">{l.claimRef}</p>
                            </td>
                            <td className="py-2 pr-2">
                              <p className="font-medium text-ink tabular-nums">{formatDate(l.submissionDate)}</p>
                              <p className="text-[10.5px] text-ink-muted">
                                {l.resolvedState ?? "Unresolved"}
                                {l.customerPincode ? ` · ${l.customerPincode}` : ""}
                              </p>
                            </td>
                            <td className="py-2 pr-2">
                              {l.dailySequenceNo > 0 ? (
                                <span className="inline-flex items-center rounded bg-surface-muted px-1.5 py-0.5 text-[10.5px] font-medium text-ink tabular-nums">
                                  #{l.dailySequenceNo} · {l.slabLabel ?? "Base"}
                                </span>
                              ) : (
                                <span className="text-ink-faint">—</span>
                              )}
                            </td>
                            <td className="py-2 pr-2 text-right tabular-nums">
                              <span
                                className={cn(
                                  "font-bold",
                                  l.calculatedAmount > 0 ? "text-positive" : "text-ink",
                                )}
                              >
                                {formatINR(l.calculatedAmount)}
                              </span>
                              {isFlatStepHold && (
                                <span className="block text-[9.5px] text-ink-faint">Held flat</span>
                              )}
                            </td>
                            <td className="py-2 pr-3">
                              <Chip tone={chip.tone}>{chip.label}</Chip>
                              {l.resolutionNote && l.earningStatus !== "provisional" && l.earningStatus !== "qualified" && (
                                <span className="block text-[10.5px] text-ink-faint mt-0.5">{l.resolutionNote}</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {totalClaimPages > 1 && (
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs text-ink-muted tabular-nums">
                    <span>
                      Showing {(safeClaimPage - 1) * CLAIMS_PER_PAGE + 1}–
                      {Math.min(safeClaimPage * CLAIMS_PER_PAGE, filteredClaims.length)} of {filteredClaims.length}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="secondary"
                        className="h-7 px-2.5 text-[11px]"
                        disabled={safeClaimPage <= 1}
                        onClick={() => setClaimPage((p) => Math.max(1, p - 1))}
                      >
                        Prev
                      </Button>
                      <span className="px-1.5 font-medium text-ink">
                        {safeClaimPage} / {totalClaimPages}
                      </span>
                      <Button
                        variant="secondary"
                        className="h-7 px-2.5 text-[11px]"
                        disabled={safeClaimPage >= totalClaimPages}
                        onClick={() => setClaimPage((p) => Math.min(totalClaimPages, p + 1))}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </Card>
        </div>
      )}

      {/* TAB 2: Adjustments & Calculation Details */}
      {subTab === "adjustments" && hasAdjustments && (
        <AdjustmentDetailsTab
          adjustments={data.adjustments}
          targetAdjustmentReason={me?.targetAdjustmentReason ?? null}
          baseTarget={me?.baseTarget ?? 0}
          effectiveTarget={me?.effectiveTarget ?? 0}
          provisionalEarnings={me?.provisionalEarnings ?? 0}
          adjustmentsTotal={me?.adjustmentsTotal ?? 0}
        />
      )}

      {/* TAB 3: Finalized Settlements & Payouts */}
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
                        <td className="py-2 pr-4">
                          <Chip tone="neutral">{p.paymentMode}</Chip>
                        </td>
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
