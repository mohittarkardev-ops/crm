/**
 * Offline Indian Vehicle Registration Validation Engine
 * Central Validator & Pipeline Orchestrator
 *
 * Implements the 10-step validation sequence mandated by the specifications:
 * 1. Check whether input is empty.
 * 2. Normalize input.
 * 3. Reject prohibited characters.
 * 4. Check whether the number matches a recognized BH-series format.
 * 5. Check whether it matches a configured temporary-registration format.
 * 6. Check whether it matches a regular state-based registration format.
 * 7. Check whether it matches a configured legacy format.
 * 8. Validate the state code.
 * 9. Validate the RTO structure where local data exists.
 * 10. Return structured validation result.
 *
 * ZERO external network, Parivahan API, or VAHAN API dependencies.
 */

import { normalizeRegistrationNumber } from "./normalizer";
import { isValidStateCode, getStateInfo, isLegacyStateCode } from "./state-codes";
import { validateRTOCode } from "./rto-rules";
import { looksLikeBHSeries, validateBHSeries } from "./bh-series";
import { looksLikeTemporaryRegistration, validateTemporaryRegistration } from "./temporary-rules";
import { looksLikeLegacyRegistration, validateLegacyRegistration } from "./legacy-rules";
import { parseRegularRegistration } from "./patterns";
import type {
  VehicleValidationOptions,
  VehicleValidationResult,
  VehicleValidationStatus,
  VehicleRegistrationType,
} from "./types";

/**
 * Validates an Indian vehicle registration number completely offline.
 *
 * @param registrationNumber Raw user input (spaces/hyphens allowed)
 * @param options Optional vehicle category and registration constraints
 */
export function validateIndianVehicleNumber(
  registrationNumber: string,
  options?: VehicleValidationOptions,
): VehicleValidationResult {
  const raw = String(registrationNumber ?? "");

  // -------------------------------------------------------------------
  // Step 1: Check whether input is empty
  // -------------------------------------------------------------------
  if (!raw.trim()) {
    return {
      status: "INVALID",
      normalizedNumber: "",
      originalInput: raw,
      registrationType: "UNKNOWN",
      message: "Vehicle registration number is required.",
      warnings: [],
      errors: ["Please enter a vehicle registration number."],
      requiresManualReview: false,
    };
  }

  // -------------------------------------------------------------------
  // Step 2 & 3: Normalize input & reject prohibited characters
  // -------------------------------------------------------------------
  const norm = normalizeRegistrationNumber(raw);

  if (norm.hasUnicodeOrEmoji) {
    return {
      status: "INVALID",
      normalizedNumber: norm.normalized,
      originalInput: raw,
      registrationType: "UNKNOWN",
      message: "Registration number contains non-ASCII or Unicode characters.",
      warnings: [],
      errors: ["Only standard Latin letters (A–Z) and Arabic digits (0–9) are permitted."],
      requiresManualReview: false,
    };
  }

  if (!norm.isValidCharacters || norm.prohibitedChars.length > 0) {
    const charsList = norm.prohibitedChars.join(" ");
    return {
      status: "INVALID",
      normalizedNumber: norm.normalized,
      originalInput: raw,
      registrationType: "UNKNOWN",
      message: `Registration number contains prohibited character(s): ${charsList}`,
      warnings: [],
      errors: [
        `Prohibited character(s) detected: ${charsList}. Only alphanumeric characters, hyphens, and spaces are permitted.`,
      ],
      requiresManualReview: false,
    };
  }

  const normalized = norm.normalized;

  // Length sanity bounds: Indian registrations range from 4 chars (e.g. legacy DL1234) to 15 chars (long temp/series)
  if (normalized.length < 4) {
    return {
      status: "INVALID",
      normalizedNumber: normalized,
      originalInput: raw,
      registrationType: "UNKNOWN",
      message: `Registration number is too short (${normalized.length} characters). Minimum is 4 characters.`,
      warnings: [],
      errors: ["Registration number is too short."],
      requiresManualReview: false,
    };
  }

  if (normalized.length > 15) {
    return {
      status: "INVALID",
      normalizedNumber: normalized,
      originalInput: raw,
      registrationType: "UNKNOWN",
      message: `Registration number is excessively long (${normalized.length} characters). Maximum is 15 characters.`,
      warnings: [],
      errors: ["Registration number exceeds maximum length of 15 characters."],
      requiresManualReview: false,
    };
  }

  // Pure numeric string check (e.g. "1234567890") - definitively malformed
  if (/^\d+$/.test(normalized)) {
    return {
      status: "INVALID",
      normalizedNumber: normalized,
      originalInput: raw,
      registrationType: "UNKNOWN",
      message: "Registration cannot be purely numeric. Indian plates must contain a valid State or BH prefix.",
      warnings: [],
      errors: ["Input contains only numbers. Expected valid state prefix (e.g., UP16AB1234) or BH Series."],
      requiresManualReview: false,
    };
  }

  // Pure alphabetic string check (e.g. "ABCDEF") - definitively malformed
  if (/^[A-Z]+$/.test(normalized)) {
    return {
      status: "INVALID",
      normalizedNumber: normalized,
      originalInput: raw,
      registrationType: "UNKNOWN",
      message: "Registration cannot be purely alphabetic. Indian plates must include registration digits.",
      warnings: [],
      errors: ["Input contains only letters without numeric sequence."],
      requiresManualReview: false,
    };
  }

  // Check for incomplete registration missing numeric sequence digits (e.g. "UP16AB", "MH12XYZ")
  if (/^[A-Z]{2}\d{1,2}[A-Z]+$/.test(normalized) || /^[A-Z]{2,3}$/.test(normalized)) {
    return {
      status: "INVALID",
      normalizedNumber: normalized,
      originalInput: raw,
      registrationType: "UNKNOWN",
      message: `Incomplete vehicle registration number "${normalized}". Missing numeric sequence digits (e.g. UP16AB1234).`,
      warnings: [],
      errors: ["Registration number is incomplete. Missing numeric sequence digits (e.g. 1234)."],
      requiresManualReview: false,
    };
  }

  // -------------------------------------------------------------------
  // Step 4: Check Bharat Series (BH Series)
  // -------------------------------------------------------------------
  if (looksLikeBHSeries(normalized)) {
    const bhResult = validateBHSeries(normalized, raw);
    if (options?.vehicleCategory) {
      bhResult.metadata = {
        ...bhResult.metadata,
        vehicleCategoryClass: options.vehicleCategory,
      };
    }
    return bhResult;
  }

  // -------------------------------------------------------------------
  // Step 5: Check Temporary Registrations (TR / TEMP / TC)
  // -------------------------------------------------------------------
  if (looksLikeTemporaryRegistration(normalized)) {
    const tempResult = validateTemporaryRegistration(normalized, raw);
    if (options?.vehicleCategory) {
      tempResult.metadata = {
        ...tempResult.metadata,
        vehicleCategoryClass: options.vehicleCategory,
      };
    }
    return tempResult;
  }

  // -------------------------------------------------------------------
  // Step 6: Check Regular State-Based Registration Format (SS DD LL NNNN)
  // -------------------------------------------------------------------
  const parsedRegular = parseRegularRegistration(normalized);

  if (parsedRegular) {
    const { stateCode, rtoCode, series, registrationNumber, isDelhiSpecialFormat } = parsedRegular;
    const errors: string[] = [];
    const warnings: string[] = [];

    // Step 8: Validate State Code
    if (!isValidStateCode(stateCode)) {
      return {
        status: "INVALID",
        normalizedNumber: normalized,
        originalInput: raw,
        registrationType: "REGULAR",
        stateCode,
        message: `Invalid state code "${stateCode}". Not recognized in the Indian States & Union Territories directory.`,
        warnings: [],
        errors: [`State code "${stateCode}" is not a recognized Indian State or Union Territory.`],
        requiresManualReview: false,
      };
    }

    const stateInfo = getStateInfo(stateCode);
    const stateName = stateInfo?.name || stateCode;

    // Check if using a legacy / renamed state prefix (e.g. OR for Odisha, UA for Uttarakhand)
    const isHistorical = isLegacyStateCode(stateCode);
    if (isHistorical) {
      warnings.push(
        `Historical state prefix "${stateCode}" (${stateName}). Renamed to "${stateInfo?.canonicalCode}". Legally valid for older vehicles.`,
      );
    }

    // Step 9: Validate RTO structure
    const rtoCheck = validateRTOCode(stateCode, rtoCode);
    if (!rtoCheck.isSyntacticallyValid && rtoCheck.error) {
      errors.push(rtoCheck.error);
    }
    if (rtoCheck.warning) {
      warnings.push(rtoCheck.warning);
    }

    // Validate registration number: cannot be "0000"
    if (registrationNumber === "0000" || registrationNumber === "0") {
      errors.push("Registration sequence number cannot be 0000.");
    }

    const regType: VehicleRegistrationType = isHistorical ? "LEGACY" : "REGULAR";

    if (errors.length > 0) {
      return {
        status: "INVALID",
        normalizedNumber: normalized,
        originalInput: raw,
        registrationType: regType,
        stateCode,
        stateName,
        rtoCode,
        series,
        registrationNumber,
        message: errors[0],
        warnings,
        errors,
        requiresManualReview: false,
      };
    }

    // Compose user-friendly message
    const rtoLabel = rtoCheck.district ? ` · ${rtoCheck.district}` : ` · RTO ${rtoCode}`;
    const seriesLabel = series ? ` · Series ${series}` : "";
    const categoryInfo = options?.vehicleCategory ? ` (${options.vehicleCategory})` : "";
    const legacyNote = isHistorical ? "Legacy " : "";
    const primaryMessage = `Valid ${legacyNote}vehicle registration number: ${stateName}${rtoLabel}${seriesLabel}${categoryInfo}.`;

    return {
      status: "VALID",
      normalizedNumber: normalized,
      originalInput: raw,
      registrationType: regType,
      stateCode,
      stateName,
      rtoCode,
      series,
      registrationNumber,
      message: primaryMessage,
      warnings,
      errors: [],
      requiresManualReview: false,
      metadata: {
        isStateRecognized: true,
        isRTORecognized: rtoCheck.isRecognizedInDirectory,
        historicalStateCode: isHistorical,
        vehicleCategoryClass: options?.vehicleCategory,
      },
    };
  }

  // -------------------------------------------------------------------
  // Step 7: Check Legacy / Historical Registration Formats
  // -------------------------------------------------------------------
  if (looksLikeLegacyRegistration(normalized)) {
    const legacyResult = validateLegacyRegistration(normalized, raw);
    if (options?.vehicleCategory) {
      legacyResult.metadata = {
        ...legacyResult.metadata,
        vehicleCategoryClass: options.vehicleCategory,
      };
    }
    return legacyResult;
  }

  // -------------------------------------------------------------------
  // Fallback: Distinguish definitively malformed vs potential manual review
  // -------------------------------------------------------------------
  // If the string starts with 2 letters that match a recognized state code, but has
  // a non-standard series / digit pattern (e.g. vintage, military, special diplomatic, or atypical RTO):
  const possibleStateCode = normalized.slice(0, 2).toUpperCase();
  if (isValidStateCode(possibleStateCode)) {
    const stateInfo = getStateInfo(possibleStateCode);
    return {
      status: "NEEDS_MANUAL_REVIEW",
      normalizedNumber: normalized,
      originalInput: raw,
      registrationType: "UNKNOWN",
      stateCode: possibleStateCode,
      stateName: stateInfo?.name,
      message: `Unrecognized plate syntax for ${stateInfo?.name || possibleStateCode}. Manual verification is required.`,
      warnings: [
        `Registration starts with valid state code (${possibleStateCode}), but the subsequent RTO/series sequence does not match modern standard formats. Claim is flagged for manual review.`,
      ],
      errors: [],
      requiresManualReview: true,
      metadata: {
        isStateRecognized: true,
        vehicleCategoryClass: options?.vehicleCategory,
      },
    };
  }

  // Definitively malformed: Unrecognized state prefix and invalid structure
  return {
    status: "INVALID",
    normalizedNumber: normalized,
    originalInput: raw,
    registrationType: "UNKNOWN",
    message: `Invalid Indian vehicle registration format "${normalized}".`,
    warnings: [],
    errors: [
      `Could not recognize registration structure. Expected standard format (e.g. UP16AB1234, DL8CAB1234), BH Series (e.g. 22BH1234AA), or valid temporary registration.`,
    ],
    requiresManualReview: false,
  };
}
