import { createBrowserClient } from "@supabase/ssr";
import { supabaseEnv } from "@/lib/supabase/env";

/** Supabase client for Client Components (used for Realtime). Reads the staff session from the cookie. */
export function createClient() {
  const { url, key } = supabaseEnv();
  return createBrowserClient(url, key);
}
