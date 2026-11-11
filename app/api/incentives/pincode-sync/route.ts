import { revalidatePath } from "next/cache";
import { getStaff } from "@/lib/auth";
import { todayIST } from "@/lib/data/helpers";
import { recordIncentiveAudit } from "@/lib/incentives-engine";
import { loadOfficialPincodeRows } from "@/lib/pincode-mirror-loader";
import { can } from "@/lib/rbac/permissions";
import { CANONICAL_STATE_NAMES, canonicalStateName, normalizeIndianState, normalizePincode } from "@/lib/states";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type ExistingPinRow = {
  id: string;
  pincode: string;
  state_name: string;
  district_name: string | null;
  office_name: string | null;
  office_type: string | null;
};

/**
 * High-speed NDJSON streaming auto-sync for All-India PIN codes.
 * Runs cleanly on the server using the verified 36-state directory (`crm/data/india-pincodes.tsv`)
 * or optional live GitHub mirror, purges stale/incomplete pre-2014 CSV rows (`cleanMode: true`),
 * and upserts missing clean mappings in fast batches.
 */
export async function POST(req: Request) {
  const { staff } = await getStaff();
  if (!staff || !can(staff, "incentives.manage")) {
    return new Response(JSON.stringify({ type: "error", error: "Only admins can sync the PIN code directory." }) + "\n", {
      status: 403,
      headers: { "Content-Type": "application/x-ndjson; charset=utf-8" },
    });
  }

  let requestedSource: "bundled" | "online" = "bundled";
  let cleanMode = true;
  try {
    const body = (await req.json()) as { source?: string; cleanMode?: boolean };
    if (body?.source === "online") requestedSource = "online";
    if (body?.cleanMode === false) cleanMode = false;
  } catch {
    /* default options */
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (payload: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(JSON.stringify(payload) + "\n"));
      };

      try {
        send({ type: "progress", phase: "Loading verified 36-state India Post dataset…", done: 0, total: 19346 });
        const { rows: officialRows, sourceUsed } = await loadOfficialPincodeRows(requestedSource);
        const totalOfficial = officialRows.length;

        const officialPinSet = new Set<string>();
        const officialPinStateSet = new Set<string>();
        for (const r of officialRows) {
          officialPinSet.add(r.pincode);
          officialPinStateSet.add(`${r.pincode}|${r.stateName}`);
        }

        const adminDb = createAdminClient();
        const db = adminDb ?? (await createClient());

        // Inspect existing directory pages (1,000-row PostgREST pages fetched in parallel windows of 8).
        send({ type: "progress", phase: "Scanning existing PIN directory…", done: 0, total: totalOfficial });
        const countRes = await db.from("pincode_directory").select("id", { count: "exact", head: true });
        if (countRes.error) throw new Error(countRes.error.message);

        const existingCount = countRes.count ?? 0;
        const existingRows: ExistingPinRow[] = [];
        for (let batchStart = 0; batchStart < existingCount; batchStart += 8000) {
          const calls: Promise<ExistingPinRow[]>[] = [];
          for (let offset = batchStart; offset < Math.min(existingCount, batchStart + 8000); offset += 1000) {
            calls.push(
              (async () => {
                const res = await db
                  .from("pincode_directory")
                  .select("id, pincode, state_name, district_name, office_name, office_type")
                  .order("id", { ascending: true })
                  .range(offset, offset + 999);
                if (res.error) throw new Error(res.error.message);
                return (res.data ?? []) as ExistingPinRow[];
              })(),
            );
          }
          const pages = await Promise.all(calls);
          for (const page of pages) existingRows.push(...page);
        }

        // Partition rows: identify incomplete/legacy/duplicate entries for removal when `cleanMode` is enabled.
        const badIds: string[] = [];
        const keptPinStates = new Set<string>();

        for (const row of existingRows) {
          const isManual = row.office_type === "Manual";
          const hasValidState = CANONICAL_STATE_NAMES.has(row.state_name);
          const isIncomplete = !row.office_name || !row.district_name;
          const pinStateKey = `${row.pincode}|${row.state_name}`;
          const conflictsWithOfficial =
            officialPinSet.has(row.pincode) && !officialPinStateSet.has(pinStateKey);

          const isLegacyArtifact =
            cleanMode &&
            !isManual &&
            (!hasValidState || isIncomplete || conflictsWithOfficial);

          if (isLegacyArtifact || keptPinStates.has(pinStateKey)) {
            badIds.push(row.id);
          } else {
            keptPinStates.add(pinStateKey);
          }
        }

        // Delete flagged stale/incomplete/duplicate entries in parallel chunks of 150 IDs.
        let cleanedCount = 0;
        if (badIds.length > 0) {
          send({
            type: "progress",
            phase: `Cleaning ${badIds.length.toLocaleString("en-IN")} legacy / conflicting rows…`,
            done: 0,
            total: totalOfficial,
          });
          const deleteBatches: string[][] = [];
          for (let i = 0; i < badIds.length; i += 150) {
            deleteBatches.push(badIds.slice(i, i + 150));
          }
          for (let i = 0; i < deleteBatches.length; i += 6) {
            const window = deleteBatches.slice(i, i + 6);
            await Promise.all(
              window.map(async (ids) => {
                const delRes = await db.from("pincode_directory").delete().in("id", ids);
                if (delRes.error) throw new Error(delRes.error.message);
                cleanedCount += ids.length;
              }),
            );
          }
        }

        // Build missing official entries to insert.
        const today = todayIST();
        const toInsert: {
          pincode: string;
          state_code: string;
          state_name: string;
          district_name: string | null;
          office_name: string | null;
          office_type: string | null;
          is_active: boolean;
          source_updated_at: string;
        }[] = [];

        for (const r of officialRows) {
          const pin = normalizePincode(r.pincode);
          const st = normalizeIndianState(r.stateName);
          const stateName = st?.name ?? canonicalStateName(r.stateName);
          if (!pin || !stateName) continue;
          const pinStateKey = `${pin}|${stateName}`;
          if (keptPinStates.has(pinStateKey)) continue;
          keptPinStates.add(pinStateKey);

          toInsert.push({
            pincode: pin,
            state_code: st?.code ?? r.stateCode ?? stateName.slice(0, 2).toUpperCase(),
            state_name: stateName,
            district_name: (r.districtName ?? "").trim().slice(0, 120) || null,
            office_name: (r.officeName ?? "").trim().slice(0, 120) || null,
            office_type: (r.officeType ?? "").trim().slice(0, 40) || null,
            is_active: true,
            source_updated_at: today,
          });
        }

        let insertedCount = 0;
        const batchSize = 1000;
        for (let i = 0; i < toInsert.length; i += batchSize) {
          const slice = toInsert.slice(i, i + batchSize);
          const ins = await db.from("pincode_directory").insert(slice);
          if (ins.error) throw new Error(ins.error.message);
          insertedCount += slice.length;
          send({
            type: "progress",
            phase: `Syncing 36-state PINs (${Math.min(insertedCount, toInsert.length).toLocaleString("en-IN")} / ${toInsert.length.toLocaleString("en-IN")})…`,
            done: insertedCount,
            total: toInsert.length,
          });
        }

        await recordIncentiveAudit(db, {
          actorId: staff.id,
          actorName: staff.full_name,
          action: "pincode_directory.auto_sync",
          entityType: "pincode_directory",
          afterData: {
            sourceUsed,
            cleanMode,
            officialRows: totalOfficial,
            cleanedLegacy: cleanedCount,
            inserted: insertedCount,
          },
        });

        revalidatePath("/incentives");
        send({
          type: "done",
          ok: true,
          sourceUsed,
          totalOfficial,
          cleanedLegacy: cleanedCount,
          inserted: insertedCount,
          activeTotal: keptPinStates.size,
        });
      } catch (err) {
        send({
          type: "error",
          ok: false,
          error: err instanceof Error ? err.message : "Could not complete All-India PIN sync.",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
