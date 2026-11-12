"use client";

import { useState } from "react";
import { Calculator, CalendarOff, History, Pencil, Plus, Settings2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty-state";
import { RuleArchitectCharacter } from "@/components/ui/incentive-characters";
import { toast } from "@/components/ui/toaster";
import { toggleIncentiveRule } from "@/lib/actions/incentives";
import { cn } from "@/lib/cn";
import type { IncentivesDashboardPayload } from "@/lib/data/incentives";
import { formatDate, formatINR } from "@/lib/format";
import {
  CALCULATION_METHOD_LABELS,
  RULE_SCOPE_LABELS,
  slabLabelText,
  type IncentiveRule,
  type VehicleCategory,
} from "@/lib/incentives";
import { useRowFlash } from "@/lib/use-transient-state";
import { HolidayDrawer } from "@/components/modules/incentives/holiday-drawer";
import { PayoutSimulatorCard } from "@/components/modules/incentives/payout-simulator-card";
import { PolicySettingsDrawer } from "@/components/modules/incentives/policy-settings-drawer";
import { RuleEditorDrawer } from "@/components/modules/incentives/rule-editor-drawer";

export function RulesTab({ data }: { data: IncentivesDashboardPayload }) {
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<IncentiveRule | null>(null);
  const [defaultCat, setDefaultCat] = useState<VehicleCategory>("2W");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [holidaysOpen, setHolidaysOpen] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [showVersions, setShowVersions] = useState(false);
  const [showSimulator, setShowSimulator] = useState(false);
  const [simRuleId, setSimRuleId] = useState<string>(data.rules[0]?.id ?? "");
  const { triggerFlash, flashClassFor } = useRowFlash();

  const openPreviewRule = (ruleId: string) => {
    setSimRuleId(ruleId);
    setShowSimulator(true);
  };

  const openNewRule = (cat: VehicleCategory = "2W") => {
    setEditingRule(null);
    setDefaultCat(cat);
    setEditorOpen(true);
  };

  const openEditRule = (rule: IncentiveRule) => {
    setEditingRule(rule);
    setEditorOpen(true);
  };

  const handleToggle = async (rule: IncentiveRule) => {
    setTogglingId(rule.id);
    try {
      const nextActive = !rule.isActive;
      const res = await toggleIncentiveRule(rule.id, nextActive);
      if (res.ok) {
        triggerFlash(rule.id, nextActive ? "positive" : "accent");
        toast(res.message ?? "Updated rule.");
      } else {
        toast(res.error ?? "Failed to update rule.", "error");
      }
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Governance Header Card */}
      <Card index={0} className="p-4 sm:px-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <div className="hidden shrink-0 sm:block">
              <RuleArchitectCharacter />
            </div>
            <div className="space-y-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-[15px] font-semibold text-ink">Incentive Rules</h2>
                <Chip tone={data.settings.enableLiveCalculations ? "positive" : "warning"}>
                  {data.settings.enableLiveCalculations ? "Live Sync On" : "Manual Sync"}
                </Chip>
              </div>
              <p className="text-xs text-ink-muted">
                Matches Vehicle + State first
                {data.settings.allowCategoryDefaultFallback && ", then Vehicle Default"}
                {data.settings.allowGlobalFallback && ", then All Vehicles & States"}.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {data.rules.length > 0 && (
              <Button
                variant={showSimulator ? "primary" : "secondary"}
                onClick={() => setShowSimulator((v) => !v)}
                className="h-9 px-3 text-xs"
              >
                <Calculator size={14} /> {showSimulator ? "Hide Calculator" : "Calculator"}
              </Button>
            )}
            <Button variant="secondary" onClick={() => setHolidaysOpen(true)} className="h-9 px-3 text-xs">
              <CalendarOff size={14} /> Holidays ({data.holidays.length})
            </Button>
            <Button variant="secondary" onClick={() => setSettingsOpen(true)} className="h-9 px-3 text-xs">
              <Settings2 size={14} /> Settings
            </Button>
            <Button onClick={() => openNewRule("2W")} className="h-9 px-3.5 text-xs">
              <Plus size={14} /> New Rule
            </Button>
          </div>
        </div>
      </Card>

      {showSimulator && data.rules.length > 0 && (
        <PayoutSimulatorCard rules={data.rules} selectedRuleId={simRuleId} onSelectRuleId={setSimRuleId} />
      )}

      {/* Rules Table */}
      <Card index={1}>
        <CardHeader
          title={`Rules (${data.rules.length})`}
          action={
            <button
              type="button"
              onClick={() => setShowVersions((v) => !v)}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-muted hover:text-ink"
            >
              <History size={14} />
              {showVersions ? "Hide History" : `History (${data.ruleVersions.length})`}
            </button>
          }
        />

        {data.rules.length === 0 ? (
          <EmptyState
            illustration={<RuleArchitectCharacter />}
            label="No incentive rules yet"
            hint="Create your first rule to start calculating claim earnings."
            action={
              <Button onClick={() => openNewRule("2W")} className="h-9 px-3.5 text-xs">
                <Plus size={14} /> Create Rule
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-divider text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
                  <th className="pb-2.5 pr-4">Rule</th>
                  <th className="pb-2.5 pr-4">Applies To</th>
                  <th className="pb-2.5 pr-4">Method &amp; Rates</th>
                  <th className="pb-2.5 pr-4 text-right">Monthly Target</th>
                  <th className="pb-2.5 pr-4">Dates</th>
                  <th className="pb-2.5 pr-4">Status</th>
                  <th className="pb-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-divider/60">
                {data.rules.map((r) => (
                  <tr
                    key={r.id}
                    className={cn(
                      "h-14 transition-[background-color,opacity] duration-150 hover:bg-accent-soft/35",
                      togglingId === r.id && "opacity-60",
                      flashClassFor(r.id),
                    )}
                  >
                    <td className="py-2.5 pr-4">
                      <p className="font-semibold text-ink">
                        {r.ruleName} <span className="ml-1 text-[11px] font-normal text-ink-faint">v{r.currentVersion}</span>
                      </p>
                      <p className="text-[11px] text-ink-muted">{RULE_SCOPE_LABELS[r.scope]}</p>
                    </td>
                    <td className="py-2.5 pr-4">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {r.vehicleCategory && <Chip tone="neutral">{r.vehicleCategory}</Chip>}
                        <span className="font-medium text-ink">{r.stateName ?? "Any state"}</span>
                      </div>
                    </td>
                    <td className="py-2.5 pr-4">
                      <p className="font-medium text-ink">{CALCULATION_METHOD_LABELS[r.calculationMethod]}</p>
                      <p className="text-[11px] text-ink-muted tabular-nums">
                        {r.calculationMethod === "fixed"
                          ? `${formatINR(r.fixedRate)}/claim`
                          : r.calculationMethod === "milestone"
                            ? r.slabs.map((s) => `${s.minClaims}→${formatINR(s.ratePerClaim || s.bonusAmount)}`).join(" · ")
                            : r.calculationMethod === "combined"
                              ? `${formatINR(r.fixedRate)}/claim${
                                  r.slabs.length > 0
                                    ? ` + ${r.slabs
                                        .map((s) => `${s.minClaims}→${formatINR(s.bonusAmount || s.ratePerClaim)}`)
                                        .join(" · ")}`
                                    : ""
                                }`
                              : r.slabs.map((s) => `${slabLabelText(s)}: ${formatINR(s.ratePerClaim)}`).join(" · ")}
                      </p>
                      {r.monthlyMilestones.length > 0 && (
                        <p className="mt-0.5 text-[11px] font-medium text-positive tabular-nums">
                          Monthly: {r.monthlyMilestones.map((m) => `${m.minClaims}→${formatINR(m.rewardAmount)}`).join(" · ")}
                        </p>
                      )}
                    </td>
                    <td className="py-2.5 pr-4 text-right font-semibold text-ink tabular-nums">
                      {r.monthlyTarget} claims
                    </td>
                    <td className="py-2.5 pr-4 text-[11px] text-ink-muted tabular-nums">
                      {formatDate(r.effectiveFrom)}
                      {r.effectiveUntil ? ` → ${formatDate(r.effectiveUntil)}` : " → Ongoing"}
                    </td>
                    <td className="py-2.5 pr-4">
                      <Chip tone={r.isActive ? "positive" : "neutral"}>{r.isActive ? "Active" : "Paused"}</Chip>
                    </td>
                    <td className="py-2.5 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <Button
                          variant="ghost"
                          onClick={() => openPreviewRule(r.id)}
                          className="h-8 px-2.5 text-xs"
                        >
                          <Calculator size={13} /> Preview
                        </Button>
                        <Button
                          variant="ghost"
                          loading={togglingId === r.id}
                          onClick={() => void handleToggle(r)}
                          className="h-8 px-2.5 text-xs"
                        >
                          {r.isActive ? "Pause" : "Activate"}
                        </Button>
                        <Button
                          variant="secondary"
                          onClick={() => openEditRule(r)}
                          className="h-8 px-2.5 text-xs"
                        >
                          <Pencil size={13} /> Edit
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Immutable Rule Version History */}
      {showVersions && (
        <Card index={0} className="reveal-down">
          <CardHeader
            title={`Rule Version Snapshot History (${data.ruleVersions.length})`}
            action={<ShieldCheck size={16} className="text-positive" />}
          />
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-divider text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
                  <th className="pb-2.5 pr-4">Rule</th>
                  <th className="pb-2.5 pr-4">Ver</th>
                  <th className="pb-2.5 pr-4">Target Vehicle / State</th>
                  <th className="pb-2.5 pr-4">Method</th>
                  <th className="pb-2.5 pr-4 text-right">Monthly Target</th>
                  <th className="pb-2.5 text-right">Slabs</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-divider/60">
                {data.ruleVersions.map((v) => (
                  <tr key={v.id} className="h-11">
                    <td className="py-2 pr-4 font-semibold text-ink">{v.ruleName}</td>
                    <td className="py-2 pr-4">
                      <Chip tone="accent">v{v.versionNumber}</Chip>
                    </td>
                    <td className="py-2 pr-4 text-ink-muted">
                      {v.vehicleCategory ?? "Any"} · {v.stateName ?? "Fallback"}
                    </td>
                    <td className="py-2 pr-4 text-ink-muted">{v.calculationMethod}</td>
                    <td className="py-2 pr-4 text-right tabular-nums text-ink">{v.monthlyTarget}</td>
                    <td className="py-2 text-right tabular-nums text-ink-muted">{v.slabCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <RuleEditorDrawer
        open={editorOpen}
        rule={editingRule}
        defaultCategory={defaultCat}
        onClose={() => setEditorOpen(false)}
      />
      <PolicySettingsDrawer
        open={settingsOpen}
        settings={data.settings}
        onClose={() => setSettingsOpen(false)}
      />
      <HolidayDrawer
        open={holidaysOpen}
        holidays={data.holidays}
        onClose={() => setHolidaysOpen(false)}
      />
    </div>
  );
}
