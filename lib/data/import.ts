import { createClient } from "@/lib/supabase/server";
import type { ImportBatchRecord } from "@/lib/import-fields";

export type { ImportBatchRecord, TargetFieldDef } from "@/lib/import-fields";
export { STANDARD_IMPORT_FIELDS } from "@/lib/import-fields";

/** Loads past import batches from the database (Server Component only). */
export async function getImportBatches(): Promise<ImportBatchRecord[]> {
  const db = await createClient();
  const { data, error } = await db
    .from("import_batches")
    .select(
      `id, kind, file_name, total_rows, inserted_rows, updated_rows, skipped_rows, status, notes, created_at, finished_at,
       staff_users:created_by (full_name)`
    )
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    console.error("Failed to load import batches:", error);
    return [];
  }

  return (data ?? []).map((b) => ({
    id: b.id as string,
    kind: b.kind as "legacy_migration" | "import",
    fileName: b.file_name as string | null,
    totalRows: Number(b.total_rows ?? 0),
    insertedRows: Number(b.inserted_rows ?? 0),
    updatedRows: Number(b.updated_rows ?? 0),
    skippedRows: Number(b.skipped_rows ?? 0),
    status: b.status as "running" | "done" | "failed" | "undone",
    notes: b.notes as string | null,
    createdAt: b.created_at as string,
    finishedAt: b.finished_at as string | null,
    createdBy: Array.isArray(b.staff_users)
      ? (b.staff_users[0] as { full_name: string | null } | null)
      : (b.staff_users as { full_name: string | null } | null),
  }));
}

/** Loads custom dynamic fields so they can be mapped or exported. */
export async function getImportCustomFields(): Promise<{ key: string; label: string }[]> {
  const db = await createClient();
  const { data } = await db
    .from("grid_columns")
    .select("accessor_key, header_label")
    .order("position", { ascending: true });

  return (data ?? []).map((c) => ({
    key: `custom_${c.accessor_key}`,
    label: `${c.header_label} (Custom)`,
  }));
}
