import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Supabase Edge Function: delete-account
 * Authenticates the signed-in user via Bearer JWT, collects and deletes all customer files in
 * the private `DOCUMENTS` storage bucket (both DB-referenced and prefix-listed), deletes their
 * `public.users` profile (cascading policies, quotes, notifications, tokens, and support tickets),
 * and permanently removes the `auth.users` identity.
 */

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

async function listBucketFilesRecursive(
  admin: ReturnType<typeof createClient>,
  prefix: string,
): Promise<string[]> {
  const paths: string[] = [];
  const queue: string[] = [prefix];

  while (queue.length > 0) {
    const folder = queue.shift()!;
    let offset = 0;
    const limit = 100;

    while (true) {
      const { data, error } = await admin.storage.from("DOCUMENTS").list(folder, { limit, offset });
      if (error || !data || data.length === 0) break;

      for (const entry of data) {
        const entryPath = `${folder}/${entry.name}`;
        // Supabase Storage returns id = null on virtual folder entries.
        if (entry.id === null) {
          queue.push(entryPath);
        } else {
          paths.push(entryPath);
        }
      }

      if (data.length < limit) break;
      offset += limit;
    }
  }

  return paths;
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

  const authHeader = req.headers.get("Authorization") ?? "";
  const jwt = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!jwt) {
    return json({ ok: false, error: "Missing authorization token." }, 401);
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userRes, error: authErr } = await admin.auth.getUser(jwt);
  const authUser = userRes?.user;
  if (authErr || !authUser) {
    return json({ ok: false, error: "Your session has expired. Please sign in again." }, 401);
  }

  const { data: profile, error: profileErr } = await admin
    .from("users")
    .select("id")
    .eq("auth_user_id", authUser.id)
    .maybeSingle();

  if (profileErr) {
    return json({ ok: false, error: profileErr.message }, 500);
  }

  if (profile?.id) {
    const publicUserId = profile.id as string;
    const filePaths = new Set<string>();

    const { data: policies } = await admin
      .from("policies")
      .select("id")
      .eq("user_id", publicUserId);
    const policyIds = (policies ?? []).map((p) => p.id as string).filter(Boolean);
    if (policyIds.length > 0) {
      const { data: policyDocs } = await admin
        .from("policy_documents")
        .select("file_path")
        .in("policy_id", policyIds);
      for (const d of policyDocs ?? []) {
        if (typeof d.file_path === "string" && d.file_path) {
          filePaths.add(d.file_path);
        }
      }
    }

    const { data: quotes } = await admin
      .from("quote_requests")
      .select("id")
      .eq("user_id", publicUserId);
    const quoteIds = (quotes ?? []).map((q) => q.id as string).filter(Boolean);
    if (quoteIds.length > 0) {
      const { data: quoteDocs } = await admin
        .from("quote_documents")
        .select("file_path")
        .in("quote_id", quoteIds);
      for (const d of quoteDocs ?? []) {
        if (typeof d.file_path === "string" && d.file_path) {
          filePaths.add(d.file_path);
        }
      }
    }

    const prefixedPaths = await listBucketFilesRecursive(admin, publicUserId);
    for (const p of prefixedPaths) {
      filePaths.add(p);
    }

    const allPaths = Array.from(filePaths);
    for (let i = 0; i < allPaths.length; i += 100) {
      const batch = allPaths.slice(i, i + 100);
      const { error: rmErr } = await admin.storage.from("DOCUMENTS").remove(batch);
      if (rmErr) {
        return json({ ok: false, error: rmErr.message }, 500);
      }
    }

    const { error: delProfileErr } = await admin.from("users").delete().eq("id", publicUserId);
    if (delProfileErr) {
      return json({ ok: false, error: delProfileErr.message }, 500);
    }
  }

  const { error: delAuthErr } = await admin.auth.admin.deleteUser(authUser.id);
  if (delAuthErr) {
    return json({ ok: false, error: delAuthErr.message }, 500);
  }

  return json({ ok: true });
});
