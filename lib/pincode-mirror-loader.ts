import { readFile } from "node:fs/promises";
import path from "node:path";
import { parseBundledPincodeTsv, parseCsvTextToRows, type PincodeImportRowInput } from "@/lib/pincode-dataset";

const MIRROR_CSV_URL =
  "https://raw.githubusercontent.com/dropdevrahul/pincodes-india/main/pincode.csv";

/**
 * Loads the verified 36-state India Post reference directory.
 * Defaults to the local bundled dataset (instantaneous, zero external dependency/rate limit),
 * or optionally tries the upstream GitHub mirror with automatic bundled fallback.
 */
export async function loadOfficialPincodeRows(source: "bundled" | "online" = "bundled"): Promise<{
  rows: PincodeImportRowInput[];
  sourceUsed: "bundled" | "online";
}> {
  if (source === "online") {
    try {
      const res = await fetch(MIRROR_CSV_URL, {
        cache: "no-store",
        signal: AbortSignal.timeout(15_000),
      });
      if (res.ok) {
        const csvText = await res.text();
        const { rows } = parseCsvTextToRows(csvText);
        if (rows.length >= 15_000) {
          return { rows, sourceUsed: "online" };
        }
      }
    } catch {
      /* fall through to bundled official dataset */
    }
  }

  const tsvPath = path.join(process.cwd(), "data", "india-pincodes.tsv");
  const tsvText = await readFile(tsvPath, "utf8");
  return { rows: parseBundledPincodeTsv(tsvText), sourceUsed: "bundled" };
}
