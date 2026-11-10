import { createClient } from "@/lib/supabase/server";
import { countOf, dateIST, one, pagedRows, rowsOf } from "@/lib/data/helpers";
import { countRenewalsDue } from "@/lib/data/policies";
import type { Row } from "@/lib/module-types";
import { chipFor } from "@/lib/status";

const head = { count: "exact", head: true } as const;

/* -------------------------------- Ad controls ------------------------------- */

export async function getAdControls() {
  const db = await createClient();
  const [slotsRes, free, freeCountRes] = await Promise.all([
    db.from("ad_slots").select("slot_name, is_enabled, updated_at").order("slot_name"),
    pagedRows<{
      user_id: string;
      updated_at: string;
      users: { full_name: string | null; mobile_number: string } | { full_name: string | null; mobile_number: string }[] | null;
    }>(
      (from, to) =>
        db
          .from("ad_settings")
          .select("user_id, updated_at, users(full_name, mobile_number)")
          .eq("show_ads", false)
          .order("updated_at", { ascending: false })
          .order("id", { ascending: false })
          .range(from, to),
      "Ad-free users",
    ),
    db.from("ad_settings").select("id", head).eq("show_ads", false),
  ]);

  const slots = rowsOf<{ slot_name: string; is_enabled: boolean; updated_at: string }>(
    slotsRes,
    "Ad slots",
  );

  const slotRows: Row[] = slots.map((s) => ({
    id: s.slot_name,
    slot: chipFor(s.slot_name).label,
    status: s.is_enabled ? "on" : "off",
    updatedOn: dateIST(s.updated_at),
  }));

  const freeRows: Row[] = free.map((f) => {
    const user = one(f.users);
    return {
      id: f.user_id,
      name: user?.full_name ?? user?.mobile_number ?? null,
      mobile: user?.mobile_number,
      addedOn: dateIST(f.updated_at),
    };
  });

  const enabled = slots.filter((s) => s.is_enabled).length;
  const totalAdFree = countOf(freeCountRes, "Ad-free users count");
  return {
    slotRows,
    freeRows,
    totalAdFree,
    stats: { on: enabled, off: slots.length - enabled, adFree: totalAdFree },
  };
}

/* ------------------------------------ Staff --------------------------------- */

export async function getStaffList(currentStaffId?: string, actorIsAdmin: boolean = true) {
  const db = await createClient();
  let res: any = await db
    .from("staff_users")
    .select("id, full_name, email, role, role_id, created_at, auth_user_id, employee_code, mobile_number, designation, is_active, roles(name)")
    .order("created_at", { ascending: true });

  if (res.error) {
    // Fallback if migration 0010 hasn't been executed yet (roles table / role_id column not present)
    res = await db
      .from("staff_users")
      .select("id, full_name, email, role, created_at, auth_user_id, employee_code, mobile_number, designation, is_active")
      .order("created_at", { ascending: true });
  }

  const rows: Row[] = rowsOf<{
    id: string;
    full_name: string;
    email: string | null;
    auth_user_id: string | null;
    employee_code: string | null;
    mobile_number: string | null;
    designation: string | null;
    is_active: boolean | null;
    role: string | null;
    role_id: string | null;
    roles: { name: string } | { name: string }[] | null;
    created_at: string;
  }>(res, "Staff").map((s) => {
    const roleObj = one(s.roles);
    const displayRole = roleObj?.name || (s.role ? s.role.toUpperCase() : "Staff");
    const isSelf = s.id === currentStaffId;
    const isTargetAdmin = s.role === "admin";
    const hasLogin = Boolean(s.auth_user_id);

    return {
      id: s.id,
      name: s.full_name,
      email: s.email,
      employeeCode: s.employee_code,
      mobile: s.mobile_number,
      designation: s.designation,
      signIn: hasLogin ? "Can sign in" : "No login",
      agentState: hasLogin ? "login" : s.is_active === false ? "inactive" : "active",
      hasLogin: hasLogin ? "yes" : "no",
      role: s.role ?? "",
      roleLabel: displayRole,
      roleId: s.role_id,
      rawRole: s.role,
      joined: dateIST(s.created_at),
      isSelf: isSelf ? "yes" : "no",
      editableRole: hasLogin && !isSelf && actorIsAdmin ? "yes" : "no",
      canEditRow: actorIsAdmin || !isTargetAdmin ? "yes" : "no",
      canPermRow: hasLogin && !isSelf && (actorIsAdmin || !isTargetAdmin) ? "yes" : "no",
      canRemoveRow: !isSelf && (actorIsAdmin || !isTargetAdmin) ? "yes" : "no",
    };
  });

  return { rows };
}

/* ----------------------------------- Reports -------------------------------- */

export async function getReportStats() {
  const db = await createClient();
  const [users, policies, due] = await Promise.all([
    db.from("users").select("id", head),
    db.from("policies").select("id", head),
    countRenewalsDue(),
  ]);
  return {
    users: countOf(users, "Users count"),
    policies: countOf(policies, "Policies count"),
    renewalsDue: due,
  };
}
