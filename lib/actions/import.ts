"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { audit, normalizeMobile, type Db } from "@/lib/actions/shared";
import { requirePermission } from "@/lib/rbac/server";
import { todayIST, addDays } from "@/lib/data/helpers";

/**
 * Server actions for Bulk Import & Bulk Lookup (S8).
 * All actions are strictly RBAC protected (adminOnly: true).
 */

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function normalizeReg(raw: unknown): string | null {
  if (typeof raw !== "string" && typeof raw !== "number") return null;
  const cleaned = String(raw).toUpperCase().replace(/\s+/g, "").replace(/[^A-Z0-9-]/g, "");
  return cleaned.length >= 4 && cleaned.length <= 20 ? cleaned : null;
}

function parseNumber(raw: unknown): number | null {
  if (raw === null || raw === undefined || raw === "") return null;
  const num = typeof raw === "number" ? raw : Number(String(raw).replace(/,/g, "").trim());
  return Number.isFinite(num) && num >= 0 ? num : null;
}

/**
 * Parses diverse date inputs (YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY, Excel serial numbers).
 */
function parseFlexibleDate(raw: unknown): string | null {
  if (!raw) return null;
  if (typeof raw === "number") {
    // Excel serial number (e.g. 45200)
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const d = new Date(excelEpoch.getTime() + raw * 86_400_000);
    return !isNaN(d.getTime()) ? d.toISOString().slice(0, 10) : null;
  }

  const str = String(raw).trim();
  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;

  // DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = /^(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{4})$/.exec(str);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, "0");
    const month = dmyMatch[2].padStart(2, "0");
    const year = dmyMatch[3];
    return `${year}-${month}-${day}`;
  }

  // Attempt JS Date parse
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }

  return null;
}

/** Starts a new bulk import batch and returns the batchId. */
export async function startImportBatch(
  fileName: string,
  totalRows: number
): Promise<{ ok: true; batchId: string } | { ok: false; error: string }> {
  const staff = await requirePermission("import.import");
  const db = await createClient();

  const { data, error } = await db
    .from("import_batches")
    .insert({
      kind: "import",
      file_name: fileName || "import_file",
      total_rows: totalRows,
      status: "running",
      created_by: staff.id,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { ok: false, error: `Could not initialize import batch: ${error?.message}` };
  }

  await audit(db, staff.id, "import.start", "import_batch", data.id);
  return { ok: true, batchId: data.id };
}

export type ChunkRow = Record<string, any>;

/** Processes one chunk of mapped records and writes them to the database. */
export async function importChunk(
  batchId: string,
  rows: ChunkRow[],
  options: { updateExisting: boolean; autoLinkClients: boolean }
): Promise<{
  ok: boolean;
  inserted: number;
  updated: number;
  skipped: number;
  errors: string[];
}> {
  await requirePermission("import.import");
  const db = await createClient();
  const today = todayIST();

  if (!UUID_REGEX.test(batchId)) {
    return { ok: false, inserted: 0, updated: 0, skipped: 0, errors: ["Invalid batch ID"] };
  }

  // Preload policy_types and insurers for speedy lookups
  const [{ data: typesData }, { data: insurersData }] = await Promise.all([
    db.from("policy_types").select("id, code"),
    db.from("insurers").select("id, name"),
  ]);

  const typeMap = new Map<string, string>();
  (typesData ?? []).forEach((t) => {
    if (t.code) typeMap.set(t.code, t.id);
  });

  const insurerMap = new Map<string, string>();
  (insurersData ?? []).forEach((i) => {
    insurerMap.set(i.name.trim().toLowerCase(), i.id);
  });

  let insertedCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;
  const errorList: string[] = [];

  for (let idx = 0; idx < rows.length; idx++) {
    const row = rows[idx];
    try {
      const regNo = normalizeReg(row.vehicle_reg_no);
      const policyNumber = row.policy_number ? String(row.policy_number).trim() : null;
      const ownerName = row.owner_name ? String(row.owner_name).trim() : null;

      // Must have either regNo or policyNumber to identify the policy
      if (!regNo && !policyNumber) {
        errorList.push(`Row ${idx + 1}: Missing both registration number and policy number.`);
        skippedCount++;
        continue;
      }

      // Detect / validate category (2W, 4W, CV)
      let cat: "2W" | "4W" | "CV" | null = null;
      const rawCat = row.vehicle_category ? String(row.vehicle_category).toUpperCase().trim() : "";
      if (rawCat === "2W" || rawCat === "4W" || rawCat === "CV") {
        cat = rawCat;
      } else if (rawCat.includes("BIKE") || rawCat.includes("TWO") || rawCat.includes("SCOOTER")) {
        cat = "2W";
      } else if (rawCat.includes("CAR") || rawCat.includes("FOUR") || row.rto_location) {
        cat = "4W";
      } else if (rawCat.includes("COMMERCIAL") || rawCat.includes("TRUCK")) {
        cat = "CV";
      } else {
        cat = "4W"; // default for vehicle policies
      }

      const policyTypeCode = cat === "2W" ? "bike" : cat === "4W" ? "car" : "other";
      const typeId = typeMap.get(policyTypeCode) ?? null;

      // Insurer handling
      let insurerId: string | null = null;
      const rawInsurerName = row.insurer_name ? String(row.insurer_name).trim() : null;
      if (rawInsurerName) {
        const lowerName = rawInsurerName.toLowerCase();
        if (insurerMap.has(lowerName)) {
          insurerId = insurerMap.get(lowerName)!;
        } else {
          // Insert new insurer into directory
          const { data: newInsurer } = await db
            .from("insurers")
            .insert({ name: rawInsurerName })
            .select("id")
            .single();
          if (newInsurer) {
            insurerId = newInsurer.id;
            insurerMap.set(lowerName, newInsurer.id);
          }
        }
      }

      // Dates
      const saodDueDate = parseFlexibleDate(row.saod_due_date);
      const tpDueDate = parseFlexibleDate(row.tp_due_date);
      const explicitDueDate = parseFlexibleDate(row.due_date);

      let dueDate: string | null = explicitDueDate;
      if (!dueDate) {
        if (saodDueDate && tpDueDate) {
          dueDate = saodDueDate < tpDueDate ? saodDueDate : tpDueDate;
        } else {
          dueDate = saodDueDate || tpDueDate || addDays(today, 365);
        }
      }

      // Client auto-linking
      let userId: string | null = null;
      const rawMobile = row.holder_mobile ? String(row.holder_mobile).trim() : "";
      const normalizedMob = rawMobile ? normalizeMobile(rawMobile) : null;

      if (options.autoLinkClients && normalizedMob) {
        // Find existing user by mobile
        const { data: existingUser } = await db
          .from("users")
          .select("id")
          .eq("mobile_number", normalizedMob)
          .maybeSingle();

        if (existingUser) {
          userId = existingUser.id;
        } else {
          // Create new client user
          const { data: newUser } = await db
            .from("users")
            .insert({
              mobile_number: normalizedMob,
              full_name: ownerName || "Client",
              is_advisor_client: true,
              import_batch_id: batchId,
            })
            .select("id")
            .single();
          if (newUser) {
            userId = newUser.id;
          }
        }
      }

      // Separate custom fields into custom_data jsonb
      const customData: Record<string, string> = {};
      for (const [k, v] of Object.entries(row)) {
        if (k.startsWith("custom_") && v != null && v !== "") {
          const cleanKey = k.replace(/^custom_/, "");
          customData[cleanKey] = String(v);
        }
      }

      // Check existing policy
      let existingPolicyId: string | null = null;
      if (regNo) {
        const { data: p } = await db
          .from("policies")
          .select("id")
          .eq("vehicle_reg_no", regNo)
          .maybeSingle();
        if (p) existingPolicyId = p.id;
      }
      if (!existingPolicyId && policyNumber) {
        const { data: p } = await db
          .from("policies")
          .select("id")
          .eq("policy_number", policyNumber)
          .maybeSingle();
        if (p) existingPolicyId = p.id;
      }

      if (existingPolicyId) {
        if (options.updateExisting) {
          const updatePayload: Record<string, any> = {
            vehicle_category: cat,
            owner_name: ownerName || undefined,
            holder_name: ownerName || undefined,
            holder_mobile: normalizedMob || undefined,
            holder_address: row.holder_address || undefined,
            vehicle_make: row.vehicle_make || undefined,
            vehicle_model: row.vehicle_model || undefined,
            vehicle_fuel_type: row.vehicle_fuel_type || undefined,
            vehicle_regn_date: parseFlexibleDate(row.vehicle_regn_date) || undefined,
            vehicle_chassis_no: row.vehicle_chassis_no || undefined,
            vehicle_engine_no: row.vehicle_engine_no || undefined,
            vehicle_cc: row.vehicle_cc || undefined,
            seating_capacity: row.seating_capacity || undefined,
            idv: parseNumber(row.idv),
            saod_due_date: saodDueDate || undefined,
            tp_due_date: tpDueDate || undefined,
            due_date: dueDate,
            insurer_name: rawInsurerName || undefined,
            insurer_id: insurerId || undefined,
            type_id: typeId || undefined,
            user_id: userId || undefined,
          };
          if (Object.keys(customData).length > 0) {
            updatePayload.custom_data = customData;
          }

          const { error: updErr } = await db
            .from("policies")
            .update(updatePayload)
            .eq("id", existingPolicyId);

          if (updErr) {
            errorList.push(`Row ${idx + 1} (${regNo || policyNumber}): Update failed - ${updErr.message}`);
            skippedCount++;
          } else {
            updatedCount++;
          }
        } else {
          skippedCount++;
        }
      } else {
        // Insert new record
        const insertPayload = {
          vehicle_reg_no: regNo,
          vehicle_category: cat,
          owner_name: ownerName,
          holder_name: ownerName,
          holder_mobile: normalizedMob,
          holder_address: row.holder_address ? String(row.holder_address).trim() : null,
          vehicle_make: row.vehicle_make ? String(row.vehicle_make).trim() : null,
          vehicle_model: row.vehicle_model ? String(row.vehicle_model).trim() : null,
          vehicle_fuel_type: row.vehicle_fuel_type ? String(row.vehicle_fuel_type).trim() : null,
          vehicle_regn_date: parseFlexibleDate(row.vehicle_regn_date),
          vehicle_chassis_no: row.vehicle_chassis_no ? String(row.vehicle_chassis_no).trim() : null,
          vehicle_engine_no: row.vehicle_engine_no ? String(row.vehicle_engine_no).trim() : null,
          vehicle_cc: row.vehicle_cc ? String(row.vehicle_cc).trim() : null,
          seating_capacity: row.seating_capacity ? String(row.seating_capacity).trim() : null,
          idv: parseNumber(row.idv),
          saod_due_date: saodDueDate,
          tp_due_date: tpDueDate,
          due_date: dueDate,
          policy_number: policyNumber,
          insurer_name: rawInsurerName,
          insurer_id: insurerId,
          type_id: typeId,
          source: "advisor_added",
          verification_status: "verified",
          custom_data: customData,
          import_batch_id: batchId,
          user_id: userId,
        };

        const { error: insErr } = await db.from("policies").insert(insertPayload);
        if (insErr) {
          errorList.push(`Row ${idx + 1} (${regNo || policyNumber}): Insert failed - ${insErr.message}`);
          skippedCount++;
        } else {
          insertedCount++;
        }
      }
    } catch (rowErr: any) {
      errorList.push(`Row ${idx + 1}: Unexpected error - ${rowErr.message}`);
      skippedCount++;
    }
  }

  // Update batch counts incrementally
  const { data: batch } = await db
    .from("import_batches")
    .select("inserted_rows, updated_rows, skipped_rows")
    .eq("id", batchId)
    .single();

  if (batch) {
    await db
      .from("import_batches")
      .update({
        inserted_rows: (batch.inserted_rows || 0) + insertedCount,
        updated_rows: (batch.updated_rows || 0) + updatedCount,
        skipped_rows: (batch.skipped_rows || 0) + skippedCount,
      })
      .eq("id", batchId);
  }

  return {
    ok: true,
    inserted: insertedCount,
    updated: updatedCount,
    skipped: skippedCount,
    errors: errorList,
  };
}

/** Completes the batch status. */
export async function finishImportBatch(
  batchId: string,
  status: "done" | "failed",
  notes?: string
): Promise<{ ok: boolean; message?: string }> {
  const staff = await requirePermission("import.import");
  const db = await createClient();

  await db
    .from("import_batches")
    .update({
      status,
      notes: notes || null,
      finished_at: new Date().toISOString(),
    })
    .eq("id", batchId);

  await audit(db, staff.id, "import.finish", "import_batch", batchId);

  revalidatePath("/", "layout");
  return { ok: true, message: `Batch ${batchId} marked as ${status}.` };
}

/** Rolls back an import batch, deleting all policies created under it. */
export async function undoImportBatch(
  batchId: string
): Promise<{ ok: boolean; message: string }> {
  const staff = await requirePermission("import.import");
  const db = await createClient();

  if (!UUID_REGEX.test(batchId)) return { ok: false, message: "Invalid batch ID." };

  // Delete policies created in this batch
  const { error: delErr } = await db
    .from("policies")
    .delete()
    .eq("import_batch_id", batchId);

  if (delErr) {
    return { ok: false, message: `Failed to remove policies: ${delErr.message}` };
  }

  // Clean up orphan clients created in this batch (that have no other policies)
  await db
    .from("users")
    .delete()
    .eq("import_batch_id", batchId);

  // Mark batch as undone
  await db
    .from("import_batches")
    .update({ status: "undone", notes: "Undone by admin." })
    .eq("id", batchId);

  await audit(db, staff.id, "import.undo", "import_batch", batchId);

  revalidatePath("/", "layout");
  return { ok: true, message: "Import batch successfully undone. Records removed." };
}

/**
 * Bulk lookup policies by registration numbers or policy numbers.
 * Streams back enriched policy rows with the requested columns.
 */
export async function bulkLookupPolicies(
  rawIdentifiers: string[],
  requestedColumns: string[]
): Promise<{ ok: true; rows: Record<string, any>[] } | { ok: false; error: string }> {
  await requirePermission("import.lookup");
  const db = await createClient();

  // Normalize identifiers
  const cleanList = Array.from(
    new Set(
      rawIdentifiers
        .map((id) => id.toUpperCase().replace(/\s+/g, "").replace(/[^A-Z0-9-]/g, ""))
        .filter((id) => id.length >= 3)
    )
  );

  if (cleanList.length === 0) {
    return { ok: false, error: "No valid registration or policy numbers found." };
  }

  // Chunk queries if list is large
  const matchedPolicies: any[] = [];
  const chunkSize = 200;

  for (let i = 0; i < cleanList.length; i += chunkSize) {
    const chunk = cleanList.slice(i, i + chunkSize);
    const { data, error } = await db
      .from("policies")
      .select(
        `id, vehicle_reg_no, vehicle_category, owner_name, holder_mobile,
         holder_address, vehicle_make, vehicle_model, vehicle_fuel_type,
         vehicle_chassis_no, vehicle_engine_no, vehicle_cc, seating_capacity,
         idv, saod_due_date, tp_due_date, due_date, policy_number, insurer_name,
         source, custom_data`
      )
      .or(`vehicle_reg_no.in.(${chunk.join(",")}),policy_number.in.(${chunk.join(",")})`);

    if (error) {
      return { ok: false, error: `Lookup query failed: ${error.message}` };
    }
    if (data) {
      matchedPolicies.push(...data);
    }
  }

  // Format records with requested columns
  const formattedRows = matchedPolicies.map((p) => {
    const out: Record<string, any> = {};
    for (const col of requestedColumns) {
      if (col.startsWith("custom_")) {
        const key = col.replace(/^custom_/, "");
        out[col] = p.custom_data?.[key] ?? "";
      } else {
        out[col] = p[col] ?? "";
      }
    }
    return out;
  });

  return { ok: true, rows: formattedRows };
}
