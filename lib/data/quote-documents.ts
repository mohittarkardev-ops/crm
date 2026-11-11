import { createClient } from "@/lib/supabase/server";
import { dateIST, rowsOf } from "@/lib/data/helpers";

export interface QuoteAttachment {
  id: string;
  name: string;
  type: string;
  uploadedBy: string;
  uploadedOn: string | null;
  href: string | null;
}

type QuoteDocRow = {
  id: string;
  file_path: string;
  file_name: string | null;
  document_type: string | null;
  uploaded_by: string | null;
  uploaded_at: string | null;
};

/** Loads signed links for documents attached directly to a quote request (`quote_documents`). */
export async function getQuoteAttachments(quoteId: string): Promise<QuoteAttachment[]> {
  const db = await createClient();
  const res = await db
    .from("quote_documents")
    .select("id, file_path, file_name, document_type, uploaded_by, uploaded_at")
    .eq("quote_id", quoteId)
    .order("uploaded_at", { ascending: false });

  // Return gracefully if migration 0018 has not been applied yet.
  if (res.error) {
    if (res.error.code === "42P01" || res.error.message.includes("quote_documents")) {
      return [];
    }
    throw new Error(`Quote documents: ${res.error.message}`);
  }

  const rows = rowsOf<QuoteDocRow>(res, "Quote documents");
  const paths = rows.map((r) => r.file_path);
  const urlByPath = new Map<string, string>();
  if (paths.length > 0) {
    const signed = await db.storage.from("DOCUMENTS").createSignedUrls(paths, 3600);
    if (!signed.error && signed.data) {
      for (const item of signed.data) {
        if (item.path && item.signedUrl) urlByPath.set(item.path, item.signedUrl);
      }
    }
  }

  return rows.map((d) => ({
    id: d.id,
    name: d.file_name || d.file_path.split("/").pop() || "Quote document",
    type: d.document_type ?? "Quote proposal",
    uploadedBy: d.uploaded_by === "user" ? "Customer" : "Advisor",
    uploadedOn: dateIST(d.uploaded_at),
    href: urlByPath.get(d.file_path) ?? null,
  }));
}
