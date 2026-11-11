"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { CustomSelect } from "@/components/ui/custom-select";
import { Drawer, DrawerFooter } from "@/components/ui/drawer";
import { CONTROL } from "@/components/ui/field";
import { toast } from "@/components/ui/toaster";
import { saveIncentiveRule } from "@/lib/actions/incentives";
import { cn } from "@/lib/cn";
import { formatINR } from "@/lib/format";
import {
  PAYOUT_MODE_LABELS,
  VEHICLE_CATEGORIES,
  WEEKDAYS,
  simulateRulePayout,
  type IncentiveRule,
  type IncentiveSlab,
  type PayoutMode,
  type VehicleCategory,
} from "@/lib/incentives";

const MODE_OPTIONS = [
  {
    value: "flat_slab",
    label: "Flat slab bonus",
    hint: "Pays the rupee reward of the highest slab reached once monthly minimum X is met.",
  },
  {
    value: "per_payment",
    label: "Rate per payment",
    hint: "Multiplies approved payments by the rupee rate of the highest slab reached.",
  },
  {
    value: "per_bundle",
    label: "Per bundle step",
    hint: "Pays per step of the first slab (e.g. every 20 payments = ₹100) once minimum X is met.",
  },
];

export function RuleEditorDrawer({
  open,
  initialCategory,
  rules,
  onClose,
}: {
  open: boolean;
  initialCategory: VehicleCategory;
  rules: Record<VehicleCategory, IncentiveRule>;
  onClose: () => void;
}) {
  const formId = useId();
  const [cat, setCat] = useState<VehicleCategory>(initialCategory);
  const [isActive, setIsActive] = useState(true);
  const [payoutMode, setPayoutMode] = useState<PayoutMode>("flat_slab");
  const [monthlyMin, setMonthlyMin] = useState("60");
  const [dailyTarget, setDailyTarget] = useState("2");
  const [dailyBonus, setDailyBonus] = useState("0");
  const [dailyForfeit, setDailyForfeit] = useState("50");
  const [workingDays, setWorkingDays] = useState<number[]>([1, 2, 3, 4, 5, 6]);
  const [slabs, setSlabs] = useState<{ minPayments: string; amount: string }[]>([]);
  const [simPayments, setSimPayments] = useState("60");
  const [simMissedDays, setSimMissedDays] = useState("2");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCategory = (target: VehicleCategory) => {
    const r = rules[target];
    setCat(target);
    setIsActive(r.isActive);
    setPayoutMode(r.payoutMode);
    setMonthlyMin(String(r.monthlyMinPayments));
    setDailyTarget(String(r.dailyTarget));
    setDailyBonus(String(r.dailyBonusAmount));
    setDailyForfeit(String(r.dailyForfeitAmount));
    setWorkingDays([...r.workingDays]);
    setSlabs(r.slabs.map((s) => ({ minPayments: String(s.minPayments), amount: String(s.amount) })));
    setSimPayments(String(Math.max(r.monthlyMinPayments, r.slabs[0]?.minPayments ?? 20)));
    setError(null);
  };

  useEffect(() => {
    if (open) loadCategory(initialCategory);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialCategory]);

  const draftRule: IncentiveRule = useMemo(() => {
    const parsedSlabs: IncentiveSlab[] = slabs
      .map((s) => ({ minPayments: Math.floor(Number(s.minPayments)), amount: Number(s.amount) }))
      .filter((s) => Number.isFinite(s.minPayments) && s.minPayments >= 1 && Number.isFinite(s.amount) && s.amount >= 0);

    return {
      vehicleCategory: cat,
      isActive,
      payoutMode,
      monthlyMinPayments: Math.max(0, Math.floor(Number(monthlyMin) || 0)),
      dailyTarget: Math.max(0, Math.floor(Number(dailyTarget) || 0)),
      dailyBonusAmount: Math.max(0, Number(dailyBonus) || 0),
      dailyForfeitAmount: Math.max(0, Number(dailyForfeit) || 0),
      workingDays,
      slabs: parsedSlabs.length > 0 ? parsedSlabs : [{ minPayments: 1, amount: 0 }],
    };
  }, [cat, isActive, payoutMode, monthlyMin, dailyTarget, dailyBonus, dailyForfeit, workingDays, slabs]);

  const isDirty = useMemo(() => {
    if (!open) return false;
    const orig = rules[cat];
    return (
      orig.isActive !== isActive ||
      orig.payoutMode !== payoutMode ||
      String(orig.monthlyMinPayments) !== monthlyMin ||
      String(orig.dailyTarget) !== dailyTarget ||
      String(orig.dailyBonusAmount) !== dailyBonus ||
      String(orig.dailyForfeitAmount) !== dailyForfeit ||
      orig.workingDays.join(",") !== [...workingDays].sort((a, b) => a - b).join(",") ||
      JSON.stringify(orig.slabs.map((s) => `${s.minPayments}:${s.amount}`)) !==
        JSON.stringify(slabs.map((s) => `${Number(s.minPayments)}:${Number(s.amount)}`))
    );
  }, [open, rules, cat, isActive, payoutMode, monthlyMin, dailyTarget, dailyBonus, dailyForfeit, workingDays, slabs]);

  const simCount = Math.max(0, Math.floor(Number(simPayments) || 0));
  const simMissed = Math.max(0, Math.floor(Number(simMissedDays) || 0));
  const simCompleted = Math.max(0, 26 - simMissed);
  const sim = simulateRulePayout(draftRule, simCount, simCompleted, simMissed);

  const toggleDay = (d: number) => {
    setWorkingDays((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort((a, b) => a - b),
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await saveIncentiveRule({
        vehicleCategory: cat,
        isActive,
        payoutMode,
        monthlyMinPayments: Number(monthlyMin),
        dailyTarget: Number(dailyTarget),
        dailyBonusAmount: Number(dailyBonus),
        dailyForfeitAmount: Number(dailyForfeit),
        workingDays,
        slabs: slabs.map((s) => ({ minPayments: Number(s.minPayments), amount: Number(s.amount) })),
      });
      if (res.ok) {
        toast(res.message ?? "Rule saved.");
        onClose();
      } else {
        setError(res.error ?? "Could not save incentive rule.");
      }
    } catch {
      setError("Could not save rule. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer open={open} onClose={onClose} dirty={isDirty} title="Configure Incentive Rules">
      <form id={formId} onSubmit={handleSave} className="space-y-5">
        {/* Category Switcher */}
        <div className="grid grid-cols-3 gap-1.5 rounded-control border border-divider bg-surface-muted p-1">
          {VEHICLE_CATEGORIES.map((v) => (
            <button
              key={v.key}
              type="button"
              onClick={() => loadCategory(v.key)}
              className={cn(
                "h-8 rounded-[4px] text-xs font-semibold transition-colors",
                cat === v.key ? "bg-ink text-white" : "text-ink-muted hover:text-ink",
              )}
            >
              {v.shortLabel} Rules
            </button>
          ))}
        </div>

        {/* Status & Payout Mode */}
        <div className="space-y-3 rounded-tile border border-divider bg-surface-muted/35 p-3.5">
          <label className="flex cursor-pointer items-center justify-between gap-2 text-xs">
            <span className="font-semibold text-ink">Enable {cat} incentive calculation</span>
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="size-4 accent-[var(--text)]"
            />
          </label>

          <div className="space-y-1">
            <span className="text-xs font-medium text-ink-muted">Slab calculation method</span>
            <CustomSelect
              value={payoutMode}
              onChange={(val) => setPayoutMode((val as PayoutMode) || "flat_slab")}
              options={MODE_OPTIONS}
              className="h-10 text-xs font-medium"
            />
          </div>
        </div>

        {/* Thresholds & Daily Forfeit / Bonus */}
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-ink-muted">Monthly minimum (X)</span>
            <input
              type="number"
              min={0}
              max={10000}
              value={monthlyMin}
              onChange={(e) => setMonthlyMin(e.target.value)}
              className={cn(CONTROL, "h-10 tabular-nums")}
            />
            <span className="text-[11px] text-ink-faint">Must reach this count to unlock slab payout</span>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-ink-muted">Daily target / day</span>
            <input
              type="number"
              min={0}
              max={500}
              value={dailyTarget}
              onChange={(e) => setDailyTarget(e.target.value)}
              className={cn(CONTROL, "h-10 tabular-nums")}
            />
            <span className="text-[11px] text-ink-faint">0 disables daily missed check</span>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-ink-muted">Per-day bonus (₹)</span>
            <input
              type="number"
              min={0}
              value={dailyBonus}
              onChange={(e) => setDailyBonus(e.target.value)}
              className={cn(CONTROL, "h-10 tabular-nums")}
            />
            <span className="text-[11px] text-ink-faint">Earned on met days, missed if below target</span>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-ink-muted">Missed-day loss (₹)</span>
            <input
              type="number"
              min={0}
              value={dailyForfeit}
              onChange={(e) => setDailyForfeit(e.target.value)}
              className={cn(CONTROL, "h-10 tabular-nums")}
            />
            <span className="text-[11px] text-ink-faint">Deducted per missed working day</span>
          </label>
        </div>

        {/* Working Weekdays */}
        <div className="space-y-1.5">
          <span className="text-xs font-medium text-ink-muted">Working days evaluated</span>
          <div className="flex flex-wrap gap-1.5">
            {WEEKDAYS.map((day) => {
              const active = workingDays.includes(day.value);
              return (
                <button
                  key={day.value}
                  type="button"
                  onClick={() => toggleDay(day.value)}
                  className={cn(
                    "h-8 rounded-control border px-2.5 text-xs font-medium transition-colors",
                    active
                      ? "border-ink bg-ink text-white"
                      : "border-divider bg-surface-strong text-ink-muted hover:text-ink",
                  )}
                >
                  {day.short}
                </button>
              );
            })}
          </div>
          <p className="text-[11px] text-ink-faint">Unchecked days (like Sunday) and holidays never penalize CSEs.</p>
        </div>

        {/* Slabs Builder */}
        <div className="space-y-2.5 border-t border-divider pt-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                Payment Slabs ({cat})
              </h3>
              <p className="text-[11px] text-ink-faint">
                {PAYOUT_MODE_LABELS[payoutMode]} tiers ordered by payment count
              </p>
            </div>
            <Button
              variant="secondary"
              onClick={() =>
                setSlabs((prev) => [
                  ...prev,
                  {
                    minPayments: String((Number(prev[prev.length - 1]?.minPayments) || 0) + 20),
                    amount: String((Number(prev[prev.length - 1]?.amount) || 0) + 150),
                  },
                ])
              }
              className="h-8 px-2.5 text-xs"
            >
              <Plus size={13} />
              Add slab
            </Button>
          </div>

          <div className="space-y-2">
            {slabs.map((slab, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <div className="flex-1">
                  <input
                    type="number"
                    min={1}
                    placeholder="Payments (e.g. 20)"
                    value={slab.minPayments}
                    onChange={(e) =>
                      setSlabs((prev) =>
                        prev.map((row, i) => (i === idx ? { ...row, minPayments: e.target.value } : row)),
                      )
                    }
                    aria-label="Slab minimum payments"
                    className={cn(CONTROL, "h-9 text-xs tabular-nums")}
                  />
                </div>
                <span className="text-xs text-ink-faint">→ ₹</span>
                <div className="flex-1">
                  <input
                    type="number"
                    min={0}
                    placeholder="Incentive ₹"
                    value={slab.amount}
                    onChange={(e) =>
                      setSlabs((prev) =>
                        prev.map((row, i) => (i === idx ? { ...row, amount: e.target.value } : row)),
                      )
                    }
                    aria-label="Slab incentive amount"
                    className={cn(CONTROL, "h-9 text-xs tabular-nums")}
                  />
                </div>
                {slabs.length > 1 && (
                  <button
                    type="button"
                    aria-label="Remove slab"
                    onClick={() => setSlabs((prev) => prev.filter((_, i) => i !== idx))}
                    className="grid size-9 shrink-0 place-items-center rounded-control text-ink-muted hover:bg-negative-soft hover:text-negative"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Live Rule Preview Calculator */}
        <div className="space-y-2 rounded-tile border border-divider bg-surface p-3.5 text-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="font-semibold text-ink">Rule Preview Simulator</span>
            <Chip tone={sim.qualified ? "positive" : "warning"}>
              {sim.qualified ? "Unlocked" : `Need ${sim.neededForMin} more`}
            </Chip>
          </div>
          <div className="grid grid-cols-2 gap-2 pt-1">
            <label className="text-[11px] text-ink-muted">
              Sample payments
              <input
                type="number"
                min={0}
                value={simPayments}
                onChange={(e) => setSimPayments(e.target.value)}
                className={cn(CONTROL, "mt-1 h-8 text-xs tabular-nums")}
              />
            </label>
            <label className="text-[11px] text-ink-muted">
              Missed days
              <input
                type="number"
                min={0}
                max={26}
                value={simMissedDays}
                onChange={(e) => setSimMissedDays(e.target.value)}
                className={cn(CONTROL, "mt-1 h-8 text-xs tabular-nums")}
              />
            </label>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-divider pt-2 text-[11px] tabular-nums text-ink-muted">
            <span>
              Slab: <b className="text-ink">{formatINR(sim.grossSlabIncentive)}</b>
              {sim.dailyEarned > 0 && (
                <>
                  {" "}
                  + Daily: <b className="text-positive">{formatINR(sim.dailyEarned)}</b>
                </>
              )}
              {sim.dailyPenalty > 0 && (
                <>
                  {" "}
                  − Forfeit: <b className="text-negative">{formatINR(sim.dailyPenalty)}</b>
                </>
              )}
            </span>
            <span className="text-xs font-bold text-ink">Net: {formatINR(sim.netIncentive)}</span>
          </div>
        </div>

        {error && (
          <p role="alert" className="micro-shake rounded-tile bg-negative-soft p-3 text-xs text-negative">
            {error}
          </p>
        )}

        <DrawerFooter>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form={formId} loading={saving}>
            Save {cat} Rules
          </Button>
        </DrawerFooter>
      </form>
    </Drawer>
  );
}
