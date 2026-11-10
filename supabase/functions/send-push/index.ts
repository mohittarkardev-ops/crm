import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Supabase Edge Function: send-push
 * Dispatches Expo Push notifications to all `device_tokens` belonging to the requested `user_ids`,
 * and prunes tokens that Expo reports as `DeviceNotRegistered`.
 *
 * Expected JSON body:
 *   { user_ids: string[], title: string, body: string, data?: Record<string, unknown> }
 *
 * Auth: Requires Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>
 */

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ ok: false, error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!supabaseUrl || !serviceKey) {
    return new Response(JSON.stringify({ ok: false, error: "Missing Supabase environment variables" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  if (authHeader !== `Bearer ${serviceKey}`) {
    return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  let payload: { user_ids?: string[]; title?: string; body?: string; data?: Record<string, unknown> };
  try {
    payload = await req.json();
  } catch {
    return new Response(JSON.stringify({ ok: false, error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const userIds = Array.isArray(payload.user_ids) ? payload.user_ids.filter(Boolean) : [];
  const title = typeof payload.title === "string" ? payload.title.trim() : "";
  const body = typeof payload.body === "string" ? payload.body.trim() : "";
  if (userIds.length === 0 || !title || !body) {
    return new Response(JSON.stringify({ ok: false, error: "user_ids, title, and body are required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Collect all registered Expo push tokens for the target users
  const tokens: string[] = [];
  for (let i = 0; i < userIds.length; i += 500) {
    const slice = userIds.slice(i, i + 500);
    const { data, error } = await admin.from("device_tokens").select("token").in("user_id", slice);
    if (error) {
      return new Response(JSON.stringify({ ok: false, error: error.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
    for (const row of data ?? []) {
      if (row.token) tokens.push(row.token as string);
    }
  }

  if (tokens.length === 0) {
    return new Response(JSON.stringify({ ok: true, sent: 0, failed: 0, totalTokens: 0 }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  const expoAccessToken = Deno.env.get("EXPO_ACCESS_TOKEN");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (expoAccessToken) {
    headers.Authorization = `Bearer ${expoAccessToken}`;
  }

  let sent = 0;
  let failed = 0;
  const staleTokens: string[] = [];

  // Expo Push API accepts up to 100 messages per request
  for (let i = 0; i < tokens.length; i += 100) {
    const batch = tokens.slice(i, i + 100);
    const messages = batch.map((to) => ({
      to,
      sound: "default",
      title,
      body,
      data: payload.data ?? {},
    }));

    try {
      const res = await fetch(EXPO_PUSH_URL, {
        method: "POST",
        headers,
        body: JSON.stringify(messages),
      });
      if (!res.ok) {
        failed += batch.length;
        continue;
      }
      const json = (await res.json()) as {
        data?: { status?: string; details?: { error?: string } }[];
      };
      const tickets = json.data ?? [];
      for (let idx = 0; idx < batch.length; idx++) {
        const ticket = tickets[idx];
        if (ticket?.status === "ok") {
          sent++;
        } else {
          failed++;
          if (ticket?.details?.error === "DeviceNotRegistered") {
            staleTokens.push(batch[idx]);
          }
        }
      }
    } catch {
      failed += batch.length;
    }
  }

  // Prune dead tokens so future dispatches stay fast
  for (let i = 0; i < staleTokens.length; i += 200) {
    await admin.from("device_tokens").delete().in("token", staleTokens.slice(i, i + 200));
  }

  return new Response(JSON.stringify({ ok: true, sent, failed, totalTokens: tokens.length }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
