/**
 * Offline Indian Vehicle Registration Validation Engine
 * Bharat Series (BH Series) Validator
 *
 * Sourced from Central Motor Vehicles (Twentieth Amendment) Rules, 2021 (G.S.R. 594(E)).
 * Format: YY BH NNNN XX
 * - YY: 2-digit registration year (2021 onwards, i.e., 21 to currentYear+1)
 * - BH: Literal "BH" (Bharat Series)
 * - NNNN: Exactly 4 digits (0001 to 9999)
 * - XX: 1 or 2 letters (usually AA through ZZ)
 */

import type { VehicleValidationResult } from "./types";

// Permissible BH years: Introduced in 2021. Configurable ceiling allows upcoming model-year registrations.
const BH_MIN_YEAR = 21;
const CURRENT_2DIGIT_YEAR = (new Date().getFullYear() % 100);
const BH_MAX_YEAR = CURRENT_2DIGIT_YEAR + 1;

/**
 * Checks whether the normalized string is or purports to be a BH-series registration.
 */
export function looksLikeBHSeries(normalized: string): boolean {
  if (!normalized) return false;
  // Contains BH in position 2 (e.g. "22BH...") or starts with "BH"
  return /^\d{2}BH/i.test(normalized) || /^BH\d+/i.test(normalized);
}

/**
 * Strictly validates a Bharat Series (BH) registration number.
 */
export function validateBHSeries(normalized: string, originalInput: string): VehicleValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check for common malformed pattern: Missing 2-digit year e.g. "BH1234AA"
  if (/^BH/i.test(normalized) && !/^\d{2}BH/i.test(normalized)) {
    return {
      status: "INVALID",
      normalizedNumber: normalized,
      originalInput,
      registrationType: "BH_SERIES",
      message: "Invalid BH Series format: Missing 2-digit registration year prefix (e.g. 22BH1234AA).",
      errors: ["BH Series registration requires a 2-digit year prefix (e.g., 21BH..., 22BH..., 23BH...)."],
      warnings: [],
      requiresManualReview: false,
    };
  }

  // Check strict format: ^(\d{2})BH(\d{4})([A-Z]{1,2})$
  const match = normalized.match(/^(\d{2})BH(\d{1,6})([A-Z]*)$/i);

  if (!match) {
    return {
      status: "INVALID",
      normalizedNumber: normalized,
      originalInput,
      registrationType: "BH_SERIES",
      message: "Malformed Bharat Series (BH) registration format.",
      errors: ["Bharat Series format must strictly follow: YY BH NNNN XX (e.g. 22BH1234AA)."],
      warnings: [],
      requiresManualReview: false,
    };
  }

  const [, yearStr, digitsStr, suffix] = match;
  const yearNum = parseInt(yearStr, 10);

  // 1. Year validation
  if (yearNum < BH_MIN_YEAR || yearNum > BH_MAX_YEAR) {
    errors.push(
      `BH Series registration year "${yearStr}" is invalid. Bharat series began in 2021 (${BH_MIN_YEAR}–${BH_MAX_YEAR}).`,
    );
  }

  // 2. Numeric sequence: MUST BE EXACTLY 4 DIGITS
  if (digitsStr.length !== 4) {
    errors.push(
      `BH Series requires exactly 4 digits. Found ${digitsStr.length} digits ("${digitsStr}"). Expected format: e.g. 22BH1234AA.`,
    );
  } else if (digitsStr === "0000") {
    errors.push("Registration sequence cannot be 0000.");
  }

  // 3. Alphabetic suffix: 1 or 2 letters (AA–ZZ)
  if (!suffix || suffix.length < 1 || suffix.length > 2) {
    errors.push(
      `BH Series requires a 1 or 2 letter alphabetic series suffix (e.g. AA, AB). Found "${suffix}".`,
    );
  }

  if (errors.length > 0) {
    return {
      status: "INVALID",
      normalizedNumber: normalized,
      originalInput,
      registrationType: "BH_SERIES",
      message: errors[0],
      errors,
      warnings,
      requiresManualReview: false,
      metadata: {
        isBHSeries: true,
        bhYear: 2000 + yearNum,
      },
    };
  }

  return {
    status: "VALID",
    normalizedNumber: normalized,
    originalInput,
    registrationType: "BH_SERIES",
    series: suffix.toUpperCase(),
    registrationNumber: digitsStr,
    message: `Valid Bharat Series (BH) registration (Year 20${yearStr}, Series ${suffix.toUpperCase()}).`,
    warnings: [],
    errors: [],
    requiresManualReview: false,
    metadata: {
      isBHSeries: true,
      bhYear: 2000 + yearNum,
    },
  };
}
