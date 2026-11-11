import { canonicalStateName, normalizeIndianState, normalizePincode, stateByCode } from "@/lib/states";

export type PincodeImportRowInput = {
  pincode: string;
  stateName: string;
  stateCode?: string;
  districtName?: string;
  officeName?: string;
  officeType?: string;
};

/** Quote-aware single CSV line splitter supporting escaped `""` quotes. */
export function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      out.push(cur.trim());
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur.trim());
  return out;
}

const PIN_HEADERS = ["pincode", "pin", "postalcode", "zip", "postalindexnumber"];
const STATE_HEADERS = ["statename", "state", "states", "circle", "circlename"];
const STATE_CODE_HEADERS = ["statecode", "code"];
const DISTRICT_HEADERS = ["districtname", "districtsname", "district", "districts", "taluk", "city"];
const OFFICE_HEADERS = ["officename", "postofficename", "postoffice", "postoffices", "office", "suboffice", "divisionname", "placename"];
const TYPE_HEADERS = ["officetype", "type"];

function normalizeHeaderKey(raw: string): string {
  return raw.replace(/^\uFEFF/, "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function findColumnIndex(headers: string[], candidates: string[]): number {
  for (const c of candidates) {
    const idx = headers.indexOf(c);
    if (idx >= 0) return idx;
  }
  return -1;
}

function pickRecordField(row: Record<string, unknown>, candidates: string[]): string {
  const entries = Object.entries(row);
  for (const c of candidates) {
    for (const [key, val] of entries) {
      if (normalizeHeaderKey(key) === c && val != null) {
        const str = String(val).trim();
        if (str) return str;
      }
    }
  }
  return "";
}

function insertDeduped(
  unique: Map<string, PincodeImportRowInput>,
  item: {
    rawPin: string;
    rawState: string;
    rawCode?: string;
    rawDistrict?: string;
    rawOffice?: string;
    rawType?: string;
  },
): boolean {
  const pin = normalizePincode(item.rawPin);
  if (!pin) return false;
  const matched = normalizeIndianState(item.rawState);
  const stateName = matched?.name ?? canonicalStateName(item.rawState);
  if (!stateName) return false;

  const districtName = item.rawDistrict?.trim().slice(0, 120) || undefined;
  const officeName = item.rawOffice?.trim().slice(0, 120) || undefined;
  const officeType = item.rawType?.trim().slice(0, 40) || undefined;
  const stateCode = matched?.code ?? (item.rawCode?.trim().toUpperCase().slice(0, 6) || stateName.slice(0, 2).toUpperCase());

  // Preserve distinct (pincode, stateName) pairs so multi-state border PIN conflicts remain detectable.
  const key = `${pin}|${stateName}`;
  const existing = unique.get(key);
  if (!existing) {
    unique.set(key, { pincode: pin, stateName, stateCode, districtName, officeName, officeType });
  } else {
    // Prefer whichever row carries richer district/office metadata.
    if (!existing.officeName && officeName) existing.officeName = officeName;
    if (!existing.districtName && districtName) existing.districtName = districtName;
    if (!existing.officeType && officeType) existing.officeType = officeType;
  }
  return true;
}

/**
 * Parses CSV text (India Post data.gov.in, dropdevrahul, kishorek/India-Codes, sanand0, or CRM exports)
 * into clean canonical `(pincode, stateName)` rows without freezing on large datasets.
 */
export function parseCsvTextToRows(csvText: string): { rows: PincodeImportRowInput[]; skipped: number } {
  const lines = csvText.split(/\r?\n/);
  let headerIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim()) {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx < 0) return { rows: [], skipped: 0 };

  const headers = parseCsvLine(lines[headerIdx]).map(normalizeHeaderKey);
  const colPin = findColumnIndex(headers, PIN_HEADERS);
  const colState = findColumnIndex(headers, STATE_HEADERS);
  if (colPin < 0 || colState < 0) return { rows: [], skipped: 0 };

  const colCode = findColumnIndex(headers, STATE_CODE_HEADERS);
  const colDistrict = findColumnIndex(headers, DISTRICT_HEADERS);
  const colOffice = findColumnIndex(headers, OFFICE_HEADERS);
  const colType = findColumnIndex(headers, TYPE_HEADERS);

  const unique = new Map<string, PincodeImportRowInput>();
  let skipped = 0;

  for (let i = headerIdx + 1; i < lines.length; i++) {
    const raw = lines[i];
    if (!raw || !raw.trim()) continue;
    const cols = parseCsvLine(raw);
    const ok = insertDeduped(unique, {
      rawPin: cols[colPin] ?? "",
      rawState: cols[colState] ?? "",
      rawCode: colCode >= 0 ? cols[colCode] : undefined,
      rawDistrict: colDistrict >= 0 ? cols[colDistrict] : undefined,
      rawOffice: colOffice >= 0 ? cols[colOffice] : undefined,
      rawType: colType >= 0 ? cols[colType] : undefined,
    });
    if (!ok) skipped += 1;
  }

  return { rows: Array.from(unique.values()), skipped };
}

/** Parses pre-decoded spreadsheet objects (e.g. from SheetJS `.xlsx`/`.xls`) into normalized PIN rows. */
export function extractPincodeRowsFromRecords(
  rawRows: Record<string, unknown>[],
): { rows: PincodeImportRowInput[]; skipped: number } {
  const unique = new Map<string, PincodeImportRowInput>();
  let skipped = 0;

  for (const r of rawRows) {
    const ok = insertDeduped(unique, {
      rawPin: pickRecordField(r, PIN_HEADERS),
      rawState: pickRecordField(r, STATE_HEADERS),
      rawCode: pickRecordField(r, STATE_CODE_HEADERS),
      rawDistrict: pickRecordField(r, DISTRICT_HEADERS),
      rawOffice: pickRecordField(r, OFFICE_HEADERS),
      rawType: pickRecordField(r, TYPE_HEADERS),
    });
    if (!ok) skipped += 1;
  }

  return { rows: Array.from(unique.values()), skipped };
}

/** Parses compact bundled `data/india-pincodes.tsv` into ready-to-insert PIN rows. */
export function parseBundledPincodeTsv(tsvText: string): PincodeImportRowInput[] {
  const lines = tsvText.split(/\r?\n/);
  const rows: PincodeImportRowInput[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    const [rawPin, rawCode, districtName, officeName, officeType] = line.split("\t");
    const pin = normalizePincode(rawPin);
    const st = stateByCode(rawCode);
    if (!pin || !st) continue;
    rows.push({
      pincode: pin,
      stateCode: st.code,
      stateName: st.name,
      districtName: districtName?.trim() || undefined,
      officeName: officeName?.trim() || undefined,
      officeType: officeType?.trim() || undefined,
    });
  }
  return rows;
}
