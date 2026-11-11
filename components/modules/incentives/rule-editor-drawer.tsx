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
  DEFAULT_SLABS_2W,
  DEFAULT_SLABS_4W,
  DEFAULT_SLABS_CW,
  VEHICLE_CATEGORIES,
  calculateDayClaimRewards,
  type CalculationMethod,
  type CombinationMode,
  type IncentiveRule,
  type IncentiveSlab,
  type RuleScope,
  type VehicleCategory,
} from "@/lib/incentives";
import { STATE_OPTIONS } from "@/lib/states";
import { useErrorNudge } from "@/lib/use-transient-state";

const SCOPE_OPTIONS = [
  { value: "exact_state", label: "Exact Vehicle + State Rule", hint: "Highest priority match for state-specific rates" },
  { value: "category_default", label: "Vehicle Category Default", hint: "Fallback when exact state rule is absent (if enabled)" },
  { value: "global_fallback", label: "Global Fallback Rule", hint: "Last-resort fallback across vehicles (if enabled)" },
];

const METHOD_OPTIONS = [
  { value: "fixed", label: "Method A — Fixed rate per eligible claim" },
  { value: "progressive_slab", label: "Method B — Progressive daily slabs (bracket tiers)" },
  { value: "final_slab", label: "Method C — Final slab rate (highest bracket for all day claims)" },
  { value: "combined", label: "Method D — Combined (Fixed + Slab formula)" },
];

const COMBO_OPTIONS = [
  { value: "fixed_plus_progressive", label: "Fixed base rate + Progressive daily slabs" },
  { value: "fixed_plus_final_slab", label: "Fixed base rate + Final slab rate" },
  { value: "fixed_plus_slab_bonus", label: "Fixed base rate + Daily tier bonus reward" },
];

type SlabDraft = { minClaims: string; maxClaims: string; ratePerClaim: string; bonusAmount: string };

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
  const [method, setMethod] = useState<CalculationMethod>("progressive_slab");
  const [fixedRate, setFixedRate] = useState("5");
  const [comboMode, setComboMode] = useState<CombinationMode>("fixed_plus_progressive");
  const [monthlyTarget, setMonthlyTarget] = useState("100");
  const [effectiveFrom, setEffectiveFrom] = useState("2026-01-01");
  const [effectiveUntil, setEffectiveUntil] = useState("");
  const [eligibleStatuses, setEligibleStatuses] = useState<string[]>(["approved"]);
  const [slabs, setSlabs] = useState<SlabDraft[]>([]);
  const [simDailyClaims, setSimDailyClaims] = useState("12");
  const [saving, setSaving] = useState(false);
  const { error, errorPulse, setError } = useErrorNudge();

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
      setComboMode(rule.combinationMode);
      setMonthlyTarget(String(rule.monthlyTarget));
      setEffectiveFrom(rule.effectiveFrom);
      setEffectiveUntil(rule.effectiveUntil ?? "");
      setEligibleStatuses(rule.eligibleClaimStatuses);
      setSlabs(
        rule.slabs.map((s) => ({
          minClaims: String(s.minClaims),
          maxClaims: s.maxClaims === null ? "" : String(s.maxClaims),
          ratePerClaim: String(s.ratePerClaim),
          bonusAmount: String(s.bonusAmount),
        })),
      );
    } else {
      const targetCat = defaultCategory;
      const defaults =
        targetCat === "4W" ? DEFAULT_SLABS_4W : targetCat === "CW" ? DEFAULT_SLABS_CW : DEFAULT_SLABS_2W;
      setRuleName(`${targetCat} State Rule`);
      setScope("exact_state");
      setCat(targetCat);
      setStateName("Gujarat");
      setIsActive(true);
      setMethod("progressive_slab");
      setFixedRate("5");
      setComboMode("fixed_plus_progressive");
      setMonthlyTarget(targetCat === "4W" ? "80" : targetCat === "CW" ? "60" : "100");
      setEffectiveFrom("2026-01-01");
      setEffectiveUntil("");
      setEligibleStatuses(["approved"]);
      setSlabs(
        defaults.map((s) => ({
          minClaims: String(s.minClaims),
          maxClaims: s.maxClaims === null ? "" : String(s.maxClaims),
          ratePerClaim: String(s.ratePerClaim),
          bonusAmount: String(s.bonusAmount),
        })),
      );
    }
    setError(null);
  }, [open, rule, defaultCategory]);

  const parsedSlabs: IncentiveSlab[] = useMemo(() => {
    return slabs
      .map((s, idx) => ({
        slabOrder: idx + 1,
        minClaims: Math.max(1, Math.floor(Number(s.minClaims) || 0)),
        maxClaims: s.maxClaims.trim() === "" ? null : Math.max(1, Math.floor(Number(s.maxClaims) || 0)),
        ratePerClaim: Math.max(0, Number(s.ratePerClaim) || 0),
        bonusAmount: Math.max(0, Number(s.bonusAmount) || 0),
      }))
      .filter((s) => s.minClaims >= 1 && (s.maxClaims === null || s.maxClaims >= s.minClaims));
  }, [slabs]);

  const simResult = useMemo(() => {
    const count = Math.max(0, Math.min(200, Math.floor(Number(simDailyClaims) || 0)));
    return calculateDayClaimRewards(
      {
        calculationMethod: method,
        fixedRate: Number(fixedRate) || 0,
        combinationMode: comboMode,
        slabs: parsedSlabs.length > 0 ? parsedSlabs : DEFAULT_SLABS_2W,
      },
      count,
    );
  }, [simDailyClaims, method, fixedRate, comboMode, parsedSlabs]);

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
        combinationMode: comboMode,
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

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={rule ? `Edit "${rule.ruleName}" (Creates v${rule.currentVersion + 1})` : "Create Incentive Rule"}
    >
      <form id={formId} onSubmit={handleSave} className="space-y-4">
        <div className="space-y-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-ink-muted">Rule Name</span>
            <input
              type="text"
              value={ruleName}
              onChange={(e) => setRuleName(e.target.value)}
              placeholder="e.g. Gujarat 2W Progressive Rule"
              required
              className={cn(CONTROL, "h-10")}
            />
          </label>

          <div className="space-y-1">
            <span className="text-xs font-medium text-ink-muted">Rule Scope</span>
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
                <span className="text-xs font-medium text-ink-muted">Vehicle Category</span>
                <CustomSelect
                  value={cat}
                  onChange={(v) => setCat(v as VehicleCategory)}
                  options={VEHICLE_CATEGORIES.map((v) => ({ value: v.key, label: v.label }))}
                  className="h-10 text-xs"
                />
              </div>

              {scope === "exact_state" && (
                <div className="reveal-down space-y-1">
                  <span className="text-xs font-medium text-ink-muted">Customer State</span>
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
              <span className="text-xs font-medium text-ink-muted">Effective From</span>
              <DatePicker value={effectiveFrom} onChange={setEffectiveFrom} />
            </div>
            <div className="space-y-1">
              <span className="text-xs font-medium text-ink-muted">Effective Until (Optional)</span>
              <DatePicker value={effectiveUntil} onChange={setEffectiveUntil} placeholder="Ongoing" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-ink-muted">Monthly Qualification Target</span>
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
              <span className="font-medium text-ink">Rule Active</span>
              <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="size-4" />
            </label>
          </div>
        </div>

        {/* Calculation Method Section */}
        <div className="space-y-3 rounded-tile border border-divider bg-surface-muted/35 p-3.5">
          <div className="space-y-1">
            <span className="text-xs font-medium text-ink-muted">Daily Calculation Method</span>
            <CustomSelect
              value={method}
              onChange={(v) => setMethod(v as CalculationMethod)}
              options={METHOD_OPTIONS}
              className="h-10 text-xs"
            />
          </div>

          {(method === "fixed" || method === "combined") && (
            <label className="reveal-down flex flex-col gap-1">
              <span className="text-xs font-medium text-ink-muted">Fixed Amount per Claim (₹)</span>
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

          {method === "combined" && (
            <div className="reveal-down space-y-1">
              <span className="text-xs font-medium text-ink-muted">Combined Formula</span>
              <CustomSelect
                value={comboMode}
                onChange={(v) => setComboMode(v as CombinationMode)}
                options={COMBO_OPTIONS}
                className="h-10 text-xs"
              />
            </div>
          )}
        </div>

        {/* Daily Slabs Table */}
        {method !== "fixed" && (
          <div className="reveal-down space-y-2 border-t border-divider pt-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                  Daily Slab Tiers
                </h3>
                <p className="text-[11px] text-ink-faint">
                  Reset every working day. Leave "To" blank for open upper range (e.g. 21+).
                </p>
              </div>
              <Button
                variant="secondary"
                onClick={() =>
                  setSlabs((prev) => {
                    const last = prev[prev.length - 1];
                    const nextMin = last?.maxClaims ? Number(last.maxClaims) + 1 : (Number(last?.minClaims) || 0) + 5;
                    return [
                      ...prev,
                      {
                        minClaims: String(nextMin),
                        maxClaims: "",
                        ratePerClaim: String((Number(last?.ratePerClaim) || 4) + 1),
                        bonusAmount: "0",
                      },
                    ];
                  })
                }
                className="h-8 px-2.5 text-xs"
              >
                <Plus size={13} /> Add Slab
              </Button>
            </div>

            <div className="space-y-2">
              <div className="grid grid-cols-12 gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-ink-muted px-1">
                <span className="col-span-3">From</span>
                <span className="col-span-3">To (blank=+)</span>
                <span className="col-span-3">Rate ₹/claim</span>
                <span className="col-span-2">Bonus ₹</span>
                <span className="col-span-1" />
              </div>

              {slabs.map((slab, idx) => (
                <div key={idx} className="reveal-down grid grid-cols-12 items-center gap-1.5">
                  <input
                    type="number"
                    min={1}
                    value={slab.minClaims}
                    onChange={(e) =>
                      setSlabs((p) => p.map((r, i) => (i === idx ? { ...r, minClaims: e.target.value } : r)))
                    }
                    className={cn(CONTROL, "col-span-3 h-9 px-2 text-xs tabular-nums")}
                  />
                  <input
                    type="number"
                    min={1}
                    placeholder="∞"
                    value={slab.maxClaims}
                    onChange={(e) =>
                      setSlabs((p) => p.map((r, i) => (i === idx ? { ...r, maxClaims: e.target.value } : r)))
                    }
                    className={cn(CONTROL, "col-span-3 h-9 px-2 text-xs tabular-nums")}
                  />
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={slab.ratePerClaim}
                    onChange={(e) =>
                      setSlabs((p) => p.map((r, i) => (i === idx ? { ...r, ratePerClaim: e.target.value } : r)))
                    }
                    className={cn(CONTROL, "col-span-3 h-9 px-2 text-xs tabular-nums")}
                  />
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={slab.bonusAmount}
                    onChange={(e) =>
                      setSlabs((p) => p.map((r, i) => (i === idx ? { ...r, bonusAmount: e.target.value } : r)))
                    }
                    className={cn(CONTROL, "col-span-2 h-9 px-2 text-xs tabular-nums")}
                  />
                  {slabs.length > 1 ? (
                    <button
                      type="button"
                      onClick={() => setSlabs((p) => p.filter((_, i) => i !== idx))}
                      aria-label="Remove slab"
                      className="col-span-1 grid size-8 place-items-center rounded-control text-ink-muted hover:bg-negative-soft hover:text-negative"
                    >
                      <Trash2 size={13} />
                    </button>
                  ) : (
                    <span className="col-span-1" />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Daily Simulator Preview */}
        <div className="space-y-2.5 rounded-tile border border-divider bg-surface p-3.5 text-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="font-semibold text-ink">Day Formula Preview</span>
            <span key={simResult.dayTotal} className="check-pop inline-flex">
              <Chip tone="accent">{formatINR(simResult.dayTotal)} provisional</Chip>
            </span>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="flex items-center gap-2 text-[11px] text-ink-muted">
              Sample day claims:
              <input
                type="number"
                min={0}
                max={200}
                value={simDailyClaims}
                onChange={(e) => setSimDailyClaims(e.target.value)}
                className={cn(CONTROL, "h-8 w-16 px-2 text-xs tabular-nums")}
              />
            </label>
            <div className="inline-flex items-center gap-1">
              {["5", "10", "15", "25"].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setSimDailyClaims(preset)}
                  className={cn(
                    "h-7 rounded-control border px-2 text-[11px] font-medium tabular-nums transition-all duration-150 active:scale-[0.97]",
                    simDailyClaims === preset
                      ? "border-ink bg-ink text-white"
                      : "border-divider bg-surface-strong text-ink-muted hover:border-ink/30 hover:text-ink",
                  )}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>
          <p className="text-[11px] text-ink-muted">{simResult.summaryLabel}</p>
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
            {rule ? `Save New Version (v${rule.currentVersion + 1})` : "Create Rule (v1)"}
          </Button>
        </DrawerFooter>
      </form>
    </Drawer>
  );
}
