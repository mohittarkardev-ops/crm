"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, Tile } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { CountUp } from "@/components/ui/count-up";
import { CustomSelect } from "@/components/ui/custom-select";
import { CONTROL } from "@/components/ui/field";
import { Segmented } from "@/components/ui/segmented";
import { cn } from "@/lib/cn";
import { formatINR, formatNumber } from "@/lib/format";
import {
  CALCULATION_METHOD_LABELS,
  calculateDayClaimRewards,
  normalizeMonthlyMilestones,
  normalizeSlabs,
  simulateRulePayout,
  type IncentiveRule,
  type MonthlyMilestoneTier,
} from "@/lib/incentives";

type StretchStepDraft = { minClaims: string; rewardAmount: string };
type CalculatorInputMode = "daily" | "monthly";

function slabStepReward(rule: IncentiveRule, minClaims: number): number {
  const slabs = normalizeSlabs(rule.slabs);
  const found = slabs.find((s) => s.minClaims === minClaims);
  if (!found) return 0;
  return found.bonusAmount > 0 ? found.bonusAmount : found.ratePerClaim;
}

export function PayoutSimulatorCard({
  rules,
  selectedRuleId,
  onSelectRuleId,
  compact = false,
}: {
  rules: IncentiveRule[];
  selectedRuleId?: string;
  onSelectRuleId?: (id: string) => void;
  compact?: boolean;
}) {
  const [internalRuleId, setInternalRuleId] = useState(selectedRuleId || rules[0]?.id || "");
  useEffect(() => {
    if (selectedRuleId) setInternalRuleId(selectedRuleId);
  }, [selectedRuleId]);

  const activeRule = useMemo(
    () => rules.find((r) => r.id === internalRuleId) ?? rules[0] ?? null,
    [rules, internalRuleId],
  );

  // Clean input mode switcher: Daily Claims x Days vs Exact Monthly Claims
  const [inputMode, setInputMode] = useState<CalculatorInputMode>("daily");
  const [dailyClaimsInput, setDailyClaimsInput] = useState("4");
  const [workingDaysInput, setWorkingDaysInput] = useState("20");
  const [monthlyClaimsInput, setMonthlyClaimsInput] = useState("80");

  // Optional Personal Special Milestones (flat bonus payout at each step after Base Target)
  const [enableSpecialChart, setEnableSpecialChart] = useState(false);
  const [baseTargetOverrideInput, setBaseTargetOverrideInput] = useState("");
  const [stretchSteps, setStretchSteps] = useState<StretchStepDraft[]>([
    { minClaims: "80", rewardAmount: "1000" },
  ]);

  const workingDays = Math.max(1, Math.min(31, Math.floor(Number(workingDaysInput) || 20)));
  const dailyClaims = Math.max(0, Math.min(200, Math.floor(Number(dailyClaimsInput) || 0)));
  const monthlyClaims =
    inputMode === "monthly"
      ? Math.max(0, Math.min(5000, Math.floor(Number(monthlyClaimsInput) || 0)))
      : dailyClaims * workingDays;

  const previewDayClaims =
    inputMode === "monthly" ? Math.floor(monthlyClaims / workingDays) : dailyClaims;

  const normalizedDailySlabs = useMemo(
    () => (activeRule ? normalizeSlabs(activeRule.slabs) : []),
    [activeRule],
  );

  const dayPreview = useMemo(() => {
    if (!activeRule) return null;
    return calculateDayClaimRewards(activeRule, previewDayClaims);
  }, [activeRule, previewDayClaims]);

  const parsedStretchMilestones: MonthlyMilestoneTier[] = useMemo(() => {
    if (!enableSpecialChart) return [];
    return normalizeMonthlyMilestones(
      stretchSteps.map((row) => ({
        minClaims: Number(row.minClaims),
        rewardAmount: Number(row.rewardAmount),
      })),
    );
  }, [enableSpecialChart, stretchSteps]);

  const sim = useMemo(() => {
    if (!activeRule) return null;
    const baseOverrideNum =
      baseTargetOverrideInput.trim() !== "" && Number.isFinite(Number(baseTargetOverrideInput))
        ? Math.max(0, Math.floor(Number(baseTargetOverrideInput)))
        : undefined;

    return simulateRulePayout({
      rule: activeRule,
      workingDays,
      monthlyClaims,
      baseTargetOverride: baseOverrideNum,
      stretchMilestones: parsedStretchMilestones,
      stretchRateMode: "lump_sum_bonus",
    });
  }, [activeRule, workingDays, monthlyClaims, baseTargetOverrideInput, parsedStretchMilestones]);

  const handleRuleChange = (nextId: string) => {
    setInternalRuleId(nextId);
    onSelectRuleId?.(nextId);
  };

  const handleModeChange = (nextMode: CalculatorInputMode) => {
    if (nextMode === "monthly" && inputMode === "daily") {
      setMonthlyClaimsInput(String(dailyClaims * workingDays));
    } else if (nextMode === "daily" && inputMode === "monthly") {
      setDailyClaimsInput(String(Math.floor(monthlyClaims / workingDays)));
    }
    setInputMode(nextMode);
  };

  const isStepRule =
    activeRule?.calculationMethod === "milestone" ||
    (activeRule?.calculationMethod === "combined" &&
      activeRule.combinationMode === "fixed_plus_slab_bonus") ||
    activeRule?.calculationMethod === "progressive_slab" ||
    activeRule?.calculationMethod === "final_slab";

  const matchedDailyStep = useMemo(() => {
    if (!isStepRule || normalizedDailySlabs.length === 0) return null;
    const reached = normalizedDailySlabs.filter((s) => previewDayClaims >= s.minClaims);
    return reached.length > 0 ? reached[reached.length - 1] : null;
  }, [isStepRule, normalizedDailySlabs, previewDayClaims]);

  const nextDailyStep = useMemo(() => {
    if (!isStepRule || normalizedDailySlabs.length === 0) return null;
    return normalizedDailySlabs.find((s) => s.minClaims > previewDayClaims) ?? null;
  }, [isStepRule, normalizedDailySlabs, previewDayClaims]);

  const baseTargetDisplay = sim?.effectiveTarget ?? activeRule?.monthlyTarget ?? 0;

  return (
    <Card index={1} className={compact ? "p-4" : "p-5"}>
      <CardHeader
        title="Payout Calculator"
        action={
          <div className="flex flex-wrap items-center gap-2.5">
            <Segmented<CalculatorInputMode>
              label="Calculator input mode"
              value={inputMode}
              onChange={handleModeChange}
              options={[
                { value: "daily", label: "Daily Claims" },
                { value: "monthly", label: "Monthly Total" },
              ]}
            />
            {sim && (
              <Chip tone={sim.targetAchieved ? "positive" : "warning"}>
                {sim.targetAchieved
                  ? `TARGET MET (${monthlyClaims} / ${sim.effectiveTarget})`
                  : `BELOW TARGET (${monthlyClaims} / ${sim.effectiveTarget})`}
              </Chip>
            )}
          </div>
        }
      />

      {!activeRule ? (
        <p className="text-[13px] text-ink-muted py-4">Add an active rule first to preview payouts.</p>
      ) : (
        <div className="space-y-4">
          {/* ROW 1: Structured Top Strip — Rule + Primary Volume Controls */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 pb-4 border-b border-divider items-start">
            <div className="md:col-span-6 flex flex-col gap-1.5">
              <label className="text-xs font-medium text-ink-muted leading-none">
                Policy Rule
              </label>
              <CustomSelect
                value={activeRule.id}
                onChange={handleRuleChange}
                options={rules.map((r) => ({
                  value: r.id,
                  label: `${r.ruleName} (${r.vehicleCategory ?? "Global"} · ${CALCULATION_METHOD_LABELS[r.calculationMethod] ?? r.calculationMethod})`,
                }))}
              />
            </div>

            {inputMode === "daily" ? (
              <div className="md:col-span-3 flex flex-col gap-1.5">
                <label className="text-xs font-medium text-ink-muted leading-none">
                  Claims per Day
                </label>
                <input
                  type="number"
                  min={0}
                  max={200}
                  value={dailyClaimsInput}
                  onChange={(e) => setDailyClaimsInput(e.target.value)}
                  className={cn(CONTROL, "h-10 bg-white font-medium tabular-nums")}
                />
              </div>
            ) : (
              <div className="md:col-span-3 flex flex-col gap-1.5">
                <label className="text-xs font-medium text-ink-muted leading-none">
                  Monthly Claims
                </label>
                <input
                  type="number"
                  min={0}
                  max={5000}
                  value={monthlyClaimsInput}
                  onChange={(e) => setMonthlyClaimsInput(e.target.value)}
                  className={cn(CONTROL, "h-10 bg-white font-medium tabular-nums")}
                />
              </div>
            )}

            <div className="md:col-span-3 flex flex-col gap-1.5">
              <label className="text-xs font-medium text-ink-muted leading-none">
                Working Days
              </label>
              <input
                type="number"
                min={1}
                max={31}
                value={workingDaysInput}
                onChange={(e) => setWorkingDaysInput(e.target.value)}
                className={cn(CONTROL, "h-10 bg-white font-medium tabular-nums")}
              />
            </div>
          </div>

          {/* ROW 2: Balanced Two-Column Workspace */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* LEFT (7 cols): Daily Schedule + Optional Personal Special Milestones */}
            <div className="lg:col-span-7 flex flex-col gap-4">
              {/* 1. Daily Payout & Step Ladder */}
              <div className="rounded-tile border border-divider bg-surface-strong p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-[13px] font-semibold text-ink">
                      1. Daily Payout Schedule
                    </h3>
                    <p className="text-[11px] text-ink-muted mt-0.5">
                      {activeRule.calculationMethod === "fixed"
                        ? `Flat ₹${formatNumber(activeRule.fixedRate)} paid for every eligible claim.`
                        : activeRule.calculationMethod === "combined"
                          ? `₹${formatNumber(activeRule.fixedRate)}/claim + milestone step bonus (holds flat between steps).`
                          : "Rewards hold flat between steps until the next daily milestone is reached."}
                    </p>
                  </div>
                  {dayPreview && (
                    <Chip tone={dayPreview.dayTotal > 0 ? "positive" : "neutral"}>
                      {formatINR(dayPreview.dayTotal)} / day ({previewDayClaims} claims)
                    </Chip>
                  )}
                </div>

                {isStepRule && normalizedDailySlabs.length > 0 ? (
                  <>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                      {normalizedDailySlabs.map((slab) => {
                        const stepVal = slabStepReward(activeRule, slab.minClaims);
                        const reached = previewDayClaims >= slab.minClaims;
                        const isCurrent = matchedDailyStep?.minClaims === slab.minClaims;
                        return (
                          <div
                            key={slab.slabOrder}
                            className={cn(
                              "rounded-md border px-2.5 py-2 text-[11.5px] tabular-nums transition-colors",
                              isCurrent
                                ? "border-positive/60 bg-positive-soft text-positive font-semibold"
                                : reached
                                  ? "border-positive/35 bg-positive-soft/45 text-ink"
                                  : "border-divider bg-surface text-ink-muted",
                            )}
                          >
                            <div className="flex items-center justify-between gap-1">
                              <span>{slab.minClaims} claims</span>
                              <span>{reached ? "✓" : ""}</span>
                            </div>
                            <div className="text-[12.5px] font-semibold mt-0.5 text-ink">
                              ₹{formatNumber(stepVal)}
                              {activeRule.calculationMethod === "combined" && activeRule.fixedRate > 0 ? (
                                <span className="text-[10.5px] font-normal text-ink-muted">
                                  {" "}
                                  +₹{formatNumber(activeRule.fixedRate)}/cl
                                </span>
                              ) : null}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <p className="text-[11px] text-ink-muted bg-surface-muted/60 rounded-md px-2.5 py-1.5">
                      {previewDayClaims === 0
                        ? "Enter claims per day above to preview step unlocks."
                        : matchedDailyStep && nextDailyStep && previewDayClaims > matchedDailyStep.minClaims
                          ? `At ${previewDayClaims} claims/day: holds flat at ${matchedDailyStep.minClaims}-claim reward. ${nextDailyStep.minClaims - previewDayClaims} more claim${nextDailyStep.minClaims - previewDayClaims === 1 ? "" : "s"}/day unlocks ${nextDailyStep.minClaims} claims.`
                          : matchedDailyStep && nextDailyStep
                            ? `Reached ${matchedDailyStep.minClaims}-claim step. ${nextDailyStep.minClaims - previewDayClaims} more claim${nextDailyStep.minClaims - previewDayClaims === 1 ? "" : "s"}/day unlocks ${nextDailyStep.minClaims} claims.`
                            : !matchedDailyStep && nextDailyStep
                              ? `Below first step (${nextDailyStep.minClaims} claims): ${nextDailyStep.minClaims - previewDayClaims} more claim${nextDailyStep.minClaims - previewDayClaims === 1 ? "" : "s"}/day unlocks ₹${formatNumber(slabStepReward(activeRule, nextDailyStep.minClaims))}.`
                              : `Top daily milestone reached (${matchedDailyStep?.minClaims}+ claims/day).`}
                    </p>
                  </>
                ) : (
                  <div className="rounded-md bg-surface-muted/60 px-3 py-2 text-[12px] text-ink-muted">
                    {previewDayClaims} claims/day × ₹{formatNumber(activeRule.fixedRate)} ={" "}
                    <b className="text-ink tabular-nums">
                      {formatINR(previewDayClaims * activeRule.fixedRate)}/day
                    </b>
                  </div>
                )}
              </div>

              {/* 2. Personal Special Milestones Chart (flat bonus payout at each step) */}
              <div className="rounded-tile border border-divider bg-surface-strong p-4 space-y-3">
                <label className="flex items-start justify-between gap-3 cursor-pointer">
                  <div>
                    <span className="text-[13px] font-semibold text-ink block">
                      2. Personal Special Milestones (after Base Target)
                    </span>
                    <span className="text-[11px] text-ink-muted block mt-0.5">
                      Flat extra ₹ reward unlocked when agent reaches higher monthly milestones (e.g. Base 60 → at 80 claims +₹1,000)
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={enableSpecialChart}
                    onChange={(e) => setEnableSpecialChart(e.target.checked)}
                    className="size-4 mt-0.5 shrink-0"
                  />
                </label>

                {enableSpecialChart && (
                  <div className="space-y-3 pt-3 border-t border-divider">
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-surface-muted/60 px-3 py-2">
                      <span className="text-xs font-medium text-ink">
                        Common Base Monthly Target
                      </span>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={0}
                          placeholder={String(activeRule.monthlyTarget)}
                          value={baseTargetOverrideInput}
                          onChange={(e) => setBaseTargetOverrideInput(e.target.value)}
                          className={cn(CONTROL, "w-24 h-9 bg-white text-xs tabular-nums")}
                        />
                        <span className="text-xs text-ink-muted">claims</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="grid grid-cols-[1fr_1fr_auto] gap-2 text-xs font-medium text-ink-muted px-0.5">
                        <span>Claims Reached</span>
                        <span>Milestone Step Payout (₹)</span>
                        <span className="w-9" />
                      </div>

                      {stretchSteps.map((step, idx) => (
                        <div key={idx} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
                          <input
                            type="number"
                            min={1}
                            value={step.minClaims}
                            placeholder="e.g. 80"
                            onChange={(e) => {
                              const next = [...stretchSteps];
                              next[idx] = { ...next[idx], minClaims: e.target.value };
                              setStretchSteps(next);
                            }}
                            className={cn(CONTROL, "h-9 bg-white tabular-nums")}
                          />
                          <input
                            type="number"
                            min={0}
                            value={step.rewardAmount}
                            placeholder="e.g. 1000"
                            onChange={(e) => {
                              const next = [...stretchSteps];
                              next[idx] = { ...next[idx], rewardAmount: e.target.value };
                              setStretchSteps(next);
                            }}
                            className={cn(CONTROL, "h-9 bg-white tabular-nums")}
                          />
                          <Button
                            variant="ghost"
                            onClick={() =>
                              setStretchSteps(stretchSteps.filter((_, rowIdx) => rowIdx !== idx))
                            }
                            disabled={stretchSteps.length <= 1}
                            className="h-9 w-9 p-0 text-ink-muted hover:text-negative"
                            aria-label="Remove milestone step"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      ))}

                      <Button
                        variant="secondary"
                        onClick={() => {
                          const lastClaims =
                            Number(stretchSteps[stretchSteps.length - 1]?.minClaims) ||
                            baseTargetDisplay;
                          const lastReward =
                            Number(stretchSteps[stretchSteps.length - 1]?.rewardAmount) || 500;
                          setStretchSteps([
                            ...stretchSteps,
                            {
                              minClaims: String(lastClaims + 10),
                              rewardAmount: String(lastReward + 500),
                            },
                          ]);
                        }}
                        className="h-8 px-3 text-xs"
                      >
                        <Plus className="size-3.5" /> Add Milestone Step
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT (5 cols): Structured Summary & Itemized Payout Ledger */}
            {sim && (
              <div className="lg:col-span-5 flex flex-col gap-4">
                <Tile className="p-4">
                  <div className="border-l-[3px] border-accent pl-3">
                    <p className="text-[10.5px] font-semibold uppercase tracking-wider text-ink-muted">
                      Estimated Final Payout
                    </p>
                    <p className="text-[30px] font-bold leading-tight tracking-tight tabular-nums text-ink mt-1">
                      <CountUp value={sim.finalPayable} kind="inr" />
                    </p>
                  </div>

                  <div className="mt-3 pt-3 border-t border-divider grid grid-cols-3 gap-2 text-[11px] tabular-nums">
                    <div>
                      <span className="text-ink-muted block">Total Claims</span>
                      <b className="text-ink text-[12.5px]">{monthlyClaims}</b>
                    </div>
                    <div>
                      <span className="text-ink-muted block">Base Target</span>
                      <b className="text-ink text-[12.5px]">{sim.effectiveTarget}</b>
                    </div>
                    <div>
                      <span className="text-ink-muted block">Avg / Claim</span>
                      <b className="text-ink text-[12.5px]">{formatINR(sim.avgPerClaim)}</b>
                    </div>
                  </div>
                </Tile>

                {/* Itemized Ledger Table */}
                <div className="rounded-tile border border-divider bg-surface-strong overflow-hidden divide-y divide-divider">
                  <div className="bg-surface-muted/60 px-3.5 py-2 flex items-center justify-between text-[10.5px] font-semibold uppercase tracking-wider text-ink-muted">
                    <span>Payout Breakdown</span>
                    <span>Amount</span>
                  </div>

                  <div className="px-3.5 py-2.5 flex items-center justify-between gap-3 text-[12.5px]">
                    <div>
                      <span className="font-medium text-ink block">Daily Base Earnings</span>
                      <span className="text-[11px] text-ink-muted">{sim.dailyBreakdownSummary}</span>
                    </div>
                    <span className="font-semibold tabular-nums text-ink shrink-0">
                      {formatINR(sim.dailyTotalEarnings)}
                    </span>
                  </div>

                  {sim.monthlyMilestoneBonus > 0 && (
                    <div className="px-3.5 py-2.5 flex items-center justify-between gap-3 text-[12.5px]">
                      <div>
                        <span className="font-medium text-positive block">
                          Rule Monthly Bonus ({sim.matchedMonthlyMilestone?.minClaims} claims)
                        </span>
                        <span className="text-[11px] text-ink-muted">
                          Monthly milestone configured on rule
                        </span>
                      </div>
                      <span className="font-semibold tabular-nums text-positive shrink-0">
                        +{formatINR(sim.monthlyMilestoneBonus)}
                      </span>
                    </div>
                  )}

                  {enableSpecialChart && sim.stretchSummary.stretchConfigured && (
                    <div className="px-3.5 py-2.5 space-y-2 text-[12.5px]">
                      <div className="flex items-center justify-between gap-3">
                        <span
                          className={cn(
                            "font-medium",
                            sim.stretchSummary.stretchAchieved ? "text-positive" : "text-ink",
                          )}
                        >
                          Personal Special Bonus
                        </span>
                        <span
                          className={cn(
                            "font-semibold tabular-nums shrink-0",
                            sim.stretchSummary.stretchDeltaAmount > 0
                              ? "text-positive"
                              : "text-ink-muted",
                          )}
                        >
                          +{formatINR(sim.stretchSummary.stretchDeltaAmount)}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {sim.stretchSummary.stretchTiers.map((tier) => {
                          const hit = monthlyClaims >= tier.minClaims;
                          const isMatched =
                            sim.stretchSummary.matchedStretchTier?.minClaims === tier.minClaims;
                          return (
                            <span
                              key={tier.minClaims}
                              className={cn(
                                "inline-flex items-center px-2 py-0.5 rounded border text-[11px] tabular-nums",
                                isMatched
                                  ? "border-positive/60 bg-positive-soft text-positive font-semibold"
                                  : hit
                                    ? "border-positive/30 bg-positive-soft/50 text-ink"
                                    : "border-divider bg-surface text-ink-muted",
                              )}
                            >
                              {tier.minClaims} → +₹{formatNumber(tier.rewardAmount)}
                              {hit ? " ✓" : ""}
                            </span>
                          );
                        })}
                      </div>

                      <p className="text-[11px] text-ink-muted leading-snug">
                        {!sim.stretchSummary.stretchAchieved && sim.stretchSummary.nextStretchTier ? (
                          <>
                            At <b>{monthlyClaims}</b> claims: holds at base provisional.{" "}
                            <b>{sim.stretchSummary.claimsRemainingForStretch} more claims</b> needed for{" "}
                            <b>{sim.stretchSummary.nextStretchTier.minClaims}</b> (+₹
                            {formatNumber(sim.stretchSummary.nextStretchTier.rewardAmount)}).
                          </>
                        ) : sim.stretchSummary.matchedStretchTier && sim.stretchSummary.nextStretchTier ? (
                          <>
                            Unlocked <b>{sim.stretchSummary.matchedStretchTier.minClaims}</b>-claim step.{" "}
                            <b>{sim.stretchSummary.claimsRemainingForStretch} more</b> reaches{" "}
                            <b>{sim.stretchSummary.nextStretchTier.minClaims}</b>.
                          </>
                        ) : (
                          <>
                            Top special milestone reached (<b>{sim.stretchSummary.matchedStretchTier?.minClaims}</b> claims).
                          </>
                        )}
                      </p>
                    </div>
                  )}

                  {/* Footer Row */}
                  <div>
                    {!sim.targetAchieved ? (
                      <div className="px-3.5 py-3 bg-warning-soft flex items-center justify-between gap-3 text-[12px]">
                        <div>
                          <span className="font-semibold text-warning block">
                            Target Not Reached ({monthlyClaims} / {sim.effectiveTarget})
                          </span>
                          <span className="text-[11px] text-ink-muted">
                            Provisional {formatINR(sim.forfeitedAmount)} releases once{" "}
                            {sim.effectiveTarget - monthlyClaims} more claims complete the base target.
                          </span>
                        </div>
                        <span className="font-bold tabular-nums text-warning shrink-0">₹0 Payable</span>
                      </div>
                    ) : (
                      <div className="px-3.5 py-3 bg-positive-soft/50 flex items-center justify-between gap-3 text-[12.5px]">
                        <div>
                          <span className="font-semibold text-positive block">
                            Base Target Qualified
                          </span>
                          <span className="text-[11px] text-ink-muted">
                            {monthlyClaims} / {sim.effectiveTarget} monthly claims completed
                          </span>
                        </div>
                        <span className="font-bold tabular-nums text-ink shrink-0">
                          {formatINR(sim.finalPayable)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}
