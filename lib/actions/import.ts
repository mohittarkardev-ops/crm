"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { audit, authorize, dbMessage, normalizeMobile } from "@/lib/actions/shared";
import { addDays, todayIST } from "@/lib/data/helpers";

/**
 * Server actions for Bulk Import & Bulk Lookup (S8).
 * Batched queries avoid Vercel serverless timeouts and safely isolate errors.
 */

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_RETURNED_ERRORS = 50;

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

/** Parses YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY, or Excel serial numbers. */
function parseFlexibleDate(raw: unknown): string | null {
  if (raw === null || raw === undefined || raw === "") return null;
  if (typeof raw === "number") {
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const d = new Date(excelEpoch.getTime() + raw * 86_400_000);
    return !isNaN(d.getTime()) ? d.toISOString().slice(0, 10) : null;
  }

  const str = String(raw).trim();
  if (!str) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;

  const dmyMatch = /^(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{4})$/.exec(str);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, "0");
    const month = dmyMatch[2].padStart(2, "0");
    const year = dmyMatch[3];
    return `${year}-${month}-${day}`;
  }

  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }
  return null;
}

/** Recognizes explicit 2W/4W/CV category tokens; returns null when missing or unknown. */
function parseExplicitCategory(raw: unknown): "2W" | "4W" | "CV" | null {
  if (raw === null || raw === undefined) return null;
  const rawCat = String(raw).toUpperCase().trim();
  if (!rawCat) return null;
  if (rawCat === "2W" || rawCat === "4W" || rawCat === "CV") return rawCat;
  if (rawCat.includes("BIKE") || rawCat.includes("TWO") || rawCat.includes("SCOOTER")) return "2W";
  if (rawCat.includes("CAR") || rawCat.includes("FOUR")) return "4W";
  if (rawCat.includes("COMMERCIAL") || rawCat.includes("TRUCK")) return "CV";
  return null;
}

/** Starts a new bulk import batch and returns the batchId. */
export async function startImportBatch(
  fileName: string,
  totalRows: number,
): Promise<{ ok: true; batchId: string } | { ok: false; error: string }> {
  const auth = await authorize("import.import");
  if (!auth.staff) return { ok: false, error: auth.error.error ?? "Permission denied." };
  const staff = auth.staff;
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
  return { ok: true, batchId: data.id as string };
}

export type ChunkRow = Record<string, unknown>;

type ParsedRow = {
  idx: number;
  raw: ChunkRow;
  regNo: string | null;
  policyNumber: string | null;
  ownerName: string | null;
  normalizedMob: string | null;
  invalidMobProvided: boolean;
  rawInsurerName: string | null;
  explicitCat: "2W" | "4W" | "CV" | null;
  saodDueDate: string | null;
  tpDueDate: string | null;
  explicitDueDate: string | null;
  hasActualDueDate: boolean;
  resolvedDueDate: string;
  customData: Record<string, string>;
};

/** Processes one chunk of mapped records using batched DB lookups and writes. */
export async function importChunk(
  batchId: string,
  rows: ChunkRow[],
  options: { updateExisting: boolean; autoLinkClients: boolean },
): Promise<{
  ok: boolean;
  inserted: number;
  updated: number;
  skipped: number;
  errors: string[];
  warnings?: string[];
}> {
  const auth = await authorize("import.import");
  if (!auth.staff) {
    return {
      ok: false,
      inserted: 0,
      updated: 0,
      skipped: 0,
      errors: [auth.error.error ?? "Permission denied."],
    };
  }
  if (!UUID_REGEX.test(batchId)) {
    return { ok: false, inserted: 0, updated: 0, skipped: 0, errors: ["Invalid batch ID."] };
  }
  if (rows.length === 0) {
    return { ok: true, inserted: 0, updated: 0, skipped: 0, errors: [] };
  }

  const db = await createClient();
  const today = todayIST();
  const errorList: string[] = [];
  const pushErr = (msg: string) => {
    if (errorList.length < MAX_RETURNED_ERRORS) errorList.push(msg);
  };

  let insertedCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;
  let defaultedDatesCount = 0;
  let invalidMobileCount = 0;

  // 1. Parse and normalize rows in memory first
  const parsedRows: ParsedRow[] = [];
  for (let idx = 0; idx < rows.length; idx++) {
    const row = rows[idx] ?? {};
    const regNo = normalizeReg(row.vehicle_reg_no);
    const policyNumber = row.policy_number ? String(row.policy_number).trim() : null;

    if (!regNo && !policyNumber) {
      pushErr(`Row ${idx + 1}: Missing both registration number and policy number.`);
      skippedCount++;
      continue;
    }

    const ownerName = row.owner_name ? String(row.owner_name).trim() : null;
    const rawMobile = row.holder_mobile ? String(row.holder_mobile).trim() : "";
    const normalizedMob = rawMobile ? normalizeMobile(rawMobile) : null;
    const invalidMobProvided = Boolean(rawMobile && !normalizedMob);
    if (invalidMobProvided) invalidMobileCount++;

    const rawInsurerName = row.insurer_name ? String(row.insurer_name).trim() : null;
    const explicitCat = parseExplicitCategory(row.vehicle_category);
    const saodDueDate = parseFlexibleDate(row.saod_due_date);
    const tpDueDate = parseFlexibleDate(row.tp_due_date);
    const explicitDueDate = parseFlexibleDate(row.due_date);

    let resolvedDueDate = explicitDueDate;
    if (!resolvedDueDate) {
      if (saodDueDate && tpDueDate) {
        resolvedDueDate = saodDueDate < tpDueDate ? saodDueDate : tpDueDate;
      } else {
        resolvedDueDate = saodDueDate || tpDueDate || addDays(today, 365);
      }
    }
    const hasActualDueDate = Boolean(explicitDueDate || saodDueDate || tpDueDate);

    const customData: Record<string, string> = {};
    for (const [k, v] of Object.entries(row)) {
      if (k.startsWith("custom_") && v != null && v !== "") {
        customData[k.replace(/^custom_/, "")] = String(v);
      }
    }

    parsedRows.push({
      idx,
      raw: row,
      regNo,
      policyNumber,
      ownerName,
      normalizedMob,
      invalidMobProvided,
      rawInsurerName,
      explicitCat,
      saodDueDate,
      tpDueDate,
      explicitDueDate,
      hasActualDueDate,
      resolvedDueDate,
      customData,
    });
  }

  if (parsedRows.length === 0) {
    return { ok: true, inserted: 0, updated: 0, skipped: skippedCount, errors: errorList };
  }

  // 2. Preload policy_types & existing insurers
  const [{ data: typesData }, { data: insurersData }] = await Promise.all([
    db.from("policy_types").select("id, code"),
    db.from("insurers").select("id, name"),
  ]);

  const typeMap = new Map<string, string>();
  for (const t of typesData ?? []) {
    if (t.code) typeMap.set(t.code as string, t.id as string);
  }

  const insurerMap = new Map<string, string>();
  for (const ins of insurersData ?? []) {
    insurerMap.set(String(ins.name).trim().toLowerCase(), ins.id as string);
  }

  // Batch-insert any new insurers referenced in this chunk
  const missingInsurers = new Map<string, string>();
  for (const pr of parsedRows) {
    if (pr.rawInsurerName) {
      const lower = pr.rawInsurerName.toLowerCase();
      if (!insurerMap.has(lower) && !missingInsurers.has(lower)) {
        missingInsurers.set(lower, pr.rawInsurerName);
      }
    }
  }
  if (missingInsurers.size > 0) {
    const names = Array.from(missingInsurers.values()).map((name) => ({ name }));
    const { data: insertedIns, error: insErr } = await db
      .from("insurers")
      .insert(names)
      .select("id, name");
    if (!insErr && insertedIns) {
      for (const row of insertedIns) {
        insurerMap.set(String(row.name).trim().toLowerCase(), row.id as string);
      }
    } else {
      // Fallback row-by-row only on race/conflict
      for (const name of missingInsurers.values()) {
        const lower = name.toLowerCase();
        const { data: created } = await db.from("insurers").insert({ name }).select("id").maybeSingle();
        if (created) {
          insurerMap.set(lower, created.id as string);
        } else {
          const { data: retry } = await db.from("insurers").select("id").ilike("name", name).limit(1).maybeSingle();
          if (retry) insurerMap.set(lower, retry.id as string);
        }
      }
    }
  }

  // 3. Batch-lookup and batch-create client accounts (when autoLinkClients is enabled)
  const userByMobile = new Map<string, string>();
  if (options.autoLinkClients) {
    const uniqueMobiles = Array.from(
      new Set(parsedRows.map((p) => p.normalizedMob).filter((m): m is string => Boolean(m))),
    );
    for (let i = 0; i < uniqueMobiles.length; i += 200) {
      const slice = uniqueMobiles.slice(i, i + 200);
      const { data: usersData } = await db
        .from("users")
        .select("id, mobile_number")
        .in("mobile_number", slice);
      for (const u of usersData ?? []) {
        userByMobile.set(u.mobile_number as string, u.id as string);
      }
    }

    const toCreateUsers = new Map<string, string>();
    for (const pr of parsedRows) {
      if (pr.normalizedMob && !userByMobile.has(pr.normalizedMob) && !toCreateUsers.has(pr.normalizedMob)) {
        toCreateUsers.set(pr.normalizedMob, pr.ownerName || "Client");
      }
    }
    if (toCreateUsers.size > 0) {
      const userPayloads = Array.from(toCreateUsers.entries()).map(([mobile_number, full_name]) => ({
        mobile_number,
        full_name,
        is_advisor_client: true,
        import_batch_id: batchId,
      }));
      for (let i = 0; i < userPayloads.length; i += 200) {
        const slice = userPayloads.slice(i, i + 200);
        const { data: createdUsers, error: uErr } = await db
          .from("users")
          .insert(slice)
          .select("id, mobile_number");
        if (!uErr && createdUsers) {
          for (const u of createdUsers) {
            userByMobile.set(u.mobile_number as string, u.id as string);
          }
        } else {
          // Fallback row-by-row if a concurrent duplicate happened
          for (const payload of slice) {
            const { data: oneUser } = await db
              .from("users")
              .insert(payload)
              .select("id")
              .maybeSingle();
            if (oneUser) {
              userByMobile.set(payload.mobile_number, oneUser.id as string);
            } else {
              const { data: retry } = await db
                .from("users")
                .select("id")
                .eq("mobile_number", payload.mobile_number)
                .limit(1)
                .maybeSingle();
              if (retry) userByMobile.set(payload.mobile_number, retry.id as string);
            }
          }
        }
      }
    }
  }

  // 4. Batch-lookup existing policies by vehicle_reg_no and policy_number
  type ExistingPolicyRef = { id: string; customData: Record<string, string> };
  const policyByReg = new Map<string, ExistingPolicyRef>();
  const policyByNo = new Map<string, ExistingPolicyRef>();

  const uniqueRegs = Array.from(new Set(parsedRows.map((p) => p.regNo).filter((v): v is string => Boolean(v))));
  const uniquePolicyNos = Array.from(
    new Set(parsedRows.map((p) => p.policyNumber).filter((v): v is string => Boolean(v))),
  );

  for (let i = 0; i < uniqueRegs.length; i += 200) {
    const slice = uniqueRegs.slice(i, i + 200);
    const { data: foundByReg } = await db
      .from("policies")
      .select("id, vehicle_reg_no, custom_data, due_date")
      .in("vehicle_reg_no", slice)
      .order("due_date", { ascending: false });
    for (const p of foundByReg ?? []) {
      const key = p.vehicle_reg_no as string | null;
      if (key && !policyByReg.has(key)) {
        policyByReg.set(key, {
          id: p.id as string,
          customData: (p.custom_data as Record<string, string> | null) ?? {},
        });
      }
    }
  }

  for (let i = 0; i < uniquePolicyNos.length; i += 200) {
    const slice = uniquePolicyNos.slice(i, i + 200);
    const { data: foundByNo } = await db
      .from("policies")
      .select("id, policy_number, custom_data, due_date")
      .in("policy_number", slice)
      .order("due_date", { ascending: false });
    for (const p of foundByNo ?? []) {
      const key = p.policy_number as string | null;
      if (key && !policyByNo.has(key)) {
        policyByNo.set(key, {
          id: p.id as string,
          customData: (p.custom_data as Record<string, string> | null) ?? {},
        });
      }
    }
  }

  // 5. Partition rows into inserts and updates
  const seenRegsInChunk = new Set<string>();
  const seenPolicyNosInChunk = new Set<string>();

  const inserts: { idx: number; label: string; payload: Record<string, unknown> }[] = [];
  const updates: { id: string; idx: number; label: string; payload: Record<string, unknown> }[] = [];

  for (const pr of parsedRows) {
    const row = pr.raw;
    const label = pr.regNo || pr.policyNumber || `row ${pr.idx + 1}`;
    const existing =
      (pr.regNo ? policyByReg.get(pr.regNo) : undefined) ??
      (pr.policyNumber ? policyByNo.get(pr.policyNumber) : undefined);

    const insurerId = pr.rawInsurerName ? (insurerMap.get(pr.rawInsurerName.toLowerCase()) ?? null) : null;
    const userId = pr.normalizedMob ? (userByMobile.get(pr.normalizedMob) ?? null) : null;

    if (existing) {
      if (!options.updateExisting) {
        skippedCount++;
        continue;
      }

      const updatePayload: Record<string, unknown> = {};
      if (pr.explicitCat) {
        updatePayload.vehicle_category = pr.explicitCat;
        const typeCode = pr.explicitCat === "2W" ? "bike" : pr.explicitCat === "4W" ? "car" : "other";
        const typeId = typeMap.get(typeCode) ?? null;
        if (typeId) updatePayload.type_id = typeId;
      }
      if (pr.ownerName) {
        updatePayload.owner_name = pr.ownerName;
        updatePayload.holder_name = pr.ownerName;
      }
      if (pr.normalizedMob) updatePayload.holder_mobile = pr.normalizedMob;
      if (row.holder_address) updatePayload.holder_address = String(row.holder_address).trim();
      if (row.vehicle_make) updatePayload.vehicle_make = String(row.vehicle_make).trim();
      if (row.vehicle_model) updatePayload.vehicle_model = String(row.vehicle_model).trim();
      if (row.vehicle_fuel_type) updatePayload.vehicle_fuel_type = String(row.vehicle_fuel_type).trim();
      if (row.vehicle_regn_date) {
        const d = parseFlexibleDate(row.vehicle_regn_date);
        if (d) updatePayload.vehicle_regn_date = d;
      }
      if (row.vehicle_chassis_no) updatePayload.vehicle_chassis_no = String(row.vehicle_chassis_no).trim();
      if (row.vehicle_engine_no) updatePayload.vehicle_engine_no = String(row.vehicle_engine_no).trim();
      if (row.vehicle_cc) updatePayload.vehicle_cc = String(row.vehicle_cc).trim();
      if (row.seating_capacity) updatePayload.seating_capacity = String(row.seating_capacity).trim();
      if (row.rto_location) updatePayload.rto_location = String(row.rto_location).trim();
      if (row.pin) updatePayload.pin = String(row.pin).trim();
      if (row.pin_2) updatePayload.pin_2 = String(row.pin_2).trim();
      if (row.vehicle_mfy) updatePayload.vehicle_mfy = String(row.vehicle_mfy).trim();

      const idvVal = parseNumber(row.idv);
      if (idvVal !== null) updatePayload.idv = idvVal;
      if (pr.saodDueDate) updatePayload.saod_due_date = pr.saodDueDate;
      if (pr.tpDueDate) updatePayload.tp_due_date = pr.tpDueDate;
      if (pr.hasActualDueDate) updatePayload.due_date = pr.resolvedDueDate;

      if (pr.rawInsurerName) {
        updatePayload.insurer_name = pr.rawInsurerName;
        if (insurerId) updatePayload.insurer_id = insurerId;
      }
      if (userId) updatePayload.user_id = userId;
      if (Object.keys(pr.customData).length > 0) {
        updatePayload.custom_data = { ...existing.customData, ...pr.customData };
      }

      if (Object.keys(updatePayload).length === 0) {
        skippedCount++;
        continue;
      }
      updates.push({ id: existing.id, idx: pr.idx, label, payload: updatePayload });
    } else {
      // Deduplicate duplicate entries within the same chunk cleanly
      if (
        (pr.regNo && seenRegsInChunk.has(pr.regNo)) ||
        (pr.policyNumber && seenPolicyNosInChunk.has(pr.policyNumber))
      ) {
        pushErr(`Row ${pr.idx + 1} (${label}): Duplicate entry within the same file.`);
        skippedCount++;
        continue;
      }
      if (pr.regNo) seenRegsInChunk.add(pr.regNo);
      if (pr.policyNumber) seenPolicyNosInChunk.add(pr.policyNumber);

      if (!pr.hasActualDueDate) defaultedDatesCount++;

      const insertCat = pr.explicitCat ?? "4W";
      const insertTypeCode = insertCat === "2W" ? "bike" : insertCat === "4W" ? "car" : "other";
      const insertTypeId = typeMap.get(insertTypeCode) ?? null;

      inserts.push({
        idx: pr.idx,
        label,
        payload: {
          vehicle_reg_no: pr.regNo,
          vehicle_category: insertCat,
          owner_name: pr.ownerName,
          holder_name: pr.ownerName,
          holder_mobile: pr.normalizedMob,
          holder_address: row.holder_address ? String(row.holder_address).trim() : null,
          vehicle_make: row.vehicle_make ? String(row.vehicle_make).trim() : null,
          vehicle_model: row.vehicle_model ? String(row.vehicle_model).trim() : null,
          vehicle_fuel_type: row.vehicle_fuel_type ? String(row.vehicle_fuel_type).trim() : null,
          vehicle_regn_date: parseFlexibleDate(row.vehicle_regn_date),
          vehicle_chassis_no: row.vehicle_chassis_no ? String(row.vehicle_chassis_no).trim() : null,
          vehicle_engine_no: row.vehicle_engine_no ? String(row.vehicle_engine_no).trim() : null,
          vehicle_cc: row.vehicle_cc ? String(row.vehicle_cc).trim() : null,
          seating_capacity: row.seating_capacity ? String(row.seating_capacity).trim() : null,
          rto_location: row.rto_location ? String(row.rto_location).trim() : null,
          pin: row.pin ? String(row.pin).trim() : null,
          pin_2: row.pin_2 ? String(row.pin_2).trim() : null,
          vehicle_mfy: row.vehicle_mfy ? String(row.vehicle_mfy).trim() : null,
          idv: parseNumber(row.idv),
          saod_due_date: pr.saodDueDate,
          tp_due_date: pr.tpDueDate,
          due_date: pr.resolvedDueDate,
          policy_number: pr.policyNumber,
          insurer_name: pr.rawInsurerName,
          insurer_id: insurerId,
          type_id: insertTypeId,
          source: "advisor_added",
          verification_status: "verified",
          custom_data: pr.customData,
          import_batch_id: batchId,
          user_id: userId,
        },
      });
    }
  }

  // 6. Execute bulk inserts (with row-level fallback if a constraint fails inside a sub-batch)
  for (let i = 0; i < inserts.length; i += 100) {
    const slice = inserts.slice(i, i + 100);
    const { error: bulkErr } = await db.from("policies").insert(slice.map((item) => item.payload));
    if (!bulkErr) {
      insertedCount += slice.length;
    } else {
      for (const item of slice) {
        const { error: singleErr } = await db.from("policies").insert(item.payload);
        if (singleErr) {
          pushErr(`Row ${item.idx + 1} (${item.label}): Insert failed - ${dbMessage(singleErr)}`);
          skippedCount++;
        } else {
          insertedCount++;
        }
      }
    }
  }

  // 7. Execute updates in parallel batches of 20
  for (let i = 0; i < updates.length; i += 20) {
    const slice = updates.slice(i, i + 20);
    const results = await Promise.all(
      slice.map(async (item) => {
        const { error: updErr } = await db.from("policies").update(item.payload).eq("id", item.id);
        return { item, updErr };
      }),
    );
    for (const { item, updErr } of results) {
      if (updErr) {
        pushErr(`Row ${item.idx + 1} (${item.label}): Update failed - ${dbMessage(updErr)}`);
        skippedCount++;
      } else {
        updatedCount++;
      }
    }
  }

  // 8. Increment batch counters
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

  const warnings: string[] = [];
  if (defaultedDatesCount > 0) {
    warnings.push(`${defaultedDatesCount} inserted row(s) had no due date and defaulted to +1 year.`);
  }
  if (invalidMobileCount > 0) {
    warnings.push(`${invalidMobileCount} row(s) had invalid mobile numbers (client link skipped).`);
  }

  return {
    ok: true,
    inserted: insertedCount,
    updated: updatedCount,
    skipped: skippedCount,
    errors: errorList,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

/** Completes the batch status. */
export async function finishImportBatch(
  batchId: string,
  status: "done" | "failed",
  notes?: string,
): Promise<{ ok: boolean; message?: string }> {
  const auth = await authorize("import.import");
  if (!auth.staff) return { ok: false, message: auth.error.error };
  if (!UUID_REGEX.test(batchId)) return { ok: false, message: "Invalid batch ID." };
  const staff = auth.staff;
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

/** Rolls back an import batch cleanly, preserving any clients who have policies or app logins. */
export async function undoImportBatch(
  batchId: string,
): Promise<{ ok: boolean; message: string }> {
  const auth = await authorize("import.import");
  if (!auth.staff) return { ok: false, message: auth.error.error ?? "Permission denied." };
  const staff = auth.staff;
  const db = await createClient();

  if (!UUID_REGEX.test(batchId)) return { ok: false, message: "Invalid batch ID." };

  const { data: batch } = await db
    .from("import_batches")
    .select("status")
    .eq("id", batchId)
    .maybeSingle();
  if (!batch) return { ok: false, message: "Import batch not found." };
  if (batch.status === "undone") return { ok: false, message: "This batch was already undone." };

  // 1. Delete policies created in this batch
  const { error: delErr } = await db
    .from("policies")
    .delete()
    .eq("import_batch_id", batchId);

  if (delErr) {
    return { ok: false, message: `Failed to remove policies: ${dbMessage(delErr)}` };
  }

  // 2. Find clients created in this batch; keep anyone who registered or has any remaining policies
  const { data: batchUsers } = await db
    .from("users")
    .select("id, auth_user_id")
    .eq("import_batch_id", batchId);

  const userRows = (batchUsers ?? []) as { id: string; auth_user_id: string | null }[];
  if (userRows.length > 0) {
    const usersWithOtherPolicies = new Set<string>();
    const batchUserIds = userRows.map((u) => u.id);

    for (let i = 0; i < batchUserIds.length; i += 200) {
      const slice = batchUserIds.slice(i, i + 200);
      const { data: remaining } = await db
        .from("policies")
        .select("user_id")
        .in("user_id", slice);
      for (const r of remaining ?? []) {
        if (r.user_id) usersWithOtherPolicies.add(r.user_id as string);
      }
    }

    const toDeleteIds: string[] = [];
    const toKeepIds: string[] = [];
    for (const u of userRows) {
      if (u.auth_user_id !== null || usersWithOtherPolicies.has(u.id)) {
        toKeepIds.push(u.id);
      } else {
        toDeleteIds.push(u.id);
      }
    }

    // Clear import_batch_id on kept clients so they are no longer tied to this undone batch
    for (let i = 0; i < toKeepIds.length; i += 200) {
      await db.from("users").update({ import_batch_id: null }).in("id", toKeepIds.slice(i, i + 200));
    }

    // Delete only safe orphan clients
    for (let i = 0; i < toDeleteIds.length; i += 200) {
      await db.from("users").delete().in("id", toDeleteIds.slice(i, i + 200));
    }
  }

  // 3. Mark batch as undone
  await db
    .from("import_batches")
    .update({ status: "undone", notes: "Undone by admin." })
    .eq("id", batchId);

  await audit(db, staff.id, "import.undo", "import_batch", batchId);

  revalidatePath("/", "layout");
  return { ok: true, message: "Import batch undone. Created policies removed; clients with other policies preserved." };
}

/**
 * Bulk lookup policies by registration numbers or policy numbers.
 * Also returns which normalized identifiers did not match any record.
 */
export async function bulkLookupPolicies(
  rawIdentifiers: string[],
  requestedColumns: string[],
): Promise<
  | { ok: true; rows: Record<string, unknown>[]; searchedCount: number; unmatched: string[] }
  | { ok: false; error: string }
> {
  const auth = await authorize("import.lookup");
  if (!auth.staff) return { ok: false, error: auth.error.error ?? "Permission denied." };
  const db = await createClient();

  const cleanList = Array.from(
    new Set(
      rawIdentifiers
        .map((id) => id.toUpperCase().replace(/\s+/g, "").replace(/[^A-Z0-9-]/g, ""))
        .filter((id) => id.length >= 3),
    ),
  );

  if (cleanList.length === 0) {
    return { ok: false, error: "No valid registration or policy numbers found." };
  }

  const matchedPolicies: Record<string, any>[] = [];
  const chunkSize = 200;

  for (let i = 0; i < cleanList.length; i += chunkSize) {
    const chunk = cleanList.slice(i, i + chunkSize);
    const quoted = chunk.map((v) => `"${v}"`).join(",");
    const { data, error } = await db
      .from("policies")
      .select(
        `id, vehicle_reg_no, vehicle_category, owner_name, holder_mobile,
         holder_address, vehicle_make, vehicle_model, vehicle_fuel_type,
         vehicle_chassis_no, vehicle_engine_no, vehicle_cc, seating_capacity,
         rto_location, pin, pin_2, vehicle_mfy,
         idv, saod_due_date, tp_due_date, due_date, policy_number, insurer_name,
         source, custom_data`,
      )
      .or(`vehicle_reg_no.in.(${quoted}),policy_number.in.(${quoted})`);

    if (error) {
      return { ok: false, error: `Lookup query failed: ${error.message}` };
    }
    if (data) {
      matchedPolicies.push(...data);
    }
  }

  const matchedTokens = new Set<string>();
  for (const p of matchedPolicies) {
    if (p.vehicle_reg_no) {
      matchedTokens.add(String(p.vehicle_reg_no).toUpperCase().replace(/\s+/g, "").replace(/[^A-Z0-9-]/g, ""));
    }
    if (p.policy_number) {
      matchedTokens.add(String(p.policy_number).toUpperCase().replace(/\s+/g, "").replace(/[^A-Z0-9-]/g, ""));
    }
  }
  const unmatched = cleanList.filter((id) => !matchedTokens.has(id));

  const formattedRows = matchedPolicies.map((p) => {
    const out: Record<string, unknown> = {};
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

  return { ok: true, rows: formattedRows, searchedCount: cleanList.length, unmatched };
}
