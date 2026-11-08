import { createClient } from "@/lib/supabase/server";
import { countOf, dateIST, one, rowsOf } from "@/lib/data/helpers";
import { countRenewalsDue } from "@/lib/data/policies";
import type { Row } from "@/lib/module-types";
import { chipFor } from "@/lib/status";

const head = { count: "exact", head: true } as const;

/* -------------------------------- Ad controls ------------------------------- */

export async function getAdControls() {
  const db = await createClient();
  const [slotsRes, freeRes] = await Promise.all([
    db.from("ad_slots").select("slot_name, is_enabled, updated_at").order("slot_name"),
    db
      .from("ad_settings")
      .select("user_id, updated_at, users(full_name, mobile_number)")
      .eq("show_ads", false)
      .order("updated_at", { ascending: false })
      .limit(1000),
  ]);

  const slots = rowsOf<{ slot_name: string; is_enabled: boolean; updated_at: string }>(
    slotsRes,
    "Ad slots",
  );
  const free = rowsOf<{
    user_id: string;
    updated_at: string;
    users: { full_name: string | null; mobile_number: string } | { full_name: string | null; mobile_number: string }[] | null;
  }>(freeRes, "Ad-free users");

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
  return {
    slotRows,
    freeRows,
    stats: { on: enabled, off: slots.length - enabled, adFree: freeRows.length },
  };
}

/* ------------------------------------ Staff --------------------------------- */

export async function getStaffList(currentStaffId?: string) {
  const db = await createClient();
  const res = await db
    .from("staff_users")
    .select("id, full_name, email, role, created_at")
    .order("created_at", { ascending: true });

  const rows: Row[] = rowsOf<{
    id: string;
    full_name: string;
    email: string;
    role: string | null;
    created_at: string;
  }>(res, "Staff").map((s) => ({
    id: s.id,
    name: s.full_name,
    email: s.email,
    role: s.role,
    joined: dateIST(s.created_at),
    isSelf: s.id === currentStaffId ? "yes" : "no",
  }));

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
