/**
 * Offline Indian Vehicle Registration Validation Engine
 * RTO Directory & Structural Validation Rules
 *
 * Implements structural and district RTO checks across Indian States & UTs.
 * Per acceptance criteria: If a state code is recognized and the RTO is syntactically valid
 * but unlisted in the local directory, it issues an advisory warning instead of an outright rejection.
 */

import type { RTORuleEntry } from "./types";

/**
 * Curated directory of prominent RTO offices across major Indian states.
 */
export const KNOWN_RTO_DIRECTORY: Record<string, Record<string, string>> = {
  // Delhi (DL) - 01 to 14
  DL: {
    "01": "North Delhi (Mall Road)",
    "02": "New Delhi (Tilak Marg)",
    "03": "South Delhi (Sheikh Sarai)",
    "04": "West Delhi (Janakpuri)",
    "05": "North East Delhi (Loni Road)",
    "06": "Central Delhi (Sarai Kale Khan)",
    "07": "East Delhi (Mayur Vihar)",
    "08": "North West Delhi (Wazirpur)",
    "09": "South West Delhi (Palam)",
    "10": "West Delhi II (Raja Garden)",
    "11": "North West Delhi II (Rohini)",
    "12": "South West Delhi II (Vasant Vihar)",
    "13": "East Delhi II (Surajmal Vihar)",
    "14": "South Delhi II (Sarita Vihar)",
  },
  // Uttar Pradesh (UP) - 01 to 96
  UP: {
    "14": "Ghaziabad",
    "15": "Meerut",
    "16": "Noida / Gautam Buddha Nagar",
    "17": "Baghpat",
    "18": "Bulandshahr",
    "32": "Lucknow",
    "70": "Prayagraj (Allahabad)",
    "78": "Kanpur Nagar",
    "80": "Agra",
    "81": "Aligarh",
    "85": "Mathura",
  },
  // Maharashtra (MH) - 01 to 50
  MH: {
    "01": "Mumbai Central (Tardeo)",
    "02": "Mumbai West (Andheri)",
    "03": "Mumbai East (Wadala)",
    "04": "Thane",
    "05": "Kalyan",
    "09": "Kolhapur",
    "12": "Pune Central",
    "14": "Pimpri-Chinchwad",
    "15": "Nashik",
    "20": "Aurangabad / Chhatrapati Sambhajinagar",
    "31": "Nagpur Urban",
    "43": "Navi Mumbai (Vashi)",
    "46": "Navi Mumbai (Panvel)",
    "47": "Mumbai North (Borivali)",
  },
  // Gujarat (GJ) - 01 to 38
  GJ: {
    "01": "Ahmedabad West (Subhash Bridge)",
    "02": "Mehsana",
    "03": "Rajkot",
    "04": "Bhavnagar",
    "05": "Surat",
    "06": "Vadodara",
    "09": "Sabarkantha (Himatnagar)",
    "18": "Gandhinagar",
    "27": "Ahmedabad East (Vastral)",
  },
  // Karnataka (KA) - 01 to 71
  KA: {
    "01": "Bengaluru Central (Koramangala)",
    "02": "Bengaluru West (Rajajinagar)",
    "03": "Bengaluru East (Indiranagar)",
    "04": "Bengaluru North (Yeshwanthpur)",
    "05": "Bengaluru South (Jayanagar)",
    "09": "Mysuru (Mysore)",
    "19": "Mangaluru (Mangalore)",
    "22": "Belagavi (Belgaum)",
    "25": "Dharwad / Hubballi",
    "51": "Bengaluru Electronic City",
    "53": "Bengaluru K.R. Puram",
  },
  // Haryana (HR) - 01 to 99
  HR: {
    "01": "Ambala",
    "03": "Panchkula",
    "06": "Panipat",
    "10": "Sonipat",
    "26": "Gurugram North",
    "29": "Ballabgarh",
    "51": "Faridabad",
    "72": "Gurugram South",
    "98": "Badshahpur (Gurugram)",
  },
  // Rajasthan (RJ) - 01 to 58
  RJ: {
    "14": "Jaipur South",
    "19": "Jodhpur",
    "20": "Kota",
    "27": "Udaipur",
    "45": "Jaipur North",
  },
  // Tamil Nadu (TN) - 01 to 99
  TN: {
    "01": "Chennai Central",
    "02": "Chennai North West",
    "07": "Chennai South",
    "09": "Chennai West",
    "37": "Coimbatore South",
    "38": "Coimbatore North",
    "58": "Madurai South",
  },
  // West Bengal (WB) - 01 to 99
  WB: {
    "01": "Kolkata North (Beltala)",
    "02": "Kolkata South",
    "19": "Alipore (South 24 Parganas)",
    "20": "Alipore Commercial",
  },
  // Chandigarh (CH)
  CH: {
    "01": "Chandigarh Urban",
    "02": "Chandigarh Commercial",
    "03": "Chandigarh South",
    "04": "Chandigarh East",
  },
  // Telangana (TS) - 01 to 36
  TS: {
    "07": "Ranga Reddy / Attapur",
    "08": "Medchal-Malkajgiri",
    "09": "Hyderabad Central (Khairatabad)",
    "10": "Secunderabad",
  },
};

/**
 * Expected maximum numeric RTO ceiling per state (for sanity checks).
 */
export const STATE_MAX_RTO_RANGES: Record<string, number> = {
  AN: 2,
  AP: 39,
  AR: 20,
  AS: 34,
  BR: 57,
  CH: 4,
  CG: 30,
  DD: 3,
  DN: 2,
  DL: 14,
  GA: 12,
  GJ: 38,
  HR: 99,
  HP: 97,
  JK: 22,
  JH: 24,
  KA: 71,
  KL: 86,
  LA: 2,
  LD: 9,
  MH: 50,
  ML: 14,
  MN: 7,
  MP: 70,
  MZ: 9,
  NL: 8,
  OD: 35,
  OR: 35,
  PB: 91,
  PY: 5,
  RJ: 58,
  SK: 8,
  TN: 99,
  TS: 36,
  TR: 8,
  UK: 20,
  UA: 20,
  UP: 96,
  WB: 99,
};

export interface RTOCheckResult {
  isSyntacticallyValid: boolean;
  isRecognizedInDirectory: boolean;
  district?: string;
  warning?: string;
  error?: string;
}

/**
 * Validates the RTO portion of an Indian vehicle registration number.
 * Never fails outright if the numeric format is valid; instead returns an advisory warning.
 */
export function validateRTOCode(stateCode: string, rtoCodeRaw: string): RTOCheckResult {
  const state = stateCode.toUpperCase();
  const rto = rtoCodeRaw.trim().toUpperCase();

  // Special handling for Delhi (DL):
  // Delhi uses either 1 or 2 digits, or digit + vehicle category letter (e.g. "8C", "1C", "4S", "9", "08")
  if (state === "DL") {
    const dlMatch = rto.match(/^(\d{1,2})([A-Z])?$/);
    if (!dlMatch) {
      return {
        isSyntacticallyValid: false,
        isRecognizedInDirectory: false,
        error: `Invalid Delhi RTO format "${rto}". Expected RTO 1-14 with optional vehicle class.`,
      };
    }
    const rtoNum = parseInt(dlMatch[1], 10);
    if (rtoNum < 1 || rtoNum > 14) {
      return {
        isSyntacticallyValid: true,
        isRecognizedInDirectory: false,
        warning: `Delhi RTO code ${rtoNum} is outside standard zones (1–14). Manual review advised.`,
      };
    }
    const padded = String(rtoNum).padStart(2, "0");
    const district = KNOWN_RTO_DIRECTORY.DL?.[padded] || `Delhi District Zone ${rtoNum}`;
    return {
      isSyntacticallyValid: true,
      isRecognizedInDirectory: true,
      district,
    };
  }

  // All other states: 1 or 2 digits
  if (!/^\d{1,2}$/.test(rto)) {
    return {
      isSyntacticallyValid: false,
      isRecognizedInDirectory: false,
      error: `RTO code must be numeric (e.g. 01, 16). Received "${rto}".`,
    };
  }

  const num = parseInt(rto, 10);
  if (num === 0) {
    return {
      isSyntacticallyValid: false,
      isRecognizedInDirectory: false,
      error: `RTO code cannot be 00. Must be a valid regional transport office number.`,
    };
  }

  const padded = String(num).padStart(2, "0");
  const knownName = KNOWN_RTO_DIRECTORY[state]?.[padded];
  if (knownName) {
    return {
      isSyntacticallyValid: true,
      isRecognizedInDirectory: true,
      district: knownName,
    };
  }

  // Check if within expected state ceiling
  const ceiling = STATE_MAX_RTO_RANGES[state];
  if (ceiling && num > ceiling) {
    return {
      isSyntacticallyValid: true,
      isRecognizedInDirectory: false,
      warning: `RTO code ${padded} is higher than typical known allocations for ${state} (up to ${ceiling}). Please verify registration document.`,
    };
  }

  return {
    isSyntacticallyValid: true,
    isRecognizedInDirectory: false,
    district: `${state} RTO ${padded}`,
  };
}
