export type IndianState = {
  code: string;
  name: string;
};

export const INDIAN_STATES: IndianState[] = [
  { code: "AN", name: "Andaman and Nicobar Islands" },
  { code: "AP", name: "Andhra Pradesh" },
  { code: "AR", name: "Arunachal Pradesh" },
  { code: "AS", name: "Assam" },
  { code: "BR", name: "Bihar" },
  { code: "CH", name: "Chandigarh" },
  { code: "CG", name: "Chhattisgarh" },
  { code: "DN", name: "Dadra and Nagar Haveli and Daman and Diu" },
  { code: "DL", name: "Delhi" },
  { code: "GA", name: "Goa" },
  { code: "GJ", name: "Gujarat" },
  { code: "HR", name: "Haryana" },
  { code: "HP", name: "Himachal Pradesh" },
  { code: "JK", name: "Jammu and Kashmir" },
  { code: "JH", name: "Jharkhand" },
  { code: "KA", name: "Karnataka" },
  { code: "KL", name: "Kerala" },
  { code: "LA", name: "Ladakh" },
  { code: "LD", name: "Lakshadweep" },
  { code: "MP", name: "Madhya Pradesh" },
  { code: "MH", name: "Maharashtra" },
  { code: "MN", name: "Manipur" },
  { code: "ML", name: "Meghalaya" },
  { code: "MZ", name: "Mizoram" },
  { code: "NL", name: "Nagaland" },
  { code: "OD", name: "Odisha" },
  { code: "PY", name: "Puducherry" },
  { code: "PB", name: "Punjab" },
  { code: "RJ", name: "Rajasthan" },
  { code: "SK", name: "Sikkim" },
  { code: "TN", name: "Tamil Nadu" },
  { code: "TS", name: "Telangana" },
  { code: "TR", name: "Tripura" },
  { code: "UP", name: "Uttar Pradesh" },
  { code: "UK", name: "Uttarakhand" },
  { code: "WB", name: "West Bengal" },
];

export const STATE_OPTIONS = INDIAN_STATES.map((s) => ({
  value: s.name,
  label: `${s.name} (${s.code})`,
}));

export const CANONICAL_STATE_NAMES = new Set(INDIAN_STATES.map((s) => s.name));
const STATE_BY_CODE = new Map(INDIAN_STATES.map((s) => [s.code, s]));

export function stateByCode(code: string | null | undefined): IndianState | null {
  if (!code) return null;
  return STATE_BY_CODE.get(code.trim().toUpperCase()) ?? null;
}

const ALIAS_MAP = new Map<string, IndianState>();

function cleanKey(raw: string): string {
  return raw
    .toUpperCase()
    .replace(/&/g, " AND ")
    .replace(/[^A-Z0-9]+/g, " ")
    .trim();
}

for (const st of INDIAN_STATES) {
  ALIAS_MAP.set(cleanKey(st.name), st);
  ALIAS_MAP.set(cleanKey(st.code), st);
}

const EXTRA_ALIASES: Record<string, string> = {
  "NCT OF DELHI": "Delhi",
  "NEW DELHI": "Delhi",
  ORISSA: "Odisha",
  OR: "Odisha",
  PONDICHERRY: "Puducherry",
  UTTARANCHAL: "Uttarakhand",
  UA: "Uttarakhand",
  UT: "Uttarakhand",
  "ANDAMAN NICOBAR": "Andaman and Nicobar Islands",
  "ANDAMAN AND NICOBAR": "Andaman and Nicobar Islands",
  "ANDAMAN NICOBAR ISLANDS": "Andaman and Nicobar Islands",
  "A AND N ISLANDS": "Andaman and Nicobar Islands",
  LAKSHDWEEP: "Lakshadweep",
  CHATTISGARH: "Chhattisgarh",
  TAMILNADU: "Tamil Nadu",
  "DADRA AND NAGAR HAVELI": "Dadra and Nagar Haveli and Daman and Diu",
  "DADRA NAGAR HAVELI": "Dadra and Nagar Haveli and Daman and Diu",
  "D AND N HAVELI": "Dadra and Nagar Haveli and Daman and Diu",
  "DAMAN AND DIU": "Dadra and Nagar Haveli and Daman and Diu",
  "DAMAN DIU": "Dadra and Nagar Haveli and Daman and Diu",
  "THE DADRA AND NAGAR HAVELI AND DAMAN AND DIU": "Dadra and Nagar Haveli and Daman and Diu",
  DD: "Dadra and Nagar Haveli and Daman and Diu",
  "JAMMU KASHMIR": "Jammu and Kashmir",
  TG: "Telangana",
  CT: "Chhattisgarh",
};

for (const [alias, target] of Object.entries(EXTRA_ALIASES)) {
  const found = INDIAN_STATES.find((s) => s.name === target);
  if (found) ALIAS_MAP.set(cleanKey(alias), found);
}

/** Normalizes any state name/abbreviation (including India Post uppercase variants) to canonical state + code. */
export function normalizeIndianState(raw: string | null | undefined): IndianState | null {
  if (!raw) return null;
  const key = cleanKey(raw);
  if (!key) return null;
  const hit = ALIAS_MAP.get(key);
  if (hit) return hit;
  return null;
}

/** Best-effort canonical state name preserving cleaned title case if a non-standard custom territory is provided. */
export function canonicalStateName(raw: string | null | undefined): string {
  if (!raw) return "";
  const matched = normalizeIndianState(raw);
  if (matched) return matched.name;
  return raw.trim();
}

/** Clean 6-digit Indian PIN code extraction (returns null if invalid). */
export function normalizePincode(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (!/^[1-9]\d{5}$/.test(digits)) return null;
  return digits;
}
