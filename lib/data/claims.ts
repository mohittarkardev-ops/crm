import { createClient } from "@/lib/supabase/server";
import { countOf, dateIST, monthStart, pagedRows, todayIST } from "@/lib/data/helpers";
import type { Option, Row } from "@/lib/module-types";

type ClaimRecord = {
  id: string;
  staff_id: string | null;
  vehicle_reg_no: string;
  employee_name: string;
  payment_date: string;
  payment_mode: string;
  payment_amount: number | null;
  remarks: string | null;
  customer_name: string | null;
  customer_mobile: string | null;
  saod_due_date: string | null;
  due_date?: string | null;
  vehicle_category: string | null;
  vehicle_make?: string | null;
  vehicle_model?: string | null;
  idv?: number | null;
  policy_number?: string | null;
  insurer_name?: string | null;
  policy_id: string | null;
  status: string;
  created_at: string;
  document_path?: string | null;
  document_type?: string | null;
  customer_pincode?: string | null;
  customer_state?: string | null;
};

const BASE_COLS =
  "id, staff_id, vehicle_reg_no, employee_name, payment_date, payment_mode, payment_amount, remarks, customer_name, customer_mobile, saod_due_date, vehicle_category, policy_id, status, created_at";
const DOC_COLS = `${BASE_COLS}, document_path, document_type`;
const LOC_COLS = `${DOC_COLS}, customer_pincode, customer_state`;
const FULL_COLS = `${LOC_COLS}, due_date, policy_number, insurer_name, vehicle_make, vehicle_model, idv`;

/** Claims for the list (paged past 1,000 rows up to 10,000), agent filter options, and stat tiles. */
export async function getClaims() {
  const db = await createClient();
  // A month starts at midnight in India.
  const monthFrom = `${monthStart(todayIST())}T00:00:00+05:30`;
  const head = { count: "exact", head: true } as const;

  let migrationMissingDocs = false;

  const queryClaims = (cols: string) =>
    pagedRows<ClaimRecord>(
      (from, to) =>
        db
          .from("claims")
          .select(cols)
          .order("created_at", { ascending: false })
          .order("id", { ascending: false })
          .range(from, to),
      "Claims",
    );

  const fetchClaims = async () => {
    try {
      return await queryClaims(FULL_COLS);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (/due_date|policy_number|insurer_name|vehicle_make|vehicle_model|idv/i.test(msg)) {
        try {
          return await queryClaims(LOC_COLS);
        } catch (err2) {
          const msg2 = err2 instanceof Error ? err2.message : "";
          if (msg2.includes("customer_pincode") || msg2.includes("customer_state")) {
            try {
              return await queryClaims(DOC_COLS);
            } catch (err3) {
              const msg3 = err3 instanceof Error ? err3.message : "";
              if (msg3.includes("document_path") || msg3.includes("document_type")) {
                migrationMissingDocs = true;
                return await queryClaims(BASE_COLS);
              }
              throw err3;
            }
          }
          if (msg2.includes("document_path") || msg2.includes("document_type")) {
            migrationMissingDocs = true;
            return await queryClaims(BASE_COLS);
          }
          throw err2;
        }
      }
      if (msg.includes("customer_pincode") || msg.includes("customer_state")) {
        try {
          return await queryClaims(DOC_COLS);
        } catch (err2) {
          const msg2 = err2 instanceof Error ? err2.message : "";
          if (msg2.includes("document_path") || msg2.includes("document_type")) {
            migrationMissingDocs = true;
            return await queryClaims(BASE_COLS);
          }
          throw err2;
        }
      }
      if (msg.includes("document_path") || msg.includes("document_type")) {
        migrationMissingDocs = true;
        return await queryClaims(BASE_COLS);
      }
      throw err;
    }
  };

  const [records, totalRes, pending, reviewed] = await Promise.all([
    fetchClaims(),
    db.from("claims").select("id", head),
    db.from("claims").select("id", head).eq("status", "pending"),
    pagedRows<{ status: string; payment_amount: number | null }>(
      (from, to) =>
        db
          .from("claims")
          .select("status, payment_amount")
          .in("status", ["approved", "rejected"])
          .gte("reviewed_at", monthFrom)
          .order("id", { ascending: true })
          .range(from, to),
      "Claims this month",
    ),
  ]);

  const rows: Row[] = records.map((c) => ({
    id: c.id,
    refCode: `CLM-${c.id.slice(0, 8).toUpperCase()}`,
    vehicle: c.vehicle_reg_no,
    vehicleRegNo: c.vehicle_reg_no,
    agentName: c.employee_name,
    agent: c.staff_id ?? "",
    paymentDate: c.payment_date,
    mode: c.payment_mode,
    paymentMode: c.payment_mode,
    amount: c.payment_amount,
    customer: c.customer_name,
    customerName: c.customer_name,
    mobile: c.customer_mobile,
    customerMobile: c.customer_mobile,
    vehicleGroup: c.vehicle_category ?? "",
    vehicleMake: c.vehicle_make ?? "",
    vehicleModel: c.vehicle_model ?? "",
    idv: c.idv ?? null,
    policyNumber: c.policy_number ?? "",
    insurer: c.insurer_name ?? "",
    dueDate: c.due_date ?? c.saod_due_date,
    policyId: c.policy_id,
    vehicleKind: c.policy_id ? "In Policies" : "New vehicle",
    customerPincode: c.customer_pincode ?? "",
    customerState: c.customer_state ?? "",
    doc: c.document_path ? (c.document_type || "Policy copy") : null,
    docHref: c.document_path ? `/claims/${c.id}/document` : null,
    documentType: c.document_type ?? "Policy copy",
    remarks: c.remarks,
    status: c.status,
    submitted: dateIST(c.created_at),
  }));

  const uniqueAgents = Array.from(
    new Set(records.map((c) => c.employee_name?.trim()).filter((v): v is string => Boolean(v))),
  ).sort((a, b) => a.localeCompare(b));

  const agentFilterOptions: Option[] = uniqueAgents.map((name) => ({
    value: name,
    label: name,
  }));

  const approved = reviewed.filter((c) => c.status === "approved");

  return {
    rows,
    agentFilterOptions,
    migrationMissingDocs,
    totalCount: countOf(totalRes, "Claims count"),
    stats: {
      pending: countOf(pending, "Pending claims"),
      approvedThisMonth: approved.length,
      rejectedThisMonth: reviewed.length - approved.length,
      valueThisMonth: approved.reduce((sum, c) => sum + Number(c.payment_amount ?? 0), 0),
    },
  };
}

/** People a claim can be credited to. Admins see every active person; other staff only see themselves. */
export async function getAgentOptions(callerStaffId: string, isAdmin: boolean): Promise<Option[]> {
  const db = await createClient();
  let query = db.from("staff_users").select("id, full_name, employee_code").eq("is_active", true);
  if (!isAdmin) {
    query = query.eq("id", callerStaffId);
  }
  const res = await query.order("full_name");
  if (res.error) throw new Error(`Agents: ${res.error.message}`);
  return (res.data ?? []).map((s) => ({
    value: s.id as string,
    label: s.employee_code ? `${s.full_name} (${s.employee_code})` : (s.full_name as string),
  }));
}
