"use client";

import { useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Globe, Plus, Search, Trash2, UploadCloud } from "lucide-react";
import { Button, buttonStyles } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { CustomSelect } from "@/components/ui/custom-select";
import { DatePicker } from "@/components/ui/date-picker";
import { Drawer, DrawerFooter } from "@/components/ui/drawer";
import { EmptyState } from "@/components/ui/empty-state";
import { CONTROL } from "@/components/ui/field";
import { PinLocatorCharacter } from "@/components/ui/incentive-characters";
import { PendingBar } from "@/components/ui/pending-bar";
import { toast } from "@/components/ui/toaster";
import { downloadCsv } from "@/components/modules/incentives/export-utils";
import {
  assignAgentIncentive,
  endAgentAssignment,
  importPincodeChunk,
  lookupPincodeAction,
  saveAgentStretchConfigAction,
  savePincodeEntry,
  setAgentTargetOverride,
} from "@/lib/actions/incentives";
import {
  extractPincodeRowsFromRecords,
  parseCsvTextToRows,
  type PincodeImportRowInput,
} from "@/lib/pincode-dataset";
import { cn } from "@/lib/cn";
import type { IncentivesDashboardPayload } from "@/lib/data/incentives";
import { todayIST } from "@/lib/dates";
import { formatDate, formatNumber } from "@/lib/format";
import {
  VEHICLE_CATEGORIES,
  normalizeMonthlyMilestones,
  type MonthlyMilestoneTier,
  type VehicleCategory,
} from "@/lib/incentives";
import { STATE_OPTIONS } from "@/lib/states";
import { useErrorNudge, useRowFlash, useSavedFlag } from "@/lib/use-transient-state";

export function AssignmentsPinTab({ data }: { data: IncentivesDashboardPayload }) {
  const router = useRouter();
  const assignFormId = useId();
  const targetFormId = useId();
  const stretchFormId = useId();
  const pinInputRef = useRef<HTMLInputElement>(null);

  // Assignment drawer state
  const [assignOpen, setAssignOpen] = useState(false);
  const [aStaffId, setAStaffId] = useState(data.staffOptions[0]?.value ?? "");
  const [aVehicle, setAVehicle] = useState<VehicleCategory>("2W");
  const [aState, setAState] = useState("Gujarat");
  const [aFrom, setAFrom] = useState(todayIST());
  const [aUntil, setAUntil] = useState("");
  const [aNotes, setANotes] = useState("");
  const [assignBusy, setAssignBusy] = useState(false);
  const { error: assignErr, errorPulse: assignErrPulse, setError: setAssignErr } = useErrorNudge();

  // Mid-month target override drawer state
  const [targetOpen, setTargetOpen] = useState(false);
  const [tAgentId, setTAgentId] = useState("");
  const [tAgentName, setTAgentName] = useState("");
  const [tValue, setTValue] = useState("");
  const [tReason, setTReason] = useState("");
  const [targetBusy, setTargetBusy] = useState(false);
  const { error: targetErr, errorPulse: targetErrPulse, setError: setTargetErr } = useErrorNudge();

  // Personalized Stretch Target & Special Milestones drawer state (visible only to that agent)
  const [stretchOpen, setStretchOpen] = useState(false);
  const [sAgentId, setSAgentId] = useState("");
  const [sAgentName, setSAgentName] = useState("");
  const [sAssignmentId, setSAssignmentId] = useState<string | null>(null);
  const [sBaseTarget, setSBaseTarget] = useState<number>(60);
  const [sMilestones, setSMilestones] = useState<{ minClaims: string; rewardAmount: string }[]>([]);
  const [sLabel, setSLabel] = useState("");
  const [sReason, setSReason] = useState("");
  const [stretchBusy, setStretchBusy] = useState(false);
  const { error: stretchErr, errorPulse: stretchErrPulse, setError: setStretchErr } = useErrorNudge();

  // PIN Directory state (`null` means derive live from server `sampleRows` so router.refresh() never leaves stale empty state)
  const [pinSearch, setPinSearch] = useState("");
  const [pinSearchResults, setPinSearchResults] = useState<typeof data.pincodeSummary.sampleRows | null>(null);
  const [pinSearchBusy, setPinSearchBusy] = useState(false);
  const [importingPins, setImportingPins] = useState(false);
  const [importProgress, setImportProgress] = useState<string | null>(null);
  const [importPct, setImportPct] = useState<number | null>(null);
  const [sampleSaved, flashSampleSaved] = useSavedFlag();
  const [syncSaved, flashSyncSaved] = useSavedFlag();
  const [addPinOpen, setAddPinOpen] = useState(false);
  const [newPin, setNewPin] = useState("");
  const [newPinState, setNewPinState] = useState("Gujarat");
  const [newPinDistrict, setNewPinDistrict] = useState("");
  const [newPinOffice, setNewPinOffice] = useState("");
  const [singlePinBusy, setSinglePinBusy] = useState(false);
  const { triggerFlash, flashClassFor } = useRowFlash();

  const displayedPinRows = pinSearchResults ?? data.pincodeSummary.sampleRows;

  const activeAssignmentsNow = useMemo(() => {
    const today = data.todayIso;
    return data.assignments.filter(
      (a) => a.status === "active" && a.effectiveFrom <= today && (!a.effectiveUntil || a.effectiveUntil >= today),
    );
  }, [data.assignments, data.todayIso]);

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    setAssignBusy(true);
    setAssignErr(null);
    try {
      const res = await assignAgentIncentive({
        staffId: aStaffId,
        vehicleCategory: aVehicle,
        assignedState: aState,
        effectiveFrom: aFrom,
        effectiveUntil: aUntil || null,
        notes: aNotes,
      });
      if (res.ok) {
        toast(res.message ?? "Saved assignment.");
        setAssignOpen(false);
        setANotes("");
        setAUntil("");
      } else {
        setAssignErr(res.error ?? "Could not save assignment.");
      }
    } finally {
      setAssignBusy(false);
    }
  };

  const handleSaveTargetOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    setTargetBusy(true);
    setTargetErr(null);
    try {
      const trimmed = tValue.trim();
      const res = await setAgentTargetOverride({
        periodKey: data.monthIso,
        agentId: tAgentId,
        targetOverride: trimmed === "" ? null : Math.max(0, Math.floor(Number(trimmed))),
        reason: tReason,
      });
      if (res.ok) {
        toast(res.message ?? "Updated monthly target.");
        setTargetOpen(false);
        setTReason("");
      } else {
        setTargetErr(res.error ?? "Could not update target.");
      }
    } finally {
      setTargetBusy(false);
    }
  };

  const handleSaveStretchGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    setStretchBusy(true);
    setStretchErr(null);
    try {
      const nonEmptyRows = sMilestones.filter(
        (row) => row.minClaims.trim() !== "" || row.rewardAmount.trim() !== "",
      );
      for (const row of nonEmptyRows) {
        const claimsNum = Math.floor(Number(row.minClaims));
        const rewardNum = Number(row.rewardAmount);
        if (!Number.isFinite(claimsNum) || claimsNum < 1) {
          setStretchErr("Every step must have a positive Claims Reached number (at least 1).");
          return;
        }
        if (!Number.isFinite(rewardNum) || rewardNum < 0) {
          setStretchErr("Every step must have a valid reward amount (₹0 or above).");
          return;
        }
      }

      const cleanedMilestones: MonthlyMilestoneTier[] = normalizeMonthlyMilestones(
        nonEmptyRows.map((row) => ({
          minClaims: Number(row.minClaims),
          rewardAmount: Number(row.rewardAmount),
        })),
      );

      const res = await saveAgentStretchConfigAction({
        periodKey: data.monthIso,
        agentId: sAgentId,
        assignmentId: sAssignmentId,
        stretchMilestones: cleanedMilestones,
        stretchRateMode: "lump_sum_bonus",
        stretchLabel: sLabel.trim() || null,
        reason: sReason.trim() || undefined,
      });
      if (res.ok) {
        toast(
          res.message ??
            (cleanedMilestones.length > 0
              ? "Saved agent personal special milestones."
              : "Cleared personal special milestones."),
        );
        setStretchOpen(false);
        setSReason("");
        router.refresh();
      } else {
        setStretchErr(res.error ?? "Could not save agent personal milestones.");
      }
    } finally {
      setStretchBusy(false);
    }
  };

  const handlePinLookup = async () => {
    if (pinSearch.trim().length < 3) {
      setPinSearchResults(null);
      return;
    }
    setPinSearchBusy(true);
    try {
      const res = await lookupPincodeAction(pinSearch);
      if (res.ok) {
        setPinSearchResults(
          res.rows.map((p: Record<string, unknown>) => ({
            id: String(p.id),
            pincode: String(p.pincode),
            stateCode: String(p.state_code),
            stateName: String(p.state_name),
            districtName: (p.district_name as string | null) ?? null,
            officeName: (p.office_name as string | null) ?? null,
            officeType: (p.office_type as string | null) ?? null,
            isActive: Boolean(p.is_active),
            sourceUpdatedAt: String(p.source_updated_at),
          })),
        );
      } else {
        toast(res.error ?? "Search failed.", "error");
      }
    } finally {
      setPinSearchBusy(false);
    }
  };

  const handlePinFileUpload = async (file: File) => {
    setImportingPins(true);
    setImportPct(null);
    setImportProgress("Parsing India Post PIN dataset…");
    try {
      let parsed: PincodeImportRowInput[] = [];
      let skipped = 0;

      if (file.name.toLowerCase().endsWith(".csv")) {
        const csvText = await file.text();
        const result = parseCsvTextToRows(csvText);
        parsed = result.rows;
        skipped = result.skipped;
      } else {
        const XLSX = await import("xlsx");
        const buffer = await file.arrayBuffer();
        const wb = XLSX.read(buffer, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws);
        const result = extractPincodeRowsFromRecords(rawRows);
        parsed = result.rows;
        skipped = result.skipped;
      }

      if (parsed.length === 0) {
        toast("Could not detect valid PIN + State columns in this file.", "error");
        return;
      }

      let totalInserted = 0;
      const chunkSize = 2000;
      for (let i = 0; i < parsed.length; i += chunkSize) {
        const chunk = parsed.slice(i, i + chunkSize);
        const isFinal = i + chunkSize >= parsed.length;
        const processedCount = Math.min(i + chunkSize, parsed.length);
        setImportPct(Math.round((processedCount / parsed.length) * 100));
        setImportProgress(
          `Importing PIN records (${processedCount.toLocaleString("en-IN")} / ${parsed.length.toLocaleString("en-IN")})…`,
        );
        const res = await importPincodeChunk(chunk, { isFinal });
        if (!res.ok) {
          toast(res.error ?? "Chunk import failed.", "error");
          return;
        }
        if ("inserted" in res) totalInserted += res.inserted;
      }

      toast(
        `Processed ${parsed.length.toLocaleString("en-IN")} unique PIN mappings (${totalInserted.toLocaleString("en-IN")} added${skipped > 0 ? `, ${skipped.toLocaleString("en-IN")} skipped` : ""}).`,
      );
      setImportProgress(null);
      setPinSearchResults(null);
      router.refresh();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not read PIN file.", "error");
    } finally {
      setImportingPins(false);
      setImportProgress(null);
      setImportPct(null);
      if (pinInputRef.current) pinInputRef.current.value = "";
    }
  };

  const handleSyncOfficialMirror = async () => {
    setImportingPins(true);
    setImportPct(null);
    setImportProgress("Starting fast 36-state India Post sync…");
    try {
      const resp = await fetch("/api/incentives/pincode-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: "bundled", cleanMode: true }),
      });

      if (!resp.ok || !resp.body) {
        let errMsg = "Could not start PIN directory sync.";
        try {
          const errJson = (await resp.json()) as { error?: string };
          if (errJson.error) errMsg = errJson.error;
        } catch {
          /* ignore non-JSON error body */
        }
        toast(errMsg, "error");
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let summary: {
        ok?: boolean;
        error?: string;
        totalOfficial?: number;
        cleanedLegacy?: number;
        inserted?: number;
        activeTotal?: number;
      } | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          const evt = JSON.parse(trimmed) as {
            type?: string;
            phase?: string;
            done?: number;
            total?: number;
            ok?: boolean;
            error?: string;
            totalOfficial?: number;
            cleanedLegacy?: number;
            inserted?: number;
            activeTotal?: number;
          };
          if (evt.type === "progress" && evt.phase) {
            setImportProgress(evt.phase);
            if (typeof evt.done === "number" && typeof evt.total === "number" && evt.total > 0) {
              setImportPct(Math.round((evt.done / evt.total) * 100));
            }
          } else if (evt.type === "error") {
            toast(evt.error ?? "All-India PIN sync failed.", "error");
            return;
          } else if (evt.type === "done") {
            summary = evt;
          }
        }
      }

      if (!summary?.ok) {
        toast(summary?.error ?? "Sync ended unexpectedly.", "error");
        return;
      }

      const parts = [
        `${Number(summary.activeTotal ?? summary.totalOfficial ?? 0).toLocaleString("en-IN")} active 36-state PIN mappings`,
      ];
      if ((summary.inserted ?? 0) > 0) parts.push(`${Number(summary.inserted).toLocaleString("en-IN")} new added`);
      if ((summary.cleanedLegacy ?? 0) > 0) {
        parts.push(`${Number(summary.cleanedLegacy).toLocaleString("en-IN")} stale/incomplete cleaned`);
      }

      flashSyncSaved();
      toast(`All-India PIN directory synced: ${parts.join(" · ")}.`);
      setPinSearchResults(null);
      router.refresh();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not sync PIN directory.", "error");
    } finally {
      setImportingPins(false);
      setImportProgress(null);
      setImportPct(null);
    }
  };

  const handleAddSinglePin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSinglePinBusy(true);
    try {
      const res = await savePincodeEntry({
        pincode: newPin,
        stateName: newPinState,
        districtName: newPinDistrict,
        officeName: newPinOffice,
      });
      if (res.ok) {
        toast(res.message ?? "Saved PIN entry.");
        setNewPin("");
        setNewPinDistrict("");
        setNewPinOffice("");
        setAddPinOpen(false);
        setPinSearchResults(null);
        router.refresh();
      } else {
        toast(res.error ?? "Could not save PIN entry.", "error");
      }
    } finally {
      setSinglePinBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Card 1: Active Agent Assignments & Target Overrides */}
      <Card index={0}>
        <CardHeader
          title="Agent Assignments (One Active Vehicle & State at a Time)"
          action={
            <Button
              onClick={() => {
                setAssignErr(null);
                setAssignOpen(true);
              }}
              className="h-9 px-3.5 text-xs"
            >
              <Plus size={14} /> Assign / Reassign Agent
            </Button>
          }
        />

        {data.assignments.length === 0 ? (
          <EmptyState
            illustration={<PinLocatorCharacter state="idle" />}
            label="No agent assignments yet"
            hint="Assign each CSE to one vehicle category (2W, 4W, or CW) and one state with effective dates."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-divider text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
                  <th className="pb-2.5 pr-4">Agent</th>
                  <th className="pb-2.5 pr-4">Vehicle</th>
                  <th className="pb-2.5 pr-4">Assigned State</th>
                  <th className="pb-2.5 pr-4">Effective Window</th>
                  <th className="pb-2.5 pr-4">Status</th>
                  <th className="pb-2.5 pr-4">Monthly Target ({data.monthIso})</th>
                  <th className="pb-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-divider/60">
                {data.assignments.map((a) => {
                  const isCurrent = activeAssignmentsNow.some((x) => x.id === a.id);
                  const m = data.monthlyAgents.find((x) => x.staffId === a.staffId);
                  return (
                    <tr key={a.id} className={cn("h-14 transition-colors hover:bg-accent-soft/30", flashClassFor(a.id))}>
                      <td className="py-2.5 pr-4">
                        <p className="font-semibold text-ink">{a.staffName}</p>
                        {a.employeeCode && <p className="text-[11px] text-ink-faint">{a.employeeCode}</p>}
                      </td>
                      <td className="py-2.5 pr-4">
                        <Chip tone="neutral">{a.vehicleCategory}</Chip>
                      </td>
                      <td className="py-2.5 pr-4 font-medium text-ink">{a.assignedState}</td>
                      <td className="py-2.5 pr-4 text-[11px] text-ink-muted tabular-nums">
                        {formatDate(a.effectiveFrom)} → {a.effectiveUntil ? formatDate(a.effectiveUntil) : "Active"}
                      </td>
                      <td className="py-2.5 pr-4">
                        <Chip tone={isCurrent ? "positive" : "neutral"}>
                          {isCurrent ? "Current Active" : "Historical / Ended"}
                        </Chip>
                      </td>
                      <td className="py-2.5 pr-4 text-xs tabular-nums">
                        {m ? (
                          <div className="space-y-0.5">
                            <span>
                              <b>{m.effectiveTarget}</b>
                              {m.targetOverride !== null && (
                                <span className="ml-1 text-[11px] text-warning">(Override)</span>
                              )}
                            </span>
                            {(m.stretchMilestones.length > 0 || (m.stretchTarget && m.stretchTarget > 0)) && (
                              <div className="text-[11px] text-accent-text">
                                Special:{" "}
                                <b>
                                  {(m.stretchMilestones.length > 0
                                    ? m.stretchMilestones
                                    : [
                                        {
                                          minClaims: m.stretchTarget!,
                                          rewardAmount: m.stretchSpecialRate,
                                        },
                                      ]
                                  )
                                    .map((t) =>
                                      m.stretchRateMode === "lump_sum_bonus"
                                        ? `${t.minClaims}→+₹${formatNumber(t.rewardAmount)}`
                                        : `${t.minClaims}→₹${formatNumber(t.rewardAmount)}/claim`,
                                    )
                                    .join(" · ")}
                                </b>
                                {m.stretchAchieved && <span className="ml-1 text-positive font-semibold">✓</span>}
                              </div>
                            )}
                          </div>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="py-2.5 text-right">
                        <div className="inline-flex flex-wrap items-center justify-end gap-1.5">
                          <Button
                            variant="secondary"
                            onClick={() => {
                              setStretchErr(null);
                              setSAgentId(a.staffId);
                              setSAgentName(a.staffName);
                              setSAssignmentId(a.id);
                              setSBaseTarget(m ? m.effectiveTarget : 60);
                              const existingTiers =
                                m && m.stretchMilestones.length > 0
                                  ? m.stretchMilestones
                                  : m && m.stretchTarget && m.stretchTarget > 0
                                    ? [{ minClaims: m.stretchTarget, rewardAmount: m.stretchSpecialRate }]
                                    : [];
                              setSMilestones(
                                existingTiers.length > 0
                                  ? existingTiers.map((t) => ({
                                      minClaims: String(t.minClaims),
                                      rewardAmount: String(t.rewardAmount),
                                    }))
                                  : [{ minClaims: "", rewardAmount: "" }],
                              );
                              setSLabel(m?.stretchLabel ?? "");
                              setSReason("");
                              setStretchOpen(true);
                            }}
                            className="h-8 px-2.5 text-xs"
                          >
                            Special Target
                          </Button>
                          <Button
                            variant="secondary"
                            onClick={() => {
                              setTargetErr(null);
                              setTAgentId(a.staffId);
                              setTAgentName(a.staffName);
                              setTValue(m ? String(m.effectiveTarget) : "");
                              setTReason(m?.targetAdjustmentReason ?? "");
                              setTargetOpen(true);
                            }}
                            className="h-8 px-2.5 text-xs"
                          >
                            Target Override
                          </Button>
                          {!a.effectiveUntil && (
                            <ConfirmButton
                              title="End this assignment?"
                              description={`Sets end date to today (${data.todayIso}). All prior historical claims remain preserved.`}
                              confirmLabel="End Assignment"
                              onConfirm={async () => {
                                const res = await endAgentAssignment(a.id, data.todayIso);
                                if (res.ok) {
                                  triggerFlash(a.id, "accent");
                                  toast(res.message ?? "Closed assignment.");
                                } else {
                                  toast(res.error ?? "Failed to close.", "error");
                                }
                              }}
                              className={buttonStyles("secondary", "h-8 px-2.5 text-xs")}
                            >
                              End Today
                            </ConfirmButton>
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

      {/* Card 2: PIN Code Directory (India Post Local Table) */}
      <Card index={1}>
        <CardHeader
          title={`Customer PIN Code Directory (${formatNumber(data.pincodeSummary.totalRows)} active records)`}
          action={
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="ghost"
                saved={sampleSaved}
                savedLabel="Downloaded"
                onClick={() => {
                  downloadCsv(
                    "sample_india_post_pincodes",
                    ["pincode", "statename", "district", "officename", "officetype"],
                    [
                      ["380001", "Gujarat", "Ahmedabad", "Ahmedabad GPO", "HO"],
                      ["110001", "Delhi", "Central Delhi", "Connaught Place SO", "SO"],
                      ["400001", "Maharashtra", "Mumbai", "Mumbai GPO", "HO"],
                      ["281001", "Uttar Pradesh", "Mathura", "Mathura HO", "HO"],
                    ],
                  );
                  flashSampleSaved();
                }}
                className="h-8 px-2.5 text-xs"
              >
                <Download size={13} /> Sample CSV
              </Button>
              <Button variant="secondary" onClick={() => setAddPinOpen((v) => !v)} className="h-8 px-3 text-xs">
                <Plus size={13} /> Add Single PIN
              </Button>
              <Button
                variant="secondary"
                saved={syncSaved}
                savedLabel="Synced"
                onClick={() => void handleSyncOfficialMirror()}
                loading={importingPins}
                className="h-8 px-3 text-xs"
              >
                <Globe size={13} />{" "}
                {data.pincodeSummary.incompleteRows > 0
                  ? "Clean & Sync 36-State PINs"
                  : "Auto-Sync 36-State PINs (19.3k)"}
              </Button>
              <Button
                onClick={() => pinInputRef.current?.click()}
                loading={importingPins}
                className="h-8 px-3 text-xs"
              >
                <UploadCloud size={14} /> Import CSV / XLSX
              </Button>
              <input
                ref={pinInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void handlePinFileUpload(f);
                }}
                className="hidden"
              />
            </div>
          }
        />

        <div className="mb-3 flex flex-wrap items-center gap-3 rounded-tile border border-divider/60 bg-surface-muted/35 p-3 text-xs">
          <PinLocatorCharacter
            state={importingPins ? "importing" : data.pincodeSummary.totalRows > 0 ? "verified" : "idle"}
            className="h-12 w-16"
          />
          <div className="min-w-0 flex-1 space-y-0.5">
            <p className="font-semibold text-ink">
              Built-in 36-State All-India PIN Directory (zero data.gov.in rate limits) + CSV/XLSX import
            </p>
            <p className="text-[11px] text-ink-muted">
              <b>Auto-Sync 36-State PINs</b> loads all 19,346 verified India Post mappings directly in seconds (with Telangana & Ladakh, District & Office details) and cleans legacy pre-2014 state conflicts. Offline CSV/XLSX supports <code className="text-ink">Pincode</code>, <code className="text-ink">StateName</code>/<code className="text-ink">State</code>, <code className="text-ink">DistrictsName</code>, and <code className="text-ink">PostOfficeName</code>.
            </p>
          </div>
        </div>

        {data.pincodeSummary.incompleteRows > 0 && (
          <div className="reveal-down mb-3 flex flex-wrap items-center justify-between gap-2 rounded-tile border border-warning/30 bg-warning/5 px-3.5 py-2.5 text-xs">
            <p className="text-ink">
              <b>{formatNumber(data.pincodeSummary.incompleteRows)} legacy / incomplete rows detected</b> (missing district/post office or using pre-2014 state names, which can flag false <code className="text-ink">pin_conflict</code> holds). Click <b>Clean & Sync 36-State PINs</b> above to replace them automatically.
            </p>
          </div>
        )}

        <PendingBar active={importingPins} />
        {importProgress && (
          <div className="reveal-down mb-3 space-y-1.5 rounded-tile border border-divider bg-surface-strong px-3.5 py-2.5">
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="font-medium text-ink">{importProgress}</span>
              {importPct !== null && (
                <span className="font-semibold text-ink-muted tabular-nums">{importPct}%</span>
              )}
            </div>
            {importPct !== null && (
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-muted">
                <div
                  className="h-full rounded-full bg-ink transition-[width] duration-300 ease-out"
                  style={{ width: `${importPct}%` }}
                />
              </div>
            )}
          </div>
        )}

        {addPinOpen && (
          <form onSubmit={handleAddSinglePin} className="reveal-down mb-4 grid gap-3 rounded-tile border border-divider bg-surface-muted/35 p-3.5 sm:grid-cols-12">
            <input
              type="text"
              maxLength={6}
              placeholder="PIN (e.g. 380001)"
              value={newPin}
              onChange={(e) => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
              required
              className={cn(CONTROL, "sm:col-span-2 h-9 text-xs tabular-nums")}
            />
            <div className="sm:col-span-3">
              <CustomSelect
                value={newPinState}
                onChange={setNewPinState}
                options={STATE_OPTIONS}
                searchable
                className="h-9 text-xs"
              />
            </div>
            <input
              type="text"
              placeholder="District (optional)"
              value={newPinDistrict}
              onChange={(e) => setNewPinDistrict(e.target.value)}
              className={cn(CONTROL, "sm:col-span-3 h-9 text-xs")}
            />
            <input
              type="text"
              placeholder="Post office (optional)"
              value={newPinOffice}
              onChange={(e) => setNewPinOffice(e.target.value)}
              className={cn(CONTROL, "sm:col-span-2 h-9 text-xs")}
            />
            <Button type="submit" loading={singlePinBusy} className="sm:col-span-2 h-9 text-xs">
              Save PIN
            </Button>
          </form>
        )}

        <div className="mb-3 flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[220px] max-w-sm">
            <input
              type="text"
              value={pinSearch}
              onChange={(e) => {
                const next = e.target.value.replace(/\D/g, "").slice(0, 6);
                setPinSearch(next);
                if (next.length < 3 && pinSearchResults !== null) {
                  setPinSearchResults(null);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void handlePinLookup();
                }
              }}
              placeholder="Lookup 6-digit PIN (e.g. 380001)…"
              className={cn(CONTROL, "h-9 pl-8 text-xs tabular-nums")}
            />
            <Search size={14} className="pointer-events-none absolute left-2.5 top-2.5 text-ink-faint" />
          </div>
          <Button variant="secondary" loading={pinSearchBusy} onClick={() => void handlePinLookup()} className="h-9 px-3 text-xs">
            Search PIN
          </Button>
          <span className="text-[11px] text-ink-muted">
            Refreshing PIN directory never rewrites historical earning ledger snapshots.
          </span>
        </div>

        {displayedPinRows.length === 0 ? (
          <EmptyState
            illustration={<PinLocatorCharacter state="idle" />}
            label="No PIN directory rows match"
            hint="Click Auto-Sync 36-State PINs above or upload an India Post CSV / XLSX file."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-divider text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
                  <th className="pb-2 pr-4">PIN Code</th>
                  <th className="pb-2 pr-4">State</th>
                  <th className="pb-2 pr-4">District</th>
                  <th className="pb-2 pr-4">Post Office</th>
                  <th className="pb-2 text-right">Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-divider/60">
                {displayedPinRows.slice(0, 30).map((row) => (
                  <tr key={row.id} className="h-10 transition-colors hover:bg-accent-soft/25">
                    <td className="py-2 pr-4 font-bold text-ink tabular-nums">{row.pincode}</td>
                    <td className="py-2 pr-4">
                      <Chip tone="neutral">{row.stateCode}</Chip>{" "}
                      <span className="ml-1 font-medium text-ink">{row.stateName}</span>
                    </td>
                    <td className="py-2 pr-4 text-ink-muted">{row.districtName ?? "—"}</td>
                    <td className="py-2 pr-4 text-ink-muted">
                      {row.officeName ?? "—"}
                      {row.officeType && <span className="ml-1 text-[10px] text-ink-faint">({row.officeType})</span>}
                    </td>
                    <td className="py-2 text-right text-[11px] text-ink-faint tabular-nums">
                      {formatDate(row.sourceUpdatedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Assign / Reassign Agent Drawer */}
      <Drawer open={assignOpen} onClose={() => setAssignOpen(false)} title="Assign Agent Vehicle & State">
        <form id={assignFormId} onSubmit={handleCreateAssignment} className="space-y-4">
          <p className="text-xs text-ink-muted">
            Reassigning an agent automatically closes any prior open assignment on the day before the new effective date while preserving all history.
          </p>

          <div className="space-y-1">
            <span className="text-xs font-medium text-ink-muted">CSE / Agent</span>
            <CustomSelect value={aStaffId} onChange={setAStaffId} options={data.staffOptions} searchable />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <span className="text-xs font-medium text-ink-muted">Vehicle Category</span>
              <CustomSelect
                value={aVehicle}
                onChange={(v) => setAVehicle(v as VehicleCategory)}
                options={VEHICLE_CATEGORIES.map((v) => ({ value: v.key, label: v.label }))}
              />
            </div>
            <div className="space-y-1">
              <span className="text-xs font-medium text-ink-muted">Assigned State</span>
              <CustomSelect value={aState} onChange={setAState} options={STATE_OPTIONS} searchable />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <span className="text-xs font-medium text-ink-muted">Effective From</span>
              <DatePicker value={aFrom} onChange={setAFrom} />
            </div>
            <div className="space-y-1">
              <span className="text-xs font-medium text-ink-muted">Effective Until (Optional)</span>
              <DatePicker value={aUntil} onChange={setAUntil} placeholder="Ongoing" />
            </div>
          </div>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-ink-muted">Notes (Audit Context)</span>
            <input
              type="text"
              value={aNotes}
              onChange={(e) => setANotes(e.target.value)}
              placeholder="e.g. Regional transfer or onboarding"
              className={cn(CONTROL, "h-10")}
            />
          </label>

          {assignErr && (
            <p key={assignErrPulse} role="alert" className="micro-shake rounded-tile bg-negative-soft p-3 text-xs text-negative">
              {assignErr}
            </p>
          )}

          <DrawerFooter>
            <Button variant="secondary" onClick={() => setAssignOpen(false)} disabled={assignBusy}>
              Cancel
            </Button>
            <Button type="submit" form={assignFormId} loading={assignBusy}>
              Save Assignment
            </Button>
          </DrawerFooter>
        </form>
      </Drawer>

      {/* Mid-Month Target Override Drawer */}
      <Drawer open={targetOpen} onClose={() => setTargetOpen(false)} title={`Target Adjustment — ${tAgentName}`}>
        <form id={targetFormId} onSubmit={handleSaveTargetOverride} className="space-y-4">
          <p className="text-xs text-ink-muted">
            Adjust the {data.period.label} target for mid-month joining, leaving, or reassignment. Leave target blank to restore rule default.
          </p>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-ink-muted">Custom Monthly Target (Claims)</span>
            <input
              type="number"
              min={0}
              max={50000}
              value={tValue}
              onChange={(e) => setTValue(e.target.value)}
              placeholder="e.g. 50"
              className={cn(CONTROL, "h-10 tabular-nums")}
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-ink-muted">Audit Reason *</span>
            <textarea
              required
              minLength={3}
              rows={3}
              value={tReason}
              onChange={(e) => setTReason(e.target.value)}
              placeholder="e.g. Agent joined on 15 Nov; approved 50% pro-rata target"
              className={cn(CONTROL, "h-auto py-2")}
            />
          </label>

          {targetErr && (
            <p key={targetErrPulse} role="alert" className="micro-shake rounded-tile bg-negative-soft p-3 text-xs text-negative">
              {targetErr}
            </p>
          )}

          <DrawerFooter>
            <Button variant="secondary" onClick={() => setTargetOpen(false)} disabled={targetBusy}>
              Cancel
            </Button>
            <Button type="submit" form={targetFormId} loading={targetBusy}>
              Apply Target Override
            </Button>
          </DrawerFooter>
        </form>
      </Drawer>

      {/* Personalized Target & Special Milestones Drawer */}
      <Drawer
        open={stretchOpen}
        onClose={() => setStretchOpen(false)}
        title={`Personal Special Milestones — ${sAgentName}`}
      >
        <form id={stretchFormId} onSubmit={handleSaveStretchGoal} className="space-y-4">
          <div className="rounded-tile border border-accent/25 bg-accent-soft/40 p-3 text-xs text-ink">
            <p className="font-semibold">
              Common Base Target: <span className="tabular-nums">{sBaseTarget} claims</span>
            </p>
            <p className="mt-1 text-[11px] text-ink-muted">
              Optional higher milestone steps shown only on <b>{sAgentName}&apos;s</b> dashboard.
              Rewards hold flat between steps until the exact claim milestone is reached.
            </p>
          </div>

          {/* Step Chart Builder */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-ink-muted">Milestone Chart (after Base Target)</span>
              {sMilestones.some((row) => row.minClaims.trim() !== "" || row.rewardAmount.trim() !== "") && (
                <button
                  type="button"
                  onClick={() => setSMilestones([])}
                  className="text-[11px] text-ink-muted hover:text-negative transition-colors"
                >
                  Clear all steps
                </button>
              )}
            </div>

            {sMilestones.length === 0 ? (
              <p className="text-[11.5px] text-ink-muted py-2">
                No personal milestone steps set. Click Save to remove any existing special target, or add a step below.
              </p>
            ) : (
              <div className="space-y-2">
                <div className="grid grid-cols-[1fr_1fr_auto] gap-2 text-[11px] font-medium text-ink-muted px-0.5">
                  <span>Claims Reached</span>
                  <span>Extra Bonus (₹)</span>
                  <span className="w-8" />
                </div>

                {sMilestones.map((row, idx) => (
                  <div key={idx} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
                    <input
                      type="number"
                      min={1}
                      max={50000}
                      value={row.minClaims}
                      onChange={(e) => {
                        const next = [...sMilestones];
                        next[idx] = { ...next[idx], minClaims: e.target.value };
                        setSMilestones(next);
                      }}
                      placeholder="e.g. 80"
                      className={cn(CONTROL, "h-10 tabular-nums")}
                    />
                    <input
                      type="number"
                      min={0}
                      step="1"
                      value={row.rewardAmount}
                      onChange={(e) => {
                        const next = [...sMilestones];
                        next[idx] = { ...next[idx], rewardAmount: e.target.value };
                        setSMilestones(next);
                      }}
                      placeholder="e.g. 1000"
                      className={cn(CONTROL, "h-10 tabular-nums")}
                    />
                    <Button
                      variant="ghost"
                      onClick={() =>
                        setSMilestones(sMilestones.filter((_, rIdx) => rIdx !== idx))
                      }
                      className="h-10 w-8 p-0 text-ink-muted hover:text-negative"
                      aria-label="Remove milestone step"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <Button
              variant="secondary"
              onClick={() => {
                const lastClaims =
                  Number(sMilestones[sMilestones.length - 1]?.minClaims) || sBaseTarget;
                const lastReward = Number(sMilestones[sMilestones.length - 1]?.rewardAmount) || 500;
                setSMilestones([
                  ...sMilestones,
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

          {/* Live Hold-Flat Preview */}
          {(() => {
            const previewTiers = normalizeMonthlyMilestones(
              sMilestones
                .filter((r) => r.minClaims.trim() !== "")
                .map((r) => ({ minClaims: Number(r.minClaims), rewardAmount: Number(r.rewardAmount) })),
            );
            return (
              <div className="rounded-lg bg-surface-muted px-3 py-2.5 text-[11px] text-ink-muted leading-relaxed">
                {previewTiers.length === 0 ? (
                  <>No personal milestone chart active for this agent (common base target {sBaseTarget} applies).</>
                ) : (
                  <>
                    Base provisional holds flat up to <b>{previewTiers[0].minClaims - 1} claims</b>.{" "}
                    Steps:{" "}
                    <b>
                      {previewTiers
                        .map((t) => `${t.minClaims} claims → +₹${formatNumber(t.rewardAmount)}`)
                        .join(" · ")}
                    </b>
                    . Between steps, reward stays at the previous step until the next milestone is reached.
                  </>
                )}
              </div>
            );
          })()}

          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-ink-muted">Card Title (Optional)</span>
            <input
              type="text"
              maxLength={80}
              value={sLabel}
              onChange={(e) => setSLabel(e.target.value)}
              placeholder="e.g. Special Performance Milestones"
              className={cn(CONTROL, "h-10")}
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-ink-muted">Note (Optional)</span>
            <input
              type="text"
              maxLength={200}
              value={sReason}
              onChange={(e) => setSReason(e.target.value)}
              placeholder="Reason or note"
              className={cn(CONTROL, "h-10")}
            />
          </label>

          {stretchErr && (
            <p key={stretchErrPulse} role="alert" className="micro-shake rounded-tile bg-negative-soft p-3 text-xs text-negative">
              {stretchErr}
            </p>
          )}

          <DrawerFooter>
            <Button variant="secondary" onClick={() => setStretchOpen(false)} disabled={stretchBusy}>
              Cancel
            </Button>
            <Button type="submit" form={stretchFormId} loading={stretchBusy}>
              Save Milestones
            </Button>
          </DrawerFooter>
        </form>
      </Drawer>
    </div>
  );
}
