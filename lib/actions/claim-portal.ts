"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyPortalCode } from "@/lib/claim-portal";
import { normalizeMobile, parseDate } from "@/lib/actions/shared";
import { addDays, todayIST } from "@/lib/data/helpers";

/*
 * Actions behind the public claim form (/claim). Visitors are not signed in, so every call carries the access code and
 * checks it again; the database is reached with the service key (the public API has no table access at all).
 */

const PAYMENT_MODES = ["Online", "NEFT", "Cheque", "GPay(UPI)"];
const VEHICLE_GROUPS = ["2W", "4W", "CV"];
const NO_KEY = "The server is missing its service key (SUPABASE_SERVICE_ROLE_KEY). Ask the admin.";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type PortalEmployee = { id: string; name: string };

export type PortalLookup =
  | { ok: true; state: "claimed"; message: string }
  | { ok: true; state: "known"; vehicle: string; customer: string; saodDue: string | null }
  | { ok: true; state: "unknown"; vehicle: string }
  | { ok: false; error: string };

export type PortalSubmitInput = {
  employeeId: string;
  vehicleRegNo: string;
  paymentDate: string;
  paymentMode: string;
  remarks: string;
  customerName: string;
  customerMobile: string;
  vehicleGroup: string;
  saodDueDate: string;
};

export type PortalResult = {
  ok: boolean;
  message?: string;
  claimId?: string;
  refCode?: string;
  error?: string;
  fieldErrors?: Record<string, string>;
};

function normalizeReg(value: string) {
  return value.toUpperCase().replace(/\s+/g, "");
}

const REG_PATTERN = /^[A-Z0-9-]{4,15}$/;

function dayLabel(timestamp: string) {
  return new Date(timestamp).toLocaleDateString("en-GB", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/** Checks the access code and returns the people a claim can be credited to. */
export async function unlockClaimPortal(
  code: string,
): Promise<{ ok: true; employees: PortalEmployee[] } | { ok: false; error: string }> {
  const check = await verifyPortalCode(String(code ?? ""));
  if (!check.ok) return check;
  const db = createAdminClient();
  if (!db) return { ok: false, error: NO_KEY };

  const res = await db.from("staff_users").select("id, full_name, employee_code").eq("is_active", true).order("full_name");
  if (res.error) return { ok: false, error: "Could not load the employee list. Please try again." };

  return {
    ok: true,
    employees: (res.data ?? []).map((s) => ({
      id: s.id as string,
      name: s.employee_code ? `${s.full_name} (${s.employee_code})` : (s.full_name as string),
    })),
  };
}

/** Is this vehicle already claimed, known in Policies, or new? */
export async function lookupClaimVehicle(code: string, regInput: string): Promise<PortalLookup> {
  const check = await verifyPortalCode(String(code ?? ""));
  if (!check.ok) return check;
  const db = createAdminClient();
  if (!db) return { ok: false, error: NO_KEY };

  const reg = normalizeReg(String(regInput ?? ""));
  if (!REG_PATTERN.test(reg)) return { ok: false, error: "Enter a valid registration number." };

  const open = await db
    .from("claims")
    .select("employee_name, created_at")
    .eq("vehicle_reg_no", reg)
    .neq("status", "rejected")
    .limit(1);
  if (open.error) return { ok: false, error: "Could not check this vehicle. Please try again." };
  const claim = (open.data ?? [])[0];
  if (claim) {
    return {
      ok: true,
      state: "claimed",
      message: `This vehicle was already claimed by ${claim.employee_name} on ${dayLabel(claim.created_at as string)}.`,
    };
  }

  const policy = await db
    .from("policies")
    .select("owner_name, holder_name, saod_due_date, due_date")
    .eq("vehicle_reg_no", reg)
    .order("due_date", { ascending: false })
    .limit(1);
  if (policy.error) return { ok: false, error: "Could not check this vehicle. Please try again." };
  const found = (policy.data ?? [])[0];
  if (!found) return { ok: true, state: "unknown", vehicle: reg };

  return {
    ok: true,
    state: "known",
    vehicle: reg,
    customer: ((found.owner_name ?? found.holder_name) as string | null) ?? "Not recorded",
    saodDue: ((found.saod_due_date ?? found.due_date) as string | null) ?? null,
  };
}

/**
 * Saves the claim. The vehicle is checked again here. A known vehicle becomes a pending claim linked to its policy; an
 * unknown vehicle becomes a pending claim with the customer details, which the admin verifies on the Claims page.
 */
export async function submitPortalClaim(code: string, input: PortalSubmitInput): Promise<PortalResult> {
  const check = await verifyPortalCode(String(code ?? ""));
  if (!check.ok) return { ok: false, error: check.error };
  const db = createAdminClient();
  if (!db) return { ok: false, error: NO_KEY };

  const today = todayIST();
  const reg = normalizeReg(String(input.vehicleRegNo ?? ""));
  const paymentDate = parseDate(String(input.paymentDate ?? ""));
  const remarks = String(input.remarks ?? "").trim();
  const customerName = String(input.customerName ?? "").trim();
  const mobileRaw = String(input.customerMobile ?? "").trim();
  const mobile = mobileRaw ? normalizeMobile(mobileRaw) : null;
  const saodRaw = String(input.saodDueDate ?? "").trim();
  const saod = saodRaw ? parseDate(saodRaw) : null;
  const group = String(input.vehicleGroup ?? "");

  const fieldErrors: Record<string, string> = {};
  if (!UUID.test(String(input.employeeId ?? ""))) fieldErrors.employeeId = "Choose your name.";
  if (!REG_PATTERN.test(reg)) fieldErrors.vehicleRegNo = "Enter a valid registration number.";
  if (!paymentDate || paymentDate > today || paymentDate < addDays(today, -365)) {
    fieldErrors.paymentDate = "Enter the payment date (today or earlier, within a year).";
  }
  if (!PAYMENT_MODES.includes(input.paymentMode)) fieldErrors.paymentMode = "Choose how it was paid.";
  if (remarks.length > 500) fieldErrors.remarks = "Use 500 characters or fewer.";
  if (Object.keys(fieldErrors).length > 0) return { ok: false, error: "Please fix the highlighted fields.", fieldErrors };

  const agent = await db.from("staff_users").select("id, full_name").eq("id", input.employeeId).eq("is_active", true).maybeSingle();
  if (agent.error) return { ok: false, error: "Could not check the employee. Please try again." };
  if (!agent.data) return { ok: false, error: "That employee is not available.", fieldErrors: { employeeId: "Not available." } };

  const open = await db.from("claims").select("employee_name, created_at").eq("vehicle_reg_no", reg).neq("status", "rejected").limit(1);
  if (open.error) return { ok: false, error: "Could not check this vehicle. Please try again." };
  const already = (open.data ?? [])[0];
  if (already) {
    return {
      ok: false,
      error: `This vehicle was already claimed by ${already.employee_name} on ${dayLabel(already.created_at as string)}.`,
    };
  }

  const known = await db.from("policies").select("id").eq("vehicle_reg_no", reg).order("due_date", { ascending: false }).limit(1);
  if (known.error) return { ok: false, error: "Could not check this vehicle. Please try again." };
  const policyId = ((known.data ?? [])[0]?.id as string | undefined) ?? null;

  if (!policyId) {
    const missing: Record<string, string> = {};
    if (customerName.length < 2 || customerName.length > 120) missing.customerName = "Enter the customer's name.";
    if (!mobile) missing.customerMobile = "Enter a valid 10-digit mobile number.";
    if (!VEHICLE_GROUPS.includes(group)) missing.vehicleGroup = "Choose the vehicle type.";
    if (!saod) missing.saodDueDate = "Enter the own-damage due date.";
    if (Object.keys(missing).length > 0) {
      return { ok: false, error: "Please fill in the customer details.", fieldErrors: missing };
    }
  }

  const inserted = await db
    .from("claims")
    .insert({
      staff_id: agent.data.id,
      employee_name: agent.data.full_name,
      vehicle_reg_no: reg,
      policy_id: policyId,
      payment_date: paymentDate,
      payment_mode: input.paymentMode,
      remarks: remarks || null,
      customer_name: policyId ? null : customerName,
      customer_mobile: policyId ? null : mobile,
      saod_due_date: policyId ? null : saod,
      vehicle_category: policyId ? null : group,
    })
    .select("id")
    .single();
  if (inserted.error) {
    if (inserted.error.code === "23505") {
      return { ok: false, error: "This vehicle was just claimed by someone else." };
    }
    return { ok: false, error: "Could not save the claim. Please try again." };
  }

  const claimId = inserted.data.id as string;
  const refCode = `CLM-${claimId.slice(0, 8).toUpperCase()}`;

  try {
    await db.from("audit_logs").insert({ staff_id: agent.data.id, action: "claim.submit", entity: "claim", entity_id: claimId });
  } catch {
    /* the audit trail must not break a save */
  }
  revalidatePath("/claims");

  return {
    ok: true,
    claimId,
    refCode,
    message: policyId
      ? `Claim ${refCode} submitted for ${reg}. The admin will review it.`
      : `Claim ${refCode} sent for admin approval. ${reg} will be verified and added by the admin.`,
  };
}
