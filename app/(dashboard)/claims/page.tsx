import { CircleCheck, CircleX, Clock, IndianRupee, TriangleAlert } from "lucide-react";
import { ModulePage } from "@/components/modules/module-page";
import { ModuleEmptyCharacter } from "@/components/ui/characters";
import { MiniStat, StatRow } from "@/components/ui/mini-stat";
import { approveClaim, createClaim, deleteClaim, rejectClaim, updateClaim } from "@/lib/actions/claims";
import { getAgentOptions, getClaims } from "@/lib/data/claims";
import type { FieldDef, Option } from "@/lib/module-types";
import { DOCUMENT_TYPE_OPTIONS } from "@/lib/options";
import { can } from "@/lib/rbac/permissions";
import { requirePermission } from "@/lib/rbac/server";
import { STATE_OPTIONS } from "@/lib/states";

const STATUS_OPTIONS: Option[] = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

const MODE_OPTIONS: Option[] = [
  { value: "Online", label: "Online" },
  { value: "NEFT", label: "NEFT" },
  { value: "Cheque", label: "Cheque" },
  { value: "GPay(UPI)", label: "GPay (UPI)" },
  { value: "Cash", label: "Cash" },
];

const GROUP_OPTIONS: Option[] = [
  { value: "", label: "Not needed (vehicle is in Policies)" },
  { value: "2W", label: "Two wheeler (2W)" },
  { value: "4W", label: "Four wheeler (4W)" },
  { value: "CW", label: "Commercial vehicle (CW)" },
];

const CLAIM_STATE_OPTIONS: Option[] = [{ value: "", label: "Resolve automatically from PIN" }, ...STATE_OPTIONS];

export default async function ClaimsPage() {
  const staff = await requirePermission("claims.view");
  const isAdmin = staff.role === "admin";
  const canCreate = can(staff, "claims.create");
  const canReview = can(staff, "claims.approve");

  const [{ rows, agentFilterOptions, migrationMissingDocs, totalCount, stats }, editAgents] = await Promise.all([
    getClaims(),
    canReview ? getAgentOptions(staff.id, true) : Promise.resolve([]),
  ]);

  const buildFields = (agentList: Option[], includeAgentSelect: boolean): FieldDef[] => [
    ...(includeAgentSelect
      ? [{ name: "agent", label: "Agent", type: "select" as const, options: agentList, required: true, full: true }]
      : []),
    { name: "vehicleRegNo", label: "Vehicle registration no.", required: true },
    { name: "paymentDate", label: "Payment date", type: "date", required: true, maxToday: true },
    { name: "paymentMode", label: "Paid by", type: "select", options: MODE_OPTIONS, required: true },
    { name: "amount", label: "Amount (₹)", type: "number" },
    {
      name: "customerPincode",
      label: "Customer PIN code",
      hint: "6-digit PIN for state incentive eligibility (uses policy PIN if blank).",
    },
    { name: "customerState", label: "Customer state (fallback)", type: "select", options: CLAIM_STATE_OPTIONS },
    { name: "remarks", label: "Remarks", type: "textarea", full: true },
    // Policy document attached here is published to the customer's policy in the app upon approval.
    {
      name: "document",
      label: "Policy document",
      type: "file",
      accept: ".pdf,.jpg,.jpeg,.png,.webp",
      hint: "Optional PDF, JPG, PNG or WebP (max 4 MB). Auto-attaches to the customer's app on approval.",
    },
    { name: "documentType", label: "Document type", type: "select", options: DOCUMENT_TYPE_OPTIONS },
    // Only needed when the vehicle is not already in Policies.
    { name: "customerName", label: "Customer name", hint: "Only if the vehicle is not in Policies yet." },
    { name: "customerMobile", label: "Customer mobile", type: "tel" },
    { name: "vehicleGroup", label: "Vehicle group", type: "select", options: GROUP_OPTIONS },
    { name: "saodDueDate", label: "Own-damage (SAOD) due date", type: "date" },
  ];

  const createAgents = canCreate && isAdmin ? await getAgentOptions(staff.id, true) : [];
  const createFields = buildFields(createAgents, isAdmin);
  const editFields = buildFields(editAgents, true);

  return (
    <div className="space-y-4">
      {migrationMissingDocs && (
        <p className="flex items-start gap-2 rounded-control bg-warning-soft px-3 py-2 text-xs text-warning">
          <TriangleAlert size={14} strokeWidth={1.75} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span>
            Run <b>supabase/migrations/0014_claims_doc_and_incentives.sql</b> in Supabase SQL Editor to enable attaching policy documents on claims.
          </span>
        </p>
      )}

      <StatRow>
        <MiniStat index={0} title="Waiting for review" icon={Clock} value={stats.pending} />
        <MiniStat index={1} title="Approved this month" icon={CircleCheck} value={stats.approvedThisMonth} />
        <MiniStat index={2} title="Rejected this month" icon={CircleX} value={stats.rejectedThisMonth} />
        <MiniStat index={3} title="Approved value this month" icon={IndianRupee} value={stats.valueThisMonth} kind="inr" />
      </StatRow>

      <ModulePage
        index={4}
        rows={rows}
        totalCount={totalCount}
        exportName="claims"
        emptyLabel="No claims yet"
        emptyIllustration={<ModuleEmptyCharacter variant="claims" />}
        dateFilter={{ key: "paymentDate", label: "Payment date", direction: "past" }}
        search="Search ref, vehicle, agent or customer…"
        filters={[
          { key: "status", label: "All statuses", options: STATUS_OPTIONS },
          { key: "agentName", label: "All agents", options: agentFilterOptions },
          { key: "mode", label: "All payment modes", options: MODE_OPTIONS },
        ]}
        columns={[
          { key: "refCode", label: "Ref" },
          { key: "vehicle", label: "Vehicle" },
          { key: "agentName", label: "Agent" },
          { key: "paymentDate", label: "Paid on", type: "date" },
          { key: "mode", label: "Paid by" },
          { key: "amount", label: "Amount", type: "inr", align: "right" },
          { key: "customer", label: "Customer" },
          { key: "vehicleKind", label: "Policy" },
          { key: "doc", label: "Document", type: "link" },
          { key: "status", label: "Status", type: "chip" },
          { key: "submitted", label: "Added", type: "date" },
        ]}
        edit={
          canReview
            ? {
                drawerTitle: "Edit Claim",
                fields: editFields,
                action: updateClaim,
                showWhen: { key: "status", in: ["pending"] },
              }
            : undefined
        }
        rowActions={
          canReview
            ? [
                { label: "Approve", action: approveClaim, showWhen: { key: "status", in: ["pending"] } },
                {
                  label: "Reject",
                  action: rejectClaim,
                  danger: true,
                  showWhen: { key: "status", in: ["pending"] },
                  confirm: "Reject this claim? The vehicle can be claimed again afterwards.",
                },
                ...(isAdmin
                  ? [
                      {
                        label: "Delete",
                        action: deleteClaim,
                        danger: true,
                        showWhen: { key: "status", in: ["rejected"] },
                        confirm: "Permanently delete this rejected claim? This cannot be undone.",
                      },
                    ]
                  : []),
              ]
            : undefined
        }
        primary={
          canCreate
            ? {
                label: "Add Claim",
                drawerTitle: "Add Claim",
                action: createClaim,
                fields: createFields,
                defaultValues: !isAdmin ? { agent: staff.id } : undefined,
              }
            : undefined
        }
      />
    </div>
  );
}
