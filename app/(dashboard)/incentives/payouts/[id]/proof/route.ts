import { NextResponse, type NextRequest } from "next/server";
import { getStaff } from "@/lib/auth";
import { can } from "@/lib/rbac/permissions";
import { createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Opens or downloads a payout receipt file attached to an incentive payout (Admin or owning Agent). */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { staff } = await getStaff();
  const canManage = Boolean(staff && can(staff, "incentives.manage"));
  const canView = Boolean(staff && can(staff, "incentives.view"));
  if (!staff || (!canManage && !canView)) {
    return new NextResponse("Not allowed", { status: 403 });
  }

  const { id } = await params;
  if (!UUID.test(id)) return new NextResponse("Payout not found", { status: 404 });

  const db = await createClient();
  const { data: payout, error } = await db
    .from("incentive_payouts")
    .select("agent_id, proof_path")
    .eq("id", id)
    .maybeSingle();

  if (error) return new NextResponse(error.message, { status: 500 });
  if (!payout?.proof_path) return new NextResponse("No payout proof attached", { status: 404 });
  if (!canManage && payout.agent_id !== staff.id) {
    return new NextResponse("Not allowed", { status: 403 });
  }

  const download = request.nextUrl.searchParams.get("download") === "1";
  const signed = await db.storage
    .from("DOCUMENTS")
    .createSignedUrl(String(payout.proof_path), 60, download ? { download: true } : undefined);

  if (signed.error || !signed.data) {
    return new NextResponse(signed.error?.message ?? "Could not open file", { status: 404 });
  }
  return NextResponse.redirect(signed.data.signedUrl);
}
