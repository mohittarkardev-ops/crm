"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { audit, done, fail, type Db } from "@/lib/actions/shared";
import { can } from "@/lib/rbac/permissions";
import { requirePermission } from "@/lib/rbac/server";
import type { ActionState } from "@/lib/module-types";
import type { GridFilter, SortDir, SortField } from "@/lib/data/data-grid";
import { getGridPage } from "@/lib/data/data-grid";

/**
 * Server actions for the Data Grid (S7).
 * All writes start with requirePermission so only admin (and future granted staff) can reach them.
 */

// Fields that can be inline-edited in the grid. No verification_status, no type_id here.
const EDITABLE_FIELDS: Record<string, { col: string; validate?: (v: string) => string | null }> = {
  owner_name: { col: "owner_name", validate: (v) => (v.length > 120 ? "Max 120 characters." : null) },
  vehicle_reg_no: {
    col: "vehicle_reg_no",
    validate: (v) => (v && !/^[A-Z0-9-]{2,20}$/.test(v.toUpperCase()) ? "Invalid registration number." : null),
  },
  holder_mobile: {
    col: "holder_mobile",
    validate: (v) => (v && !/^\+?[\d\s-]{7,15}$/.test(v) ? "Invalid mobile number." : null),
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

/** Saves a single cell edit. Called from the client inline editor. */
export async function saveGridCell(
  policyId: string,
  field: string,
  rawValue: string,
  isCustom: boolean,
): Promise<ActionState> {
  const staff = await requirePermission("datagrid.edit");
  const db = await createClient();

  if (!policyId || !/^[0-9a-f-]{36}$/i.test(policyId)) return fail("Invalid policy ID.");

  if (isCustom) {
    // Custom field — stored in the jsonb custom_data column
    const key = field.trim();
    if (!key || !/^[a-z0-9_]{1,60}$/.test(key)) return fail("Invalid custom field key.");
    const value = rawValue.trim();

    // Read current custom_data, merge, write back
    const { data: row, error: readErr } = await db
      .from("policies")
      .select("custom_data")
      .eq("id", policyId)
      .single();
    if (readErr || !row) return fail("Policy not found.");

    const current = (row.custom_data as Record<string, string>) ?? {};
    const merged = value ? { ...current, [key]: value } : Object.fromEntries(Object.entries(current).filter(([k]) => k !== key));

    const { error } = await db.from("policies").update({ custom_data: merged }).eq("id", policyId);
    if (error) return fail(`Could not save: ${error.message}`);

    await audit(db, staff.id, "policy.edit", "policy", policyId);
    revalidatePath("/data-grid");
    return done("Saved.");
  }

  // Standard field
  const def = EDITABLE_FIELDS[field];
  if (!def) return fail(`Field "${field}" cannot be edited here.`);

  const value = rawValue.trim();
  const validationError = def.validate ? def.validate(value) : null;
  if (validationError) return fail(validationError);

  let dbValue: string | number | null = value || null;
  if (field === "idv" && value) dbValue = Number(value.replace(/,/g, ""));
  if (field === "vehicle_reg_no" && value) dbValue = value.toUpperCase().replace(/\s+/g, "");

  const { error } = await db.from("policies").update({ [def.col]: dbValue }).eq("id", policyId);
  if (error) return fail(`Could not save: ${error.message}`);

  await audit(db, staff.id, "policy.edit", "policy", policyId);
  revalidatePath("/data-grid");
  revalidatePath("/policies");
  return done("Saved.");
}

/** Returns the next page of grid rows as a plain object (called from client via server action). */
export async function fetchGridPage(options: {
  search?: string;
  sortField?: SortField;
  sortDir?: SortDir;
  filters?: GridFilter[];
  cursor?: { dueDate: string | null; id: string } | null;
}) {
  // Permission is checked here too so the data never leaks even via direct server action calls.
  await requirePermission("datagrid.view");
  return getGridPage(options);
}

/** Streams all matching rows as a CSV string for download. Limited to 10,000 rows. */
export async function exportGridCsv(options: {
  search?: string;
  filters?: GridFilter[];
  ids?: string[];
}): Promise<{ ok: true; csv: string } | { ok: false; error: string }> {
  await requirePermission("datagrid.export");
  const db = await createClient();

  const EXPORT_COLS = `id, vehicle_reg_no, vehicle_category, owner_name, holder_mobile,
     vehicle_make, vehicle_model, insurer_name, policy_number, idv,
     saod_due_date, tp_due_date, due_date, source, premium_amount, holder_address`;

  let query = db.from("policies").select(EXPORT_COLS).limit(10_000);

  if (options.ids && options.ids.length > 0) {
    query = query.in("id", options.ids);
  } else {
    if (options.search?.trim()) {
      const q = `%${options.search.trim()}%`;
      query = query.or(
        `vehicle_reg_no.ilike.${q},owner_name.ilike.${q},policy_number.ilike.${q},holder_mobile.ilike.${q}`,
      );
    }
    for (const f of options.filters ?? []) {
      if (f.type === "contains" && typeof f.value === "string") query = query.ilike(f.field, `%${f.value}%`);
      else if (f.type === "in_array" && Array.isArray(f.value)) query = query.in(f.field, f.value);
      else if (f.type === "date_range" && typeof f.value === "object" && !Array.isArray(f.value)) {
        const v = f.value as { start?: string; end?: string };
        if (v.start) query = query.gte(f.field, v.start);
        if (v.end) query = query.lte(f.field, v.end);
      }
    }
  }

  query = query.order("due_date", { ascending: true });
  const { data, error } = await query;
  if (error) return { ok: false, error: `Export failed: ${error.message}` };

  const headers = [
    "ID", "Reg No", "Category", "Owner Name", "Mobile",
    "Make", "Model", "Insurer", "Policy No", "IDV",
    "SAOD Due", "TP Due", "Due Date", "Source", "Premium", "Address",
  ];

  const escape = (v: unknown) => {
    if (v === null || v === undefined) return "";
    const s = String(v);
    return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const lines = [
    headers.join(","),
    ...(data ?? []).map((r) =>
      [
        r.id, r.vehicle_reg_no, r.vehicle_category, r.owner_name, r.holder_mobile,
        r.vehicle_make, r.vehicle_model, r.insurer_name, r.policy_number, r.idv,
        r.saod_due_date, r.tp_due_date, r.due_date, r.source, r.premium_amount, r.holder_address,
      ]
        .map(escape)
        .join(","),
    ),
  ];

  return { ok: true, csv: lines.join("\n") };
}
