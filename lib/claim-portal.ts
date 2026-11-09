import { createHash, timingSafeEqual } from "node:crypto";
import { headers } from "next/headers";

/**
 * Access code for the public claim form (/claim). Agents are not CRM users, so one shared code, set in the
 * CLAIM_PORTAL_CODE environment variable (at least 8 characters), keeps strangers out. Change it by editing the
 * variable (.env.local and Vercel) and restarting or redeploying.
 *
 * Wrong codes are counted per visitor address. The counter lives in the memory of one server instance, so it slows
 * guessing down but is not a hard limit; that is why the code must be long.
 */
const WINDOW_MS = 15 * 60 * 1000;
const MAX_WRONG = 8;
const wrong = new Map<string, { count: number; since: number }>();

export type PortalCheck = { ok: true } | { ok: false; error: string };

async function visitorKey() {
  const list = await headers();
  return (list.get("x-forwarded-for") ?? list.get("x-real-ip") ?? "unknown").split(",")[0].trim();
}

function digest(value: string) {
  return createHash("sha256").update(value).digest();
}

export async function verifyPortalCode(code: string): Promise<PortalCheck> {
  const expected = process.env.CLAIM_PORTAL_CODE ?? "";
  if (expected.length < 8) return { ok: false, error: "The claims form is not set up yet. Ask the admin." };

  const key = await visitorKey();
  const now = Date.now();
  if (wrong.size > 2000) {
    for (const [k, entry] of wrong) if (now - entry.since > WINDOW_MS) wrong.delete(k);
  }

  let entry = wrong.get(key);
  if (entry && now - entry.since > WINDOW_MS) {
    wrong.delete(key);
    entry = undefined;
  }
  if (entry && entry.count >= MAX_WRONG) {
    return { ok: false, error: "Too many wrong codes. Please try again in 15 minutes." };
  }

  if (timingSafeEqual(digest(code), digest(expected))) {
    wrong.delete(key);
    return { ok: true };
  }
  wrong.set(key, { count: (entry?.count ?? 0) + 1, since: entry?.since ?? now });
  return { ok: false, error: "That access code is not correct." };
}
