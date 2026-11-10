"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { audit, authorize, dbMessage, done, fail, normalizeMobile } from "@/lib/actions/shared";
import { todayIST } from "@/lib/data/helpers";
import type { ActionState } from "@/lib/module-types";
import {
  applyGridFilters,
  getGridPage,
  policyStatus,
  resolveGridTypeIds,
  type GridCursor,
  type GridFilter,
  type SortDir,
  type SortField,
} from "@/lib/data/data-grid";

/**
 * Server actions for the Data Grid (S7).
 * All actions enforce RBAC via `authorize(...)` or `getGridPage`.
 */

const EDITABLE_FIELDS: Record<string, { col: string; validate?: (v: string) => string | null }> = {
  owner_name: { col: "owner_name", validate: (v) => (v.length > 120 ? "Max 120 characters." : null) },
  vehicle_reg_no: {
    col: "vehicle_reg_no",
    validate: (v) => (v && !/^[A-Z0-9-]{2,20}$/.test(v.toUpperCase()) ? "Invalid registration number." : null),
  },
  holder_mobile: {
    col: "holder_mobile",
    validate: (v) => (v && !normalizeMobile(v) ? "Enter a valid 10-digit Indian mobile number." : null),
  },
  vehicle_make: { col: "vehicle_make", validate: (v) => (v.length > 100 ? "Max 100 characters." : null) },
  vehicle_model: { col: "vehicle_model", validate: (v) => (v.length > 100 ? "Max 100 characters." : null) },
  insurer_name: { col: "insurer_name", validate: (v) => (v.length > 120 ? "Max 120 characters." : null) },
  policy_number: { col: "policy_number", validate: (v) => (v.length > 60 ? "Max 60 characters." : null) },
  idv: {
    col: "idv",
    validate: (v) => {
      if (!v) return null;
      const n = Number(v.replace(/,/g, ""));
      return !Number.isFinite(n) || n < 0 || n > 1_000_000_000 ? "Invalid IDV." : null;
    },
  },
  saod_due_date: {
    col: "saod_due_date",
    validate: (v) => (v && !/^\d{4}-\d{2}-\d{2}$/.test(v) ? "Use YYYY-MM-DD format." : null),
  },
  tp_due_date: {
    col: "tp_due_date",
    validate: (v) => (v && !/^\d{4}-\d{2}-\d{2}$/.test(v) ? "Use YYYY-MM-DD format." : null),
  },
};

/** Saves a single cell edit. Syncs `insurer_id` and recalculates `due_date` (earliest of SAOD/TP). */
export async function saveGridCell(
  policyId: string,
  field: string,
  rawValue: string,
  isCustom: boolean,
): Promise<ActionState> {
  const auth = await authorize("datagrid.edit");
  if (!auth.staff) return auth.error;
  const staff = auth.staff;
  const db = await createClient();

  if (!policyId || !/^[0-9a-f-]{36}$/i.test(policyId)) return fail("Invalid policy ID.");

  if (isCustom) {
    const key = field.trim();
    if (!key || !/^[a-z0-9_]{1,60}$/.test(key)) return fail("Invalid custom field key.");
    const value = rawValue.trim();

    const { data: row, error: readErr } = await db
      .from("policies")
      .select("custom_data")
      .eq("id", policyId)
      .single();
    if (readErr || !row) return fail("Policy not found.");

    const current = (row.custom_data as Record<string, string>) ?? {};
    const merged = value
      ? { ...current, [key]: value }
      : Object.fromEntries(Object.entries(current).filter(([k]) => k !== key));

    const { error } = await db.from("policies").update({ custom_data: merged }).eq("id", policyId);
    if (error) return fail(`Could not save: ${dbMessage(error)}`);

    await audit(db, staff.id, "policy.edit", "policy", policyId);
    revalidatePath("/data-grid");
    return done("Saved.", { values: { savedValue: value } });
  }

  const def = EDITABLE_FIELDS[field];
  if (!def) return fail(`Field "${field}" cannot be edited here.`);

  const value = rawValue.trim();
  const validationError = def.validate ? def.validate(value) : null;
  if (validationError) return fail(validationError);

  let dbValue: string | number | null = value || null;
  if (field === "idv" && value) dbValue = Number(value.replace(/,/g, ""));
  if (field === "vehicle_reg_no" && value) dbValue = value.toUpperCase().replace(/\s+/g, "");
  if (field === "holder_mobile" && value) dbValue = normalizeMobile(value);

  const updateData: Record<string, unknown> = { [def.col]: dbValue };
  const returnValues: Record<string, string> = {
    savedValue: dbValue === null ? "" : String(dbValue),
  };

  // Sync insurer_id FK when editing insurer_name
  if (field === "insurer_name") {
    if (!value) {
      updateData.insurer_id = null;
    } else {
      const { data: hit } = await db.from("insurers").select("id, name").ilike("name", value).limit(1).maybeSingle();
      if (hit) {
        updateData.insurer_name = hit.name;
        updateData.insurer_id = hit.id;
        returnValues.savedValue = String(hit.name);
      } else {
        const { data: created } = await db.from("insurers").insert({ name: value }).select("id, name").single();
        if (created) {
          updateData.insurer_name = created.name;
          updateData.insurer_id = created.id;
        }
      }
    }
  }

  // Keep `due_date` in sync with the earlier of SAOD and TP dates (migration 0008 rule)
  if (field === "saod_due_date" || field === "tp_due_date") {
    const { data: current } = await db
      .from("policies")
      .select("saod_due_date, tp_due_date, due_date")
      .eq("id", policyId)
      .single();
    if (current) {
      const saod = field === "saod_due_date" ? (dbValue as string | null) : (current.saod_due_date as string | null);
      const tp = field === "tp_due_date" ? (dbValue as string | null) : (current.tp_due_date as string | null);
      const dates = [saod, tp].filter((d): d is string => Boolean(d)).sort();
      if (dates.length > 0) {
        const syncedDueDate = dates[0]; // earliest date drives renewal alerts
        updateData.due_date = syncedDueDate;
        returnValues.dueDate = syncedDueDate;
        returnValues.status = policyStatus(syncedDueDate, todayIST());
      }
    }
  }

  const { error } = await db.from("policies").update(updateData).eq("id", policyId);
  if (error) return fail(`Could not save: ${dbMessage(error)}`);

  await audit(db, staff.id, "policy.edit", "policy", policyId);
  revalidatePath("/data-grid");
  revalidatePath("/policies");
  return done("Saved.", { values: returnValues });
}

/** Returns the next page of grid rows as a plain object (called from client via server action). */
export async function fetchGridPage(options: {
  search?: string;
  sortField?: SortField;
  sortDir?: SortDir;
  filters?: GridFilter[];
  cursor?: GridCursor | null;
}) {
  const auth = await authorize("datagrid.view");
  if (!auth.staff) throw new Error(auth.error.error ?? "Permission denied.");
  return getGridPage(options);
}

const EXPORT_LIMIT = 10_000;

/** Streams all matching rows (up to 10,000, paged across PostgREST 1,000-row cap) as a safe CSV string. */
export async function exportGridCsv(options: {
  search?: string;
  filters?: GridFilter[];
  ids?: string[];
}): Promise<{ ok: true; csv: string; exportedCount: number; truncated: boolean } | { ok: false; error: string }> {
  const auth = await authorize("datagrid.export");
  if (!auth.staff) return { ok: false, error: auth.error.error ?? "Permission denied." };

  const db = await createClient();
  const today = todayIST();

  const EXPORT_COLS = `id, vehicle_reg_no, vehicle_category, owner_name, holder_mobile,
     vehicle_make, vehicle_model, insurer_name, policy_number, idv,
     saod_due_date, tp_due_date, due_date, source, premium_amount, holder_address`;

  const collected: Record<string, any>[] = [];
  let truncated = false;

  if (options.ids && options.ids.length > 0) {
    for (let i = 0; i < options.ids.length; i += 200) {
      const slice = options.ids.slice(i, i + 200);
      const { data, error } = await db
        .from("policies")
        .select(EXPORT_COLS)
        .in("id", slice)
        .order("due_date", { ascending: true });
      if (error) return { ok: false, error: `Export failed: ${error.message}` };
      if (data) collected.push(...data);
    }
  } else {
    const resolvedTypeIds = await resolveGridTypeIds(db, options.filters ?? []);
    for (let from = 0; collected.length < EXPORT_LIMIT + 1; from += 1000) {
      const baseQuery = db.from("policies").select(EXPORT_COLS);
      const filteredQuery = applyGridFilters(baseQuery, options.search, options.filters ?? [], today, resolvedTypeIds);
      const { data, error } = await filteredQuery
        .order("due_date", { ascending: true })
        .order("id", { ascending: true })
        .range(from, from + 999);
      if (error) return { ok: false, error: `Export failed: ${error.message}` };
      const chunk = data ?? [];
      collected.push(...chunk);
      if (chunk.length < 1000) break;
    }

    if (collected.length > EXPORT_LIMIT) {
      truncated = true;
      collected.length = EXPORT_LIMIT;
    }
  }

  const headers = [
    "ID", "Reg No", "Category", "Owner Name", "Mobile",
    "Make", "Model", "Insurer", "Policy No", "IDV",
    "SAOD Due", "TP Due", "Due Date", "Status", "Source", "Premium", "Address",
  ];

  const escape = (v: unknown) => {
    if (v === null || v === undefined) return "";
    let s = String(v);
    // Prevent CSV / Excel formula injection
    if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const lines = [
    headers.join(","),
    ...collected.map((r) =>
      [
        r.id,
        r.vehicle_reg_no,
        r.vehicle_category,
        r.owner_name,
        r.holder_mobile,
        r.vehicle_make,
        r.vehicle_model,
        r.insurer_name,
        r.policy_number,
        r.idv,
        r.saod_due_date,
        r.tp_due_date,
        r.due_date,
        policyStatus(r.due_date as string | null, today),
        r.source,
        r.premium_amount,
        r.holder_address,
      ]
        .map(escape)
        .join(","),
    ),
  ];

  return { ok: true, csv: lines.join("\n"), exportedCount: collected.length, truncated };
}
