import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Supabase Edge Function: send-whatsapp-otp
 * Generates a 6-digit OTP, stores a SHA-256 hash in `public.whatsapp_otps` (service-role only),
 * enforces resend cooldown, per-phone hourly limit, and per-IP flood cap (against rotating-number
 * MSG91 cost abuse), and dispatches the code via MSG91 WhatsApp API.
 */

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const OTP_TTL_MS = 10 * 60 * 1000;
const RESEND_COOLDOWN_MS = 45 * 1000;
const RATE_WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_HOUR = 6;
const IP_WINDOW_MS = 15 * 60 * 1000;
const MAX_PER_IP_WINDOW = 15;
const DEFAULT_MSG91_URL = "https://control.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/bulk/";

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

function generateOtp(): string {
  const buf = new Uint32Array(1);
  const limit = 4_294_000_000;
  while (true) {
    crypto.getRandomValues(buf);
    if (buf[0] < limit) {
      return String(buf[0] % 1_000_000).padStart(6, "0");
    }
  }
}

async function sha256Hex(input: string): Promise<string> {
  const encoded = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function getClientIp(req: Request): string | null {
  const cf = req.headers.get("cf-connecting-ip")?.trim();
  if (cf) return cf;
  const realIp = req.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }
  if (req.method !== "POST") {
    return json({ ok: false, error: "Method not allowed." }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!supabaseUrl || !serviceKey) {
    return json({ ok: false, error: "Server configuration error." }, 500);
  }

  let body: { phone?: string };
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, error: "Invalid request payload." }, 400);
  }

  const phone = normalizePhoneDigits(body.phone);
  const demoPhone = normalizePhoneDigits(Deno.env.get("DEMO_OTP_PHONE") ?? "");
  const demoCode = (Deno.env.get("DEMO_OTP_CODE") ?? "").trim();
  const isDemo = Boolean(demoPhone && /^\d{6}$/.test(demoCode) && phone === demoPhone);

  if (!isDemo && !/^[6-9]\d{9}$/.test(phone)) {
    return json({ ok: false, error: "Enter a valid 10-digit Indian mobile number." }, 400);
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const now = Date.now();
  const nowIso = new Date(now).toISOString();
  const expiresAtIso = new Date(now + OTP_TTL_MS).toISOString();
  const hashSecret = (Deno.env.get("OTP_HASH_SECRET") ?? "").trim() || serviceKey;

  const clientIp = getClientIp(req);
  let ipHash: string | null = null;
  let nextIpCount = 1;
  let ipWindowStart = nowIso;

  if (clientIp && !isDemo) {
    ipHash = await sha256Hex(`ip:${clientIp}:${hashSecret}`);
    const { data: ipRow, error: ipErr } = await admin
      .from("whatsapp_otp_ip_limits")
      .select("request_count, window_started_at")
      .eq("ip_hash", ipHash)
      .maybeSingle();

    if (!ipErr && ipRow) {
      const ipWinMs = new Date(ipRow.window_started_at as string).getTime();
      if (now - ipWinMs < IP_WINDOW_MS) {
        const currentIpCount = Number(ipRow.request_count ?? 1);
        if (currentIpCount >= MAX_PER_IP_WINDOW) {
          return json(
            {
              ok: false,
              error: "Too many verification attempts from this network. Please wait a few minutes.",
            },
            429,
          );
        }
        nextIpCount = currentIpCount + 1;
        ipWindowStart = ipRow.window_started_at as string;
      }
    } else if (ipErr) {
      ipHash = null;
    }
  }

  const { data: existing, error: fetchErr } = await admin
    .from("whatsapp_otps")
    .select("resend_count, window_started_at, last_sent_at")
    .eq("phone", phone)
    .maybeSingle();

  if (fetchErr) {
    return json({ ok: false, error: fetchErr.message }, 500);
  }

  let resendCount = 1;
  let windowStartedAt = nowIso;

  if (existing && !isDemo) {
    const lastSentMs = new Date(existing.last_sent_at as string).getTime();
    const waitMs = RESEND_COOLDOWN_MS - (now - lastSentMs);
    if (waitMs > 0) {
      const retryAfterSeconds = Math.ceil(waitMs / 1000);
      return json(
        {
          ok: false,
          error: `Please wait ${retryAfterSeconds}s before requesting another code.`,
          retryAfterSeconds,
        },
        429,
      );
    }

    const windowMs = new Date(existing.window_started_at as string).getTime();
    if (now - windowMs < RATE_WINDOW_MS) {
      const currentCount = Number(existing.resend_count ?? 1);
      if (currentCount >= MAX_PER_HOUR) {
        return json(
          { ok: false, error: "Too many OTP requests. Please try again in an hour." },
          429,
        );
      }
      resendCount = currentCount + 1;
      windowStartedAt = existing.window_started_at as string;
    }
  }

  const otp = isDemo ? demoCode : generateOtp();
  const otpHash = await sha256Hex(`${phone}:${otp}:${hashSecret}`);

  if (!isDemo) {
    const authKey = (Deno.env.get("MSG91_AUTH_KEY") ?? "").trim();
    const integratedNumber = String(Deno.env.get("MSG91_WHATSAPP_NUMBER") ?? "").replace(/\D/g, "");
    const templateName = (Deno.env.get("MSG91_WHATSAPP_TEMPLATE") ?? "").trim();

    if (!authKey || !integratedNumber || !templateName) {
      return json(
        {
          ok: false,
          error: "WhatsApp OTP delivery is not configured yet. Set MSG91_AUTH_KEY, MSG91_WHATSAPP_NUMBER, and MSG91_WHATSAPP_TEMPLATE in Supabase secrets.",
        },
        503,
      );
    }

    const endpoint = (Deno.env.get("MSG91_WHATSAPP_ENDPOINT") ?? "").trim() || DEFAULT_MSG91_URL;
    const namespace = (Deno.env.get("MSG91_WHATSAPP_NAMESPACE") ?? "").trim();
    const languageCode = (Deno.env.get("MSG91_WHATSAPP_LANGUAGE") ?? "en").trim() || "en";
    const includeButton = (Deno.env.get("MSG91_WHATSAPP_INCLUDE_BUTTON") ?? "true").trim().toLowerCase() !== "false";

    const components: Record<string, unknown> = {
      body_1: { type: "text", value: otp },
    };
    if (includeButton) {
      components.button_1 = { subtype: "url", type: "text", value: otp };
    }

    const templateObj: Record<string, unknown> = {
      name: templateName,
      language: { code: languageCode, policy: "deterministic" },
      to_and_components: [
        {
          to: [`91${phone}`],
          components,
        },
      ],
    };
    if (namespace) {
      templateObj.namespace = namespace;
    }

    let msgRes: Response;
    let msgJson: Record<string, unknown> | null = null;
    try {
      msgRes = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          authkey: authKey,
        },
        body: JSON.stringify({
          integrated_number: integratedNumber,
          content_type: "template",
          payload: {
            messaging_product: "whatsapp",
            type: "template",
            template: templateObj,
          },
        }),
      });
      msgJson = await msgRes.json().catch(() => null);
    } catch (err) {
      console.error("MSG91 request failed:", err);
      return json({ ok: false, error: "Could not reach WhatsApp delivery service. Please try again." }, 502);
    }

    const statusLower = String(msgJson?.status ?? "").toLowerCase();
    const rejected = !msgRes.ok || msgJson?.hasError === true || statusLower === "fail" || statusLower === "error";
    if (rejected) {
      console.error("MSG91 rejected WhatsApp OTP:", msgRes.status, msgJson);
      return json(
        {
          ok: false,
          error: "Could not send WhatsApp verification code. Please verify your number or try again shortly.",
        },
        502,
      );
    }
  }

  const { error: upsertErr } = await admin.from("whatsapp_otps").upsert(
    {
      phone,
      otp_hash: otpHash,
      expires_at: expiresAtIso,
      attempts: 0,
      resend_count: resendCount,
      window_started_at: windowStartedAt,
      last_sent_at: nowIso,
    },
    { onConflict: "phone" },
  );

  if (upsertErr) {
    return json({ ok: false, error: upsertErr.message }, 500);
  }

  if (ipHash) {
    await admin.from("whatsapp_otp_ip_limits").upsert(
      {
        ip_hash: ipHash,
        request_count: nextIpCount,
        window_started_at: ipWindowStart,
        last_request_at: nowIso,
      },
      { onConflict: "ip_hash" },
    );
  }

  const staleCutoff = new Date(now - 60 * 60 * 1000).toISOString();
  await admin.from("whatsapp_otps").delete().lt("expires_at", staleCutoff);

  return json({
    ok: true,
    channel: "whatsapp",
    expiresInSeconds: Math.floor(OTP_TTL_MS / 1000),
    cooldownSeconds: Math.floor(RESEND_COOLDOWN_MS / 1000),
  });
});
