import { createClient } from "@/lib/supabase/server";
import { countOf, dateIST, monthStart, rowsOf, todayIST } from "@/lib/data/helpers";
import type { Option, Row } from "@/lib/module-types";

type ClaimRecord = {
  id: string;
  vehicle_reg_no: string;
  employee_name: string;
  payment_date: string;
  payment_mode: string;
  payment_amount: number | null;
  remarks: string | null;
  customer_name: string | null;
  customer_mobile: string | null;
  policy_id: string | null;
  status: string;
  created_at: string;
};

/** Claims for the list (latest 1,000) and the four tiles: waiting now, and approved / rejected / value this month. */
export async function getClaims() {
  const db = await createClient();
  // A month starts at midnight in India.
  const monthFrom = `${monthStart(todayIST())}T00:00:00+05:30`;

  const [list, pending, month] = await Promise.all([
    db
      .from("claims")
      .select(
        "id, vehicle_reg_no, employee_name, payment_date, payment_mode, payment_amount, remarks, customer_name, customer_mobile, policy_id, status, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(1000),
    db.from("claims").select("id", { count: "exact", head: true }).eq("status", "pending"),
    db.from("claims").select("status, payment_amount").in("status", ["approved", "rejected"]).gte("reviewed_at", monthFrom).limit(1000),
  ]);

  const rows: Row[] = rowsOf<ClaimRecord>(list, "Claims").map((c) => ({
    id: c.id,
    vehicle: c.vehicle_reg_no,
    agent: c.employee_name,
    paymentDate: c.payment_date,
    mode: c.payment_mode,
    amount: c.payment_amount,
    customer: c.customer_name,
    mobile: c.customer_mobile,
    vehicleKind: c.policy_id ? "In Policies" : "New vehicle",
    remarks: c.remarks,
    status: c.status,
    submitted: dateIST(c.created_at),
  }));

  const reviewed = rowsOf<{ status: string; payment_amount: number | null }>(month, "Claims this month");
  const approved = reviewed.filter((c) => c.status === "approved");

  return {
    rows,
    stats: {
      pending: countOf(pending, "Pending claims"),
      approvedThisMonth: approved.length,
      rejectedThisMonth: reviewed.length - approved.length,
      valueThisMonth: approved.reduce((sum, c) => sum + Number(c.payment_amount ?? 0), 0),
    },
  };
}

/** People a claim can be credited to. Admins see every active person; other staff only see themselves (row-level rules). */
export async function getAgentOptions(): Promise<Option[]> {
  const db = await createClient();
  const res = await db.from("staff_users").select("id, full_name, employee_code").eq("is_active", true).order("full_name");
  return rowsOf<{ id: string; full_name: string; employee_code: string | null }>(res, "Agents").map((s) => ({
    value: s.id,
    label: s.employee_code ? `${s.full_name} (${s.employee_code})` : s.full_name,
  }));
}
