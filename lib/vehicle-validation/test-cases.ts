/**
 * Offline Indian Vehicle Registration Validation Engine
 * Standard Test Vectors & Dataset
 *
 * Sourced directly from implementation requirements:
 * - Regular registrations (UP16AB1234, DL8CAB1234, MH12XY5678, HR26DE1234, RJ14CD5678, GJ01AB1234)
 * - BH Series (22BH1234AA, 23BH5678AB, BH1234AA, 22BH123AA, 22BH12345AA)
 * - Malformed inputs (1234567890, UP@16AB1234, UP16AB, UP 16 AB @234, ABCD123456)
 * - Legacy registrations (MEC 1234, BYH 123, DLX 4567, DL 1A 1234, GJ01 1234, OR14AB1234, UA07CD5678)
 * - Temporary registrations (MH12TR1234, DL01TEMP1234, UP16T1234, MH12TC1234)
 * - Commercial vehicle registrations (UP16AT1234, DL01L1234, MH04AB5678 across 2W, 4W, Taxi, Bus, Goods)
 */

import type { VehicleValidationStatus, VehicleRegistrationType } from "./types";

export interface TestCaseVector {
  input: string;
  expectedStatus: VehicleValidationStatus;
  expectedType: VehicleRegistrationType;
  expectedState?: string;
  description: string;
  vehicleCategory?: string;
}

export const STANDARD_TEST_CASES: TestCaseVector[] = [
  // -------------------------------------------------------------------
  // A. Regular Registrations
  // -------------------------------------------------------------------
  {
    input: "UP16AB1234",
    expectedStatus: "VALID",
    expectedType: "REGULAR",
    expectedState: "UP",
    description: "Standard Uttar Pradesh (Noida) two-letter series plate",
  },
  {
    input: "DL8CAB1234",
    expectedStatus: "VALID",
    expectedType: "REGULAR",
    expectedState: "DL",
    description: "Delhi NCT vehicle-class coded plate (RTO 8, Class C - Car, Series AB)",
  },
  {
    input: "MH12XY5678",
    expectedStatus: "VALID",
    expectedType: "REGULAR",
    expectedState: "MH",
    description: "Maharashtra (Pune Central) standard 4-wheeler plate",
  },
  {
    input: "HR26DE1234",
    expectedStatus: "VALID",
    expectedType: "REGULAR",
    expectedState: "HR",
    description: "Haryana (Gurugram North) standard plate",
  },
  {
    input: "RJ14CD5678",
    expectedStatus: "VALID",
    expectedType: "REGULAR",
    expectedState: "RJ",
    description: "Rajasthan (Jaipur South) standard plate",
  },
  {
    input: "GJ01AB1234",
    expectedStatus: "VALID",
    expectedType: "REGULAR",
    expectedState: "GJ",
    description: "Gujarat (Ahmedabad) standard plate",
  },
  {
    input: "KA05MB9999",
    expectedStatus: "VALID",
    expectedType: "REGULAR",
    expectedState: "KA",
    description: "Karnataka (Jayanagar Bengaluru) standard plate",
  },

  // -------------------------------------------------------------------
  // B. Bharat Series (BH Series)
  // -------------------------------------------------------------------
  {
    input: "22BH1234AA",
    expectedStatus: "VALID",
    expectedType: "BH_SERIES",
    description: "Standard valid BH series plate (2022 registration)",
  },
  {
    input: "23BH5678AB",
    expectedStatus: "VALID",
    expectedType: "BH_SERIES",
    description: "Standard valid BH series plate (2023 registration)",
  },
  {
    input: "BH1234AA",
    expectedStatus: "INVALID",
    expectedType: "BH_SERIES",
    description: "Malformed BH series missing 2-digit year prefix",
  },
  {
    input: "22BH123AA",
    expectedStatus: "INVALID",
    expectedType: "BH_SERIES",
    description: "Malformed BH series with only 3 digits (strictly requires 4 digits)",
  },
  {
    input: "22BH12345AA",
    expectedStatus: "INVALID",
    expectedType: "BH_SERIES",
    description: "Malformed BH series with 5 digits (strictly requires 4 digits)",
  },
  {
    input: "22BH0000AA",
    expectedStatus: "INVALID",
    expectedType: "BH_SERIES",
    description: "Malformed BH series with sequence 0000",
  },

  // -------------------------------------------------------------------
  // C. Malformed Inputs
  // -------------------------------------------------------------------
  {
    input: "1234567890",
    expectedStatus: "INVALID",
    expectedType: "UNKNOWN",
    description: "Pure numeric string without state prefix",
  },
  {
    input: "UP@16AB1234",
    expectedStatus: "INVALID",
    expectedType: "UNKNOWN",
    description: "Contains prohibited special character (@)",
  },
  {
    input: "UP16AB",
    expectedStatus: "INVALID",
    expectedType: "UNKNOWN",
    description: "Incomplete registration missing numeric sequence",
  },
  {
    input: "UP 16 AB @234",
    expectedStatus: "INVALID",
    expectedType: "UNKNOWN",
    description: "Spaces with prohibited character (@) in number portion",
  },
  {
    input: "ABCD123456",
    expectedStatus: "INVALID",
    expectedType: "UNKNOWN",
    description: "Unrecognized prefix (AB is not a valid Indian state) and invalid structure",
  },
  {
    input: "",
    expectedStatus: "INVALID",
    expectedType: "UNKNOWN",
    description: "Empty registration input",
  },
  {
    input: "   ",
    expectedStatus: "INVALID",
    expectedType: "UNKNOWN",
    description: "Whitespace-only input",
  },

  // -------------------------------------------------------------------
  // D. Legacy & Historical Registrations
  // -------------------------------------------------------------------
  {
    input: "MEC 1234",
    expectedStatus: "VALID",
    expectedType: "LEGACY",
    description: "Pre-1989 three-letter system (1939 Act)",
  },
  {
    input: "BYH 123",
    expectedStatus: "VALID",
    expectedType: "LEGACY",
    description: "Pre-1989 Bombay historical series",
  },
  {
    input: "DLX 4567",
    expectedStatus: "VALID",
    expectedType: "LEGACY",
    description: "Pre-1989 Delhi historical three-letter plate",
  },
  {
    input: "GJ01 1234",
    expectedStatus: "VALID",
    expectedType: "LEGACY",
    expectedState: "GJ",
    description: "Early post-1989 allocation without series letters",
  },
  {
    input: "DL 1234",
    expectedStatus: "VALID",
    expectedType: "LEGACY",
    expectedState: "DL",
    description: "Early two-letter direct state registration",
  },
  {
    input: "OR14AB1234",
    expectedStatus: "VALID",
    expectedType: "LEGACY",
    expectedState: "OR",
    description: "Historical renamed state prefix (Orissa OR, now Odisha OD)",
  },
  {
    input: "UA07CD5678",
    expectedStatus: "VALID",
    expectedType: "LEGACY",
    expectedState: "UA",
    description: "Historical renamed state prefix (Uttaranchal UA, now Uttarakhand UK)",
  },

  // -------------------------------------------------------------------
  // E. Temporary Registrations
  // -------------------------------------------------------------------
  {
    input: "MH12TR1234",
    expectedStatus: "VALID",
    expectedType: "TEMPORARY",
    expectedState: "MH",
    description: "Standard Maharashtra temporary registration (TR)",
  },
  {
    input: "DL01TEMP1234",
    expectedStatus: "VALID",
    expectedType: "TEMPORARY",
    expectedState: "DL",
    description: "Standard Delhi temporary registration (TEMP)",
  },
  {
    input: "UP16T1234",
    expectedStatus: "VALID",
    expectedType: "TEMPORARY",
    expectedState: "UP",
    description: "Single-letter T transit registration",
  },
  {
    input: "MH12TC1234",
    expectedStatus: "VALID",
    expectedType: "TEMPORARY",
    expectedState: "MH",
    description: "Dealer Trade Certificate mark (TC)",
  },

  // -------------------------------------------------------------------
  // F. Commercial Vehicles (Validated independently of vehicle class)
  // -------------------------------------------------------------------
  {
    input: "UP16AT1234",
    expectedStatus: "VALID",
    expectedType: "REGULAR",
    expectedState: "UP",
    vehicleCategory: "Taxi",
    description: "Commercial Taxi registration (UP16AT)",
  },
  {
    input: "DL01L1234",
    expectedStatus: "VALID",
    expectedType: "REGULAR",
    expectedState: "DL",
    vehicleCategory: "Goods Vehicle",
    description: "Commercial Goods vehicle registration (DL01L)",
  },
  {
    input: "MH04AB5678",
    expectedStatus: "VALID",
    expectedType: "REGULAR",
    expectedState: "MH",
    vehicleCategory: "Bus",
    description: "Commercial Bus registration (MH04AB)",
  },

  // -------------------------------------------------------------------
  // G. Normalization: Spaces, Hyphens, Lowercase
  // -------------------------------------------------------------------
  {
    input: "up 16 ab 1234",
    expectedStatus: "VALID",
    expectedType: "REGULAR",
    expectedState: "UP",
    description: "Lowercase input with multiple spaces",
  },
  {
    input: "UP-16-AB-1234",
    expectedStatus: "VALID",
    expectedType: "REGULAR",
    expectedState: "UP",
    description: "Hyphenated input",
  },
  {
    input: "22 BH 1234 AA",
    expectedStatus: "VALID",
    expectedType: "BH_SERIES",
    description: "BH Series with spaces",
  },
  {
    input: "dl-8c-ab-1234",
    expectedStatus: "VALID",
    expectedType: "REGULAR",
    expectedState: "DL",
    description: "Delhi format lowercase with hyphens",
  },
];
