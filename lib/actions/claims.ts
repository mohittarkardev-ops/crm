"use server";

import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/module-types";
import { audit, authorize, dbMessage, done, fail, formValues, normalizeMobile, parseDate, text } from "@/lib/actions/shared";
import { todayIST } from "@/lib/data/helpers";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PAYMENT_MODES = ["Online", "NEFT", "Cheque", "GPay(UPI)", "Cash"]; // claims_payment_mode_check
const VEHICLE_GROUPS = ["2W", "4W", "CV"];
// Which policy type a vehicle group becomes when approving a claim creates a new policy.
const TYPE_FOR_GROUP: Record<string, string> = { "2W": "bike", "4W": "car", CV: "other" };

/**
 * Adds a claim: an agent says "I got this payment for this vehicle". If the vehicle is already in Policies the claim
 * links to it. If not, the customer name, mobile, vehicle group and own-damage due date are needed so that approving
 * the claim can create the policy. One open claim per vehicle (also enforced by the database).
 */
export async function createClaim(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const auth = await authorize("claims.create");
  if (!auth.staff) return auth.error;
  const staff = auth.staff;
  const values = formValues(formData);

  const agentId = text(formData, "agent");
  const reg = text(formData, "vehicleRegNo").toUpperCase().replace(/\s+/g, "");
  const paymentDate = parseDate(text(formData, "paymentDate"));
  const mode = text(formData, "paymentMode");
  const amountRaw = text(formData, "amount").replace(/,/g, "");
  const remarks = text(formData, "remarks");
  const customerName = text(formData, "customerName");
  const mobileRaw = text(formData, "customerMobile");
  const group = text(formData, "vehicleGroup");
  const saodRaw = text(formData, "saodDueDate");

  const fieldErrors: Record<string, string> = {};
  if (!UUID.test(agentId)) fieldErrors.agent = "Choose the agent.";
  if (!/^[A-Z0-9-]{4,15}$/.test(reg)) fieldErrors.vehicleRegNo = "Enter a valid registration number.";
  if (!paymentDate || paymentDate > todayIST()) fieldErrors.paymentDate = "Enter the payment date (not in the future).";
  if (!PAYMENT_MODES.includes(mode)) fieldErrors.paymentMode = "Choose how it was paid.";
  let amount: number | null = null;
  if (amountRaw) {
    amount = Number(amountRaw);
    if (!Number.isFinite(amount) || amount < 0 || amount > 1_000_000_000) fieldErrors.amount = "Enter a valid amount.";
  }
  if (remarks.length > 500) fieldErrors.remarks = "Use 500 characters or fewer.";
  const mobile = mobileRaw ? normalizeMobile(mobileRaw) : null;
  if (mobileRaw && !mobile) fieldErrors.customerMobile = "Enter a valid 10-digit Indian mobile number.";
  const saod = saodRaw ? parseDate(saodRaw) : null;
  if (saodRaw && !saod) fieldErrors.saodDueDate = "Enter a valid date.";
  if (group && !VEHICLE_GROUPS.includes(group)) fieldErrors.vehicleGroup = "Choose 2W, 4W or CV.";
  if (customerName.length > 120) fieldErrors.customerName = "Name is too long.";
  if (Object.keys(fieldErrors).length > 0) return fail("Please fix the highlighted fields.", { fieldErrors, values });

  const db = await createClient();

  const agent = await db.from("staff_users").select("id, full_name").eq("id", agentId).eq("is_active", true).maybeSingle();
  if (agent.error) return fail(dbMessage(agent.error), { values });
  if (!agent.data) return fail("That agent could not be found.", { fieldErrors: { agent: "Not available." }, values });

  const open = await db.from("claims").select("id").eq("vehicle_reg_no", reg).neq("status", "rejected").limit(1);
  if (open.error) return fail(dbMessage(open.error), { values });
  if ((open.data ?? []).length > 0) {
    return fail("A claim for this vehicle is already open.", { fieldErrors: { vehicleRegNo: "Already claimed." }, values });
  }

  const known = await db.from("policies").select("id").eq("vehicle_reg_no", reg).order("due_date", { ascending: false }).limit(1);
  if (known.error) return fail(dbMessage(known.error), { values });
  const policyId = ((known.data ?? [])[0]?.id as string | undefined) ?? null;

  if (!policyId) {
    const missing: Record<string, string> = {};
    if (customerName.length < 2) missing.customerName = "Needed for a new vehicle.";
    if (!mobile) missing.customerMobile = "Needed for a new vehicle.";
    if (!group) missing.vehicleGroup = "Needed for a new vehicle.";
    if (!saod) missing.saodDueDate = "Needed for a new vehicle.";
    if (Object.keys(missing).length > 0) {
      return fail("This vehicle is not in Policies yet. Add the customer details below so a policy can be created.", {
        fieldErrors: missing,
        values,
      });
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
      payment_mode: mode,
      payment_amount: amount,
      remarks: remarks || null,
      customer_name: customerName || null,
      customer_mobile: mobile,
      saod_due_date: saod,
      vehicle_category: group || null,
    })
    .select("id")
    .single();
  if (inserted.error) {
    if (inserted.error.code === "23505") {
      return fail("A claim for this vehicle is already open.", { fieldErrors: { vehicleRegNo: "Already claimed." }, values });
    }
    return fail(dbMessage(inserted.error), { values });
  }

  await audit(db, staff.id, "claim.create", "claim", inserted.data.id as string);
  return done(`Claim added for ${reg}.`);
}

/**
 * Approves a pending claim. When the vehicle was not in Policies, the policy is created first (finding or creating the
 * client by mobile number), then the claim is marked approved. If the second step fails the new policy is removed again.
 */
export async function approveClaim(id: string): Promise<ActionState> {
  const auth = await authorize("claims.approve");
  if (!auth.staff) return auth.error;
  const staff = auth.staff;
  if (!UUID.test(id)) return fail("That claim could not be found.");

  const db = await createClient();
  const found = await db
    .from("claims")
    .select("id, status, policy_id, vehicle_reg_no, customer_name, customer_mobile, saod_due_date, vehicle_category")
    .eq("id", id)
    .maybeSingle();
  if (found.error) return fail(dbMessage(found.error));
  const claim = found.data;
  if (!claim) return fail("That claim could not be found.");
  if (claim.status !== "pending") return fail("This claim was already reviewed.");

  let policyId = (claim.policy_id as string | null) ?? null;
  let createdPolicyId: string | null = null;

  if (!policyId) {
    const name = ((claim.customer_name as string | null) ?? "").trim();
    const mobile = claim.customer_mobile ? normalizeMobile(claim.customer_mobile as string) : null;
    const saod = (claim.saod_due_date as string | null) ?? null;
    const group = (claim.vehicle_category as string | null) ?? null;
    if (!name || !mobile || !saod || !group || !TYPE_FOR_GROUP[group]) {
      return fail("This vehicle is not in Policies and the claim lacks the customer name, mobile, vehicle group or own-damage due date.");
    }

    const type = await db.from("policy_types").select("id").eq("code", TYPE_FOR_GROUP[group]).limit(1).maybeSingle();
    if (type.error) return fail(dbMessage(type.error));
    if (!type.data) return fail("The policy type for this vehicle group is missing.");

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

    const policy = await db
      .from("policies")
      .insert({
        user_id: userId,
        type_id: type.data.id,
        policy_number: null,
        due_date: saod,
        saod_due_date: saod,
        owner_name: name,
        holder_name: name,
        holder_mobile: mobile,
        vehicle_reg_no: claim.vehicle_reg_no,
        vehicle_category: group,
        source: "advisor_added",
      })
      .select("id")
      .single();
    if (policy.error) return fail(dbMessage(policy.error));
    policyId = policy.data.id as string;
    createdPolicyId = policyId;
  }

  const updated = await db
    .from("claims")
    .update({ status: "approved", policy_id: policyId, reviewed_by: staff.id, reviewed_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "pending")
    .select("id");
  if (updated.error || (updated.data ?? []).length === 0) {
    if (createdPolicyId) await db.from("policies").delete().eq("id", createdPolicyId);
    return fail(updated.error ? dbMessage(updated.error) : "This claim was already reviewed.");
  }

  await audit(db, staff.id, "claim.approve", "claim", id);
  return done(createdPolicyId ? "Claim approved and a policy was added for this vehicle." : "Claim approved.");
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
    .select("id");
  if (updated.error) return fail(dbMessage(updated.error));
  if ((updated.data ?? []).length === 0) return fail("This claim was already reviewed or could not be found.");

  await audit(db, staff.id, "claim.reject", "claim", id);
  return done("Claim rejected.");
}
