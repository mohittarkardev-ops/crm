import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Supabase Edge Function: verify-otp
 * Verifies the 6-digit OTP stored in `public.whatsapp_otps`, provisions or finds the corresponding
 * `auth.users` account (guaranteeing `phone = '+91XXXXXXXXXX'` so `link_current_user()` links cleanly),
 * and mints a real Supabase Auth session (`access_token` + `refresh_token`) via `generateLink` + `verifyOtp`.
 */

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MAX_ATTEMPTS = 5;

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

function normalizePhoneDigits(raw: unknown): string {
  const d = String(raw ?? "").replace(/\D/g, "");
  if (d.length === 12 && d.startsWith("91")) return d.slice(2);
  if (d.length === 11 && d.startsWith("0")) return d.slice(1);
  return d;
}

async function hashOtp(phone: string, otp: string, secret: string): Promise<string> {
  const encoded = new TextEncoder().encode(`${phone}:${otp}:${secret}`);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function constantTimeEquals(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

type AuthRow = { id: string; email: string | null; phone: string | null };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }
  if (req.method !== "POST") {
    return json({ ok: false, error: "Method not allowed." }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  if (!supabaseUrl || !serviceKey || !anonKey) {
    return json({ ok: false, error: "Server configuration error." }, 500);
  }

  let body: { phone?: string; otp?: string; token?: string; fullName?: string };
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, error: "Invalid request payload." }, 400);
  }

  const phone = normalizePhoneDigits(body.phone);
  const otp = String(body.otp ?? body.token ?? "").replace(/\D/g, "");
  const cleanName = typeof body.fullName === "string" ? body.fullName.trim().slice(0, 120) : "";

  const demoPhone = normalizePhoneDigits(Deno.env.get("DEMO_OTP_PHONE") ?? "");
  const isDemo = Boolean(demoPhone && phone === demoPhone);

  if ((!isDemo && !/^[6-9]\d{9}$/.test(phone)) || !/^\d{6}$/.test(otp)) {
    return json({ ok: false, error: "Enter a valid mobile number and 6-digit code." }, 400);
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: row, error: fetchErr } = await admin
    .from("whatsapp_otps")
    .select("otp_hash, expires_at, attempts")
    .eq("phone", phone)
    .maybeSingle();

  if (fetchErr) {
    return json({ ok: false, error: fetchErr.message }, 500);
  }
  if (!row) {
    return json({ ok: false, error: "Verification code expired or not requested. Please request a new code." }, 400);
  }

  if (new Date(row.expires_at as string).getTime() <= Date.now()) {
    await admin.from("whatsapp_otps").delete().eq("phone", phone);
    return json({ ok: false, error: "That code has expired. Tap Resend for a new WhatsApp code." }, 400);
  }

  const attempts = Number(row.attempts ?? 0);
  if (attempts >= MAX_ATTEMPTS) {
    await admin.from("whatsapp_otps").delete().eq("phone", phone);
    return json({ ok: false, error: "Too many incorrect attempts. Please request a new code." }, 429);
  }

  const hashSecret = (Deno.env.get("OTP_HASH_SECRET") ?? "").trim() || serviceKey;
  const candidateHash = await hashOtp(phone, otp, hashSecret);

  if (!constantTimeEquals(candidateHash, String(row.otp_hash))) {
    const nextAttempts = attempts + 1;
    if (nextAttempts >= MAX_ATTEMPTS) {
      await admin.from("whatsapp_otps").delete().eq("phone", phone);
      return json({ ok: false, error: "Too many incorrect attempts. Please request a new code." }, 429);
    }
    await admin.from("whatsapp_otps").update({ attempts: nextAttempts }).eq("phone", phone);
    const left = MAX_ATTEMPTS - nextAttempts;
    return json(
      { ok: false, error: `Wrong verification code (${left} attempt${left === 1 ? "" : "s"} left).` },
      400,
    );
  }

  // Consume code immediately on valid match.
  await admin.from("whatsapp_otps").delete().eq("phone", phone);

  const e164Phone = `+91${phone}`;
  const syntheticEmail = `${phone}@wa.securedrive.local`;

  const lookupExisting = async (): Promise<AuthRow | null> => {
    const { data, error } = await admin.rpc("find_auth_user_by_phone", { p_digits: phone });
    if (error) {
      throw new Error(error.message);
    }
    const list = Array.isArray(data) ? data : data ? [data] : [];
    return (list[0] as AuthRow | undefined) ?? null;
  };

  let existing: AuthRow | null;
  try {
    existing = await lookupExisting();
  } catch (err) {
    return json({ ok: false, error: err instanceof Error ? err.message : "Could not look up account." }, 500);
  }

  let authEmail = syntheticEmail;
  if (existing?.id) {
    authEmail = (existing.email ?? "").trim() || syntheticEmail;
    const needsUpdate = !existing.email || existing.phone !== e164Phone;
    if (needsUpdate) {
      const { error: updErr } = await admin.auth.admin.updateUserById(existing.id, {
        email: authEmail,
        email_confirm: true,
        phone: e164Phone,
        phone_confirm: true,
      });
      if (updErr) {
        return json({ ok: false, error: updErr.message }, 500);
      }
    }
  } else {
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      phone: e164Phone,
      phone_confirm: true,
      email: syntheticEmail,
      email_confirm: true,
      user_metadata: cleanName ? { full_name: cleanName } : undefined,
    });
    if (createErr) {
      const retry = await lookupExisting().catch(() => null);
      if (!retry?.id) {
        return json({ ok: false, error: createErr.message }, 500);
      }
      authEmail = (retry.email ?? "").trim() || syntheticEmail;
      if (!retry.email || retry.phone !== e164Phone) {
        await admin.auth.admin.updateUserById(retry.id, {
          email: authEmail,
          email_confirm: true,
          phone: e164Phone,
          phone_confirm: true,
        });
      }
    } else if (created.user?.email) {
      authEmail = created.user.email;
    }
  }

  const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: authEmail,
  });
  const hashedToken = linkData?.properties?.hashed_token;
  if (linkErr || !hashedToken) {
    return json({ ok: false, error: linkErr?.message ?? "Could not start your session." }, 500);
  }

  const anon = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: sessionData, error: verifyErr } = await anon.auth.verifyOtp({
    token_hash: hashedToken,
    type: "email",
  });

  if (verifyErr || !sessionData.session) {
    return json({ ok: false, error: verifyErr?.message ?? "Verification failed." }, 500);
  }

  return json({
    ok: true,
    access_token: sessionData.session.access_token,
    refresh_token: sessionData.session.refresh_token,
    expires_in: sessionData.session.expires_in,
    expires_at: sessionData.session.expires_at,
    user: sessionData.user,
  });
});
