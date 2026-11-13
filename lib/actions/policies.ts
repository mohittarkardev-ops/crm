"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { one, todayIST } from "@/lib/data/helpers";
import type { ActionState } from "@/lib/module-types";
import {
  authorize,
  audit,
  checkFile,
  dbMessage,
  done,
  fail,
  formValues,
  normalizeMobile,
  parseDate,
  readInsurerInput,
  resolveInsurer,
  storeDocument,
  text,
  type Db,
} from "@/lib/actions/shared";
import { categoryLabel } from "@/lib/status";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CATEGORIES = ["car", "bike", "health", "term", "other"];
const VEHICLE_GROUPS = ["2W", "4W", "CV"];

/**
 * The address and vehicle fields shared by Add Policy and Edit Policy. Vehicle fields are read only for cars and
 * bikes; for other categories only the holder's address is saved.
 */
function readExtras(formData: FormData, category: string) {
  const errors: Record<string, string> = {};
  const clip = (key: string, max = 100) => {
    const value = text(formData, key);
    if (value.length > max) errors[key] = `Use ${max} characters or fewer.`;
    return value || null;
  };
  const day = (key: string, message: string) => {
    const raw = text(formData, key);
    if (!raw) return null;
    const parsed = parseDate(raw);
    if (!parsed) errors[key] = message;
    return parsed;
  };

  const data: Record<string, string | number | null> = { holder_address: clip("holderAddress", 300) };
  if (category !== "car" && category !== "bike") return { errors, data };

  const group = text(formData, "vehicleGroup") || (category === "car" ? "4W" : "2W");
  if (!VEHICLE_GROUPS.includes(group)) errors.vehicleGroup = "Choose 2W, 4W or CV.";

  const idvRaw = text(formData, "idv").replace(/,/g, "");
  let idv: number | null = null;
  if (idvRaw) {
    idv = Number(idvRaw);
    if (!Number.isFinite(idv) || idv < 0 || idv > 1_000_000_000) errors.idv = "Enter a valid IDV amount.";
  }

  const regNo = clip("vehicleRegNo", 20);
  Object.assign(data, {
    // Spaces are removed so "UP85 AB 1234" and "UP85AB1234" are the same vehicle (claims match on this).
    vehicle_reg_no: regNo ? regNo.toUpperCase().replace(/\s+/g, "") : null,
    vehicle_category: group,
    vehicle_make: clip("vehicleMake"),
    vehicle_model: clip("vehicleModel"),
    vehicle_fuel_type: clip("vehicleFuel", 30),
    vehicle_mfy: clip("vehicleMfy", 10),
    vehicle_regn_date: day("vehicleRegnDate", "Enter a valid registration date."),
    vehicle_chassis_no: clip("vehicleChassis", 40),
    vehicle_engine_no: clip("vehicleEngine", 40),
    vehicle_cc: clip("vehicleCc", 20),
    seating_capacity: clip("seatingCapacity", 10),
    idv,
    saod_due_date: day("saodDueDate", "Enter a valid own-damage due date."),
    tp_due_date: day("tpDueDate", "Enter a valid third-party due date."),
    rto_location: clip("rtoLocation", 60),
    pin: clip("pin", 20),
    pin_2: clip("pin2", 20),
  });
  return { errors, data };
}

async function resolveType(db: Db, code: string): Promise<{ id: string } | { error: string }> {
  const found = await db.from("policy_types").select("id").eq("code", code).maybeSingle();
  if (found.error) return { error: dbMessage(found.error) };
  if (found.data) return { id: found.data.id as string };
  const created = await db
    .from("policy_types")
    .insert({ name: categoryLabel(code), code })
    .select("id")
    .single();
  if (created.error) return { error: dbMessage(created.error) };
  return { id: created.data.id as string };
}

/**
 * Adds a policy for a client, found (or created) by mobile number. Saved as advisor-added, which the database
 * trigger marks as verified and gives the right Active / Expiring Soon / Expired status. An optional document is
 * uploaded to the private DOCUMENTS bucket under the client's folder, the same way the mobile app does it.
 */
export async function addPolicy(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const auth = await authorize("policies.create");
  if (!auth.staff) return auth.error;
  const staff = auth.staff;
  const values = formValues(formData);

  const mobile = normalizeMobile(text(formData, "clientMobile"));
  const clientName = text(formData, "clientName");
  const category = text(formData, "category");
  const policyNumber = text(formData, "policyNumber");
  const premiumRaw = text(formData, "premium").replace(/,/g, "");
  const startRaw = text(formData, "startDate");
  const endRaw = text(formData, "endDate");
  const planType = text(formData, "planType");
  const holderName = text(formData, "holderName");
  const docType = text(formData, "documentType") || "Policy copy";
  const fileCheck = checkFile(formData.get("document"));
  const isVehicle = category === "car" || category === "bike";

  const fieldErrors: Record<string, string> = {};
  if (!mobile) fieldErrors.clientMobile = "Enter a valid 10-digit Indian mobile number.";
  if (!CATEGORIES.includes(category)) fieldErrors.category = "Choose a category.";
  const insurerName = readInsurerInput(formData, fieldErrors);
  if (!policyNumber || policyNumber.length > 60) fieldErrors.policyNumber = "Enter the policy number.";
  const endDate = parseDate(endRaw);
  if (!endDate) fieldErrors.endDate = "Enter the policy end date.";
  const startDate = startRaw ? parseDate(startRaw) : null;
  if (startRaw && !startDate) fieldErrors.startDate = "Enter a valid start date.";
  if (startDate && endDate && endDate < startDate) fieldErrors.endDate = "The end date must be on or after the start date.";
  let premium: number | null = null;
  if (premiumRaw) {
    premium = Number(premiumRaw);
    if (!Number.isFinite(premium) || premium < 0 || premium > 1_000_000_000) fieldErrors.premium = "Enter a valid premium amount.";
  }
  if (fileCheck.error) fieldErrors.document = fileCheck.error;
  const extras = readExtras(formData, category);
  Object.assign(fieldErrors, extras.errors);
  if (Object.keys(fieldErrors).length > 0) return fail("Please fix the highlighted fields.", { fieldErrors, values });

  const db = await createClient();

  // Client: find by mobile number, or create an advisor client when the number is new.
  const found = await db.from("users").select("id, full_name").eq("mobile_number", mobile!).maybeSingle();
  if (found.error) return fail(dbMessage(found.error), { values });
  let userId = found.data?.id as string | undefined;
  if (!userId) {
    if (clientName.length < 2) {
      return fail("No client has this mobile number yet.", {
        fieldErrors: { clientName: "Enter the client's name to create them." },
        values,
      });
    }
    const created = await db
      .from("users")
      .insert({ mobile_number: mobile!, full_name: clientName, is_advisor_client: true })
      .select("id")
      .single();
    if (created.error) return fail(dbMessage(created.error), { values });
    userId = created.data.id as string;
    await audit(db, staff.id, "client.create", "user", userId);
  }

  const insurer = await resolveInsurer(db, insurerName);
  if ("error" in insurer) return fail(insurer.error, { values });
  const type = await resolveType(db, category);
  if ("error" in type) return fail(type.error, { values });

  const duplicate = await db
    .from("policies")
    .select("id")
    .eq("user_id", userId)
    .eq("policy_number", policyNumber)
    .limit(1);
  if (duplicate.error) return fail(dbMessage(duplicate.error), { values });
  if ((duplicate.data ?? []).length > 0) {
    return fail("This client already has a policy with this number.", {
      fieldErrors: { policyNumber: "Already recorded for this client." },
      values,
    });
  }


  const inserted = await db
    .from("policies")
    .insert({
      user_id: userId,
      insurer_id: insurer.id,
      insurer_name: insurer.name,
      type_id: type.id,
      policy_number: policyNumber,
      due_date: endDate,
      start_date: startDate,
      premium_amount: premium,
      plan_type: planType || null,
      holder_name: holderName || null,
      ...extras.data,


      source: "advisor_added",
    })
    .select("id")
    .single();
  if (inserted.error) return fail(dbMessage(inserted.error), { values });
  const policyId = inserted.data.id as string;
  await audit(db, staff.id, "policy.create", "policy", policyId);

  let message = "Policy added.";
  if (fileCheck.file) {
    const problem = await storeDocument(db, { userId, policyId, file: fileCheck.file, type: docType });
    message = problem
      ? `Policy added, but the document could not be uploaded (${problem}). You can upload it from the policy page.`
      : "Policy and document added.";
  }
  return done(message, { redirectTo: `/policies/${policyId}` });
}

/** Adds another document to an existing policy. */
export async function uploadDocument(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const auth = await authorize("policies.edit");
  if (!auth.staff) return auth.error;
  const staff = auth.staff;

  const policyId = text(formData, "policyId");
  if (!UUID.test(policyId)) return fail("That policy could not be found.");
  const fileCheck = checkFile(formData.get("document"));
  if (fileCheck.error) return fail(fileCheck.error);
  if (!fileCheck.file) return fail("Choose a file to upload.");

  const db = await createClient();
  const policy = await db.from("policies").select("user_id").eq("id", policyId).maybeSingle();
  if (policy.error) return fail(dbMessage(policy.error));
  if (!policy.data?.user_id) return fail("That policy could not be found.");

  const problem = await storeDocument(db, {
    userId: policy.data.user_id as string,
    policyId,
    file: fileCheck.file,
    type: text(formData, "documentType") || "Policy copy",
  });
  if (problem) return fail(problem);

  await audit(db, staff.id, "document.upload", "policy", policyId);
  return done("Document uploaded.");
}

export async function deleteDocument(documentId: string, policyId: string): Promise<ActionState> {
  const auth = await authorize("policies.edit");
  if (!auth.staff) return auth.error;
  const staff = auth.staff;
  if (!UUID.test(documentId) || !UUID.test(policyId)) return fail("That document could not be found.");

  const db = await createClient();
  const doc = await db
    .from("policy_documents")
    .select("file_path")
    .eq("id", documentId)
    .eq("policy_id", policyId)
    .maybeSingle();
  if (doc.error) return fail(dbMessage(doc.error));
  if (!doc.data) return fail("That document could not be found.");

  const removedFile = await db.storage.from("DOCUMENTS").remove([doc.data.file_path as string]);
  if (removedFile.error) return fail(removedFile.error.message);
  const removedRow = await db.from("policy_documents").delete().eq("id", documentId);
  if (removedRow.error) return fail(dbMessage(removedRow.error));

  await audit(db, staff.id, "document.delete", "policy", policyId);
  return done("Document deleted.");
}

/**
 * Saves changes to an existing policy: number, insurer, dates, premium, holder and, for cars and bikes, the vehicle
 * details. The client and the category are not changed here. The status is recalculated by the database.
 */
export async function updatePolicy(policyId: string, _previous: ActionState, formData: FormData): Promise<ActionState> {
  const auth = await authorize("policies.edit");
  if (!auth.staff) return auth.error;
  const staff = auth.staff;
  if (!UUID.test(policyId)) return fail("That policy could not be found.");
  const values = formValues(formData);

  const db = await createClient();
  const current = await db.from("policies").select("user_id, policy_types(code)").eq("id", policyId).maybeSingle();
  if (current.error) return fail(dbMessage(current.error), { values });
  if (!current.data) return fail("That policy could not be found.", { values });
  const category: string = one(current.data.policy_types as { code: string | null } | { code: string | null }[] | null)?.code ?? "other";

  const policyNumber = text(formData, "policyNumber");
  const premiumRaw = text(formData, "premium").replace(/,/g, "");
  const startRaw = text(formData, "startDate");
  const endDate = parseDate(text(formData, "endDate"));
  const startDate = startRaw ? parseDate(startRaw) : null;

  const fieldErrors: Record<string, string> = {};
  const insurerName = readInsurerInput(formData, fieldErrors);
  if (!policyNumber || policyNumber.length > 60) fieldErrors.policyNumber = "Enter the policy number.";
  if (!endDate) fieldErrors.endDate = "Enter the policy end date.";
  if (startRaw && !startDate) fieldErrors.startDate = "Enter a valid start date.";
  if (startDate && endDate && endDate < startDate) fieldErrors.endDate = "The end date must be on or after the start date.";
  let premium: number | null = null;
  if (premiumRaw) {
    premium = Number(premiumRaw);
    if (!Number.isFinite(premium) || premium < 0 || premium > 1_000_000_000) fieldErrors.premium = "Enter a valid premium amount.";
  }
  const extras = readExtras(formData, category);
  Object.assign(fieldErrors, extras.errors);
  if (Object.keys(fieldErrors).length > 0) return fail("Please fix the highlighted fields.", { fieldErrors, values });

  if (current.data.user_id) {
    const duplicate = await db
      .from("policies")
      .select("id")
      .eq("user_id", current.data.user_id as string)
      .eq("policy_number", policyNumber)
      .neq("id", policyId)
      .limit(1);
    if (duplicate.error) return fail(dbMessage(duplicate.error), { values });
    if ((duplicate.data ?? []).length > 0) {
      return fail("This client already has a policy with this number.", {
        fieldErrors: { policyNumber: "Already recorded for this client." },
        values,
      });
    }
  }

  const insurer = await resolveInsurer(db, insurerName);
  if ("error" in insurer) return fail(insurer.error, { values });

  const updated = await db
    .from("policies")
    .update({
      insurer_id: insurer.id,
      insurer_name: insurer.name,
      policy_number: policyNumber,
      due_date: endDate,
      start_date: startDate,
      premium_amount: premium,
      plan_type: text(formData, "planType") || null,
      holder_name: text(formData, "holderName") || null,
      ...extras.data,
    })
    .eq("id", policyId)
    .select("id");
  if (updated.error) return fail(dbMessage(updated.error), { values });
  if ((updated.data ?? []).length === 0) return fail("That policy could not be found.", { values });

  await audit(db, staff.id, "policy.update", "policy", policyId);
  return done("Policy updated.");
}

/**
 * Deletes a policy with its documents (files and rows) and renewal history. Quote requests that pointed at it stay,
 * without the link. Admin only. On success the page goes back to the policy list.
 */
export async function deletePolicy(policyId: string): Promise<ActionState> {
  const auth = await authorize("policies.delete");
  if (!auth.staff) return auth.error;
  const staff = auth.staff;
  if (!UUID.test(policyId)) return fail("That policy could not be found.");

  const db = await createClient();
  const docs = await db.from("policy_documents").select("file_path").eq("policy_id", policyId);
  if (docs.error) return fail(dbMessage(docs.error));
  const paths = (docs.data ?? []).map((d) => d.file_path as string);
  if (paths.length > 0) {
    const removed = await db.storage.from("DOCUMENTS").remove(paths);
    if (removed.error) return fail(removed.error.message);
  }

  const result = await db.from("policies").delete().eq("id", policyId).select("id");
  if (result.error) return fail(dbMessage(result.error));
  if ((result.data ?? []).length === 0) return fail("That policy could not be found.");

  await audit(db, staff.id, "policy.delete", "policy", policyId);
  revalidatePath("/policies");
  redirect("/policies");
}

const VERIFICATION = ["unverified", "verified", "rejected"];

/** Verify or reject a policy (mainly for policies added by users in the app). */
export async function setVerification(policyId: string, status: string, reason?: string): Promise<ActionState> {
  const auth = await authorize("policies.verify");
  if (!auth.staff) return auth.error;
  const staff = auth.staff;
  if (!UUID.test(policyId) || !VERIFICATION.includes(status)) return fail("That change is not allowed.");
  const note = (reason ?? "").trim();
  if (status === "rejected" && (note.length < 5 || note.length > 500)) {
    return fail("Enter a reason for the rejection (5 to 500 characters).");
  }

  const db = await createClient();
  const result = await db
    .from("policies")
    .update({ verification_status: status, rejection_reason: status === "rejected" ? note : null })
    .eq("id", policyId)
    .select("id, user_id, policy_number");
  if (result.error) return fail(dbMessage(result.error));
  if ((result.data ?? []).length === 0) return fail("That policy could not be found.");

  await audit(db, staff.id, `policy.${status}`, "policy", policyId);

  // Tell the user why, in the app's Updates feed. A failure here never undoes the rejection.
  if (status === "rejected") {
    const row = result.data?.[0] as { user_id: string | null; policy_number: string } | undefined;
    if (row?.user_id) {
      await db.from("notifications").insert({
        user_id: row.user_id,
        policy_id: policyId,
        kind: "announcement",
        title: "Policy needs your attention",
        body: `Your policy ${row.policy_number} could not be verified. Reason: ${note}`,
      });
    }
  }
  return done(status === "rejected" ? "Policy rejected and the user was notified." : `Policy marked ${status}.`);
}

const RENEWAL = ["pending", "quote_sent", "renewed", "lapsed"];

/** Records a new renewal status for a policy. Each change is a new history row, so the full trail is kept. */
export async function setRenewalStatus(policyId: string, status: string): Promise<ActionState> {
  const auth = await authorize("renewals.update");
  if (!auth.staff) return auth.error;
  const staff = auth.staff;
  if (!UUID.test(policyId) || !RENEWAL.includes(status)) return fail("That change is not allowed.");

  const db = await createClient();
  const policy = await db.from("policies").select("due_date").eq("id", policyId).maybeSingle();
  if (policy.error) return fail(dbMessage(policy.error));
  if (!policy.data) return fail("That policy could not be found.");

  const latest = await db
    .from("renewals")
    .select("status")
    .eq("policy_id", policyId)
    .order("created_at", { ascending: false })
    .limit(1);
  if (latest.error) return fail(dbMessage(latest.error));
  if (latest.data?.[0]?.status === status) return done("That is already the current renewal status.");

  const inserted = await db.from("renewals").insert({
    policy_id: policyId,
    status,
    // Renewed: the day it was renewed. Otherwise: the date the renewal falls due.
    renewal_date: status === "renewed" ? todayIST() : (policy.data.due_date as string),
  });
  if (inserted.error) return fail(dbMessage(inserted.error));

  await audit(db, staff.id, `renewal.${status}`, "policy", policyId);
  return done("Renewal status updated.");
}
