import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { dateIST, daysBetween, one, policyState, todayIST, type PolicyState } from "@/lib/data/helpers";

type Named<T> = T | T[] | null;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type DocumentItem = { id: string; filePath: string; type: string | null; uploadedOn: string | null };

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

type DocumentRecord = { id: string; file_path: string; document_type: string | null; uploaded_at: string };

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
    .map((d) => ({ id: d.id, filePath: d.file_path, type: d.document_type, uploadedOn: dateIST(d.uploaded_at) }));
}

const USER_FIELDS = "id, full_name, mobile_number, email, is_advisor_client, created_at";
const DOC_FIELDS = "id, file_path, document_type, uploaded_at";

/* --------------------------------- Policy ---------------------------------- */

export type PolicyDetail = {
  id: string;
  policyNumber: string;
  category: string;
  insurer: string | null;
  planType: string | null;
  premium: number | null;
  startDate: string | null;
  endDate: string;
  daysLeft: number;
  state: PolicyState;
  source: string;
  verification: string;
  isLead: boolean;
  createdOn: string | null;
  updatedOn: string | null;
  holder: { name: string | null; mobile: string | null; address: string | null };
  vehicle: { label: string; value: string }[];
  client: ClientInfo | null;
  documents: DocumentItem[];
  renewals: { id: string; status: string | null; renewalDate: string | null; createdOn: string | null }[];
  quotes: { id: string; status: string; createdOn: string | null }[];
};

export async function getPolicyDetail(id: string): Promise<PolicyDetail> {
  if (!UUID.test(id)) notFound();
  const db = await createClient();
  const today = todayIST();

  const { data, error } = await db
    .from("policies")
    .select(
      `*, users(${USER_FIELDS}), insurers(name), policy_types(code), policy_documents(${DOC_FIELDS}), renewals(id, status, renewal_date, created_at), quote_requests(id, status, created_at)`,
    )
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(`Policy: ${error.message}`);
  if (!data) notFound();

  const p = data as Record<string, unknown> & {
    id: string;
    policy_number: string;
    due_date: string;
    premium_amount: number | string | null;
    users: Named<UserRecord>;
    insurers: Named<{ name: string }>;
    policy_types: Named<{ code: string | null }>;
    policy_documents: DocumentRecord[] | null;
    renewals: { id: string; status: string | null; renewal_date: string | null; created_at: string }[] | null;
    quote_requests: { id: string; status: string; created_at: string }[] | null;
  };
  const text = (key: string) => (p[key] === null || p[key] === undefined || p[key] === "" ? null : String(p[key]));

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
  ]
    .filter((row): row is [string, string] => row[1] !== null)
    .map(([label, value]) => ({ label, value }));

  return {
    id: p.id,
    policyNumber: p.policy_number,
    category: one(p.policy_types)?.code ?? "other",
    insurer: one(p.insurers)?.name ?? text("insurer_name"),
    planType: text("plan_type"),
    premium: p.premium_amount === null ? null : Number(p.premium_amount),
    startDate: text("start_date"),
    endDate: p.due_date,
    daysLeft: daysBetween(today, p.due_date),
    state: policyState(p.due_date, today),
    source: text("source") ?? "user_added",
    verification: text("verification_status") ?? "unverified",
    isLead: p.is_lead_opportunity === true,
    createdOn: dateIST(text("created_at")),
    updatedOn: dateIST(text("updated_at")),
    holder: { name: text("holder_name"), mobile: text("holder_mobile"), address: text("holder_address") },
    vehicle,
    client: toClient(p.users),
    documents: toDocuments(p.policy_documents),
    renewals: [...(p.renewals ?? [])]
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .map((r) => ({ id: r.id, status: r.status, renewalDate: r.renewal_date, createdOn: dateIST(r.created_at) })),
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
