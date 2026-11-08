import { createClient } from "@supabase/supabase-js";

/**
 * Supabase client with the service role key. It bypasses row level security and can create and delete logins,
 * so it is used only inside server actions for admin-only work (managing staff accounts). The key is read from
 * SUPABASE_SERVICE_ROLE_KEY, which must NOT start with NEXT_PUBLIC_. Returns null when the key is not set.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
