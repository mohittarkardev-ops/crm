import { CircleCheck, CircleX, Clock, IndianRupee } from "lucide-react";
import { ModulePage } from "@/components/modules/module-page";
import { MiniStat, StatRow } from "@/components/ui/mini-stat";
import { approveClaim, createClaim, deleteClaim, rejectClaim, updateClaim } from "@/lib/actions/claims";
import { getAgentOptions, getClaims } from "@/lib/data/claims";
import type { FieldDef, Option } from "@/lib/module-types";
import { can } from "@/lib/rbac/permissions";
import { requirePermission } from "@/lib/rbac/server";

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
  { value: "CV", label: "Commercial vehicle (CV)" },
];

export default async function ClaimsPage() {
  const staff = await requirePermission("claims.view");
  const isAdmin = staff.role === "admin";
  const canCreate = can(staff, "claims.create");
  const canReview = can(staff, "claims.approve");

  const [{ rows, totalCount, stats }, editAgents] = await Promise.all([
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
    { name: "remarks", label: "Remarks", type: "textarea", full: true },
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
        search="Search ref, vehicle, agent or customer…"
        filters={[
          { key: "status", label: "All statuses", options: STATUS_OPTIONS },
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
