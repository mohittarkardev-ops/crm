import crypto from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { todayIST } from "@/lib/data/helpers";
import { reconcilePeriodIncentives, recordIncentiveAudit } from "@/lib/incentives-engine";

function timingSafeMatch(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Scheduled daily incentive reconciliation endpoint (Vercel Cron / external scheduler).
 * Fails closed unless `CRON_SECRET` is configured and matches `Authorization: Bearer <token>`.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim() ?? "";
  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";

  if (!secret || !token || !timingSafeMatch(token, secret)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const db = createAdminClient();
  if (!db) {
    return NextResponse.json({ ok: false, error: "Missing service role key" }, { status: 500 });
  }

  const requestedMonth = request.nextUrl.searchParams.get("month")?.trim();
  const periodKey =
    requestedMonth && /^\d{4}-(0[1-9]|1[0-2])$/.test(requestedMonth)
      ? requestedMonth
      : todayIST().slice(0, 7);

  try {
    const res = await reconcilePeriodIncentives(db, periodKey, {
      actorId: null,
      actorName: "Scheduled Cron",
      preserveSnapshotVersions: true,
    });
    await recordIncentiveAudit(db, {
      actorId: null,
      actorName: "Scheduled Cron",
      action: "incentive_cron.reconcile",
      entityType: "incentive_period",
      entityId: periodKey,
      periodId: res.period.id,
      afterData: res as unknown as Record<string, unknown>,
    });
    return NextResponse.json({ ok: true, ...res });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Reconciliation failed" },
      { status: 500 },
    );
  }
}
