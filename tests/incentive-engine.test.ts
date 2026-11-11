import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  DEFAULT_SLABS_2W,
  calculateDayClaimRewards,
  computeProRatedTarget,
  deriveSettlementStatus,
  findActiveAssignment,
  isWorkingDate,
  resolveCustomerLocation,
  resolveMatchingRule,
  shiftToNextWorkingDay,
  type AgentAssignmentRecord,
  type IncentiveRule,
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
