"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { authorize, checkFile, dbMessage, done, fail, parseDate, text } from "@/lib/actions/shared";
import type { PincodeImportRowInput } from "@/lib/pincode-dataset";
import { todayIST } from "@/lib/data/helpers";
import { addDays } from "@/lib/dates";
import {
  deriveSettlementStatus,
  normalizeMonthlyMilestones,
  normalizeSlabs,
  type AgentVisibilityMode,
  type CalculationMethod,
  type CombinationMode,
  type MidMonthTargetPolicy,
  type MonthlyMilestoneTier,
  type NonWorkingDayPolicy,
  type PostFinalizationPolicy,
  type RuleScope,
  type StretchRateMode,
  type VehicleCategory,
} from "@/lib/incentives";
import {
  ensureMonthPeriod,
  loadSettings,
  reconcilePeriodIncentives,
  recordIncentiveAudit,
  syncSettlementBalances,
} from "@/lib/incentives-engine";
import { canonicalStateName, normalizeIndianState, normalizePincode } from "@/lib/states";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CATEGORIES: VehicleCategory[] = ["2W", "4W", "CW"];
const SCOPES: RuleScope[] = ["exact_state", "category_default", "global_fallback"];
const METHODS: CalculationMethod[] = ["fixed", "progressive_slab", "final_slab", "combined", "milestone"];
const COMBO_MODES: CombinationMode[] = ["fixed_plus_progressive", "fixed_plus_final_slab", "fixed_plus_slab_bonus"];
const STRETCH_MODES: StretchRateMode[] = [
  "replace_from_base",
  "extra_per_claim_from_base",
  "replace_all_claims",
  "lump_sum_bonus",
];
const PAYOUT_MODES = ["Bank", "UPI", "Cash", "Other"] as const;

/* ------------------------------------------------------------------ */
/* 1. Admin Policy Settings (Proposal Section 18 checklist)            */
/* ------------------------------------------------------------------ */
export type SaveSettingsInput = {
  enableLiveCalculations: boolean;
  allowCategoryDefaultFallback: boolean;
  allowGlobalFallback: boolean;
  eligibleClaimStatuses: string[];
  nonWorkingDayPolicy: NonWorkingDayPolicy;
  midMonthTargetPolicy: MidMonthTargetPolicy;
  postFinalizationPolicy: PostFinalizationPolicy;
  agentVisibilityMode: AgentVisibilityMode;
  workingDays: number[];
};

export async function saveIncentiveSettings(input: SaveSettingsInput) {
  const auth = await authorize("incentives.manage", "Only admins can configure incentive policy settings.");
  if (!auth.staff) return auth.error;
  const staff = auth.staff;

  const workingDays = Array.from(
    new Set((input.workingDays ?? []).map(Number).filter((d) => Number.isInteger(d) && d >= 1 && d <= 7)),
  ).sort((a, b) => a - b);
  if (workingDays.length === 0) return fail("Select at least one working weekday.");

  const eligibleStatuses = Array.from(
    new Set((input.eligibleClaimStatuses ?? []).map((s) => s.trim()).filter((s) => ["approved", "completed"].includes(s))),
  );
  if (eligibleStatuses.length === 0) return fail("Select at least one eligible claim status.");

  const db = await createClient();
  const res = await db
    .from("incentive_settings")
    .upsert(
      {
        id: true,
        enable_live_calculations: Boolean(input.enableLiveCalculations),
        allow_category_default_fallback: Boolean(input.allowCategoryDefaultFallback),
        allow_global_fallback: Boolean(input.allowGlobalFallback),
        eligible_claim_statuses: eligibleStatuses,
        non_working_day_policy: input.nonWorkingDayPolicy,
        mid_month_target_policy: input.midMonthTargetPolicy,
        post_finalization_policy: input.postFinalizationPolicy,
        agent_visibility_mode: input.agentVisibilityMode,
        working_days: workingDays,
        updated_by: staff.id,
      },
      { onConflict: "id" },
    );

  if (res.error) return fail(dbMessage(res.error));

  await recordIncentiveAudit(db, {
    actorId: staff.id,
    actorName: staff.full_name,
    action: "incentive_settings.update",
    entityType: "incentive_settings",
    entityId: "singleton",
    afterData: input as unknown as Record<string, unknown>,
  });

  // Immediately re-sync the active open month when governance rules change
  const curMonth = todayIST().slice(0, 7);
  const period = await ensureMonthPeriod(db, curMonth);
  if (period.status === "open" || period.status === "ready_for_review") {
    await reconcilePeriodIncentives(db, curMonth, {
      actorId: staff.id,
      actorName: staff.full_name,
      preserveSnapshotVersions: true,
    }).catch(() => {});
  }

  revalidatePath("/incentives");
  return done("Saved incentive policy settings.");
}

/* ------------------------------------------------------------------ */
/* 2. Rule Configuration & Versioning                                  */
/* ------------------------------------------------------------------ */
export type SaveRuleInput = {
  id?: string;
  ruleName: string;
  scope: RuleScope;
  vehicleCategory: VehicleCategory | null;
  stateName: string | null;
  isActive: boolean;
  calculationMethod: CalculationMethod;
  fixedRate: number;
  combinationMode: CombinationMode;
  monthlyTarget: number;
  eligibleClaimStatuses: string[];
  effectiveFrom: string;
  effectiveUntil: string | null;
  slabs: { minClaims: number; maxClaims: number | null; ratePerClaim: number; bonusAmount: number }[];
  monthlyMilestones?: MonthlyMilestoneTier[];
};

export async function saveIncentiveRule(input: SaveRuleInput) {
  const auth = await authorize("incentives.manage", "Only admins can configure incentive rules.");
  if (!auth.staff) return auth.error;
  const staff = auth.staff;

  const ruleName = String(input.ruleName ?? "").trim();
  if (ruleName.length < 2 || ruleName.length > 100) return fail("Enter a rule name (2–100 characters).");
  if (!SCOPES.includes(input.scope)) return fail("Select a valid rule scope.");
  if (!METHODS.includes(input.calculationMethod)) return fail("Select a calculation method.");
  if (!COMBO_MODES.includes(input.combinationMode)) return fail("Select a valid combination formula.");

  const cat = input.scope === "global_fallback" ? null : input.vehicleCategory;
  if (input.scope !== "global_fallback" && (!cat || !CATEGORIES.includes(cat))) {
    return fail("Choose 2W, 4W or CW for this rule.");
  }

  const stateName = input.scope === "exact_state" ? canonicalStateName(input.stateName) : null;
  if (input.scope === "exact_state" && !stateName) {
    return fail("Select a state or union territory for an exact-state rule.");
  }

  const effectiveFrom = parseDate(String(input.effectiveFrom ?? "").trim());
  if (!effectiveFrom) return fail("Choose a valid effective start date.");
  const effectiveUntilRaw = input.effectiveUntil ? String(input.effectiveUntil).trim() : "";
  const effectiveUntil = effectiveUntilRaw ? parseDate(effectiveUntilRaw) : null;
  if (effectiveUntilRaw && !effectiveUntil) return fail("Enter a valid effective end date.");
  if (effectiveUntil && effectiveUntil < effectiveFrom) {
    return fail("Effective end date cannot be earlier than start date.");
  }

  const fixedRate = Math.max(0, Number(input.fixedRate) || 0);
  const monthlyTarget = Math.max(0, Math.min(50_000, Math.floor(Number(input.monthlyTarget) || 0)));
  const eligibleStatuses = Array.from(
    new Set((input.eligibleClaimStatuses ?? ["approved"]).filter((s) => ["approved", "completed"].includes(s))),
  );
  if (eligibleStatuses.length === 0) return fail("Select at least one eligible claim status.");

  const slabs = normalizeSlabs(input.slabs);
  const monthlyMilestones = normalizeMonthlyMilestones(input.monthlyMilestones ?? []);
  if (input.calculationMethod !== "fixed" && slabs.length === 0 && monthlyMilestones.length === 0) {
    return fail("Add at least one daily milestone/slab row or configure a monthly milestone ladder.");
  }

  const db = await createClient();

  if (input.id && UUID.test(input.id)) {
    const existingRes = await db.from("incentive_rules").select("*").eq("id", input.id).maybeSingle();
    if (existingRes.error) return fail(dbMessage(existingRes.error));
    if (!existingRes.data) return fail("That rule no longer exists.");

    const nextVersion = Number(existingRes.data.current_version ?? 1) + 1;
    const baseRuleUpdate = {
      rule_name: ruleName,
      scope: input.scope,
      vehicle_category: cat,
      state_name: stateName,
      is_active: Boolean(input.isActive),
      calculation_method: input.calculationMethod,
      fixed_rate: fixedRate,
      combination_mode: input.combinationMode,
      monthly_target: monthlyTarget,
      eligible_claim_statuses: eligibleStatuses,
      effective_from: effectiveFrom,
      effective_until: effectiveUntil,
      current_version: nextVersion,
      updated_by: staff.id,
    };

    let upd = await db
      .from("incentive_rules")
      .update({ ...baseRuleUpdate, monthly_milestones: monthlyMilestones })
      .eq("id", input.id);
    if (upd.error && upd.error.message.includes("monthly_milestones")) {
      if (monthlyMilestones.length > 0) {
        return fail("Run migration 0020_milestone_stretch_and_claim_notif.sql in Supabase to save monthly milestones.");
      }
      upd = await db.from("incentive_rules").update(baseRuleUpdate).eq("id", input.id);
    }
    if (upd.error) {
      if (upd.error.code === "23514" && input.calculationMethod === "milestone") {
        return fail("Run migration 0020_milestone_stretch_and_claim_notif.sql in Supabase to enable Milestone rules.");
      }
      return fail(dbMessage(upd.error));
    }

    const baseVerInsert = {
      rule_id: input.id,
      version_number: nextVersion,
      rule_name: ruleName,
      scope: input.scope,
      vehicle_category: cat,
      state_name: stateName,
      calculation_method: input.calculationMethod,
      fixed_rate: fixedRate,
      combination_mode: input.combinationMode,
      monthly_target: monthlyTarget,
      eligible_claim_statuses: eligibleStatuses,
      effective_from: effectiveFrom,
      effective_until: effectiveUntil,
      created_by: staff.id,
    };
    let ver = await db
      .from("incentive_rule_versions")
      .insert({ ...baseVerInsert, monthly_milestones: monthlyMilestones })
      .select("id")
      .single();
    if (ver.error && ver.error.message.includes("monthly_milestones")) {
      ver = await db.from("incentive_rule_versions").insert(baseVerInsert).select("id").single();
    }
    if (ver.error) return fail(dbMessage(ver.error));

    if (slabs.length > 0) {
      const slabRows = slabs.map((s, idx) => ({
        rule_version_id: ver.data.id,
        slab_order: idx + 1,
        min_claims: s.minClaims,
        max_claims: s.maxClaims,
        rate_per_claim: s.ratePerClaim,
        bonus_amount: s.bonusAmount,
      }));
      const insSlabs = await db.from("incentive_slabs").insert(slabRows);
      if (insSlabs.error) return fail(dbMessage(insSlabs.error));
    }

    await recordIncentiveAudit(db, {
      actorId: staff.id,
      actorName: staff.full_name,
      action: "incentive_rule.new_version",
      entityType: "incentive_rule",
      entityId: input.id,
      afterData: { ruleName, version: nextVersion, calculationMethod: input.calculationMethod, monthlyMilestones },
    });
    revalidatePath("/incentives");
    return done(`Saved "${ruleName}" (v${nextVersion}). Previous calculations stay on their snapshot version.`);
  }

  // Create brand-new rule + version 1
  const baseRuleInsert = {
    rule_name: ruleName,
    scope: input.scope,
    vehicle_category: cat,
    state_name: stateName,
    is_active: Boolean(input.isActive),
    calculation_method: input.calculationMethod,
    fixed_rate: fixedRate,
    combination_mode: input.combinationMode,
    monthly_target: monthlyTarget,
    eligible_claim_statuses: eligibleStatuses,
    effective_from: effectiveFrom,
    effective_until: effectiveUntil,
    current_version: 1,
    created_by: staff.id,
    updated_by: staff.id,
  };
  let insRule = await db
    .from("incentive_rules")
    .insert({ ...baseRuleInsert, monthly_milestones: monthlyMilestones })
    .select("id")
    .single();
  if (insRule.error && insRule.error.message.includes("monthly_milestones")) {
    if (monthlyMilestones.length > 0) {
      return fail("Run migration 0020_milestone_stretch_and_claim_notif.sql in Supabase to save monthly milestones.");
    }
    insRule = await db.from("incentive_rules").insert(baseRuleInsert).select("id").single();
  }
  if (insRule.error) {
    if (insRule.error.code === "23514" && input.calculationMethod === "milestone") {
      return fail("Run migration 0020_milestone_stretch_and_claim_notif.sql in Supabase to enable Milestone rules.");
    }
    return fail(dbMessage(insRule.error));
  }

  const ruleId = insRule.data.id as string;
  const baseVerInsert = {
    rule_id: ruleId,
    version_number: 1,
    rule_name: ruleName,
    scope: input.scope,
    vehicle_category: cat,
    state_name: stateName,
    calculation_method: input.calculationMethod,
    fixed_rate: fixedRate,
    combination_mode: input.combinationMode,
    monthly_target: monthlyTarget,
    eligible_claim_statuses: eligibleStatuses,
    effective_from: effectiveFrom,
    effective_until: effectiveUntil,
    created_by: staff.id,
  };
  let insVer = await db
    .from("incentive_rule_versions")
    .insert({ ...baseVerInsert, monthly_milestones: monthlyMilestones })
    .select("id")
    .single();
  if (insVer.error && insVer.error.message.includes("monthly_milestones")) {
    insVer = await db.from("incentive_rule_versions").insert(baseVerInsert).select("id").single();
  }
  if (insVer.error) return fail(dbMessage(insVer.error));

  if (slabs.length > 0) {
    const slabRows = slabs.map((s, idx) => ({
      rule_version_id: insVer.data.id,
      slab_order: idx + 1,
      min_claims: s.minClaims,
      max_claims: s.maxClaims,
      rate_per_claim: s.ratePerClaim,
      bonus_amount: s.bonusAmount,
    }));
    const insSlabs = await db.from("incentive_slabs").insert(slabRows);
    if (insSlabs.error) return fail(dbMessage(insSlabs.error));
  }

  await recordIncentiveAudit(db, {
    actorId: staff.id,
    actorName: staff.full_name,
    action: "incentive_rule.create",
    entityType: "incentive_rule",
    entityId: ruleId,
    afterData: { ruleName, scope: input.scope, cat, stateName, monthlyTarget, calculationMethod: input.calculationMethod },
  });
  revalidatePath("/incentives");
  return done(`Created rule "${ruleName}" (v1).`);
}

export async function toggleIncentiveRule(ruleId: string, isActive: boolean) {
  const auth = await authorize("incentives.manage");
  if (!auth.staff) return auth.error;
  const staff = auth.staff;
  if (!UUID.test(ruleId)) return fail("Rule not found.");

  const db = await createClient();
  const upd = await db
    .from("incentive_rules")
    .update({ is_active: isActive, updated_by: staff.id })
    .eq("id", ruleId);
  if (upd.error) return fail(dbMessage(upd.error));

  await recordIncentiveAudit(db, {
    actorId: staff.id,
    actorName: staff.full_name,
    action: isActive ? "incentive_rule.activate" : "incentive_rule.pause",
    entityType: "incentive_rule",
    entityId: ruleId,
  });
  revalidatePath("/incentives");
  return done(isActive ? "Rule activated." : "Rule paused.");
}

/* ------------------------------------------------------------------ */
/* 3. Agent Assignments (Direct Rule Assignment & Historical Record) */
/* ------------------------------------------------------------------ */
export type AssignAgentInput = {
  staffId: string;
  ruleId?: string | null;
  vehicleCategory?: VehicleCategory;
  assignedState?: string;
  effectiveFrom: string;
  effectiveUntil: string | null;
  notes?: string;
};

export async function assignAgentIncentive(input: AssignAgentInput) {
  const auth = await authorize("incentives.manage", "Only admins can manage agent incentive assignments.");
  if (!auth.staff) return auth.error;
  const staff = auth.staff;

  if (!UUID.test(input.staffId)) return fail("Choose an agent.");

  const db = await createClient();

  // Resolve assigned rule if provided
  let ruleId = input.ruleId?.trim() || null;
  let ruleName: string | null = null;
  let cat: VehicleCategory = input.vehicleCategory ?? "2W";
  let stateName = input.assignedState ? canonicalStateName(input.assignedState) : "Gujarat";

  if (ruleId) {
    const ruleRes = await db
      .from("incentive_rules")
      .select("id, rule_name, vehicle_category, state_name, scope")
      .eq("id", ruleId)
      .maybeSingle();

    if (ruleRes.data) {
      const r = ruleRes.data;
      ruleName = r.rule_name;
      if (r.vehicle_category) cat = r.vehicle_category as VehicleCategory;
      if (r.state_name) stateName = r.state_name;
    }
  } else {
    if (!CATEGORIES.includes(cat)) return fail("Choose 2W, 4W or CW.");
    if (!stateName) return fail("Choose the assigned state or union territory.");
  }

  const effectiveFrom = parseDate(String(input.effectiveFrom ?? "").trim());
  if (!effectiveFrom) return fail("Choose a valid effective start date.");
  const effectiveUntilRaw = input.effectiveUntil ? String(input.effectiveUntil).trim() : "";
  const effectiveUntil = effectiveUntilRaw ? parseDate(effectiveUntilRaw) : null;
  if (effectiveUntilRaw && !effectiveUntil) return fail("Enter a valid effective end date.");
  if (effectiveUntil && effectiveUntil < effectiveFrom) {
    return fail("End date cannot be earlier than start date.");
  }

  // Enforce 1 active assignment per date while preserving history
  const existingRes = await db
    .from("incentive_agent_assignments")
    .select("*")
    .eq("staff_id", input.staffId)
    .eq("status", "active")
    .order("effective_from", { ascending: true });
  if (existingRes.error) return fail(dbMessage(existingRes.error));

  const newEnd = effectiveUntil ?? "9999-12-31";
  for (const row of existingRes.data ?? []) {
    const rowFrom = String(row.effective_from);
    const rowEnd = row.effective_until ? String(row.effective_until) : "9999-12-31";
    const overlaps = rowFrom <= newEnd && rowEnd >= effectiveFrom;
    if (!overlaps) continue;

    if (rowFrom < effectiveFrom) {
      const prevEnd = addDays(effectiveFrom, -1);
      const closePrev = await db
        .from("incentive_agent_assignments")
        .update({ effective_until: prevEnd })
        .eq("id", row.id as string);
      if (closePrev.error) return fail(dbMessage(closePrev.error));
    } else {
      return fail(
        `Conflicts with existing active assignment starting ${rowFrom}. Choose a start date after ${rowFrom} or close that assignment first.`,
      );
    }
  }

  const ruleTag = ruleId ? `[Rule:${ruleId}${ruleName ? `:${ruleName}` : ""}]` : "";
  const rawNotes = input.notes?.trim() || "";
  const combinedNotes = ruleTag ? (rawNotes ? `${ruleTag} ${rawNotes}` : ruleTag) : (rawNotes || null);

  const baseInsert: Record<string, unknown> = {
    staff_id: input.staffId,
    vehicle_category: cat,
    assigned_state: stateName,
    effective_from: effectiveFrom,
    effective_until: effectiveUntil,
    status: "active",
    notes: combinedNotes,
    created_by: staff.id,
  };

  // Attempt insert with rule_id if available; fallback gracefully if migration 0023 not yet applied
  let ins = ruleId
    ? await db.from("incentive_agent_assignments").insert({ ...baseInsert, rule_id: ruleId }).select("id").single()
    : await db.from("incentive_agent_assignments").insert(baseInsert).select("id").single();

  if (ins.error && ins.error.message.includes("rule_id")) {
    ins = await db.from("incentive_agent_assignments").insert(baseInsert).select("id").single();
  }

  if (ins.error) return fail(dbMessage(ins.error));

  await recordIncentiveAudit(db, {
    actorId: staff.id,
    actorName: staff.full_name,
    action: "incentive_assignment.create",
    entityType: "incentive_agent_assignment",
    entityId: ins.data.id as string,
    agentId: input.staffId,
    reason: input.notes?.trim() || null,
    afterData: {
      ruleId,
      ruleName,
      vehicleCategory: cat,
      assignedState: stateName,
      effectiveFrom,
      effectiveUntil,
    },
  });

  // Sync current month cleanly
  await reconcilePeriodIncentives(db, effectiveFrom.slice(0, 7), {
    actorId: staff.id,
    actorName: staff.full_name,
  }).catch(() => {});

  revalidatePath("/incentives");
  return done(
    ruleName
      ? `Assigned agent to rule "${ruleName}" (${cat} · ${stateName}) from ${effectiveFrom}.`
      : `Assigned agent to ${cat} · ${stateName} from ${effectiveFrom}.`,
  );
}

export async function endAgentAssignment(assignmentId: string, endDateRaw: string) {
  const auth = await authorize("incentives.manage");
  if (!auth.staff) return auth.error;
  const staff = auth.staff;
  if (!UUID.test(assignmentId)) return fail("Assignment not found.");
  const endDate = parseDate(endDateRaw.trim());
  if (!endDate) return fail("Choose a valid end date.");

  const db = await createClient();
  const rowRes = await db
    .from("incentive_agent_assignments")
    .select("*")
    .eq("id", assignmentId)
    .maybeSingle();
  if (rowRes.error) return fail(dbMessage(rowRes.error));
  if (!rowRes.data) return fail("Assignment not found.");
  if (endDate < String(rowRes.data.effective_from)) {
    return fail("End date cannot be earlier than effective start date.");
  }

  const upd = await db
    .from("incentive_agent_assignments")
    .update({ effective_until: endDate })
    .eq("id", assignmentId);
  if (upd.error) return fail(dbMessage(upd.error));

  await recordIncentiveAudit(db, {
    actorId: staff.id,
    actorName: staff.full_name,
    action: "incentive_assignment.end",
    entityType: "incentive_agent_assignment",
    entityId: assignmentId,
    agentId: rowRes.data.staff_id as string,
    afterData: { effectiveUntil: endDate },
  });
  revalidatePath("/incentives");
  return done(`Closed assignment effective ${endDate}. Historical records remain intact.`);
}

export async function setAgentTargetOverride(input: {
  periodKey: string;
  agentId: string;
  targetOverride: number | null;
  reason: string;
}) {
  const auth = await authorize("incentives.manage");
  if (!auth.staff) return auth.error;
  const staff = auth.staff;
  if (!UUID.test(input.agentId)) return fail("Invalid agent.");

  const reason = String(input.reason ?? "").trim();
  if (reason.length < 3) return fail("Provide an audit reason for the mid-month target adjustment.");

  const db = await createClient();
  const [period, settings] = await Promise.all([ensureMonthPeriod(db, input.periodKey), loadSettings(db)]);
  if (period.status === "finalized" || period.status === "closed") {
    return fail("Period is already finalized; target overrides are locked.");
  }

  const newTarget = input.targetOverride === null ? null : Math.max(0, Math.floor(Number(input.targetOverride)));
  if (newTarget !== null && settings.midMonthTargetPolicy === "full_target") {
    return fail(
      "Mid-Month Target Policy is set to 'Require full category monthly target'. Switch policy in Settings to enable manual overrides.",
    );
  }

  const existingRes = await db
    .from("agent_monthly_incentives")
    .select("base_monthly_target, effective_target")
    .eq("period_id", period.id)
    .eq("agent_id", input.agentId)
    .maybeSingle();

  const prevTarget = Number(existingRes.data?.effective_target ?? 0);

  const upsertRes = await db
    .from("agent_monthly_incentives")
    .upsert(
      {
        period_id: period.id,
        agent_id: input.agentId,
        target_override: newTarget,
        effective_target: newTarget ?? Number(existingRes.data?.base_monthly_target ?? 0),
        target_adjustment_reason: newTarget === null ? null : reason,
      },
      { onConflict: "period_id,agent_id" },
    );
  if (upsertRes.error) return fail(dbMessage(upsertRes.error));

  await db.from("incentive_adjustments").insert({
    period_id: period.id,
    agent_id: input.agentId,
    adjustment_type: "target_override",
    original_value: String(prevTarget),
    updated_value: newTarget === null ? "Rule Default" : String(newTarget),
    delta_amount: 0,
    reason,
    admin_id: staff.id,
  });

  await recordIncentiveAudit(db, {
    actorId: staff.id,
    actorName: staff.full_name,
    action: "incentive_target.override",
    entityType: "agent_monthly_incentive",
    entityId: input.agentId,
    periodId: period.id,
    agentId: input.agentId,
    reason,
    beforeData: { effectiveTarget: prevTarget },
    afterData: { targetOverride: newTarget },
  });

  await reconcilePeriodIncentives(db, input.periodKey, {
    actorId: staff.id,
    actorName: staff.full_name,
  });

  revalidatePath("/incentives");
  return done(newTarget === null ? "Cleared custom target override." : `Updated agent target to ${newTarget} claims.`);
}

export type SaveAgentStretchInput = {
  periodKey: string;
  agentId: string;
  assignmentId?: string | null;
  stretchTarget?: number | null;
  stretchSpecialRate?: number;
  stretchMilestones?: MonthlyMilestoneTier[];
  stretchRateMode?: StretchRateMode;
  stretchLabel?: string | null;
  reason?: string;
};

/**
 * Sets a personalized Performance Milestone Chart (step rewards after base target) for a specific agent
 * (visible only in that agent's staff login + Admin workspace) alongside the common minimum target.
 */
export async function saveAgentStretchConfigAction(input: SaveAgentStretchInput) {
  const auth = await authorize("incentives.manage", "Only admins can configure agent stretch goals.");
  if (!auth.staff) return auth.error;
  const staff = auth.staff;
  if (!UUID.test(input.agentId)) return fail("Choose a valid agent.");

  const legacyTarget =
    input.stretchTarget === null || input.stretchTarget === undefined
      ? null
      : Math.max(1, Math.min(50_000, Math.floor(Number(input.stretchTarget) || 0)));
  const legacyRate = Math.max(0, Number(input.stretchSpecialRate ?? 0) || 0);
  let tiers = normalizeMonthlyMilestones(input.stretchMilestones ?? []);
  if (tiers.length === 0 && legacyTarget) {
    tiers = [{ minClaims: legacyTarget, rewardAmount: legacyRate }];
  }

  const stretchTarget = tiers[0]?.minClaims ?? null;
  const specialRate = tiers[0]?.rewardAmount ?? 0;
  const mode: StretchRateMode =
    input.stretchRateMode && STRETCH_MODES.includes(input.stretchRateMode)
      ? input.stretchRateMode
      : "lump_sum_bonus";
  const label = input.stretchLabel?.trim().slice(0, 120) || null;
  const tiersSummary = tiers.map((t) => `${t.minClaims}→₹${t.rewardAmount}`).join(", ");
  const reason = (input.reason ?? "").trim() || (tiers.length > 0 ? `Special milestones: ${tiersSummary}` : "Cleared special milestone chart");

  if (tiers.some((t) => t.rewardAmount <= 0)) {
    return fail("Each milestone step must have a reward amount greater than ₹0.");
  }

  const db = await createClient();
  const period = await ensureMonthPeriod(db, input.periodKey);
  if (period.status === "finalized" || period.status === "closed") {
    return fail("Period is already finalized; personal target edits for this month are locked.");
  }

  // Persist on agent's active assignment so it carries forward smoothly
  let targetAssignmentId = input.assignmentId && UUID.test(input.assignmentId) ? input.assignmentId : null;
  if (!targetAssignmentId) {
    const activeAssignRes = await db
      .from("incentive_agent_assignments")
      .select("id")
      .eq("staff_id", input.agentId)
      .eq("status", "active")
      .order("effective_from", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!activeAssignRes.error && activeAssignRes.data?.id) {
      targetAssignmentId = String(activeAssignRes.data.id);
    }
  }

  if (targetAssignmentId) {
    const assignPayload = {
      stretch_target: stretchTarget,
      stretch_special_rate: tiers.length > 0 ? specialRate : 0,
      stretch_rate_mode: mode,
      stretch_label: tiers.length > 0 ? label : null,
      stretch_milestones: tiers,
    };
    let assignUpd = await db.from("incentive_agent_assignments").update(assignPayload).eq("id", targetAssignmentId);
    if (assignUpd.error && assignUpd.error.message.includes("stretch_milestones")) {
      const { stretch_milestones: _sm, ...legacyAssignPayload } = assignPayload;
      assignUpd = await db.from("incentive_agent_assignments").update(legacyAssignPayload).eq("id", targetAssignmentId);
    }
    if (assignUpd.error) {
      if (assignUpd.error.message.includes("stretch_target")) {
        return fail("Run migration 0020_milestone_stretch_and_claim_notif.sql in Supabase before saving stretch goals.");
      }
      return fail(dbMessage(assignUpd.error));
    }
  }

  // Also ensure monthly snapshot row carries it even before reconciliation or without assignment
  const monthlyPayload = {
    period_id: period.id,
    agent_id: input.agentId,
    stretch_target: stretchTarget,
    stretch_special_rate: tiers.length > 0 ? specialRate : 0,
    stretch_rate_mode: mode,
    stretch_label: tiers.length > 0 ? label : null,
    stretch_milestones: tiers,
  };
  let mUpd = await db
    .from("agent_monthly_incentives")
    .upsert(monthlyPayload, { onConflict: "period_id,agent_id" });
  if (mUpd.error && mUpd.error.message.includes("stretch_milestones")) {
    const { stretch_milestones: _sm, ...legacyMonthlyPayload } = monthlyPayload;
    mUpd = await db.from("agent_monthly_incentives").upsert(legacyMonthlyPayload, { onConflict: "period_id,agent_id" });
  }
  if (mUpd.error) {
    if (mUpd.error.message.includes("stretch_target")) {
      return fail("Run migration 0020_milestone_stretch_and_claim_notif.sql in Supabase before saving stretch goals.");
    }
    return fail(dbMessage(mUpd.error));
  }

  const adjIns = await db.from("incentive_adjustments").insert({
    period_id: period.id,
    agent_id: input.agentId,
    adjustment_type: "stretch_config",
    original_value: "Base Rule",
    updated_value: tiers.length > 0 ? `${tiersSummary} (${mode})` : "Cleared",
    delta_amount: 0,
    reason,
    admin_id: staff.id,
  });
  if (adjIns.error && adjIns.error.code === "23514") {
    await db.from("incentive_adjustments").insert({
      period_id: period.id,
      agent_id: input.agentId,
      adjustment_type: "target_override",
      original_value: "Base Rule",
      updated_value: tiers.length > 0 ? `${tiersSummary} (${mode})` : "Cleared",
      delta_amount: 0,
      reason,
      admin_id: staff.id,
    });
  }

  await recordIncentiveAudit(db, {
    actorId: staff.id,
    actorName: staff.full_name,
    action: tiers.length > 0 ? "incentive_stretch.set" : "incentive_stretch.clear",
    entityType: "agent_monthly_incentive",
    entityId: input.agentId,
    periodId: period.id,
    agentId: input.agentId,
    reason,
    afterData: { tiers, mode, label },
  });

  await reconcilePeriodIncentives(db, input.periodKey, {
    actorId: staff.id,
    actorName: staff.full_name,
  });

  revalidatePath("/incentives");
  return done(
    tiers.length > 0
      ? `Saved personal milestone chart (${tiersSummary}) — visible on the agent's dashboard.`
      : "Cleared agent's personal milestone chart.",
  );
}

/* ------------------------------------------------------------------ */
/* 4. Holidays & PIN Code Directory                                    */
/* ------------------------------------------------------------------ */
export async function addIncentiveHoliday(dateRaw: string, labelRaw: string) {
  const auth = await authorize("incentives.manage", "Only admins can manage holiday exclusions.");
  if (!auth.staff) return auth.error;
  const staff = auth.staff;

  const date = parseDate(dateRaw.trim());
  if (!date) return fail("Choose a valid holiday date.");
  const label = labelRaw.trim();
  if (label.length < 2 || label.length > 80) return fail("Enter a holiday label (2–80 characters).");

  const db = await createClient();
  const res = await db
    .from("incentive_holidays")
    .upsert({ holiday_date: date, label, created_by: staff.id }, { onConflict: "holiday_date" });
  if (res.error) return fail(dbMessage(res.error));

  await recordIncentiveAudit(db, {
    actorId: staff.id,
    actorName: staff.full_name,
    action: "incentive_holiday.save",
    entityType: "incentive_holiday",
    entityId: date,
    afterData: { date, label },
  });
  revalidatePath("/incentives");
  return done(`Added non-working day ${label} (${date}).`);
}

export async function deleteIncentiveHoliday(holidayDate: string) {
  const auth = await authorize("incentives.manage", "Only admins can manage holiday exclusions.");
  if (!auth.staff) return auth.error;
  const staff = auth.staff;

  const date = parseDate(holidayDate.trim());
  if (!date) return fail("Invalid date.");

  const db = await createClient();
  const res = await db.from("incentive_holidays").delete().eq("holiday_date", date);
  if (res.error) return fail(dbMessage(res.error));

  await recordIncentiveAudit(db, {
    actorId: staff.id,
    actorName: staff.full_name,
    action: "incentive_holiday.delete",
    entityType: "incentive_holiday",
    entityId: date,
  });
  revalidatePath("/incentives");
  return done(`Removed holiday ${date}.`);
}

export type { PincodeImportRowInput };

export async function importPincodeChunk(
  rows: PincodeImportRowInput[],
  options?: { isFinal?: boolean },
) {
  const auth = await authorize("incentives.manage", "Only admins can import the PIN code directory.");
  if (!auth.staff) return auth.error;
  const staff = auth.staff;

  if (!Array.isArray(rows) || rows.length === 0) return fail("No PIN rows received.");
  if (rows.length > 2500) return fail("Import chunks must be 2,500 rows or fewer.");

  const today = todayIST();
  const cleaned = [];
  const seen = new Set<string>();
  let skipped = 0;

  for (const r of rows) {
    const pin = normalizePincode(r.pincode);
    const st = normalizeIndianState(r.stateName);
    const stateName = st?.name ?? canonicalStateName(r.stateName);
    const stateCode = st?.code ?? (r.stateCode?.trim().toUpperCase().slice(0, 6) || stateName.slice(0, 2).toUpperCase());

    if (!pin || !stateName) {
      skipped += 1;
      continue;
    }

    const district = (r.districtName ?? "").trim().slice(0, 120);
    const office = (r.officeName ?? "").trim().slice(0, 120);
    const dedupKey = `${pin}|${stateName}|${office}|${district}`;
    if (seen.has(dedupKey)) continue;
    seen.add(dedupKey);

    cleaned.push({
      pincode: pin,
      state_code: stateCode,
      state_name: stateName,
      district_name: district || null,
      office_name: office || null,
      office_type: (r.officeType ?? "").trim().slice(0, 40) || null,
      is_active: true,
      source_updated_at: today,
    });
  }

  if (cleaned.length === 0) {
    return fail(`0 valid PIN mappings in this batch (${skipped} skipped due to invalid PIN or state).`);
  }

  const db = createAdminClient() ?? (await createClient());
  const uniquePins = Array.from(new Set(cleaned.map((c) => c.pincode)));
  const existingKeys = new Set<string>();
  const existingPinStates = new Set<string>();

  for (let i = 0; i < uniquePins.length; i += 200) {
    const slice = uniquePins.slice(i, i + 200);
    const ex = await db
      .from("pincode_directory")
      .select("pincode, state_name, district_name, office_name")
      .in("pincode", slice);
    if (ex.error) return fail(dbMessage(ex.error));
    for (const row of ex.data ?? []) {
      existingPinStates.add(`${row.pincode}|${row.state_name}`);
      existingKeys.add(
        `${row.pincode}|${row.state_name}|${row.office_name ?? ""}|${row.district_name ?? ""}`,
      );
    }
  }

  const toInsert = cleaned.filter(
    (c) =>
      !existingPinStates.has(`${c.pincode}|${c.state_name}`) &&
      !existingKeys.has(
        `${c.pincode}|${c.state_name}|${c.office_name ?? ""}|${c.district_name ?? ""}`,
      ),
  );

  let importedCount = 0;
  if (toInsert.length > 0) {
    const ins = await db.from("pincode_directory").insert(toInsert);
    if (ins.error) return fail(dbMessage(ins.error));
    importedCount = toInsert.length;
  }

  if (options?.isFinal !== false) {
    await recordIncentiveAudit(db, {
      actorId: staff.id,
      actorName: staff.full_name,
      action: "pincode_directory.import_chunk",
      entityType: "pincode_directory",
      afterData: { inserted: importedCount, skipped },
    });
    revalidatePath("/incentives");
  }

  return { ok: true as const, message: `Imported ${importedCount} PIN rows (${skipped} skipped).`, inserted: importedCount, skipped };
}

export async function savePincodeEntry(input: PincodeImportRowInput) {
  const auth = await authorize("incentives.manage");
  if (!auth.staff) return auth.error;
  const staff = auth.staff;

  const pin = normalizePincode(input.pincode);
  if (!pin) return fail("Enter a valid 6-digit Indian PIN code.");
  const st = normalizeIndianState(input.stateName);
  const stateName = st?.name ?? canonicalStateName(input.stateName);
  if (!stateName) return fail("Select a valid state or union territory.");

  const db = await createClient();
  const ins = await db.from("pincode_directory").insert({
    pincode: pin,
    state_code: st?.code ?? stateName.slice(0, 2).toUpperCase(),
    state_name: stateName,
    district_name: input.districtName?.trim() || null,
    office_name: input.officeName?.trim() || null,
    office_type: input.officeType?.trim() || "Manual",
    is_active: true,
    source_updated_at: todayIST(),
  });
  if (ins.error) return fail(dbMessage(ins.error));

  await recordIncentiveAudit(db, {
    actorId: staff.id,
    actorName: staff.full_name,
    action: "pincode_directory.add",
    entityType: "pincode_directory",
    entityId: pin,
    afterData: { pin, stateName },
  });
  revalidatePath("/incentives");
  return done(`Added PIN ${pin} → ${stateName}. Historical ledger records remain unchanged.`);
}

export async function lookupPincodeAction(pincodeQuery: string) {
  const auth = await authorize("incentives.view");
  if (!auth.staff) return { ok: false as const, error: auth.error.error, rows: [] };
  const clean = pincodeQuery.replace(/\D/g, "").slice(0, 6);
  if (clean.length < 3) return { ok: true as const, rows: [] };

  const db = await createClient();
  const res = await db
    .from("pincode_directory")
    .select("*")
    .ilike("pincode", `${clean}%`)
    .order("pincode")
    .limit(50);
  if (res.error) return { ok: false as const, error: dbMessage(res.error), rows: [] };
  return { ok: true as const, rows: res.data ?? [] };
}

/* ------------------------------------------------------------------ */
/* 5. Engine Sync, Exceptions & Adjustments                            */
/* ------------------------------------------------------------------ */
export async function reconcilePeriodAction(periodKey: string, preserveSnapshotVersions = true) {
  const auth = await authorize("incentives.manage", "Only admins can run incentive reconciliation.");
  if (!auth.staff) return auth.error;
  const staff = auth.staff;

  const db = await createClient();
  const result = await reconcilePeriodIncentives(db, periodKey, {
    actorId: staff.id,
    actorName: staff.full_name,
    preserveSnapshotVersions,
  });

  await recordIncentiveAudit(db, {
    actorId: staff.id,
    actorName: staff.full_name,
    action: "incentive_engine.reconcile",
    entityType: "incentive_period",
    entityId: periodKey,
    periodId: result.period.id,
    afterData: result as unknown as Record<string, unknown>,
  });

  revalidatePath("/incentives");
  if ("skippedReason" in result && result.skippedReason) {
    return fail(result.skippedReason);
  }
  return done(
    `Reconciled ${periodKey}: evaluated ${result.evaluatedCount ?? 0} claims across ${result.agentCount ?? 0} agents.`,
  );
}

export async function resolveExceptionAction(input: {
  ledgerId: string;
  resolvedState: string;
  reason: string;
}) {
  const auth = await authorize("incentives.manage", "Only admins can resolve incentive exceptions.");
  if (!auth.staff) return auth.error;
  const staff = auth.staff;
  if (!UUID.test(input.ledgerId)) return fail("Ledger item not found.");

  const resolvedState = canonicalStateName(input.resolvedState);
  if (!resolvedState) return fail("Choose the verified state.");
  const reason = String(input.reason ?? "").trim();
  if (reason.length < 3) return fail("Enter a verification reason for the audit trail.");

  const db = await createClient();
  const ledgerRes = await db
    .from("agent_incentive_ledger")
    .select("*, incentive_periods(period_key, status)")
    .eq("id", input.ledgerId)
    .maybeSingle();
  if (ledgerRes.error) return fail(dbMessage(ledgerRes.error));
  if (!ledgerRes.data) return fail("Ledger entry not found.");
  if (ledgerRes.data.is_locked) return fail("This ledger entry belongs to a finalized settlement and is locked.");

  const prevState = ledgerRes.data.resolved_state ?? ledgerRes.data.location_status;

  const upd = await db
    .from("agent_incentive_ledger")
    .update({
      location_status: "admin_verified",
      resolved_state: resolvedState,
      resolution_note: `Admin verified (${resolvedState}): ${reason}`,
      resolved_by: staff.id,
      resolved_at: new Date().toISOString(),
    })
    .eq("id", input.ledgerId);
  if (upd.error) return fail(dbMessage(upd.error));

  await db.from("incentive_adjustments").insert({
    period_id: ledgerRes.data.period_id as string,
    agent_id: ledgerRes.data.agent_id as string,
    claim_id: ledgerRes.data.claim_id as string,
    adjustment_type: "exception_resolution",
    original_value: String(prevState ?? "Unverified"),
    updated_value: resolvedState,
    delta_amount: 0,
    reason,
    admin_id: staff.id,
  });

  await recordIncentiveAudit(db, {
    actorId: staff.id,
    actorName: staff.full_name,
    action: "incentive_exception.resolve",
    entityType: "agent_incentive_ledger",
    entityId: input.ledgerId,
    periodId: ledgerRes.data.period_id as string,
    agentId: ledgerRes.data.agent_id as string,
    reason,
    beforeData: { resolvedState: prevState, exceptionReason: ledgerRes.data.exception_reason },
    afterData: { resolvedState },
  });

  const periodObj = Array.isArray(ledgerRes.data.incentive_periods)
    ? ledgerRes.data.incentive_periods[0]
    : ledgerRes.data.incentive_periods;
  if (periodObj?.period_key) {
    await reconcilePeriodIncentives(db, String(periodObj.period_key), {
      actorId: staff.id,
      actorName: staff.full_name,
    });
  }

  revalidatePath("/incentives");
  return done(`Resolved exception as ${resolvedState} and recalculated daily ledger.`);
}

export async function addManualAdjustmentAction(input: {
  periodKey: string;
  agentId: string;
  settlementId?: string | null;
  claimId?: string | null;
  deltaAmount: number;
  reason: string;
}) {
  const auth = await authorize("incentives.manage", "Only admins can record manual adjustments.");
  if (!auth.staff) return auth.error;
  const staff = auth.staff;
  if (!UUID.test(input.agentId)) return fail("Choose an agent.");

  const delta = Number(input.deltaAmount);
  if (!Number.isFinite(delta) || delta === 0 || Math.abs(delta) > 1_000_000) {
    return fail("Enter a valid non-zero rupee adjustment.");
  }
  const reason = String(input.reason ?? "").trim();
  if (reason.length < 5) return fail("Enter a detailed reason (at least 5 characters) for the audit log.");

  const db = await createClient();
  const period = await ensureMonthPeriod(db, input.periodKey);
  const settings = await loadSettings(db);

  let adjType: "earning_override" | "post_finalization_correction" = "earning_override";
  let originalVal = "₹0";
  let updatedVal = `₹${Math.max(0, delta)}`;

  if (input.settlementId && UUID.test(input.settlementId)) {
    const sRes = await db.from("incentive_settlements").select("*").eq("id", input.settlementId).maybeSingle();
    if (sRes.error) return fail(dbMessage(sRes.error));
    if (sRes.data) {
      const s = sRes.data;
      const isFinalized = ["finalized", "partially_paid", "paid"].includes(String(s.status));
      if (isFinalized) {
        if (settings.postFinalizationPolicy === "next_period_adjustment") {
          return fail(
            "Settlement is finalized and policy requires post-finalization corrections to be entered in the next open period.",
          );
        }
        adjType = "post_finalization_correction";
      }
      originalVal = `Payable ₹${Number(s.finalized_payable ?? 0)}`;
      const nextAdj = Number(s.adjustment_amount ?? 0) + delta;
      const nextPayable =
        s.eligibility_status === "forfeited" ? 0 : Math.max(0, Number(s.provisional_amount ?? 0) + nextAdj);
      updatedVal = `Payable ₹${nextPayable}`;

      await db
        .from("incentive_settlements")
        .update({ adjustment_amount: nextAdj, finalized_payable: nextPayable })
        .eq("id", input.settlementId);
      await syncSettlementBalances(db, input.settlementId);
    }
  } else {
    const mRes = await db
      .from("agent_monthly_incentives")
      .select("provisional_earnings")
      .eq("period_id", period.id)
      .eq("agent_id", input.agentId)
      .maybeSingle();
    if (!mRes.error && mRes.data) {
      const prevTotal = Number(mRes.data.provisional_earnings ?? 0);
      const nextTotal = Math.max(0, prevTotal + delta);
      originalVal = `Payable ₹${prevTotal}`;
      updatedVal = `Payable ₹${nextTotal}`;
    }
  }

  const ins = await db.from("incentive_adjustments").insert({
    period_id: period.id,
    agent_id: input.agentId,
    settlement_id: input.settlementId && UUID.test(input.settlementId) ? input.settlementId : null,
    claim_id: input.claimId && UUID.test(input.claimId) ? input.claimId : null,
    adjustment_type: adjType,
    original_value: originalVal,
    updated_value: updatedVal,
    delta_amount: delta,
    reason,
    admin_id: staff.id,
  });
  if (ins.error) return fail(dbMessage(ins.error));

  await recordIncentiveAudit(db, {
    actorId: staff.id,
    actorName: staff.full_name,
    action: "incentive_adjustment.create",
    entityType: "incentive_adjustment",
    periodId: period.id,
    agentId: input.agentId,
    reason,
    beforeData: { originalVal },
    afterData: { updatedVal, delta },
  });

  if (period.status !== "finalized" && period.status !== "closed") {
    await reconcilePeriodIncentives(db, input.periodKey, {
      actorId: staff.id,
      actorName: staff.full_name,
    });
  }

  revalidatePath("/incentives");
  return done(`Recorded ${delta > 0 ? `+₹${delta}` : `-₹${Math.abs(delta)}`} adjustment with audit reason.`);
}

/* ------------------------------------------------------------------ */
/* 6. Idempotent Monthly Settlement Lifecycle & Partial Payouts        */
/* ------------------------------------------------------------------ */
export async function generatePeriodSettlementsAction(periodKey: string) {
  const auth = await authorize("incentives.manage", "Only admins can generate monthly settlements.");
  if (!auth.staff) return auth.error;
  const staff = auth.staff;

  const db = await createClient();
  const period = await ensureMonthPeriod(db, periodKey);

  const preSettlementsRes = await db.from("incentive_settlements").select("status").eq("period_id", period.id);
  const hasUnlockedSettlement = (preSettlementsRes.data ?? []).some((s) =>
    ["open", "ready_for_review", "under_review"].includes(String(s.status)),
  );

  // Sync period calculations right before generating settlement summaries (protects locked/finalized agents inside engine)
  if (period.status === "open" || period.status === "ready_for_review" || hasUnlockedSettlement) {
    await reconcilePeriodIncentives(db, periodKey, {
      actorId: staff.id,
      actorName: staff.full_name,
    });
  }

  const [monthlyRes, existingSettlementsRes] = await Promise.all([
    db.from("agent_monthly_incentives").select("*").eq("period_id", period.id),
    db.from("incentive_settlements").select("*").eq("period_id", period.id),
  ]);
  if (monthlyRes.error) return fail(dbMessage(monthlyRes.error));
  if (existingSettlementsRes.error) return fail(dbMessage(existingSettlementsRes.error));

  const existingByAgent = new Map<string, Record<string, unknown>>();
  for (const s of existingSettlementsRes.data ?? []) {
    existingByAgent.set(String(s.agent_id), s as Record<string, unknown>);
  }

  const nowIso = new Date().toISOString();
  let createdOrRefreshed = 0;

  for (const m of monthlyRes.data ?? []) {
    const agentId = String(m.agent_id);
    const prev = existingByAgent.get(agentId);
    // Protect finalized / partially paid / paid settlements from silent overwrite!
    if (prev && ["finalized", "partially_paid", "paid"].includes(String(prev.status))) {
      continue;
    }

    const targetAchieved = Boolean(m.target_achieved);
    const payable = Number(m.eligible_payable_amount ?? 0);
    const derived = deriveSettlementStatus({
      targetAchieved,
      finalizedPayable: payable,
      paidAmount: Number(prev?.paid_amount ?? 0),
      workflowState: "ready_for_review",
    });

    const mExtra = m as Record<string, unknown>;
    const rowPayload = {
      period_id: period.id,
      agent_id: agentId,
      vehicle_category: m.primary_vehicle_category,
      assigned_state: m.primary_state,
      monthly_target: Number(m.effective_target ?? 0),
      eligible_claims: Number(m.eligible_claims_count ?? 0),
      provisional_amount: Number(m.provisional_earnings ?? 0),
      monthly_milestone_bonus: Number(mExtra.monthly_milestone_bonus ?? 0),
      stretch_bonus_amount: Number(mExtra.stretch_bonus_amount ?? 0),
      adjustment_amount: Number(m.adjustments_total ?? 0),
      eligibility_status: derived.eligibilityStatus,
      payment_status: derived.paymentStatus,
      status: derived.status,
      finalized_payable: targetAchieved ? payable : 0,
      paid_amount: Number(prev?.paid_amount ?? 0),
      outstanding_amount: derived.outstanding,
      generated_by: staff.id,
      generated_at: nowIso,
    };

    let up = await db.from("incentive_settlements").upsert(rowPayload, { onConflict: "period_id,agent_id" });
    if (up.error && (up.error.message.includes("monthly_milestone_bonus") || up.error.message.includes("stretch_bonus_amount"))) {
      const { monthly_milestone_bonus: _mm, stretch_bonus_amount: _sb, ...legacyPayload } = rowPayload;
      up = await db.from("incentive_settlements").upsert(legacyPayload, { onConflict: "period_id,agent_id" });
    }
    if (up.error) return fail(dbMessage(up.error));
    createdOrRefreshed += 1;
  }

  if (period.status === "open") {
    await db
      .from("incentive_periods")
      .update({ status: "ready_for_review", closed_by: staff.id, closed_at: nowIso })
      .eq("id", period.id);
  }

  await recordIncentiveAudit(db, {
    actorId: staff.id,
    actorName: staff.full_name,
    action: "incentive_settlement.generate",
    entityType: "incentive_period",
    entityId: periodKey,
    periodId: period.id,
    afterData: { processedAgents: createdOrRefreshed },
  });

  revalidatePath("/incentives");
  return done(`Generated idempotent settlements for ${createdOrRefreshed} agent(s) in ${period.label}.`);
}

export async function updateSettlementStatusAction(
  settlementId: string,
  nextState: "under_review" | "finalized",
  notes?: string,
) {
  const auth = await authorize("incentives.manage", "Only admins can finalize settlements.");
  if (!auth.staff) return auth.error;
  const staff = auth.staff;
  if (!UUID.test(settlementId)) return fail("Settlement not found.");

  const db = await createClient();
  const sRes = await db.from("incentive_settlements").select("*").eq("id", settlementId).maybeSingle();
  if (sRes.error) return fail(dbMessage(sRes.error));
  if (!sRes.data) return fail("Settlement not found.");

  const s = sRes.data;
  if (s.status === "forfeited") return fail("Forfeited settlements cannot be finalized for payout.");
  if (["finalized", "partially_paid", "paid"].includes(String(s.status))) {
    return fail("Settlement is already finalized and locked.");
  }

  if (nextState === "finalized") {
    // Check held claims for this agent in this period before locking
    const heldRes = await db
      .from("agent_incentive_ledger")
      .select("id", { count: "exact", head: true })
      .eq("period_id", s.period_id as string)
      .eq("agent_id", s.agent_id as string)
      .eq("earning_status", "held");
    if ((heldRes.count ?? 0) > 0) {
      return fail(
        `Agent still has ${heldRes.count} held claim exception(s). Resolve or override exceptions before finalizing.`,
      );
    }
  }

  const derived = deriveSettlementStatus({
    targetAchieved: s.eligibility_status !== "forfeited",
    finalizedPayable: Number(s.finalized_payable ?? 0),
    paidAmount: Number(s.paid_amount ?? 0),
    workflowState: nextState,
  });

  const nowIso = new Date().toISOString();
  const upd = await db
    .from("incentive_settlements")
    .update({
      status: derived.status,
      eligibility_status: derived.eligibilityStatus,
      payment_status: derived.paymentStatus,
      outstanding_amount: derived.outstanding,
      notes: notes?.trim() || (s.notes as string | null),
      ...(nextState === "finalized" ? { finalized_by: staff.id, finalized_at: nowIso } : {}),
    })
    .eq("id", settlementId);
  if (upd.error) return fail(dbMessage(upd.error));

  if (nextState === "finalized") {
    // Lock ledger entries for immutability
    const targetAchieved = s.eligibility_status !== "forfeited";
    await db
      .from("agent_incentive_ledger")
      .update({
        is_locked: true,
        earning_status: targetAchieved ? "qualified" : "forfeited",
      })
      .eq("period_id", s.period_id as string)
      .eq("agent_id", s.agent_id as string)
      .in("earning_status", ["provisional"]);
  }

  await recordIncentiveAudit(db, {
    actorId: staff.id,
    actorName: staff.full_name,
    action: nextState === "finalized" ? "incentive_settlement.finalize" : "incentive_settlement.review",
    entityType: "incentive_settlement",
    entityId: settlementId,
    periodId: s.period_id as string,
    agentId: s.agent_id as string,
    reason: notes?.trim() || null,
    beforeData: { status: s.status },
    afterData: { status: derived.status, payable: s.finalized_payable },
  });

  revalidatePath("/incentives");
  return done(nextState === "finalized" ? "Settlement finalized and locked." : "Settlement moved to Under Review.");
}

export async function finalizeAllReadySettlementsAction(periodKey: string) {
  const auth = await authorize("incentives.manage", "Only admins can finalize settlements.");
  if (!auth.staff) return auth.error;
  const staff = auth.staff;

  const db = await createClient();
  const period = await ensureMonthPeriod(db, periodKey);

  // Block period finalization if unresolved exceptions remain
  const heldCountRes = await db
    .from("agent_incentive_ledger")
    .select("id", { count: "exact", head: true })
    .eq("period_id", period.id)
    .eq("earning_status", "held");
  if ((heldCountRes.count ?? 0) > 0) {
    return fail(`Cannot finalize period while ${heldCountRes.count} claim exception(s) remain held for review.`);
  }

  const rowsRes = await db
    .from("incentive_settlements")
    .select("*")
    .eq("period_id", period.id)
    .in("status", ["ready_for_review", "under_review"]);
  if (rowsRes.error) return fail(dbMessage(rowsRes.error));

  const nowIso = new Date().toISOString();
  let count = 0;
  for (const s of rowsRes.data ?? []) {
    const derived = deriveSettlementStatus({
      targetAchieved: s.eligibility_status !== "forfeited",
      finalizedPayable: Number(s.finalized_payable ?? 0),
      paidAmount: Number(s.paid_amount ?? 0),
      workflowState: "finalized",
    });

    await db
      .from("incentive_settlements")
      .update({
        status: derived.status,
        eligibility_status: derived.eligibilityStatus,
        payment_status: derived.paymentStatus,
        outstanding_amount: derived.outstanding,
        finalized_by: staff.id,
        finalized_at: nowIso,
      })
      .eq("id", s.id as string);
    count += 1;
  }

  // Lock all provisional ledger rows across period into qualified / forfeited
  const monthlyRes = await db.from("agent_monthly_incentives").select("agent_id, target_achieved").eq("period_id", period.id);
  for (const m of monthlyRes.data ?? []) {
    await db
      .from("agent_incentive_ledger")
      .update({
        is_locked: true,
        earning_status: m.target_achieved ? "qualified" : "forfeited",
      })
      .eq("period_id", period.id)
      .eq("agent_id", m.agent_id as string)
      .eq("earning_status", "provisional");
  }

  await db
    .from("incentive_periods")
    .update({ status: "finalized", finalized_by: staff.id, finalized_at: nowIso })
    .eq("id", period.id);

  await recordIncentiveAudit(db, {
    actorId: staff.id,
    actorName: staff.full_name,
    action: "incentive_period.finalize_all",
    entityType: "incentive_period",
    entityId: periodKey,
    periodId: period.id,
    afterData: { finalizedCount: count },
  });

  revalidatePath("/incentives");
  return done(`Finalized and locked ${period.label} (${count} settlements).`);
}

export async function reopenSettlementAction(settlementId: string, reason: string) {
  const auth = await authorize("incentives.manage");
  if (!auth.staff) return auth.error;
  const staff = auth.staff;
  if (!UUID.test(settlementId)) return fail("Settlement not found.");

  const cleanReason = reason.trim();
  if (cleanReason.length < 5) return fail("Enter a detailed reason (min 5 characters) to reopen a locked settlement.");

  const db = await createClient();
  const settings = await loadSettings(db);
  if (settings.postFinalizationPolicy !== "reopen_with_reason") {
    return fail("Policy forbids reopening finalized settlements; enter an adjustment in the next open period instead.");
  }

  const sRes = await db.from("incentive_settlements").select("*").eq("id", settlementId).maybeSingle();
  if (sRes.error || !sRes.data) return fail("Settlement not found.");
  const s = sRes.data;
  if (Number(s.paid_amount ?? 0) > 0) {
    return fail("Settlement already has recorded payouts and cannot be unlocked directly.");
  }

  await db
    .from("incentive_settlements")
    .update({ status: "under_review", eligibility_status: "under_review" })
    .eq("id", settlementId);

  await db
    .from("incentive_periods")
    .update({ status: "ready_for_review" })
    .eq("id", s.period_id as string)
    .eq("status", "finalized");

  await db
    .from("agent_incentive_ledger")
    .update({ is_locked: false, earning_status: "provisional" })
    .eq("period_id", s.period_id as string)
    .eq("agent_id", s.agent_id as string)
    .in("earning_status", ["qualified", "forfeited"]);

  await recordIncentiveAudit(db, {
    actorId: staff.id,
    actorName: staff.full_name,
    action: "incentive_settlement.reopen",
    entityType: "incentive_settlement",
    entityId: settlementId,
    periodId: s.period_id as string,
    agentId: s.agent_id as string,
    reason: cleanReason,
  });

  revalidatePath("/incentives");
  return done("Reopened settlement to Under Review with audit reason.");
}

export async function recordPayoutAction(formData: FormData) {
  const auth = await authorize("incentives.manage", "Only admins can record incentive payouts.");
  if (!auth.staff) return auth.error;
  const staff = auth.staff;

  const settlementId = text(formData, "settlementId");
  const paidAmount = Number(text(formData, "paidAmount").replace(/,/g, ""));
  const payoutDate = parseDate(text(formData, "payoutDate"));
  const paymentMode = text(formData, "paymentMode");
  const transactionRef = text(formData, "transactionRef");
  const remarks = text(formData, "remarks");
  const fileCheck = checkFile(formData.get("proof"));

  if (!UUID.test(settlementId)) return fail("Select a finalized settlement.");
  if (!Number.isFinite(paidAmount) || paidAmount <= 0) return fail("Paid amount must be greater than ₹0.");
  if (!payoutDate || payoutDate > todayIST()) return fail("Choose a valid payout date (not in the future).");
  if (!PAYOUT_MODES.includes(paymentMode as (typeof PAYOUT_MODES)[number])) {
    return fail("Choose Bank, UPI, Cash or Other.");
  }
  if (transactionRef.length < 2 || transactionRef.length > 120) {
    return fail("Enter the transaction reference / UTR / receipt ID.");
  }
  if (fileCheck.error) return fail(fileCheck.error);

  const db = await createClient();
  const sRes = await db.from("incentive_settlements").select("*").eq("id", settlementId).maybeSingle();
  if (sRes.error) return fail(dbMessage(sRes.error));
  if (!sRes.data) return fail("Settlement not found.");

  const s = sRes.data;
  if (!["finalized", "partially_paid"].includes(String(s.status))) {
    return fail("Only Finalized or Partially Paid settlements can receive payouts.");
  }

  const outstanding = Number(s.outstanding_amount ?? 0);
  if (paidAmount > outstanding) {
    return fail(`Paid amount (₹${paidAmount}) exceeds remaining outstanding balance (₹${outstanding}).`);
  }

  let proofPath: string | null = null;
  if (fileCheck.file) {
    const safeName = fileCheck.file.name.replace(/[^A-Za-z0-9._-]+/g, "_").slice(-80) || "proof";
    proofPath = `incentive-payouts/${settlementId}/${Date.now()}-${safeName}`;
    const up = await db.storage
      .from("DOCUMENTS")
      .upload(proofPath, fileCheck.file, { contentType: fileCheck.file.type, upsert: false });
    if (up.error) return fail(`Proof upload failed: ${up.error.message}`);
  }

  const ins = await db.from("incentive_payouts").insert({
    settlement_id: settlementId,
    period_id: s.period_id as string,
    agent_id: s.agent_id as string,
    paid_amount: paidAmount,
    payout_date: payoutDate,
    payment_mode: paymentMode,
    transaction_ref: transactionRef,
    remarks: remarks || null,
    proof_path: proofPath,
    recorded_by: staff.id,
  });
  if (ins.error) {
    if (proofPath) await db.storage.from("DOCUMENTS").remove([proofPath]);
    return fail(dbMessage(ins.error));
  }

  await syncSettlementBalances(db, settlementId);

  await recordIncentiveAudit(db, {
    actorId: staff.id,
    actorName: staff.full_name,
    action: "incentive_payout.record",
    entityType: "incentive_settlement",
    entityId: settlementId,
    periodId: s.period_id as string,
    agentId: s.agent_id as string,
    reason: transactionRef,
    afterData: { paidAmount, paymentMode, payoutDate, transactionRef },
  });

  revalidatePath("/incentives");
  return done(`Recorded payout of ₹${paidAmount.toLocaleString("en-IN")} (${transactionRef}).`);
}
