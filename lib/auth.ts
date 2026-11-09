import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type StaffProfile = {
  id: string;
  full_name: string;
  email: string;
  role: "admin" | "staff" | null;
  role_id?: string | null;
  permissions?: string[];
};

/**
 * Current Supabase user plus their staff_users row (null if the account is not CRM staff).
 * Cached per request, so layouts and pages can call it freely.
 * Computes effective permissions from the user's role and individual overrides.
 */
export const getStaff = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { user: null, staff: null };

  const { data } = await supabase
    .from("staff_users")
    .select("id, full_name, email, role, role_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!data) return { user, staff: null };

  let permissions: string[] | undefined = undefined;

  if (data.role === "admin") {
    // Admin has full access to everything
  } else {
    try {
      // 1. Role permissions
      let rolePerms: string[] = [];
      if (data.role_id) {
        const { data: rpData } = await supabase
          .from("role_permissions")
          .select("permission")
          .eq("role_id", data.role_id);
        if (rpData) {
          rolePerms = rpData.map((r: any) => r.permission);
        }
      }

      // 2. Individual custom overrides
      const { data: customData } = await supabase
        .from("staff_custom_permissions")
        .select("permission, granted")
        .eq("staff_id", data.id);

      const grantedOverrides = new Set<string>();
      const revokedOverrides = new Set<string>();
      if (customData) {
        for (const item of customData as any[]) {
          if (item.granted) grantedOverrides.add(item.permission);
          else revokedOverrides.add(item.permission);
        }
      }

      const effective = new Set<string>(rolePerms);
      for (const p of grantedOverrides) effective.add(p);
      for (const p of revokedOverrides) effective.delete(p);

      if (data.role_id || (customData && customData.length > 0)) {
        permissions = Array.from(effective);
      }
    } catch {
      // If tables are not yet created, gracefully falls back to default role rules
    }
  }

  const staff: StaffProfile = {
    id: data.id,
    full_name: data.full_name,
    email: data.email,
    role: data.role as "admin" | "staff" | null,
    role_id: (data as any).role_id ?? null,
    permissions,
  };

  return { user, staff };
});
