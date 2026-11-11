"use client";

import { useMemo, useState } from "react";
import { Download, Eye, RefreshCw, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { CustomSelect } from "@/components/ui/custom-select";
import { Drawer } from "@/components/ui/drawer";
import { EmptyState } from "@/components/ui/empty-state";
import { CONTROL } from "@/components/ui/field";
import { LedgerAuditorCharacter } from "@/components/ui/incentive-characters";
import { toast } from "@/components/ui/toaster";
import { downloadCsv, downloadXlsx } from "@/components/modules/incentives/export-utils";
import { reconcilePeriodAction } from "@/lib/actions/incentives";
import { cn } from "@/lib/cn";
import type { IncentivesDashboardPayload, LedgerEntryView } from "@/lib/data/incentives";
import { formatDate, formatINR } from "@/lib/format";
import { chipFor } from "@/lib/status";
import { useSavedFlag } from "@/lib/use-transient-state";

export function DailyLedgerTab({ data }: { data: IncentivesDashboardPayload }) {
  const [agentFilter, setAgentFilter] = useState("__all__");
  const [statusFilter, setStatusFilter] = useState("__all__");
  const [query, setQuery] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [reconcileSaved, flashReconcileSaved] = useSavedFlag();
  const [csvSaved, flashCsvSaved] = useSavedFlag();
  const [xlsxSaved, flashXlsxSaved] = useSavedFlag();
  const [inspectRow, setInspectRow] = useState<LedgerEntryView | null>(null);
  const hasFilters = Boolean(query.trim()) || agentFilter !== "__all__" || statusFilter !== "__all__";

  const filteredLedger = useMemo(() => {
    const q = query.trim().toLowerCase();
    return data.ledger.filter((row) => {
      if (agentFilter !== "__all__" && row.agentId !== agentFilter) return false;
      if (statusFilter !== "__all__" && row.earningStatus !== statusFilter) return false;
      if (!q) return true;
      return (
        row.claimRef.toLowerCase().includes(q) ||
        row.vehicleRegNo.toLowerCase().includes(q) ||
        row.agentName.toLowerCase().includes(q) ||
        (row.customerPincode ?? "").includes(q) ||
        (row.resolvedState ?? "").toLowerCase().includes(q)
      );
    });
  }, [data.ledger, agentFilter, statusFilter, query]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await reconcilePeriodAction(data.monthIso, true);
      if (res.ok) {
        flashReconcileSaved();
        toast(res.message ?? "Reconciled period.");
      } else {
        toast(res.error ?? "Reconciliation skipped.", "error");
      }
    } finally {
      setSyncing(false);
    }
  };

  const handleExport = async (kind: "csv" | "xlsx") => {
    const headers = [
      "Claim Ref",
      "Vehicle Reg",
      "Agent",
      "Submission Date",
      "Effective Slab Date",
      "Customer PIN",
      "Resolved State",
      "Location Source",
      "Assigned Vehicle",
      "Assigned State",
      "Rule Name",
      "Rule Version",
      "Daily Seq",
      "Slab",
      "Rate",
      "Calculated Amount",
      "Status",
      "Explanation",
    ];
    const rows = filteredLedger.map((r) => [
      r.claimRef,
      r.vehicleRegNo,
      r.agentName,
      r.submissionDate,
      r.effectiveSlabDate,
      r.customerPincode ?? "",
      r.resolvedState ?? "",
      r.locationStatus,
      r.assignedVehicleCategory ?? "",
      r.assignedState ?? "",
      r.ruleName ?? "",
      r.ruleVersionNumber ? `v${r.ruleVersionNumber}` : "",
      r.dailySequenceNo,
      r.slabLabel ?? "",
      r.appliedRate,
      r.calculatedAmount,
      r.earningStatus,
      r.resolutionNote ?? "",
    ]);
    if (kind === "csv") {
      downloadCsv(`incentive_ledger_${data.monthIso}`, headers, rows);
      flashCsvSaved();
    } else {
      await downloadXlsx(`incentive_ledger_${data.monthIso}`, [{ name: "Incentive Ledger", headers, rows }]);
      flashXlsxSaved();
    }
  };

  return (
    <div className="space-y-4">
      {/* Control Strip */}
      <Card index={0} className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 flex-1">
            <div className="relative min-w-[200px] flex-1 max-w-xs">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search claim, vehicle, PIN, state…"
                className={cn(CONTROL, "h-9 pl-8 text-xs")}
              />
              <Search size={14} className="pointer-events-none absolute left-2.5 top-2.5 text-ink-faint" />
            </div>

            {data.canManage && (
              <div className="w-44">
                <CustomSelect
                  value={agentFilter}
                  onChange={setAgentFilter}
                  options={[
                    { value: "__all__", label: "All agents" },
                    ...data.staffOptions.map((s) => ({ value: s.value, label: s.label })),
                  ]}
                  searchable
                  className="h-9 text-xs"
                />
              </div>
            )}

            <div className="w-40">
              <CustomSelect
                value={statusFilter}
                onChange={setStatusFilter}
                options={[
                  { value: "__all__", label: "All statuses" },
                  { value: "provisional", label: "Provisional" },
                  { value: "qualified", label: "Qualified" },
                  { value: "forfeited", label: "Forfeited" },
                  { value: "held", label: "Held for Review" },
                  { value: "ineligible", label: "Ineligible" },
                ]}
                className="h-9 text-xs"
              />
            </div>
            {hasFilters && (
              <Button
                variant="ghost"
                onClick={() => {
                  setQuery("");
                  setAgentFilter("__all__");
                  setStatusFilter("__all__");
                }}
                className="reveal-down h-9 px-2.5 text-xs"
              >
                <X size={13} /> Clear
              </Button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              saved={csvSaved}
              savedLabel="Exported"
              onClick={() => void handleExport("csv")}
              className="h-9 px-3 text-xs"
            >
              <Download size={13} /> CSV
            </Button>
            <Button
              variant="secondary"
              saved={xlsxSaved}
              savedLabel="Exported"
              onClick={() => void handleExport("xlsx")}
              className="h-9 px-3 text-xs"
            >
              <Download size={13} /> Excel
            </Button>
            {data.canManage && (
              <Button
                saved={reconcileSaved}
                savedLabel="Reconciled"
                onClick={handleSync}
                loading={syncing}
                className="h-9 px-3.5 text-xs"
              >
                <RefreshCw size={13} /> Reconcile Claims
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Traceable Ledger */}
      <Card index={1}>
        <CardHeader
          title={`Traceable Claim Incentive Ledger (${filteredLedger.length})`}
          action={
            <span className="text-[11px] text-ink-muted">
              Every rupee traces to its exact claim, submission assignment snapshot, and rule version.
            </span>
          }
        />

        {filteredLedger.length === 0 ? (
          <EmptyState
            illustration={<LedgerAuditorCharacter />}
            label="No ledger entries recorded yet"
            hint={data.canManage ? "Submit or approve vehicle claims and click Reconcile Claims to compute daily slab entries." : "Your eligible claims will appear here."}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-divider text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
                  <th className="pb-2.5 pr-3">Claim / Vehicle</th>
                  <th className="pb-2.5 pr-3">Agent</th>
                  <th className="pb-2.5 pr-3">Submitted</th>
                  <th className="pb-2.5 pr-3">PIN / State</th>
                  <th className="pb-2.5 pr-3">Rule &amp; Ver</th>
                  <th className="pb-2.5 pr-3 text-right">Seq / Slab</th>
                  <th className="pb-2.5 pr-3 text-right">Amount</th>
                  <th className="pb-2.5 pr-3">Status</th>
                  <th className="pb-2.5 text-right">Trace</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-divider/60">
                {filteredLedger.map((r) => {
                  const statusChip = chipFor(r.earningStatus);
                  return (
                    <tr
                      key={r.id}
                      onClick={() => setInspectRow(r)}
                      className={cn(
                        "h-14 cursor-pointer transition-colors hover:bg-accent-soft/35",
                        inspectRow?.id === r.id && "bg-accent-soft/45",
                      )}
                    >
                      <td className="py-2 pr-3">
                        <p className="font-bold text-ink uppercase tabular-nums">{r.vehicleRegNo}</p>
                        <p className="text-[11px] text-ink-faint tabular-nums">{r.claimRef}</p>
                      </td>
                      <td className="py-2 pr-3">
                        <p className="font-semibold text-ink">{r.agentName}</p>
                        <p className="text-[11px] text-ink-muted">
                          {r.assignedVehicleCategory ?? "Unassigned"} · {r.assignedState ?? "—"}
                        </p>
                      </td>
                      <td className="py-2 pr-3 text-[11px] text-ink-muted tabular-nums">
                        {formatDate(r.submissionDate)}
                      </td>
                      <td className="py-2 pr-3">
                        <p className="font-medium text-ink">
                          {r.resolvedState ?? "Unresolved"}
                        </p>
                        <p className="text-[11px] text-ink-faint tabular-nums">
                          {r.customerPincode ? `PIN ${r.customerPincode}` : chipFor(r.locationStatus).label}
                        </p>
                      </td>
                      <td className="py-2 pr-3">
                        {r.ruleName ? (
                          <p className="text-ink">
                            {r.ruleName}{" "}
                            <span className="text-[11px] text-ink-faint">v{r.ruleVersionNumber}</span>
                          </p>
                        ) : (
                          <span className="text-ink-faint">{r.exceptionReason ? chipFor(r.exceptionReason).label : "—"}</span>
                        )}
                      </td>
                      <td className="py-2 pr-3 text-right tabular-nums text-ink-muted">
                        {r.dailySequenceNo > 0 ? `#${r.dailySequenceNo} · ${r.slabLabel}` : "—"}
                      </td>
                      <td className="py-2 pr-3 text-right font-bold text-ink tabular-nums">
                        {formatINR(r.calculatedAmount)}
                      </td>
                      <td className="py-2 pr-3">
                        <Chip tone={statusChip.tone}>{statusChip.label}</Chip>
                      </td>
                      <td className="py-2 text-right" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          onClick={() => setInspectRow(r)}
                          className="h-8 px-2 text-xs"
                        >
                          <Eye size={14} /> Why
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Daily Performance Summary Matrix */}
      <Card index={2}>
        <CardHeader title={`Daily Earnings Summary (${data.dailyPerformance.length} day entries)`} />
        {data.dailyPerformance.length === 0 ? (
          <EmptyState label="No daily summary rows yet" className="py-6" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-divider text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
                  <th className="pb-2 pr-4">Date</th>
                  <th className="pb-2 pr-4">Agent</th>
                  <th className="pb-2 pr-4">Cycle Status</th>
                  <th className="pb-2 pr-4 text-right">Eligible</th>
                  <th className="pb-2 pr-4 text-right">Mismatch / Held</th>
                  <th className="pb-2 pr-4">Slab Breakdown</th>
                  <th className="pb-2 text-right">Day Provisional</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-divider/60">
                {data.dailyPerformance
                  .filter((d) => agentFilter === "__all__" || d.agentId === agentFilter)
                  .map((d) => (
                    <tr key={d.id} className="h-12">
                      <td className="py-2 pr-4 font-semibold text-ink tabular-nums">{formatDate(d.perfDate)}</td>
                      <td className="py-2 pr-4 text-ink">{d.agentName}</td>
                      <td className="py-2 pr-4">
                        <Chip tone={d.isWorkingDay ? "positive" : "warning"}>
                          {d.isWorkingDay ? "Working Day" : d.holidayLabel ? `Holiday: ${d.holidayLabel}` : "Off Day"}
                        </Chip>
                      </td>
                      <td className="py-2 pr-4 text-right font-semibold text-ink tabular-nums">{d.eligibleClaims}</td>
                      <td className="py-2 pr-4 text-right text-ink-muted tabular-nums">
                        {d.mismatchClaims} / {d.heldClaims}
                      </td>
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

      {/* Traceability Explainability Drawer */}
      <Drawer
        open={Boolean(inspectRow)}
        onClose={() => setInspectRow(null)}
        title={inspectRow ? `Calculation Audit — ${inspectRow.claimRef}` : "Calculation Audit"}
      >
        {inspectRow && (
          <div className="space-y-4 text-xs">
            <div className="rounded-tile border border-divider bg-surface-muted/40 p-3.5 space-y-2">
              <div className="flex justify-between">
                <span className="text-ink-muted">Vehicle / Claim Status</span>
                <span className="font-bold text-ink">{inspectRow.vehicleRegNo} ({inspectRow.claimStatus})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-muted">Submission Date (Slab Date)</span>
                <span className="font-semibold text-ink tabular-nums">
                  {formatDate(inspectRow.submissionDate)} ({formatDate(inspectRow.effectiveSlabDate)})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-muted">Calculated Incentive</span>
                <span className="text-sm font-bold text-ink tabular-nums">{formatINR(inspectRow.calculatedAmount)}</span>
              </div>
            </div>

            <ol className="space-y-2.5 rounded-tile border border-divider bg-surface-strong p-3.5">
              <li className="reveal-down" style={{ animationDelay: "0ms" }}>
                <b className="text-ink">1. Location Resolution:</b>{" "}
                <span className="text-ink-muted">
                  PIN {inspectRow.customerPincode ?? "missing"} → {inspectRow.resolvedState ?? "Unresolved"} ({chipFor(inspectRow.locationStatus).label})
                </span>
              </li>
              <li className="reveal-down" style={{ animationDelay: "45ms" }}>
                <b className="text-ink">2. Point-in-Time Assignment:</b>{" "}
                <span className="text-ink-muted">
                  {inspectRow.assignedVehicleCategory ?? "None"} · {inspectRow.assignedState ?? "None"}
                </span>
              </li>
              <li className="reveal-down" style={{ animationDelay: "90ms" }}>
                <b className="text-ink">3. Claim Context:</b>{" "}
                <span className="text-ink-muted">
                  Claim category: {inspectRow.claimVehicleCategory ?? "Unknown"}
                </span>
              </li>
              <li className="reveal-down" style={{ animationDelay: "135ms" }}>
                <b className="text-ink">4. Applied Rule Snapshot:</b>{" "}
                <span className="text-ink-muted">
                  {inspectRow.ruleName ? `${inspectRow.ruleName} (v${inspectRow.ruleVersionNumber})` : "No rule applied"}
                </span>
              </li>
              <li className="reveal-down" style={{ animationDelay: "180ms" }}>
                <b className="text-ink">5. Working-Day Sequence:</b>{" "}
                <span className="text-ink-muted">
                  {inspectRow.dailySequenceNo > 0
                    ? `Claim #${inspectRow.dailySequenceNo} in slab ${inspectRow.slabLabel} @ ${formatINR(inspectRow.appliedRate)}`
                    : "Not credited"}
                </span>
              </li>
            </ol>

            {inspectRow.resolutionNote && (
              <div className="rounded-tile bg-surface-muted p-3 text-ink-muted leading-relaxed">
                <b className="block text-ink mb-1">Engine Decision Note</b>
                {inspectRow.resolutionNote}
              </div>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
}
