import { NextResponse, type NextRequest } from "next/server";
import { getStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

/**
 * Opens (or downloads with ?download=1) a policy document from the private DOCUMENTS bucket.
 * Each click creates a fresh 60-second signed link, so links never go stale and are never stored.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> },
) {
  const { staff } = await getStaff();
  if (!staff) return new NextResponse("Not allowed", { status: 403 });

  const { id, docId } = await params;
  const db = await createClient();

  const { data: doc, error: docError } = await db
    .from("policy_documents")
    .select("file_path")
    .eq("id", docId)
    .eq("policy_id", id)
    .maybeSingle();

  if (docError) return new NextResponse(docError.message, { status: 500 });
  if (!doc) return new NextResponse("Document not found", { status: 404 });

  const download = request.nextUrl.searchParams.get("download") === "1";
  const { data, error } = await db.storage
    .from("DOCUMENTS")
    .createSignedUrl(doc.file_path as string, 60, download ? { download: true } : undefined);

  if (error || !data) return new NextResponse(error?.message ?? "Could not open this file", { status: 404 });
  return NextResponse.redirect(data.signedUrl);
}
