import Link from "next/link";
import { MessageCircle, Phone } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { ChatShieldCharacter, SearchScoutCharacter } from "@/components/ui/characters";
import { ValueChip } from "@/components/ui/chip";
import { buttonStyles } from "@/components/ui/button";
import { DetailList } from "@/components/ui/detail-list";
import { EmptyState } from "@/components/ui/empty-state";
import { DetailHeader } from "@/components/layout/detail-header";
import { DocumentsCard } from "@/components/modules/documents-card";
import { getQuoteDetail } from "@/lib/data/details";
import { formatDate, formatINR } from "@/lib/format";
import { StatusButtons } from "@/components/ui/status-buttons";
import { setQuoteStatus } from "@/lib/actions/status";
import { QUOTE_STATUS_OPTIONS } from "@/lib/options";
import { can } from "@/lib/rbac/permissions";
import { requirePermission } from "@/lib/rbac/server";
import { categoryLabel } from "@/lib/status";

export default async function QuoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const staff = await requirePermission("quotes.view");
  const q = await getQuoteDetail(id);
  const who = q.client?.name ?? q.client?.mobile ?? "Unknown user";
  const whatsapp = q.client ? `https://wa.me/${q.client.mobile.replace(/\D/g, "")}` : null;

  return (
    <div className="space-y-4">
      <DetailHeader
        backHref="/quotes"
        backLabel="All quote requests"
        title={`Quote request from ${who}`}
        subtitle={q.createdOn ? `Requested ${formatDate(q.createdOn)}` : undefined}
        chips={<ValueChip value={q.status} />}
        actions={
          q.client && (
            <>
              <a href={`tel:${q.client.mobile}`} className={buttonStyles("secondary")}>
                <Phone size={16} strokeWidth={1.75} aria-hidden="true" />
                Call
              </a>
              {whatsapp && (
                <a href={whatsapp} target="_blank" rel="noreferrer" className={buttonStyles("secondary")}>
                  <MessageCircle size={16} strokeWidth={1.75} aria-hidden="true" />
                  WhatsApp
                </a>
              )}
            </>
          )
        }
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          <Card index={0}>
            <CardHeader title="Update status" />
            <StatusButtons
              label="Quote status"
              current={q.status}
              options={QUOTE_STATUS_OPTIONS}
              readOnly={!can(staff, "quotes.update")}
              action={setQuoteStatus.bind(null, q.id)}
            />
          </Card>

          <Card index={1}>
            <CardHeader title="Request" />
            <DetailList
              columns={1}
              items={[
                { label: "Status", value: <ValueChip value={q.status} /> },
                { label: "Requested on", value: q.createdOn ? formatDate(q.createdOn) : null },
                { label: "Notes from the user", value: q.notes ? <span className="whitespace-pre-wrap">{q.notes}</span> : null },
                { label: "Request ID", value: <span className="text-xs tabular-nums text-ink-muted">{q.id}</span> },
              ]}
            />
          </Card>

          <Card index={1}>
            <CardHeader title="Requested by" />
            {q.client ? (
              <DetailList
                items={[
                  { label: "Name", value: q.client.name },
                  { label: "Mobile", value: q.client.mobile },
                  { label: "Email", value: q.client.email },
                  {
                    label: "Account type",
                    value: <ValueChip value={q.client.isAdvisorClient ? "advisor_client" : "general"} />,
                  },
                  { label: "Registered", value: q.client.joinedOn ? formatDate(q.client.joinedOn) : null },
                ]}
              />
            ) : (
              <EmptyState
                label="User not found"
                illustration={<SearchScoutCharacter mood="empty" size="sm" />}
                className="py-8"
              />
            )}
          </Card>
        </div>

        <div className="space-y-4">
          <Card index={2}>
            <CardHeader
              title="Policy"
              action={
                q.policy && (
                  <Link
                    href={`/policies/${q.policy.id}`}
                    className={buttonStyles("ghost", "h-8 px-3 text-xs")}
                  >
                    View full policy
                  </Link>
                )
              }
            />
            {q.policy ? (
              <DetailList
                columns={1}
                items={[
                  { label: "Policy number", value: <span className="tabular-nums">{q.policy.policyNumber}</span> },
                  { label: "Category", value: categoryLabel(q.policy.category) },
                  { label: "Insurer", value: q.policy.insurer },
                  { label: "Premium", value: q.policy.premium === null ? null : formatINR(q.policy.premium) },
                  { label: "End date", value: formatDate(q.policy.endDate) },
                  {
                    label: "Status",
                    value: (
                      <span className="flex flex-wrap gap-2">
                        <ValueChip value={q.policy.state} />
                        <ValueChip value={q.policy.verification} />
                        <ValueChip value={q.policy.source} />
                      </span>
                    ),
                  },
                ]}
              />
            ) : (
              <EmptyState
                label="General request, no policy attached"
                illustration={<ChatShieldCharacter />}
                className="py-8"
              />
            )}
          </Card>

          {q.policy && <DocumentsCard index={3} policyId={q.policy.id} documents={q.documents} canEdit={can(staff, "policies.edit")} />}
        </div>
      </div>
    </div>
  );
}
