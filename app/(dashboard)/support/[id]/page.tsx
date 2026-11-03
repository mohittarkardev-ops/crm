import { MessageCircle, Phone } from "lucide-react";
import { DetailHeader } from "@/components/layout/detail-header";
import { buttonStyles } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { ValueChip } from "@/components/ui/chip";
import { DetailList } from "@/components/ui/detail-list";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusButtons } from "@/components/ui/status-buttons";
import { setTicketStatus } from "@/lib/actions/status";
import { getTicketDetail } from "@/lib/data/ticket";
import { formatDate } from "@/lib/format";
import { SUPPORT_STATUS_OPTIONS } from "@/lib/options";

export default async function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = await getTicketDetail(id);
  const who = t.client?.name ?? t.client?.mobile ?? "Unknown user";
  const whatsapp = t.client ? `https://wa.me/${t.client.mobile.replace(/\D/g, "")}` : null;

  return (
    <div className="space-y-4">
      <DetailHeader
        backHref="/support"
        backLabel="All tickets"
        title={t.subject}
        subtitle={`From ${who}${t.createdOn ? ` · ${formatDate(t.createdOn)}` : ""}`}
        chips={<ValueChip value={t.status} />}
        actions={
          t.client && (
            <>
              <a href={`tel:${t.client.mobile}`} className={buttonStyles("secondary")}>
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
              label="Ticket status"
              current={t.status}
              options={SUPPORT_STATUS_OPTIONS.filter((o) => o.value !== "all")}
              action={setTicketStatus.bind(null, t.id)}
            />
          </Card>

          <Card index={1}>
            <CardHeader title="Message" />
            <DetailList
              columns={1}
              items={[
                { label: "Subject", value: t.subject },
                {
                  label: "Description",
                  value: t.description ? <span className="whitespace-pre-wrap">{t.description}</span> : null,
                },
                { label: "Created", value: t.createdOn ? formatDate(t.createdOn) : null },
                { label: "Ticket ID", value: <span className="text-xs tabular-nums text-ink-muted">{t.id}</span> },
              ]}
            />
          </Card>
        </div>

        <Card index={2}>
          <CardHeader title="Raised by" />
          {t.client ? (
            <DetailList
              items={[
                { label: "Name", value: t.client.name },
                { label: "Mobile", value: t.client.mobile },
                { label: "Email", value: t.client.email },
                {
                  label: "Account type",
                  value: <ValueChip value={t.client.isAdvisorClient ? "advisor_client" : "general"} />,
                },
              ]}
            />
          ) : (
            <EmptyState label="User not found" className="py-8" />
          )}
        </Card>
      </div>
    </div>
  );
}
