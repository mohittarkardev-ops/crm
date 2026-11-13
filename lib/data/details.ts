import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { dateIST, daysBetween, one, policyState, todayIST, type PolicyState } from "@/lib/data/helpers";

type Named<T> = T | T[] | null;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type DocumentItem = {
  id: string;
  filePath: string;
  type: string | null;
  uploadedOn: string | null;
  /** 'user' = external (uploaded by the client in the app), 'staff' = agency. */
  uploadedBy: "user" | "staff";
};

export type ClientInfo = {
  id: string;
  name: string | null;
  mobile: string;
  email: string | null;
  isAdvisorClient: boolean;
  joinedOn: string | null;
};

type UserRecord = {
  id: string;
  full_name: string | null;
  mobile_number: string;
  email: string | null;
  is_advisor_client: boolean | null;
  created_at: string;
};

type DocumentRecord = {
  id: string;
  file_path: string;
  document_type: string | null;
  uploaded_at: string;
  uploaded_by: string | null;
};

function toClient(value: Named<UserRecord>): ClientInfo | null {
  const u = one(value);
  return u
    ? {
        id: u.id,
        name: u.full_name,
        mobile: u.mobile_number,
        email: u.email,
        isAdvisorClient: Boolean(u.is_advisor_client),
        joinedOn: dateIST(u.created_at),
      }
    : null;
}

function toDocuments(rows: DocumentRecord[] | null | undefined): DocumentItem[] {
  return [...(rows ?? [])]
    .sort((a, b) => b.uploaded_at.localeCompare(a.uploaded_at))
    .map((d) => ({
      id: d.id,
      filePath: d.file_path,
      type: d.document_type,
      uploadedOn: dateIST(d.uploaded_at),
      uploadedBy: d.uploaded_by === "staff" ? ("staff" as const) : ("user" as const),
    }));
}

const USER_FIELDS = "id, full_name, mobile_number, email, is_advisor_client, created_at";
const DOC_FIELDS = "id, file_path, document_type, uploaded_at, uploaded_by";

/* --------------------------------- Policy ---------------------------------- */

export type PolicyDetail = {
  id: string;
  policyNumber: string;
  category: string;
  insurer: string | null;
  insurerLogoUrl: string | null;
  planType: string | null;
  premium: number | null;
  startDate: string | null;
  endDate: string;
  daysLeft: number;
  state: PolicyState;
  source: string;
  verification: string;
  rejectionReason: string | null;
  isLead: boolean;
  createdOn: string | null;
  updatedOn: string | null;
  holder: { name: string | null; mobile: string | null; address: string | null };
  /** Cars and two wheelers: the Edit form includes the vehicle fields. */
  isVehicle: boolean;
  /** Current values for the Edit Policy form, keyed by form field name. */
  edit: Record<string, string>;
  vehicle: { label: string; value: string }[];
  client: ClientInfo | null;
  documents: DocumentItem[];
  renewals: {
    id: string;
    status: string | null;
    renewalDate: string | null;
    previousDueDate: string | null;
    newDueDate: string | null;
    previousPolicyNumber: string | null;
    newPolicyNumber: string | null;
    previousInsurerName: string | null;
    newInsurerName: string | null;
    premiumAmount: number | null;
    notes: string | null;
    createdOn: string | null;
  }[];
  quotes: { id: string; status: string; createdOn: string | null }[];
};

type RenewalRecord = {
  id: string;
  status: string | null;
  renewal_date: string | null;
  previous_due_date?: string | null;
  new_due_date?: string | null;
  previous_policy_number?: string | null;
  new_policy_number?: string | null;
  previous_insurer_name?: string | null;
  new_insurer_name?: string | null;
  premium_amount?: number | string | null;
  notes?: string | null;
  created_at: string;
};

export async function getPolicyDetail(id: string): Promise<PolicyDetail> {
  if (!UUID.test(id)) notFound();
  const db = await createClient();
  const today = todayIST();

  const EXT_RENEWALS =
    "id, status, renewal_date, previous_due_date, new_due_date, previous_policy_number, new_policy_number, previous_insurer_name, new_insurer_name, premium_amount, notes, created_at";
  const BASE_RENEWALS = "id, status, renewal_date, created_at";

  let res = await db
    .from("policies")
    .select(
      `*, users(${USER_FIELDS}), insurers(name, logo_url), policy_types(code), policy_documents(${DOC_FIELDS}), renewals(${EXT_RENEWALS}), quote_requests(id, status, created_at)`,
    )
    .eq("id", id)
    .maybeSingle();

  if (res.error && /previous_due_date|new_due_date|previous_policy_number/i.test(res.error.message)) {
    res = await db
      .from("policies")
      .select(
        `*, users(${USER_FIELDS}), insurers(name, logo_url), policy_types(code), policy_documents(${DOC_FIELDS}), renewals(${BASE_RENEWALS}), quote_requests(id, status, created_at)`,
      )
      .eq("id", id)
      .maybeSingle();
  }

  const { data, error } = res;
  if (error) throw new Error(`Policy: ${error.message}`);
  if (!data) notFound();

  const p = data as Record<string, unknown> & {
    id: string;
    policy_number: string;
    due_date: string;
    premium_amount: number | string | null;
    users: Named<UserRecord>;
    insurers: Named<{ name: string; logo_url: string | null }>;
    policy_types: Named<{ code: string | null }>;
    policy_documents: DocumentRecord[] | null;
    renewals: RenewalRecord[] | null;
    quote_requests: { id: string; status: string; created_at: string }[] | null;
  };
  const text = (key: string) => (p[key] === null || p[key] === undefined || p[key] === "" ? null : String(p[key]));
  const category = one(p.policy_types)?.code ?? "other";

  const vehicle = [
    ["Registration no.", text("vehicle_reg_no")],
    ["Make", text("vehicle_make")],
    ["Model", text("vehicle_model")],
    ["Fuel type", text("vehicle_fuel_type")],
    ["Manufacturing year", text("vehicle_mfy")],
    ["Registration date", text("vehicle_regn_date")],
    ["Chassis no.", text("vehicle_chassis_no")],
    ["Engine no.", text("vehicle_engine_no")],
    ["Engine cc", text("vehicle_cc")],
    ["Vehicle group", text("vehicle_category")],
    ["Seating capacity", text("seating_capacity")],
    ["IDV", text("idv")],
    ["Own-damage (SAOD) due date", text("saod_due_date")],
    ["Third-party (TP) due date", text("tp_due_date")],
    ["RTO location", text("rto_location")],
    ["PIN", text("pin")],
    ["Second PIN", text("pin_2")],
  ]
    .filter((row): row is [string, string] => row[1] !== null)
    .map(([label, value]) => ({ label, value }));

  return {
    id: p.id,
    policyNumber: p.policy_number,
    category: one(p.policy_types)?.code ?? "other",
    insurer: one(p.insurers)?.name ?? text("insurer_name"),
    insurerLogoUrl: one(p.insurers)?.logo_url ?? null,
    planType: text("plan_type"),
    premium: p.premium_amount === null ? null : Number(p.premium_amount),
    startDate: text("start_date"),
    endDate: p.due_date,
    daysLeft: daysBetween(today, p.due_date),
    state: policyState(p.due_date, today),
    source: text("source") ?? "user_added",
    verification: text("verification_status") ?? "unverified",
    rejectionReason: text("rejection_reason"),
    isLead: p.is_lead_opportunity === true,
    createdOn: dateIST(text("created_at")),
    updatedOn: dateIST(text("updated_at")),
    holder: { name: text("holder_name"), mobile: text("holder_mobile"), address: text("holder_address") },
    isVehicle: category === "car" || category === "bike",
    edit: {
      policyNumber: text("policy_number") ?? "",
      insurer: one(p.insurers)?.name ?? text("insurer_name") ?? "",
      premium: text("premium_amount") ?? "",
      planType: text("plan_type") ?? "",
      startDate: text("start_date") ?? "",
      endDate: p.due_date,
      holderName: text("holder_name") ?? "",
      holderAddress: text("holder_address") ?? "",
      vehicleRegNo: text("vehicle_reg_no") ?? "",
      vehicleGroup: text("vehicle_category") ?? "",
      vehicleMake: text("vehicle_make") ?? "",
      vehicleModel: text("vehicle_model") ?? "",
      vehicleFuel: text("vehicle_fuel_type") ?? "",
      vehicleMfy: text("vehicle_mfy") ?? "",
      vehicleRegnDate: text("vehicle_regn_date") ?? "",
      vehicleChassis: text("vehicle_chassis_no") ?? "",
      vehicleEngine: text("vehicle_engine_no") ?? "",
      vehicleCc: text("vehicle_cc") ?? "",
      seatingCapacity: text("seating_capacity") ?? "",
      idv: text("idv") ?? "",
      saodDueDate: text("saod_due_date") ?? "",
      tpDueDate: text("tp_due_date") ?? "",
      rtoLocation: text("rto_location") ?? "",
      pin: text("pin") ?? "",
      pin2: text("pin_2") ?? "",
    },
    vehicle,
    client: toClient(p.users),
    documents: toDocuments(p.policy_documents),
    renewals: [...(p.renewals ?? [])]
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .map((r) => ({
        id: r.id,
        status: r.status,
        renewalDate: r.renewal_date,
        previousDueDate: r.previous_due_date ?? null,
        newDueDate: r.new_due_date ?? null,
        previousPolicyNumber: r.previous_policy_number ?? null,
        newPolicyNumber: r.new_policy_number ?? null,
        previousInsurerName: r.previous_insurer_name ?? null,
        newInsurerName: r.new_insurer_name ?? null,
        premiumAmount:
          r.premium_amount !== null && r.premium_amount !== undefined ? Number(r.premium_amount) : null,
        notes: r.notes ?? null,
        createdOn: dateIST(r.created_at),
      })),
    quotes: [...(p.quote_requests ?? [])]
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .map((q) => ({ id: q.id, status: q.status, createdOn: dateIST(q.created_at) })),
  };
}

/* ---------------------------------- Quote ---------------------------------- */

export type QuoteDetail = {
  id: string;
  status: string;
  notes: string | null;
  createdOn: string | null;
  client: ClientInfo | null;
  policy: {
    id: string;
    policyNumber: string;
    category: string;
    insurer: string | null;
    premium: number | null;
    endDate: string;
    daysLeft: number;
    state: PolicyState;
    source: string;
    verification: string;
  } | null;
  documents: DocumentItem[];
};

export async function getQuoteDetail(id: string): Promise<QuoteDetail> {
  if (!UUID.test(id)) notFound();
  const db = await createClient();
  const today = todayIST();

  const { data, error } = await db
    .from("quote_requests")
    .select(
      `id, status, notes, created_at, users(${USER_FIELDS}), policies(id, policy_number, due_date, premium_amount, source, verification_status, insurer_name, insurers(name), policy_types(code), policy_documents(${DOC_FIELDS}))`,
    )
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(`Quote request: ${error.message}`);
  if (!data) notFound();

  const q = data as {
    id: string;
    status: string;
    notes: string | null;
    created_at: string;
    users: Named<UserRecord>;
    policies: Named<{
      id: string;
      policy_number: string;
      due_date: string;
      premium_amount: number | string | null;
      source: string;
      verification_status: string;
      insurer_name: string | null;
      insurers: Named<{ name: string }>;
      policy_types: Named<{ code: string | null }>;
      policy_documents: DocumentRecord[] | null;
    }>;
  };
  const policy = one(q.policies);

  return {
    id: q.id,
    status: q.status,
    notes: q.notes,
    createdOn: dateIST(q.created_at),
    client: toClient(q.users),
    policy: policy
      ? {
          id: policy.id,
          policyNumber: policy.policy_number,
          category: one(policy.policy_types)?.code ?? "other",
          insurer: one(policy.insurers)?.name ?? policy.insurer_name,
          premium: policy.premium_amount === null ? null : Number(policy.premium_amount),
          endDate: policy.due_date,
          daysLeft: daysBetween(today, policy.due_date),
          state: policyState(policy.due_date, today),
          source: policy.source,
          verification: policy.verification_status,
        }
      : null,
    documents: toDocuments(policy?.policy_documents),
  };
}
