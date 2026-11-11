import { NextResponse, type NextRequest } from "next/server";
import { getStaff } from "@/lib/auth";
import { can } from "@/lib/rbac/permissions";
import { createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Opens (or downloads with ?download=1) a policy document attached to a claim from the
 * private DOCUMENTS bucket using a fresh 60-second signed URL.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { staff } = await getStaff();
  const allowed =
    staff &&
    (can(staff, "claims.view") || can(staff, "claims.approve") || can(staff, "claims.create"));
  if (!allowed) return new NextResponse("Not allowed", { status: 403 });

  const { id } = await params;
  if (!UUID.test(id)) return new NextResponse("Claim not found", { status: 404 });

  const db = await createClient();
  const { data: claim, error: claimErr } = await db
    .from("claims")
    .select("document_path")
    .eq("id", id)
    .maybeSingle();

  if (claimErr) return new NextResponse(claimErr.message, { status: 500 });
  if (!claim?.document_path) return new NextResponse("No document attached to this claim", { status: 404 });

  const download = request.nextUrl.searchParams.get("download") === "1";
  const { data, error } = await db.storage
    .from("DOCUMENTS")
    .createSignedUrl(claim.document_path as string, 60, download ? { download: true } : undefined);

  if (error || !data) return new NextResponse(error?.message ?? "Could not open this file", { status: 404 });
  return NextResponse.redirect(data.signedUrl);
}
