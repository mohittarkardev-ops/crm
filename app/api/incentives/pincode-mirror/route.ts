import { NextResponse } from "next/server";
import { getStaff } from "@/lib/auth";
import { can } from "@/lib/rbac/permissions";
import { loadOfficialPincodeRows } from "@/lib/pincode-mirror-loader";

/**
 * Returns the verified 36-state India Post All-India Pincode dataset (instant bundled copy
 * by default, or live GitHub mirror when `?source=online` with automatic bundled fallback).
 */
export async function GET(req: Request) {
  const { staff } = await getStaff();
  if (!staff || !can(staff, "incentives.manage")) {
    return NextResponse.json({ ok: false, error: "Not allowed" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const requested = searchParams.get("source") === "online" ? "online" : "bundled";
    const { rows, sourceUsed } = await loadOfficialPincodeRows(requested);
    return NextResponse.json({ ok: true, sourceUsed, total: rows.length, rows });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Could not load PIN dataset" },
      { status: 500 },
    );
  }
}
