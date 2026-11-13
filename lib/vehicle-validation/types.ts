/**
 * Offline Indian Vehicle Registration Validation Engine
 * Type Definitions & Interfaces
 *
 * Fully offline, static validation types covering:
 * - Regular State-based Registrations (SS DD LL NNNN)
 * - Bharat Series (BH Series: YY BH NNNN AA)
 * - Temporary Registrations (TR / TEMP / TC)
 * - Old & Legacy Formats (Pre-1989 / Shorter Series)
 * - Commercial & Transport Classes
 */

export type VehicleValidationStatus =
  | "VALID"
  | "INVALID"
  | "NEEDS_MANUAL_REVIEW";

export type VehicleRegistrationType =
  | "REGULAR"
  | "BH_SERIES"
  | "TEMPORARY"
  | "LEGACY"
  | "UNKNOWN";

export type VehicleCategoryClass =
  | "Two Wheeler"
  | "Private Car"
  | "Taxi"
  | "Commercial Passenger Vehicle"
  | "Goods Vehicle"
  | "Bus"
  | "Heavy Commercial Vehicle"
  | "Other";

export interface VehicleValidationOptions {
  /** Optional vehicle category passed from form (2W, 4W, CW, CV or descriptive) */
  vehicleCategory?: string;
  /** Optional expected registration type override */
  registrationType?: VehicleRegistrationType;
  /** Whether to allow submission when manual review is required (default: true) */
  allowManualReview?: boolean;
}

export interface StateCodeEntry {
  code: string;
  name: string;
  type: "STATE" | "UT" | "LEGACY";
  canonicalCode?: string; // For renamed codes (e.g. OR -> OD, UA -> UK)
  effectiveFromYear?: number;
  deprecatedYear?: number;
  aliases?: string[];
  notes?: string;
}

export interface RTORuleEntry {
  stateCode: string;
  rtoCode: string; // e.g. "01", "16", "8C"
  districtOrOffice?: string;
  specialSeriesPrefixes?: string[]; // e.g. Delhi DL has "1C", "2S", etc.
}

export interface VehicleValidationResult {
  /** Overall validation outcome */
  status: VehicleValidationStatus;
  /** Canonical normalized registration number without spaces/hyphens */
  normalizedNumber: string;
  /** Raw unformatted input string */
  originalInput: string;
  /** Detected registration format type */
  registrationType: VehicleRegistrationType;
  /** 2-letter State/UT prefix (if applicable) */
  stateCode?: string;
  /** Full State/UT name (if identified) */
  stateName?: string;
  /** Numeric or alphanumeric RTO code (if identified) */
  rtoCode?: string;
  /** Alphabetic series (e.g. "AB", "C", "AA") */
  series?: string;
  /** Numeric registration sequence (e.g. "1234") */
  registrationNumber?: string;
  /** Primary user-facing summary message */
  message: string;
  /** Non-blocking observations or RTO directory advisories */
  warnings: string[];
  /** Blocking format or character violation errors */
  errors: string[];
  /** Whether an admin needs to inspect physical RC documents */
  requiresManualReview: boolean;
  /** Granular diagnostic flags */
  metadata?: {
    isBHSeries?: boolean;
    bhYear?: number;
    isTemporary?: boolean;
    isLegacy?: boolean;
    isStateRecognized?: boolean;
    isRTORecognized?: boolean;
    historicalStateCode?: boolean;
    vehicleCategoryClass?: string;
  };
}
