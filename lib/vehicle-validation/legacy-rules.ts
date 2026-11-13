/**
 * Offline Indian Vehicle Registration Validation Engine
 * Legacy & Historical Format Validator
 *
 * Sourced from historical provisions of the Indian Motor Vehicles Act (1939 & 1988),
 * handling pre-1989 2/3-letter systems, un-series'd initial allocations (e.g. GJ01 1234),
 * and vintage/classic vehicle plates.
 * Unrecognized legacy-looking structures are automatically routed to NEEDS_MANUAL_REVIEW.
 */

import { getStateInfo, isValidStateCode, isLegacyStateCode } from "./state-codes";
import type { VehicleValidationResult } from "./types";

export interface LegacyPatternConfig {
  id: string;
  name: string;
  pattern: RegExp;
  description: string;
  status: "VALID" | "NEEDS_MANUAL_REVIEW";
  extract: (match: RegExpMatchArray) => {
    stateCode?: string;
    rtoCode?: string;
    series?: string;
    registrationNumber?: string;
    historicalContext?: string;
  };
}

/**
 * Configurable registry of recognized historical Indian registration conventions.
 * Additional legacy formats can be seamlessly added here.
 */
export const CONFIGURED_LEGACY_PATTERNS: LegacyPatternConfig[] = [
  // 1. Post-1989 Initial Allocations with NO Series Letters (e.g. GJ011234, DL015678, MH029999)
  {
    id: "NO_SERIES_STATE_RTO",
    name: "State RTO Without Series Letters (Initial 1989 Allocation)",
    pattern: /^([A-Z]{2})(\d{1,2})(\d{1,4})$/i,
    description: "Early post-1989 format prior to exhausts requiring alphabetic series (e.g. GJ011234).",
    status: "VALID",
    extract: (m) => ({
      stateCode: m[1].toUpperCase(),
      rtoCode: m[2],
      series: "None (Initial Run)",
      registrationNumber: m[3],
      historicalContext: "Early post-1989 standard registration without alphabetic series.",
    }),
  },
  // 2. Renamed State Codes with Modern Structure (e.g. OR14AB1234, UA07CD5678)
  {
    id: "RENAMED_STATE_MODERN_FORMAT",
    name: "Renamed State Code (e.g. OR for Odisha, UA for Uttarakhand)",
    pattern: /^(OR|UA|MY|MD|BM)(\d{1,2})([A-Z]{0,3})(\d{1,4})$/i,
    description: "Historical renamed state prefix (e.g. OR14AB1234).",
    status: "VALID",
    extract: (m) => ({
      stateCode: m[1].toUpperCase(),
      rtoCode: m[2],
      series: m[3] || "None",
      registrationNumber: m[4],
      historicalContext: `Historical state code ${m[1].toUpperCase()} (legally valid for vehicles registered before renaming).`,
    }),
  },
  // 3. Pre-1989 Three-Letter System (e.g. MEC 1234, BYH 123, DLX 4567, MAS 12, WBH 1234)
  {
    id: "PRE_1989_THREE_LETTER",
    name: "Pre-1989 Three-Letter System (1939 Motor Vehicles Act)",
    pattern: /^([A-Z]{3})(\d{1,4})$/i,
    description: "Pre-1989 national convention: 3 letters + 1 to 4 digits (e.g. MEC 1234, BYH 123).",
    status: "VALID",
    extract: (m) => ({
      series: m[1].toUpperCase(),
      registrationNumber: m[2],
      historicalContext: `Pre-1989 historical series (${m[1].toUpperCase()}). Vintage/classic registration.`,
    }),
  },
  // 4. Pre-1989 Two-Letter System (e.g. BM 1234, DL 1234, KL 1234, GJ 5678)
  {
    id: "PRE_1989_TWO_LETTER_DIRECT",
    name: "Pre-1989 Two-Letter Direct Format (No RTO Code)",
    pattern: /^([A-Z]{2})(\d{1,4})$/i,
    description: "Early historical two-letter system without regional RTO digits (e.g. DL 1234).",
    status: "VALID",
    extract: (m) => ({
      stateCode: m[1].toUpperCase(),
      registrationNumber: m[2],
      historicalContext: `Early state registration (${m[1].toUpperCase()}) without district digits.`,
    }),
  },
];

/**
 * Checks if the string appears to be a historical or legacy vehicle number.
 */
export function looksLikeLegacyRegistration(normalized: string): boolean {
  if (!normalized) return false;
  // Shorter registration strings or pre-1989 letter clusters
  return (
    /^[A-Z]{3}\d{1,4}$/i.test(normalized) ||
    /^[A-Z]{2}\d{1,4}$/i.test(normalized) ||
    /^(OR|UA|MY|MD|BM)\d+/i.test(normalized) ||
    /^[A-Z]{2}\d{1,2}\d{4}$/i.test(normalized)
  );
}

/**
 * Validates older and historical registration formats.
 */
export function validateLegacyRegistration(
  normalized: string,
  originalInput: string,
): VehicleValidationResult {
  for (const config of CONFIGURED_LEGACY_PATTERNS) {
    const match = normalized.match(config.pattern);
    if (match) {
      const extracted = config.extract(match);

      // If a state code was identified, verify it
      if (extracted.stateCode) {
        if (!isValidStateCode(extracted.stateCode) && !isLegacyStateCode(extracted.stateCode)) {
          return {
            status: "NEEDS_MANUAL_REVIEW",
            normalizedNumber: normalized,
            originalInput,
            registrationType: "LEGACY",
            message: `This registration appears to use an older format with unrecognized state prefix "${extracted.stateCode}". Manual verification required.`,
            warnings: [
              `Unverified historical state prefix "${extracted.stateCode}". Please inspect physical RC book.`,
            ],
            errors: [],
            requiresManualReview: true,
            metadata: {
              isLegacy: true,
            },
          };
        }
      }

      const stateInfo = extracted.stateCode ? getStateInfo(extracted.stateCode) : undefined;
      const stateName = stateInfo ? stateInfo.name : undefined;

      const warnings = [
        "This registration uses an older / legacy format. Physical RC / book verification recommended.",
      ];

      return {
        status: config.status,
        normalizedNumber: normalized,
        originalInput,
        registrationType: "LEGACY",
        stateCode: extracted.stateCode,
        stateName,
        rtoCode: extracted.rtoCode,
        series: extracted.series,
        registrationNumber: extracted.registrationNumber,
        message: `Valid legacy registration format (${extracted.historicalContext || config.name}).`,
        warnings,
        errors: [],
        requiresManualReview: config.status === "NEEDS_MANUAL_REVIEW",
        metadata: {
          isLegacy: true,
          isStateRecognized: Boolean(extracted.stateCode && isValidStateCode(extracted.stateCode)),
          historicalStateCode: Boolean(extracted.stateCode && isLegacyStateCode(extracted.stateCode)),
        },
      };
    }
  }

  // Ambiguous legacy pattern: conservative manual review route
  return {
    status: "NEEDS_MANUAL_REVIEW",
    normalizedNumber: normalized,
    originalInput,
    registrationType: "LEGACY",
    message: "This registration appears to use an older format. Manual verification is required.",
    warnings: [
      "Registration does not match modern 4-part syntax. Claim is flagged for administrative document review.",
    ],
    errors: [],
    requiresManualReview: true,
    metadata: {
      isLegacy: true,
    },
  };
}
