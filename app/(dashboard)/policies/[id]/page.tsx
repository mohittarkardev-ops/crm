import Link from "next/link";
import { Card, CardHeader } from "@/components/ui/card";
import { Chip, ValueChip } from "@/components/ui/chip";
import { DetailList } from "@/components/ui/detail-list";
import { EmptyState } from "@/components/ui/empty-state";
import { DetailHeader } from "@/components/layout/detail-header";
import { DocumentsCard } from "@/components/modules/documents-card";
import { DeletePolicyButton, EditPolicyButton } from "@/components/modules/policy-actions";
import { getInsurerNames } from "@/lib/data/lookups";
import type { FieldDef } from "@/lib/module-types";
import { vehicleFields } from "@/lib/policy-fields";
import { getPolicyDetail } from "@/lib/data/details";
import { formatDate, formatINR } from "@/lib/format";
import { StatusButtons } from "@/components/ui/status-buttons";
import { VerificationControl } from "@/components/modules/verification-control";
import { deletePolicy, setRenewalStatus, setVerification, updatePolicy } from "@/lib/actions/policies";
import { RENEWAL_STATUS_OPTIONS } from "@/lib/options";
import { can } from "@/lib/rbac/permissions";
import { requirePermission } from "@/lib/rbac/server";
import { categoryLabel } from "@/lib/status";

function expiryText(daysLeft: number) {
  if (daysLeft < 0) return `Expired ${Math.abs(daysLeft)} day${Math.abs(daysLeft) === 1 ? "" : "s"} ago`;
  if (daysLeft === 0) return "Expires today";
  return `${daysLeft} day${daysLeft === 1 ? "" : "s"} left`;
}

export default async function PolicyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const staff = await requirePermission("policies.view");
  const [p, insurers] = await Promise.all([getPolicyDetail(id), getInsurerNames()]);

  const editFields: FieldDef[] = [
    { name: "policyNumber", label: "Policy number", required: true },
    { name: "insurer", label: "Insurer", required: true, suggestions: insurers },
    { name: "premium", label: "Premium (₹)", type: "number" },
    { name: "planType", label: "Plan type" },
    { name: "startDate", label: "Start date", type: "date" },
    { name: "endDate", label: "End date", type: "date", required: true },
    { name: "holderName", label: "Policy holder name" },
    { name: "holderAddress", label: "Holder address", full: true },
    ...(p.isVehicle ? vehicleFields(false) : []),
  ];

  return (
    <div className="space-y-4">
      <DetailHeader
        backHref="/policies"
        backLabel="All policies"
        title={p.policyNumber}
        subtitle={`${categoryLabel(p.category)}${p.insurer ? ` · ${p.insurer}` : ""}`}
        actions={
          <>
            {can(staff, "policies.edit") && (
              <EditPolicyButton fields={editFields} values={p.edit} action={updatePolicy.bind(null, p.id)} />
            )}
            {can(staff, "policies.delete") && <DeletePolicyButton action={deletePolicy.bind(null, p.id)} />}
          </>
        }
        chips={
          <>
            <ValueChip value={p.state} />
            <ValueChip value={p.verification} />
            <ValueChip value={p.source} />
            {p.isLead && <Chip tone="accent">Lead opportunity</Chip>}
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          <Card index={0}>
            <CardHeader title="Policy details" />
            <DetailList
              items={[
                { label: "Category", value: categoryLabel(p.category) },
                { label: "Insurer", value: p.insurer },
                { label: "Plan type", value: p.planType },
                { label: "Policy number", value: <span className="tabular-nums">{p.policyNumber}</span> },
                { label: "Premium", value: p.premium === null ? null : formatINR(p.premium) },
                { label: "Start date", value: p.startDate ? formatDate(p.startDate) : null },
                { label: "End date", value: formatDate(p.endDate) },
                { label: "Renewal", value: expiryText(p.daysLeft) },
                { label: "Added", value: p.createdOn ? formatDate(p.createdOn) : null },
                { label: "Last updated", value: p.updatedOn ? formatDate(p.updatedOn) : null },
              ]}
            />
          </Card>

          <Card index={1}>
            <CardHeader title="Policy holder and client" />
            <DetailList
              items={[
                { label: "Holder name", value: p.holder.name },
                { label: "Holder mobile", value: p.holder.mobile },
                { label: "Holder address", value: p.holder.address },
                { label: "Account name", value: p.client?.name },
                { label: "Account mobile", value: p.client?.mobile },
                { label: "Account email", value: p.client?.email },
                {
                  label: "Account type",
                  value: p.client ? <ValueChip value={p.client.isAdvisorClient ? "advisor_client" : "general"} /> : null,
                },
                { label: "Registered", value: p.client?.joinedOn ? formatDate(p.client.joinedOn) : null },
              ]}
            />
          </Card>

          {p.vehicle.length > 0 && (
            <Card index={2}>
              <CardHeader title="Vehicle" />
              <DetailList items={p.vehicle} />
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card index={2}>
            <CardHeader title="Verification" />
            <VerificationControl
              current={p.verification}
              reason={p.rejectionReason}
              readOnly={!can(staff, "policies.verify")}
              action={setVerification.bind(null, p.id)}
            />
            {p.source === "user_added" && (
              <p className="mt-3 text-xs text-ink-muted">External policy, added by the client in the app. Check the documents, then verify or reject.</p>
            )}
          </Card>

          <Card index={3}>
            <CardHeader title="Renewal status" />
            <StatusButtons
              label="Renewal status"
              current={p.renewals[0]?.status ?? null}
              options={RENEWAL_STATUS_OPTIONS}
              readOnly={!can(staff, "renewals.update")}
              action={setRenewalStatus.bind(null, p.id)}
            />
          </Card>

          <DocumentsCard index={4} policyId={p.id} documents={p.documents} canEdit={can(staff, "policies.edit")} />

          <Card index={4}>
            <CardHeader title="Renewal history" />
            {p.renewals.length === 0 ? (
              <EmptyState label="No renewal records" className="py-8" />
            ) : (
              <ul className="divide-y divide-divider">
                {p.renewals.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                    <div>
                      <p className="text-sm text-ink">
                        {r.renewalDate ? `Renewal ${formatDate(r.renewalDate)}` : "Renewal"}
                      </p>
                      <p className="text-xs text-ink-muted">{r.createdOn ? `Logged ${formatDate(r.createdOn)}` : ""}</p>
                    </div>
                    {r.status && <ValueChip value={r.status} />}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card index={5}>
            <CardHeader title="Quote requests" />
            {p.quotes.length === 0 ? (
              <EmptyState label="No quote requests" className="py-8" />
            ) : (
              <ul className="divide-y divide-divider">
                {p.quotes.map((q) => (
                  <li key={q.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                    <Link href={`/quotes/${q.id}`} className="text-sm text-ink underline-offset-2 hover:underline">
                      {q.createdOn ? `Requested ${formatDate(q.createdOn)}` : "Quote request"}
                    </Link>
                    <ValueChip value={q.status} />
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
