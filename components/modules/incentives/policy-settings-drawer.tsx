"use client";

import { useEffect, useId, useState } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CustomSelect } from "@/components/ui/custom-select";
import { Drawer, DrawerFooter } from "@/components/ui/drawer";
import { toast } from "@/components/ui/toaster";
import { saveIncentiveSettings } from "@/lib/actions/incentives";
import { cn } from "@/lib/cn";
import {
  WEEKDAYS,
  type AgentVisibilityMode,
  type IncentiveSettings,
  type MidMonthTargetPolicy,
  type NonWorkingDayPolicy,
  type PostFinalizationPolicy,
} from "@/lib/incentives";
import { useErrorNudge } from "@/lib/use-transient-state";

export function PolicySettingsDrawer({
  open,
  settings,
  onClose,
}: {
  open: boolean;
  settings: IncentiveSettings;
  onClose: () => void;
}) {
  const formId = useId();
  const [enableLive, setEnableLive] = useState(settings.enableLiveCalculations);
  const [allowCatFallback, setAllowCatFallback] = useState(settings.allowCategoryDefaultFallback);
  const [allowGlobalFallback, setAllowGlobalFallback] = useState(settings.allowGlobalFallback);
  const [eligibleStatuses, setEligibleStatuses] = useState<string[]>(settings.eligibleClaimStatuses);
  const [nonWorkingPolicy, setNonWorkingPolicy] = useState<NonWorkingDayPolicy>(settings.nonWorkingDayPolicy);
  const [midMonthPolicy, setMidMonthPolicy] = useState<MidMonthTargetPolicy>(settings.midMonthTargetPolicy);
  const [postFinalPolicy, setPostFinalPolicy] = useState<PostFinalizationPolicy>(settings.postFinalizationPolicy);
  const [visibilityMode, setVisibilityMode] = useState<AgentVisibilityMode>(settings.agentVisibilityMode);
  const [workingDays, setWorkingDays] = useState<number[]>(settings.workingDays);
  const [saving, setSaving] = useState(false);
  const { error, errorPulse, setError } = useErrorNudge();

  useEffect(() => {
    if (!open) return;
    setEnableLive(settings.enableLiveCalculations);
    setAllowCatFallback(settings.allowCategoryDefaultFallback);
    setAllowGlobalFallback(settings.allowGlobalFallback);
    setEligibleStatuses(settings.eligibleClaimStatuses);
    setNonWorkingPolicy(settings.nonWorkingDayPolicy);
    setMidMonthPolicy(settings.midMonthTargetPolicy);
    setPostFinalPolicy(settings.postFinalizationPolicy);
    setVisibilityMode(settings.agentVisibilityMode);
    setWorkingDays(settings.workingDays);
    setError(null);
  }, [open, settings, setError]);

  const toggleStatus = (status: string) => {
    setEligibleStatuses((prev) =>
      prev.includes(status) ? prev.filter((x) => x !== status) : [...prev, status],
    );
  };

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
      const res = await saveIncentiveSettings({
        enableLiveCalculations: enableLive,
        allowCategoryDefaultFallback: allowCatFallback,
        allowGlobalFallback: allowGlobalFallback,
        eligibleClaimStatuses: eligibleStatuses,
        nonWorkingDayPolicy: nonWorkingPolicy,
        midMonthTargetPolicy: midMonthPolicy,
        postFinalizationPolicy: postFinalPolicy,
        agentVisibilityMode: visibilityMode,
        workingDays,
      });
      if (res.ok) {
        toast(res.message ?? "Saved policy settings.");
        onClose();
      } else {
        setError(res.error ?? "Could not save settings.");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer open={open} onClose={onClose} title="Incentive Governance & Policy Controls">
      <form id={formId} onSubmit={handleSave} className="space-y-4">
        <p className="text-xs leading-relaxed text-ink-muted">
          Configure all client-controlled operating rules cleanly without code changes. Every change is recorded in the audit log.
        </p>

        <div className="space-y-2.5 rounded-tile border border-divider bg-surface-muted/35 p-3.5 text-xs">
          <label className="flex cursor-pointer items-center justify-between gap-2">
            <span>
              <b className="block text-ink">Live Calculation Engine</b>
              <span className="text-[11px] text-ink-muted">Automatically evaluate claims on create/approval</span>
            </span>
            <input type="checkbox" checked={enableLive} onChange={(e) => setEnableLive(e.target.checked)} className="size-4" />
          </label>

          <label className="flex cursor-pointer items-center justify-between gap-2 border-t border-divider/60 pt-2">
            <span>
              <b className="block text-ink">Category Default Fallback</b>
              <span className="text-[11px] text-ink-muted">Use 2W/4W/CW default when exact state rule is missing</span>
            </span>
            <input type="checkbox" checked={allowCatFallback} onChange={(e) => setAllowCatFallback(e.target.checked)} className="size-4" />
          </label>

          <label className="flex cursor-pointer items-center justify-between gap-2 border-t border-divider/60 pt-2">
            <span>
              <b className="block text-ink">Global Fallback Rule</b>
              <span className="text-[11px] text-ink-muted">Use global fallback if neither state nor category rule exists</span>
            </span>
            <input type="checkbox" checked={allowGlobalFallback} onChange={(e) => setAllowGlobalFallback(e.target.checked)} className="size-4" />
          </label>
        </div>

        <div className="space-y-1.5">
          <span className="text-xs font-medium text-ink-muted">Eligible Claim Statuses</span>
          <div className="flex gap-2">
            {["approved", "completed"].map((st) => {
              const selected = eligibleStatuses.includes(st);
              return (
                <button
                  key={st}
                  type="button"
                  onClick={() => toggleStatus(st)}
                  className={cn(
                    "inline-flex h-9 items-center gap-1.5 rounded-control border px-3 text-xs font-medium capitalize transition-all duration-150 active:scale-[0.97]",
                    selected
                      ? "border-ink bg-ink text-white"
                      : "border-divider bg-surface-strong text-ink-muted hover:text-ink",
                  )}
                >
                  {selected && <Check size={12} strokeWidth={2.5} className="check-pop text-accent" />}
                  {st}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-1.5">
          <span className="text-xs font-medium text-ink-muted">Working Days Schedule</span>
          <div className="flex flex-wrap gap-1.5">
            {WEEKDAYS.map((day) => {
              const selected = workingDays.includes(day.value);
              return (
                <button
                  key={day.value}
                  type="button"
                  onClick={() => toggleDay(day.value)}
                  className={cn(
                    "inline-flex h-9 items-center gap-1 rounded-control border px-2.5 text-xs font-medium transition-all duration-150 active:scale-[0.97]",
                    selected
                      ? "border-ink bg-ink text-white"
                      : "border-divider bg-surface-strong text-ink-muted hover:text-ink",
                  )}
                >
                  {day.short}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <span className="text-xs font-medium text-ink-muted block">Non-Working / Holiday Claim Handling</span>
            <CustomSelect
              value={nonWorkingPolicy}
              onChange={(v) => setNonWorkingPolicy(v as NonWorkingDayPolicy)}
              options={[
                { value: "hold_for_review", label: "Hold for admin review (does not advance slab)" },
                { value: "zero_credit", label: "Mark non-working ineligible (₹0 credit)" },
                { value: "roll_to_next_working_day", label: "Roll to next working day slab cycle" },
              ]}
              className="h-10 text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <span className="text-xs font-medium text-ink-muted block">Mid-Month Target Adjustment Policy</span>
            <CustomSelect
              value={midMonthPolicy}
              onChange={(v) => setMidMonthPolicy(v as MidMonthTargetPolicy)}
              options={[
                { value: "admin_override", label: "Admin manual target override per agent" },
                { value: "prorated", label: "Auto pro-rate by active assignment days" },
                { value: "full_target", label: "Require full category monthly target" },
              ]}
              className="h-10 text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <span className="text-xs font-medium text-ink-muted block">Post-Finalization Correction Policy</span>
            <CustomSelect
              value={postFinalPolicy}
              onChange={(v) => setPostFinalPolicy(v as PostFinalizationPolicy)}
              options={[
                { value: "next_period_adjustment", label: "Record adjustment in next open period (recommended)" },
                { value: "reopen_with_reason", label: "Allow admin reopen with mandatory audit reason" },
              ]}
              className="h-10 text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <span className="text-xs font-medium text-ink-muted block">Agent Dashboard Visibility Timing</span>
            <CustomSelect
              value={visibilityMode}
              onChange={(v) => setVisibilityMode(v as AgentVisibilityMode)}
              options={[
                { value: "immediate", label: "Immediate upon claim approval" },
                { value: "after_daily_reconciliation", label: "After daily reconciliation (prior days & closed periods)" },
              ]}
              className="h-10 text-xs"
            />
          </div>
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
            Save Policy Settings
          </Button>
        </DrawerFooter>
      </form>
    </Drawer>
  );
}
