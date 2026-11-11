"use client";

import { useId, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  ExternalLink,
  FileSpreadsheet,
  Lock,
  Plus,
  RotateCcw,
  Wallet,
} from "lucide-react";
import { Button, buttonStyles } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { CustomSelect } from "@/components/ui/custom-select";
import { DatePicker } from "@/components/ui/date-picker";
import { Drawer, DrawerFooter } from "@/components/ui/drawer";
import { EmptyState } from "@/components/ui/empty-state";
import { CONTROL } from "@/components/ui/field";
import { PinLocatorCharacter, SettlementBankerCharacter } from "@/components/ui/incentive-characters";
import { toast } from "@/components/ui/toaster";
import { downloadCsv, downloadXlsx } from "@/components/modules/incentives/export-utils";
import {
  addManualAdjustmentAction,
  finalizeAllReadySettlementsAction,
  generatePeriodSettlementsAction,
  recordPayoutAction,
  reopenSettlementAction,
  resolveExceptionAction,
  updateSettlementStatusAction,
} from "@/lib/actions/incentives";
import { cn } from "@/lib/cn";
import type { IncentivesDashboardPayload, LedgerEntryView, SettlementView } from "@/lib/data/incentives";
import { todayIST } from "@/lib/dates";
import { formatDate, formatINR } from "@/lib/format";
import { SETTLEMENT_STATUS_LABELS, type SettlementStatus } from "@/lib/incentives";
import { STATE_OPTIONS } from "@/lib/states";
import { chipFor } from "@/lib/status";
import { MAX_UPLOAD_LABEL } from "@/lib/upload-limits";
import { useErrorNudge, useRowFlash, useSavedFlag } from "@/lib/use-transient-state";

export function SettlementsPayoutsTab({ data }: { data: IncentivesDashboardPayload }) {
  const resolveFormId = useId();
  const payoutFormId = useId();
  const adjFormId = useId();
  const reopenFormId = useId();

  const [genBusy, setGenBusy] = useState(false);
  const [finAllBusy, setFinAllBusy] = useState(false);
  const [rowBusyId, setRowBusyId] = useState<string | null>(null);
  const [genSaved, flashGenSaved] = useSavedFlag();
  const [csvSaved, flashCsvSaved] = useSavedFlag();
  const [xlsxSaved, flashXlsxSaved] = useSavedFlag();
  const { triggerFlash, flashClassFor } = useRowFlash();

  // Exception Resolve Drawer
  const [resolvingItem, setResolvingItem] = useState<LedgerEntryView | null>(null);
  const [resolveState, setResolveState] = useState("Gujarat");
  const [resolveReason, setResolveReason] = useState("");
  const [resolveBusy, setResolveBusy] = useState(false);
  const { error: resolveErr, errorPulse: resolveErrPulse, setError: setResolveErr } = useErrorNudge();

  // Record Payout Drawer
  const [payoutTarget, setPayoutTarget] = useState<SettlementView | null>(null);
  const [paidAmount, setPaidAmount] = useState("");
  const [payoutDate, setPayoutDate] = useState(todayIST());
  const [paymentMode, setPaymentMode] = useState("Bank");
  const [transactionRef, setTransactionRef] = useState("");
  const [payoutRemarks, setPayoutRemarks] = useState("");
  const [payoutProof, setPayoutProof] = useState<File | null>(null);
  const [payoutBusy, setPayoutBusy] = useState(false);
  const { error: payoutErr, errorPulse: payoutErrPulse, setError: setPayoutErr } = useErrorNudge();

  // Adjustment Drawer
  const [adjOpen, setAdjOpen] = useState(false);
  const [adjSettlement, setAdjSettlement] = useState<SettlementView | null>(null);
  const [adjAgentId, setAdjAgentId] = useState(data.staffOptions[0]?.value ?? "");
  const [adjDelta, setAdjDelta] = useState("");
  const [adjReason, setAdjReason] = useState("");
  const [adjBusy, setAdjBusy] = useState(false);
  const { error: adjErr, errorPulse: adjErrPulse, setError: setAdjErr } = useErrorNudge();

  // Reopen Settlement Drawer
  const [reopenTarget, setReopenTarget] = useState<SettlementView | null>(null);
  const [reopenReason, setReopenReason] = useState("");
  const [reopenBusy, setReopenBusy] = useState(false);
  const { error: reopenErr, errorPulse: reopenErrPulse, setError: setReopenErr } = useErrorNudge();

  const handleGenerate = async () => {
    setGenBusy(true);
    try {
      const res = await generatePeriodSettlementsAction(data.monthIso);
      if (res.ok) {
        flashGenSaved();
        toast(res.message ?? "Generated settlements.");
      } else {
        toast(res.error ?? "Failed to generate settlements.", "error");
      }
    } finally {
      setGenBusy(false);
    }
  };

  const handleFinalizeAll = async () => {
    setFinAllBusy(true);
    try {
      const res = await finalizeAllReadySettlementsAction(data.monthIso);
      if (res.ok) toast(res.message ?? "Finalized period settlements.");
      else toast(res.error ?? "Could not finalize period.", "error");
    } finally {
      setFinAllBusy(false);
    }
  };

  const handleStatusChange = async (s: SettlementView, nextState: "under_review" | "finalized") => {
    setRowBusyId(s.id);
    try {
      const res = await updateSettlementStatusAction(s.id, nextState);
      if (res.ok) {
        triggerFlash(s.id, nextState === "finalized" ? "positive" : "accent");
        toast(res.message ?? "Updated settlement.");
      } else {
        toast(res.error ?? "Could not update settlement.", "error");
      }
    } finally {
      setRowBusyId(null);
    }
  };

  const handleResolveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvingItem) return;
    setResolveBusy(true);
    setResolveErr(null);
    try {
      const res = await resolveExceptionAction({
        ledgerId: resolvingItem.id,
        resolvedState: resolveState,
        reason: resolveReason,
      });
      if (res.ok) {
        toast(res.message ?? "Exception resolved.");
        setResolvingItem(null);
        setResolveReason("");
      } else {
        setResolveErr(res.error ?? "Could not resolve exception.");
      }
    } finally {
      setResolveBusy(false);
    }
  };

  const handlePayoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payoutTarget) return;
    setPayoutBusy(true);
    setPayoutErr(null);
    try {
      const fd = new FormData();
      fd.set("settlementId", payoutTarget.id);
      fd.set("paidAmount", paidAmount);
      fd.set("payoutDate", payoutDate);
      fd.set("paymentMode", paymentMode);
      fd.set("transactionRef", transactionRef);
      fd.set("remarks", payoutRemarks);
      if (payoutProof) fd.set("proof", payoutProof);

      const res = await recordPayoutAction(fd);
      if (res.ok) {
        toast(res.message ?? "Payout recorded.");
        triggerFlash(payoutTarget.id, "positive");
        setPayoutTarget(null);
        setTransactionRef("");
        setPayoutRemarks("");
        setPayoutProof(null);
      } else {
        setPayoutErr(res.error ?? "Could not record payout.");
      }
    } finally {
      setPayoutBusy(false);
    }
  };

  const handleAdjSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdjBusy(true);
    setAdjErr(null);
    try {
      const res = await addManualAdjustmentAction({
        periodKey: data.monthIso,
        agentId: adjSettlement ? adjSettlement.agentId : adjAgentId,
        settlementId: adjSettlement?.id ?? null,
        deltaAmount: Number(adjDelta),
        reason: adjReason,
      });
      if (res.ok) {
        toast(res.message ?? "Adjustment recorded.");
        if (adjSettlement) triggerFlash(adjSettlement.id, "accent");
        setAdjOpen(false);
        setAdjSettlement(null);
        setAdjDelta("");
        setAdjReason("");
      } else {
        setAdjErr(res.error ?? "Adjustment failed.");
      }
    } finally {
      setAdjBusy(false);
    }
  };

  const handleReopenSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reopenTarget) return;
    setReopenBusy(true);
    setReopenErr(null);
    try {
      const res = await reopenSettlementAction(reopenTarget.id, reopenReason);
      if (res.ok) {
        toast(res.message ?? "Reopened settlement.");
        triggerFlash(reopenTarget.id, "accent");
        setReopenTarget(null);
        setReopenReason("");
      } else {
        setReopenErr(res.error ?? "Could not reopen.");
      }
    } finally {
      setReopenBusy(false);
    }
  };

  const handleExportSettlements = async (kind: "csv" | "xlsx") => {
    const headers = [
      "Agent",
      "Vehicle",
      "State",
      "Monthly Target",
      "Eligible Claims",
      "Provisional ₹",
      "Adjustment ₹",
      "Eligibility",
      "Workflow Status",
      "Payment Status",
      "Finalized Payable ₹",
      "Paid ₹",
      "Outstanding ₹",
    ];
    const rows = data.settlements.map((s) => [
      s.agentName,
      s.vehicleCategory ?? "",
      s.assignedState ?? "",
      s.monthlyTarget,
      s.eligibleClaims,
      s.provisionalAmount,
      s.adjustmentAmount,
      s.eligibilityStatus,
      s.status,
      s.paymentStatus,
      s.finalizedPayable,
      s.paidAmount,
      s.outstandingAmount,
    ]);
    if (kind === "csv") {
      downloadCsv(`incentive_settlements_${data.monthIso}`, headers, rows);
      flashCsvSaved();
    } else {
      await downloadXlsx(`incentive_settlements_${data.monthIso}`, [{ name: "Settlements", headers, rows }]);
      flashXlsxSaved();
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. Exception Queue (PIN Conflicts, Unverified Location, Missing Rule, Non-Working) */}
      <Card index={0}>
        <CardHeader
          title={`Held Exceptions Queue (${data.exceptions.length})`}
          action={
            data.exceptions.length > 0 ? (
              <Chip tone="warning">
                <AlertTriangle size={12} className="mr-1" /> Action Required Before Finalizing
              </Chip>
            ) : (
              <Chip tone="positive">
                <CheckCircle2 size={12} className="mr-1" /> Queue Clear
              </Chip>
            )
          }
        />

        {data.exceptions.length === 0 ? (
          <div className="flex items-center gap-3 py-2">
            <PinLocatorCharacter state="verified" className="h-12 w-16" />
            <p className="text-xs text-ink-muted">
              No held claim exceptions for {data.period.label}. All PIN conflicts and missing locations are resolved.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-divider text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
                  <th className="pb-2 pr-3">Claim / Vehicle</th>
                  <th className="pb-2 pr-3">Agent</th>
                  <th className="pb-2 pr-3">PIN / Manual State</th>
                  <th className="pb-2 pr-3">Reason</th>
                  <th className="pb-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-divider/60">
                {data.exceptions.map((ex) => (
                  <tr key={ex.id} className="h-14">
                    <td className="py-2 pr-3">
                      <p className="font-bold text-ink">{ex.vehicleRegNo}</p>
                      <p className="text-[11px] text-ink-faint tabular-nums">{ex.claimRef} · {formatDate(ex.submissionDate)}</p>
                    </td>
                    <td className="py-2 pr-3 font-medium text-ink">{ex.agentName}</td>
                    <td className="py-2 pr-3 text-ink-muted tabular-nums">
                      PIN: {ex.customerPincode ?? "—"} · Manual: {ex.manualCustomerState ?? "—"}
                    </td>
                    <td className="py-2 pr-3 max-w-md text-ink-muted">{ex.resolutionNote}</td>
                    <td className="py-2 text-right">
                      <Button
                        variant="secondary"
                        onClick={() => {
                          setResolveErr(null);
                          setResolvingItem(ex);
                          setResolveState(ex.assignedState || ex.manualCustomerState || "Gujarat");
                          setResolveReason("");
                        }}
                        className="h-8 px-3 text-xs"
                      >
                        Verify &amp; Resolve
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* 2. Month-End Settlements */}
      <Card index={1}>
        <CardHeader
          title={`Monthly Settlement & Lock Workflow — ${data.period.label}`}
          action={
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="secondary"
                saved={csvSaved}
                savedLabel="Exported"
                onClick={() => void handleExportSettlements("csv")}
                className="h-8 px-2.5 text-xs"
              >
                <Download size={13} /> CSV
              </Button>
              <Button
                variant="secondary"
                saved={xlsxSaved}
                savedLabel="Exported"
                onClick={() => void handleExportSettlements("xlsx")}
                className="h-8 px-2.5 text-xs"
              >
                <FileSpreadsheet size={13} /> Excel
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setAdjErr(null);
                  setAdjSettlement(null);
                  setAdjOpen(true);
                }}
                className="h-8 px-3 text-xs"
              >
                <Plus size={13} /> Manual Adjustment
              </Button>
              <Button
                variant="secondary"
                saved={genSaved}
                savedLabel="Generated"
                onClick={handleGenerate}
                loading={genBusy}
                className="h-8 px-3 text-xs"
              >
                Generate / Refresh Settlements
              </Button>
              <ConfirmButton
                title="Finalize and lock period?"
                description="Locks settlement payable amounts and transitions eligible provisional earnings to Qualified or Forfeited."
                confirmLabel="Finalize All"
                tone="primary"
                icon={<SettlementBankerCharacter state="finalized" className="h-11 w-14 shrink-0" />}
                loading={finAllBusy}
                onConfirm={handleFinalizeAll}
                className={buttonStyles("primary", "h-8 px-3 text-xs")}
              >
                <Lock size={13} /> Finalize All Ready
              </ConfirmButton>
            </div>
          }
        />

        {data.settlements.length === 0 ? (
          <EmptyState
            illustration={
              <SettlementBankerCharacter
                state={
                  data.period.status === "finalized"
                    ? "finalized"
                    : data.exceptions.length > 0
                      ? "exceptions"
                      : "review"
                }
              />
            }
            label="No monthly settlements generated yet"
            hint="Click 'Generate / Refresh Settlements' above to evaluate monthly targets and prepare settlements for review."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-divider text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
                  <th className="pb-2.5 pr-3">Agent</th>
                  <th className="pb-2.5 pr-3 text-right">Target</th>
                  <th className="pb-2.5 pr-3">Eligibility / Status</th>
                  <th className="pb-2.5 pr-3 text-right">Payable</th>
                  <th className="pb-2.5 pr-3 text-right">Paid</th>
                  <th className="pb-2.5 pr-3 text-right">Outstanding</th>
                  <th className="pb-2.5 text-right">Workflow Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-divider/60">
                {data.settlements.map((s) => {
                  const sChip = chipFor(s.status);
                  const eChip = chipFor(s.eligibilityStatus);
                  const isLocked = ["finalized", "partially_paid", "paid"].includes(s.status);
                  const canPay = (s.status === "finalized" || s.status === "partially_paid") && s.outstandingAmount > 0;
                  return (
                    <tr
                      key={s.id}
                      className={cn(
                        "h-14 transition-[background-color,opacity] duration-150 hover:bg-accent-soft/30",
                        rowBusyId === s.id && "opacity-60",
                        flashClassFor(s.id),
                      )}
                    >
                      <td className="py-2 pr-3">
                        <p className="font-semibold text-ink">{s.agentName}</p>
                        <p className="text-[11px] text-ink-muted">
                          {s.vehicleCategory ?? "—"} · {s.assignedState ?? "—"}
                        </p>
                      </td>
                      <td className="py-2 pr-3 text-right tabular-nums text-ink">
                        <b>{s.eligibleClaims}</b> / {s.monthlyTarget}
                      </td>
                      <td className="py-2 pr-3">
                        <div className="flex flex-wrap gap-1.5">
                          <Chip tone={eChip.tone}>{eChip.label}</Chip>
                          <Chip tone={sChip.tone}>
                            {SETTLEMENT_STATUS_LABELS[s.status as SettlementStatus] ?? sChip.label}
                          </Chip>
                        </div>
                      </td>
                      <td className="py-2 pr-3 text-right font-semibold text-ink tabular-nums">
                        {formatINR(s.finalizedPayable)}
                        {s.adjustmentAmount !== 0 && (
                          <span className="block text-[10px] text-ink-faint">
                            Adj {s.adjustmentAmount > 0 ? `+${formatINR(s.adjustmentAmount)}` : formatINR(s.adjustmentAmount)}
                          </span>
                        )}
                      </td>
                      <td className="py-2 pr-3 text-right tabular-nums text-positive font-medium">
                        {formatINR(s.paidAmount)}
                      </td>
                      <td className="py-2 pr-3 text-right tabular-nums font-bold text-ink">
                        {formatINR(s.outstandingAmount)}
                      </td>
                      <td className="py-2 text-right">
                        <div className="inline-flex flex-wrap items-center justify-end gap-1.5">
                          {s.status === "ready_for_review" && (
                            <Button
                              variant="ghost"
                              loading={rowBusyId === s.id}
                              onClick={() => void handleStatusChange(s, "under_review")}
                              className="h-8 px-2 text-xs"
                            >
                              Under Review
                            </Button>
                          )}
                          {(s.status === "ready_for_review" || s.status === "under_review") && (
                            <Button
                              variant="secondary"
                              loading={rowBusyId === s.id}
                              onClick={() => void handleStatusChange(s, "finalized")}
                              className="h-8 px-2.5 text-xs"
                            >
                              <Lock size={12} /> Finalize
                            </Button>
                          )}
                          {!isLocked && s.status !== "forfeited" && (
                            <Button
                              variant="ghost"
                              onClick={() => {
                                setAdjErr(null);
                                setAdjSettlement(s);
                                setAdjOpen(true);
                              }}
                              className="h-8 px-2 text-xs"
                            >
                              Adjust
                            </Button>
                          )}
                          {isLocked && s.paidAmount === 0 && data.settings.postFinalizationPolicy === "reopen_with_reason" && (
                            <Button
                              variant="ghost"
                              onClick={() => {
                                setReopenErr(null);
                                setReopenTarget(s);
                              }}
                              className="h-8 px-2 text-xs"
                            >
                              <RotateCcw size={12} /> Reopen
                            </Button>
                          )}
                          {canPay && (
                            <Button
                              onClick={() => {
                                setPayoutErr(null);
                                setPayoutTarget(s);
                                setPaidAmount(String(s.outstandingAmount));
                                setPayoutDate(data.todayIso);
                                setTransactionRef("");
                                setPayoutRemarks("");
                                setPayoutProof(null);
                              }}
                              className="h-8 px-3 text-xs"
                            >
                              <Wallet size={13} /> Record Payout
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* 3. Payout Transactions */}
      <Card index={2}>
        <CardHeader title={`Incentive Payout Register (${data.payouts.length})`} />
        {data.payouts.length === 0 ? (
          <EmptyState
            illustration={<SettlementBankerCharacter state="paid" />}
            label="No payouts recorded for this month yet"
            className="py-6"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-divider text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
                  <th className="pb-2 pr-4">Payout Date</th>
                  <th className="pb-2 pr-4">Agent</th>
                  <th className="pb-2 pr-4">Mode</th>
                  <th className="pb-2 pr-4">Transaction Ref</th>
                  <th className="pb-2 pr-4 text-right">Paid Amount</th>
                  <th className="pb-2 text-right">Proof</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-divider/60">
                {data.payouts.map((p) => (
                  <tr key={p.id} className="h-11">
                    <td className="py-2 pr-4 tabular-nums text-ink">{formatDate(p.payoutDate)}</td>
                    <td className="py-2 pr-4 font-semibold text-ink">{p.agentName}</td>
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
                          className="inline-flex items-center gap-1 text-xs font-medium text-ink underline hover:text-ink-muted"
                        >
                          View <ExternalLink size={12} />
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

      {/* 4. Manual Adjustments & Audit Trail */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card index={3}>
          <CardHeader title={`Adjustments & Overrides (${data.adjustments.length})`} />
          {data.adjustments.length === 0 ? (
            <EmptyState label="No manual overrides recorded this month" className="py-6" />
          ) : (
            <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
              {data.adjustments.map((adj) => (
                <div key={adj.id} className="rounded-tile border border-divider/60 bg-surface-muted/30 p-3 text-xs space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-ink">{adj.agentName}</span>
                    <Chip tone={adj.deltaAmount >= 0 ? "info" : "negative"}>
                      {adj.originalValue} → {adj.updatedValue}
                    </Chip>
                  </div>
                  <p className="text-ink-muted">{adj.reason}</p>
                  <p className="text-[11px] text-ink-faint">By {adj.adminName}</p>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card index={4}>
          <CardHeader title={`Immutable Audit Trail (${data.auditLogs.length})`} />
          {data.auditLogs.length === 0 ? (
            <EmptyState label="No audit events yet" className="py-6" />
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {data.auditLogs.map((log) => (
                <div key={log.id} className="flex items-start justify-between gap-2 border-b border-divider/50 pb-2 text-xs">
                  <div className="min-w-0">
                    <p className="font-semibold text-ink truncate">
                      {log.action} <span className="font-normal text-ink-muted">({log.entityType})</span>
                    </p>
                    <p className="text-[11px] text-ink-muted truncate">
                      Actor: {log.actorName} {log.reason ? `· ${log.reason}` : ""}
                    </p>
                  </div>
                  <span className="shrink-0 text-[10px] text-ink-faint tabular-nums">
                    {log.createdAt.slice(0, 10)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Resolve Exception Drawer */}
      <Drawer
        open={Boolean(resolvingItem)}
        onClose={() => setResolvingItem(null)}
        title={`Resolve Exception — ${resolvingItem?.claimRef ?? ""}`}
      >
        {resolvingItem && (
          <form id={resolveFormId} onSubmit={handleResolveSubmit} className="space-y-4">
            <div className="rounded-tile border border-divider bg-warning-soft/50 p-3 text-xs text-ink">
              <p className="font-semibold">Why held: {resolvingItem.exceptionReason}</p>
              <p className="mt-1 text-ink-muted">{resolvingItem.resolutionNote}</p>
            </div>

            <div className="space-y-1">
              <span className="text-xs font-medium text-ink-muted">Verified Customer State *</span>
              <CustomSelect value={resolveState} onChange={setResolveState} options={STATE_OPTIONS} searchable />
            </div>

            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-ink-muted">Admin Verification Reason *</span>
              <textarea
                required
                minLength={3}
                rows={3}
                value={resolveReason}
                onChange={(e) => setResolveReason(e.target.value)}
                placeholder="e.g. Verified customer address on policy copy confirms Gujarat"
                className={cn(CONTROL, "h-auto py-2")}
              />
            </label>

            {resolveErr && (
              <p key={resolveErrPulse} role="alert" className="micro-shake rounded-tile bg-negative-soft p-3 text-xs text-negative">
                {resolveErr}
              </p>
            )}

            <DrawerFooter>
              <Button variant="secondary" onClick={() => setResolvingItem(null)} disabled={resolveBusy}>
                Cancel
              </Button>
              <Button type="submit" form={resolveFormId} loading={resolveBusy}>
                Verify State &amp; Recalculate
              </Button>
            </DrawerFooter>
          </form>
        )}
      </Drawer>

      {/* Record Payout Drawer (supports partial payouts) */}
      <Drawer
        open={Boolean(payoutTarget)}
        onClose={() => setPayoutTarget(null)}
        title={`Record Payout — ${payoutTarget?.agentName ?? ""}`}
      >
        {payoutTarget && (
          <form id={payoutFormId} onSubmit={handlePayoutSubmit} className="space-y-4">
            <div className="grid grid-cols-3 gap-2 rounded-tile border border-divider bg-surface-muted/40 p-3 text-xs tabular-nums">
              <div>
                <span className="text-[10px] uppercase text-ink-muted block">Payable</span>
                <b className="text-ink">{formatINR(payoutTarget.finalizedPayable)}</b>
              </div>
              <div>
                <span className="text-[10px] uppercase text-ink-muted block">Already Paid</span>
                <b className="text-positive">{formatINR(payoutTarget.paidAmount)}</b>
              </div>
              <div>
                <span className="text-[10px] uppercase text-ink-muted block">Outstanding</span>
                <b className="text-ink">{formatINR(payoutTarget.outstandingAmount)}</b>
              </div>
            </div>

            <label className="flex flex-col gap-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-ink-muted">Paid Amount (₹) *</span>
                <div className="inline-flex gap-1">
                  <button
                    type="button"
                    onClick={() => setPaidAmount(String(Math.round((payoutTarget.outstandingAmount / 2) * 100) / 100))}
                    className="rounded-control border border-divider bg-surface-strong px-2 py-0.5 text-[10px] font-medium text-ink-muted transition-colors hover:border-ink/30 hover:text-ink"
                  >
                    50%
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaidAmount(String(payoutTarget.outstandingAmount))}
                    className="rounded-control border border-divider bg-surface-strong px-2 py-0.5 text-[10px] font-medium text-ink-muted transition-colors hover:border-ink/30 hover:text-ink"
                  >
                    Full Balance
                  </button>
                </div>
              </div>
              <input
                type="number"
                required
                min={1}
                max={payoutTarget.outstandingAmount}
                step="any"
                value={paidAmount}
                onChange={(e) => setPaidAmount(e.target.value)}
                className={cn(CONTROL, "h-10 tabular-nums")}
              />
              <span className="text-[11px] text-ink-faint">
                Partial payments leave the remainder as Partially Paid until balance reaches ₹0.
              </span>
            </label>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <span className="text-xs font-medium text-ink-muted">Payout Date *</span>
                <DatePicker value={payoutDate} onChange={setPayoutDate} maxToday />
              </div>
              <div className="space-y-1">
                <span className="text-xs font-medium text-ink-muted">Payment Mode *</span>
                <CustomSelect
                  value={paymentMode}
                  onChange={setPaymentMode}
                  options={[
                    { value: "Bank", label: "Bank Transfer (NEFT/IMPS)" },
                    { value: "UPI", label: "UPI" },
                    { value: "Cash", label: "Cash" },
                    { value: "Other", label: "Other" },
                  ]}
                />
              </div>
            </div>

            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-ink-muted">Transaction Reference / UTR *</span>
              <input
                type="text"
                required
                minLength={2}
                value={transactionRef}
                onChange={(e) => setTransactionRef(e.target.value)}
                placeholder="e.g. UTR98123456"
                className={cn(CONTROL, "h-10")}
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-ink-muted">Remarks</span>
              <input
                type="text"
                value={payoutRemarks}
                onChange={(e) => setPayoutRemarks(e.target.value)}
                placeholder="Optional note"
                className={cn(CONTROL, "h-10")}
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-ink-muted">Payment Proof (Optional · max {MAX_UPLOAD_LABEL})</span>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                onChange={(e) => setPayoutProof(e.target.files?.[0] ?? null)}
                className="text-xs text-ink-muted"
              />
            </label>

            {payoutErr && (
              <p key={payoutErrPulse} role="alert" className="micro-shake rounded-tile bg-negative-soft p-3 text-xs text-negative">
                {payoutErr}
              </p>
            )}

            <DrawerFooter>
              <Button variant="secondary" onClick={() => setPayoutTarget(null)} disabled={payoutBusy}>
                Cancel
              </Button>
              <Button type="submit" form={payoutFormId} loading={payoutBusy}>
                Record Payout
              </Button>
            </DrawerFooter>
          </form>
        )}
      </Drawer>

      {/* Manual Adjustment Drawer */}
      <Drawer
        open={adjOpen}
        onClose={() => {
          setAdjOpen(false);
          setAdjSettlement(null);
        }}
        title={adjSettlement ? `Adjust Settlement — ${adjSettlement.agentName}` : "Record Incentive Adjustment"}
      >
        <form id={adjFormId} onSubmit={handleAdjSubmit} className="space-y-4">
          {!adjSettlement && (
            <div className="space-y-1">
              <span className="text-xs font-medium text-ink-muted">Agent *</span>
              <CustomSelect value={adjAgentId} onChange={setAdjAgentId} options={data.staffOptions} searchable />
            </div>
          )}

          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-ink-muted">Adjustment Amount (₹, positive or negative) *</span>
            <input
              type="number"
              required
              step="any"
              value={adjDelta}
              onChange={(e) => setAdjDelta(e.target.value)}
              placeholder="e.g. 250 or -100"
              className={cn(CONTROL, "h-10 tabular-nums")}
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-ink-muted">Audit Reason (Mandatory) *</span>
            <textarea
              required
              minLength={5}
              rows={3}
              value={adjReason}
              onChange={(e) => setAdjReason(e.target.value)}
              placeholder="Explain why this adjustment is being applied..."
              className={cn(CONTROL, "h-auto py-2")}
            />
          </label>

          {adjErr && (
            <p key={adjErrPulse} role="alert" className="micro-shake rounded-tile bg-negative-soft p-3 text-xs text-negative">
              {adjErr}
            </p>
          )}

          <DrawerFooter>
            <Button
              variant="secondary"
              onClick={() => {
                setAdjOpen(false);
                setAdjSettlement(null);
              }}
              disabled={adjBusy}
            >
              Cancel
            </Button>
            <Button type="submit" form={adjFormId} loading={adjBusy}>
              Save Adjustment
            </Button>
          </DrawerFooter>
        </form>
      </Drawer>

      {/* Reopen Locked Settlement Drawer */}
      <Drawer
        open={Boolean(reopenTarget)}
        onClose={() => setReopenTarget(null)}
        title={`Reopen Settlement — ${reopenTarget?.agentName ?? ""}`}
      >
        <form id={reopenFormId} onSubmit={handleReopenSubmit} className="space-y-4">
          <p className="text-xs text-ink-muted">
            Reopening moves this unpaid settlement back to Under Review and unlocks its ledger rows. An audit record is permanent.
          </p>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-ink-muted">Mandatory Audit Reason *</span>
            <textarea
              required
              minLength={5}
              rows={3}
              value={reopenReason}
              onChange={(e) => setReopenReason(e.target.value)}
              className={cn(CONTROL, "h-auto py-2")}
            />
          </label>
          {reopenErr && (
            <p key={reopenErrPulse} role="alert" className="micro-shake rounded-tile bg-negative-soft p-3 text-xs text-negative">
              {reopenErr}
            </p>
          )}
          <DrawerFooter>
            <Button variant="secondary" onClick={() => setReopenTarget(null)} disabled={reopenBusy}>
              Cancel
            </Button>
            <Button type="submit" form={reopenFormId} loading={reopenBusy}>
              Reopen Settlement
            </Button>
          </DrawerFooter>
        </form>
      </Drawer>
    </div>
  );
}
