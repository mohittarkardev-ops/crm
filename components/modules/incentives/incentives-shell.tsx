"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Award,
  Ban,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  RefreshCw,
  TriangleAlert,
  Users,
  Wallet,
} from "lucide-react";
import { Button, buttonStyles } from "@/components/ui/button";
import { Card, CardHeader, Tile } from "@/components/ui/card";
import { GoalFlagMini } from "@/components/ui/characters";
import { IncentiveVehicleCharacter } from "@/components/ui/incentive-characters";
import { Chip } from "@/components/ui/chip";
import { CountUp } from "@/components/ui/count-up";
import { CustomSelect } from "@/components/ui/custom-select";
import { EmptyState } from "@/components/ui/empty-state";
import { MiniStat, StatRow } from "@/components/ui/mini-stat";
import { toast } from "@/components/ui/toaster";
import { useSlidingPill } from "@/components/ui/use-sliding-pill";
import { AgentMyIncentivesView } from "@/components/modules/incentives/agent-my-incentives-view";
import { AnimatedProgressBar } from "@/components/modules/incentives/animated-progress-bar";
import { AssignmentsPinTab } from "@/components/modules/incentives/assignments-pin-tab";
import { DailyLedgerTab } from "@/components/modules/incentives/daily-ledger-tab";
import { downloadCsv, downloadXlsx } from "@/components/modules/incentives/export-utils";
import { RulesTab } from "@/components/modules/incentives/rules-tab";
import { SettlementsPayoutsTab } from "@/components/modules/incentives/settlements-payouts-tab";
import { reconcilePeriodAction } from "@/lib/actions/incentives";
import { cn } from "@/lib/cn";
import type { IncentivesDashboardPayload } from "@/lib/data/incentives";
import { formatINR } from "@/lib/format";
import {
  SETTLEMENT_STATUS_LABELS,
  VEHICLE_CATEGORIES,
  formatMonthTitle,
  shiftMonthIso,
  type SettlementStatus,
  type VehicleCategory,
} from "@/lib/incentives";
import { chipFor } from "@/lib/status";
import { useSavedFlag } from "@/lib/use-transient-state";

type AdminNavTab =
  | "overview"
  | "2W"
  | "4W"
  | "CW"
  | "ledger"
  | "rules"
  | "assignments"
  | "settlements";

const ADMIN_TABS: { key: AdminNavTab; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "2W", label: "2W Dashboard" },
  { key: "4W", label: "4W Dashboard" },
  { key: "CW", label: "CW Dashboard" },
  { key: "ledger", label: "Daily & Ledger" },
  { key: "rules", label: "Rule Builder" },
  { key: "assignments", label: "Assignments & PIN" },
  { key: "settlements", label: "Settlement & Payouts" },
];

export function IncentivesShell({ data }: { data: IncentivesDashboardPayload }) {
  const [tab, setTab] = useState<AdminNavTab>("overview");
  const [stateFilter, setStateFilter] = useState("__all__");
  const [syncing, setSyncing] = useState(false);
  const [syncSaved, flashSyncSaved] = useSavedFlag();
  const [exportSaved, flashExportSaved] = useSavedFlag();
  const tabsRef = useRef<HTMLDivElement>(null);
  const { rect: tabPillRect, animated: tabPillAnimated } = useSlidingPill(tabsRef, tab);

  const stateFilterOptions = useMemo(() => {
    const states = Array.from(
      new Set(data.monthlyAgents.map((a) => a.assignedState).filter((x): x is string => Boolean(x))),
    ).sort((a, b) => a.localeCompare(b));
    return [{ value: "__all__", label: "All States" }, ...states.map((s) => ({ value: s, label: s }))];
  }, [data.monthlyAgents]);

  if (!data.canManage) {
    return (
      <div className="space-y-4">
        {data.migrationMissing && (
          <p className="flex items-start gap-2 rounded-control bg-warning-soft px-3 py-2 text-xs text-warning">
            <TriangleAlert size={14} className="mt-0.5 shrink-0" />
            <span>The Admin must execute migration <b>0015_full_incentive_engine.sql</b> in Supabase to activate incentive tracking.</span>
          </p>
        )}
        <AgentMyIncentivesView data={data} />
      </div>
    );
  }

  const currentMonthIso = data.todayIso.slice(0, 7);
  const prevMonthIso = shiftMonthIso(data.monthIso, -1);
  const nextMonthIso = shiftMonthIso(data.monthIso, 1);
  const canGoNext = data.monthIso < currentMonthIso;

  const handleQuickSync = async () => {
    setSyncing(true);
    try {
      const res = await reconcilePeriodAction(data.monthIso, true);
      if (res.ok) {
        flashSyncSaved();
        toast(res.message ?? "Reconciled period.");
      } else {
        toast(res.error ?? "Could not reconcile.", "error");
      }
    } finally {
      setSyncing(false);
    }
  };

  const handleExportSummary = async (kind: "csv" | "xlsx") => {
    const headers = [
      "Agent",
      "Employee Code",
      "Vehicle Category",
      "Assigned State",
      "Monthly Target",
      "Eligible Claims",
      "Non-Qualifying Claims",
      "Held Claims",
      "Target Achieved",
      "Daily Earnings ₹",
      "Monthly Milestone ₹",
      "Stretch Target",
      "Stretch Uplift ₹",
      "Provisional ₹",
      "Adjustments ₹",
      "Forfeited ₹",
      "Settlement Status",
      "Finalized Payable ₹",
      "Paid ₹",
      "Outstanding ₹",
    ];
    const rows = data.monthlyAgents.map((m) => [
      m.staffName,
      m.employeeCode ?? "",
      m.vehicleCategory ?? "",
      m.assignedState ?? "",
      m.effectiveTarget,
      m.eligibleClaimsCount,
      m.nonQualifyingClaimsCount,
      m.heldClaimsCount,
      m.targetAchieved ? "Yes" : "No",
      m.dailyProvisionalEarnings,
      m.monthlyMilestoneBonus,
      m.stretchTarget ?? "",
      m.stretchBonusAmount,
      m.provisionalEarnings,
      m.adjustmentsTotal,
      m.forfeitedAmount,
      m.settlementStatus ?? "open",
      m.finalizedPayable,
      m.paidAmount,
      m.outstandingAmount,
    ]);
    if (kind === "csv") downloadCsv(`incentive_summary_${data.monthIso}`, headers, rows);
    else await downloadXlsx(`incentive_summary_${data.monthIso}`, [{ name: "Monthly Summary", headers, rows }]);
    flashExportSaved();
  };

  return (
    <div className="space-y-4">
      {data.migrationMissing && (
        <p className="flex items-start gap-2 rounded-control bg-warning-soft px-3 py-2 text-xs text-warning">
          <TriangleAlert size={14} strokeWidth={1.75} className="mt-0.5 shrink-0" />
          <span>
            Run <b>supabase/migrations/0015_full_incentive_engine.sql</b> in Supabase SQL Editor to activate the full PIN directory, rule versioning, assignment history, ledger, settlements &amp; payout tables.
          </span>
        </p>
      )}

      {/* Top Navigation & Period Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          ref={tabsRef}
          role="tablist"
          aria-label="Incentive workspace sections"
          className="relative flex flex-wrap items-center gap-1 rounded-[6px] border border-ink bg-surface-strong p-0.5"
        >
          {tabPillRect && (
            <span
              aria-hidden="true"
              style={{
                left: 0,
                top: 0,
                width: tabPillRect.width,
                height: tabPillRect.height,
                transform: `translate3d(${tabPillRect.left}px, ${tabPillRect.top}px, 0)`,
              }}
              className={cn(
                "pointer-events-none absolute z-0 rounded-[4px] bg-ink",
                tabPillAnimated && "transition-[transform,width,height] duration-200 ease-[cubic-bezier(0.2,0.8,0.2,1)]",
              )}
            />
          )}
          {ADMIN_TABS.map((t) => {
            const active = tab === t.key;
            const badge =
              t.key === "settlements" && data.exceptions.length > 0 ? data.exceptions.length : null;
            return (
              <button
                key={t.key}
                type="button"
                role="tab"
                data-pill-key={t.key}
                aria-selected={active}
                onClick={() => setTab(t.key)}
                className={cn(
                  "relative z-10 inline-flex h-8 items-center gap-1.5 rounded-[4px] px-3 text-xs font-medium transition-colors duration-150",
                  active
                    ? tabPillRect
                      ? "bg-transparent font-semibold text-white"
                      : "bg-ink font-semibold text-white"
                    : "text-ink-muted hover:text-ink",
                )}
              >
                {t.label}
                {badge !== null && (
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-0.2 text-[10px] font-bold tabular-nums transition-colors duration-150",
                      active ? "bg-accent text-ink" : "bg-warning-soft text-warning",
                    )}
                  >
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Chip tone={chipFor(data.period.status).tone}>
            {SETTLEMENT_STATUS_LABELS[data.period.status as SettlementStatus] ?? data.period.status}
          </Chip>

          {/* Month Switcher */}
          <div className="inline-flex h-10 items-center rounded-control border border-divider bg-surface-strong px-1">
            <Link href={`/incentives?month=${prevMonthIso}`} aria-label="Previous month" className={buttonStyles("icon", "size-8")}>
              <ChevronLeft size={16} />
            </Link>
            <span className="min-w-[126px] px-2 text-center text-xs font-semibold text-ink tabular-nums">
              {formatMonthTitle(data.monthIso)}
            </span>
            {canGoNext ? (
              <Link href={`/incentives?month=${nextMonthIso}`} aria-label="Next month" className={buttonStyles("icon", "size-8")}>
                <ChevronRight size={16} />
              </Link>
            ) : (
              <span aria-disabled="true" className="grid size-8 place-items-center text-ink-faint opacity-45">
                <ChevronRight size={16} />
              </span>
            )}
          </div>

          <Button
            variant="secondary"
            saved={exportSaved}
            savedLabel="Exported"
            onClick={() => void handleExportSummary("xlsx")}
            className="h-10 px-3 text-xs"
          >
            <Download size={14} /> Export Excel
          </Button>
          <Button
            saved={syncSaved}
            savedLabel="Synced"
            onClick={handleQuickSync}
            loading={syncing}
            className="h-10 px-3.5 text-xs"
          >
            <RefreshCw size={14} /> Sync Engine
          </Button>
        </div>
      </div>

      {/* 1. OVERVIEW TAB (8 Admin KPIs + Vehicle Cards + State Matrix + Monthly Ranking) */}
      {tab === "overview" && (
        <div key="overview" className="fade-up space-y-4">
          <Card index={0} className="p-4 sm:px-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="hidden shrink-0 sm:block">
                  <IncentiveVehicleCharacter
                    variant="all"
                    qualified={data.kpis.finalizedPayable > 0 || data.kpis.eligibleClaims > 0}
                  />
                </div>
                <div className="space-y-1">
                  <h2 className="text-[15px] font-semibold text-ink">
                    Executive Incentive Overview — {formatMonthTitle(data.monthIso)}
                  </h2>
                  <p className="text-xs text-ink-muted">
                    Every rupee traces back to an eligible claim, customer PIN state, active agent assignment snapshot, and immutable rule version.
                  </p>
                </div>
              </div>
              <Button variant="secondary" onClick={() => setTab("settlements")} className="h-9 px-3 text-xs">
                {data.exceptions.length > 0
                  ? `Review ${data.exceptions.length} Held Exception${data.exceptions.length === 1 ? "" : "s"}`
                  : "Month-End Settlement"}
              </Button>
            </div>
          </Card>

          <StatRow>
            <MiniStat index={0} title="Enrolled Agents" icon={Users} value={data.kpis.totalEnrolledAgents} />
            <MiniStat index={1} title="Eligible Claims" icon={CheckCircle2} value={data.kpis.eligibleClaims} />
            <MiniStat index={2} title="Provisional Earnings" icon={Clock} value={data.kpis.provisionalEarnings} kind="inr" />
            <MiniStat index={3} title="Pending Exceptions" icon={AlertTriangle} value={data.kpis.pendingReviews} />
          </StatRow>
          <StatRow>
            <MiniStat index={4} title="Finalized Payable" icon={Award} value={data.kpis.finalizedPayable} kind="inr" />
            <MiniStat index={5} title="Paid Incentives" icon={Wallet} value={data.kpis.paidIncentives} kind="inr" />
            <MiniStat index={6} title="Outstanding Payouts" icon={Clock} value={data.kpis.outstandingPayouts} kind="inr" />
            <MiniStat index={7} title="Forfeited Earnings" icon={Ban} value={data.kpis.forfeitedEarnings} kind="inr" />
          </StatRow>

          {/* Dedicated 2W / 4W / CW Quick Cards */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {VEHICLE_CATEGORIES.map((cat, idx) => {
              const agents = data.monthlyAgents.filter((m) => m.vehicleCategory === cat.key);
              const eligible = agents.reduce((s, a) => s + a.eligibleClaimsCount, 0);
              const provisional = agents.reduce((s, a) => s + a.provisionalEarnings, 0);
              const qualified = agents.filter((a) => a.targetAchieved).length;
              return (
                <Card key={cat.key} index={idx + 8} className="flex flex-col justify-between gap-4">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2 border-b-[1.5px] border-rule pb-3">
                      <div>
                        <p className="text-[15px] font-semibold text-ink">{cat.label}</p>
                        <p className="text-[11px] text-ink-muted">
                          {agents.length} enrolled CSE{agents.length === 1 ? "" : "s"} · {qualified} target met
                        </p>
                      </div>
                      <Chip tone="neutral">{cat.shortLabel}</Chip>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5 text-xs">
                      <Tile className="p-3">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">Eligible Claims</p>
                        <p className="mt-1 text-lg font-bold text-ink tabular-nums">
                          <CountUp value={eligible} />
                        </p>
                      </Tile>
                      <Tile className="p-3">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">Provisional Pool</p>
                        <p className="mt-1 text-lg font-bold text-ink tabular-nums">
                          <CountUp value={provisional} kind="inr" />
                        </p>
                      </Tile>
                    </div>
                  </div>

                  <div className="flex items-center justify-end pt-1">
                    <Button
                      variant="secondary"
                      onClick={() => setTab(cat.key)}
                      className="group h-8 px-3 text-xs"
                    >
                      Open {cat.shortLabel} Dashboard{" "}
                      <ArrowRight size={13} className="transition-transform duration-150 group-hover:translate-x-0.5" />
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* State Comparison Table (Proposal p. 13) */}
          <Card index={11}>
            <CardHeader title="State-Wise Incentive Comparison" action={<GoalFlagMini />} />
            {data.stateStats.length === 0 ? (
              <EmptyState
                label="No agent assignments or state metrics yet"
                hint="Assign CSEs under Assignments & PIN to track state-by-state incentive liabilities."
                className="py-8"
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-divider text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
                      <th className="pb-2.5 pr-4">State</th>
                      <th className="pb-2.5 pr-4 text-right">Assigned Agents</th>
                      <th className="pb-2.5 pr-4 text-right">Eligible Claims</th>
                      <th className="pb-2.5 pr-4 text-right">Avg Incentive / Claim</th>
                      <th className="pb-2.5 pr-4 text-right">Provisional Liability</th>
                      <th className="pb-2.5 pr-4 text-right">Finalized Payable</th>
                      <th className="pb-2.5 text-right">Paid</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-divider/60">
                    {data.stateStats.map((st) => (
                      <tr key={st.state} className="h-12 transition-colors hover:bg-accent-soft/30">
                        <td className="py-2 pr-4 font-semibold text-ink">{st.state}</td>
                        <td className="py-2 pr-4 text-right tabular-nums text-ink">{st.assignedAgents}</td>
                        <td className="py-2 pr-4 text-right tabular-nums font-medium text-ink">{st.eligibleClaims}</td>
                        <td className="py-2 pr-4 text-right tabular-nums text-ink-muted">{formatINR(st.avgPerClaim)}</td>
                        <td className="py-2 pr-4 text-right tabular-nums font-semibold text-ink">{formatINR(st.provisionalEarnings)}</td>
                        <td className="py-2 pr-4 text-right tabular-nums text-ink">{formatINR(st.finalizedPayable)}</td>
                        <td className="py-2 text-right tabular-nums text-positive font-medium">{formatINR(st.paidAmount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* 2. DEDICATED 2W / 4W / CW VEHICLE DASHBOARDS (Proposal p. 13) */}
      {(tab === "2W" || tab === "4W" || tab === "CW") && (
        <div key={tab} className="fade-up">
          <VehicleCategoryDashboard
            category={tab}
            data={data}
            stateFilter={stateFilter}
            stateFilterOptions={stateFilterOptions}
            onStateFilterChange={setStateFilter}
            onOpenRules={() => setTab("rules")}
          />
        </div>
      )}

      {tab === "ledger" && (
        <div key="ledger" className="fade-up">
          <DailyLedgerTab data={data} />
        </div>
      )}
      {tab === "rules" && (
        <div key="rules" className="fade-up">
          <RulesTab data={data} />
        </div>
      )}
      {tab === "assignments" && (
        <div key="assignments" className="fade-up">
          <AssignmentsPinTab data={data} />
        </div>
      )}
      {tab === "settlements" && (
        <div key="settlements" className="fade-up">
          <SettlementsPayoutsTab data={data} />
        </div>
      )}
    </div>
  );
}

function VehicleCategoryDashboard({
  category,
  data,
  stateFilter,
  stateFilterOptions,
  onStateFilterChange,
  onOpenRules,
}: {
  category: VehicleCategory;
  data: IncentivesDashboardPayload;
  stateFilter: string;
  stateFilterOptions: { value: string; label: string }[];
  onStateFilterChange: (val: string) => void;
  onOpenRules: () => void;
}) {
  const catMeta = VEHICLE_CATEGORIES.find((c) => c.key === category)!;
  const rows = data.monthlyAgents.filter((m) => {
    if (m.vehicleCategory !== category) return false;
    if (stateFilter !== "__all__" && m.assignedState !== stateFilter) return false;
    return true;
  });

  const totalClaims = rows.reduce((s, r) => s + r.eligibleClaimsCount, 0);
  const qualifiedAgents = rows.filter((r) => r.targetAchieved).length;
  const totalProvisional = rows.reduce((s, r) => s + r.provisionalEarnings, 0);
  const totalPayable = rows.reduce((s, r) => s + r.finalizedPayable, 0);

  return (
    <div className="space-y-4">
      <Card index={0} className="p-4 sm:px-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="hidden shrink-0 sm:block">
              <IncentiveVehicleCharacter variant={category} qualified={qualifiedAgents > 0} />
            </div>
            <div className="space-y-1">
              <h2 className="text-[15px] font-semibold text-ink">{catMeta.label} Incentive Dashboard</h2>
              <p className="text-xs text-ink-muted">
                Tracks {rows.length} assigned agent(s). Missed daily targets do not deduct prior earnings; monthly qualification unlocks payout.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="w-44">
              <CustomSelect value={stateFilter} onChange={onStateFilterChange} options={stateFilterOptions} searchable className="h-9 text-xs" />
            </div>
            <Button variant="secondary" onClick={onOpenRules} className="h-9 px-3 text-xs">
              Configure {category} Rules
            </Button>
          </div>
        </div>
      </Card>

      <StatRow>
        <MiniStat index={1} title={`${category} Eligible Claims`} icon={CheckCircle2} value={totalClaims} />
        <MiniStat index={2} title="Targets Achieved" icon={Users} value={qualifiedAgents} />
        <MiniStat index={3} title="Provisional Liability" icon={Clock} value={totalProvisional} kind="inr" />
        <MiniStat index={4} title="Finalized Payable" icon={Wallet} value={totalPayable} kind="inr" />
      </StatRow>

      <Card index={5}>
        <CardHeader title={`${category} Agent Performance Breakdown (${rows.length})`} />
        {rows.length === 0 ? (
          <EmptyState label={`No ${category} agents enrolled for the selected filter`} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-divider text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
                  <th className="pb-2.5 pr-3">Agent / State</th>
                  <th className="pb-2.5 pr-3 text-right">Eligible Claims</th>
                  <th className="pb-2.5 pr-3">Monthly Target</th>
                  <th className="pb-2.5 pr-3 text-right">Provisional</th>
                  <th className="pb-2.5 pr-3 text-right">Finalized Payable</th>
                  <th className="pb-2.5">Settlement &amp; Payout</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-divider/60">
                {rows.map((r) => (
                  <tr key={r.staffId} className="h-14 transition-colors hover:bg-accent-soft/30">
                    <td className="py-2 pr-3">
                      <p className="font-semibold text-ink">{r.staffName}</p>
                      <p className="text-[11px] text-ink-muted">{r.assignedState ?? "Unassigned"}</p>
                    </td>
                    <td className="py-2 pr-3 text-right font-semibold text-ink tabular-nums">
                      {r.eligibleClaimsCount}
                      {r.nonQualifyingClaimsCount > 0 && (
                        <span className="block text-[10px] font-normal text-ink-faint">
                          +{r.nonQualifyingClaimsCount} excluded
                        </span>
                      )}
                    </td>
                    <td className="py-2 pr-3 min-w-[160px]">
                      <div className="flex items-center gap-2">
                        <AnimatedProgressBar pct={r.progressPct} positive={r.targetAchieved} className="h-1.5 flex-1" />
                        <span className="text-[11px] tabular-nums text-ink-muted">
                          {r.eligibleClaimsCount}/{r.effectiveTarget}
                        </span>
                      </div>
                      {r.stretchTarget && r.stretchTarget > 0 && (
                        <p className="mt-0.5 text-[10px] tabular-nums text-accent-text">
                          Special Goal: {r.eligibleClaimsCount}/{r.stretchTarget} {r.stretchAchieved ? "✓ Unlocked" : ""}
                        </p>
                      )}
                    </td>
                    <td className="py-2 pr-3 text-right font-semibold text-ink tabular-nums">
                      {formatINR(r.provisionalEarnings)}
                      {(r.monthlyMilestoneBonus > 0 || r.stretchBonusAmount > 0) && (
                        <span className="block text-[10px] font-normal text-ink-faint">
                          {r.monthlyMilestoneBonus > 0 ? `+${formatINR(r.monthlyMilestoneBonus)} mo ` : ""}
                          {r.stretchBonusAmount > 0 ? `+${formatINR(r.stretchBonusAmount)} stretch` : ""}
                        </span>
                      )}
                    </td>
                    <td className="py-2 pr-3 text-right font-bold text-ink tabular-nums">
                      {formatINR(r.finalizedPayable)}
                    </td>
                    <td className="py-2">
                      {r.settlementStatus ? (
                        <Chip tone={chipFor(r.settlementStatus).tone}>
                          {SETTLEMENT_STATUS_LABELS[r.settlementStatus as SettlementStatus] ?? r.settlementStatus}
                        </Chip>
                      ) : (
                        <Chip tone={r.targetAchieved ? "positive" : "warning"}>
                          {r.targetAchieved ? "Target Met" : "Open"}
                        </Chip>
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
  );
}
