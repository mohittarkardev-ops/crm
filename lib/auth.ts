import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type StaffProfile = {
  id: string;
  full_name: string;
  email: string;
  role: "admin" | "staff" | null;
};

/**
 * Current Supabase user plus their staff_users row (null if the account is not CRM staff).
 * Cached per request, so layouts and pages can call it freely.
 */
export const getStaff = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { user: null, staff: null };

  const { data } = await supabase
    .from("staff_users")
    .select("id, full_name, email, role")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  return { user, staff: (data as StaffProfile | null) ?? null };
});
