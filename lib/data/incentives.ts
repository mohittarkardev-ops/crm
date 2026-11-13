import { createClient } from "@/lib/supabase/server";
import type { StaffProfile } from "@/lib/auth";
import { one, pagedRows, todayIST } from "@/lib/data/helpers";
import {
  DEFAULT_MONTHLY_TARGETS,
  DEFAULT_SETTINGS,
  calculateMonthlyMilestoneReward,
  calculateStretchGoalEarnings,
  computeProRatedTarget,
  findActiveAssignment,
  formatMonthTitle,
  monthBounds,
  normalizeMonthlyMilestones,
  normalizeVehicleCategory,
  resolveMatchingRule,
  type AgentAssignmentRecord,
  type HolidayItem,
  type IncentiveRule,
  type IncentiveSettings,
  type MonthlyMilestoneTier,
  type StretchRateMode,
  type VehicleCategory,
} from "@/lib/incentives";
import {
  ensureMonthPeriod,
  isIncentiveMigrationMissingError,
  loadRulesWithVersions,
  loadSettings,
  type PeriodRow,
} from "@/lib/incentives-engine";
import { canonicalStateName } from "@/lib/states";

export type LedgerEntryView = {
  id: string;
  claimId: string;
  claimRef: string;
  vehicleRegNo: string;
  agentId: string;
  agentName: string;
  employeeCode: string | null;
  submissionDate: string;
  effectiveSlabDate: string;
  creditedAt: string | null;
  claimStatus: string;
  claimVehicleCategory: VehicleCategory | null;
  assignedVehicleCategory: VehicleCategory | null;
  assignedState: string | null;
  customerPincode: string | null;
  manualCustomerState: string | null;
  resolvedState: string | null;
  locationStatus: string;
  resolutionNote: string | null;
  eligibilityStatus: string;
  dailySequenceNo: number;
  slabLabel: string | null;
  appliedRate: number;
  calculatedAmount: number;
  earningStatus: string;
  exceptionReason: string | null;
  ruleId: string | null;
  ruleName: string | null;
  ruleVersionNumber: number | null;
  isLocked: boolean;
};

export type MonthlyAgentView = {
  staffId: string;
  staffName: string;
  employeeCode: string | null;
  vehicleCategory: VehicleCategory | null;
  assignedState: string | null;
  baseTarget: number;
  targetOverride: number | null;
  effectiveTarget: number;
  targetAdjustmentReason: string | null;
  eligibleClaimsCount: number;
  nonQualifyingClaimsCount: number;
  heldClaimsCount: number;
  remainingTarget: number;
  progressPct: number;
  targetAchieved: boolean;
  dailyProvisionalEarnings: number;
  monthlyMilestoneBonus: number;
  stretchTarget: number | null;
  stretchSpecialRate: number;
  stretchRateMode: StretchRateMode;
  stretchLabel: string | null;
  stretchMilestones: MonthlyMilestoneTier[];
  stretchAchieved: boolean;
  stretchBonusAmount: number;
  stretchClaimsRemaining: number;
  overBaseClaimsCount: number;
  activeMonthlyMilestones: MonthlyMilestoneTier[];
  nextMonthlyMilestone: MonthlyMilestoneTier | null;
  provisionalEarnings: number;
  adjustmentsTotal: number;
  forfeitedAmount: number;
  eligiblePayableAmount: number;
  settlementId: string | null;
  settlementStatus: string | null;
  eligibilityStatus: string | null;
  paymentStatus: string | null;
  finalizedPayable: number;
  paidAmount: number;
  outstandingAmount: number;
};

export type SettlementView = {
  id: string;
  periodId: string;
  agentId: string;
  agentName: string;
  employeeCode: string | null;
  vehicleCategory: VehicleCategory | null;
  assignedState: string | null;
  monthlyTarget: number;
  eligibleClaims: number;
  provisionalAmount: number;
  monthlyMilestoneBonus: number;
  stretchBonusAmount: number;
  adjustmentAmount: number;
  eligibilityStatus: string;
  paymentStatus: string;
  status: string;
  finalizedPayable: number;
  paidAmount: number;
  outstandingAmount: number;
  notes: string | null;
  generatedAt: string | null;
  finalizedAt: string | null;
};

export type PayoutView = {
  id: string;
  settlementId: string;
  agentId: string;
  agentName: string;
  employeeCode: string | null;
  paidAmount: number;
  payoutDate: string;
  paymentMode: string;
  transactionRef: string;
  remarks: string | null;
  proofPath: string | null;
  createdAt: string;
};

export type AdjustmentView = {
  id: string;
  agentId: string;
  agentName: string;
  settlementId: string | null;
  claimId: string | null;
  adjustmentType: string;
  originalValue: string;
  updatedValue: string;
  deltaAmount: number;
  reason: string;
  adminName: string;
  createdAt: string;
};

export type AuditLogView = {
  id: string;
  actorName: string;
  action: string;
  entityType: string;
  entityId: string | null;
  reason: string | null;
  createdAt: string;
};

export type StateStatView = {
  state: string;
  assignedAgents: number;
  eligibleClaims: number;
  provisionalEarnings: number;
  avgPerClaim: number;
  finalizedPayable: number;
  paidAmount: number;
};

export type DailyPerfView = {
  id: string;
  agentId: string;
  agentName: string;
  perfDate: string;
  isWorkingDay: boolean;
  holidayLabel: string | null;
  vehicleCategory: VehicleCategory | null;
  assignedState: string | null;
  totalClaims: number;
  eligibleClaims: number;
  heldClaims: number;
  mismatchClaims: number;
  provisionalAmount: number;
  calculationMethod: string | null;
  slabSummary: string | null;
};

export type RuleVersionHistoryItem = {
  id: string;
  ruleId: string;
  versionNumber: number;
  ruleName: string;
  scope: string;
  vehicleCategory: VehicleCategory | null;
  stateName: string | null;
  calculationMethod: string;
  fixedRate: number;
  combinationMode: string;
  monthlyTarget: number;
  effectiveFrom: string;
  effectiveUntil: string | null;
  createdAt: string;
  slabCount: number;
};

export type PincodeSummaryView = {
  totalRows: number;
  incompleteRows: number;
  uniquePincodes: number;
  lastUpdatedAt: string | null;
  sampleRows: {
    id: string;
    pincode: string;
    stateCode: string;
    stateName: string;
    districtName: string | null;
    officeName: string | null;
    officeType: string | null;
    isActive: boolean;
    sourceUpdatedAt: string;
  }[];
};

export type IncentivesDashboardPayload = {
  monthIso: string;
  todayIso: string;
  canManage: boolean;
  migrationMissing: boolean;
  currentStaffId: string;
  period: PeriodRow;
  settings: IncentiveSettings;
  kpis: {
    totalEnrolledAgents: number;
    eligibleClaims: number;
    provisionalEarnings: number;
    finalizedPayable: number;
    paidIncentives: number;
    outstandingPayouts: number;
    forfeitedEarnings: number;
    pendingReviews: number;
  };
  stateStats: StateStatView[];
  monthlyAgents: MonthlyAgentView[];
  dailyPerformance: DailyPerfView[];
  ledger: LedgerEntryView[];
  exceptions: LedgerEntryView[];
  rules: IncentiveRule[];
  ruleVersions: RuleVersionHistoryItem[];
  assignments: AgentAssignmentRecord[];
  staffOptions: { value: string; label: string; employeeCode: string | null }[];
  holidays: HolidayItem[];
  pincodeSummary: PincodeSummaryView;
  settlements: SettlementView[];
  payouts: PayoutView[];
  adjustments: AdjustmentView[];
  auditLogs: AuditLogView[];
};

function buildFallbackPayload(monthIso: string, staff: StaffProfile, canManage: boolean): IncentivesDashboardPayload {
  const { startDate, endDate, label } = monthBounds(monthIso);
  return {
    monthIso,
    todayIso: todayIST(),
    canManage,
    migrationMissing: true,
    currentStaffId: staff.id,
    period: {
      id: "preview",
      period_key: monthIso,
      label: label || formatMonthTitle(monthIso),
      start_date: startDate,
      end_date: endDate,
      status: "open",
      closed_by: null,
      closed_at: null,
      finalized_by: null,
      finalized_at: null,
    },
    settings: DEFAULT_SETTINGS,
    kpis: {
      totalEnrolledAgents: 0,
      eligibleClaims: 0,
      provisionalEarnings: 0,
      finalizedPayable: 0,
      paidIncentives: 0,
      outstandingPayouts: 0,
      forfeitedEarnings: 0,
      pendingReviews: 0,
    },
    stateStats: [],
    monthlyAgents: [],
    dailyPerformance: [],
    ledger: [],
    exceptions: [],
    rules: [],
    ruleVersions: [],
    assignments: [],
    staffOptions: [],
    holidays: [],
    pincodeSummary: { totalRows: 0, incompleteRows: 0, uniquePincodes: 0, lastUpdatedAt: null, sampleRows: [] },
    settlements: [],
    payouts: [],
    adjustments: [],
    auditLogs: [],
  };
}

/** Loads complete Admin or Agent-scoped Incentive Engine dataset for `monthIso` (`YYYY-MM`). */
export async function getIncentivesDashboard(
  monthIso: string,
  staff: StaffProfile,
  canManage: boolean,
): Promise<IncentivesDashboardPayload> {
  const db = await createClient();
  const todayIso = todayIST();

  let period: PeriodRow;
  try {
    period = await ensureMonthPeriod(db, monthIso, !canManage);
  } catch (err) {
    if (isIncentiveMigrationMissingError(err as { code?: string; message?: string })) {
      return buildFallbackPayload(monthIso, staff, canManage);
    }
    throw err instanceof Error ? err : new Error((err as { message?: string })?.message || "Failed to load period.");
  }

  const isVirtualPeriod = period.id === "open-preview";

  try {
    const [
      settings,
      { rules, versionById },
      holidaysRes,
      assignmentsRes,
      monthlyRes,
      dailyRes,
      ledgerRows,
      settlementsRes,
      payoutsRes,
      adjustmentsRes,
      auditRes,
      staffRes,
      pinCountRes,
      pinIncompleteRes,
      pinSampleRes,
    ] = await Promise.all([
      loadSettings(db),
      loadRulesWithVersions(db),
      db
        .from("incentive_holidays")
        .select("holiday_date, label")
        .gte("holiday_date", period.start_date)
        .lte("holiday_date", period.end_date)
        .order("holiday_date", { ascending: true }),
      (() => {
        let q = db
          .from("incentive_agent_assignments")
          .select("*");
        if (!canManage) q = q.eq("staff_id", staff.id);
        return q.order("effective_from", { ascending: false });
      })(),
      isVirtualPeriod
        ? Promise.resolve({ data: [], error: null })
        : (() => {
            let q = db.from("agent_monthly_incentives").select("*").eq("period_id", period.id);
            if (!canManage) q = q.eq("agent_id", staff.id);
            return q;
          })(),
      isVirtualPeriod
        ? Promise.resolve({ data: [], error: null })
        : (() => {
            let q = db.from("agent_daily_performance").select("*").eq("period_id", period.id);
            if (!canManage) q = q.eq("agent_id", staff.id);
            return q.order("perf_date", { ascending: false });
          })(),
      isVirtualPeriod
        ? Promise.resolve([])
        : pagedRows<Record<string, unknown>>(
            (from, to) => {
              let q = db
                .from("agent_incentive_ledger")
                .select("*")
                .eq("period_id", period.id)
                .neq("earning_status", "void");
              if (!canManage) q = q.eq("agent_id", staff.id);
              return q.order("claim_submission_date", { ascending: false }).order("daily_sequence_no", { ascending: true }).range(from, to);
            },
            "Incentive ledger",
          ),
      isVirtualPeriod
        ? Promise.resolve({ data: [], error: null })
        : (() => {
            let q = db.from("incentive_settlements").select("*").eq("period_id", period.id);
            if (!canManage) q = q.eq("agent_id", staff.id);
            return q.order("updated_at", { ascending: false });
          })(),
      isVirtualPeriod
        ? Promise.resolve({ data: [], error: null })
        : (() => {
            let q = db.from("incentive_payouts").select("*");
            if (!canManage) q = q.eq("agent_id", staff.id);
            else q = q.eq("period_id", period.id);
            return q.order("payout_date", { ascending: false }).order("created_at", { ascending: false });
          })(),
      isVirtualPeriod
        ? Promise.resolve({ data: [], error: null })
        : (() => {
            let q = db.from("incentive_adjustments").select("*").eq("period_id", period.id);
            if (!canManage) q = q.eq("agent_id", staff.id);
            return q.order("created_at", { ascending: false });
          })(),
      canManage
        ? db.from("incentive_audit_logs").select("*").order("created_at", { ascending: false }).limit(80)
        : Promise.resolve({ data: [], error: null }),
      canManage
        ? db.from("staff_users").select("id, full_name, employee_code, is_active").order("full_name")
        : Promise.resolve({ data: [{ id: staff.id, full_name: staff.full_name, employee_code: null, is_active: true }], error: null }),
      canManage
        ? db.from("pincode_directory").select("id", { count: "exact", head: true }).eq("is_active", true)
        : Promise.resolve({ count: 0, error: null }),
      canManage
        ? db
            .from("pincode_directory")
            .select("id", { count: "exact", head: true })
            .is("office_name", null)
            .or("office_type.is.null,office_type.neq.Manual")
        : Promise.resolve({ count: 0, error: null }),
      canManage
        ? db.from("pincode_directory").select("*").order("pincode", { ascending: true }).limit(60)
        : Promise.resolve({ data: [], error: null }),
    ]);

    const errors = [
      holidaysRes.error,
      assignmentsRes.error,
      monthlyRes.error,
      dailyRes.error,
      settlementsRes.error,
      payoutsRes.error,
      adjustmentsRes.error,
      auditRes.error,
      staffRes.error,
      pinCountRes.error,
      pinIncompleteRes.error,
      pinSampleRes.error,
    ].filter(Boolean);
    if (errors.length > 0) {
      const first = errors[0]!;
      if (isIncentiveMigrationMissingError(first)) {
        return buildFallbackPayload(monthIso, staff, canManage);
      }
      throw new Error(`Incentives query (${first.code ?? "DB"}): ${first.message}`);
    }

    const staffMap = new Map<string, { full_name: string; employee_code: string | null; is_active: boolean }>();
    for (const s of staffRes.data ?? []) {
      staffMap.set(String(s.id), {
        full_name: String(s.full_name),
        employee_code: (s.employee_code as string | null) ?? null,
        is_active: typeof s.is_active === "boolean" ? s.is_active : true,
      });
    }

    // Batch lookup claim vehicle registration numbers cleanly for ledger entries
    const claimRegMap = new Map<string, string>();
    const ledgerClaimIds = Array.from(new Set(ledgerRows.map((l) => String(l.claim_id)).filter(Boolean)));
    for (let i = 0; i < ledgerClaimIds.length; i += 200) {
      const slice = ledgerClaimIds.slice(i, i + 200);
      const clRes = await db.from("claims").select("id, vehicle_reg_no").in("id", slice);
      if (!clRes.error) {
        for (const c of clRes.data ?? []) {
          claimRegMap.set(String(c.id), String(c.vehicle_reg_no));
        }
      }
    }

    const holidays: HolidayItem[] = (holidaysRes.data ?? []).map((h) => ({
      date: h.holiday_date as string,
      label: h.label as string,
    }));

    const assignments: AgentAssignmentRecord[] = (assignmentsRes.data ?? []).map((a) => {
      const row = a as Record<string, unknown>;
      const s = staffMap.get(String(a.staff_id));

      let resolvedRuleId = (row.rule_id as string | null) ?? null;
      let resolvedRuleName: string | null = null;
      if (!resolvedRuleId && typeof a.notes === "string") {
        const match = a.notes.match(/\[Rule:([a-f0-9\-]+)(?::([^\]]+))?\]/i);
        if (match) {
          resolvedRuleId = match[1];
          resolvedRuleName = match[2]?.trim() ?? null;
        }
      }
      if (resolvedRuleId) {
        const matchedRuleObj = rules.find((r) => r.id === resolvedRuleId);
        if (matchedRuleObj) {
          resolvedRuleName = matchedRuleObj.ruleName;
        }
      }

      return {
        id: a.id as string,
        staffId: a.staff_id as string,
        staffName: s?.full_name ?? staff.full_name,
        employeeCode: s?.employee_code ?? null,
        ruleId: resolvedRuleId,
        ruleName: resolvedRuleName,
        vehicleCategory: normalizeVehicleCategory(String(a.vehicle_category)) ?? "2W",
        assignedState: canonicalStateName(String(a.assigned_state)),
        effectiveFrom: String(a.effective_from),
        effectiveUntil: (a.effective_until as string | null) ?? null,
        status: a.status === "inactive" ? "inactive" : "active",
        notes: (a.notes as string | null) ?? null,
        stretchTarget:
          row.stretch_target === null || row.stretch_target === undefined ? null : Number(row.stretch_target),
        stretchSpecialRate: Number(row.stretch_special_rate ?? 0),
        stretchRateMode: (row.stretch_rate_mode as StretchRateMode | undefined) ?? "lump_sum_bonus",
        stretchLabel: (row.stretch_label as string | null | undefined) ?? null,
        stretchMilestones: normalizeMonthlyMilestones(row.stretch_milestones),
        createdAt: a.created_at as string,
      };
    });

    const staffOptions = (staffRes.data ?? [])
      .filter((s) => (typeof s.is_active === "boolean" ? s.is_active : true))
      .map((s) => ({
        value: s.id as string,
        label: s.employee_code ? `${s.full_name} (${s.employee_code})` : String(s.full_name),
        employeeCode: (s.employee_code as string | null) ?? null,
      }));

    const settlements: SettlementView[] = (settlementsRes.data ?? []).map((s) => {
      const row = s as Record<string, unknown>;
      const st = staffMap.get(String(s.agent_id));
      return {
        id: s.id as string,
        periodId: s.period_id as string,
        agentId: s.agent_id as string,
        agentName: st?.full_name ?? staff.full_name,
        employeeCode: st?.employee_code ?? null,
        vehicleCategory: s.vehicle_category ? normalizeVehicleCategory(String(s.vehicle_category)) : null,
        assignedState: (s.assigned_state as string | null) ?? null,
        monthlyTarget: Number(s.monthly_target ?? 0),
        eligibleClaims: Number(s.eligible_claims ?? 0),
        provisionalAmount: Number(s.provisional_amount ?? 0),
        monthlyMilestoneBonus: Number(row.monthly_milestone_bonus ?? 0),
        stretchBonusAmount: Number(row.stretch_bonus_amount ?? 0),
        adjustmentAmount: Number(s.adjustment_amount ?? 0),
        eligibilityStatus: String(s.eligibility_status),
        paymentStatus: String(s.payment_status),
        status: String(s.status),
        finalizedPayable: Number(s.finalized_payable ?? 0),
        paidAmount: Number(s.paid_amount ?? 0),
        outstandingAmount: Number(s.outstanding_amount ?? 0),
        notes: (s.notes as string | null) ?? null,
        generatedAt: (s.generated_at as string | null) ?? null,
        finalizedAt: (s.finalized_at as string | null) ?? null,
      };
    });

    const settlementByAgent = new Map<string, SettlementView>();
    for (const st of settlements) settlementByAgent.set(st.agentId, st);

    const ledgerAll: LedgerEntryView[] = ledgerRows.map((l) => {
      const claimId = String(l.claim_id);
      const stJoin = staffMap.get(String(l.agent_id));
      const ver = l.rule_version_id ? versionById.get(String(l.rule_version_id)) : undefined;
      return {
        id: String(l.id),
        claimId,
        claimRef: `CLM-${claimId.slice(0, 8).toUpperCase()}`,
        vehicleRegNo: claimRegMap.get(claimId) ?? "—",
        agentId: String(l.agent_id),
        agentName: stJoin?.full_name ?? staff.full_name,
        employeeCode: stJoin?.employee_code ?? null,
        submissionDate: String(l.claim_submission_date),
        effectiveSlabDate: String(l.effective_slab_date),
        creditedAt: (l.credited_at as string | null) ?? null,
        claimStatus: String(l.claim_status_at_calc),
        claimVehicleCategory: l.claim_vehicle_category ? normalizeVehicleCategory(String(l.claim_vehicle_category)) : null,
        assignedVehicleCategory: l.assigned_vehicle_category ? normalizeVehicleCategory(String(l.assigned_vehicle_category)) : null,
        assignedState: (l.assigned_state as string | null) ?? null,
        customerPincode: (l.customer_pincode as string | null) ?? null,
        manualCustomerState: (l.manual_customer_state as string | null) ?? null,
        resolvedState: (l.resolved_state as string | null) ?? null,
        locationStatus: String(l.location_status),
        resolutionNote: (l.resolution_note as string | null) ?? null,
        eligibilityStatus: String(l.eligibility_status),
        dailySequenceNo: Number(l.daily_sequence_no ?? 0),
        slabLabel: (l.slab_label as string | null) ?? null,
        appliedRate: Number(l.applied_rate ?? 0),
        calculatedAmount: Number(l.calculated_amount ?? 0),
        earningStatus: String(l.earning_status),
        exceptionReason: (l.exception_reason as string | null) ?? null,
        ruleId: (l.rule_id as string | null) ?? null,
        ruleName: ver?.ruleName ?? null,
        ruleVersionNumber: ver?.currentVersion ?? null,
        isLocked: Boolean(l.is_locked),
      };
    });

    // Respect `agentVisibilityMode` for non-admin agents when configured as `after_daily_reconciliation`
    const hideUnreconciledToday = !canManage && settings.agentVisibilityMode === "after_daily_reconciliation";
    const ledger = hideUnreconciledToday
      ? ledgerAll.filter(
          (l) => (l.submissionDate < todayIso && l.effectiveSlabDate < todayIso) || period.status !== "open",
        )
      : ledgerAll;

    const exceptions = canManage ? ledgerAll.filter((l) => l.earningStatus === "held") : [];

    const refDateForRules = todayIso >= period.start_date && todayIso <= period.end_date ? todayIso : period.end_date;

    const monthlyAgents: MonthlyAgentView[] = (monthlyRes.data ?? []).map((m) => {
      const row = m as Record<string, unknown>;
      const agentId = String(m.agent_id);
      const st = staffMap.get(agentId);
      const sett = settlementByAgent.get(agentId);
      const effectiveTarget = Number(m.effective_target ?? 0);

      const assignNow = findActiveAssignment(assignments, agentId, refDateForRules);
      const assignOrMonthlyCat = m.primary_vehicle_category
        ? normalizeVehicleCategory(String(m.primary_vehicle_category))
        : assignNow?.vehicleCategory ?? null;
      const assignOrMonthlyState = (m.primary_state as string | null) ?? assignNow?.assignedState ?? null;

      const directRuleHit = assignNow?.ruleId ? rules.find((r) => r.id === assignNow.ruleId && r.isActive) : null;
      const matchedRule =
        directRuleHit ??
        (assignOrMonthlyCat && assignOrMonthlyState
          ? resolveMatchingRule(rules, {
              vehicleCategory: assignOrMonthlyCat,
              resolvedState: assignOrMonthlyState,
              submissionDate: refDateForRules,
              settings,
            })?.rule ?? null
          : null);
      const activeMonthlyMilestones = matchedRule?.monthlyMilestones ?? [];

      const assignMilestones = assignNow?.stretchMilestones ?? [];
      const rowMilestones = normalizeMonthlyMilestones(row.stretch_milestones);
      const assignStretchTarget = assignNow?.stretchTarget ?? null;
      const monthlyStretchTarget =
        row.stretch_target === null || row.stretch_target === undefined ? null : Number(row.stretch_target);
      const useAssign = period.status === "open" && (assignMilestones.length > 0 || assignStretchTarget !== null);

      const stretchMilestones: MonthlyMilestoneTier[] = useAssign
        ? assignMilestones.length > 0
          ? assignMilestones
          : assignStretchTarget
            ? [{ minClaims: assignStretchTarget, rewardAmount: Number(assignNow?.stretchSpecialRate ?? 0) }]
            : []
        : rowMilestones.length > 0
          ? rowMilestones
          : monthlyStretchTarget
            ? [{ minClaims: monthlyStretchTarget, rewardAmount: Number(row.stretch_special_rate ?? 0) }]
            : [];

      const stretchTarget = stretchMilestones[0]?.minClaims ?? (useAssign ? assignStretchTarget : monthlyStretchTarget);
      const stretchSpecialRate =
        stretchMilestones[0]?.rewardAmount ??
        (useAssign ? Number(assignNow?.stretchSpecialRate ?? 0) : Number(row.stretch_special_rate ?? 0));
      const stretchRateMode: StretchRateMode = useAssign
        ? (assignNow?.stretchRateMode ?? "lump_sum_bonus")
        : ((row.stretch_rate_mode as StretchRateMode | undefined) ?? "lump_sum_bonus");
      const stretchLabel = useAssign
        ? (assignNow?.stretchLabel ?? null)
        : ((row.stretch_label as string | null | undefined) ?? null);

      // When `after_daily_reconciliation` hides today's rows on an open period, compute agent's visible KPI metrics strictly from pre-today ledger rows so top cards stay 100% consistent with daily rows.
      const maskTodayStats = hideUnreconciledToday && period.status === "open";
      const visibleAgentLedger = maskTodayStats ? ledger.filter((l) => l.agentId === agentId) : [];
      const visibleEligibleRows = maskTodayStats
        ? visibleAgentLedger
            .filter((l) => l.eligibilityStatus === "eligible")
            .sort((a, b) => a.submissionDate.localeCompare(b.submissionDate) || a.claimId.localeCompare(b.claimId))
        : [];
      const visibleAmounts = visibleEligibleRows.map((x) => x.calculatedAmount);

      const eligibleClaims = maskTodayStats
        ? visibleEligibleRows.length
        : Number(m.eligible_claims_count ?? 0);
      const nonQualifyingClaimsCount = maskTodayStats
        ? visibleAgentLedger.filter((l) => l.earningStatus === "ineligible").length
        : Number(m.non_qualifying_claims_count ?? 0);
      const heldClaimsCount = maskTodayStats
        ? visibleAgentLedger.filter((l) => l.earningStatus === "held").length
        : Number(m.held_claims_count ?? 0);

      const remainingTarget = Math.max(0, effectiveTarget - eligibleClaims);
      const progressPct =
        effectiveTarget === 0 ? 100 : Math.min(100, Math.round((eligibleClaims / effectiveTarget) * 100));
      const targetAchieved = maskTodayStats
        ? effectiveTarget === 0 || eligibleClaims >= effectiveTarget
        : Boolean(m.target_achieved);

      const mmEval = calculateMonthlyMilestoneReward(activeMonthlyMilestones, eligibleClaims);
      const visibleStretchEval = maskTodayStats
        ? calculateStretchGoalEarnings({
            eligibleClaimsCount: eligibleClaims,
            baseTarget: effectiveTarget,
            stretchTarget,
            stretchSpecialRate,
            stretchMilestones,
            stretchRateMode,
            chronologicalDailyClaimAmounts: visibleAmounts,
          })
        : null;

      const highestStretchHit = stretchMilestones.reduce<MonthlyMilestoneTier | null>(
        (acc, t) => (eligibleClaims >= t.minClaims ? t : acc),
        null,
      );
      const nextStretchTier = stretchMilestones.find((t) => t.minClaims > eligibleClaims) ?? null;
      const stretchAchieved = maskTodayStats
        ? Boolean(visibleStretchEval?.stretchAchieved)
        : Boolean(row.stretch_achieved) || highestStretchHit !== null;
      const stretchClaimsRemaining = nextStretchTier ? Math.max(0, nextStretchTier.minClaims - eligibleClaims) : 0;

      const dailyProv = maskTodayStats
        ? visibleAmounts.reduce((s, a) => s + a, 0)
        : row.daily_provisional_earnings !== undefined && row.daily_provisional_earnings !== null
          ? Number(row.daily_provisional_earnings)
          : Number(m.provisional_earnings ?? 0);
      const monthlyMilestoneBonus = maskTodayStats
        ? mmEval.bonusAmount
        : Number(row.monthly_milestone_bonus ?? mmEval.bonusAmount ?? 0);
      const stretchBonusAmount = maskTodayStats
        ? (visibleStretchEval?.stretchDeltaAmount ?? 0)
        : Number(row.stretch_bonus_amount ?? 0);
      const provisionalTotal = maskTodayStats
        ? Math.max(0, (visibleStretchEval?.totalWithStretch ?? dailyProv) + monthlyMilestoneBonus)
        : Number(m.provisional_earnings ?? 0);
      const adjustmentsTotal = Number(m.adjustments_total ?? 0);
      const grossPlusAdj = Math.max(0, provisionalTotal + adjustmentsTotal);
      const forfeitedAmount = maskTodayStats
        ? (targetAchieved ? 0 : grossPlusAdj)
        : Number(m.forfeited_amount ?? 0);
      const eligiblePayableAmount = maskTodayStats
        ? (targetAchieved ? grossPlusAdj : 0)
        : Number(m.eligible_payable_amount ?? 0);

      return {
        staffId: agentId,
        staffName: st?.full_name ?? staff.full_name,
        employeeCode: st?.employee_code ?? null,
        vehicleCategory: assignOrMonthlyCat,
        assignedState: assignOrMonthlyState,
        baseTarget: Number(m.base_monthly_target ?? 0),
        targetOverride: m.target_override === null ? null : Number(m.target_override),
        effectiveTarget,
        targetAdjustmentReason: (m.target_adjustment_reason as string | null) ?? null,
        eligibleClaimsCount: eligibleClaims,
        nonQualifyingClaimsCount,
        heldClaimsCount,
        remainingTarget,
        progressPct,
        targetAchieved,
        dailyProvisionalEarnings: dailyProv,
        monthlyMilestoneBonus,
        stretchTarget,
        stretchSpecialRate,
        stretchRateMode,
        stretchLabel,
        stretchMilestones,
        stretchAchieved,
        stretchBonusAmount,
        stretchClaimsRemaining,
        overBaseClaimsCount: Math.max(0, eligibleClaims - effectiveTarget),
        activeMonthlyMilestones,
        nextMonthlyMilestone: mmEval.nextTier,
        provisionalEarnings: provisionalTotal,
        adjustmentsTotal,
        forfeitedAmount,
        eligiblePayableAmount,
        settlementId: sett?.id ?? null,
        settlementStatus: sett?.status ?? null,
        eligibilityStatus: sett?.eligibilityStatus ?? null,
        paymentStatus: sett?.paymentStatus ?? null,
        finalizedPayable: sett?.finalizedPayable ?? 0,
        paidAmount: sett?.paidAmount ?? 0,
        outstandingAmount: sett?.outstandingAmount ?? 0,
      };
    });

    // Ensure non-admin agents see their live Base Target + Personalized Stretch Goal even before first claim of the month
    if (!canManage && monthlyAgents.length === 0) {
      const myAssign = findActiveAssignment(assignments, staff.id, refDateForRules) ?? assignments[0] ?? null;
      if (myAssign) {
        const directRuleHit = myAssign.ruleId ? rules.find((r) => r.id === myAssign.ruleId && r.isActive) : null;
        const ruleHit =
          directRuleHit ??
          resolveMatchingRule(rules, {
            vehicleCategory: myAssign.vehicleCategory,
            resolvedState: myAssign.assignedState,
            submissionDate: refDateForRules,
            settings,
          })?.rule ??
          null;
        const baseTarget = ruleHit?.monthlyTarget ?? DEFAULT_MONTHLY_TARGETS[myAssign.vehicleCategory];
        const effectiveTargetDay1 =
          settings.midMonthTargetPolicy === "prorated"
            ? computeProRatedTarget({
                baseTarget,
                periodStart: period.start_date,
                periodEnd: period.end_date,
                activeFrom: myAssign.effectiveFrom,
                activeUntil: myAssign.effectiveUntil,
              })
            : baseTarget;
        const activeMilestones = ruleHit?.monthlyMilestones ?? [];
        const mmEval = calculateMonthlyMilestoneReward(activeMilestones, 0);
        const sMilestones =
          (myAssign.stretchMilestones ?? []).length > 0
            ? myAssign.stretchMilestones!
            : myAssign.stretchTarget
              ? [{ minClaims: myAssign.stretchTarget, rewardAmount: Number(myAssign.stretchSpecialRate ?? 0) }]
              : [];
        const sTarget = sMilestones[0]?.minClaims ?? myAssign.stretchTarget ?? null;

        monthlyAgents.push({
          staffId: staff.id,
          staffName: staff.full_name,
          employeeCode: myAssign.employeeCode,
          vehicleCategory: myAssign.vehicleCategory,
          assignedState: myAssign.assignedState,
          baseTarget,
          targetOverride: null,
          effectiveTarget: effectiveTargetDay1,
          targetAdjustmentReason: null,
          eligibleClaimsCount: 0,
          nonQualifyingClaimsCount: 0,
          heldClaimsCount: 0,
          remainingTarget: effectiveTargetDay1,
          progressPct: effectiveTargetDay1 === 0 ? 100 : 0,
          targetAchieved: effectiveTargetDay1 === 0,
          dailyProvisionalEarnings: 0,
          monthlyMilestoneBonus: 0,
          stretchTarget: sTarget,
          stretchSpecialRate: sMilestones[0]?.rewardAmount ?? Number(myAssign.stretchSpecialRate ?? 0),
          stretchRateMode: myAssign.stretchRateMode ?? "lump_sum_bonus",
          stretchLabel: myAssign.stretchLabel ?? null,
          stretchMilestones: sMilestones,
          stretchAchieved: false,
          stretchBonusAmount: 0,
          stretchClaimsRemaining: sTarget ?? 0,
          overBaseClaimsCount: 0,
          activeMonthlyMilestones: activeMilestones,
          nextMonthlyMilestone: mmEval.nextTier,
          provisionalEarnings: 0,
          adjustmentsTotal: 0,
          forfeitedAmount: 0,
          eligiblePayableAmount: 0,
          settlementId: null,
          settlementStatus: null,
          eligibilityStatus: null,
          paymentStatus: null,
          finalizedPayable: 0,
          paidAmount: 0,
          outstandingAmount: 0,
        });
      }
    }

    monthlyAgents.sort(
      (a, b) => b.provisionalEarnings - a.provisionalEarnings || b.eligibleClaimsCount - a.eligibleClaimsCount,
    );

    const dailyPerformanceAll: DailyPerfView[] = (dailyRes.data ?? []).map((d) => {
      const st = staffMap.get(String(d.agent_id));
      return {
        id: String(d.id),
        agentId: String(d.agent_id),
        agentName: st?.full_name ?? staff.full_name,
        perfDate: String(d.perf_date),
        isWorkingDay: Boolean(d.is_working_day),
        holidayLabel: (d.holiday_label as string | null) ?? null,
        vehicleCategory: d.vehicle_category ? normalizeVehicleCategory(String(d.vehicle_category)) : null,
        assignedState: (d.assigned_state as string | null) ?? null,
        totalClaims: Number(d.total_claims ?? 0),
        eligibleClaims: Number(d.eligible_claims ?? 0),
        heldClaims: Number(d.held_claims ?? 0),
        mismatchClaims: Number(d.mismatch_claims ?? 0),
        provisionalAmount: Number(d.provisional_amount ?? 0),
        calculationMethod: (d.calculation_method as string | null) ?? null,
        slabSummary: (d.slab_summary as string | null) ?? null,
      };
    });
    const dailyPerformance = hideUnreconciledToday
      ? dailyPerformanceAll.filter((d) => d.perfDate < todayIso || period.status !== "open")
      : dailyPerformanceAll;

    const payouts: PayoutView[] = (payoutsRes.data ?? []).map((p) => {
      const st = staffMap.get(String(p.agent_id));
      return {
        id: String(p.id),
        settlementId: String(p.settlement_id),
        agentId: String(p.agent_id),
        agentName: st?.full_name ?? staff.full_name,
        employeeCode: st?.employee_code ?? null,
        paidAmount: Number(p.paid_amount ?? 0),
        payoutDate: String(p.payout_date),
        paymentMode: String(p.payment_mode),
        transactionRef: String(p.transaction_ref),
        remarks: (p.remarks as string | null) ?? null,
        proofPath: (p.proof_path as string | null) ?? null,
        createdAt: String(p.created_at),
      };
    });

    const adjustments: AdjustmentView[] = (adjustmentsRes.data ?? []).map((adj) => {
      const agent = staffMap.get(String(adj.agent_id));
      const admin = adj.admin_id ? staffMap.get(String(adj.admin_id)) : undefined;
      return {
        id: String(adj.id),
        agentId: String(adj.agent_id),
        agentName: agent?.full_name ?? "Agent",
        settlementId: (adj.settlement_id as string | null) ?? null,
        claimId: (adj.claim_id as string | null) ?? null,
        adjustmentType: String(adj.adjustment_type),
        originalValue: String(adj.original_value),
        updatedValue: String(adj.updated_value),
        deltaAmount: Number(adj.delta_amount ?? 0),
        reason: String(adj.reason),
        adminName: admin?.full_name ?? "Admin",
        createdAt: String(adj.created_at),
      };
    });

    const auditLogs: AuditLogView[] = (auditRes.data ?? []).map((a) => ({
      id: String(a.id),
      actorName: (a.actor_name as string | null) ?? "System",
      action: String(a.action),
      entityType: String(a.entity_type),
      entityId: (a.entity_id as string | null) ?? null,
      reason: (a.reason as string | null) ?? null,
      createdAt: String(a.created_at),
    }));

    // Build Rule Version History list
    const ruleVersions: RuleVersionHistoryItem[] = Array.from(versionById.values())
      .map((v) => ({
        id: v.currentVersionId ?? v.id,
        ruleId: v.id,
        versionNumber: v.currentVersion,
        ruleName: v.ruleName,
        scope: v.scope,
        vehicleCategory: v.vehicleCategory,
        stateName: v.stateName,
        calculationMethod: v.calculationMethod,
        fixedRate: v.fixedRate,
        combinationMode: v.combinationMode,
        monthlyTarget: v.monthlyTarget,
        effectiveFrom: v.effectiveFrom,
        effectiveUntil: v.effectiveUntil,
        createdAt: "",
        slabCount: v.slabs.length,
      }))
      .sort((a, b) => a.ruleName.localeCompare(b.ruleName) || b.versionNumber - a.versionNumber);

    // State breakdown stats (Admin)
    const stateMap = new Map<string, StateStatView>();
    for (const a of monthlyAgents) {
      const stName = a.assignedState || "Unassigned";
      const cur = stateMap.get(stName) ?? {
        state: stName,
        assignedAgents: 0,
        eligibleClaims: 0,
        provisionalEarnings: 0,
        avgPerClaim: 0,
        finalizedPayable: 0,
        paidAmount: 0,
      };
      cur.assignedAgents += 1;
      cur.eligibleClaims += a.eligibleClaimsCount;
      cur.provisionalEarnings += a.provisionalEarnings;
      cur.finalizedPayable += a.finalizedPayable;
      cur.paidAmount += a.paidAmount;
      stateMap.set(stName, cur);
    }
    const stateStats = Array.from(stateMap.values())
      .map((s) => ({
        ...s,
        avgPerClaim: s.eligibleClaims > 0 ? Math.round((s.provisionalEarnings / s.eligibleClaims) * 100) / 100 : 0,
      }))
      .sort((a, b) => b.provisionalEarnings - a.provisionalEarnings || b.eligibleClaims - a.eligibleClaims);

    // Admin 8 KPIs (Proposal p. 13)
    const kpis = {
      totalEnrolledAgents: monthlyAgents.length,
      eligibleClaims: monthlyAgents.reduce((sum, a) => sum + a.eligibleClaimsCount, 0),
      provisionalEarnings: monthlyAgents.reduce((sum, a) => sum + a.provisionalEarnings, 0),
      finalizedPayable: settlements.reduce((sum, s) => sum + s.finalizedPayable, 0),
      paidIncentives: settlements.reduce((sum, s) => sum + s.paidAmount, 0),
      outstandingPayouts: settlements.reduce((sum, s) => sum + s.outstandingAmount, 0),
      forfeitedEarnings:
        settlements.length > 0
          ? settlements.reduce((sum, s) => (s.status === "forfeited" ? sum + s.provisionalAmount : sum), 0)
          : monthlyAgents.reduce((sum, a) => sum + a.forfeitedAmount, 0),
      pendingReviews: exceptions.length,
    };

    const sampleRows = (pinSampleRes.data ?? []).map((p) => ({
      id: String(p.id),
      pincode: String(p.pincode),
      stateCode: String(p.state_code),
      stateName: String(p.state_name),
      districtName: (p.district_name as string | null) ?? null,
      officeName: (p.office_name as string | null) ?? null,
      officeType: (p.office_type as string | null) ?? null,
      isActive: Boolean(p.is_active),
      sourceUpdatedAt: String(p.source_updated_at),
    }));
    const uniqueSamplePins = new Set(sampleRows.map((p) => p.pincode)).size;

    return {
      monthIso,
      todayIso,
      canManage,
      migrationMissing: false,
      currentStaffId: staff.id,
      period,
      settings,
      kpis,
      stateStats,
      monthlyAgents,
      dailyPerformance,
      ledger,
      exceptions,
      rules,
      ruleVersions,
      assignments,
      staffOptions,
      holidays,
      pincodeSummary: {
        totalRows: pinCountRes.count ?? 0,
        incompleteRows: pinIncompleteRes.count ?? 0,
        uniquePincodes: uniqueSamplePins,
        lastUpdatedAt: sampleRows[0]?.sourceUpdatedAt ?? null,
        sampleRows,
      },
      settlements,
      payouts,
      adjustments,
      auditLogs,
    };
  } catch (err) {
    if (isIncentiveMigrationMissingError(err as { code?: string; message?: string })) {
      return buildFallbackPayload(monthIso, staff, canManage);
    }
    throw err instanceof Error
      ? err
      : new Error((err as { message?: string })?.message || "Could not load incentives dashboard.");
  }
}
