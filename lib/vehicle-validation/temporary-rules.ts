/**
 * Offline Indian Vehicle Registration Validation Engine
 * Temporary Registration (TR / TEMP / TC) Validator
 *
 * Handles pre-delivery temporary registrations, transit permits, and dealer trade certificates.
 * If a temporary number exhibits an unrecognized or ambiguous structure, it conservatively
 * returns NEEDS_MANUAL_REVIEW so agents can proceed while queueing the claim for admin RC verification.
 */

import { isValidStateCode, getStateInfo } from "./state-codes";
import type { VehicleValidationResult } from "./types";

export interface TemporaryPatternConfig {
  id: string;
  name: string;
  pattern: RegExp;
  description: string;
}

/**
 * Configurable repository of recognized Indian temporary registration patterns.
 * New regional temporary conventions can be appended here without modifying core validation logic.
 */
export const CONFIGURED_TEMPORARY_PATTERNS: TemporaryPatternConfig[] = [
  {
    id: "STATE_RTO_TR",
    name: "State RTO TR Series",
    // e.g. MH12TR1234, UP16TR5678, KA05TR0001A
    pattern: /^([A-Z]{2})(\d{1,2})TR(\d{1,4})([A-Z]{0,2})$/i,
    description: "Standard state/RTO temporary registration (e.g. MH12TR1234).",
  },
  {
    id: "STATE_RTO_TEMP",
    name: "State RTO TEMP Prefix",
    // e.g. DL01TEMP1234, HR26TEMP9999
    pattern: /^([A-Z]{2})(\d{1,2})TEMP(\d{1,4})([A-Z]{0,2})$/i,
    description: "State/RTO explicit TEMP series (e.g. DL01TEMP1234).",
  },
  {
    id: "STATE_RTO_T_SERIES",
    name: "State Single-T Series",
    // e.g. UP16T1234, MH02T5678 (where T stands for Temporary/Transit)
    pattern: /^([A-Z]{2})(\d{1,2})T(\d{1,4})$/i,
    description: "State single-letter T transit registration (e.g. UP16T1234).",
  },
  {
    id: "STATE_RTO_TC",
    name: "Trade Certificate Series (TC)",
    // e.g. MH12TC1234, GJ01TC567
    pattern: /^([A-Z]{2})(\d{1,2})TC(\d{1,4})([A-Z]{0,2})$/i,
    description: "Dealer Trade Certificate / Transit Mark (e.g. MH12TC1234).",
  },
  {
    id: "PREFIX_TR_STATE",
    name: "Prefix TR / TEMP Series",
    // e.g. TRUP161234, TEMPMH021234
    pattern: /^(TR|TEMP)([A-Z]{2})(\d{1,2})(\d{1,4})([A-Z]{0,2})$/i,
    description: "Prefixed temporary designation (e.g. TR-UP16-1234).",
  },
];

/**
 * Checks if the normalized string appears to be a temporary or trade certificate number.
 */
export function looksLikeTemporaryRegistration(normalized: string): boolean {
  if (!normalized) return false;
  // Contains distinct temporary indicators
  return (
    /^[A-Z]{2}\d{1,2}(TR|TEMP|TC)/i.test(normalized) ||
    /^(TR|TEMP)[A-Z]{2}/i.test(normalized) ||
    /^[A-Z]{2}\d{1,2}T\d{4}$/i.test(normalized)
  );
}

/**
 * Validates temporary vehicle registration numbers.
 */
export function validateTemporaryRegistration(
  normalized: string,
  originalInput: string,
): VehicleValidationResult {
  const warnings: string[] = [];

  // Evaluate against configured patterns
  for (const config of CONFIGURED_TEMPORARY_PATTERNS) {
    const match = normalized.match(config.pattern);
    if (match) {
      // Extract state code depending on pattern structure
      let stateCode = "";
      let rtoCode = "";
      let regNumber = "";

      if (config.id === "PREFIX_TR_STATE") {
        stateCode = match[2].toUpperCase();
        rtoCode = match[3];
        regNumber = match[4];
      } else {
        stateCode = match[1].toUpperCase();
        rtoCode = match[2];
        regNumber = match[3];
      }

      if (!isValidStateCode(stateCode)) {
        return {
          status: "INVALID",
          normalizedNumber: normalized,
          originalInput,
          registrationType: "TEMPORARY",
          message: `Temporary registration contains invalid state code "${stateCode}".`,
          errors: [`State prefix "${stateCode}" is not recognized in the Indian States/UT registry.`],
          warnings: [],
          requiresManualReview: false,
        };
      }

      const stateInfo = getStateInfo(stateCode);
      const stateName = stateInfo?.name || stateCode;

      warnings.push("Temporary registration detected. Please inspect RC / tax invoice for valid expiry date.");

      return {
        status: "VALID",
        normalizedNumber: normalized,
        originalInput,
        registrationType: "TEMPORARY",
        stateCode,
        stateName,
        rtoCode,
        registrationNumber: regNumber,
        message: `Valid temporary registration format (${stateName}, RTO ${rtoCode}). Document expiry date verification required.`,
        warnings,
        errors: [],
        requiresManualReview: false,
        metadata: {
          isTemporary: true,
          isStateRecognized: true,
        },
      };
    }
  }

  // If it clearly looks like a temporary registration but doesn't strictly match standard patterns,
  // DO NOT reject outright: flag for manual review per Section 3.C
  return {
    status: "NEEDS_MANUAL_REVIEW",
    normalizedNumber: normalized,
    originalInput,
    registrationType: "TEMPORARY",
    message: "Unable to recognize this temporary registration format. Please verify the physical registration document.",
    warnings: [
      "Non-standard temporary plate format. Claim is queued for administrator document review.",
    ],
    errors: [],
    requiresManualReview: true,
    metadata: {
      isTemporary: true,
    },
  };
}
