"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/module-types";
import {
  audit,
  authorize,
  checkFile,
  dbMessage,
  done,
  fail,
  formValues,
  normalizeMobile,
  parseDate,
  readInsurerInput,
  resolveInsurer,
  text,
  type Db,
} from "@/lib/actions/shared";
import { dateIST, one, todayIST } from "@/lib/data/helpers";
import { syncIncentivesForDateSafe } from "@/lib/incentives-engine";
import { canonicalStateName, normalizePincode } from "@/lib/states";
import { validateIndianVehicleNumber } from "@/lib/vehicle-validation";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PAYMENT_MODES = ["Online", "NEFT", "Cheque", "GPay(UPI)", "Cash"]; // claims_payment_mode_check
const VEHICLE_GROUPS = ["2W", "4W", "CW", "CV"];
// Which policy type a vehicle group becomes when approving a claim creates a new policy.
const TYPE_FOR_GROUP: Record<string, string> = { "2W": "bike", "4W": "car", CW: "other", CV: "other" };

function parseClaimForm(formData: FormData, forcedAgentId?: string) {
  const agentId = forcedAgentId ?? text(formData, "agent");
  const regRaw = text(formData, "vehicleRegNo");
  const validation = validateIndianVehicleNumber(regRaw);
  const reg = validation.normalizedNumber;
  const paymentDate = parseDate(text(formData, "paymentDate"));
  const mode = text(formData, "paymentMode");
  const amountRaw = text(formData, "amount").replace(/,/g, "");
  const remarks = text(formData, "remarks");
  const customerName = text(formData, "customerName");
  const mobileRaw = text(formData, "customerMobile");
  const group = text(formData, "vehicleGroup");
  const dueDateRaw = text(formData, "dueDate") || text(formData, "saodDueDate");
  const policyNumber = text(formData, "policyNumber");
  const insurerRaw = text(formData, "insurer");
  const vehicleMake = text(formData, "vehicleMake");
  const vehicleModel = text(formData, "vehicleModel");
  const idvRaw = text(formData, "idv").replace(/,/g, "");
  const pinRaw = text(formData, "customerPincode");
  const stateRaw = text(formData, "customerState");
  const docType = text(formData, "documentType") || "Policy copy";
  const fileCheck = checkFile(formData.get("document"));

  const fieldErrors: Record<string, string> = {};
  const insurerName = insurerRaw ? readInsurerInput(formData, fieldErrors) : "";
  if (!UUID.test(agentId)) fieldErrors.agent = "Choose the agent.";
  if (validation.status === "INVALID") fieldErrors.vehicleRegNo = validation.message;
  if (!paymentDate || paymentDate > todayIST()) {
    fieldErrors.paymentDate = "Enter the payment date (not in the future).";
  }
  if (!PAYMENT_MODES.includes(mode)) fieldErrors.paymentMode = "Choose how it was paid.";

  let amount: number | null = null;
  if (amountRaw) {
    amount = Number(amountRaw);
    if (!Number.isFinite(amount) || amount < 0 || amount > 1_000_000_000) {
      fieldErrors.amount = "Enter a valid amount.";
    }
  }
  let idv: number | null = null;
  if (idvRaw) {
    idv = Number(idvRaw);
    if (!Number.isFinite(idv) || idv < 0 || idv > 1_000_000_000) {
      fieldErrors.idv = "Enter a valid IDV amount.";
    }
  }
  if (remarks.length > 500) fieldErrors.remarks = "Use 500 characters or fewer.";

  const mobile = mobileRaw ? normalizeMobile(mobileRaw) : null;
  if (mobileRaw && !mobile) fieldErrors.customerMobile = "Enter a valid 10-digit Indian mobile number.";
  const dueDate = dueDateRaw ? parseDate(dueDateRaw) : null;
  if (dueDateRaw && !dueDate) fieldErrors.dueDate = "Enter a valid date.";
  if (group && !VEHICLE_GROUPS.includes(group)) fieldErrors.vehicleGroup = "Choose 2W, 4W or CW.";
  if (customerName.length > 120) fieldErrors.customerName = "Name is too long.";
  if (policyNumber.length > 80) fieldErrors.policyNumber = "Policy number is too long.";
  if (vehicleMake.length > 80) fieldErrors.vehicleMake = "Make is too long.";
  if (vehicleModel.length > 80) fieldErrors.vehicleModel = "Model is too long.";
  const pincode = pinRaw ? normalizePincode(pinRaw) : null;
  if (pinRaw && !pincode) fieldErrors.customerPincode = "Enter a valid 6-digit PIN code.";
  const customerState = stateRaw ? canonicalStateName(stateRaw) : null;
  if (fileCheck.error) fieldErrors.document = fileCheck.error;

  return {
    fieldErrors,
    parsed: {
      agentId,
      reg,
      paymentDate: paymentDate!,
      mode,
      amount,
      remarks,
      customerName,
      mobile,
      group,
      dueDate,
      policyNumber: policyNumber || null,
      insurerName: insurerName || null,
      vehicleMake: vehicleMake || null,
      vehicleModel: vehicleModel || null,
      idv,
      pincode,
      customerState,
      docType: docType.slice(0, 60),
      file: fileCheck.file,
    },
  };
}

/** Stages an uploaded claim document safely under `claims/{claimId}/...` until claim approval. */
async function stageClaimDocument(
  db: Db,
  args: { claimId: string; file: File; docType: string; previousPath?: string | null },
): Promise<string | null> {
  const safeName = args.file.name.replace(/[^A-Za-z0-9._-]+/g, "_").slice(-80) || "document";
  const path = `claims/${args.claimId}/${Date.now()}-${safeName}`;

  const upload = await db.storage
    .from("DOCUMENTS")
    .upload(path, args.file, { contentType: args.file.type, upsert: false });
  if (upload.error) return upload.error.message;

  const update = await db
    .from("claims")
    .update({ document_path: path, document_type: args.docType })
    .eq("id", args.claimId);
  if (update.error) {
    await db.storage.from("DOCUMENTS").remove([path]);
    if (update.error.message.includes("document_path")) {
      return "Run migration 0014_claims_doc_and_incentives.sql in Supabase before uploading documents on claims.";
    }
    return dbMessage(update.error);
  }

  if (args.previousPath && args.previousPath.startsWith("claims/")) {
    await db.storage.from("DOCUMENTS").remove([args.previousPath]);
  }
  return null;
}

/**
 * Publishes a staged `claims/{id}/...` document into `{userId}/{policyId}/...` and `policy_documents`
 * when a claim is approved, so it immediately appears to the customer in the mobile app.
 */
async function publishClaimDocumentToPolicy(
  db: Db,
  args: { claimId: string; stagedPath: string; docType: string | null; userId: string; policyId: string },
): Promise<string | null> {
  const rawName = args.stagedPath.split("/").pop() ?? "document";
  const strippedTs = rawName.replace(/^\d{10,}-/, "");
  const cleanName = strippedTs.replace(/[^A-Za-z0-9._-]+/g, "_").slice(-80) || "document";
  const finalPath = `${args.userId}/${args.policyId}/${Date.now()}-${cleanName}`;

  const copied = await db.storage.from("DOCUMENTS").copy(args.stagedPath, finalPath);
  if (copied.error) {
    // Fallback if server storage copy rejects: stream down and re-upload into the client folder.
    const dl = await db.storage.from("DOCUMENTS").download(args.stagedPath);
    if (dl.error || !dl.data) return copied.error.message;
    const up = await db.storage
      .from("DOCUMENTS")
      .upload(finalPath, dl.data, { contentType: dl.data.type || "application/pdf", upsert: false });
    if (up.error) return up.error.message;
  }

  const record = await db
    .from("policy_documents")
    .insert({
      policy_id: args.policyId,
      file_path: finalPath,
      document_type: args.docType || "Policy copy",
      uploaded_by: "staff",
    });

  if (record.error) {
    await db.storage.from("DOCUMENTS").remove([finalPath]);
    return dbMessage(record.error);
  }

  await db.from("claims").update({ document_path: finalPath }).eq("id", args.claimId);
  if (args.stagedPath.startsWith("claims/")) {
    await db.storage.from("DOCUMENTS").remove([args.stagedPath]);
  }
  return null;
}

/**
 * Adds a claim: an agent says "I got this payment for this vehicle". Non-admin staff can only credit claims
 * to themselves. One open claim per vehicle (also enforced by the database).
 */
export async function createClaim(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const auth = await authorize("claims.create");
  if (!auth.staff) return auth.error;
  const staff = auth.staff;
  const values = formValues(formData);

  const forcedAgentId = staff.role === "admin" ? undefined : staff.id;
  const { fieldErrors, parsed } = parseClaimForm(formData, forcedAgentId);
  if (Object.keys(fieldErrors).length > 0) return fail("Please fix the highlighted fields.", { fieldErrors, values });

  const db = await createClient();

  const agent = await db
    .from("staff_users")
    .select("id, full_name")
    .eq("id", parsed.agentId)
    .eq("is_active", true)
    .maybeSingle();
  if (agent.error) return fail(dbMessage(agent.error), { values });
  if (!agent.data) return fail("That agent could not be found.", { fieldErrors: { agent: "Not available." }, values });

  const open = await db
    .from("claims")
    .select("id")
    .eq("vehicle_reg_no", parsed.reg)
    .neq("status", "rejected")
    .limit(1);
  if (open.error) return fail(dbMessage(open.error), { values });
  if ((open.data ?? []).length > 0) {
    return fail("A claim for this vehicle is already open.", {
      fieldErrors: { vehicleRegNo: "Already claimed." },
      values,
    });
  }

  const known = await db
    .from("policies")
    .select("id")
    .eq("vehicle_reg_no", parsed.reg)
    .order("due_date", { ascending: false })
    .limit(1);
  if (known.error) return fail(dbMessage(known.error), { values });
  const policyId = ((known.data ?? [])[0]?.id as string | undefined) ?? null;

  if (!policyId) {
    const missing: Record<string, string> = {};
    if (parsed.customerName.length < 2) missing.customerName = "Needed for a new vehicle.";
    if (!parsed.mobile) missing.customerMobile = "Needed for a new vehicle.";
    if (!parsed.group) missing.vehicleGroup = "Needed for a new vehicle.";
    if (!parsed.dueDate) missing.dueDate = "Needed for a new vehicle.";
    if (Object.keys(missing).length > 0) {
      return fail("This vehicle is not in Policies yet. Add the customer details below so a policy can be created.", {
        fieldErrors: missing,
        values,
      });
    }
  }

  const baseInsert = {
    staff_id: agent.data.id,
    employee_name: agent.data.full_name,
    vehicle_reg_no: parsed.reg,
    policy_id: policyId,
    payment_date: parsed.paymentDate,
    payment_mode: parsed.mode,
    payment_amount: parsed.amount,
    remarks: parsed.remarks || null,
    customer_name: parsed.customerName || null,
    customer_mobile: parsed.mobile,
    saod_due_date: null,
    vehicle_category: parsed.group || null,
  };

  const extInsert = {
    ...baseInsert,
    due_date: parsed.dueDate,
    policy_number: parsed.policyNumber,
    insurer_name: parsed.insurerName,
    vehicle_make: parsed.vehicleMake,
    vehicle_model: parsed.vehicleModel,
    idv: parsed.idv,
    customer_pincode: parsed.pincode,
    customer_state: parsed.customerState,
  };

  let inserted = await db.from("claims").insert(extInsert).select("id").single();
  if (inserted.error && /customer_pincode|policy_number|insurer_name|vehicle_make|vehicle_model|idv|due_date/i.test(inserted.error.message)) {
    inserted = await db
      .from("claims")
      .insert({ ...baseInsert, saod_due_date: parsed.dueDate })
      .select("id")
      .single();
  }
  if (inserted.error && inserted.error.code === "23514" && parsed.group === "CW") {
    inserted = await db
      .from("claims")
      .insert({ ...extInsert, vehicle_category: "CV" })
      .select("id")
      .single();
  }
  if (inserted.error) {
    if (inserted.error.code === "23505") {
      return fail("A claim for this vehicle is already open.", {
        fieldErrors: { vehicleRegNo: "Already claimed." },
        values,
      });
    }
    return fail(dbMessage(inserted.error), { values });
  }

  const claimId = inserted.data.id as string;
  await audit(db, staff.id, "claim.create", "claim", claimId);
  await syncIncentivesForDateSafe(todayIST(), { id: staff.id, name: staff.full_name });

  if (parsed.file) {
    const docErr = await stageClaimDocument(db, {
      claimId,
      file: parsed.file,
      docType: parsed.docType,
    });
    if (docErr) {
      revalidatePath("/claims");
      revalidatePath("/", "layout");
      return done(`Claim CLM-${claimId.slice(0, 8).toUpperCase()} added, but document could not be uploaded (${docErr}).`);
    }
    revalidatePath("/claims");
    revalidatePath("/", "layout");
    return done(`Claim CLM-${claimId.slice(0, 8).toUpperCase()} and document added for ${parsed.reg}.`);
  }

  revalidatePath("/claims");
  revalidatePath("/", "layout");
  return done(`Claim CLM-${claimId.slice(0, 8).toUpperCase()} added for ${parsed.reg}.`);
}

/** Edits a pending claim (reviewer/admin only). Approved or rejected claims cannot be modified. */
export async function updateClaim(id: string, _previous: ActionState, formData: FormData): Promise<ActionState> {
  const auth = await authorize("claims.approve");
  if (!auth.staff) return auth.error;
  const staff = auth.staff;
  if (!UUID.test(id)) return fail("That claim could not be found.");
  const values = formValues(formData);

  const { fieldErrors, parsed } = parseClaimForm(formData);
  if (Object.keys(fieldErrors).length > 0) return fail("Please fix the highlighted fields.", { fieldErrors, values });

  const db = await createClient();
  let existingDocPath: string | null = null;
  const existingRes = await db.from("claims").select("id, status, document_path").eq("id", id).maybeSingle();
  if (existingRes.error) {
    if (existingRes.error.message.includes("document_path")) {
      const fb = await db.from("claims").select("id, status").eq("id", id).maybeSingle();
      if (fb.error) return fail(dbMessage(fb.error), { values });
      if (!fb.data) return fail("That claim could not be found.", { values });
      if (fb.data.status !== "pending") return fail("Only pending claims can be edited.", { values });
    } else {
      return fail(dbMessage(existingRes.error), { values });
    }
  } else {
    if (!existingRes.data) return fail("That claim could not be found.", { values });
    if (existingRes.data.status !== "pending") return fail("Only pending claims can be edited.", { values });
    existingDocPath = (existingRes.data.document_path as string | null) ?? null;
  }

  const agent = await db
    .from("staff_users")
    .select("id, full_name")
    .eq("id", parsed.agentId)
    .eq("is_active", true)
    .maybeSingle();
  if (agent.error) return fail(dbMessage(agent.error), { values });
  if (!agent.data) return fail("That agent could not be found.", { fieldErrors: { agent: "Not available." }, values });

  const open = await db
    .from("claims")
    .select("id")
    .eq("vehicle_reg_no", parsed.reg)
    .neq("status", "rejected")
    .neq("id", id)
    .limit(1);
  if (open.error) return fail(dbMessage(open.error), { values });
  if ((open.data ?? []).length > 0) {
    return fail("Another claim for this vehicle is already open.", {
      fieldErrors: { vehicleRegNo: "Already claimed." },
      values,
    });
  }

  const known = await db
    .from("policies")
    .select("id")
    .eq("vehicle_reg_no", parsed.reg)
    .order("due_date", { ascending: false })
    .limit(1);
  if (known.error) return fail(dbMessage(known.error), { values });
  const policyId = ((known.data ?? [])[0]?.id as string | undefined) ?? null;

  if (!policyId) {
    const missing: Record<string, string> = {};
    if (parsed.customerName.length < 2) missing.customerName = "Needed for a new vehicle.";
    if (!parsed.mobile) missing.customerMobile = "Needed for a new vehicle.";
    if (!parsed.group) missing.vehicleGroup = "Needed for a new vehicle.";
    if (!parsed.dueDate) missing.dueDate = "Needed for a new vehicle.";
    if (Object.keys(missing).length > 0) {
      return fail("This vehicle is not in Policies yet. Fill in the customer details below.", {
        fieldErrors: missing,
        values,
      });
    }
  }

  const baseUpdate = {
    staff_id: agent.data.id,
    employee_name: agent.data.full_name,
    vehicle_reg_no: parsed.reg,
    policy_id: policyId,
    payment_date: parsed.paymentDate,
    payment_mode: parsed.mode,
    payment_amount: parsed.amount,
    remarks: parsed.remarks || null,
    customer_name: parsed.customerName || null,
    customer_mobile: parsed.mobile,
    saod_due_date: null,
    vehicle_category: parsed.group || null,
  };

  let updated = await db
    .from("claims")
    .update({
      ...baseUpdate,
      due_date: parsed.dueDate,
      policy_number: parsed.policyNumber,
      insurer_name: parsed.insurerName,
      vehicle_make: parsed.vehicleMake,
      vehicle_model: parsed.vehicleModel,
      idv: parsed.idv,
      customer_pincode: parsed.pincode,
      customer_state: parsed.customerState,
    })
    .eq("id", id)
    .eq("status", "pending")
    .select("id, created_at");
  if (updated.error && /customer_pincode|policy_number|insurer_name|vehicle_make|vehicle_model|idv|due_date/i.test(updated.error.message)) {
    updated = await db
      .from("claims")
      .update({ ...baseUpdate, saod_due_date: parsed.dueDate })
      .eq("id", id)
      .eq("status", "pending")
      .select("id, created_at");
  }

  if (updated.error) {
    if (updated.error.code === "23505") {
      return fail("Another claim for this vehicle is already open.", {
        fieldErrors: { vehicleRegNo: "Already claimed." },
        values,
      });
    }
    return fail(dbMessage(updated.error), { values });
  }
  if ((updated.data ?? []).length === 0) return fail("This claim was already reviewed.", { values });

  await audit(db, staff.id, "claim.update", "claim", id);
  await syncIncentivesForDateSafe(dateIST(updated.data?.[0]?.created_at as string | undefined), {
    id: staff.id,
    name: staff.full_name,
  });

  if (parsed.file) {
    const docErr = await stageClaimDocument(db, {
      claimId: id,
      file: parsed.file,
      docType: parsed.docType,
      previousPath: existingDocPath,
    });
    if (docErr) {
      revalidatePath("/claims");
      revalidatePath("/", "layout");
      return done(`Claim updated, but document could not be uploaded (${docErr}).`);
    }
    revalidatePath("/claims");
    revalidatePath("/", "layout");
    return done(`Claim and policy document updated for ${parsed.reg}.`);
  }

  revalidatePath("/claims");
  revalidatePath("/", "layout");
  return done(`Claim updated for ${parsed.reg}.`);
}

/**
 * Approves a pending claim. When the vehicle was not in Policies, the policy is created first (finding or creating the
 * client by mobile number), then the claim is marked approved. Any staged claim document is published into the
 * policy's DOCUMENTS folder so the customer immediately sees it in the mobile app.
 */
export async function approveClaim(id: string): Promise<ActionState> {
  const auth = await authorize("claims.approve");
  if (!auth.staff) return auth.error;
  const staff = auth.staff;
  if (!UUID.test(id)) return fail("That claim could not be found.");

  const db = await createClient();
  type ApproveClaimRow = {
    id: string;
    status: string;
    policy_id: string | null;
    vehicle_reg_no: string;
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
    payment_amount?: number | null;
    payment_date?: string | null;
    created_at: string;
    document_path?: string | null;
    document_type?: string | null;
    customer_pincode?: string | null;
  };
  let claim: ApproveClaimRow | null = null;

  const foundExt = await db
    .from("claims")
    .select(
      "id, status, policy_id, vehicle_reg_no, customer_name, customer_mobile, saod_due_date, due_date, vehicle_category, vehicle_make, vehicle_model, idv, policy_number, insurer_name, payment_amount, payment_date, created_at, document_path, document_type, customer_pincode",
    )
    .eq("id", id)
    .maybeSingle();

  if (foundExt.error) {
    if (
      foundExt.error.message.includes("document_path") ||
      foundExt.error.message.includes("customer_pincode") ||
      /policy_number|insurer_name|vehicle_make|vehicle_model|idv|due_date/i.test(foundExt.error.message)
    ) {
      const fb = await db
        .from("claims")
        .select(
          "id, status, policy_id, vehicle_reg_no, customer_name, customer_mobile, saod_due_date, vehicle_category, payment_amount, payment_date, created_at",
        )
        .eq("id", id)
        .maybeSingle();
      if (fb.error) return fail(dbMessage(fb.error));
      claim = (fb.data as ApproveClaimRow | null) ?? null;
    } else {
      return fail(dbMessage(foundExt.error));
    }
  } else {
    claim = (foundExt.data as ApproveClaimRow | null) ?? null;
  }

  if (!claim) return fail("That claim could not be found.");
  if (claim.status !== "pending") return fail("This claim was already reviewed.");

  const claimRef = `CLM-${claim.id.slice(0, 8).toUpperCase()}`;
  let policyId = claim.policy_id ?? null;
  let createdPolicyId: string | null = null;
  let createdRenewalId: string | null = null;
  let policyUserId: string | null = null;
  let priorPolicySnapshot: Record<string, unknown> | null = null;

  if (!policyId) {
    const name = (claim.customer_name ?? "").trim();
    const mobile = claim.customer_mobile ? normalizeMobile(claim.customer_mobile) : null;
    const dueDate = claim.due_date ?? claim.saod_due_date ?? null;
    const group = claim.vehicle_category ?? null;
    if (!name || !mobile || !dueDate || !group || !TYPE_FOR_GROUP[group]) {
      return fail(
        "This vehicle is not in Policies and the claim lacks the customer name, contact, vehicle type or due date.",
      );
    }

    const type = await db.from("policy_types").select("id").eq("code", TYPE_FOR_GROUP[group]).limit(1).maybeSingle();
    if (type.error) return fail(dbMessage(type.error));
    if (!type.data) return fail("The policy type for this vehicle group is missing.");

    let resolvedInsurer: { id: string; name: string } | null = null;
    if (claim.insurer_name?.trim()) {
      const res = await resolveInsurer(db, claim.insurer_name.trim());
      if ("error" in res) return fail(res.error);
      resolvedInsurer = res;
    }

    const existingUser = await db.from("users").select("id").eq("mobile_number", mobile).maybeSingle();
    if (existingUser.error) return fail(dbMessage(existingUser.error));
    let userId = (existingUser.data?.id as string | undefined) ?? null;
    if (!userId) {
      const user = await db
        .from("users")
        .insert({ mobile_number: mobile, full_name: name, is_advisor_client: true })
        .select("id")
        .single();
      if (user.error) return fail(dbMessage(user.error));
      userId = user.data.id as string;
    }
    policyUserId = userId;

    const policyNumber = claim.policy_number?.trim() || `PENDING-${claim.vehicle_reg_no}`;
    const startDate = claim.payment_date && claim.payment_date <= dueDate ? claim.payment_date : null;

    const policyPayload = {
      user_id: userId,
      type_id: type.data.id,
      insurer_id: resolvedInsurer?.id ?? null,
      insurer_name: resolvedInsurer?.name ?? claim.insurer_name?.trim() ?? null,
      policy_number: policyNumber,
      start_date: startDate,
      due_date: dueDate,
      saod_due_date: null,
      premium_amount: claim.payment_amount ?? null,
      owner_name: name,
      holder_name: name,
      holder_mobile: mobile,
      vehicle_reg_no: claim.vehicle_reg_no,
      vehicle_category: group,
      vehicle_make: claim.vehicle_make?.trim() || null,
      vehicle_model: claim.vehicle_model?.trim() || null,
      idv: claim.idv ?? null,
      pin: claim.customer_pincode ?? null,
      source: "advisor_added",
      verification_status: "verified",
    };
    let policy = await db.from("policies").insert(policyPayload).select("id").single();
    if (policy.error && policy.error.code === "23514" && group === "CW") {
      policy = await db
        .from("policies")
        .insert({ ...policyPayload, vehicle_category: "CV" })
        .select("id")
        .single();
    }
    if (policy.error) return fail(dbMessage(policy.error));
    policyId = policy.data.id as string;
    createdPolicyId = policyId;

    const initialRenewal = await db
      .from("renewals")
      .insert({
        policy_id: policyId,
        status: "renewed",
        renewal_date: claim.payment_date || todayIST(),
        previous_due_date: null,
        new_due_date: dueDate,
        previous_policy_number: null,
        new_policy_number: policyNumber,
        previous_insurer_name: null,
        new_insurer_name: resolvedInsurer?.name ?? claim.insurer_name?.trim() ?? null,
        premium_amount: claim.payment_amount ?? null,
        claim_id: claim.id,
        notes: `Initial policy created from claim ${claimRef}`,
      })
      .select("id")
      .single();
    if (!initialRenewal.error && initialRenewal.data?.id) {
      createdRenewalId = initialRenewal.data.id as string;
    }
  } else {
    const existingPolicy = await db
      .from("policies")
      .select(
        "id, user_id, policy_number, due_date, saod_due_date, start_date, insurer_id, insurer_name, premium_amount, insurers(name)",
      )
      .eq("id", policyId)
      .maybeSingle();
    if (existingPolicy.error) return fail(dbMessage(existingPolicy.error));
    if (!existingPolicy.data) return fail("The linked policy could not be found.");

    const existing = existingPolicy.data as {
      id: string;
      user_id: string | null;
      policy_number: string;
      due_date: string;
      saod_due_date: string | null;
      start_date: string | null;
      insurer_id: string | null;
      insurer_name: string | null;
      premium_amount: number | string | null;
      insurers: { name: string } | { name: string }[] | null;
    };
    policyUserId = existing.user_id ?? null;

    const prevInsurerName = one(existing.insurers)?.name ?? existing.insurer_name ?? null;
    const prevDueDate = existing.due_date ?? existing.saod_due_date ?? null;
    const prevPolicyNumber = existing.policy_number ?? null;

    const newPolicyNumber = claim.policy_number?.trim() || null;
    const newDueDate = claim.due_date ?? claim.saod_due_date ?? null;
    const newInsurerRaw = claim.insurer_name?.trim() || null;
    const newAmount = claim.payment_amount ?? null;

    let resolvedInsurer: { id: string; name: string } | null = null;
    if (newInsurerRaw) {
      const res = await resolveInsurer(db, newInsurerRaw);
      if ("error" in res) return fail(res.error);
      resolvedInsurer = res;
    }

    const policyUpdate: Record<string, unknown> = { verification_status: "verified" };
    if (newPolicyNumber) policyUpdate.policy_number = newPolicyNumber;
    if (newDueDate) {
      policyUpdate.due_date = newDueDate;
      policyUpdate.saod_due_date = null;
      if (claim.payment_date && claim.payment_date <= newDueDate) {
        policyUpdate.start_date = claim.payment_date;
      } else if (existing.start_date && existing.start_date > newDueDate) {
        policyUpdate.start_date = null;
      }
    }
    if (resolvedInsurer) {
      policyUpdate.insurer_id = resolvedInsurer.id;
      policyUpdate.insurer_name = resolvedInsurer.name;
    }
    if (newAmount !== null && newAmount !== undefined) {
      policyUpdate.premium_amount = newAmount;
    }
    if (claim.idv !== null && claim.idv !== undefined && Number(claim.idv) > 0) {
      policyUpdate.idv = Number(claim.idv);
    }
    if (claim.vehicle_category) {
      policyUpdate.vehicle_category = claim.vehicle_category;
    }
    if (claim.vehicle_make) {
      policyUpdate.vehicle_make = claim.vehicle_make;
    }
    if (claim.vehicle_model) {
      policyUpdate.vehicle_model = claim.vehicle_model;
    }

    priorPolicySnapshot = {
      policy_number: existing.policy_number,
      due_date: existing.due_date,
      saod_due_date: existing.saod_due_date,
      start_date: existing.start_date,
      insurer_id: existing.insurer_id,
      insurer_name: existing.insurer_name,
      premium_amount: existing.premium_amount,
    };

    const polUpd = await db.from("policies").update(policyUpdate).eq("id", policyId);
    if (polUpd.error) return fail(dbMessage(polUpd.error));

    // Preserve the prior due date, policy no., and insurer as an annual renewal timeline entry.
    const renewalInsert = await db
      .from("renewals")
      .insert({
        policy_id: policyId,
        status: "renewed",
        renewal_date: claim.payment_date || todayIST(),
        previous_due_date: prevDueDate,
        new_due_date: newDueDate ?? prevDueDate,
        previous_policy_number: prevPolicyNumber,
        new_policy_number: newPolicyNumber ?? prevPolicyNumber,
        previous_insurer_name: prevInsurerName,
        new_insurer_name: resolvedInsurer?.name ?? prevInsurerName,
        premium_amount: newAmount ?? (existing.premium_amount !== null ? Number(existing.premium_amount) : null),
        claim_id: claim.id,
        notes: `Renewed via claim ${claimRef}`,
      })
      .select("id")
      .single();

    if (renewalInsert.error) {
      if (/previous_due_date|new_due_date|claim_id/i.test(renewalInsert.error.message)) {
        await db.from("policies").update(priorPolicySnapshot).eq("id", policyId);
        return fail("Run migration 0022_claim_policy_fields_and_history.sql in Supabase before approving renewal claims.");
      }
      await db.from("policies").update(priorPolicySnapshot).eq("id", policyId);
      return fail(dbMessage(renewalInsert.error));
    }
    createdRenewalId = renewalInsert.data.id as string;
  }

  const updated = await db
    .from("claims")
    .update({ status: "approved", policy_id: policyId, reviewed_by: staff.id, reviewed_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "pending")
    .select("id");
  if (updated.error || (updated.data ?? []).length === 0) {
    if (createdRenewalId) await db.from("renewals").delete().eq("id", createdRenewalId);
    if (createdPolicyId) await db.from("policies").delete().eq("id", createdPolicyId);
    else if (priorPolicySnapshot && policyId) await db.from("policies").update(priorPolicySnapshot).eq("id", policyId);
    return fail(updated.error ? dbMessage(updated.error) : "This claim was already reviewed.");
  }

  await audit(db, staff.id, "claim.approve", "claim", id);
  await syncIncentivesForDateSafe(dateIST(claim.created_at), { id: staff.id, name: staff.full_name });
  if (policyId) {
    revalidatePath("/policies");
    revalidatePath(`/policies/${policyId}`);
  }
  revalidatePath("/claims");
  revalidatePath("/", "layout");

  let docNote = "";
  if (claim.document_path && policyId && policyUserId) {
    const pubErr = await publishClaimDocumentToPolicy(db, {
      claimId: id,
      stagedPath: claim.document_path,
      docType: claim.document_type ?? "Policy copy",
      userId: policyUserId,
      policyId,
    });
    if (pubErr) {
      docNote = ` Document could not be published automatically (${pubErr}).`;
    } else {
      await audit(db, staff.id, "document.upload", "policy", policyId);
      docNote = " Policy document published to the customer's policy.";
    }
  }

  const base = createdPolicyId
    ? "Claim approved and a policy was added for this vehicle."
    : "Claim approved, policy updated, and previous due date saved to Renewal History.";
  return done(`${base}${docNote}`);
}

/** Rejects a pending claim. A rejected claim no longer blocks a new claim for the same vehicle. */
export async function rejectClaim(id: string): Promise<ActionState> {
  const auth = await authorize("claims.approve");
  if (!auth.staff) return auth.error;
  const staff = auth.staff;
  if (!UUID.test(id)) return fail("That claim could not be found.");

  const db = await createClient();
  const updated = await db
    .from("claims")
    .update({ status: "rejected", reviewed_by: staff.id, reviewed_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "pending")
    .select("id, created_at");
  if (updated.error) return fail(dbMessage(updated.error));
  if ((updated.data ?? []).length === 0) return fail("This claim was already reviewed or could not be found.");

  await audit(db, staff.id, "claim.reject", "claim", id);
  await syncIncentivesForDateSafe(dateIST(updated.data?.[0]?.created_at as string | undefined), {
    id: staff.id,
    name: staff.full_name,
  });
  revalidatePath("/claims");
  revalidatePath("/", "layout");
  return done("Claim rejected.");
}

/** Permanently deletes a rejected claim (plus any staged unapproved document). Admin only. */
export async function deleteClaim(id: string): Promise<ActionState> {
  const auth = await authorize("claims.approve");
  if (!auth.staff) return auth.error;
  const staff = auth.staff;
  if (staff.role !== "admin") return fail("Only admins can permanently delete claims.");
  if (!UUID.test(id)) return fail("That claim could not be found.");

  const db = await createClient();
  let stagedDocPath: string | null = null;
  const foundExt = await db.from("claims").select("id, status, document_path").eq("id", id).maybeSingle();
  if (foundExt.error) {
    if (foundExt.error.message.includes("document_path")) {
      const fb = await db.from("claims").select("id, status").eq("id", id).maybeSingle();
      if (fb.error) return fail(dbMessage(fb.error));
      if (!fb.data) return fail("That claim could not be found.");
      if (fb.data.status !== "rejected") return fail("Only rejected claims can be deleted.");
    } else {
      return fail(dbMessage(foundExt.error));
    }
  } else {
    if (!foundExt.data) return fail("That claim could not be found.");
    if (foundExt.data.status !== "rejected") return fail("Only rejected claims can be deleted.");
    stagedDocPath = (foundExt.data.document_path as string | null) ?? null;
  }

  const removed = await db.from("claims").delete().eq("id", id).eq("status", "rejected").select("id");
  if (removed.error) return fail(dbMessage(removed.error));
  if ((removed.data ?? []).length === 0) return fail("That claim could not be deleted.");

  if (stagedDocPath && stagedDocPath.startsWith("claims/")) {
    await db.storage.from("DOCUMENTS").remove([stagedDocPath]);
  }

  await audit(db, staff.id, "claim.delete", "claim", id);
  revalidatePath("/claims");
  revalidatePath("/", "layout");
  return done("Rejected claim deleted.");
}
