import { createClient } from "@/lib/supabase/server";
import { addDays, daysBetween, todayIST, type Db } from "@/lib/data/helpers";

/**
 * Data Grid data layer (S7).
 * Keyset pagination on the active sort column + PostgREST-safe filtering shared by grid & CSV export.
 */

export type SortField =
  | "vehicle_reg_no"
  | "vehicle_category"
  | "owner_name"
  | "holder_mobile"
  | "vehicle_make"
  | "vehicle_model"
  | "insurer_name"
  | "due_date"
  | "saod_due_date"
  | "tp_due_date"
  | "idv"
  | "policy_number"
  | "source"
  | "created_at";

export type SortDir = "asc" | "desc";

export type GridCursor = { sortValue: string | number | null; id: string };

export type GridFilter = {
  field: SortField | string;
  type: "contains" | "starts_with" | "exact" | "date_range" | "number_range" | "in_array";
  value: string | { start?: string; end?: string } | { min?: string; max?: string } | string[];
};

export type GridRow = {
  id: string;
  vehicleRegNo: string | null;
  vehicleCategory: string | null;
  ownerName: string | null;
  holderMobile: string | null;
  vehicleMake: string | null;
  vehicleModel: string | null;
  insurer: string | null;
  policyNumber: string | null;
  idv: number | null;
  saodDueDate: string | null;
  tpDueDate: string | null;
  dueDate: string | null;
  status: string; // computed
  source: string;
  createdAt: string;
  customData: Record<string, string>;
};

export type CustomField = {
  accessorKey: string;
  headerLabel: string;
  dataType: "text" | "date" | "number" | "enum";
  enumOptions?: string[];
};

export type GridPage = {
  rows: GridRow[];
  /** Pass back to the next call as `cursor` to load the next page. null = no more rows. */
  nextCursor: GridCursor | null;
  totalCount: number;
};

const PAGE_SIZE = 50;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CUSTOM_KEY_REGEX = /^[a-z0-9_]{1,60}$/;

const SAFE_SORT_FIELDS: Record<string, string> = {
  vehicle_reg_no: "vehicle_reg_no",
  vehicle_category: "vehicle_category",
  owner_name: "owner_name",
  holder_mobile: "holder_mobile",
  vehicle_make: "vehicle_make",
  vehicle_model: "vehicle_model",
  insurer_name: "insurer_name",
  due_date: "due_date",
  saod_due_date: "saod_due_date",
  tp_due_date: "tp_due_date",
  idv: "idv",
  policy_number: "policy_number",
  source: "source",
  created_at: "created_at",
};

const SORT_TO_ROW_KEY: Record<string, keyof GridRow> = {
  vehicle_reg_no: "vehicleRegNo",
  vehicle_category: "vehicleCategory",
  owner_name: "ownerName",
  holder_mobile: "holderMobile",
  vehicle_make: "vehicleMake",
  vehicle_model: "vehicleModel",
  insurer_name: "insurer",
  due_date: "dueDate",
  saod_due_date: "saodDueDate",
  tp_due_date: "tpDueDate",
  idv: "idv",
  policy_number: "policyNumber",
  source: "source",
  created_at: "createdAt",
};

/** Quotes a value safely for PostgREST `.or(...)` filter expressions to prevent injection/syntax errors. */
function pgOrValue(raw: string): string {
  return `"${raw.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

export function policyStatus(dueDate: string | null, today: string): string {
  if (!dueDate) return "Unknown";
  if (dueDate < today) return "Expired";
  return daysBetween(today, dueDate) <= 30 ? "Expiring Soon" : "Active";
}

/** Pre-resolves `type` filter codes to `type_id` UUIDs before synchronous query building. */
export async function resolveGridTypeIds(db: Db, filters: GridFilter[]): Promise<string[] | null> {
  const typeFilter = filters.find((f) => f.field === "type" && f.type === "in_array" && Array.isArray(f.value));
  if (!typeFilter || !Array.isArray(typeFilter.value) || typeFilter.value.length === 0) return null;
  const typeCodes = typeFilter.value as string[];
  const { data: typeRows } = await db.from("policy_types").select("id").in("code", typeCodes);
  return (typeRows ?? []).map((r: { id: string }) => r.id);
}

/** Shared synchronous filter builder for both `getGridPage` and `exportGridCsv`. */
export function applyGridFilters<Q>(
  initialQuery: Q,
  search: string | undefined,
  filters: GridFilter[],
  today: string,
  resolvedTypeIds: string[] | null,
): Q {
  let query: any = initialQuery;

  // Global search: trigram ilike across the four indexed columns
  if (search && search.trim()) {
    const pattern = pgOrValue(`%${search.trim()}%`);
    query = query.or(
      `vehicle_reg_no.ilike.${pattern},owner_name.ilike.${pattern},policy_number.ilike.${pattern},holder_mobile.ilike.${pattern}`,
    );
  }

  // Per-column filters
  for (const f of filters) {
    if (f.field === "type" || f.field === "status") continue;

    const standardCol = SAFE_SORT_FIELDS[f.field] ?? null;
    const customCol = !standardCol && CUSTOM_KEY_REGEX.test(f.field) ? `custom_data->>${f.field}` : null;
    const col = standardCol ?? customCol;
    if (!col) continue;

    if (f.type === "contains" && typeof f.value === "string") {
      query = query.ilike(col, `%${f.value}%`);
    } else if (f.type === "starts_with" && typeof f.value === "string") {
      query = query.ilike(col, `${f.value}%`);
    } else if (f.type === "exact" && typeof f.value === "string") {
      query = query.eq(col, f.value);
    } else if (f.type === "in_array" && Array.isArray(f.value) && f.value.length > 0) {
      query = query.in(col, f.value);
    } else if (standardCol && f.type === "date_range" && typeof f.value === "object" && !Array.isArray(f.value)) {
      const v = f.value as { start?: string; end?: string };
      if (v.start) query = query.gte(standardCol, v.start);
      if (v.end) query = query.lte(standardCol, v.end);
    } else if (standardCol && f.type === "number_range" && typeof f.value === "object" && !Array.isArray(f.value)) {
      const v = f.value as { min?: string; max?: string };
      if (v.min !== undefined && v.min !== "" && Number.isFinite(Number(v.min))) {
        query = query.gte(standardCol, Number(v.min));
      }
      if (v.max !== undefined && v.max !== "" && Number.isFinite(Number(v.max))) {
        query = query.lte(standardCol, Number(v.max));
      }
    }
  }

  // Optional policy_types code filter (`type`)
  if (resolvedTypeIds !== null) {
    if (resolvedTypeIds.length > 0) {
      query = query.in("type_id", resolvedTypeIds);
    } else {
      query = query.eq("id", "00000000-0000-0000-0000-000000000000");
    }
  }

  // Computed `status` filter mapped to due_date ranges matching `policyStatus()`
  const statusFilter = filters.find((f) => f.field === "status" && f.type === "in_array" && Array.isArray(f.value));
  if (statusFilter && Array.isArray(statusFilter.value) && statusFilter.value.length > 0) {
    const statuses = statusFilter.value as string[];
    const hasExpired = statuses.includes("Expired");
    const hasExpiringSoon = statuses.includes("Expiring Soon");
    const hasActive = statuses.includes("Active");
    const selectedCount = Number(hasExpired) + Number(hasExpiringSoon) + Number(hasActive);

    if (selectedCount > 0 && selectedCount < 3) {
      const soonStr = addDays(today, 30);

      if (hasExpired && !hasExpiringSoon && !hasActive) {
        query = query.lt("due_date", today);
      } else if (!hasExpired && hasExpiringSoon && !hasActive) {
        query = query.gte("due_date", today).lte("due_date", soonStr);
      } else if (!hasExpired && !hasExpiringSoon && hasActive) {
        query = query.gt("due_date", soonStr);
      } else if (hasExpired && hasExpiringSoon && !hasActive) {
        query = query.lte("due_date", soonStr);
      } else if (!hasExpired && hasExpiringSoon && hasActive) {
        query = query.gte("due_date", today);
      } else if (hasExpired && !hasExpiringSoon && hasActive) {
        query = query.or(`due_date.lt.${today},due_date.gt.${soonStr}`);
      }
    }
  }

  return query as Q;
}

/** Returns one page of policies for the data grid, with keyset paging on the active sort column. */
export async function getGridPage(options: {
  search?: string;
  sortField?: SortField;
  sortDir?: SortDir;
  filters?: GridFilter[];
  cursor?: GridCursor | null;
}): Promise<GridPage> {
  const db = await createClient();
  const today = todayIST();
  const { search, sortField = "due_date", sortDir = "asc", filters = [], cursor } = options;

  const safeField = SAFE_SORT_FIELDS[sortField] ?? "due_date";
  const resolvedTypeIds = await resolveGridTypeIds(db, filters);

  const baseQuery = db.from("policies").select(
    `id, vehicle_reg_no, vehicle_category, owner_name, holder_mobile,
     vehicle_make, vehicle_model, insurer_name, policy_number, idv,
     saod_due_date, tp_due_date, due_date, source, created_at, custom_data`,
    { count: "exact" },
  );

  let query = applyGridFilters(baseQuery, search, filters, today, resolvedTypeIds);

  // Keyset cursor on the active sort column (honouring `nullsFirst: false`)
  if (cursor && UUID_REGEX.test(cursor.id)) {
    const sv = cursor.sortValue;
    const id = cursor.id;
    const op = sortDir === "asc" ? "gt" : "lt";

    if (sv !== null && sv !== undefined) {
      const encoded =
        safeField === "idv" && typeof sv === "number" && Number.isFinite(sv)
          ? String(sv)
          : pgOrValue(String(sv));
      query = query.or(
        `${safeField}.${op}.${encoded},and(${safeField}.eq.${encoded},id.${op}.${id}),${safeField}.is.null`,
      );
    } else {
      query = query.is(safeField, null);
      query = sortDir === "asc" ? query.gt("id", id) : query.lt("id", id);
    }
  }

  query = query
    .order(safeField, { ascending: sortDir === "asc", nullsFirst: false })
    .order("id", { ascending: sortDir === "asc" })
    .limit(PAGE_SIZE);

  const { data, error, count } = await query;
  if (error) throw new Error(`Data grid: ${error.message}`);

  const rows: GridRow[] = (data ?? []).map((p) => ({
    id: p.id as string,
    vehicleRegNo: p.vehicle_reg_no as string | null,
    vehicleCategory: p.vehicle_category as string | null,
    ownerName: p.owner_name as string | null,
    holderMobile: p.holder_mobile as string | null,
    vehicleMake: p.vehicle_make as string | null,
    vehicleModel: p.vehicle_model as string | null,
    insurer: p.insurer_name as string | null,
    policyNumber: p.policy_number as string | null,
    idv: p.idv ? Number(p.idv) : null,
    saodDueDate: p.saod_due_date as string | null,
    tpDueDate: p.tp_due_date as string | null,
    dueDate: p.due_date as string | null,
    status: policyStatus(p.due_date as string | null, today),
    source: p.source as string,
    createdAt: p.created_at as string,
    customData: (p.custom_data ?? {}) as Record<string, string>,
  }));

  const last = rows[rows.length - 1];
  const rowKey = SORT_TO_ROW_KEY[safeField] ?? "dueDate";
  const nextCursor: GridCursor | null =
    rows.length === PAGE_SIZE && last
      ? { sortValue: (last[rowKey] as string | number | null) ?? null, id: last.id }
      : null;

  return { rows, nextCursor, totalCount: count ?? 0 };
}

/** Custom field definitions from the grid_columns table. */
export async function getGridCustomFields(): Promise<CustomField[]> {
  const db = await createClient();
  const { data } = await db
    .from("grid_columns")
    .select("accessor_key, header_label, data_type, enum_options")
    .order("sort_order", { ascending: true });

  return (data ?? []).map((c) => ({
    accessorKey: c.accessor_key as string,
    headerLabel: c.header_label as string,
    dataType: (c.data_type as CustomField["dataType"]) ?? "text",
    enumOptions: Array.isArray(c.enum_options) ? (c.enum_options as string[]) : undefined,
  }));
}
