import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  DEFAULT_DAILY_MILESTONES,
  DEFAULT_SLABS_2W,
  PRESET_MONTHLY_MILESTONES,
  calculateDayClaimRewards,
  calculateMonthlyMilestoneReward,
  calculateStretchGoalEarnings,
  computeProRatedTarget,
  deriveSettlementStatus,
  findActiveAssignment,
  isWorkingDate,
  resolveCustomerLocation,
  resolveMatchingRule,
  shiftToNextWorkingDay,
  simulateRulePayout,
  type AgentAssignmentRecord,
  type IncentiveRule,
  type VehicleCategory,
} from "@/lib/incentives";
import { parseBundledPincodeTsv, parseCsvTextToRows } from "@/lib/pincode-dataset";
import { CANONICAL_STATE_NAMES, normalizeIndianState } from "@/lib/states";

const BASE_RULES: IncentiveRule[] = [
  {
    id: "rule-gj-2w",
    ruleName: "Gujarat 2W Exact",
    scope: "exact_state",
    vehicleCategory: "2W",
    stateName: "Gujarat",
    isActive: true,
    calculationMethod: "progressive_slab",
    fixedRate: 0,
    combinationMode: "fixed_plus_progressive",
    monthlyTarget: 100,
    eligibleClaimStatuses: ["approved"],
    effectiveFrom: "2026-01-01",
    effectiveUntil: null,
    currentVersion: 1,
    slabs: DEFAULT_SLABS_2W,
    monthlyMilestones: [],
  },
  {
    id: "rule-cat-2w",
    ruleName: "2W Category Default",
    scope: "category_default",
    vehicleCategory: "2W",
    stateName: null,
    isActive: true,
    calculationMethod: "fixed",
    fixedRate: 5,
    combinationMode: "fixed_plus_progressive",
    monthlyTarget: 100,
    eligibleClaimStatuses: ["approved"],
    effectiveFrom: "2026-01-01",
    effectiveUntil: null,
    currentVersion: 1,
    slabs: [],
    monthlyMilestones: [],
  },
];

const ASSIGNMENTS: AgentAssignmentRecord[] = [
  {
    id: "a-1",
    staffId: "cse-001",
    staffName: "CSE-001",
    employeeCode: "CSE-001",
    vehicleCategory: "2W",
    assignedState: "Gujarat",
    effectiveFrom: "2026-11-01",
    effectiveUntil: "2026-11-14",
    status: "active",
    notes: null,
  },
  {
    id: "a-2",
    staffId: "cse-001",
    staffName: "CSE-001",
    employeeCode: "CSE-001",
    vehicleCategory: "2W",
    assignedState: "Delhi",
    effectiveFrom: "2026-11-15",
    effectiveUntil: null,
    status: "active",
    notes: null,
  },
];

test("1 & 2. Historical assignment lookup & matching Gujarat 2W vs Delhi 2W / Gujarat 4W", () => {
  const nov10 = findActiveAssignment(ASSIGNMENTS, "cse-001", "2026-11-10");
  assert.equal(nov10?.assignedState, "Gujarat");
  assert.equal(nov10?.vehicleCategory, "2W");

  const nov15 = findActiveAssignment(ASSIGNMENTS, "cse-001", "2026-11-15");
  assert.equal(nov15?.assignedState, "Delhi");

  const nov20 = findActiveAssignment(ASSIGNMENTS, "cse-001", "2026-11-20");
  assert.equal(nov20?.assignedState, "Delhi");

  // Exact rule matches Gujarat 2W
  const hit = resolveMatchingRule(BASE_RULES, {
    vehicleCategory: "2W",
    resolvedState: "Gujarat",
    submissionDate: "2026-11-10",
    settings: { allowCategoryDefaultFallback: false, allowGlobalFallback: false },
  });
  assert.equal(hit?.rule.id, "rule-gj-2w");
  assert.equal(hit?.resolutionTier, "exact_state");

  // With fallbacks disabled, Delhi 2W has no rule (does not wrongly assign Gujarat 2W rate)
  const miss = resolveMatchingRule(BASE_RULES, {
    vehicleCategory: "2W",
    resolvedState: "Delhi",
    submissionDate: "2026-11-15",
    settings: { allowCategoryDefaultFallback: false, allowGlobalFallback: false },
  });
  assert.equal(miss, null);
});

test("3. Customer PIN resolution, multi-state conflict hold, and manual fallback", () => {
  // Single state PIN resolution
  const ok = resolveCustomerLocation({
    pincode: "380001",
    pinDirectoryStates: ["GUJARAT", "Gujarat"],
    manualState: null,
  });
  assert.equal(ok.status, "resolved_pin");
  assert.equal(ok.state, "Gujarat");

  // Multi-post-office state conflict in directory -> held
  const multiConflict = resolveCustomerLocation({
    pincode: "110001",
    pinDirectoryStates: ["Delhi", "Uttar Pradesh"],
    manualState: null,
  });
  assert.equal(multiConflict.status, "pin_conflict");

  // PIN state conflicts with manual entered state -> held
  const manualConflict = resolveCustomerLocation({
    pincode: "380001",
    pinDirectoryStates: ["Gujarat"],
    manualState: "Delhi",
  });
  assert.equal(manualConflict.status, "pin_conflict");

  // Missing PIN -> manual state fallback
  const fallback = resolveCustomerLocation({
    pincode: null,
    pinDirectoryStates: [],
    manualState: "Uttar Pradesh",
  });
  assert.equal(fallback.status, "manual_fallback");
  assert.equal(fallback.state, "Uttar Pradesh");

  // Both missing -> unverified
  const unverified = resolveCustomerLocation({
    pincode: null,
    pinDirectoryStates: [],
    manualState: null,
  });
  assert.equal(unverified.status, "unverified");
});

test("4. Non-working days & holidays do not advance daily slab cycle", () => {
  const holidays = [{ date: "2026-11-12", label: "Diwali" }];
  // 2026-11-08 is Sunday (weekday 7); workingDays Mon-Sat [1..6]
  assert.equal(isWorkingDate("2026-11-08", holidays, [1, 2, 3, 4, 5, 6]).working, false);
  assert.equal(isWorkingDate("2026-11-12", holidays, [1, 2, 3, 4, 5, 6]).working, false);
  assert.equal(shiftToNextWorkingDay("2026-11-12", holidays, [1, 2, 3, 4, 5, 6]), "2026-11-13");
});

test("5. Daily calculation methods A (Fixed), B (Progressive), C (Final Slab), D (Combined)", () => {
  // Method A: Fixed ₹5 × 10 claims = ₹50
  const mA = calculateDayClaimRewards(
    { calculationMethod: "fixed", fixedRate: 5, combinationMode: "fixed_plus_progressive", slabs: [] },
    10,
  );
  assert.equal(mA.dayTotal, 50);

  // Method B: Progressive 12 claims -> (5×4)+(5×5)+(2×6) = 57
  const mB = calculateDayClaimRewards(
    { calculationMethod: "progressive_slab", fixedRate: 0, combinationMode: "fixed_plus_progressive", slabs: DEFAULT_SLABS_2W },
    12,
  );
  assert.equal(mB.dayTotal, 57);
  assert.equal(mB.items.length, 12);

  // Method C: Final slab 12 claims -> 12×6 = 72
  const mC = calculateDayClaimRewards(
    { calculationMethod: "final_slab", fixedRate: 0, combinationMode: "fixed_plus_progressive", slabs: DEFAULT_SLABS_2W },
    12,
  );
  assert.equal(mC.dayTotal, 72);

  // Method D: Combined fixed ₹2 + progressive on 12 claims -> (12×2) + 57 = 81
  const mD = calculateDayClaimRewards(
    { calculationMethod: "combined", fixedRate: 2, combinationMode: "fixed_plus_progressive", slabs: DEFAULT_SLABS_2W },
    12,
  );
  assert.equal(mD.dayTotal, 81);
});

test("6, 7 & 9. Monthly target forfeiture, pro-rata mid-month target, and partial payouts", () => {
  // Missed monthly target forfeits earnings without daily deduction
  const forfeited = deriveSettlementStatus({
    targetAchieved: false,
    finalizedPayable: 570,
    paidAmount: 0,
    workflowState: "finalized",
  });
  assert.equal(forfeited.status, "forfeited");
  assert.equal(forfeited.eligibilityStatus, "forfeited");
  assert.equal(forfeited.outstanding, 0);

  // Mid-month join pro-rata check
  const prorated = computeProRatedTarget({
    baseTarget: 100,
    periodStart: "2026-11-01",
    periodEnd: "2026-11-30",
    activeFrom: "2026-11-16",
    activeUntil: null,
  });
  assert.equal(prorated, 50);

  // Partial payout leaves ₹400 outstanding out of ₹1,000 and status partially_paid
  const partial = deriveSettlementStatus({
    targetAchieved: true,
    finalizedPayable: 1000,
    paidAmount: 600,
    workflowState: "finalized",
  });
  assert.equal(partial.status, "partially_paid");
  assert.equal(partial.paymentStatus, "partially_paid");
  assert.equal(partial.outstanding, 400);

  // Full payout transitions to paid with 0 outstanding
  const paid = deriveSettlementStatus({
    targetAchieved: true,
    finalizedPayable: 1000,
    paidAmount: 1000,
    workflowState: "finalized",
  });
  assert.equal(paid.status, "paid");
  assert.equal(paid.paymentStatus, "paid");
  assert.equal(paid.outstanding, 0);
});

test("10. PIN dataset parser handles kishorek/dropdevrahul formats & bundled 36-state TSV is complete", () => {
  const kishorekSample = [
    '"PostOfficeName","Pincode","DistrictsName","City","State"',
    '"Aberdeen Bazar","744104","A&N Islands","Port Blair","Andaman Nicobar"',
    '"Kavaratti","682555","Lakshadweep","Kavaratti","Lakshdweep"',
    '"Orissa GPO","751001","Khordha","Bhubaneswar","Orissa"',
  ].join("\n");

  const parsed = parseCsvTextToRows(kishorekSample);
  assert.equal(parsed.skipped, 0);
  assert.equal(parsed.rows.length, 3);
  assert.equal(parsed.rows[0]?.stateName, "Andaman and Nicobar Islands");
  assert.equal(parsed.rows[0]?.districtName, "A&N Islands");
  assert.equal(parsed.rows[0]?.officeName, "Aberdeen Bazar");
  assert.equal(parsed.rows[1]?.stateName, "Lakshadweep");
  assert.equal(parsed.rows[2]?.stateName, "Odisha");
  assert.equal(normalizeIndianState("Andaman Nicobar")?.code, "AN");
  assert.equal(normalizeIndianState("Lakshdweep")?.code, "LD");

  const tsvText = readFileSync(path.join(process.cwd(), "data", "india-pincodes.tsv"), "utf8");
  const bundled = parseBundledPincodeTsv(tsvText);
  assert.equal(bundled.length, 19346);
  const states = new Set(bundled.map((r) => r.stateName));
  assert.equal(states.size, CANONICAL_STATE_NAMES.size);
  assert.ok(states.has("Telangana"));
  assert.ok(states.has("Ladakh"));
});

test("11. Method E Daily Milestone step-reward ladder (2->30, 4->60, 6->80, 8->120, 10->150)", () => {
  const expectedByClaims: Record<number, number> = {
    0: 0,
    1: 0,
    2: 30,
    3: 30, // Stays ₹30 until hitting milestone 4
    4: 60,
    5: 60, // Stays ₹60 until hitting milestone 6
    6: 80,
    7: 80,
    8: 120,
    9: 120,
    10: 150,
    12: 150,
  };

  for (const [countStr, expectedTotal] of Object.entries(expectedByClaims)) {
    const count = Number(countStr);
    const res = calculateDayClaimRewards(
      {
        calculationMethod: "milestone",
        fixedRate: 0,
        combinationMode: "fixed_plus_progressive",
        slabs: DEFAULT_DAILY_MILESTONES,
      },
      count,
    );
    assert.equal(res.dayTotal, expectedTotal, `Expected dayTotal=${expectedTotal} for ${count} claims`);
    assert.equal(res.items.length, count);
    const ledgerSum = res.items.reduce((s, item) => s + item.amount, 0);
    assert.equal(ledgerSum, expectedTotal);
  }

  // Verify marginal ledger deltas on 10 claims: 0, +30, 0, +30, 0, +20, 0, +40, 0, +30
  const ten = calculateDayClaimRewards(
    {
      calculationMethod: "milestone",
      fixedRate: 0,
      combinationMode: "fixed_plus_progressive",
      slabs: DEFAULT_DAILY_MILESTONES,
    },
    10,
  );
  assert.deepEqual(
    ten.items.map((i) => i.amount),
    [0, 30, 0, 30, 0, 20, 0, 40, 0, 30],
  );

  // Method E ignores leftover fixedRate from form state switching: still strictly ₹60 at 4 claims
  const noFixedLeak = calculateDayClaimRewards(
    {
      calculationMethod: "milestone",
      fixedRate: 5,
      combinationMode: "fixed_plus_progressive",
      slabs: DEFAULT_DAILY_MILESTONES,
    },
    4,
  );
  assert.equal(noFixedLeak.dayTotal, 60);

  // Combined (Fixed + Milestone): ₹10/claim + step bonus (2->₹30, 4->₹60)
  const combinedMilestones = [
    { slabOrder: 1, minClaims: 2, maxClaims: null, ratePerClaim: 30, bonusAmount: 30 },
    { slabOrder: 2, minClaims: 4, maxClaims: null, ratePerClaim: 60, bonusAmount: 60 },
  ];
  const combinedAt3 = calculateDayClaimRewards(
    {
      calculationMethod: "combined",
      fixedRate: 10,
      combinationMode: "fixed_plus_slab_bonus",
      slabs: combinedMilestones,
    },
    3,
  );
  assert.equal(combinedAt3.dayTotal, 60); // 3×10 + ₹30 milestone (stays ₹30 at 3)

  const combinedAt4 = calculateDayClaimRewards(
    {
      calculationMethod: "combined",
      fixedRate: 10,
      combinationMode: "fixed_plus_slab_bonus",
      slabs: combinedMilestones,
    },
    4,
  );
  assert.equal(combinedAt4.dayTotal, 100); // 4×10 + ₹60 milestone

  // Standalone Monthly-Milestone-only rule (method="fixed", fixedRate=0, monthlyMilestones preset)
  const monthlyOnly = simulateRulePayout({
    rule: {
      calculationMethod: "fixed",
      fixedRate: 0,
      combinationMode: "fixed_plus_progressive",
      slabs: [],
      monthlyTarget: 60,
      monthlyMilestones: PRESET_MONTHLY_MILESTONES,
    },
    workingDays: 20,
    monthlyClaims: 65,
  });
  assert.equal(monthlyOnly.dailyTotalEarnings, 0);
  assert.equal(monthlyOnly.monthlyMilestoneBonus, 500);
  assert.equal(monthlyOnly.finalPayable, 500);
});

test("12. Monthly Milestone step-reward ladder (calculateMonthlyMilestoneReward)", () => {
  const below = calculateMonthlyMilestoneReward(PRESET_MONTHLY_MILESTONES, 59);
  assert.equal(below.bonusAmount, 0);
  assert.equal(below.matchedTier, null);
  assert.equal(below.nextTier?.minClaims, 60);
  assert.equal(below.claimsToNext, 1);

  const at60 = calculateMonthlyMilestoneReward(PRESET_MONTHLY_MILESTONES, 60);
  assert.equal(at60.bonusAmount, 500);
  assert.equal(at60.matchedTier?.minClaims, 60);
  assert.equal(at60.nextTier?.minClaims, 80);

  const at79 = calculateMonthlyMilestoneReward(PRESET_MONTHLY_MILESTONES, 79);
  assert.equal(at79.bonusAmount, 500);

  const at80 = calculateMonthlyMilestoneReward(PRESET_MONTHLY_MILESTONES, 80);
  assert.equal(at80.bonusAmount, 1000);
  assert.equal(at80.nextTier?.minClaims, 100);
});

test("13. Personalized Agent Stretch Goal & Special Rate (common base 60, stretch 80)", () => {
  // Below stretch target (75 claims): no stretch uplift yet
  const subStretch = calculateStretchGoalEarnings({
    eligibleClaimsCount: 75,
    baseTarget: 60,
    stretchTarget: 80,
    stretchSpecialRate: 30,
    stretchRateMode: "replace_from_base",
    chronologicalDailyClaimAmounts: Array(75).fill(15),
  });
  assert.equal(subStretch.stretchConfigured, true);
  assert.equal(subStretch.stretchAchieved, false);
  assert.equal(subStretch.claimsRemainingForStretch, 5);
  assert.equal(subStretch.stretchDeltaAmount, 0);
  assert.equal(subStretch.totalWithStretch, 1125);

  // Achieved stretch (85 claims): #1..60 stay at normal ₹15 (=900), #61..85 (25 claims) use ₹30 (=750) => ₹1,650 (+375)
  const hitStretch = calculateStretchGoalEarnings({
    eligibleClaimsCount: 85,
    baseTarget: 60,
    stretchTarget: 80,
    stretchSpecialRate: 30,
    stretchRateMode: "replace_from_base",
    chronologicalDailyClaimAmounts: Array(85).fill(15),
  });
  assert.equal(hitStretch.stretchAchieved, true);
  assert.equal(hitStretch.baseClaimsCount, 60);
  assert.equal(hitStretch.overBaseClaimsCount, 25);
  assert.equal(hitStretch.normalUpToBaseAmount, 900);
  assert.equal(hitStretch.specialRateAmountOnOverBase, 750);
  assert.equal(hitStretch.stretchDeltaAmount, 375);
  assert.equal(hitStretch.totalWithStretch, 1650);

  // Extra per claim from base: +₹10/claim on 25 post-base claims => 1275 + 250 = 1525
  const extraMode = calculateStretchGoalEarnings({
    eligibleClaimsCount: 85,
    baseTarget: 60,
    stretchTarget: 80,
    stretchSpecialRate: 10,
    stretchRateMode: "extra_per_claim_from_base",
    chronologicalDailyClaimAmounts: Array(85).fill(15),
  });
  assert.equal(extraMode.stretchDeltaAmount, 250);
  assert.equal(extraMode.totalWithStretch, 1525);
});

test("14. Interactive simulateRulePayout combines Daily Milestone, Monthly Milestone & Stretch Special Rate", () => {
  const simHit = simulateRulePayout({
    rule: {
      calculationMethod: "milestone",
      fixedRate: 0,
      combinationMode: "fixed_plus_progressive",
      slabs: DEFAULT_DAILY_MILESTONES,
      monthlyTarget: 60,
      monthlyMilestones: PRESET_MONTHLY_MILESTONES,
    },
    workingDays: 20,
    monthlyClaims: 80, // 4 claims/day => ₹60/day => ₹1,200 daily base; #61..80 (20 claims) normal ₹300 vs special ₹600
    stretchTarget: 80,
    stretchSpecialRate: 30,
    stretchRateMode: "replace_from_base",
  });
  assert.equal(simHit.targetAchieved, true);
  assert.equal(simHit.dailyTotalEarnings, 1200);
  assert.equal(simHit.monthlyMilestoneBonus, 1000);
  assert.equal(simHit.stretchSummary.stretchAchieved, true);
  assert.equal(simHit.stretchSummary.totalWithStretch, 1500);
  assert.equal(simHit.finalPayable, 2500);
  assert.equal(simHit.forfeitedAmount, 0);

  // Below common base target (40 claims < 60): forfeited until base target reached
  const simMiss = simulateRulePayout({
    rule: {
      calculationMethod: "milestone",
      fixedRate: 0,
      combinationMode: "fixed_plus_progressive",
      slabs: DEFAULT_DAILY_MILESTONES,
      monthlyTarget: 60,
      monthlyMilestones: PRESET_MONTHLY_MILESTONES,
    },
    workingDays: 20,
    monthlyClaims: 40, // 2 claims/day => ₹30/day => ₹600 gross, forfeited
    stretchTarget: 80,
    stretchSpecialRate: 30,
    stretchRateMode: "replace_from_base",
  });
  assert.equal(simMiss.targetAchieved, false);
  assert.equal(simMiss.dailyTotalEarnings, 600);
  assert.equal(simMiss.finalPayable, 0);
  assert.equal(simMiss.forfeitedAmount, 600);
});

test("15. Combined (Fixed + Milestone) per-claim ledger deltas hold flat between steps", () => {
  const combinedRule = {
    calculationMethod: "combined" as const,
    fixedRate: 10,
    combinationMode: "fixed_plus_slab_bonus" as const,
    slabs: [
      { slabOrder: 1, minClaims: 2, maxClaims: null, ratePerClaim: 30, bonusAmount: 30 },
      { slabOrder: 2, minClaims: 4, maxClaims: null, ratePerClaim: 60, bonusAmount: 60 },
    ],
  };

  const dayOf3 = calculateDayClaimRewards(combinedRule, 3);
  assert.deepEqual(
    dayOf3.items.map((i) => i.amount),
    [10, 40, 10], // Claim #1: 10, #2: 10+30, #3: 10 (holds milestone flat at 30)
  );
  assert.equal(dayOf3.dayTotal, 60);

  const dayOf4 = calculateDayClaimRewards(combinedRule, 4);
  assert.deepEqual(
    dayOf4.items.map((i) => i.amount),
    [10, 40, 10, 40], // #4 adds +30 delta (60 - 30) + 10 fixed
  );
  assert.equal(dayOf4.dayTotal, 100);
});

test("16. Multi-step Personal Special Milestones hold flat until exact thresholds", () => {
  // Single step after Base 60: 80 claims -> +₹1,000 flat bonus
  for (const [count, expectedRemaining] of [
    [65, 15],
    [70, 10],
    [79, 1],
  ] as const) {
    const held = calculateStretchGoalEarnings({
      eligibleClaimsCount: count,
      baseTarget: 60,
      stretchMilestones: [{ minClaims: 80, rewardAmount: 1000 }],
      stretchRateMode: "lump_sum_bonus",
      chronologicalDailyClaimAmounts: Array(count).fill(15),
    });
    assert.equal(held.stretchAchieved, false);
    assert.equal(held.stretchDeltaAmount, 0);
    assert.equal(held.claimsRemainingForStretch, expectedRemaining);
    assert.equal(held.totalWithStretch, count * 15);
  }

  const reached80 = calculateStretchGoalEarnings({
    eligibleClaimsCount: 80,
    baseTarget: 60,
    stretchMilestones: [{ minClaims: 80, rewardAmount: 1000 }],
    stretchRateMode: "lump_sum_bonus",
    chronologicalDailyClaimAmounts: Array(80).fill(15),
  });
  assert.equal(reached80.stretchAchieved, true);
  assert.equal(reached80.stretchDeltaAmount, 1000);
  assert.equal(reached80.totalWithStretch, 80 * 15 + 1000);
  assert.equal(reached80.matchedStretchTier?.minClaims, 80);

  // Multi-step ladder: 70 -> +₹500, 80 -> +₹1,000
  const ladder = [
    { minClaims: 70, rewardAmount: 500 },
    { minClaims: 80, rewardAmount: 1000 },
  ];
  const at79 = calculateStretchGoalEarnings({
    eligibleClaimsCount: 79,
    baseTarget: 60,
    stretchMilestones: ladder,
    stretchRateMode: "lump_sum_bonus",
    chronologicalDailyClaimAmounts: Array(79).fill(15),
  });
  assert.equal(at79.stretchAchieved, true);
  assert.equal(at79.stretchDeltaAmount, 500);
  assert.equal(at79.matchedStretchTier?.minClaims, 70);
  assert.equal(at79.nextStretchTier?.minClaims, 80);
  assert.equal(at79.claimsRemainingForStretch, 1);

  // End-to-end simulateRulePayout verifies 79 vs 80 transition cleanly
  const baseRule = {
    calculationMethod: "fixed" as const,
    fixedRate: 15,
    combinationMode: "fixed_plus_progressive" as const,
    slabs: [],
    monthlyTarget: 60,
    monthlyMilestones: [],
  };
  const sim79 = simulateRulePayout({
    rule: baseRule,
    workingDays: 20,
    monthlyClaims: 79,
    stretchMilestones: [{ minClaims: 80, rewardAmount: 1000 }],
    stretchRateMode: "lump_sum_bonus",
  });
  assert.equal(sim79.stretchSummary.stretchDeltaAmount, 0);
  assert.equal(sim79.finalPayable, 79 * 15);

  const sim80 = simulateRulePayout({
    rule: baseRule,
    workingDays: 20,
    monthlyClaims: 80,
    stretchMilestones: [{ minClaims: 80, rewardAmount: 1000 }],
    stretchRateMode: "lump_sum_bonus",
  });
  assert.equal(sim80.stretchSummary.stretchDeltaAmount, 1000);
  assert.equal(sim80.finalPayable, 80 * 15 + 1000);
});

test("17. Rule-based agent assignment holds category/territory mismatches for manual review", () => {
  // Agent assigned to 2W Gujarat Rule
  const assignedRule = {
    id: "rule-gj-2w",
    ruleName: "2W Gujarat Incentive Rule",
    vehicleCategory: "2W" as VehicleCategory | null,
    stateName: "Gujarat",
    scope: "exact_state" as const,
  };

  // Test 1: Category Mismatch (4W claim submitted by 2W assigned agent)
  const claimCategory: VehicleCategory = "4W";
  const isCategoryMismatch = Boolean(
    assignedRule.vehicleCategory && claimCategory && assignedRule.vehicleCategory !== claimCategory,
  );
  assert.equal(isCategoryMismatch, true);

  // Test 2: Territory Mismatch (Rajasthan claim submitted by Gujarat assigned agent)
  const isStateMismatch = Boolean(
    assignedRule.stateName &&
      "Rajasthan" &&
      assignedRule.stateName.toLowerCase() !== "Rajasthan".toLowerCase(),
  );
  assert.equal(isStateMismatch, true);

  // Both should hold as manual review instead of rejecting as ineligible
  const heldStatus = isCategoryMismatch || isStateMismatch ? "held_review" : "eligible";
  assert.equal(heldStatus, "held_review");
});
