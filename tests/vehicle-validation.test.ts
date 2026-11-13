import assert from "node:assert/strict";
import test from "node:test";
import {
  validateIndianVehicleNumber,
  normalizeRegistrationNumber,
  INDIAN_STATE_CODES,
  isValidStateCode,
  isLegacyStateCode,
  STANDARD_TEST_CASES,
} from "@/lib/vehicle-validation";

test("1. Regular Indian Vehicle Registration Numbers (SS DD LL NNNN)", () => {
  const vectors = [
    { input: "UP16AB1234", state: "UP", rto: "16", series: "AB", num: "1234" },
    { input: "DL8CAB1234", state: "DL", rto: "08C", num: "1234" },
    { input: "MH12XY5678", state: "MH", rto: "12", series: "XY", num: "5678" },
    { input: "HR26DE1234", state: "HR", rto: "26", series: "DE", num: "1234" },
    { input: "RJ14CD5678", state: "RJ", rto: "14", series: "CD", num: "5678" },
    { input: "GJ01AB1234", state: "GJ", rto: "01", series: "AB", num: "1234" },
    { input: "KA05MB9999", state: "KA", rto: "05", series: "MB", num: "9999" },
  ];

  for (const v of vectors) {
    const res = validateIndianVehicleNumber(v.input);
    assert.equal(res.status, "VALID", `Expected ${v.input} to be VALID`);
    assert.equal(res.registrationType, "REGULAR", `Expected ${v.input} to be REGULAR`);
    assert.equal(res.stateCode, v.state);
    assert.equal(res.requiresManualReview, false);
    assert.equal(res.errors.length, 0);
  }
});

test("2. Bharat Series (BH Series) Registrations (YY BH NNNN AA)", () => {
  // Valid BH series
  const validBH = ["22BH1234AA", "23BH5678AB", "21BH9999ZZ", "24BH0001A"];
  for (const input of validBH) {
    const res = validateIndianVehicleNumber(input);
    assert.equal(res.status, "VALID", `Expected ${input} to be VALID`);
    assert.equal(res.registrationType, "BH_SERIES", `Expected ${input} to be BH_SERIES`);
    assert.equal(res.metadata?.isBHSeries, true);
    assert.equal(res.errors.length, 0);
  }

  // Invalid BH series test cases from spec
  const invalidBH = [
    { input: "BH1234AA", reason: "Missing 2-digit year prefix" },
    { input: "22BH123AA", reason: "Only 3 digits (requires exactly 4 digits)" },
    { input: "22BH12345AA", reason: "5 digits (requires exactly 4 digits)" },
    { input: "22BH0000AA", reason: "Sequence 0000 is invalid" },
    { input: "19BH1234AA", reason: "Year 19 precedes 2021 inception" },
  ];

  for (const item of invalidBH) {
    const res = validateIndianVehicleNumber(item.input);
    assert.equal(res.status, "INVALID", `Expected ${item.input} to be INVALID (${item.reason})`);
    assert.equal(res.registrationType, "BH_SERIES");
    assert.ok(res.errors.length > 0, `Expected error message for ${item.input}`);
  }
});

test("3. Malformed and Prohibited Character Inputs", () => {
  const malformed = [
    { input: "1234567890", expectedErr: "purely numeric" },
    { input: "UP@16AB1234", expectedErr: "prohibited character" },
    { input: "UP16AB", expectedErr: "incomplete or unrecognized" },
    { input: "UP 16 AB @234", expectedErr: "prohibited character" },
    { input: "ABCD123456", expectedErr: "Could not recognize registration" },
    { input: "", expectedErr: "required" },
    { input: "   ", expectedErr: "required" },
    { input: "DL 01 AB #1234", expectedErr: "prohibited character" },
    { input: "UP16$AB1234", expectedErr: "prohibited character" },
    { input: "MH*12*XY*1234", expectedErr: "prohibited character" },
    { input: "MH12🚀AB1234", expectedErr: "non-ASCII or Unicode" },
  ];

  for (const item of malformed) {
    const res = validateIndianVehicleNumber(item.input);
    assert.equal(res.status, "INVALID", `Expected ${item.input} to be INVALID`);
    assert.ok(res.errors.length > 0, `Expected errors for ${item.input}`);
  }
});

test("4. Legacy & Historical Registrations", () => {
  const legacyCases = [
    { input: "MEC 1234", type: "LEGACY", status: "VALID" },
    { input: "BYH 123", type: "LEGACY", status: "VALID" },
    { input: "DLX 4567", type: "LEGACY", status: "VALID" },
    { input: "GJ01 1234", type: "LEGACY", status: "VALID", state: "GJ" },
    { input: "DL 1234", type: "LEGACY", status: "VALID", state: "DL" },
    { input: "OR14AB1234", type: "LEGACY", status: "VALID", state: "OR" },
    { input: "UA07CD5678", type: "LEGACY", status: "VALID", state: "UA" },
  ];

  for (const item of legacyCases) {
    const res = validateIndianVehicleNumber(item.input);
    assert.equal(res.status, item.status, `Expected ${item.input} to have status ${item.status}`);
    assert.equal(res.registrationType, item.type, `Expected ${item.input} to be ${item.type}`);
    if (item.state) {
      assert.equal(res.stateCode, item.state);
    }
  }
});

test("5. Temporary & Trade Certificate Registrations", () => {
  const tempCases = [
    { input: "MH12TR1234", state: "MH", rto: "12" },
    { input: "DL01TEMP1234", state: "DL", rto: "01" },
    { input: "UP16T1234", state: "UP", rto: "16" },
    { input: "MH12TC1234", state: "MH", rto: "12" },
  ];

  for (const item of tempCases) {
    const res = validateIndianVehicleNumber(item.input);
    assert.equal(res.status, "VALID", `Expected ${item.input} to be VALID`);
    assert.equal(res.registrationType, "TEMPORARY");
    assert.equal(res.stateCode, item.state);
    assert.equal(res.metadata?.isTemporary, true);
    assert.ok(res.warnings.length > 0, "Temporary registrations should advise document review");
  }

  // Non-standard temporary triggers manual review
  const ambiguousTemp = validateIndianVehicleNumber("MH12TRX9999");
  assert.equal(ambiguousTemp.registrationType, "TEMPORARY");
  assert.equal(ambiguousTemp.status, "NEEDS_MANUAL_REVIEW");
  assert.equal(ambiguousTemp.requiresManualReview, true);
});

test("6. Commercial Vehicles Validated Independently of Vehicle Category", () => {
  const commercialCases = [
    { input: "UP16AT1234", category: "Taxi" },
    { input: "DL01L1234", category: "Goods Vehicle" },
    { input: "MH04AB5678", category: "Bus" },
    { input: "GJ01CD9999", category: "Commercial Passenger Vehicle" },
    { input: "KA01E1234", category: "Two Wheeler" },
    { input: "RJ14G1234", category: "Private Car" },
  ];

  for (const item of commercialCases) {
    const res = validateIndianVehicleNumber(item.input, { vehicleCategory: item.category });
    assert.equal(res.status, "VALID");
    assert.equal(res.registrationType, "REGULAR");
    assert.equal(res.metadata?.vehicleCategoryClass, item.category);
  }
});

test("7. Input Normalization & Delimiter Tolerance", () => {
  const variations = [
    { raw: "up 16 ab 1234", expected: "UP16AB1234" },
    { raw: "UP-16-AB-1234", expected: "UP16AB1234" },
    { raw: "Up 16 Ab 1234", expected: "UP16AB1234" },
    { raw: "mh12xy5678", expected: "MH12XY5678" },
    { raw: "22 BH 1234 AA", expected: "22BH1234AA" },
    { raw: "  gj-01.ab/1234  ", expected: "GJ01AB1234" },
  ];

  for (const v of variations) {
    const norm = normalizeRegistrationNumber(v.raw);
    assert.equal(norm.normalized, v.expected);
    assert.equal(norm.isValidCharacters, true);

    const val = validateIndianVehicleNumber(v.raw);
    assert.equal(val.status, "VALID");
    assert.equal(val.normalizedNumber, v.expected);
  }
});

test("8. State Code Directory and RTO Directory Advisory Warnings", () => {
  // Recognized state codes
  assert.equal(isValidStateCode("UP"), true);
  assert.equal(isValidStateCode("DL"), true);
  assert.equal(isValidStateCode("GJ"), true);
  assert.equal(isValidStateCode("TS"), true);
  assert.equal(isValidStateCode("LA"), true);
  assert.equal(isValidStateCode("XX"), false);

  // Renamed / historical codes
  assert.equal(isLegacyStateCode("OR"), true);
  assert.equal(isLegacyStateCode("UA"), true);

  // Known RTO has specific district
  const knownRto = validateIndianVehicleNumber("UP16AB1234");
  assert.equal(knownRto.status, "VALID");
  assert.ok(knownRto.message.includes("Noida") || knownRto.message.includes("Gautam Buddha"));

  // Syntactically valid RTO outside typical range returns advisory warning, NOT rejection
  const highRto = validateIndianVehicleNumber("GJ99AB1234");
  assert.equal(highRto.status, "VALID");
  assert.ok(highRto.warnings.some((w) => w.includes("higher than typical known allocations")));
});

test("9. Fallback & Manual Review for Unrecognized Formats with Valid State Prefix", () => {
  // Starts with valid state "DL" or "MH", but has non-standard atypical structure
  const weirdPlate = validateIndianVehicleNumber("DL9999XYZ1");
  assert.equal(weirdPlate.status, "NEEDS_MANUAL_REVIEW");
  assert.equal(weirdPlate.requiresManualReview, true);
  assert.ok(weirdPlate.message.includes("Manual verification"));
});

test("10. Full Standard Test Cases Suite", () => {
  for (const tc of STANDARD_TEST_CASES) {
    const res = validateIndianVehicleNumber(tc.input, { vehicleCategory: tc.vehicleCategory });
    assert.equal(
      res.status,
      tc.expectedStatus,
      `Failed status for ${tc.input} (${tc.description}): expected ${tc.expectedStatus}, got ${res.status} with msg: ${res.message}`,
    );
    assert.equal(
      res.registrationType,
      tc.expectedType,
      `Failed type for ${tc.input} (${tc.description}): expected ${tc.expectedType}, got ${res.registrationType}`,
    );
    if (tc.expectedState) {
      assert.equal(
        res.stateCode,
        tc.expectedState,
        `Failed state for ${tc.input}: expected ${tc.expectedState}, got ${res.stateCode}`,
      );
    }
  }
});
