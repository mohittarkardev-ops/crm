"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { CustomSelect } from "@/components/ui/custom-select";
import { DatePicker } from "@/components/ui/date-picker";
import { Drawer, DrawerFooter } from "@/components/ui/drawer";
import { CONTROL } from "@/components/ui/field";
import { toast } from "@/components/ui/toaster";
import { saveIncentiveRule } from "@/lib/actions/incentives";
import { cn } from "@/lib/cn";
import { formatINR } from "@/lib/format";
import {
  VEHICLE_CATEGORIES,
  calculateDayClaimRewards,
  simulateRulePayout,
  type CalculationMethod,
  type CombinationMode,
  type IncentiveRule,
  type IncentiveSlab,
  type MonthlyMilestoneTier,
  type RuleScope,
  type VehicleCategory,
} from "@/lib/incentives";
import { STATE_OPTIONS } from "@/lib/states";
import { useErrorNudge } from "@/lib/use-transient-state";

const SCOPE_OPTIONS = [
  { value: "exact_state", label: "Vehicle + State", hint: "Applies to one vehicle type in one state" },
  { value: "category_default", label: "Vehicle Default", hint: "Applies to all states for this vehicle type" },
  { value: "global_fallback", label: "All Vehicles & States", hint: "Used when no specific rule matches" },
];

const CORE_METHOD_OPTIONS = [
  { value: "fixed", label: "Fixed Rate", hint: "Same ₹ amount for every claim" },
  { value: "milestone", label: "Milestone", hint: "Fixed payout on reaching claim steps (e.g. 2 → ₹30, 4 → ₹60)" },
  { value: "combined", label: "Combined (Fixed + Milestone)", hint: "Per-claim rate plus extra bonus at milestones" },
];

type StepDraft = { minClaims: string; reward: string };
type MonthlyMilestoneDraft = { minClaims: string; rewardAmount: string };

export function RuleEditorDrawer({
  open,
  rule,
  defaultCategory = "2W",
  onClose,
}: {
  open: boolean;
  rule: IncentiveRule | null;
  defaultCategory?: VehicleCategory;
  onClose: () => void;
}) {
  const formId = useId();
  const [ruleName, setRuleName] = useState("");
  const [scope, setScope] = useState<RuleScope>("exact_state");
  const [cat, setCat] = useState<VehicleCategory>(defaultCategory);
  const [stateName, setStateName] = useState("Gujarat");
  const [isActive, setIsActive] = useState(true);
  const [method, setMethod] = useState<CalculationMethod>("fixed");
  const [fixedRate, setFixedRate] = useState("10");
  const [comboMode, setComboMode] = useState<CombinationMode>("fixed_plus_slab_bonus");
  const [monthlyTarget, setMonthlyTarget] = useState("60");
  const [effectiveFrom, setEffectiveFrom] = useState("2026-01-01");
  const [effectiveUntil, setEffectiveUntil] = useState("");
  const [eligibleStatuses, setEligibleStatuses] = useState<string[]>(["approved"]);
  const [steps, setSteps] = useState<StepDraft[]>([{ minClaims: "", reward: "" }]);
  const [monthlyMilestones, setMonthlyMilestones] = useState<MonthlyMilestoneDraft[]>([]);
  const [simDailyClaims, setSimDailyClaims] = useState("4");
  const [simWorkingDays, setSimWorkingDays] = useState("20");
  const [saving, setSaving] = useState(false);
  const { error, errorPulse, setError } = useErrorNudge();

  const methodOptions = useMemo(() => {
    if (rule && (rule.calculationMethod === "progressive_slab" || rule.calculationMethod === "final_slab")) {
      return [
        ...CORE_METHOD_OPTIONS,
        {
          value: rule.calculationMethod,
          label: rule.calculationMethod === "progressive_slab" ? "Legacy Progressive" : "Legacy Final Tier",
        },
      ];
    }
    return CORE_METHOD_OPTIONS;
  }, [rule]);

  useEffect(() => {
    if (!open) return;
    if (rule) {
      setRuleName(rule.ruleName);
      setScope(rule.scope);
      setCat(rule.vehicleCategory ?? "2W");
      setStateName(rule.stateName ?? "Gujarat");
      setIsActive(rule.isActive);
      setMethod(rule.calculationMethod);
      setFixedRate(String(rule.fixedRate));
      setComboMode(
        rule.calculationMethod === "combined" ? "fixed_plus_slab_bonus" : rule.combinationMode,
      );
      setMonthlyTarget(String(rule.monthlyTarget));
      setEffectiveFrom(rule.effectiveFrom);
      setEffectiveUntil(rule.effectiveUntil ?? "");
      setEligibleStatuses(rule.eligibleClaimStatuses);
      setSteps(
        rule.slabs.length > 0
          ? rule.slabs.map((s) => ({
              minClaims: String(s.minClaims),
              reward: String(s.bonusAmount > 0 ? s.bonusAmount : s.ratePerClaim),
            }))
          : [{ minClaims: "", reward: "" }],
      );
      setMonthlyMilestones(
        (rule.monthlyMilestones ?? []).map((m) => ({
          minClaims: String(m.minClaims),
          rewardAmount: String(m.rewardAmount),
        })),
      );
      setSimDailyClaims("4");
    } else {
      const targetCat = defaultCategory;
      setRuleName(`${targetCat} Rule`);
      setScope("exact_state");
      setCat(targetCat);
      setStateName("Gujarat");
      setIsActive(true);
      setMethod("fixed");
      setFixedRate("10");
      setComboMode("fixed_plus_slab_bonus");
      setMonthlyTarget("60");
      setEffectiveFrom("2026-01-01");
      setEffectiveUntil("");
      setEligibleStatuses(["approved"]);
      setSteps([{ minClaims: "", reward: "" }]);
      setMonthlyMilestones([]);
      setSimDailyClaims("4");
    }
    setError(null);
  }, [open, rule, defaultCategory, setError]);

  const parsedSlabs: IncentiveSlab[] = useMemo(() => {
    return steps
      .map((s, idx) => {
        const minClaims = Math.max(0, Math.floor(Number(s.minClaims) || 0));
        const reward = Math.max(0, Number(s.reward) || 0);
        return {
          slabOrder: idx + 1,
          minClaims,
          maxClaims: null,
          ratePerClaim: reward,
          bonusAmount: method === "combined" ? reward : 0,
        };
      })
      .filter((s) => s.minClaims >= 1);
  }, [steps, method]);

  const parsedMonthlyMilestones: MonthlyMilestoneTier[] = useMemo(() => {
    return monthlyMilestones
      .map((m) => ({
        minClaims: Math.max(0, Math.floor(Number(m.minClaims) || 0)),
        rewardAmount: Math.max(0, Number(m.rewardAmount) || 0),
      }))
      .filter((m) => m.minClaims >= 1);
  }, [monthlyMilestones]);

  const effectiveComboMode: CombinationMode =
    method === "combined" && rule?.calculationMethod === "combined" && parsedSlabs.length === 0
      ? comboMode
      : "fixed_plus_slab_bonus";

  const simResult = useMemo(() => {
    const count = Math.max(0, Math.min(200, Math.floor(Number(simDailyClaims) || 0)));
    return calculateDayClaimRewards(
      {
        calculationMethod: method,
        fixedRate: Number(fixedRate) || 0,
        combinationMode: effectiveComboMode,
        slabs: parsedSlabs,
      },
      count,
    );
  }, [simDailyClaims, method, fixedRate, effectiveComboMode, parsedSlabs]);

  const monthlySimResult = useMemo(() => {
    const dayClaims = Math.max(0, Math.min(200, Math.floor(Number(simDailyClaims) || 0)));
    const days = Math.max(1, Math.min(31, Math.floor(Number(simWorkingDays) || 20)));
    return simulateRulePayout({
      rule: {
        calculationMethod: method,
        fixedRate: Number(fixedRate) || 0,
        combinationMode: effectiveComboMode,
        slabs: parsedSlabs,
        monthlyTarget: Math.max(0, Math.floor(Number(monthlyTarget) || 0)),
        monthlyMilestones: parsedMonthlyMilestones,
      },
      workingDays: days,
      monthlyClaims: dayClaims * days,
    });
  }, [simDailyClaims, simWorkingDays, method, fixedRate, effectiveComboMode, parsedSlabs, monthlyTarget, parsedMonthlyMilestones]);

  const handleMethodChange = (nextMethod: CalculationMethod) => {
    setMethod(nextMethod);
    if (nextMethod === "combined") {
      setComboMode("fixed_plus_slab_bonus");
    }
    if ((nextMethod === "milestone" || nextMethod === "combined") && steps.length === 0) {
      setSteps([{ minClaims: "", reward: "" }]);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await saveIncentiveRule({
        id: rule?.id,
        ruleName,
        scope,
        vehicleCategory: scope === "global_fallback" ? null : cat,
        stateName: scope === "exact_state" ? stateName : null,
        isActive,
        calculationMethod: method,
        fixedRate: Number(fixedRate) || 0,
        combinationMode: effectiveComboMode,
        monthlyTarget: Math.max(0, Math.floor(Number(monthlyTarget) || 0)),
        eligibleClaimStatuses: eligibleStatuses,
        effectiveFrom,
        effectiveUntil: effectiveUntil || null,
        slabs: parsedSlabs.map((s) => ({
          minClaims: s.minClaims,
          maxClaims: s.maxClaims,
          ratePerClaim: s.ratePerClaim,
          bonusAmount: s.bonusAmount,
        })),
        monthlyMilestones: parsedMonthlyMilestones,
      });
      if (res.ok) {
        toast(res.message ?? "Saved rule.");
        onClose();
      } else {
        setError(res.error ?? "Could not save rule.");
      }
    } finally {
      setSaving(false);
    }
  };

  const showStepBuilder = method === "milestone" || method === "combined";

  return (
    <Drawer open={open} onClose={onClose} title={rule ? `Edit Rule — ${rule.ruleName}` : "New Incentive Rule"}>
      <form id={formId} onSubmit={handleSave} className="space-y-4">
        <div className="space-y-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-ink-muted">Rule Name</span>
            <input
              type="text"
              value={ruleName}
              onChange={(e) => setRuleName(e.target.value)}
              placeholder="e.g. Gujarat 2W Rule"
              required
              className={cn(CONTROL, "h-10")}
            />
          </label>

          <div className="space-y-1">
            <span className="text-xs font-medium text-ink-muted">Applies To</span>
            <CustomSelect
              value={scope}
              onChange={(v) => setScope(v as RuleScope)}
              options={SCOPE_OPTIONS}
              className="h-10 text-xs"
            />
          </div>

          {scope !== "global_fallback" && (
            <div className="reveal-down grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <span className="text-xs font-medium text-ink-muted">Vehicle Type</span>
                <CustomSelect
                  value={cat}
                  onChange={(v) => setCat(v as VehicleCategory)}
                  options={VEHICLE_CATEGORIES.map((v) => ({ value: v.key, label: v.label }))}
                  className="h-10 text-xs"
                />
              </div>

              {scope === "exact_state" && (
                <div className="reveal-down space-y-1">
                  <span className="text-xs font-medium text-ink-muted">State</span>
                  <CustomSelect
                    value={stateName}
                    onChange={setStateName}
                    options={STATE_OPTIONS}
                    searchable
                    className="h-10 text-xs"
                  />
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <span className="text-xs font-medium text-ink-muted">Start Date</span>
              <DatePicker value={effectiveFrom} onChange={setEffectiveFrom} />
            </div>
            <div className="space-y-1">
              <span className="text-xs font-medium text-ink-muted">End Date (Optional)</span>
              <DatePicker value={effectiveUntil} onChange={setEffectiveUntil} placeholder="Ongoing" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-ink-muted">Monthly Target (Claims)</span>
              <input
                type="number"
                min={0}
                max={50000}
                value={monthlyTarget}
                onChange={(e) => setMonthlyTarget(e.target.value)}
                className={cn(CONTROL, "h-10 tabular-nums")}
              />
            </label>

            <label className="flex cursor-pointer items-center justify-between gap-2 rounded-control border border-divider bg-surface-muted/35 px-3 py-2 text-xs self-end h-10">
              <span className="font-medium text-ink">Active</span>
              <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="size-4" />
            </label>
          </div>
        </div>

        {/* Calculation Method */}
        <div className="space-y-3 rounded-tile border border-divider bg-surface-muted/35 p-3.5">
          <div className="space-y-1">
            <span className="text-xs font-medium text-ink-muted">Calculation Method</span>
            <CustomSelect
              value={method}
              onChange={(v) => handleMethodChange(v as CalculationMethod)}
              options={methodOptions}
              className="h-10 text-xs"
            />
          </div>

          {(method === "fixed" || method === "combined") && (
            <label className="reveal-down flex flex-col gap-1">
              <span className="text-xs font-medium text-ink-muted">
                Rate per Claim (₹){method === "fixed" ? " — use 0 if paying only by monthly milestone" : ""}
              </span>
              <input
                type="number"
                min={0}
                step="any"
                value={fixedRate}
                onChange={(e) => setFixedRate(e.target.value)}
                className={cn(CONTROL, "h-9 tabular-nums")}
              />
            </label>
          )}
        </div>

        {/* Daily Milestones (used for Milestone & Combined) */}
        {showStepBuilder && (
          <div className="reveal-down space-y-2 border-t border-divider pt-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h3 className="text-xs font-semibold text-ink">
                  {method === "combined" ? "Daily Milestone Bonuses (Added on top of fixed rate)" : "Daily Milestones"}
                </h3>
                <p className="text-[11px] text-ink-faint">
                  {method === "combined"
                    ? "Optional extra payout when daily claims reach a count (e.g. 4 claims → +₹30)."
                    : "Fixed day payout once claims reach a step (e.g. 2 claims → ₹30, stays ₹30 at 3, jumps at 4)."}
                </p>
              </div>
              <Button
                variant="secondary"
                onClick={() => setSteps((prev) => [...prev, { minClaims: "", reward: "" }])}
                className="h-8 shrink-0 px-2.5 text-xs"
              >
                <Plus size={13} /> Add Step
              </Button>
            </div>

            <div className="space-y-2">
              <div className="grid grid-cols-12 gap-2 px-1 text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
                <span className="col-span-5">Claims Reached</span>
                <span className="col-span-6">{method === "combined" ? "Extra Bonus (₹)" : "Day Payout (₹)"}</span>
                <span className="col-span-1" />
              </div>

              {steps.map((step, idx) => (
                <div key={idx} className="reveal-down grid grid-cols-12 items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    placeholder="e.g. 2"
                    value={step.minClaims}
                    onChange={(e) =>
                      setSteps((p) => p.map((r, i) => (i === idx ? { ...r, minClaims: e.target.value } : r)))
                    }
                    className={cn(CONTROL, "col-span-5 h-9 px-2.5 text-xs tabular-nums")}
                  />
                  <input
                    type="number"
                    min={0}
                    step="any"
                    placeholder="e.g. 30"
                    value={step.reward}
                    onChange={(e) =>
                      setSteps((p) => p.map((r, i) => (i === idx ? { ...r, reward: e.target.value } : r)))
                    }
                    className={cn(CONTROL, "col-span-6 h-9 px-2.5 text-xs tabular-nums")}
                  />
                  <button
                    type="button"
                    onClick={() => setSteps((p) => p.filter((_, i) => i !== idx))}
                    aria-label="Remove step"
                    className="col-span-1 grid size-8 place-items-center rounded-control text-ink-muted hover:bg-negative-soft hover:text-negative"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Monthly Milestones (Optional) */}
        <div className="space-y-2 border-t border-divider pt-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="text-xs font-semibold text-ink">Monthly Milestone Bonuses (Optional)</h3>
              <p className="text-[11px] text-ink-faint">
                Extra month-end payout on top of daily earnings (e.g. 60 claims → ₹500).
              </p>
            </div>
            <Button
              variant="secondary"
              onClick={() => setMonthlyMilestones((prev) => [...prev, { minClaims: "", rewardAmount: "" }])}
              className="h-8 shrink-0 px-2.5 text-xs"
            >
              <Plus size={13} /> Add Tier
            </Button>
          </div>

          {monthlyMilestones.length > 0 && (
            <div className="space-y-2">
              <div className="grid grid-cols-12 gap-2 px-1 text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
                <span className="col-span-5">Monthly Claims</span>
                <span className="col-span-6">Bonus (₹)</span>
                <span className="col-span-1" />
              </div>
              {monthlyMilestones.map((mm, idx) => (
                <div key={idx} className="reveal-down grid grid-cols-12 items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    placeholder="e.g. 60"
                    value={mm.minClaims}
                    onChange={(e) =>
                      setMonthlyMilestones((p) => p.map((r, i) => (i === idx ? { ...r, minClaims: e.target.value } : r)))
                    }
                    className={cn(CONTROL, "col-span-5 h-9 px-2.5 text-xs tabular-nums")}
                  />
                  <input
                    type="number"
                    min={0}
                    step="any"
                    placeholder="e.g. 500"
                    value={mm.rewardAmount}
                    onChange={(e) =>
                      setMonthlyMilestones((p) => p.map((r, i) => (i === idx ? { ...r, rewardAmount: e.target.value } : r)))
                    }
                    className={cn(CONTROL, "col-span-6 h-9 px-2.5 text-xs tabular-nums")}
                  />
                  <button
                    type="button"
                    onClick={() => setMonthlyMilestones((p) => p.filter((_, i) => i !== idx))}
                    aria-label="Remove tier"
                    className="col-span-1 grid size-8 place-items-center rounded-control text-ink-muted hover:bg-negative-soft hover:text-negative"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Simple Quick Check */}
        <div className="space-y-2 rounded-tile border border-divider bg-surface p-3 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-semibold text-ink">Quick Preview</span>
            <div className="flex items-center gap-1.5">
              <Chip tone="accent">{formatINR(simResult.dayTotal)} / day</Chip>
              <Chip tone={monthlySimResult.targetAchieved ? "positive" : "warning"}>
                {formatINR(monthlySimResult.finalPayable)} / month
              </Chip>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <label className="flex items-center justify-between gap-2 text-[11px] text-ink-muted">
              <span>Claims / day</span>
              <input
                type="number"
                min={0}
                max={200}
                value={simDailyClaims}
                onChange={(e) => setSimDailyClaims(e.target.value)}
                className={cn(CONTROL, "h-8 w-20 px-2 text-xs tabular-nums")}
              />
            </label>
            <label className="flex items-center justify-between gap-2 text-[11px] text-ink-muted">
              <span>Working days</span>
              <input
                type="number"
                min={1}
                max={31}
                value={simWorkingDays}
                onChange={(e) => setSimWorkingDays(e.target.value)}
                className={cn(CONTROL, "h-8 w-20 px-2 text-xs tabular-nums")}
              />
            </label>
          </div>

          <p className="text-[11px] text-ink-muted">
            {monthlySimResult.monthlyClaims} claims in month: {formatINR(monthlySimResult.dailyTotalEarnings)} daily
            {monthlySimResult.monthlyMilestoneBonus > 0
              ? ` + ${formatINR(monthlySimResult.monthlyMilestoneBonus)} monthly bonus`
              : ""}
            {!monthlySimResult.targetAchieved ? ` (below target ${monthlySimResult.effectiveTarget})` : ""}
          </p>
        </div>

        {error && (
          <p key={errorPulse} role="alert" className="micro-shake rounded-tile bg-negative-soft p-3 text-xs text-negative">
            {error}
          </p>
        )}

        <DrawerFooter>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form={formId} loading={saving}>
            {rule ? "Save Rule" : "Create Rule"}
          </Button>
        </DrawerFooter>
      </form>
    </Drawer>
  );
}
