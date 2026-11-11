"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/module-types";
import { audit, authorize, checkFile, dbMessage, done, fail, text } from "@/lib/actions/shared";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Uploads a proposal / comparison sheet / quote PDF onto any quote request (with or without a linked policy).
 * Files live in the shared private DOCUMENTS bucket under `<user_id>/quotes/<quote_id>/...` so the customer's
 * storage policy (`documents_select_own`) lets them open the file directly in the mobile app.
 */
export async function uploadQuoteDocument(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const auth = await authorize("quotes.update");
  if (!auth.staff) return auth.error;
  const staff = auth.staff;

  const quoteId = text(formData, "quoteId");
  if (!UUID.test(quoteId)) return fail("That quote request could not be found.");

  const fileCheck = checkFile(formData.get("document"));
  if (fileCheck.error) return fail(fileCheck.error);
  if (!fileCheck.file) return fail("Choose a file to upload.");

  const docType = text(formData, "documentType") || "Quote proposal";

  const db = await createClient();
  const quote = await db.from("quote_requests").select("user_id").eq("id", quoteId).maybeSingle();
  if (quote.error) return fail(dbMessage(quote.error));
  if (!quote.data?.user_id) return fail("That quote request could not be found.");

  const safeName = fileCheck.file.name.replace(/[^A-Za-z0-9._-]+/g, "_").slice(-80) || "quote-document";
  const path = `${quote.data.user_id as string}/quotes/${quoteId}/${Date.now()}-${safeName}`;

  const upload = await db.storage
    .from("DOCUMENTS")
    .upload(path, fileCheck.file, { contentType: fileCheck.file.type, upsert: false });
  if (upload.error) return fail(upload.error.message);

  const inserted = await db.from("quote_documents").insert({
    quote_id: quoteId,
    file_path: path,
    file_name: fileCheck.file.name.slice(0, 160),
    document_type: docType,
    uploaded_by: "staff",
  });
  if (inserted.error) {
    await db.storage.from("DOCUMENTS").remove([path]);
    return fail(dbMessage(inserted.error));
  }

  await audit(db, staff.id, "quote_document.upload", "quote_request", quoteId);
  revalidatePath(`/quotes/${quoteId}`);
  return done("Quote document uploaded.");
}

export async function deleteQuoteDocument(documentId: string, quoteId: string): Promise<ActionState> {
  const auth = await authorize("quotes.update");
  if (!auth.staff) return auth.error;
  const staff = auth.staff;
  if (!UUID.test(documentId) || !UUID.test(quoteId)) return fail("That document could not be found.");

  const db = await createClient();
  const doc = await db
    .from("quote_documents")
    .select("file_path")
    .eq("id", documentId)
    .eq("quote_id", quoteId)
    .maybeSingle();
  if (doc.error) return fail(dbMessage(doc.error));
  if (!doc.data) return fail("That document could not be found.");

  const removedFile = await db.storage.from("DOCUMENTS").remove([doc.data.file_path as string]);
  if (removedFile.error) return fail(removedFile.error.message);

  const removedRow = await db.from("quote_documents").delete().eq("id", documentId);
  if (removedRow.error) return fail(dbMessage(removedRow.error));

  await audit(db, staff.id, "quote_document.delete", "quote_request", quoteId);
  revalidatePath(`/quotes/${quoteId}`);
  return done("Quote document removed.");
}
