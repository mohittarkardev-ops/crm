import { addDays, daysInMonth, mondayIndex, pad2, toISO } from "@/lib/dates";
import { canonicalStateName, normalizePincode } from "@/lib/states";

export type VehicleCategory = "2W" | "4W" | "CW";
export type RuleScope = "exact_state" | "category_default" | "global_fallback";
export type CalculationMethod = "fixed" | "progressive_slab" | "final_slab" | "combined" | "milestone";
export type CombinationMode = "fixed_plus_progressive" | "fixed_plus_final_slab" | "fixed_plus_slab_bonus";
export type StretchRateMode =
  | "replace_from_base"
  | "extra_per_claim_from_base"
  | "replace_all_claims"
  | "lump_sum_bonus";
export type NonWorkingDayPolicy = "hold_for_review" | "zero_credit" | "roll_to_next_working_day";
export type MidMonthTargetPolicy = "full_target" | "prorated" | "admin_override";
export type PostFinalizationPolicy = "next_period_adjustment" | "reopen_with_reason";
export type AgentVisibilityMode = "immediate" | "after_daily_reconciliation";
export type SettlementStatus =
  | "open"
  | "ready_for_review"
  | "under_review"
  | "finalized"
  | "partially_paid"
  | "paid"
  | "forfeited";

export type IncentiveSlab = {
  slabOrder: number;
  minClaims: number;
  maxClaims: number | null; // null = unbounded (e.g. 21+)
  ratePerClaim: number;
  bonusAmount: number;
};

export type MonthlyMilestoneTier = {
  minClaims: number;
  rewardAmount: number;
};

export type IncentiveRule = {
  id: string;
  ruleName: string;
  scope: RuleScope;
  vehicleCategory: VehicleCategory | null; // null only for global_fallback
  stateName: string | null; // null for category_default / global_fallback
  isActive: boolean;
  calculationMethod: CalculationMethod;
  fixedRate: number;
  combinationMode: CombinationMode;
  monthlyTarget: number;
  eligibleClaimStatuses: string[];
  effectiveFrom: string;
  effectiveUntil: string | null;
  currentVersion: number;
  currentVersionId?: string;
  slabs: IncentiveSlab[];
  monthlyMilestones: MonthlyMilestoneTier[];
};

export type IncentiveSettings = {
  enableLiveCalculations: boolean;
  allowCategoryDefaultFallback: boolean;
  allowGlobalFallback: boolean;
  eligibleClaimStatuses: string[];
  nonWorkingDayPolicy: NonWorkingDayPolicy;
  midMonthTargetPolicy: MidMonthTargetPolicy;
  postFinalizationPolicy: PostFinalizationPolicy;
  agentVisibilityMode: AgentVisibilityMode;
  workingDays: number[]; // ISO 1 (Mon) .. 7 (Sun)
};

export type HolidayItem = {
  date: string;
  label: string;
};

export type AgentAssignmentRecord = {
  id: string;
  staffId: string;
  staffName: string;
  employeeCode: string | null;
  ruleId?: string | null;
  ruleName?: string | null;
  vehicleCategory: VehicleCategory;
  assignedState: string;
  effectiveFrom: string;
  effectiveUntil: string | null;
  status: "active" | "inactive";
  notes: string | null;
  stretchTarget?: number | null;
  stretchSpecialRate?: number;
  stretchRateMode?: StretchRateMode;
  stretchLabel?: string | null;
  stretchMilestones?: MonthlyMilestoneTier[];
  createdAt?: string;
};

export type LocationResolution =
  | { status: "resolved_pin"; state: string; detail: string }
  | { status: "manual_fallback"; state: string; detail: string }
  | { status: "pin_conflict"; state: null; detail: string; conflictStates: string[] }
  | { status: "unverified"; state: null; detail: string };

export const VEHICLE_CATEGORIES: { key: VehicleCategory; label: string; shortLabel: string }[] = [
  { key: "2W", label: "Two-Wheeler (2W)", shortLabel: "2W" },
  { key: "4W", label: "Four-Wheeler (4W)", shortLabel: "4W" },
  { key: "CW", label: "Commercial Vehicle (CW)", shortLabel: "CW" },
];

export const CALCULATION_METHOD_LABELS: Record<CalculationMethod, string> = {
  fixed: "Fixed Rate",
  progressive_slab: "Fixed + Steps (Legacy)",
  final_slab: "Final Tier Rate (Legacy)",
  combined: "Combined (Fixed + Milestone)",
  milestone: "Milestone",
};

export const STRETCH_RATE_MODE_LABELS: Record<StretchRateMode, string> = {
  lump_sum_bonus: "Milestone Step Payout (flat ₹ reward at each step)",
  replace_from_base: "Special Rate per Claim on claims after base target",
  extra_per_claim_from_base: "Extra Bonus per Claim on claims after base target",
  replace_all_claims: "Special Rate per Claim across all claims in month",
};

export const COMBINATION_MODE_LABELS: Record<CombinationMode, string> = {
  fixed_plus_progressive: "Fixed rate + Step rate",
  fixed_plus_final_slab: "Fixed rate + Final rate",
  fixed_plus_slab_bonus: "Fixed rate + Milestone bonus",
};

export const RULE_SCOPE_LABELS: Record<RuleScope, string> = {
  exact_state: "Vehicle + State",
  category_default: "Vehicle Default",
  global_fallback: "All Vehicles & States",
};

export const SETTLEMENT_STATUS_LABELS: Record<SettlementStatus, string> = {
  open: "Open",
  ready_for_review: "Ready for Review",
  under_review: "Under Review",
  finalized: "Finalized",
  partially_paid: "Partially Paid",
  paid: "Paid",
  forfeited: "Forfeited",
};

export const WEEKDAYS = [
  { value: 1, short: "Mon", label: "Monday" },
  { value: 2, short: "Tue", label: "Tuesday" },
  { value: 3, short: "Wed", label: "Wednesday" },
  { value: 4, short: "Thu", label: "Thursday" },
  { value: 5, short: "Fri", label: "Friday" },
  { value: 6, short: "Sat", label: "Saturday" },
  { value: 7, short: "Sun", label: "Sunday" },
];

export const DEFAULT_SLABS_2W: IncentiveSlab[] = [
  { slabOrder: 1, minClaims: 1, maxClaims: 5, ratePerClaim: 4, bonusAmount: 0 },
  { slabOrder: 2, minClaims: 6, maxClaims: 10, ratePerClaim: 5, bonusAmount: 0 },
  { slabOrder: 3, minClaims: 11, maxClaims: 20, ratePerClaim: 6, bonusAmount: 0 },
  { slabOrder: 4, minClaims: 21, maxClaims: null, ratePerClaim: 7, bonusAmount: 0 },
];

export const DEFAULT_SLABS_4W: IncentiveSlab[] = [
  { slabOrder: 1, minClaims: 1, maxClaims: 3, ratePerClaim: 8, bonusAmount: 0 },
  { slabOrder: 2, minClaims: 4, maxClaims: 8, ratePerClaim: 10, bonusAmount: 0 },
  { slabOrder: 3, minClaims: 9, maxClaims: null, ratePerClaim: 12, bonusAmount: 0 },
];

export const DEFAULT_SLABS_CW: IncentiveSlab[] = [
  { slabOrder: 1, minClaims: 1, maxClaims: 2, ratePerClaim: 15, bonusAmount: 0 },
  { slabOrder: 2, minClaims: 3, maxClaims: 5, ratePerClaim: 18, bonusAmount: 0 },
  { slabOrder: 3, minClaims: 6, maxClaims: null, ratePerClaim: 22, bonusAmount: 0 },
];

export const DEFAULT_DAILY_MILESTONES: IncentiveSlab[] = [
  { slabOrder: 1, minClaims: 2, maxClaims: null, ratePerClaim: 30, bonusAmount: 0 },
  { slabOrder: 2, minClaims: 4, maxClaims: null, ratePerClaim: 60, bonusAmount: 0 },
  { slabOrder: 3, minClaims: 6, maxClaims: null, ratePerClaim: 80, bonusAmount: 0 },
  { slabOrder: 4, minClaims: 8, maxClaims: null, ratePerClaim: 120, bonusAmount: 0 },
  { slabOrder: 5, minClaims: 10, maxClaims: null, ratePerClaim: 150, bonusAmount: 0 },
];

export const PRESET_MONTHLY_MILESTONES: MonthlyMilestoneTier[] = [
  { minClaims: 60, rewardAmount: 500 },
  { minClaims: 80, rewardAmount: 1000 },
  { minClaims: 100, rewardAmount: 1500 },
];

export const DEFAULT_SETTINGS: IncentiveSettings = {
  enableLiveCalculations: true,
  allowCategoryDefaultFallback: true,
  allowGlobalFallback: false,
  eligibleClaimStatuses: ["approved"],
  nonWorkingDayPolicy: "hold_for_review",
  midMonthTargetPolicy: "admin_override",
  postFinalizationPolicy: "next_period_adjustment",
  agentVisibilityMode: "immediate",
  workingDays: [1, 2, 3, 4, 5, 6],
};

export const DEFAULT_MONTHLY_TARGETS: Record<VehicleCategory, number> = {
  "2W": 100,
  "4W": 80,
  CW: 60,
};

/** Maps legacy CRM 'CV', 'bike', 'car' values smoothly into canonical '2W' | '4W' | 'CW'. */
export function normalizeVehicleCategory(
  raw: string | null | undefined,
  policyTypeCode?: string | null,
): VehicleCategory | null {
  const upper = (raw ?? "").trim().toUpperCase();
  if (upper === "2W" || upper === "BIKE") return "2W";
  if (upper === "4W" || upper === "CAR") return "4W";
  if (upper === "CW" || upper === "CV" || upper === "COMMERCIAL" || upper === "OTHER") return "CW";

  const pCode = (policyTypeCode ?? "").trim().toLowerCase();
  if (pCode === "bike") return "2W";
  if (pCode === "car") return "4W";
  if (pCode === "other") return "CW";
  return null;
}

/** Normalizes, validates, and sorts daily slabs cleanly with unambiguous claim ranges. */
export function normalizeSlabs(raw: unknown): IncentiveSlab[] {
  if (!Array.isArray(raw)) return [];
  const items: IncentiveSlab[] = [];

  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const obj = item as Record<string, unknown>;
    const min = Math.floor(Number(obj.minClaims ?? obj.min_claims ?? obj.minPayments ?? 0));
    const maxRaw = obj.maxClaims ?? obj.max_claims;
    const max =
      maxRaw === null || maxRaw === undefined || maxRaw === ""
        ? null
        : Math.floor(Number(maxRaw));
    const rate = Number(obj.ratePerClaim ?? obj.rate_per_claim ?? obj.amount ?? 0);
    const bonus = Number(obj.bonusAmount ?? obj.bonus_amount ?? 0);

    if (!Number.isFinite(min) || min < 1) continue;
    if (max !== null && (!Number.isFinite(max) || max < min)) continue;
    if (!Number.isFinite(rate) || rate < 0) continue;

    items.push({
      slabOrder: items.length + 1,
      minClaims: min,
      maxClaims: max,
      ratePerClaim: rate,
      bonusAmount: Number.isFinite(bonus) && bonus >= 0 ? bonus : 0,
    });
  }

  items.sort((a, b) => a.minClaims - b.minClaims);
  return items.map((s, idx) => ({ ...s, slabOrder: idx + 1 }));
}

/** Normalizes, deduplicates, and sorts monthly milestone thresholds cleanly by `minClaims`. */
export function normalizeMonthlyMilestones(raw: unknown): MonthlyMilestoneTier[] {
  if (!Array.isArray(raw)) return [];
  const byThreshold = new Map<number, number>();
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const obj = item as Record<string, unknown>;
    const min = Math.floor(Number(obj.minClaims ?? obj.min_claims ?? obj.threshold ?? 0));
    const reward = Number(obj.rewardAmount ?? obj.reward_amount ?? obj.amount ?? 0);
    if (!Number.isFinite(min) || min < 1) continue;
    if (!Number.isFinite(reward) || reward < 0) continue;
    byThreshold.set(min, reward);
  }
  return Array.from(byThreshold.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([minClaims, rewardAmount]) => ({ minClaims, rewardAmount }));
}

export function slabLabelText(slab: IncentiveSlab | null): string {
  if (!slab) return "—";
  return slab.maxClaims === null ? `${slab.minClaims}+` : `${slab.minClaims}–${slab.maxClaims}`;
}

export function defaultSlabsForCategory(cat: VehicleCategory | null): IncentiveSlab[] {
  if (cat === "4W") return DEFAULT_SLABS_4W;
  if (cat === "CW") return DEFAULT_SLABS_CW;
  return DEFAULT_SLABS_2W;
}

/**
 * Location identification logic (PDF Section 05, p. 7 & Section 16 test):
 *  - Query all active rows matching PIN.
 *  - Multiple post offices mapping to DIFFERENT canonical states -> flag `pin_conflict`.
 *  - PIN resolves to S_pin and manual state entered is S_manual != S_pin -> flag `pin_conflict`.
 *  - PIN missing / not found -> use manually entered state (`manual_fallback`) if valid.
 *  - Neither PIN nor manual state -> `unverified` (do not credit yet).
 */
export function resolveCustomerLocation(args: {
  pincode: string | null | undefined;
  pinDirectoryStates: string[];
  manualState: string | null | undefined;
}): LocationResolution {
  const cleanPin = normalizePincode(args.pincode);
  const manual = canonicalStateName(args.manualState);
  const distinctStates = Array.from(
    new Set(args.pinDirectoryStates.map((s) => canonicalStateName(s)).filter(Boolean)),
  );

  if (cleanPin && distinctStates.length > 1) {
    return {
      status: "pin_conflict",
      state: null,
      conflictStates: distinctStates,
      detail: `PIN ${cleanPin} maps to multiple states (${distinctStates.join(", ")}). Held for admin review.`,
    };
  }

  if (cleanPin && distinctStates.length === 1) {
    const resolvedPinState = distinctStates[0];
    if (manual && manual.toLowerCase() !== resolvedPinState.toLowerCase()) {
      return {
        status: "pin_conflict",
        state: null,
        conflictStates: [resolvedPinState, manual],
        detail: `PIN ${cleanPin} resolves to ${resolvedPinState}, conflicting with entered state ${manual}. Held for admin review.`,
      };
    }
    return {
      status: "resolved_pin",
      state: resolvedPinState,
      detail: `Resolved ${resolvedPinState} from PIN ${cleanPin}.`,
    };
  }

  if (manual) {
    return {
      status: "manual_fallback",
      state: manual,
      detail: cleanPin
        ? `PIN ${cleanPin} not in directory; used manually entered state ${manual}.`
        : `PIN missing; used manually entered state ${manual}.`,
    };
  }

  return {
    status: "unverified",
    state: null,
    detail: cleanPin
      ? `PIN ${cleanPin} not found in directory and no manual state entered.`
      : "Customer PIN and state are missing; location unverified.",
  };
}

/** Finds an agent's single valid assignment on `submissionDate` without touching newer/older rows (Page 6). */
export function findActiveAssignment(
  assignments: AgentAssignmentRecord[],
  staffId: string,
  submissionDate: string,
): AgentAssignmentRecord | null {
  const matches = assignments.filter(
    (a) =>
      a.staffId === staffId &&
      a.status === "active" &&
      a.effectiveFrom <= submissionDate &&
      (a.effectiveUntil === null || a.effectiveUntil >= submissionDate),
  );
  if (matches.length === 0) return null;
  matches.sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom));
  return matches[0];
}

/** Rule resolution hierarchy (Page 8): exact state -> optional category default -> optional global fallback. */
export function resolveMatchingRule(
  rules: IncentiveRule[],
  args: {
    vehicleCategory: VehicleCategory;
    resolvedState: string;
    submissionDate: string;
    settings: Pick<IncentiveSettings, "allowCategoryDefaultFallback" | "allowGlobalFallback">;
  },
): { rule: IncentiveRule; resolutionTier: RuleScope } | null {
  const activeOnDate = rules.filter(
    (r) =>
      r.isActive &&
      r.effectiveFrom <= args.submissionDate &&
      (r.effectiveUntil === null || r.effectiveUntil >= args.submissionDate),
  );

  const canonicalTargetState = canonicalStateName(args.resolvedState).toLowerCase();

  // 1. Exact vehicle + state
  const exact = activeOnDate.find(
    (r) =>
      r.scope === "exact_state" &&
      r.vehicleCategory === args.vehicleCategory &&
      canonicalStateName(r.stateName).toLowerCase() === canonicalTargetState,
  );
  if (exact) return { rule: exact, resolutionTier: "exact_state" };

  // 2. Category default fallback (if enabled)
  if (args.settings.allowCategoryDefaultFallback) {
    const catDef = activeOnDate.find(
      (r) => r.scope === "category_default" && r.vehicleCategory === args.vehicleCategory,
    );
    if (catDef) return { rule: catDef, resolutionTier: "category_default" };
  }

  // 3. Global fallback (if enabled)
  if (args.settings.allowGlobalFallback) {
    const globalDef = activeOnDate.find((r) => r.scope === "global_fallback");
    if (globalDef) return { rule: globalDef, resolutionTier: "global_fallback" };
  }

  return null;
}

export function isWorkingDate(
  dateIso: string,
  holidays: HolidayItem[],
  workingDays: number[],
): { working: boolean; holidayLabel?: string } {
  const holiday = holidays.find((h) => h.date === dateIso);
  if (holiday) return { working: false, holidayLabel: holiday.label };

  const y = Number(dateIso.slice(0, 4));
  const m = Number(dateIso.slice(5, 7));
  const d = Number(dateIso.slice(8, 10));
  if (!y || !m || !d) return { working: true };

  const weekday = mondayIndex(y, m, d) + 1;
  if (!workingDays.includes(weekday)) return { working: false };
  return { working: true };
}

export function shiftToNextWorkingDay(
  dateIso: string,
  holidays: HolidayItem[],
  workingDays: number[],
): string {
  if (workingDays.length === 0) return dateIso;
  let cur = dateIso;
  for (let i = 0; i < 31; i++) {
    if (isWorkingDate(cur, holidays, workingDays).working) return cur;
    cur = addDays(cur, 1);
  }
  return dateIso;
}

export type ClaimDailyRewardItem = {
  sequenceNo: number; // 1..N
  slabLabel: string;
  appliedRate: number;
  amount: number;
};

/**
 * Pure daily slab calculation engine (PDF Section 07, p. 9):
 *  - Method A (`fixed`): `fixedRate * N`
 *  - Method B (`progressive_slab`): each claim `k` earns bracket rate for position `k` (`(5×4) + (5×5) + (2×6) = 57`)
 *  - Method C (`final_slab`): bracket for total day count `N` applied across ALL `N` claims (`12 × 6 = 72`)
 *  - Method D (`combined`): fixed component + slab component (`fixed_plus_progressive`, `fixed_plus_final_slab`, `fixed_plus_slab_bonus`)
 */
export function calculateDayClaimRewards(
  rule: Pick<IncentiveRule, "calculationMethod" | "fixedRate" | "combinationMode" | "slabs">,
  dailyEligibleCount: number,
): { items: ClaimDailyRewardItem[]; dayTotal: number; summaryLabel: string } {
  if (dailyEligibleCount <= 0) {
    return { items: [], dayTotal: 0, summaryLabel: "No eligible claims" };
  }

  const slabs = normalizeSlabs(rule.slabs);
  const findBracket = (count: number): IncentiveSlab | null => {
    // Check bounded brackets first, then pick the highest open-ended milestone (maxClaims === null) reached.
    for (const s of slabs) {
      if (s.maxClaims !== null && count >= s.minClaims && count <= s.maxClaims) return s;
    }
    const openEndedReached = slabs.filter((s) => s.maxClaims === null && count >= s.minClaims);
    if (openEndedReached.length > 0) return openEndedReached[openEndedReached.length - 1];
    const reached = slabs.filter((s) => count >= s.minClaims);
    return reached.length > 0 ? reached[reached.length - 1] : null;
  };

  const items: ClaimDailyRewardItem[] = [];
  const fixedRate = Math.max(0, Number(rule.fixedRate) || 0);

  if (rule.calculationMethod === "milestone") {
    const thresholds = normalizeSlabs(rule.slabs);
    const rewardAt = (count: number): { matched: IncentiveSlab | null; reward: number } => {
      let matched: IncentiveSlab | null = null;
      for (const t of thresholds) {
        if (count >= t.minClaims) matched = t;
      }
      const reward = matched ? (matched.ratePerClaim > 0 ? matched.ratePerClaim : matched.bonusAmount) : 0;
      return { matched, reward };
    };

    const nextThreshold = (count: number): IncentiveSlab | null => {
      return thresholds.find((t) => t.minClaims > count) ?? null;
    };

    for (let k = 1; k <= dailyEligibleCount; k++) {
      const prev = rewardAt(k - 1).reward;
      const cur = rewardAt(k);
      const delta = cur.reward - prev;
      const nxt = nextThreshold(k);
      const label = cur.matched
        ? delta > 0
          ? `Milestone ${cur.matched.minClaims}+ (₹${cur.reward})`
          : `Held @ ${cur.matched.minClaims}+ (₹${cur.reward})`
        : nxt
          ? `Need ${nxt.minClaims} for ₹${nxt.ratePerClaim > 0 ? nxt.ratePerClaim : nxt.bonusAmount}`
          : "Below milestone";

      items.push({
        sequenceNo: k,
        slabLabel: label,
        appliedRate: cur.reward,
        amount: delta,
      });
    }

    const finalState = rewardAt(dailyEligibleCount);
    const dayTotal = items.reduce((sum, x) => sum + x.amount, 0);
    const summaryLabel = finalState.matched
      ? `Milestone ${finalState.matched.minClaims}+ (${dailyEligibleCount} claims) → ₹${dayTotal}`
      : thresholds[0]
        ? `${dailyEligibleCount} claims (< ${thresholds[0].minClaims} threshold) → ₹0`
        : `${dailyEligibleCount} claims → ₹0`;

    return { items, dayTotal, summaryLabel };
  }

  if (rule.calculationMethod === "fixed") {
    for (let k = 1; k <= dailyEligibleCount; k++) {
      items.push({
        sequenceNo: k,
        slabLabel: "Fixed",
        appliedRate: fixedRate,
        amount: fixedRate,
      });
    }
    return {
      items,
      dayTotal: items.reduce((sum, x) => sum + x.amount, 0),
      summaryLabel: `${dailyEligibleCount} × ₹${fixedRate}`,
    };
  }

  if (rule.calculationMethod === "progressive_slab") {
    for (let k = 1; k <= dailyEligibleCount; k++) {
      const br = findBracket(k);
      const rate = br ? br.ratePerClaim : 0;
      items.push({
        sequenceNo: k,
        slabLabel: slabLabelText(br),
        appliedRate: rate,
        amount: rate,
      });
    }
    const dayTotal = items.reduce((sum, x) => sum + x.amount, 0);
    return {
      items,
      dayTotal,
      summaryLabel: `Progressive (${dailyEligibleCount} claims)`,
    };
  }

  if (rule.calculationMethod === "final_slab") {
    const finalBr = findBracket(dailyEligibleCount);
    const rate = finalBr ? finalBr.ratePerClaim : 0;
    const label = `Final ${slabLabelText(finalBr)}`;
    for (let k = 1; k <= dailyEligibleCount; k++) {
      items.push({
        sequenceNo: k,
        slabLabel: label,
        appliedRate: rate,
        amount: rate,
      });
    }
    return {
      items,
      dayTotal: items.reduce((sum, x) => sum + x.amount, 0),
      summaryLabel: `${dailyEligibleCount} × ₹${rate} (${slabLabelText(finalBr)})`,
    };
  }

  // Method D: Combined
  if (rule.combinationMode === "fixed_plus_final_slab") {
    const finalBr = findBracket(dailyEligibleCount);
    const slabRate = finalBr ? finalBr.ratePerClaim : 0;
    const rate = fixedRate + slabRate;
    const label = `₹${fixedRate} + ${slabLabelText(finalBr)}`;
    for (let k = 1; k <= dailyEligibleCount; k++) {
      items.push({ sequenceNo: k, slabLabel: label, appliedRate: rate, amount: rate });
    }
    return {
      items,
      dayTotal: items.reduce((sum, x) => sum + x.amount, 0),
      summaryLabel: `${dailyEligibleCount} × (₹${fixedRate} + ₹${slabRate})`,
    };
  }

  if (rule.combinationMode === "fixed_plus_slab_bonus") {
    const bonusAt = (count: number): { matched: IncentiveSlab | null; reward: number } => {
      const br = findBracket(count);
      const reward = br ? (br.bonusAmount > 0 ? br.bonusAmount : br.ratePerClaim) : 0;
      return { matched: br, reward };
    };
    for (let k = 1; k <= dailyEligibleCount; k++) {
      const prev = bonusAt(k - 1).reward;
      const cur = bonusAt(k);
      const milestoneDelta = Math.max(0, cur.reward - prev);
      const amt = fixedRate + milestoneDelta;
      items.push({
        sequenceNo: k,
        slabLabel:
          milestoneDelta > 0 && cur.matched
            ? `₹${fixedRate} + Step ${cur.matched.minClaims} (+₹${milestoneDelta})`
            : cur.matched
              ? `₹${fixedRate} (held @ ${cur.matched.minClaims}+ step)`
              : `₹${fixedRate} base`,
        appliedRate: fixedRate,
        amount: amt,
      });
    }
    const finalBonus = bonusAt(dailyEligibleCount).reward;
    return {
      items,
      dayTotal: items.reduce((sum, x) => sum + x.amount, 0),
      summaryLabel: `${dailyEligibleCount} × ₹${fixedRate}${finalBonus > 0 ? ` + ₹${finalBonus} milestone` : ""}`,
    };
  }

  // Default Method D: fixed_plus_progressive
  for (let k = 1; k <= dailyEligibleCount; k++) {
    const br = findBracket(k);
    const slabRate = br ? br.ratePerClaim : 0;
    const rate = fixedRate + slabRate;
    items.push({
      sequenceNo: k,
      slabLabel: `₹${fixedRate} + ${slabLabelText(br)}`,
      appliedRate: rate,
      amount: rate,
    });
  }
  return {
    items,
    dayTotal: items.reduce((sum, x) => sum + x.amount, 0),
    summaryLabel: `Combined progressive (${dailyEligibleCount} claims)`,
  };
}

/** Evaluates highest achieved Monthly Milestone bonus tier (e.g., 60 → ₹500, 80 → ₹1,000). */
export function calculateMonthlyMilestoneReward(
  milestones: MonthlyMilestoneTier[],
  monthlyEligibleClaims: number,
): {
  matchedTier: MonthlyMilestoneTier | null;
  bonusAmount: number;
  nextTier: MonthlyMilestoneTier | null;
  claimsToNext: number;
} {
  const tiers = normalizeMonthlyMilestones(milestones);
  if (monthlyEligibleClaims <= 0 || tiers.length === 0) {
    const first = tiers[0] ?? null;
    return {
      matchedTier: null,
      bonusAmount: 0,
      nextTier: first,
      claimsToNext: first ? Math.max(0, first.minClaims - Math.max(0, monthlyEligibleClaims)) : 0,
    };
  }

  let matched: MonthlyMilestoneTier | null = null;
  for (const t of tiers) {
    if (monthlyEligibleClaims >= t.minClaims) matched = t;
  }
  const next = tiers.find((t) => t.minClaims > monthlyEligibleClaims) ?? null;
  return {
    matchedTier: matched,
    bonusAmount: matched ? matched.rewardAmount : 0,
    nextTier: next,
    claimsToNext: next ? next.minClaims - monthlyEligibleClaims : 0,
  };
}

/**
 * Evaluates personalized Agent Stretch / Special Milestone Ladder on top of Common Base Target.
 * Supports multi-step milestone charts (`stretchMilestones`) where payouts/rates hold flat between
 * thresholds (identical to Daily Milestones) as well as single-threshold overrides.
 */
export function calculateStretchGoalEarnings(args: {
  eligibleClaimsCount: number;
  baseTarget: number;
  stretchTarget?: number | null;
  stretchSpecialRate?: number;
  stretchMilestones?: MonthlyMilestoneTier[] | null;
  stretchRateMode: StretchRateMode;
  chronologicalDailyClaimAmounts: number[];
}): {
  stretchConfigured: boolean;
  stretchAchieved: boolean;
  stretchTiers: MonthlyMilestoneTier[];
  matchedStretchTier: MonthlyMilestoneTier | null;
  nextStretchTier: MonthlyMilestoneTier | null;
  baseClaimsCount: number;
  overBaseClaimsCount: number;
  normalUpToBaseAmount: number;
  normalOverBaseAmount: number;
  normalTotalAmount: number;
  specialRateAmountOnOverBase: number;
  stretchDeltaAmount: number;
  totalWithStretch: number;
  claimsRemainingForStretch: number;
} {
  const n = Math.max(0, Math.floor(args.eligibleClaimsCount));
  const baseThreshold = Math.max(0, Math.floor(args.baseTarget));
  const legacyTarget =
    args.stretchTarget !== null && args.stretchTarget !== undefined && Number(args.stretchTarget) > 0
      ? Math.floor(Number(args.stretchTarget))
      : null;
  const legacyRate = Math.max(0, Number(args.stretchSpecialRate ?? 0) || 0);
  const explicitTiers = normalizeMonthlyMilestones(args.stretchMilestones ?? []);
  const stretchTiers: MonthlyMilestoneTier[] =
    explicitTiers.length > 0
      ? explicitTiers
      : legacyTarget
        ? [{ minClaims: legacyTarget, rewardAmount: legacyRate }]
        : [];
  const amounts = args.chronologicalDailyClaimAmounts;

  const baseClaimsCount = Math.min(n, baseThreshold);
  const overBaseClaimsCount = Math.max(0, n - baseThreshold);

  let normalUpToBaseAmount = 0;
  let normalOverBaseAmount = 0;
  for (let i = 0; i < n; i++) {
    const amt = Number(amounts[i] ?? 0);
    if (i < baseThreshold) normalUpToBaseAmount += amt;
    else normalOverBaseAmount += amt;
  }
  const normalTotalAmount = normalUpToBaseAmount + normalOverBaseAmount;

  if (stretchTiers.length === 0) {
    return {
      stretchConfigured: false,
      stretchAchieved: false,
      stretchTiers: [],
      matchedStretchTier: null,
      nextStretchTier: null,
      baseClaimsCount,
      overBaseClaimsCount,
      normalUpToBaseAmount,
      normalOverBaseAmount,
      normalTotalAmount,
      specialRateAmountOnOverBase: normalOverBaseAmount,
      stretchDeltaAmount: 0,
      totalWithStretch: normalTotalAmount,
      claimsRemainingForStretch: 0,
    };
  }

  let matchedStretchTier: MonthlyMilestoneTier | null = null;
  for (const t of stretchTiers) {
    if (n >= t.minClaims) matchedStretchTier = t;
  }
  const nextStretchTier = stretchTiers.find((t) => t.minClaims > n) ?? null;
  const stretchAchieved = matchedStretchTier !== null;
  const claimsRemainingForStretch = nextStretchTier ? Math.max(0, nextStretchTier.minClaims - n) : 0;

  if (!matchedStretchTier) {
    return {
      stretchConfigured: true,
      stretchAchieved: false,
      stretchTiers,
      matchedStretchTier: null,
      nextStretchTier,
      baseClaimsCount,
      overBaseClaimsCount,
      normalUpToBaseAmount,
      normalOverBaseAmount,
      normalTotalAmount,
      specialRateAmountOnOverBase: normalOverBaseAmount,
      stretchDeltaAmount: 0,
      totalWithStretch: normalTotalAmount,
      claimsRemainingForStretch,
    };
  }

  const appliedRate = Math.max(0, Number(matchedStretchTier.rewardAmount) || 0);
  let specialRateAmountOnOverBase = normalOverBaseAmount;
  let stretchDeltaAmount = 0;
  let totalWithStretch = normalTotalAmount;

  if (args.stretchRateMode === "extra_per_claim_from_base") {
    stretchDeltaAmount = overBaseClaimsCount * appliedRate;
    specialRateAmountOnOverBase = normalOverBaseAmount + stretchDeltaAmount;
    totalWithStretch = normalTotalAmount + stretchDeltaAmount;
  } else if (args.stretchRateMode === "replace_all_claims") {
    totalWithStretch = n * appliedRate;
    stretchDeltaAmount = totalWithStretch - normalTotalAmount;
    specialRateAmountOnOverBase = overBaseClaimsCount * appliedRate;
  } else if (args.stretchRateMode === "lump_sum_bonus") {
    stretchDeltaAmount = appliedRate;
    specialRateAmountOnOverBase = normalOverBaseAmount + stretchDeltaAmount;
    totalWithStretch = normalTotalAmount + stretchDeltaAmount;
  } else {
    // Default ("replace_from_base"): normal earnings up to Base Target, matched Special Rate on claims after Base Target
    specialRateAmountOnOverBase = overBaseClaimsCount * appliedRate;
    stretchDeltaAmount = specialRateAmountOnOverBase - normalOverBaseAmount;
    totalWithStretch = normalUpToBaseAmount + specialRateAmountOnOverBase;
  }

  return {
    stretchConfigured: true,
    stretchAchieved: true,
    stretchTiers,
    matchedStretchTier,
    nextStretchTier,
    baseClaimsCount,
    overBaseClaimsCount,
    normalUpToBaseAmount,
    normalOverBaseAmount,
    normalTotalAmount,
    specialRateAmountOnOverBase,
    stretchDeltaAmount,
    totalWithStretch: Math.max(0, totalWithStretch),
    claimsRemainingForStretch,
  };
}

/** Interactive Preview Simulator: distributes `monthlyClaims` across `workingDays` to preview exact payouts. */
export function simulateRulePayout(args: {
  rule: Pick<
    IncentiveRule,
    "calculationMethod" | "fixedRate" | "combinationMode" | "slabs" | "monthlyTarget" | "monthlyMilestones"
  >;
  workingDays: number;
  monthlyClaims: number;
  baseTargetOverride?: number | null;
  stretchTarget?: number | null;
  stretchSpecialRate?: number;
  stretchMilestones?: MonthlyMilestoneTier[] | null;
  stretchRateMode?: StretchRateMode;
}): {
  monthlyClaims: number;
  workingDays: number;
  effectiveTarget: number;
  targetAchieved: boolean;
  dailyBreakdownSummary: string;
  dailyTotalEarnings: number;
  monthlyMilestoneBonus: number;
  matchedMonthlyMilestone: MonthlyMilestoneTier | null;
  nextMonthlyMilestone: MonthlyMilestoneTier | null;
  stretchSummary: ReturnType<typeof calculateStretchGoalEarnings>;
  totalGrossEarned: number;
  finalPayable: number;
  forfeitedAmount: number;
  avgPerClaim: number;
} {
  const days = Math.max(1, Math.min(31, Math.floor(args.workingDays)));
  const totalClaims = Math.max(0, Math.min(10_000, Math.floor(args.monthlyClaims)));
  const effectiveTarget =
    args.baseTargetOverride !== null && args.baseTargetOverride !== undefined
      ? Math.max(0, Math.floor(args.baseTargetOverride))
      : Math.max(0, Math.floor(args.rule.monthlyTarget));

  const perDayFloor = Math.floor(totalClaims / days);
  const remainder = totalClaims % days;

  const chronologicalAmounts: number[] = [];
  let dailyTotalEarnings = 0;

  const highDayCount = remainder > 0 ? perDayFloor + 1 : perDayFloor;
  const highDayReward = calculateDayClaimRewards(args.rule, highDayCount);
  const lowDayReward = calculateDayClaimRewards(args.rule, perDayFloor);

  for (let d = 0; d < days; d++) {
    const dayReward = d < remainder ? highDayReward : lowDayReward;
    dailyTotalEarnings += dayReward.dayTotal;
    for (const item of dayReward.items) {
      chronologicalAmounts.push(item.amount);
    }
  }

  const dailyBreakdownSummary =
    totalClaims === 0
      ? "0 claims simulated"
      : remainder === 0
        ? `${days} days × ${perDayFloor} claims/day (${formatINRInline(lowDayReward.dayTotal)}/day)`
        : `${remainder} days × ${highDayCount} claims (${formatINRInline(highDayReward.dayTotal)}/day) + ${days - remainder} days × ${perDayFloor} claims (${formatINRInline(lowDayReward.dayTotal)}/day)`;

  const monthlyMilestone = calculateMonthlyMilestoneReward(args.rule.monthlyMilestones, totalClaims);
  const stretchSummary = calculateStretchGoalEarnings({
    eligibleClaimsCount: totalClaims,
    baseTarget: effectiveTarget,
    stretchTarget: args.stretchTarget ?? null,
    stretchSpecialRate: args.stretchSpecialRate ?? 0,
    stretchMilestones: args.stretchMilestones ?? null,
    stretchRateMode: args.stretchRateMode ?? "replace_from_base",
    chronologicalDailyClaimAmounts: chronologicalAmounts,
  });

  const targetAchieved = effectiveTarget === 0 || totalClaims >= effectiveTarget;
  const totalGrossEarned = Math.max(0, stretchSummary.totalWithStretch + monthlyMilestone.bonusAmount);
  const finalPayable = targetAchieved ? totalGrossEarned : 0;
  const forfeitedAmount = targetAchieved ? 0 : totalGrossEarned;
  const avgPerClaim = totalClaims > 0 ? Math.round((finalPayable / totalClaims) * 100) / 100 : 0;

  return {
    monthlyClaims: totalClaims,
    workingDays: days,
    effectiveTarget,
    targetAchieved,
    dailyBreakdownSummary,
    dailyTotalEarnings,
    monthlyMilestoneBonus: monthlyMilestone.bonusAmount,
    matchedMonthlyMilestone: monthlyMilestone.matchedTier,
    nextMonthlyMilestone: monthlyMilestone.nextTier,
    stretchSummary,
    totalGrossEarned,
    finalPayable,
    forfeitedAmount,
    avgPerClaim,
  };
}

function formatINRInline(amount: number): string {
  return `₹${amount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

export function computeProRatedTarget(args: {
  baseTarget: number;
  periodStart: string;
  periodEnd: string;
  activeFrom: string;
  activeUntil: string | null;
}): number {
  const start = args.activeFrom > args.periodStart ? args.activeFrom : args.periodStart;
  const end = args.activeUntil && args.activeUntil < args.periodEnd ? args.activeUntil : args.periodEnd;
  if (end < start) return 0;

  const totalDays =
    Math.round((Date.parse(`${args.periodEnd}T00:00:00Z`) - Date.parse(`${args.periodStart}T00:00:00Z`)) / 86_400_000) + 1;
  const activeDays =
    Math.round((Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86_400_000) + 1;

  if (totalDays <= 0) return args.baseTarget;
  return Math.max(1, Math.round((args.baseTarget * activeDays) / totalDays));
}

export function deriveSettlementStatus(args: {
  targetAchieved: boolean;
  finalizedPayable: number;
  paidAmount: number;
  workflowState: "open" | "ready_for_review" | "under_review" | "finalized";
}): {
  status: SettlementStatus;
  eligibilityStatus: "eligible" | "forfeited" | "under_review" | "ready_for_review";
  paymentStatus: "unpaid" | "partially_paid" | "paid" | "not_applicable";
  outstanding: number;
} {
  if (!args.targetAchieved) {
    return {
      status: "forfeited",
      eligibilityStatus: "forfeited",
      paymentStatus: "not_applicable",
      outstanding: 0,
    };
  }

  const payable = Math.max(0, Number(args.finalizedPayable) || 0);
  const paid = Math.max(0, Number(args.paidAmount) || 0);
  const outstanding = Math.max(0, payable - paid);

  if (args.workflowState === "open") {
    return { status: "open", eligibilityStatus: "eligible", paymentStatus: "unpaid", outstanding };
  }
  if (args.workflowState === "ready_for_review") {
    return {
      status: "ready_for_review",
      eligibilityStatus: "ready_for_review",
      paymentStatus: "unpaid",
      outstanding,
    };
  }
  if (args.workflowState === "under_review") {
    return { status: "under_review", eligibilityStatus: "under_review", paymentStatus: "unpaid", outstanding };
  }

  if (payable === 0 || outstanding === 0) {
    return {
      status: paid > 0 || payable === 0 ? "paid" : "finalized",
      eligibilityStatus: "eligible",
      paymentStatus: paid > 0 || payable === 0 ? "paid" : "unpaid",
      outstanding: 0,
    };
  }
  if (paid > 0) {
    return {
      status: "partially_paid",
      eligibilityStatus: "eligible",
      paymentStatus: "partially_paid",
      outstanding,
    };
  }
  return {
    status: "finalized",
    eligibilityStatus: "eligible",
    paymentStatus: "unpaid",
    outstanding,
  };
}

export function monthBounds(monthIso: string): { startDate: string; endDate: string; label: string } {
  const [y, m] = monthIso.split("-").map(Number);
  const startDate = toISO(y, m, 1);
  const endDate = toISO(y, m, daysInMonth(y, m));
  return { startDate, endDate, label: formatMonthTitle(monthIso) };
}

export function formatMonthTitle(monthIso: string): string {
  const [y, m] = monthIso.split("-").map(Number);
  if (!y || !m) return monthIso;
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function shiftMonthIso(monthIso: string, delta: number): string {
  const [y, m] = monthIso.split("-").map(Number);
  if (!y || !m) return monthIso;
  const idx = y * 12 + (m - 1) + delta;
  return `${Math.floor(idx / 12)}-${pad2((idx % 12) + 1)}`;
}
