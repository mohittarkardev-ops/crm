import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { dateIST, one, pagedRows, todayIST } from "@/lib/data/helpers";
import {
  DEFAULT_DAILY_MILESTONES,
  DEFAULT_MONTHLY_TARGETS,
  DEFAULT_SETTINGS,
  DEFAULT_SLABS_2W,
  DEFAULT_SLABS_4W,
  DEFAULT_SLABS_CW,
  calculateDayClaimRewards,
  calculateMonthlyMilestoneReward,
  calculateStretchGoalEarnings,
  computeProRatedTarget,
  deriveSettlementStatus,
  findActiveAssignment,
  isWorkingDate,
  monthBounds,
  normalizeMonthlyMilestones,
  normalizeSlabs,
  normalizeVehicleCategory,
  resolveCustomerLocation,
  resolveMatchingRule,
  shiftToNextWorkingDay,
  type AgentAssignmentRecord,
  type HolidayItem,
  type IncentiveRule,
  type IncentiveSettings,
  type IncentiveSlab,
  type MonthlyMilestoneTier,
  type RuleScope,
  type StretchRateMode,
  type VehicleCategory,
} from "@/lib/incentives";
import { canonicalStateName, normalizePincode } from "@/lib/states";

type Db = NonNullable<ReturnType<typeof createAdminClient>> | Awaited<ReturnType<typeof createClient>>;

type ClaimEngineRow = {
  id: string;
  staff_id: string | null;
  employee_name: string;
  vehicle_reg_no: string;
  policy_id: string | null;
  payment_date: string;
  status: string;
  vehicle_category: string | null;
  customer_pincode: string | null;
  customer_state: string | null;
  created_at: string;
  reviewed_at: string | null;
  policies:
    | { vehicle_category: string | null; pin: string | null; pin_2: string | null; policy_types: { code: string } | { code: string }[] | null }
    | { vehicle_category: string | null; pin: string | null; pin_2: string | null; policy_types: { code: string } | { code: string }[] | null }[]
    | null;
};

/** Writes an immutable line to `incentive_audit_logs` (best-effort, never breaks primary write). */
export async function recordIncentiveAudit(
  db: Db,
  args: {
    actorId: string | null;
    actorName?: string | null;
    action: string;
    entityType: string;
    entityId?: string | null;
    periodId?: string | null;
    agentId?: string | null;
    reason?: string | null;
    beforeData?: Record<string, unknown> | null;
    afterData?: Record<string, unknown> | null;
  },
) {
  try {
    await db.from("incentive_audit_logs").insert({
      actor_id: args.actorId,
      actor_name: args.actorName ?? null,
      action: args.action,
      entity_type: args.entityType,
      entity_id: args.entityId ?? null,
      period_id: args.periodId ?? null,
      agent_id: args.agentId ?? null,
      reason: args.reason ?? null,
      before_data: args.beforeData ?? null,
      after_data: args.afterData ?? null,
    });
  } catch {
    /* audit log must never break primary mutation */
  }
}

export function isIncentiveMigrationMissingError(err: { code?: string; message?: string } | null | undefined): boolean {
  if (!err) return false;
  if (err.code === "42P01" || err.code === "PGRST205" || err.code === "42703") return true;
  const msg = err.message ?? "";
  return (
    msg.includes("incentive_periods") ||
    msg.includes("incentive_settings") ||
    msg.includes("incentive_rules") ||
    msg.includes("agent_incentive_") ||
    msg.includes("agent_daily_") ||
    msg.includes("agent_monthly_") ||
    msg.includes("pincode_directory") ||
    msg.includes("does not exist")
  );
}

/** Ensures `incentive_periods` has a row for calendar month `YYYY-MM` and returns it. */
export async function ensureMonthPeriod(db: Db, periodKey: string, readOnlyFallback = false) {
  const { startDate, endDate, label } = monthBounds(periodKey);
  const existing = await db.from("incentive_periods").select("*").eq("period_key", periodKey).maybeSingle();
  if (existing.error) {
    throw new Error(`Incentive period (${existing.error.code ?? "DB"}): ${existing.error.message}`);
  }
  if (existing.data) return existing.data as PeriodRow;

  const writer = createAdminClient() ?? db;
  const inserted = await writer
    .from("incentive_periods")
    .insert({ period_key: periodKey, label, start_date: startDate, end_date: endDate, status: "open" })
    .select("*")
    .single();
  if (inserted.error) {
    const retry = await db.from("incentive_periods").select("*").eq("period_key", periodKey).maybeSingle();
    if (retry.data) return retry.data as PeriodRow;
    if (readOnlyFallback && inserted.error.code === "42501") {
      return {
        id: "open-preview",
        period_key: periodKey,
        label,
        start_date: startDate,
        end_date: endDate,
        status: "open",
        closed_by: null,
        closed_at: null,
        finalized_by: null,
        finalized_at: null,
      } satisfies PeriodRow;
    }
    throw new Error(`Create incentive period (${inserted.error.code ?? "DB"}): ${inserted.error.message}`);
  }
  return inserted.data as PeriodRow;
}

export type PeriodRow = {
  id: string;
  period_key: string;
  label: string;
  start_date: string;
  end_date: string;
  status: string;
  closed_by: string | null;
  closed_at: string | null;
  finalized_by: string | null;
  finalized_at: string | null;
};

export async function loadSettings(db: Db): Promise<IncentiveSettings> {
  const res = await db.from("incentive_settings").select("*").eq("id", true).maybeSingle();
  if (res.error || !res.data) return DEFAULT_SETTINGS;
  const r = res.data as Record<string, unknown>;
  const wd = Array.isArray(r.working_days)
    ? Array.from(new Set(r.working_days.map(Number).filter((n) => n >= 1 && n <= 7))).sort((a, b) => a - b)
    : DEFAULT_SETTINGS.workingDays;
  const statuses = Array.isArray(r.eligible_claim_statuses)
    ? r.eligible_claim_statuses.map(String).filter(Boolean)
    : DEFAULT_SETTINGS.eligibleClaimStatuses;

  return {
    enableLiveCalculations: typeof r.enable_live_calculations === "boolean" ? r.enable_live_calculations : true,
    allowCategoryDefaultFallback:
      typeof r.allow_category_default_fallback === "boolean" ? r.allow_category_default_fallback : true,
    allowGlobalFallback: typeof r.allow_global_fallback === "boolean" ? r.allow_global_fallback : false,
    eligibleClaimStatuses: statuses.length > 0 ? statuses : ["approved"],
    nonWorkingDayPolicy: (r.non_working_day_policy as IncentiveSettings["nonWorkingDayPolicy"]) ?? "hold_for_review",
    midMonthTargetPolicy: (r.mid_month_target_policy as IncentiveSettings["midMonthTargetPolicy"]) ?? "admin_override",
    postFinalizationPolicy:
      (r.post_finalization_policy as IncentiveSettings["postFinalizationPolicy"]) ?? "next_period_adjustment",
    agentVisibilityMode: (r.agent_visibility_mode as IncentiveSettings["agentVisibilityMode"]) ?? "immediate",
    workingDays: wd.length > 0 ? wd : DEFAULT_SETTINGS.workingDays,
  };
}

export async function loadRulesWithVersions(db: Db): Promise<{
  rules: IncentiveRule[];
  versionById: Map<string, IncentiveRule>;
}> {
  const [rulesRes, versionsRes, slabsRes] = await Promise.all([
    db.from("incentive_rules").select("*").order("scope", { ascending: true }).order("vehicle_category", { ascending: true }),
    db.from("incentive_rule_versions").select("*").order("version_number", { ascending: false }),
    db.from("incentive_slabs").select("*").order("slab_order", { ascending: true }),
  ]);

  if (rulesRes.error) throw new Error(`Incentive rules (${rulesRes.error.code ?? "DB"}): ${rulesRes.error.message}`);
  if (versionsRes.error) throw new Error(`Incentive rule versions (${versionsRes.error.code ?? "DB"}): ${versionsRes.error.message}`);
  if (slabsRes.error) throw new Error(`Incentive slabs (${slabsRes.error.code ?? "DB"}): ${slabsRes.error.message}`);

  const slabsByVersion = new Map<string, IncentiveSlab[]>();
  for (const row of slabsRes.data ?? []) {
    const vid = row.rule_version_id as string;
    const list = slabsByVersion.get(vid) ?? [];
    list.push({
      slabOrder: Number(row.slab_order ?? list.length + 1),
      minClaims: Number(row.min_claims ?? 1),
      maxClaims: row.max_claims === null ? null : Number(row.max_claims),
      ratePerClaim: Number(row.rate_per_claim ?? 0),
      bonusAmount: Number(row.bonus_amount ?? 0),
    });
    slabsByVersion.set(vid, list);
  }

  const versionById = new Map<string, IncentiveRule>();
  const latestVersionByRule = new Map<string, { id: string; slabs: IncentiveSlab[] }>();

  const resolveSlabsForMethod = (
    method: IncentiveRule["calculationMethod"],
    slabs: IncentiveSlab[],
    monthlyMilestones: ReturnType<typeof normalizeMonthlyMilestones>,
    fallbackSlabs: IncentiveSlab[],
  ) => {
    if (slabs.length > 0) return slabs;
    if (method === "milestone") return monthlyMilestones.length > 0 ? [] : DEFAULT_DAILY_MILESTONES;
    if (method === "fixed" || method === "combined" || monthlyMilestones.length > 0) return [];
    return fallbackSlabs;
  };

  for (const v of versionsRes.data ?? []) {
    const ruleId = v.rule_id as string;
    const verId = v.id as string;
    const cat = v.vehicle_category ? normalizeVehicleCategory(String(v.vehicle_category)) : null;
    const slabs = normalizeSlabs(slabsByVersion.get(verId) ?? []);
    const monthlyMilestones = normalizeMonthlyMilestones((v as Record<string, unknown>).monthly_milestones);
    const fallbackSlabs = cat === "4W" ? DEFAULT_SLABS_4W : cat === "CW" ? DEFAULT_SLABS_CW : DEFAULT_SLABS_2W;
    const method = v.calculation_method as IncentiveRule["calculationMethod"];
    const resolvedSlabs = resolveSlabsForMethod(method, slabs, monthlyMilestones, fallbackSlabs);

    const hydrated: IncentiveRule = {
      id: ruleId,
      ruleName: String(v.rule_name),
      scope: v.scope as RuleScope,
      vehicleCategory: cat,
      stateName: (v.state_name as string | null) ?? null,
      isActive: true,
      calculationMethod: method,
      fixedRate: Number(v.fixed_rate ?? 0),
      combinationMode: v.combination_mode as IncentiveRule["combinationMode"],
      monthlyTarget: Number(v.monthly_target ?? 100),
      eligibleClaimStatuses: Array.isArray(v.eligible_claim_statuses)
        ? v.eligible_claim_statuses.map(String)
        : ["approved"],
      effectiveFrom: String(v.effective_from),
      effectiveUntil: (v.effective_until as string | null) ?? null,
      currentVersion: Number(v.version_number ?? 1),
      currentVersionId: verId,
      slabs: resolvedSlabs,
      monthlyMilestones,
    };
    versionById.set(verId, hydrated);

    if (!latestVersionByRule.has(ruleId)) {
      latestVersionByRule.set(ruleId, { id: verId, slabs: hydrated.slabs });
    }
  }

  const rules: IncentiveRule[] = (rulesRes.data ?? []).map((r) => {
    const id = r.id as string;
    const cat = r.vehicle_category ? normalizeVehicleCategory(String(r.vehicle_category)) : null;
    const latest = latestVersionByRule.get(id);
    const fallbackSlabs = cat === "4W" ? DEFAULT_SLABS_4W : cat === "CW" ? DEFAULT_SLABS_CW : DEFAULT_SLABS_2W;
    const method = r.calculation_method as IncentiveRule["calculationMethod"];
    const monthlyMilestones = normalizeMonthlyMilestones((r as Record<string, unknown>).monthly_milestones);
    const resolvedSlabs = resolveSlabsForMethod(method, latest?.slabs ?? [], monthlyMilestones, fallbackSlabs);
    return {
      id,
      ruleName: String(r.rule_name),
      scope: r.scope as RuleScope,
      vehicleCategory: cat,
      stateName: (r.state_name as string | null) ?? null,
      isActive: Boolean(r.is_active),
      calculationMethod: method,
      fixedRate: Number(r.fixed_rate ?? 0),
      combinationMode: r.combination_mode as IncentiveRule["combinationMode"],
      monthlyTarget: Number(r.monthly_target ?? 100),
      eligibleClaimStatuses: Array.isArray(r.eligible_claim_statuses)
        ? r.eligible_claim_statuses.map(String)
        : ["approved"],
      effectiveFrom: String(r.effective_from),
      effectiveUntil: (r.effective_until as string | null) ?? null,
      currentVersion: Number(r.current_version ?? 1),
      currentVersionId: latest?.id,
      slabs: resolvedSlabs,
      monthlyMilestones,
    };
  });

  return { rules, versionById };
}

/**
 * Trusted server-side calculation & ledger synchronization for one incentive period (`YYYY-MM`).
 * Guarantees:
 *  - Evaluates claims strictly against assignments valid on `claim_submission_date`.
 *  - Resolves customer location locally from `pincode_directory` with conflict holding & manual fallback.
 *  - Preserves existing `rule_version_id` and `is_locked` finalized rows so historical edits never silently rewrite payouts.
 *  - Prevents duplicate active credits via unique claim index and deterministic upsert.
 */
export async function reconcilePeriodIncentives(
  db: Db,
  periodKey: string,
  options: { actorId?: string | null; actorName?: string | null; preserveSnapshotVersions?: boolean } = {},
) {
  const period = await ensureMonthPeriod(db, periodKey);
  if (period.status === "finalized" || period.status === "closed") {
    return { period, skippedReason: "Period is already finalized/closed; historical earnings are locked." };
  }

  const preserveVersions = options.preserveSnapshotVersions !== false;
  const settings = await loadSettings(db);
  const [{ rules, versionById }, holidaysRes, assignRes, staffRes, monthlyExistingRes, adjustmentsRes, existingLedgerRes, existingSettlementsRes] =
    await Promise.all([
      loadRulesWithVersions(db),
      db
        .from("incentive_holidays")
        .select("holiday_date, label")
        .gte("holiday_date", period.start_date)
        .lte("holiday_date", period.end_date),
      db
        .from("incentive_agent_assignments")
        .select("*")
        .order("effective_from", { ascending: false }),
      db.from("staff_users").select("id, full_name, employee_code"),
      db.from("agent_monthly_incentives").select("*").eq("period_id", period.id),
      db.from("incentive_adjustments").select("*").eq("period_id", period.id),
      db.from("agent_incentive_ledger").select("*").eq("period_id", period.id).neq("earning_status", "void"),
      db.from("incentive_settlements").select("agent_id, status").eq("period_id", period.id),
    ]);

  if (holidaysRes.error) throw new Error(holidaysRes.error.message);
  if (assignRes.error) throw new Error(assignRes.error.message);
  if (staffRes.error) throw new Error(staffRes.error.message);
  if (monthlyExistingRes.error) throw new Error(monthlyExistingRes.error.message);
  if (adjustmentsRes.error) throw new Error(adjustmentsRes.error.message);
  if (existingLedgerRes.error) throw new Error(existingLedgerRes.error.message);
  if (existingSettlementsRes.error) throw new Error(existingSettlementsRes.error.message);

  const finalizedAgentIds = new Set<string>(
    (existingSettlementsRes.data ?? [])
      .filter((s) => ["finalized", "partially_paid", "paid"].includes(String(s.status)))
      .map((s) => String(s.agent_id)),
  );

  const staffLookup = new Map<string, { full_name: string; employee_code: string | null }>();
  for (const st of staffRes.data ?? []) {
    staffLookup.set(String(st.id), {
      full_name: String(st.full_name),
      employee_code: (st.employee_code as string | null) ?? null,
    });
  }

  const holidays: HolidayItem[] = (holidaysRes.data ?? []).map((h) => ({
    date: h.holiday_date as string,
    label: h.label as string,
  }));

  const assignments: AgentAssignmentRecord[] = (assignRes.data ?? []).map((row) => {
    const r = row as Record<string, unknown>;
    const s = staffLookup.get(String(row.staff_id));

    let rId = (r.rule_id as string | null) ?? null;
    let rName: string | null = null;
    if (!rId && typeof row.notes === "string") {
      const match = row.notes.match(/\[Rule:([a-f0-9\-]+)(?::([^\]]+))?\]/i);
      if (match) {
        rId = match[1];
        rName = match[2]?.trim() ?? null;
      }
    }
    if (rId) {
      const rObj = rules.find((rule) => rule.id === rId);
      if (rObj) rName = rObj.ruleName;
    }

    return {
      id: row.id as string,
      staffId: row.staff_id as string,
      staffName: s?.full_name ?? "Agent",
      employeeCode: s?.employee_code ?? null,
      ruleId: rId,
      ruleName: rName,
      vehicleCategory: normalizeVehicleCategory(String(row.vehicle_category)) ?? "2W",
      assignedState: canonicalStateName(String(row.assigned_state)),
      effectiveFrom: String(row.effective_from),
      effectiveUntil: (row.effective_until as string | null) ?? null,
      status: row.status === "inactive" ? "inactive" : "active",
      notes: (row.notes as string | null) ?? null,
      stretchTarget: r.stretch_target === null || r.stretch_target === undefined ? null : Number(r.stretch_target),
      stretchSpecialRate: Number(r.stretch_special_rate ?? 0),
      stretchRateMode: (r.stretch_rate_mode as StretchRateMode | undefined) ?? "lump_sum_bonus",
      stretchLabel: (r.stretch_label as string | null | undefined) ?? null,
      stretchMilestones: normalizeMonthlyMilestones(r.stretch_milestones),
    };
  });

  // Load claims submitted within this period (`created_at` in IST) plus any claims whose `payment_date` falls in period
  // and created slightly earlier/later, filtered carefully by `submissionDate` (`dateIST(created_at)` in period)!
  const rangeStartTs = `${period.start_date}T00:00:00+05:30`;
  const rangeEndTs = `${period.end_date}T23:59:59+05:30`;
  const claims = await pagedRows<ClaimEngineRow>(
    (from, to) =>
      db
        .from("claims")
        .select(
          "id, staff_id, employee_name, vehicle_reg_no, policy_id, payment_date, status, vehicle_category, customer_pincode, customer_state, created_at, reviewed_at, policies(vehicle_category, pin, pin_2, policy_types(code))",
        )
        .gte("created_at", rangeStartTs)
        .lte("created_at", rangeEndTs)
        .order("created_at", { ascending: true })
        .order("id", { ascending: true })
        .range(from, to),
    "Period claims",
  );

  // Batch lookup all relevant PINs from `pincode_directory` cleanly without per-row roundtrips.
  const pinSet = new Set<string>();
  for (const c of claims) {
    const pol = one(c.policies);
    const pin = normalizePincode(c.customer_pincode ?? pol?.pin ?? pol?.pin_2);
    if (pin) pinSet.add(pin);
  }

  const pinStatesMap = new Map<string, string[]>();
  const pinList = Array.from(pinSet);
  for (let i = 0; i < pinList.length; i += 200) {
    const chunk = pinList.slice(i, i + 200);
    const pinRes = await db
      .from("pincode_directory")
      .select("pincode, state_name")
      .in("pincode", chunk)
      .eq("is_active", true);
    if (pinRes.error) throw new Error(`PIN directory (${pinRes.error.code ?? "DB"}): ${pinRes.error.message}`);
    for (const row of pinRes.data ?? []) {
      const code = String(row.pincode);
      const list = pinStatesMap.get(code) ?? [];
      list.push(String(row.state_name));
      pinStatesMap.set(code, list);
    }
  }

  const existingByClaimId = new Map<string, Record<string, unknown>>();
  for (const l of existingLedgerRes.data ?? []) {
    existingByClaimId.set(l.claim_id as string, l as Record<string, unknown>);
  }

  type PreparedClaim = {
    claim: ClaimEngineRow;
    submissionDate: string;
    effectiveSlabDate: string;
    agentId: string;
    assignment: AgentAssignmentRecord | null;
    claimCategory: VehicleCategory | null;
    pincode: string | null;
    manualState: string | null;
    resolvedState: string | null;
    locationStatus: "resolved_pin" | "manual_fallback" | "admin_verified" | "pin_conflict" | "unverified";
    resolutionNote: string;
    eligibilityStatus:
      | "eligible"
      | "held_review"
      | "ineligible_mismatch"
      | "ineligible_assignment"
      | "ineligible_non_working"
      | "ineligible_status";
    earningStatus: "provisional" | "qualified" | "forfeited" | "held" | "ineligible";
    exceptionReason: string | null;
    rule: IncentiveRule | null;
    ruleVersionId: string | null;
    resolvedBy: string | null;
    resolvedAt: string | null;
    isLocked: boolean;
    lockedSequenceNo: number;
    lockedSlabLabel: string | null;
    lockedRate: number;
    lockedAmount: number;
  };

  const preparedList: PreparedClaim[] = [];
  const enrolledAgentIds = new Set<string>();

  for (const a of assignments) {
    if (
      a.status === "active" &&
      a.effectiveFrom <= period.end_date &&
      (a.effectiveUntil === null || a.effectiveUntil >= period.start_date)
    ) {
      enrolledAgentIds.add(a.staffId);
    }
  }

  for (const claim of claims) {
    if (!claim.staff_id) continue;
    const agentId = claim.staff_id;
    enrolledAgentIds.add(agentId);

    const existing = existingByClaimId.get(claim.id);
    if (existing && Boolean(existing.is_locked)) {
      preparedList.push({
        claim,
        submissionDate: String(existing.claim_submission_date),
        effectiveSlabDate: String(existing.effective_slab_date),
        agentId,
        assignment: null,
        claimCategory: normalizeVehicleCategory(existing.claim_vehicle_category as string | null),
        pincode: (existing.customer_pincode as string | null) ?? null,
        manualState: (existing.manual_customer_state as string | null) ?? null,
        resolvedState: (existing.resolved_state as string | null) ?? null,
        locationStatus: existing.location_status as PreparedClaim["locationStatus"],
        resolutionNote: String(existing.resolution_note ?? ""),
        eligibilityStatus: existing.eligibility_status as PreparedClaim["eligibilityStatus"],
        earningStatus: existing.earning_status as PreparedClaim["earningStatus"],
        exceptionReason: (existing.exception_reason as string | null) ?? null,
        rule: null,
        ruleVersionId: (existing.rule_version_id as string | null) ?? null,
        resolvedBy: (existing.resolved_by as string | null) ?? null,
        resolvedAt: (existing.resolved_at as string | null) ?? null,
        isLocked: true,
        lockedSequenceNo: Number(existing.daily_sequence_no ?? 0),
        lockedSlabLabel: (existing.slab_label as string | null) ?? null,
        lockedRate: Number(existing.applied_rate ?? 0),
        lockedAmount: Number(existing.calculated_amount ?? 0),
      });
      continue;
    }

    const submissionDate = dateIST(claim.created_at) ?? claim.payment_date;
    const pol = one(claim.policies);
    const pType = one(pol?.policy_types);
    const claimCategory = normalizeVehicleCategory(
      claim.vehicle_category ?? pol?.vehicle_category,
      pType?.code,
    );
    const pincode = normalizePincode(claim.customer_pincode ?? pol?.pin ?? pol?.pin_2);
    const manualState = claim.customer_state ? canonicalStateName(claim.customer_state) : null;
    const assignment = findActiveAssignment(assignments, agentId, submissionDate);

    // Preserve explicit Admin exception override if already verified on this ledger row
    const adminVerifiedState =
      existing && existing.location_status === "admin_verified" && existing.resolved_state
        ? String(existing.resolved_state)
        : null;

    let locationStatus: PreparedClaim["locationStatus"];
    let resolvedState: string | null = null;
    let resolutionNote = "";

    if (adminVerifiedState) {
      locationStatus = "admin_verified";
      resolvedState = adminVerifiedState;
      resolutionNote = String(existing?.resolution_note ?? `Admin verified state: ${adminVerifiedState}.`);
    } else {
      const loc = resolveCustomerLocation({
        pincode,
        pinDirectoryStates: pincode ? pinStatesMap.get(pincode) ?? [] : [],
        manualState,
      });
      locationStatus = loc.status;
      resolvedState = loc.state;
      resolutionNote = loc.detail;
    }

    // 1. Check Assignment Validity on submission date
    if (!assignment) {
      preparedList.push({
        claim,
        submissionDate,
        effectiveSlabDate: submissionDate,
        agentId,
        assignment: null,
        claimCategory,
        pincode,
        manualState,
        resolvedState,
        locationStatus,
        resolutionNote: `No active incentive rule assignment on ${submissionDate}. Held as Unassigned / Manual Review. ${resolutionNote}`,
        eligibilityStatus: "held_review",
        earningStatus: "held",
        exceptionReason: "no_active_assignment",
        rule: null,
        ruleVersionId: null,
        resolvedBy: existing ? ((existing.resolved_by as string | null) ?? null) : null,
        resolvedAt: existing ? ((existing.resolved_at as string | null) ?? null) : null,
        isLocked: false,
        lockedSequenceNo: 0,
        lockedSlabLabel: null,
        lockedRate: 0,
        lockedAmount: 0,
      });
      continue;
    }

    // 2. Check Claim Status eligibility against global settings
    const claimStatus = claim.status;
    if (!settings.eligibleClaimStatuses.includes(claimStatus)) {
      preparedList.push({
        claim,
        submissionDate,
        effectiveSlabDate: submissionDate,
        agentId,
        assignment,
        claimCategory,
        pincode,
        manualState,
        resolvedState,
        locationStatus,
        resolutionNote: `Claim status "${claimStatus}" is not an eligible approved/completed status.`,
        eligibilityStatus: "ineligible_status",
        earningStatus: "ineligible",
        exceptionReason: "claim_not_approved",
        rule: null,
        ruleVersionId: null,
        resolvedBy: null,
        resolvedAt: null,
        isLocked: false,
        lockedSequenceNo: 0,
        lockedSlabLabel: null,
        lockedRate: 0,
        lockedAmount: 0,
      });
      continue;
    }

    // 3. Check Location Conflict / Unverified
    if (locationStatus === "pin_conflict" || locationStatus === "unverified" || !resolvedState) {
      preparedList.push({
        claim,
        submissionDate,
        effectiveSlabDate: submissionDate,
        agentId,
        assignment,
        claimCategory,
        pincode,
        manualState,
        resolvedState: null,
        locationStatus,
        resolutionNote,
        eligibilityStatus: "held_review",
        earningStatus: "held",
        exceptionReason: locationStatus === "pin_conflict" ? "pin_conflict" : "unverified_location",
        rule: null,
        ruleVersionId: null,
        resolvedBy: null,
        resolvedAt: null,
        isLocked: false,
        lockedSequenceNo: 0,
        lockedSlabLabel: null,
        lockedRate: 0,
        lockedAmount: 0,
      });
      continue;
    }

    // 4. Match against Assigned Rule scope (Vehicle Category and Territory)
    // Directly assigned rules take precedence over legacy flat assignment fields
    const assignedRule = assignment.ruleId ? rules.find((r) => r.id === assignment.ruleId && r.isActive) : undefined;
    const requiredCategory = assignedRule?.vehicleCategory ?? assignment.vehicleCategory;
    const requiredState = (assignedRule && assignedRule.scope === "exact_state" ? assignedRule.stateName : null) ?? (assignedRule ? null : assignment.assignedState);

    const isCategoryMismatch = Boolean(requiredCategory && claimCategory && requiredCategory !== claimCategory);
    const isStateMismatch = Boolean(requiredState && resolvedState && requiredState.toLowerCase() !== resolvedState.toLowerCase());

    if (isCategoryMismatch || isStateMismatch) {
      const mismatchReason = isCategoryMismatch
        ? `Vehicle category ${claimCategory ?? "unknown"} is outside assigned rule scope (${requiredCategory})`
        : `Customer territory (${resolvedState}) is outside assigned rule scope (${requiredState})`;

      preparedList.push({
        claim,
        submissionDate,
        effectiveSlabDate: submissionDate,
        agentId,
        assignment,
        claimCategory,
        pincode,
        manualState,
        resolvedState,
        locationStatus,
        resolutionNote: `${mismatchReason}. Held as Unassigned / Manual Review.`,
        eligibilityStatus: "held_review",
        earningStatus: "held",
        exceptionReason: isCategoryMismatch ? "vehicle_mismatch" : "state_mismatch",
        rule: null,
        ruleVersionId: null,
        resolvedBy: existing ? ((existing.resolved_by as string | null) ?? null) : null,
        resolvedAt: existing ? ((existing.resolved_at as string | null) ?? null) : null,
        isLocked: false,
        lockedSequenceNo: 0,
        lockedSlabLabel: null,
        lockedRate: 0,
        lockedAmount: 0,
      });
      continue;
    }

    // 5. Working day & holiday check
    const workingCheck = isWorkingDate(submissionDate, holidays, settings.workingDays);
    let effectiveSlabDate = submissionDate;
    if (!workingCheck.working) {
      if (settings.nonWorkingDayPolicy === "hold_for_review") {
        preparedList.push({
          claim,
          submissionDate,
          effectiveSlabDate: submissionDate,
          agentId,
          assignment,
          claimCategory,
          pincode,
          manualState,
          resolvedState,
          locationStatus,
          resolutionNote: workingCheck.holidayLabel
            ? `Submitted on holiday (${workingCheck.holidayLabel}); held for admin review.`
            : "Submitted on a non-working day; held for admin review.",
          eligibilityStatus: "held_review",
          earningStatus: "held",
          exceptionReason: "non_working_day",
          rule: null,
          ruleVersionId: null,
          resolvedBy: null,
          resolvedAt: null,
          isLocked: false,
          lockedSequenceNo: 0,
          lockedSlabLabel: null,
          lockedRate: 0,
          lockedAmount: 0,
        });
        continue;
      }
      if (settings.nonWorkingDayPolicy === "zero_credit") {
        preparedList.push({
          claim,
          submissionDate,
          effectiveSlabDate: submissionDate,
          agentId,
          assignment,
          claimCategory,
          pincode,
          manualState,
          resolvedState,
          locationStatus,
          resolutionNote: "Submitted on non-working day; does not advance daily slab cycle.",
          eligibilityStatus: "ineligible_non_working",
          earningStatus: "ineligible",
          exceptionReason: "non_working_day",
          rule: null,
          ruleVersionId: null,
          resolvedBy: null,
          resolvedAt: null,
          isLocked: false,
          lockedSequenceNo: 0,
          lockedSlabLabel: null,
          lockedRate: 0,
          lockedAmount: 0,
        });
        continue;
      }
      effectiveSlabDate = shiftToNextWorkingDay(submissionDate, holidays, settings.workingDays);
    }

    // 6. Rule Resolution (Preserve historical version snapshot if already assigned & requested)
    let matchedRule: IncentiveRule | null = null;
    let resolvedVersionId: string | null = null;
    let resolvedTier: RuleScope = "exact_state";

    const existingVerId = existing?.rule_version_id as string | null | undefined;
    const preservedVer = preserveVersions && existingVerId ? versionById.get(existingVerId) : undefined;
    const directRule = assignment.ruleId ? rules.find((r) => r.id === assignment.ruleId && r.isActive) : undefined;
    if (directRule) {
      const catMismatch = Boolean(directRule.vehicleCategory && claimCategory && directRule.vehicleCategory !== claimCategory);
      const stateMismatch = Boolean(
        directRule.stateName &&
        resolvedState &&
        directRule.stateName.toLowerCase() !== resolvedState.toLowerCase() &&
        directRule.scope === "exact_state"
      );

      if (catMismatch || stateMismatch) {
        const mismatchReason = catMismatch
          ? `Vehicle category (${claimCategory}) is outside assigned rule "${directRule.ruleName}" (${directRule.vehicleCategory})`
          : `Territory (${resolvedState}) is outside assigned rule "${directRule.ruleName}" (${directRule.stateName})`;

        preparedList.push({
          claim,
          submissionDate,
          effectiveSlabDate,
          agentId,
          assignment,
          claimCategory,
          pincode,
          manualState,
          resolvedState,
          locationStatus,
          resolutionNote: `${mismatchReason}. Held as Unassigned / Manual Review.`,
          eligibilityStatus: "held_review",
          earningStatus: "held",
          exceptionReason: "unassigned_rule_scope",
          rule: null,
          ruleVersionId: null,
          resolvedBy: null,
          resolvedAt: null,
          isLocked: false,
          lockedSequenceNo: 0,
          lockedSlabLabel: null,
          lockedRate: 0,
          lockedAmount: 0,
        });
        continue;
      }

      matchedRule = directRule;
      resolvedVersionId = directRule.currentVersionId ?? null;
      resolvedTier = directRule.scope;
    } else if (preservedVer && preservedVer.vehicleCategory === assignment.vehicleCategory) {
      matchedRule = preservedVer;
      resolvedVersionId = preservedVer.currentVersionId ?? existingVerId ?? null;
      resolvedTier = preservedVer.scope;
    } else {
      const ruleHit = resolveMatchingRule(rules, {
        vehicleCategory: assignment.vehicleCategory,
        resolvedState,
        submissionDate,
        settings,
      });
      if (ruleHit) {
        matchedRule = ruleHit.rule;
        resolvedVersionId = ruleHit.rule.currentVersionId ?? null;
        resolvedTier = ruleHit.resolutionTier;
      }
    }

    if (!matchedRule) {
      preparedList.push({
        claim,
        submissionDate,
        effectiveSlabDate,
        agentId,
        assignment,
        claimCategory,
        pincode,
        manualState,
        resolvedState,
        locationStatus,
        resolutionNote: `No active rule configured for ${assignment.vehicleCategory} in ${resolvedState} on ${submissionDate}.`,
        eligibilityStatus: "held_review",
        earningStatus: "held",
        exceptionReason: "missing_rule",
        rule: null,
        ruleVersionId: null,
        resolvedBy: null,
        resolvedAt: null,
        isLocked: false,
        lockedSequenceNo: 0,
        lockedSlabLabel: null,
        lockedRate: 0,
        lockedAmount: 0,
      });
      continue;
    }

    preparedList.push({
      claim,
      submissionDate,
      effectiveSlabDate,
      agentId,
      assignment,
      claimCategory,
      pincode,
      manualState,
      resolvedState,
      locationStatus,
      resolutionNote: `${resolutionNote} · Matched "${matchedRule.ruleName}" v${matchedRule.currentVersion} (${resolvedTier}).`,
      eligibilityStatus: "eligible",
      earningStatus: "provisional",
      exceptionReason: null,
      rule: matchedRule,
      ruleVersionId: resolvedVersionId,
      resolvedBy: existing ? ((existing.resolved_by as string | null) ?? null) : null,
      resolvedAt: existing ? ((existing.resolved_at as string | null) ?? null) : null,
      isLocked: false,
      lockedSequenceNo: 0,
      lockedSlabLabel: null,
      lockedRate: 0,
      lockedAmount: 0,
    });
  }

  // Group eligible claims by `(agentId, effectiveSlabDate)` to compute exact daily slab sequences & rates!
  const dailyGroups = new Map<string, PreparedClaim[]>();
  for (const item of preparedList) {
    if (item.eligibilityStatus !== "eligible") continue;
    const key = `${item.agentId}|${item.effectiveSlabDate}`;
    const list = dailyGroups.get(key) ?? [];
    list.push(item);
    dailyGroups.set(key, list);
  }

  const calculatedResults = new Map<
    string,
    { seq: number; slabLabel: string; rate: number; amount: number; method: string; daySummary: string }
  >();

  for (const [, group] of dailyGroups) {
    group.sort(
      (a, b) =>
        a.claim.created_at.localeCompare(b.claim.created_at) || a.claim.id.localeCompare(b.claim.id),
    );
    const primaryItem = group[group.length - 1];
    if (group.every((x) => x.isLocked)) {
      for (const item of group) {
        calculatedResults.set(item.claim.id, {
          seq: item.lockedSequenceNo,
          slabLabel: item.lockedSlabLabel ?? "Locked",
          rate: item.lockedRate,
          amount: item.lockedAmount,
          method: "locked",
          daySummary: "Locked historical calculation",
        });
      }
      continue;
    }

    const activeRule = primaryItem.rule ?? group.find((x) => x.rule)?.rule;
    if (!activeRule) continue;

    const reward = calculateDayClaimRewards(activeRule, group.length);
    group.forEach((item, idx) => {
      const r = reward.items[idx];
      calculatedResults.set(item.claim.id, {
        seq: r?.sequenceNo ?? idx + 1,
        slabLabel: r?.slabLabel ?? "—",
        rate: r?.appliedRate ?? 0,
        amount: r?.amount ?? 0,
        method: activeRule.calculationMethod,
        daySummary: reward.summaryLabel,
      });
    });
  }

  // Persist `agent_incentive_ledger` rows idempotently (upsert on `claim_id` / active index)
  const nowIso = new Date().toISOString();
  const ledgerUpserts = preparedList
    .filter((item) => !item.isLocked)
    .map((item) => {
      const calc = calculatedResults.get(item.claim.id);
      return {
        period_id: period.id,
        claim_id: item.claim.id,
        agent_id: item.agentId,
        assignment_id: item.assignment?.id ?? null,
        rule_id: item.rule?.id ?? null,
        rule_version_id: item.ruleVersionId,
        claim_submission_date: item.submissionDate,
        effective_slab_date: item.effectiveSlabDate,
        credited_at:
          item.eligibilityStatus === "eligible" ? (item.claim.reviewed_at ?? nowIso) : null,
        claim_status_at_calc: item.claim.status,
        claim_vehicle_category: item.claimCategory,
        assigned_vehicle_category: item.assignment?.vehicleCategory ?? null,
        assigned_state: item.assignment?.assignedState ?? null,
        customer_pincode: item.pincode,
        manual_customer_state: item.manualState,
        resolved_state: item.resolvedState,
        location_status: item.locationStatus,
        resolution_note: item.resolutionNote,
        eligibility_status: item.eligibilityStatus,
        daily_sequence_no: calc?.seq ?? 0,
        slab_label: calc?.slabLabel ?? null,
        applied_rate: calc?.rate ?? 0,
        calculated_amount: calc?.amount ?? 0,
        earning_status: item.earningStatus,
        exception_reason: item.exceptionReason,
        is_reconciled: true,
        is_locked: false,
        resolved_by: item.resolvedBy,
        resolved_at: item.resolvedAt,
        calculated_at: nowIso,
      };
    });

  // Upsert one-by-one/batched matching the partial unique index `where earning_status <> 'void'` cleanly:
  // First mark existing unlocked rows for updated claims OR update in place.
  for (const row of ledgerUpserts) {
    const prev = existingByClaimId.get(row.claim_id);
    if (prev && prev.id) {
      const upd = await db.from("agent_incentive_ledger").update(row).eq("id", prev.id as string);
      if (upd.error) throw new Error(`Ledger update: ${upd.error.message}`);
    } else {
      const ins = await db.from("agent_incentive_ledger").insert(row);
      if (ins.error) throw new Error(`Ledger insert: ${ins.error.message}`);
    }
  }

  // Materialize `agent_daily_performance` summaries for every `(agentId, date)` with activity
  type DailyAgg = {
    agentId: string;
    perfDate: string;
    vehicleCategory: string | null;
    assignedState: string | null;
    totalClaims: number;
    eligibleClaims: number;
    heldClaims: number;
    mismatchClaims: number;
    provisionalAmount: number;
    method: string | null;
    slabSummary: string | null;
  };
  const dailyAggs = new Map<string, DailyAgg>();
  for (const item of preparedList) {
    const d = item.effectiveSlabDate;
    const key = `${item.agentId}|${d}`;
    const existingAgg = dailyAggs.get(key) ?? {
      agentId: item.agentId,
      perfDate: d,
      vehicleCategory: item.assignment?.vehicleCategory ?? item.claimCategory,
      assignedState: item.assignment?.assignedState ?? item.resolvedState,
      totalClaims: 0,
      eligibleClaims: 0,
      heldClaims: 0,
      mismatchClaims: 0,
      provisionalAmount: 0,
      method: item.rule?.calculationMethod ?? null,
      slabSummary: null,
    };
    existingAgg.totalClaims += 1;
    if (item.eligibilityStatus === "eligible") {
      existingAgg.eligibleClaims += 1;
      const calc = calculatedResults.get(item.claim.id);
      existingAgg.provisionalAmount += calc?.amount ?? item.lockedAmount ?? 0;
      if (calc?.method) existingAgg.method = calc.method;
      if (calc?.daySummary) existingAgg.slabSummary = calc.daySummary;
    } else if (item.eligibilityStatus === "held_review") {
      existingAgg.heldClaims += 1;
      if (
        item.exceptionReason === "vehicle_mismatch" ||
        item.exceptionReason === "state_mismatch" ||
        item.exceptionReason === "unassigned_rule_scope" ||
        item.exceptionReason === "no_active_assignment"
      ) {
        existingAgg.mismatchClaims += 1;
      }
    } else if (item.eligibilityStatus === "ineligible_mismatch") {
      existingAgg.mismatchClaims += 1;
    }
    dailyAggs.set(key, existingAgg);
  }

  const dailyRows = Array.from(dailyAggs.values()).map((agg) => {
    const wc = isWorkingDate(agg.perfDate, holidays, settings.workingDays);
    return {
      period_id: period.id,
      agent_id: agg.agentId,
      perf_date: agg.perfDate,
      is_working_day: wc.working,
      holiday_label: wc.holidayLabel ?? null,
      vehicle_category: agg.vehicleCategory,
      assigned_state: agg.assignedState,
      total_claims: agg.totalClaims,
      eligible_claims: agg.eligibleClaims,
      held_claims: agg.heldClaims,
      mismatch_claims: agg.mismatchClaims,
      provisional_amount: agg.provisionalAmount,
      calculation_method: agg.method,
      slab_summary: agg.slabSummary,
    };
  });

  if (dailyRows.length > 0) {
    const dailyUpsert = await db
      .from("agent_daily_performance")
      .upsert(dailyRows, { onConflict: "period_id,agent_id,perf_date" });
    if (dailyUpsert.error) throw new Error(`Daily summary upsert: ${dailyUpsert.error.message}`);
  }

  // Preserve manual `target_override` + sum `incentive_adjustments` per agent
  const existingMonthlyMap = new Map<
    string,
    {
      targetOverride: number | null;
      reason: string | null;
      stretchTarget: number | null;
      stretchSpecialRate: number;
      stretchRateMode: StretchRateMode;
      stretchLabel: string | null;
      stretchMilestones: MonthlyMilestoneTier[];
    }
  >();
  for (const m of monthlyExistingRes.data ?? []) {
    const row = m as Record<string, unknown>;
    existingMonthlyMap.set(m.agent_id as string, {
      targetOverride: m.target_override === null ? null : Number(m.target_override),
      reason: (m.target_adjustment_reason as string | null) ?? null,
      stretchTarget: row.stretch_target === null || row.stretch_target === undefined ? null : Number(row.stretch_target),
      stretchSpecialRate: Number(row.stretch_special_rate ?? 0),
      stretchRateMode: (row.stretch_rate_mode as StretchRateMode | undefined) ?? "lump_sum_bonus",
      stretchLabel: (row.stretch_label as string | null | undefined) ?? null,
      stretchMilestones: normalizeMonthlyMilestones(row.stretch_milestones),
    });
  }

  const adjTotalByAgent = new Map<string, number>();
  for (const adj of adjustmentsRes.data ?? []) {
    if (adj.adjustment_type === "target_override" || adj.adjustment_type === "stretch_config") continue;
    const aid = adj.agent_id as string;
    adjTotalByAgent.set(aid, (adjTotalByAgent.get(aid) ?? 0) + Number(adj.delta_amount ?? 0));
  }

  const today = todayIST();
  const monthlyRows = Array.from(enrolledAgentIds).map((agentId) => {
    const agentAssignments = assignments.filter(
      (a) =>
        a.staffId === agentId &&
        a.status === "active" &&
        a.effectiveFrom <= period.end_date &&
        (a.effectiveUntil === null || a.effectiveUntil >= period.start_date),
    );
    const refDate = today >= period.start_date && today <= period.end_date ? today : period.end_date;
    const activeAssign =
      findActiveAssignment(agentAssignments, agentId, refDate) ?? agentAssignments[0] ?? null;

    const primaryCat = activeAssign?.vehicleCategory ?? null;
    const primaryState = activeAssign?.assignedState ?? null;

    let baseTarget = primaryCat ? DEFAULT_MONTHLY_TARGETS[primaryCat] : 0;
    let activeMonthlyRule: IncentiveRule | null = null;
    const directRule = activeAssign?.ruleId ? rules.find((r) => r.id === activeAssign.ruleId && r.isActive) : null;
    if (directRule) {
      baseTarget = directRule.monthlyTarget;
      activeMonthlyRule = directRule;
    } else if (primaryCat && primaryState) {
      const ruleHit = resolveMatchingRule(rules, {
        vehicleCategory: primaryCat,
        resolvedState: primaryState,
        submissionDate: refDate,
        settings,
      });
      if (ruleHit) {
        baseTarget = ruleHit.rule.monthlyTarget;
        activeMonthlyRule = ruleHit.rule;
      }
    }

    const override = existingMonthlyMap.get(agentId);
    let effectiveTarget = baseTarget;
    if (settings.midMonthTargetPolicy === "full_target") {
      effectiveTarget = baseTarget;
    } else if (override?.targetOverride !== null && override?.targetOverride !== undefined) {
      effectiveTarget = override.targetOverride;
    } else if (settings.midMonthTargetPolicy === "prorated" && activeAssign) {
      effectiveTarget = computeProRatedTarget({
        baseTarget,
        periodStart: period.start_date,
        periodEnd: period.end_date,
        activeFrom: activeAssign.effectiveFrom,
        activeUntil: activeAssign.effectiveUntil,
      });
    }

    const agentItems = preparedList.filter((x) => x.agentId === agentId);
    let eligibleClaimsCount = 0;
    let nonQualifyingCount = 0;
    let heldCount = 0;
    let dailyProvisionalEarnings = 0;
    const chronologicalEligibleItems: PreparedClaim[] = [];

    for (const item of agentItems) {
      if (item.eligibilityStatus === "eligible") {
        eligibleClaimsCount += 1;
        chronologicalEligibleItems.push(item);
        dailyProvisionalEarnings += item.isLocked
          ? item.lockedAmount
          : (calculatedResults.get(item.claim.id)?.amount ?? 0);
        if (!activeMonthlyRule && item.rule) activeMonthlyRule = item.rule;
      } else if (item.eligibilityStatus === "held_review") {
        heldCount += 1;
      } else {
        nonQualifyingCount += 1;
      }
    }

    // Order eligible claims strictly chronologically so Claims #1..baseTarget stay normal and #baseTarget+1..N
    // convert to the agent's personalized Special Rate cleanly when the Stretch Target is reached.
    chronologicalEligibleItems.sort(
      (a, b) =>
        a.submissionDate.localeCompare(b.submissionDate) ||
        a.claim.created_at.localeCompare(b.claim.created_at) ||
        a.claim.id.localeCompare(b.claim.id),
    );
    const chronologicalAmounts = chronologicalEligibleItems.map((item) =>
      item.isLocked ? item.lockedAmount : (calculatedResults.get(item.claim.id)?.amount ?? 0),
    );

    const monthlyMilestone = calculateMonthlyMilestoneReward(
      activeMonthlyRule?.monthlyMilestones ?? [],
      eligibleClaimsCount,
    );
    const monthlyMilestoneBonus = monthlyMilestone.bonusAmount;

    // Prefer active assignment stretch config if defined; preserve finalized snapshots
    const assignStretchTiers = activeAssign?.stretchMilestones ?? [];
    const assignHasStretch =
      assignStretchTiers.length > 0 ||
      (activeAssign?.stretchTarget !== null && activeAssign?.stretchTarget !== undefined);
    const useAssignStretch = !finalizedAgentIds.has(agentId) && assignHasStretch;

    const stretchMilestones: MonthlyMilestoneTier[] = useAssignStretch
      ? assignStretchTiers.length > 0
        ? assignStretchTiers
        : activeAssign?.stretchTarget
          ? [{ minClaims: activeAssign.stretchTarget, rewardAmount: Number(activeAssign.stretchSpecialRate ?? 0) }]
          : []
      : (override?.stretchMilestones ?? []).length > 0
        ? override!.stretchMilestones
        : override?.stretchTarget
          ? [{ minClaims: override.stretchTarget, rewardAmount: Number(override.stretchSpecialRate ?? 0) }]
          : [];
    const stretchTarget = stretchMilestones[0]?.minClaims ?? (useAssignStretch ? (activeAssign?.stretchTarget ?? null) : (override?.stretchTarget ?? null));
    const stretchSpecialRate =
      stretchMilestones[0]?.rewardAmount ??
      (useAssignStretch ? Number(activeAssign?.stretchSpecialRate ?? 0) : Number(override?.stretchSpecialRate ?? 0));
    const stretchRateMode: StretchRateMode = useAssignStretch
      ? (activeAssign!.stretchRateMode ?? "lump_sum_bonus")
      : (override?.stretchRateMode ?? "lump_sum_bonus");
    const stretchLabel = useAssignStretch ? (activeAssign!.stretchLabel ?? null) : (override?.stretchLabel ?? null);

    const stretchEval = calculateStretchGoalEarnings({
      eligibleClaimsCount,
      baseTarget: effectiveTarget,
      stretchTarget,
      stretchSpecialRate,
      stretchMilestones,
      stretchRateMode,
      chronologicalDailyClaimAmounts: chronologicalAmounts,
    });
    const stretchBonusAmount = stretchEval.stretchDeltaAmount;
    const totalProvisionalEarnings = Math.max(
      0,
      dailyProvisionalEarnings + monthlyMilestoneBonus + stretchBonusAmount,
    );

    const adjSum = adjTotalByAgent.get(agentId) ?? 0;
    const targetAchieved = effectiveTarget === 0 || eligibleClaimsCount >= effectiveTarget;
    const grossWithAdj = Math.max(0, totalProvisionalEarnings + adjSum);
    const eligiblePayable = targetAchieved ? grossWithAdj : 0;
    const forfeitedAmount = targetAchieved ? 0 : Math.max(0, totalProvisionalEarnings);

    return {
      period_id: period.id,
      agent_id: agentId,
      primary_vehicle_category: primaryCat,
      primary_state: primaryState,
      base_monthly_target: baseTarget,
      target_override: override?.targetOverride ?? null,
      effective_target: effectiveTarget,
      target_adjustment_reason: override?.reason ?? null,
      eligible_claims_count: eligibleClaimsCount,
      non_qualifying_claims_count: nonQualifyingCount,
      held_claims_count: heldCount,
      target_achieved: targetAchieved,
      daily_provisional_earnings: dailyProvisionalEarnings,
      monthly_milestone_bonus: monthlyMilestoneBonus,
      stretch_target: stretchTarget,
      stretch_special_rate: stretchSpecialRate,
      stretch_rate_mode: stretchRateMode,
      stretch_label: stretchLabel,
      stretch_achieved: stretchEval.stretchAchieved,
      stretch_bonus_amount: stretchBonusAmount,
      provisional_earnings: totalProvisionalEarnings,
      adjustments_total: adjSum,
      forfeited_amount: forfeitedAmount,
      eligible_payable_amount: eligiblePayable,
    };
  });

  const editableMonthlyRows = monthlyRows
    .filter((r) => !finalizedAgentIds.has(r.agent_id))
    .map((r) => ({ ...r }));

  // Inject `stretch_milestones` on rows cleanly
  const rowsWithStretchMilestones = editableMonthlyRows.map((row) => {
    const aId = row.agent_id;
    const activeAssign =
      assignments.find(
        (a) =>
          a.staffId === aId &&
          a.status === "active" &&
          a.effectiveFrom <= period.end_date &&
          (a.effectiveUntil === null || a.effectiveUntil >= period.start_date),
      ) ?? null;
    const override = existingMonthlyMap.get(aId);
    const assignTiers = activeAssign?.stretchMilestones ?? [];
    const tiers =
      assignTiers.length > 0
        ? assignTiers
        : activeAssign?.stretchTarget
          ? [{ minClaims: activeAssign.stretchTarget, rewardAmount: Number(activeAssign.stretchSpecialRate ?? 0) }]
          : (override?.stretchMilestones ?? []).length > 0
            ? override!.stretchMilestones
            : row.stretch_target
              ? [{ minClaims: Number(row.stretch_target), rewardAmount: Number(row.stretch_special_rate ?? 0) }]
              : [];
    return {
      ...row,
      stretch_milestones: tiers,
    };
  });

  if (rowsWithStretchMilestones.length > 0) {
    let monthlyUpsert = await db
      .from("agent_monthly_incentives")
      .upsert(rowsWithStretchMilestones, { onConflict: "period_id,agent_id" });
    if (monthlyUpsert.error && monthlyUpsert.error.message.includes("stretch_milestones")) {
      monthlyUpsert = await db
        .from("agent_monthly_incentives")
        .upsert(editableMonthlyRows, { onConflict: "period_id,agent_id" });
    }
    if (
      monthlyUpsert.error &&
      (monthlyUpsert.error.message.includes("daily_provisional_earnings") ||
        monthlyUpsert.error.message.includes("stretch_target") ||
        monthlyUpsert.error.message.includes("monthly_milestone_bonus"))
    ) {
      const legacyMonthlyRows = editableMonthlyRows.map(
        ({
          daily_provisional_earnings: _dpe,
          monthly_milestone_bonus: _mmb,
          stretch_target: _st,
          stretch_special_rate: _ssr,
          stretch_rate_mode: _srm,
          stretch_label: _sl,
          stretch_achieved: _sa,
          stretch_bonus_amount: _sba,
          ...rest
        }) => rest,
      );
      monthlyUpsert = await db
        .from("agent_monthly_incentives")
        .upsert(legacyMonthlyRows, { onConflict: "period_id,agent_id" });
    }
    if (monthlyUpsert.error) throw new Error(`Monthly summary upsert: ${monthlyUpsert.error.message}`);
  }

  return { period, evaluatedCount: preparedList.length, agentCount: monthlyRows.length };
}

/**
 * Triggers safe background/non-blocking incentive recalculation for the period matching `submissionDate`.
 * Called when claims are created, updated, approved, or rejected so the CRM stays seamlessly synced.
 */
export async function syncIncentivesForDateSafe(
  submissionDateIso: string | null | undefined,
  actor?: { id: string | null; name?: string | null },
) {
  try {
    const db = createAdminClient();
    if (!db) return;
    const dateStr = submissionDateIso && /^\d{4}-\d{2}-\d{2}$/.test(submissionDateIso) ? submissionDateIso : todayIST();
    const periodKey = dateStr.slice(0, 7);
    const settings = await loadSettings(db);
    if (!settings.enableLiveCalculations) return;
    await reconcilePeriodIncentives(db, periodKey, {
      actorId: actor?.id ?? null,
      actorName: actor?.name ?? null,
      preserveSnapshotVersions: true,
    });
  } catch {
    // Non-blocking safeguard if migration 0015 hasn't run yet or DB table is absent.
  }
}

/** Ensures settlements stay synchronized when payouts or adjustments are recorded. */
export async function syncSettlementBalances(db: Db, settlementId: string) {
  const [settleRes, payoutsRes] = await Promise.all([
    db.from("incentive_settlements").select("*").eq("id", settlementId).maybeSingle(),
    db.from("incentive_payouts").select("paid_amount").eq("settlement_id", settlementId),
  ]);
  if (settleRes.error) throw new Error(`Settlement lookup: ${settleRes.error.message}`);
  if (payoutsRes.error) throw new Error(`Payouts lookup: ${payoutsRes.error.message}`);
  if (!settleRes.data) return;

  const s = settleRes.data;
  const totalPaid = (payoutsRes.data ?? []).reduce((sum, p) => sum + Number(p.paid_amount ?? 0), 0);
  const payable = Number(s.finalized_payable ?? 0);
  const isForfeited = s.eligibility_status === "forfeited";

  const derived = deriveSettlementStatus({
    targetAchieved: !isForfeited,
    finalizedPayable: payable,
    paidAmount: totalPaid,
    workflowState:
      s.status === "finalized" || s.status === "partially_paid" || s.status === "paid"
        ? "finalized"
        : (s.status as "open" | "ready_for_review" | "under_review"),
  });

  const upd = await db
    .from("incentive_settlements")
    .update({
      paid_amount: totalPaid,
      outstanding_amount: derived.outstanding,
      payment_status: derived.paymentStatus,
      eligibility_status: derived.eligibilityStatus,
      status: derived.status,
    })
    .eq("id", settlementId);
  if (upd.error) throw new Error(`Sync settlement balances: ${upd.error.message}`);
}
