"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Award,
  CalendarOff,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  SlidersHorizontal,
  TriangleAlert,
  TrendingDown,
  Users,
  Wallet,
} from "lucide-react";
import { HolidayDrawer } from "@/components/modules/incentives/holiday-drawer";
import { RuleEditorDrawer } from "@/components/modules/incentives/rule-editor-drawer";
import { Button, buttonStyles } from "@/components/ui/button";
import { Card, CardHeader, Tile } from "@/components/ui/card";
import { ClaimTrophyCharacter, GoalFlagMini, VehicleScoutCharacter } from "@/components/ui/characters";
import { Chip } from "@/components/ui/chip";
import { CustomSelect } from "@/components/ui/custom-select";
import { EmptyState } from "@/components/ui/empty-state";
import { MiniStat, StatRow } from "@/components/ui/mini-stat";
import { Segmented } from "@/components/ui/segmented";
import { cn } from "@/lib/cn";
import type { IncentivesDashboardPayload } from "@/lib/data/incentives";
import { formatDate, formatINR } from "@/lib/format";
import {
  PAYOUT_MODE_LABELS,
  VEHICLE_CATEGORIES,
  WEEKDAYS,
  formatMonthTitle,
  shiftMonthIso,
  type VehicleCategory,
} from "@/lib/incentives";

type TabKey = "all" | VehicleCategory;

function workingDaySummary(days: number[]): string {
  if (days.length === 7) return "Every day (Mon–Sun)";
  if (days.length === 6 && !days.includes(7)) return "Mon–Sat (Sundays off)";
  if (days.length === 5 && !days.includes(6) && !days.includes(7)) return "Mon–Fri";
  return WEEKDAYS.filter((w) => days.includes(w.value))
    .map((w) => w.short)
    .join(", ");
}

function slabRateText(mode: string, amount: number): string {
  if (mode === "per_payment") return `${formatINR(amount)}/payment`;
  return formatINR(amount);
}

export function IncentivesShell({ data }: { data: IncentivesDashboardPayload }) {
  const [tab, setTab] = useState<TabKey>("all");
  const [selectedStaffId, setSelectedStaffId] = useState<string>(
    data.overallByCse[0]?.staffId ?? "",
  );
  const [ruleDrawerOpen, setRuleDrawerOpen] = useState(false);
  const [ruleDrawerCat, setRuleDrawerCat] = useState<VehicleCategory>("2W");
  const [holidayDrawerOpen, setHolidayDrawerOpen] = useState(false);

  const currentMonthIso = data.todayIso.slice(0, 7);
  const prevMonthIso = shiftMonthIso(data.monthIso, -1);
  const nextMonthIso = shiftMonthIso(data.monthIso, 1);
  const canGoNext = data.monthIso < currentMonthIso;

  const openRulesFor = (cat: VehicleCategory) => {
    setRuleDrawerCat(cat);
    setRuleDrawerOpen(true);
  };

  // Filtered view when Admin inspects one specific CSE vs All CSEs.
  const staffFilterOptions = useMemo(
    () => [
      { value: "__all__", label: "All CSEs" },
      ...data.overallByCse.map((s) => ({
        value: s.staffId,
        label: s.employeeCode ? `${s.staffName} (${s.employeeCode})` : s.staffName,
      })),
    ],
    [data.overallByCse],
  );
  const [filterStaffId, setFilterStaffId] = useState<string>("__all__");

  const activeVehicle = tab === "all" ? null : data.dashboards[tab];
  const focusedStaffId =
    data.canManage && filterStaffId !== "__all__"
      ? filterStaffId
      : data.canManage
        ? selectedStaffId || data.overallByCse[0]?.staffId || ""
        : data.overallByCse[0]?.staffId || "";

  const totalApprovedAll =
    data.dashboards["2W"].totalApproved +
    data.dashboards["4W"].totalApproved +
    data.dashboards.CV.totalApproved;
  const totalNetAll =
    data.dashboards["2W"].totalNetPayable +
    data.dashboards["4W"].totalNetPayable +
    data.dashboards.CV.totalNetPayable;
  const totalDailyBonusAll =
    data.dashboards["2W"].totalDailyEarned +
    data.dashboards["4W"].totalDailyEarned +
    data.dashboards.CV.totalDailyEarned;
  const totalPenaltyAll =
    data.dashboards["2W"].totalDailyPenalty +
    data.dashboards["4W"].totalDailyPenalty +
    data.dashboards.CV.totalDailyPenalty;

  return (
    <div className="space-y-4">
      {data.migrationMissing && (
        <p className="flex items-start gap-2 rounded-control bg-warning-soft px-3 py-2 text-xs text-warning">
          <TriangleAlert size={14} strokeWidth={1.75} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span>
            Showing preview defaults — run <b>supabase/migrations/0014_claims_doc_and_incentives.sql</b> in Supabase SQL Editor to persist custom vehicle rules and holidays.
          </span>
        </p>
      )}

      {/* Top Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented<TabKey>
          label="Vehicle incentive dashboards"
          value={tab}
          onChange={setTab}
          options={[
            { value: "all", label: "All Vehicles" },
            { value: "2W", label: "2W Dashboard" },
            { value: "4W", label: "4W Dashboard" },
            { value: "CV", label: "CV Dashboard" },
          ]}
        />

        <div className="flex flex-wrap items-center gap-2">
          {/* Month Switcher */}
          <div className="inline-flex h-10 items-center rounded-control border border-divider bg-surface-strong px-1">
            <Link
              href={`/incentives?month=${prevMonthIso}`}
              aria-label="Previous month"
              className={buttonStyles("icon", "size-8")}
            >
              <ChevronLeft size={16} />
            </Link>
            <span className="min-w-[126px] px-2 text-center text-xs font-semibold text-ink tabular-nums">
              {formatMonthTitle(data.monthIso)}
            </span>
            {canGoNext ? (
              <Link
                href={`/incentives?month=${nextMonthIso}`}
                aria-label="Next month"
                className={buttonStyles("icon", "size-8")}
              >
                <ChevronRight size={16} />
              </Link>
            ) : (
              <span
                aria-disabled="true"
                className="grid size-8 place-items-center text-ink-faint opacity-45"
              >
                <ChevronRight size={16} />
              </span>
            )}
          </div>

          {data.canManage && (
            <>
              <div className="w-44">
                <CustomSelect
                  value={filterStaffId}
                  onChange={(val) => {
                    setFilterStaffId(val);
                    if (val !== "__all__") setSelectedStaffId(val);
                  }}
                  options={staffFilterOptions}
                  searchable
                  className="h-10 text-xs font-medium"
                />
              </div>

              <Button
                variant="secondary"
                onClick={() => setHolidayDrawerOpen(true)}
                className="h-10 px-3 text-xs"
              >
                <CalendarOff size={14} />
                Holidays ({data.holidays.length})
              </Button>

              <Button
                onClick={() => openRulesFor(tab === "all" ? "2W" : tab)}
                className="h-10 px-3.5 text-xs"
              >
                <SlidersHorizontal size={14} />
                {tab === "all" ? "Configure Rules" : `Edit ${tab} Rules`}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Mode 1: All Vehicles Overview */}
      {tab === "all" && (
        <>
          <StatRow>
            <MiniStat index={0} title="Approved Payments" icon={CheckCircle2} value={totalApprovedAll} />
            <MiniStat
              index={1}
              title={data.canManage ? "Net Incentive Pool" : "Your Net Incentive"}
              icon={Wallet}
              value={totalNetAll}
              kind="inr"
            />
            <MiniStat
              index={2}
              title="Daily Bonuses Earned"
              icon={Award}
              value={totalDailyBonusAll}
              kind="inr"
            />
            <MiniStat
              index={3}
              title="Missed-Day Deductions"
              icon={TrendingDown}
              value={totalPenaltyAll}
              kind="inr"
            />
          </StatRow>

          {/* 3 Dedicated Vehicle Cards */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {VEHICLE_CATEGORIES.map((cat, idx) => {
              const v = data.dashboards[cat.key];
              const focused = v.entries.find((e) => e.staffId === focusedStaffId) ?? v.entries[0];
              return (
                <Card key={cat.key} index={idx + 4} className="flex flex-col justify-between gap-4">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2 border-b-[1.5px] border-rule pb-3">
                      <div>
                        <p className="text-[15px] font-semibold text-ink">{cat.label}</p>
                        <p className="text-[11px] text-ink-muted">{PAYOUT_MODE_LABELS[v.rule.payoutMode]}</p>
                      </div>
                      <Chip tone={v.rule.isActive ? "positive" : "neutral"}>
                        {v.rule.isActive ? "Active" : "Paused"}
                      </Chip>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5 text-xs">
                      <Tile className="p-3">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
                          Approved
                        </p>
                        <p className="mt-1 text-lg font-bold text-ink tabular-nums">
                          {v.totalApproved.toLocaleString("en-IN")}
                        </p>
                      </Tile>
                      <Tile className="p-3">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
                          {data.canManage ? "Net Pool" : "Your Net"}
                        </p>
                        <p className="mt-1 text-lg font-bold text-ink tabular-nums">
                          {formatINR(v.totalNetPayable)}
                        </p>
                      </Tile>
                    </div>

                    <div className="space-y-1.5 rounded-tile border border-divider/60 bg-surface-muted/30 p-3 text-xs">
                      <div className="flex items-center justify-between text-ink-muted">
                        <span>Minimum to unlock</span>
                        <span className="font-semibold text-ink tabular-nums">
                          {v.rule.monthlyMinPayments} payments
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-ink-muted">
                        <span>Slabs</span>
                        <span className="font-medium text-ink tabular-nums">
                          {v.rule.slabs
                            .map((s) => `${s.minPayments}→${slabRateText(v.rule.payoutMode, s.amount)}`)
                            .join(" · ")}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-ink-muted">
                        <span>Daily rule</span>
                        <span className="font-medium text-ink tabular-nums">
                          {v.rule.dailyTarget > 0
                            ? `${v.rule.dailyTarget}/day · Loss ${formatINR(v.rule.dailyForfeitAmount)}`
                            : "No daily penalty"}
                        </span>
                      </div>
                      {!data.canManage && focused && (
                        <div className="flex items-center justify-between border-t border-divider/50 pt-1.5 text-ink-muted">
                          <span>Missed days</span>
                          <span className="font-semibold text-negative tabular-nums">
                            {focused.missedDays} day{focused.missedDays === 1 ? "" : "s"}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1">
                    {data.canManage ? (
                      <Button
                        variant="ghost"
                        onClick={() => openRulesFor(cat.key)}
                        className="h-8 px-2.5 text-xs"
                      >
                        <SlidersHorizontal size={13} />
                        Edit Rules
                      </Button>
                    ) : (
                      <span className="text-[11px] text-ink-faint">
                        {workingDaySummary(v.rule.workingDays)}
                      </span>
                    )}
                    <Button
                      variant="secondary"
                      onClick={() => setTab(cat.key)}
                      className="h-8 px-3 text-xs"
                    >
                      Open {cat.shortLabel} Dashboard
                      <ArrowRight size={13} />
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Combined CSE Payout Table */}
          <Card index={7}>
            <CardHeader
              title={data.canManage ? "CSE Monthly Incentive Summary (2W + 4W + CV)" : "Your Combined Monthly Summary"}
              action={<GoalFlagMini />}
            />
            {data.overallByCse.length === 0 ? (
              <EmptyState label="No staff incentive records for this month" className="py-10" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-divider text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
                      <th className="pb-2.5 pr-4">CSE</th>
                      <th className="pb-2.5 pr-4 text-right">2W (Count / Net)</th>
                      <th className="pb-2.5 pr-4 text-right">4W (Count / Net)</th>
                      <th className="pb-2.5 pr-4 text-right">CV (Count / Net)</th>
                      <th className="pb-2.5 pr-4 text-right">Missed Days</th>
                      <th className="pb-2.5 pr-4 text-right">Daily Loss</th>
                      <th className="pb-2.5 text-right">Total Net Payout</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-divider/60">
                    {data.overallByCse
                      .filter((r) => !data.canManage || filterStaffId === "__all__" || r.staffId === filterStaffId)
                      .map((row) => (
                        <tr
                          key={row.staffId}
                          className="h-12 transition-colors hover:bg-accent-soft/40"
                        >
                          <td className="py-2.5 pr-4 font-semibold text-ink">
                            {row.staffName}
                            {row.employeeCode && (
                              <span className="ml-1.5 text-[11px] font-normal text-ink-faint">
                                ({row.employeeCode})
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 pr-4 text-right tabular-nums text-ink-muted">
                            <span className="font-semibold text-ink">{row.counts["2W"]}</span> / {formatINR(row.nets["2W"])}
                          </td>
                          <td className="py-2.5 pr-4 text-right tabular-nums text-ink-muted">
                            <span className="font-semibold text-ink">{row.counts["4W"]}</span> / {formatINR(row.nets["4W"])}
                          </td>
                          <td className="py-2.5 pr-4 text-right tabular-nums text-ink-muted">
                            <span className="font-semibold text-ink">{row.counts.CV}</span> / {formatINR(row.nets.CV)}
                          </td>
                          <td className="py-2.5 pr-4 text-right tabular-nums">
                            {row.totalMissedDays > 0 ? (
                              <Chip tone="negative">{row.totalMissedDays}</Chip>
                            ) : (
                              <Chip tone="positive">0</Chip>
                            )}
                          </td>
                          <td className="py-2.5 pr-4 text-right tabular-nums text-negative">
                            {row.totalDailyPenalty > 0 ? `-${formatINR(row.totalDailyPenalty)}` : "₹0"}
                          </td>
                          <td className="py-2.5 text-right text-sm font-bold text-ink tabular-nums">
                            {formatINR(row.totalNet)}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}

      {/* Mode 2: Dedicated Per-Vehicle Dashboard (2W | 4W | CV) */}
      {activeVehicle && (
        <VehicleDashboardView
          vehicle={activeVehicle}
          canManage={data.canManage}
          filterStaffId={filterStaffId}
          focusedStaffId={focusedStaffId}
          onSelectStaff={(id) => setSelectedStaffId(id)}
          onEditRule={() => openRulesFor(activeVehicle.category)}
        />
      )}

      {data.canManage && (
        <>
          <RuleEditorDrawer
            open={ruleDrawerOpen}
            initialCategory={ruleDrawerCat}
            rules={data.rules}
            onClose={() => setRuleDrawerOpen(false)}
          />
          <HolidayDrawer
            open={holidayDrawerOpen}
            holidays={data.holidays}
            onClose={() => setHolidayDrawerOpen(false)}
          />
        </>
      )}
    </div>
  );
}

function VehicleDashboardView({
  vehicle,
  canManage,
  filterStaffId,
  focusedStaffId,
  onSelectStaff,
  onEditRule,
}: {
  vehicle: IncentivesDashboardPayload["dashboards"][VehicleCategory];
  canManage: boolean;
  filterStaffId: string;
  focusedStaffId: string;
  onSelectStaff: (staffId: string) => void;
  onEditRule: () => void;
}) {
  const visibleEntries = useMemo(() => {
    if (!canManage || filterStaffId === "__all__") return vehicle.entries;
    return vehicle.entries.filter((e) => e.staffId === filterStaffId);
  }, [vehicle.entries, canManage, filterStaffId]);

  const focusedEntry =
    visibleEntries.find((e) => e.staffId === focusedStaffId) ?? visibleEntries[0] ?? null;

  const { rule } = vehicle;

  return (
    <div className="space-y-4">
      {/* Companion Rule Overview Banner */}
      <Card index={0} className="p-4 sm:px-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <div className="hidden shrink-0 sm:block">
              {focusedEntry?.qualified ? <ClaimTrophyCharacter /> : <VehicleScoutCharacter />}
            </div>
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-[15px] font-semibold text-ink">{vehicle.label} Incentive Rules</h2>
                <Chip tone={rule.isActive ? "positive" : "neutral"}>
                  {rule.isActive ? "Active" : "Paused"}
                </Chip>
                <Chip tone="accent">{PAYOUT_MODE_LABELS[rule.payoutMode]}</Chip>
              </div>
              <p className="text-xs leading-relaxed text-ink-muted">
                Unlock slab payout at <b className="text-ink">{rule.monthlyMinPayments} minimum approved payments</b> ·{" "}
                Daily target <b className="text-ink">{rule.dailyTarget}/day</b>
                {rule.dailyForfeitAmount > 0 && ` · Missed day deducts ${formatINR(rule.dailyForfeitAmount)}`}
                {rule.dailyBonusAmount > 0 && ` · Completed day earns +${formatINR(rule.dailyBonusAmount)}`} ·{" "}
                {workingDaySummary(rule.workingDays)}
              </p>
            </div>
          </div>

          {canManage && (
            <Button variant="secondary" onClick={onEditRule} className="h-9 shrink-0 px-3.5 text-xs">
              <SlidersHorizontal size={14} />
              Configure {vehicle.category} Rules
            </Button>
          )}
        </div>
      </Card>

      {/* Vehicle KPIs */}
      <StatRow>
        <MiniStat
          index={1}
          title={`${vehicle.category} Approved`}
          icon={CheckCircle2}
          value={
            focusedEntry && (!canManage || filterStaffId !== "__all__")
              ? focusedEntry.approvedCount
              : vehicle.totalApproved
          }
        />
        {canManage && filterStaffId === "__all__" ? (
          <MiniStat index={2} title="Qualified CSEs" icon={Users} value={vehicle.qualifiedCount} />
        ) : (
          <MiniStat
            index={2}
            title="Needed to Unlock"
            icon={Clock}
            value={focusedEntry?.neededForMin ?? rule.monthlyMinPayments}
          />
        )}
        <MiniStat
          index={3}
          title="Missed Working Days"
          icon={TrendingDown}
          value={
            focusedEntry && (!canManage || filterStaffId !== "__all__")
              ? focusedEntry.missedDays
              : vehicle.totalMissedDays
          }
        />
        <MiniStat
          index={4}
          title={`Net ${vehicle.category} Payable`}
          icon={Wallet}
          value={
            focusedEntry && (!canManage || filterStaffId !== "__all__")
              ? focusedEntry.netIncentive
              : vehicle.totalNetPayable
          }
          kind="inr"
        />
      </StatRow>

      {/* Slab Ladder Visualizer */}
      <Card index={5}>
        <CardHeader
          title={`${vehicle.category} Slab Ladder`}
          action={
            focusedEntry && (
              <Chip tone={focusedEntry.qualified ? "positive" : "warning"}>
                {focusedEntry.qualified
                  ? `${focusedEntry.staffName}: Qualified (${focusedEntry.approvedCount}/${rule.monthlyMinPayments})`
                  : `${focusedEntry.staffName}: ${focusedEntry.approvedCount}/${rule.monthlyMinPayments} to unlock`}
              </Chip>
            )
          }
        />
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {rule.slabs.map((slab, idx) => {
            const reached = (focusedEntry?.approvedCount ?? 0) >= slab.minPayments;
            const active = focusedEntry?.activeSlab?.minPayments === slab.minPayments;
            const unlocked = reached && Boolean(focusedEntry?.qualified);
            return (
              <Tile
                key={slab.minPayments}
                className={cn(
                  "flex flex-col justify-between gap-2 border p-3.5 transition-colors",
                  unlocked
                    ? "border-positive/40 bg-positive-soft/45"
                    : reached
                      ? "border-accent-strong bg-accent-soft/45"
                      : "border-divider bg-surface-strong",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
                    Slab {idx + 1}
                  </span>
                  <Chip tone={unlocked ? "positive" : reached ? "accent" : "neutral"}>
                    {unlocked ? (active ? "Active" : "Passed") : reached ? "Locked (Min)" : `Need ${slab.minPayments - (focusedEntry?.approvedCount ?? 0)}`}
                  </Chip>
                </div>
                <div>
                  <p className="text-base font-bold text-ink tabular-nums">
                    {slabRateText(rule.payoutMode, slab.amount)}
                  </p>
                  <p className="text-xs text-ink-muted tabular-nums">
                    At {slab.minPayments.toLocaleString("en-IN")}+ approved payments
                  </p>
                </div>
              </Tile>
            );
          })}
        </div>
      </Card>

      {/* CSE Leaderboard / Breakdown */}
      <Card index={6}>
        <CardHeader
          title={canManage ? `CSE Performance (${vehicle.category})` : `Your ${vehicle.category} Incentive Standing`}
          action={
            canManage && (
              <span className="text-[11px] text-ink-faint">Click a CSE row to inspect daily attendance &amp; losses</span>
            )
          }
        />
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-divider text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
                <th className="pb-2.5 pr-4">CSE</th>
                <th className="pb-2.5 pr-4 text-right">Approved</th>
                <th className="pb-2.5 pr-4">Min Target ({rule.monthlyMinPayments})</th>
                <th className="pb-2.5 pr-4">Slab</th>
                <th className="pb-2.5 pr-4 text-right">Gross Slab</th>
                <th className="pb-2.5 pr-4 text-right">Days (Met / Missed)</th>
                <th className="pb-2.5 pr-4 text-right">Daily +/-</th>
                <th className="pb-2.5 text-right">Net Payout</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-divider/60">
              {visibleEntries.map((entry) => {
                const pct =
                  rule.monthlyMinPayments === 0
                    ? 100
                    : Math.min(100, Math.round((entry.approvedCount / rule.monthlyMinPayments) * 100));
                const isSelected = focusedEntry?.staffId === entry.staffId;
                return (
                  <tr
                    key={entry.staffId}
                    onClick={() => onSelectStaff(entry.staffId)}
                    className={cn(
                      "h-14 cursor-pointer transition-colors",
                      isSelected ? "bg-accent-soft/55" : "hover:bg-accent-soft/30",
                    )}
                  >
                    <td className="py-2.5 pr-4 font-semibold text-ink">
                      {entry.staffName}
                      {entry.employeeCode && (
                        <span className="ml-1.5 text-[11px] font-normal text-ink-faint">
                          ({entry.employeeCode})
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 pr-4 text-right font-semibold text-ink tabular-nums">
                      {entry.approvedCount}
                    </td>
                    <td className="py-2.5 pr-4 min-w-[160px]">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-muted">
                          <div
                            className={cn(
                              "h-full transition-all duration-300",
                              entry.qualified ? "bg-positive" : "bg-accent-strong",
                            )}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-[11px] tabular-nums text-ink-muted">{pct}%</span>
                      </div>
                    </td>
                    <td className="py-2.5 pr-4">
                      {entry.activeSlab ? (
                        <Chip tone={entry.qualified ? "positive" : "warning"}>
                          {entry.activeSlab.minPayments}+ ({slabRateText(rule.payoutMode, entry.activeSlab.amount)})
                        </Chip>
                      ) : (
                        <span className="text-ink-faint">—</span>
                      )}
                    </td>
                    <td className="py-2.5 pr-4 text-right tabular-nums text-ink">
                      {formatINR(entry.grossSlabIncentive)}
                    </td>
                    <td className="py-2.5 pr-4 text-right tabular-nums">
                      <span className="font-medium text-positive">{entry.completedDays}</span>
                      <span className="text-ink-faint"> / </span>
                      <span className={cn("font-medium", entry.missedDays > 0 ? "text-negative" : "text-ink-muted")}>
                        {entry.missedDays}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4 text-right tabular-nums">
                      {entry.dailyEarned > 0 && (
                        <span className="text-positive">+{formatINR(entry.dailyEarned)}</span>
                      )}
                      {entry.dailyEarned > 0 && entry.dailyPenalty > 0 && " / "}
                      {entry.dailyPenalty > 0 && (
                        <span className="text-negative">-{formatINR(entry.dailyPenalty)}</span>
                      )}
                      {entry.dailyEarned === 0 && entry.dailyPenalty === 0 && (
                        <span className="text-ink-faint">₹0</span>
                      )}
                    </td>
                    <td className="py-2.5 text-right text-sm font-bold text-ink tabular-nums">
                      {formatINR(entry.netIncentive)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Daily Target & Loss Breakdown Grid for Focused CSE */}
      {focusedEntry && (
        <Card index={7}>
          <CardHeader
            title={`Daily Quota & Forfeit Ledger — ${focusedEntry.staffName}`}
            action={
              <span className="text-xs text-ink-muted tabular-nums">
                {focusedEntry.completedDays} met · {focusedEntry.missedDays} missed of {focusedEntry.evaluatedWorkingDays} working days
              </span>
            }
          />
          {focusedEntry.days.length === 0 ? (
            <EmptyState label="No working days have started in this month yet" className="py-8" />
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-6 xl:grid-cols-7">
              {focusedEntry.days.map((d) => {
                const isMet = d.status === "met";
                const isMissed = d.status === "missed";
                const isHoliday = d.status === "holiday";
                return (
                  <div
                    key={d.date}
                    className={cn(
                      "rounded-tile border p-2.5 text-xs transition-colors",
                      isMet
                        ? "border-positive/35 bg-positive-soft/45"
                        : isMissed
                          ? "border-negative/35 bg-negative-soft/50"
                          : "border-divider/60 bg-surface-muted/40 opacity-80",
                    )}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-semibold text-ink tabular-nums">{formatDate(d.date)}</span>
                      <span className="text-[10px] font-medium uppercase text-ink-muted">
                        {WEEKDAYS[d.weekday - 1]?.short}
                      </span>
                    </div>
                    <div className="mt-1.5 flex items-center justify-between gap-1 text-[11px] tabular-nums">
                      {isHoliday ? (
                        <span className="truncate text-ink-muted" title={d.holidayLabel}>
                          Holiday: {d.holidayLabel}
                        </span>
                      ) : d.status === "weekend" ? (
                        <span className="text-ink-faint">Off day ({d.approvedCount})</span>
                      ) : isMet ? (
                        <>
                          <span className="font-semibold text-positive">
                            {d.approvedCount}/{rule.dailyTarget} met
                          </span>
                          {d.bonus > 0 && <span className="font-semibold text-positive">+{formatINR(d.bonus)}</span>}
                        </>
                      ) : (
                        <>
                          <span className="font-semibold text-negative">
                            {d.approvedCount}/{rule.dailyTarget} missed
                          </span>
                          {d.forfeit > 0 && (
                            <span className="font-semibold text-negative">-{formatINR(d.forfeit)}</span>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
