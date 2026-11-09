import { createClient } from "@/lib/supabase/server";
import { todayIST } from "@/lib/data/helpers";

/**
 * Data Grid data layer (S7).
 * Keyset pagination: each page starts after the last row's (due_date, id) pair so the query never
 * scans from the beginning. Trigram indexes on owner_name, vehicle_reg_no, policy_number and
 * holder_mobile (added in migration 0008) make the search fast even at scale.
 */

export type SortField =
  | "vehicle_reg_no"
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
  nextCursor: { dueDate: string | null; id: string } | null;
  totalCount: number;
};

const PAGE_SIZE = 50;

const SAFE_SORT_FIELDS: Record<string, string> = {
  vehicle_reg_no: "vehicle_reg_no",
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

function policyStatus(dueDate: string | null, today: string): string {
  if (!dueDate) return "Unknown";
  if (dueDate < today) return "Expired";
  const d = new Date(dueDate);
  const t = new Date(today);
  const diff = Math.ceil((d.getTime() - t.getTime()) / 86_400_000);
  if (diff <= 30) return "Expiring Soon";
  return "Active";
}

/** Returns one page of policies for the data grid, with keyset paging. */
export async function getGridPage(options: {
  search?: string;
  sortField?: SortField;
  sortDir?: SortDir;
  filters?: GridFilter[];
  cursor?: { dueDate: string | null; id: string } | null;
}): Promise<GridPage> {
  const db = await createClient();
  const today = todayIST();
  const { search, sortField = "due_date", sortDir = "asc", filters = [], cursor } = options;

  const safeField = SAFE_SORT_FIELDS[sortField] ?? "due_date";

  let query = db.from("policies").select(
    `id, vehicle_reg_no, vehicle_category, owner_name, holder_mobile,
     vehicle_make, vehicle_model, insurer_name, policy_number, idv,
     saod_due_date, tp_due_date, due_date, source, custom_data`,
    { count: "exact" },
  );

  // Global search: trigram ilike across the four indexed columns
  if (search && search.trim()) {
    const q = `%${search.trim()}%`;
    query = query.or(
      `vehicle_reg_no.ilike.${q},owner_name.ilike.${q},policy_number.ilike.${q},holder_mobile.ilike.${q}`,
    );
  }

  // Per-column filters
  for (const f of filters) {
    const col = SAFE_SORT_FIELDS[f.field] ?? null;
    if (!col) continue; // ignore unknown / custom-data columns (filtered client-side for now)
    if (f.type === "contains" && typeof f.value === "string") {
      query = query.ilike(col, `%${f.value}%`);
    } else if (f.type === "starts_with" && typeof f.value === "string") {
      query = query.ilike(col, `${f.value}%`);
    } else if (f.type === "exact" && typeof f.value === "string") {
      query = query.eq(col, f.value);
    } else if (f.type === "in_array" && Array.isArray(f.value)) {
      query = query.in(col, f.value);
    } else if (f.type === "date_range" && typeof f.value === "object" && !Array.isArray(f.value)) {
      const v = f.value as { start?: string; end?: string };
      if (v.start) query = query.gte(col, v.start);
      if (v.end) query = query.lte(col, v.end);
    } else if (f.type === "number_range" && typeof f.value === "object" && !Array.isArray(f.value)) {
      const v = f.value as { min?: string; max?: string };
      if (v.min) query = query.gte(col, v.min);
      if (v.max) query = query.lte(col, v.max);
    }
  }

  // Keyset cursor: (due_date, id) for stable paging
  if (cursor) {
    if (sortDir === "asc") {
      if (cursor.dueDate) {
        query = query.or(`due_date.gt.${cursor.dueDate},and(due_date.eq.${cursor.dueDate},id.gt.${cursor.id})`);
      } else {
        query = query.gt("id", cursor.id);
      }
    } else {
      if (cursor.dueDate) {
        query = query.or(`due_date.lt.${cursor.dueDate},and(due_date.eq.${cursor.dueDate},id.lt.${cursor.id})`);
      } else {
        query = query.lt("id", cursor.id);
      }
    }
  }

  query = query
    .order(safeField, { ascending: sortDir === "asc", nullsFirst: false })
    .order("id", { ascending: sortDir === "asc" })
    .limit(PAGE_SIZE);

  const { data, error, count } = await query;
  if (error) throw new Error(`Data grid: ${error.message}`);

  const rows = (data ?? []).map((p) => ({
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
    customData: (p.custom_data ?? {}) as Record<string, string>,
  }));

  const last = rows[rows.length - 1];
  const nextCursor =
    rows.length === PAGE_SIZE && last
      ? { dueDate: last.dueDate, id: last.id }
      : null;

  return { rows, nextCursor, totalCount: count ?? 0 };
}

/** Custom field definitions from the grid_columns table. */
export async function getGridCustomFields(): Promise<CustomField[]> {
  const db = await createClient();
  const { data } = await db
    .from("grid_columns")
    .select("accessor_key, header_label, data_type, enum_options")
    .order("position", { ascending: true });

  return (data ?? []).map((c) => ({
    accessorKey: c.accessor_key as string,
    headerLabel: c.header_label as string,
    dataType: (c.data_type as CustomField["dataType"]) ?? "text",
    enumOptions: Array.isArray(c.enum_options) ? (c.enum_options as string[]) : undefined,
  }));
}
