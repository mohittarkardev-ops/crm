import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type StaffProfile = {
  id: string;
  full_name: string;
  email: string;
  role: "admin" | "staff" | null;
  role_id?: string | null;
  role_name?: string | null;
  permissions?: string[];
};

/**
 * Current Supabase user plus their staff_users row (null if the account is not CRM staff).
 * Cached per request, so layouts and pages can call it freely.
 * Resolves effective permissions via `get_my_permissions()` RPC (single roundtrip) with a
 * clean fallback before migration 0012; fails closed (`undefined` -> dashboard.view only) on error.
 */
export const getStaff = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { user: null, staff: null };

  let data: {
    id: string;
    full_name: string;
    email: string;
    role: string | null;
    role_id?: string | null;
    roles?: { name: string } | { name: string }[] | null;
  } | null = null;

  const res = await supabase
    .from("staff_users")
    .select("id, full_name, email, role, role_id, roles(name)")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (res.error) {
    const fallbackRes = await supabase
      .from("staff_users")
      .select("id, full_name, email, role")
      .eq("auth_user_id", user.id)
      .maybeSingle();
    data = fallbackRes.data;
  } else {
    data = res.data;
  }

  if (!data) return { user, staff: null };

  const joinedRole = Array.isArray(data.roles) ? data.roles[0] : data.roles;
  const roleName = joinedRole?.name ?? null;

  let permissions: string[] | undefined = undefined;

  if (data.role !== "admin") {
    try {
      // Single security-definer RPC scoped strictly to auth.uid() (migration 0012).
      const rpcRes = await supabase.rpc("get_my_permissions");
      if (!rpcRes.error && Array.isArray(rpcRes.data)) {
        permissions = (rpcRes.data as { permission: string }[])
          .map((row) => row.permission)
          .filter((p): p is string => typeof p === "string");
      } else if (
        rpcRes.error?.code === "PGRST202" ||
        rpcRes.error?.code === "42883"
      ) {
        // Fallback when migration 0012 has not been applied yet: load role + own overrides explicitly.
        const [rpRes, customRes] = await Promise.all([
          data.role_id
            ? supabase.from("role_permissions").select("permission").eq("role_id", data.role_id)
            : Promise.resolve({ data: [], error: null }),
          supabase.from("staff_custom_permissions").select("permission, granted").eq("staff_id", data.id),
        ]);

        if (!rpRes.error && !customRes.error) {
          const effective = new Set<string>(
            ((rpRes.data ?? []) as { permission: string }[]).map((r) => r.permission),
          );
          for (const item of (customRes.data ?? []) as { permission: string; granted: boolean }[]) {
            if (item.granted) effective.add(item.permission);
            else effective.delete(item.permission);
          }
          permissions = Array.from(effective);
        }
      }
    } catch {
      // Leave permissions undefined -> `can()` fails closed to `dashboard.view` only.
    }
  }

  const staff: StaffProfile = {
    id: data.id,
    full_name: data.full_name,
    email: data.email,
    role: data.role as "admin" | "staff" | null,
    role_id: data.role_id ?? null,
    role_name: roleName,
    permissions,
  };

  return { user, staff };
});
