/**
 * Offline Indian Vehicle Registration Validation Engine
 * State & Union Territory Codes Configuration
 *
 * Sourced from the Motor Vehicles Act (1988), Ministry of Road Transport and Highways (MoRTH),
 * and official Parivahan state registration code allocations.
 * Includes active 36 States/UTs, historical renamed prefixes (OR, UA), and legacy pre-1989 registries.
 */

import type { StateCodeEntry } from "./types";

/**
 * Standard active Indian State & Union Territory 2-letter registration prefixes.
 */
export const INDIAN_STATE_CODES: readonly string[] = [
  "AN", "AP", "AR", "AS", "BR", "CH",
  "CG", "DD", "DL", "GA", "GJ", "HR",
  "HP", "JK", "JH", "KA", "KL", "LA",
  "LD", "MH", "ML", "MN", "MP", "MZ",
  "NL", "OD", "PB", "PY", "RJ", "SK",
  "TN", "TS", "TR", "UK", "UP", "WB",
] as const;

/**
 * Comprehensive State & UT registration directory with historical tracking and aliases.
 */
export const STATE_DIRECTORY: Record<string, StateCodeEntry> = {
  // -------------------------------------------------------------------
  // Active States & Union Territories
  // -------------------------------------------------------------------
  AN: { code: "AN", name: "Andaman and Nicobar Islands", type: "UT" },
  AP: { code: "AP", name: "Andhra Pradesh", type: "STATE" },
  AR: { code: "AR", name: "Arunachal Pradesh", type: "STATE" },
  AS: { code: "AS", name: "Assam", type: "STATE" },
  BR: { code: "BR", name: "Bihar", type: "STATE" },
  CH: { code: "CH", name: "Chandigarh", type: "UT" },
  CG: { code: "CG", name: "Chhattisgarh", type: "STATE", effectiveFromYear: 2000 },
  DD: { code: "DD", name: "Daman and Diu", type: "UT", notes: "Merged into DNHDD in 2020; vehicles retain DD series." },
  DN: { code: "DN", name: "Dadra and Nagar Haveli", type: "UT", notes: "Merged into DNHDD in 2020; vehicles retain DN series." },
  DL: { code: "DL", name: "Delhi", type: "UT", notes: "National Capital Territory (unique RTO vehicle class coding e.g. DL 8C)." },
  GA: { code: "GA", name: "Goa", type: "STATE" },
  GJ: { code: "GJ", name: "Gujarat", type: "STATE" },
  HR: { code: "HR", name: "Haryana", type: "STATE" },
  HP: { code: "HP", name: "Himachal Pradesh", type: "STATE" },
  JK: { code: "JK", name: "Jammu and Kashmir", type: "UT" },
  JH: { code: "JH", name: "Jharkhand", type: "STATE", effectiveFromYear: 2000 },
  KA: { code: "KA", name: "Karnataka", type: "STATE", aliases: ["MY"] },
  KL: { code: "KL", name: "Kerala", type: "STATE" },
  LA: { code: "LA", name: "Ladakh", type: "UT", effectiveFromYear: 2019 },
  LD: { code: "LD", name: "Lakshadweep", type: "UT" },
  MH: { code: "MH", name: "Maharashtra", type: "STATE", aliases: ["BM"] },
  ML: { code: "ML", name: "Meghalaya", type: "STATE" },
  MN: { code: "MN", name: "Manipur", type: "STATE" },
  MP: { code: "MP", name: "Madhya Pradesh", type: "STATE" },
  MZ: { code: "MZ", name: "Mizoram", type: "STATE" },
  NL: { code: "NL", name: "Nagaland", type: "STATE" },
  OD: { code: "OD", name: "Odisha", type: "STATE", aliases: ["OR"], notes: "Renamed from OR in 2011." },
  PB: { code: "PB", name: "Punjab", type: "STATE" },
  PY: { code: "PY", name: "Puducherry", type: "UT" },
  RJ: { code: "RJ", name: "Rajasthan", type: "STATE" },
  SK: { code: "SK", name: "Sikkim", type: "STATE" },
  TN: { code: "TN", name: "Tamil Nadu", type: "STATE", aliases: ["MD"] },
  TS: { code: "TS", name: "Telangana", type: "STATE", effectiveFromYear: 2014, notes: "Bifurcated from AP in 2014." },
  TR: { code: "TR", name: "Tripura", type: "STATE" },
  UK: { code: "UK", name: "Uttarakhand", type: "STATE", aliases: ["UA"], notes: "Renamed from UA (Uttaranchal) in 2007." },
  UP: { code: "UP", name: "Uttar Pradesh", type: "STATE" },
  WB: { code: "WB", name: "West Bengal", type: "STATE" },

  // -------------------------------------------------------------------
  // Historical / Renamed / Transitional State Codes (Legally Valid)
  // -------------------------------------------------------------------
  OR: {
    code: "OR",
    name: "Odisha (Historical)",
    type: "LEGACY",
    canonicalCode: "OD",
    deprecatedYear: 2011,
    notes: "Official Orissa prefix prior to the 2011 state name change to Odisha (OD). Millions of vehicles legally hold OR plates.",
  },
  UA: {
    code: "UA",
    name: "Uttarakhand (Historical)",
    type: "LEGACY",
    canonicalCode: "UK",
    deprecatedYear: 2007,
    notes: "Official Uttaranchal prefix from 2000 to 2007 before the state was renamed to Uttarakhand (UK).",
  },
  MY: {
    code: "MY",
    name: "Mysore State (Legacy)",
    type: "LEGACY",
    canonicalCode: "KA",
    deprecatedYear: 1973,
    notes: "Pre-1973 state prefix for Mysore prior to renaming as Karnataka.",
  },
  MD: {
    code: "MD",
    name: "Madras State (Legacy)",
    type: "LEGACY",
    canonicalCode: "TN",
    deprecatedYear: 1969,
    notes: "Pre-1969 state prefix for Madras prior to renaming as Tamil Nadu.",
  },
  BM: {
    code: "BM",
    name: "Bombay State (Legacy)",
    type: "LEGACY",
    canonicalCode: "MH",
    deprecatedYear: 1960,
    notes: "Pre-1960 state prefix for Bombay State prior to bifurcation into Maharashtra and Gujarat.",
  },
};

/**
 * Checks if a 2-letter code is a recognized active or historical state/UT code.
 */
export function isValidStateCode(code: string): boolean {
  if (!code || code.length !== 2) return false;
  return Boolean(STATE_DIRECTORY[code.toUpperCase()]);
}

/**
 * Checks if a code is an active (modern) state code.
 */
export function isActiveStateCode(code: string): boolean {
  if (!code) return false;
  const upper = code.toUpperCase();
  return INDIAN_STATE_CODES.includes(upper);
}

/**
 * Checks if a code is an older renamed code (e.g. OR, UA).
 */
export function isLegacyStateCode(code: string): boolean {
  if (!code) return false;
  const entry = STATE_DIRECTORY[code.toUpperCase()];
  return entry?.type === "LEGACY";
}

/**
 * Retrieves state information including modern canonical equivalent.
 */
export function getStateInfo(code: string): StateCodeEntry | undefined {
  if (!code) return undefined;
  return STATE_DIRECTORY[code.toUpperCase()];
}
