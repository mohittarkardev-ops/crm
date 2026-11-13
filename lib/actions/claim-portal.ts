"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyPortalCode } from "@/lib/claim-portal";
import { checkFile, normalizeMobile, parseDate, readInsurerInput, text } from "@/lib/actions/shared";
import { addDays, dateIST, one, todayIST } from "@/lib/data/helpers";
import { syncIncentivesForDateSafe } from "@/lib/incentives-engine";
import { canonicalStateName, normalizePincode } from "@/lib/states";
import {
  EMBEDDED_VEHICLE_CATALOG,
  type VehicleCatalogEntry,
  type VehicleCategory,
} from "@/lib/vehicle-catalog";
import { validateIndianVehicleNumber } from "@/lib/vehicle-validation";

/*
 * Actions behind the public claim form (/claim). Visitors are not signed in, so every call carries the access code and
 * checks it again; the database is reached with the service key (the public API has no table access at all).
 */

const PAYMENT_MODES = ["Online", "NEFT", "Cheque", "GPay(UPI)", "Cash"];
const VEHICLE_GROUPS = ["2W", "4W", "CW", "CV"];
const NO_KEY = "The server is missing its service key (SUPABASE_SERVICE_ROLE_KEY). Ask the admin.";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type PortalEmployee = { id: string; name: string };
export type PortalInsurer = { id: string; name: string; logoUrl: string | null };

export type PortalLookup =
  | { ok: true; state: "claimed"; message: string }
  | {
      ok: true;
      state: "known";
      vehicle: string;
      typ: string | null;
      customer: string | null;
      contact: string | null;
      make: string | null;
      model: string | null;
      insurer: string | null;
      policyNumber: string | null;
      idv: number | null;
      dueDate: string | null;
      pin: string | null;
    }
  | { ok: true; state: "unknown"; vehicle: string }
  | { ok: false; error: string };

export type PortalResult = {
  ok: boolean;
  message?: string;
  claimId?: string;
  refCode?: string;
  documentAttached?: boolean;
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

/** Checks the access code and returns the active CSE list, insurer directory, and vehicle catalog. */
export async function unlockClaimPortal(
  code: string,
): Promise<
  | {
      ok: true;
      employees: PortalEmployee[];
      insurers: PortalInsurer[];
      vehicleCatalog: VehicleCatalogEntry[];
    }
  | { ok: false; error: string }
> {
  const check = await verifyPortalCode(String(code ?? ""));
  if (!check.ok) return check;
  const db = createAdminClient();
  if (!db) return { ok: false, error: NO_KEY };

  const [staffRes, insurerRes] = await Promise.all([
    db.from("staff_users").select("id, full_name, employee_code").eq("is_active", true).order("full_name"),
    db.from("insurers").select("id, name, logo_url").order("name"),
  ]);
  if (staffRes.error) return { ok: false, error: "Could not load the employee list. Please try again." };

  let vehicleCatalog: VehicleCatalogEntry[] = EMBEDDED_VEHICLE_CATALOG;
  try {
    const catRes = await db
      .from("vehicle_catalog")
      .select("category, make, model, body_type, is_popular")
      .eq("is_active", true)
      .order("display_order")
      .order("make")
      .order("model");
    if (!catRes.error && catRes.data && catRes.data.length > 0) {
      vehicleCatalog = catRes.data.map((r) => ({
        category: r.category as VehicleCategory,
        make: r.make as string,
        model: r.model as string,
        bodyType: (r.body_type as string) || undefined,
        isPopular: Boolean(r.is_popular),
      }));
    }
  } catch {
    // Graceful fallback to embedded catalog
  }

  return {
    ok: true,
    employees: (staffRes.data ?? []).map((s) => ({
      id: s.id as string,
      name: s.employee_code ? `${s.full_name} (${s.employee_code})` : (s.full_name as string),
    })),
    insurers: (insurerRes.data ?? []).map((i) => ({
      id: i.id as string,
      name: i.name as string,
      logoUrl: (i.logo_url as string | null) ?? null,
    })),
    vehicleCatalog,
  };
}

/** Is this vehicle already claimed, known in Policies, or new? */
export async function lookupClaimVehicle(code: string, regInput: string): Promise<PortalLookup> {
  const check = await verifyPortalCode(String(code ?? ""));
  if (!check.ok) return check;
  const db = createAdminClient();
  if (!db) return { ok: false, error: NO_KEY };

  const validation = validateIndianVehicleNumber(String(regInput ?? ""));
  if (validation.status === "INVALID") return { ok: false, error: validation.message };
  const reg = validation.normalizedNumber;

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
    .select(
      "owner_name, holder_name, holder_mobile, vehicle_category, vehicle_make, vehicle_model, insurer_name, insurers(name), policy_number, idv, due_date, saod_due_date, pin",
    )
    .eq("vehicle_reg_no", reg)
    .order("due_date", { ascending: false })
    .limit(1);
  if (policy.error) return { ok: false, error: "Could not check this vehicle. Please try again." };
  const found = (policy.data ?? [])[0] as
    | {
        owner_name: string | null;
        holder_name: string | null;
        holder_mobile: string | null;
        vehicle_category: string | null;
        vehicle_make: string | null;
        vehicle_model: string | null;
        insurer_name: string | null;
        insurers: { name: string } | { name: string }[] | null;
        policy_number: string | null;
        idv: number | string | null;
        due_date: string | null;
        saod_due_date: string | null;
        pin: string | null;
      }
    | undefined;
  if (!found) return { ok: true, state: "unknown", vehicle: reg };

  return {
    ok: true,
    state: "known",
    vehicle: reg,
    typ: found.vehicle_category ?? null,
    customer: found.owner_name ?? found.holder_name ?? null,
    contact: found.holder_mobile ?? null,
    make: found.vehicle_make ?? null,
    model: found.vehicle_model ?? null,
    insurer: one(found.insurers)?.name ?? found.insurer_name ?? null,
    policyNumber: found.policy_number ?? null,
    idv: found.idv !== null && found.idv !== undefined ? Number(found.idv) : null,
    dueDate: found.due_date ?? found.saod_due_date ?? null,
    pin: found.pin ?? null,
  };
}

/**
 * Saves a claim from the public agent portal (/claim).
 * Both known and unknown vehicles require policy no., due date, insurer, amount/premium paid, payment date,
 * payment mode, and policy document upload. Unknown vehicles additionally mandate owner name, contact, vehicle type,
 * make, model, and IDV.
 */
export async function submitPortalClaim(formData: FormData): Promise<PortalResult> {
  const code = text(formData, "code");
  const check = await verifyPortalCode(code);
  if (!check.ok) return { ok: false, error: check.error };
  const db = createAdminClient();
  if (!db) return { ok: false, error: NO_KEY };

  const today = todayIST();
  const employeeId = text(formData, "employeeId");
  const regRaw = text(formData, "vehicleRegNo");
  const group = text(formData, "vehicleGroup");

  const validation = validateIndianVehicleNumber(regRaw, { vehicleCategory: group });
  const reg = validation.normalizedNumber;

  const paymentDate = parseDate(text(formData, "paymentDate"));
  const paymentMode = text(formData, "paymentMode");
  const amountRaw = text(formData, "amount").replace(/,/g, "");
  const remarks = text(formData, "remarks");
  const policyNumber = text(formData, "policyNumber");
  const dueDateRaw = text(formData, "dueDate");
  const dueDate = dueDateRaw ? parseDate(dueDateRaw) : null;
  const customerName = text(formData, "customerName");
  const mobileRaw = text(formData, "customerMobile");
  const mobile = mobileRaw ? normalizeMobile(mobileRaw) : null;
  const vehicleMake = text(formData, "vehicleMake");
  const vehicleModel = text(formData, "vehicleModel");
  const idvRaw = text(formData, "idv").replace(/,/g, "");
  const pinRaw = text(formData, "customerPincode");
  const stateRaw = text(formData, "customerState");
  const docType = (text(formData, "documentType") || "Policy copy").slice(0, 60);
  const fileCheck = checkFile(formData.get("document"));

  const fieldErrors: Record<string, string> = {};
  const insurerName = readInsurerInput(formData, fieldErrors);

  if (!UUID.test(employeeId)) fieldErrors.employeeId = "Choose your name.";
  if (validation.status === "INVALID") fieldErrors.vehicleRegNo = validation.message;
  if (!paymentDate || paymentDate > today || paymentDate < addDays(today, -365)) {
    fieldErrors.paymentDate = "Enter the payment date (today or earlier, within a year).";
  }
  if (!PAYMENT_MODES.includes(paymentMode)) fieldErrors.paymentMode = "Choose how it was paid.";

  const amount = amountRaw ? Number(amountRaw) : NaN;
  if (!amountRaw || !Number.isFinite(amount) || amount <= 0 || amount > 1_000_000_000) {
    fieldErrors.amount = "Enter the premium / amount paid.";
  }

  if (policyNumber.length < 2 || policyNumber.length > 80) {
    fieldErrors.policyNumber = "Enter a valid policy number (2–80 characters).";
  }
  if (!dueDate) fieldErrors.dueDate = "Select the policy due date.";

  const pincode = pinRaw ? normalizePincode(pinRaw) : null;
  if (pinRaw && !pincode) fieldErrors.customerPincode = "Enter a valid 6-digit PIN code.";
  const customerState = stateRaw ? canonicalStateName(stateRaw) : null;

  if (remarks.length > 500) fieldErrors.remarks = "Use 500 characters or fewer.";
  if (fileCheck.error) fieldErrors.document = fileCheck.error;
  else if (!fileCheck.file) fieldErrors.document = "Upload the policy document.";

  const known = await db.from("policies").select("id").eq("vehicle_reg_no", reg).order("due_date", { ascending: false }).limit(1);
  if (known.error) return { ok: false, error: "Could not check this vehicle. Please try again." };
  const policyId = ((known.data ?? [])[0]?.id as string | undefined) ?? null;

  let idv: number | null = null;
  const parsedIdv = idvRaw ? Number(idvRaw) : NaN;
  if (!idvRaw || !Number.isFinite(parsedIdv) || parsedIdv <= 0 || parsedIdv > 1_000_000_000) {
    fieldErrors.idv = "Enter a valid vehicle IDV (Insured Declared Value).";
  } else {
    idv = parsedIdv;
  }

  if (!policyId) {
    if (customerName.length < 2 || customerName.length > 120) fieldErrors.customerName = "Enter the owner's name.";
    if (!mobile) fieldErrors.customerMobile = "Enter a valid 10-digit contact number.";
    if (!VEHICLE_GROUPS.includes(group)) fieldErrors.vehicleGroup = "Choose the vehicle type (2W, 4W or CW).";
    if (vehicleMake.length < 1 || vehicleMake.length > 80) fieldErrors.vehicleMake = "Enter the vehicle make.";
    if (vehicleModel.length < 1 || vehicleModel.length > 80) fieldErrors.vehicleModel = "Enter the vehicle model.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, error: "Please fix the highlighted fields.", fieldErrors };
  }

  const agent = await db.from("staff_users").select("id, full_name").eq("id", employeeId).eq("is_active", true).maybeSingle();
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

  // Check agent's active incentive rule assignment to enforce category/territory scoping
  let requiresManualReview = validation.requiresManualReview;
  let ruleScopeNote: string | null = null;

  try {
    const assignRes = await db
      .from("incentive_agent_assignments")
      .select("id, vehicle_category, assigned_state, rule_id, status, notes")
      .eq("staff_id", agent.data.id)
      .eq("status", "active")
      .lte("effective_from", today)
      .or(`effective_until.is.null,effective_until.gte.${today}`)
      .order("effective_from", { ascending: false })
      .limit(1);

    const activeAssign = (assignRes.data ?? [])[0];
    if (!activeAssign) {
      requiresManualReview = true;
      ruleScopeNote = "Held for manual review: Agent has no active incentive rule assignment";
    } else {
      let assignedCat = activeAssign.vehicle_category;
      let assignedState = activeAssign.assigned_state;

      if (activeAssign.rule_id) {
        const ruleRes = await db
          .from("incentive_rules")
          .select("rule_name, vehicle_category, state_name, scope")
          .eq("id", activeAssign.rule_id)
          .maybeSingle();

        if (ruleRes.data) {
          if (ruleRes.data.vehicle_category) assignedCat = ruleRes.data.vehicle_category;
          if (ruleRes.data.scope === "exact_state" && ruleRes.data.state_name) assignedState = ruleRes.data.state_name;
        }
      }

      const catMismatch = Boolean(assignedCat && group && assignedCat.toUpperCase() !== group.toUpperCase());
      const stateMismatch = Boolean(
        assignedState &&
        customerState &&
        assignedState.toLowerCase() !== customerState.toLowerCase()
      );

      if (catMismatch || stateMismatch) {
        requiresManualReview = true;
        const mismatchReasons: string[] = [];
        if (catMismatch) mismatchReasons.push(`category ${group} outside assigned ${assignedCat}`);
        if (stateMismatch) mismatchReasons.push(`state ${customerState} outside assigned ${assignedState}`);
        ruleScopeNote = `Held for manual review: ${mismatchReasons.join(", ")}`;
      }
    }
  } catch {
    /* Rule check should never block claim creation if assignments table is unreachable */
  }

  const combinedRemarks = ruleScopeNote
    ? (remarks ? `${remarks} · [${ruleScopeNote}]` : `[${ruleScopeNote}]`)
    : (remarks || null);

  const basePayload = {
    staff_id: agent.data.id,
    employee_name: agent.data.full_name,
    vehicle_reg_no: reg,
    vehicle_registration_type: validation.registrationType,
    vehicle_validation_status: validation.status,
    vehicle_manual_review_required: requiresManualReview,
    policy_id: policyId,
    payment_date: paymentDate!,
    payment_mode: paymentMode,
    payment_amount: amount,
    remarks: combinedRemarks,
    policy_number: policyNumber,
    insurer_name: insurerName,
    due_date: dueDate!,
    saod_due_date: null,
    customer_name: customerName || null,
    customer_mobile: mobile || null,
    vehicle_category: group,
    vehicle_make: vehicleMake || null,
    vehicle_model: vehicleModel || null,
    idv: idv,
    customer_pincode: pincode,
    customer_state: customerState,
  };

  let inserted = await db.from("claims").insert(basePayload).select("id, created_at").single();
  // Safe fallback if migration 0025 has not yet been executed in Supabase
  if (
    inserted.error &&
    /vehicle_registration_type|vehicle_validation_status|vehicle_manual_review_required/i.test(inserted.error.message)
  ) {
    const {
      vehicle_registration_type,
      vehicle_validation_status,
      vehicle_manual_review_required,
      ...compatPayload
    } = basePayload;
    inserted = await db.from("claims").insert(compatPayload).select("id, created_at").single();
  }
  if (inserted.error && inserted.error.code === "23514" && group === "CW") {
    inserted = await db
      .from("claims")
      .insert({ ...basePayload, vehicle_category: "CV" })
      .select("id, created_at")
      .single();
  }
  if (inserted.error) {
    if (inserted.error.code === "23505") {
      return { ok: false, error: "This vehicle was just claimed by someone else." };
    }
    if (/policy_number|insurer_name|vehicle_make|vehicle_model|idv|due_date/i.test(inserted.error.message)) {
      return {
        ok: false,
        error: "Ask the admin to run migration 0022_claim_policy_fields_and_history.sql in Supabase SQL Editor first.",
      };
    }
    return { ok: false, error: "Could not save the claim. Please try again." };
  }

  const claimId = inserted.data.id as string;

  // Immediately persist updated IDV on existing policy record so customer mobile app reflects latest valuation
  if (policyId && idv !== null && idv > 0) {
    try {
      await db.from("policies").update({ idv }).eq("id", policyId);
    } catch {
      /* non-fatal fallback if policies schema lacks idv column */
    }
  }
  const refCode = `CLM-${claimId.slice(0, 8).toUpperCase()}`;

  const docFile = fileCheck.file!;
  const safeName = docFile.name.replace(/[^A-Za-z0-9._-]+/g, "_").slice(-80) || "document";
  const stagedPath = `claims/${claimId}/${Date.now()}-${safeName}`;
  const up = await db.storage
    .from("DOCUMENTS")
    .upload(stagedPath, docFile, { contentType: docFile.type, upsert: false });

  if (up.error) {
    await db.from("claims").delete().eq("id", claimId);
    return {
      ok: false,
      error: `Policy document could not be uploaded (${up.error.message}). Please try again.`,
      fieldErrors: { document: up.error.message },
    };
  }

  const upd = await db
    .from("claims")
    .update({ document_path: stagedPath, document_type: docType })
    .eq("id", claimId);
  if (upd.error) {
    await db.storage.from("DOCUMENTS").remove([stagedPath]);
    await db.from("claims").delete().eq("id", claimId);
    return {
      ok: false,
      error: upd.error.message.includes("document_path")
        ? "Ask admin to run migration 0014 so policy documents can attach to claims."
        : "Policy document could not be saved. Please try again.",
    };
  }

  try {
    await db.from("audit_logs").insert({ staff_id: agent.data.id, action: "claim.submit", entity: "claim", entity_id: claimId });
  } catch {
    /* the audit trail must not break a save */
  }
  await syncIncentivesForDateSafe(dateIST(inserted.data.created_at as string | undefined) ?? today, {
    id: agent.data.id as string,
    name: agent.data.full_name as string,
  });
  revalidatePath("/claims");
  revalidatePath("/incentives");
  revalidatePath("/", "layout");

  const baseMessage = policyId
    ? `Claim ${refCode} submitted for ${reg}. The admin will review and update the policy on approval.`
    : `Claim ${refCode} sent for admin approval. ${reg} will be verified and added by the admin.`;

  return {
    ok: true,
    claimId,
    refCode,
    documentAttached: true,
    message: baseMessage,
  };
}
