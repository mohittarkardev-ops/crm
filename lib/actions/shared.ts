import { revalidatePath } from "next/cache";
import { getStaff, type StaffProfile } from "@/lib/auth";
import { can, type PermissionKey } from "@/lib/rbac/permissions";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/module-types";
import { MAX_UPLOAD_BYTES, MAX_UPLOAD_LABEL } from "@/lib/upload-limits";

/* Shared helpers for every server action (the files in this folder that start with "use server"). */

export type Db = Awaited<ReturnType<typeof createClient>>;

export const DOCUMENT_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
export const MAX_DOCUMENT_BYTES = MAX_UPLOAD_BYTES; // Vercel rejects request bodies over 4.5 MB

/** The signed-in CRM staff member, or null. Every action starts with this. */
export async function requireStaff() {
  const { staff } = await getStaff();
  return staff;
}

export const NOT_STAFF = "You are not signed in as CRM staff. Sign in again.";
export const NOT_ALLOWED = "You do not have permission to do this.";

type Authorized = { staff: StaffProfile; error?: undefined } | { staff?: undefined; error: ActionState };

/**
 * Every server action starts with this. It checks that the person is signed-in CRM staff AND allowed to do this
 * specific thing (see lib/rbac/permissions.ts). Use it like this:
 *
 *   const auth = await authorize("placements.manage");
 *   if (!auth.staff) return auth.error;
 *   const staff = auth.staff;
 */
export async function authorize(permission: PermissionKey, deniedMessage: string = NOT_ALLOWED): Promise<Authorized> {
  const { staff } = await getStaff();
  if (!staff) return { error: { ok: false, error: NOT_STAFF } };
  if (!can(staff, permission)) return { error: { ok: false, error: deniedMessage } };
  return { staff };
}

export function fail(
  error: string,
  options: { fieldErrors?: Record<string, string>; values?: Record<string, string> } = {},
): ActionState {
  return { ok: false, error, ...options };
}

export function done(message: string, extra: Partial<ActionState> = {}): ActionState {
  // Refresh every page that shows data, so tables, tiles and the bell are current.
  revalidatePath("/", "layout");
  return { ok: true, message, ...extra };
}

/** Text values from a submitted form, so it can be shown again after an error. */
export function formValues(formData: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string" && !key.startsWith("$")) out[key] = value;
  }
  return out;
}

export function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

/** Same rule as the database function normalize_mobile, plus the users_mobile_format_check pattern. */
export function normalizeMobile(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  if (digits.length < 10) return null;
  const mobile = `+91${digits.slice(-10)}`;
  return /^\+91[6-9][0-9]{9}$/.test(mobile) ? mobile : null;
}

/** A YYYY-MM-DD date that really exists, between 1900 and 2100. */
export function parseDate(value: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) return null;
  const year = Number(value.slice(0, 4));
  return year >= 1900 && year <= 2100 ? value : null;
}

export function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

/** Turns a database error into something a person can act on. */
export function dbMessage(error: { code?: string; message: string }): string {
  switch (error.code) {
    case "23505":
      return "That record already exists.";
    case "23503":
      return "A linked record could not be found.";
    case "23514":
      return "One of the values is not allowed by the database rules.";
    case "42501":
      return "The database refused this change (permissions).";
    default:
      return error.message;
  }
}

/** Writes a line to audit_logs. Never blocks the action it describes. */
export async function audit(db: Db, staffId: string, action: string, entity: string, entityId: string | null) {
  try {
    await db.from("audit_logs").insert({ staff_id: staffId, action, entity, entity_id: entityId });
  } catch {
    /* the audit trail must not break a save */
  }
}

/** Validates an uploaded file from a form. */
export function checkFile(entry: FormDataEntryValue | null): { file: File | null; error?: string } {
  if (!(entry instanceof File) || entry.size === 0) return { file: null };
  if (!DOCUMENT_TYPES.includes(entry.type)) return { file: null, error: "Documents must be a PDF, JPG, PNG or WebP file." };
  if (entry.size > MAX_DOCUMENT_BYTES) return { file: null, error: `Documents must be ${MAX_UPLOAD_LABEL} or smaller.` };
  return { file: entry };
}

/**
 * Uploads a file to the private DOCUMENTS bucket and records it in policy_documents.
 * The path starts with the policy holder's user id, exactly like documents uploaded from the mobile app,
 * so the file opens on both sides. Returns an error message, or null on success.
 */
export async function storeDocument(
  db: Db,
  args: { userId: string; policyId: string; file: File; type: string | null },
): Promise<string | null> {
  const safeName = args.file.name.replace(/[^A-Za-z0-9._-]+/g, "_").slice(-80) || "document";
  const path = `${args.userId}/${args.policyId}/${Date.now()}-${safeName}`;

  const upload = await db.storage
    .from("DOCUMENTS")
    .upload(path, args.file, { contentType: args.file.type, upsert: false });
  if (upload.error) return upload.error.message;

  const record = await db
    .from("policy_documents")
    .insert({ policy_id: args.policyId, file_path: path, document_type: args.type, uploaded_by: "staff" });
  if (record.error) {
    await db.storage.from("DOCUMENTS").remove([path]);
    return dbMessage(record.error);
  }
  return null;
}

/** All ids from a paged query (the API returns at most 1000 rows per request). */
export async function allIds(
  page: (from: number, to: number) => PromiseLike<{ data: { id: string }[] | null; error: { message: string } | null }>,
): Promise<string[]> {
  const ids: string[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await page(from, from + 999);
    if (error) throw new Error(error.message);
    const rows = data ?? [];
    ids.push(...rows.map((r) => r.id));
    if (rows.length < 1000) break;
  }
  return ids;
}
