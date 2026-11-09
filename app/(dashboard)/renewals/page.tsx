import { CheckCircle2, Clock, Send, XCircle } from "lucide-react";
import { ModulePage } from "@/components/modules/module-page";
import { MiniStat, StatRow } from "@/components/ui/mini-stat";
import { getRenewals } from "@/lib/data/policies";
import { CATEGORY_OPTIONS, RENEWAL_STATUS_OPTIONS, RENEWAL_WINDOW_OPTIONS } from "@/lib/options";
import { requirePermission } from "@/lib/rbac/server";

export default async function RenewalsPage() {
  await requirePermission("renewals.view");
  const { rows, stats } = await getRenewals();

  return (
    <div className="space-y-4">
      <StatRow>
        <MiniStat index={0} title="Pending" icon={Clock} value={stats.pending} />
        <MiniStat index={1} title="Quote Sent" icon={Send} value={stats.quote_sent} />
        <MiniStat index={2} title="Renewed" icon={CheckCircle2} value={stats.renewed} />
        <MiniStat index={3} title="Lapsed" icon={XCircle} value={stats.lapsed} />
      </StatRow>

      <ModulePage
        index={4}
        rows={rows}
        emptyLabel="No renewals due"
        rowHref="/policies"
        search="Search client or policy…"
        tabs={{ key: "window", label: "Days to expiry", options: RENEWAL_WINDOW_OPTIONS }}
        filters={[
          { key: "status", label: "All statuses", options: RENEWAL_STATUS_OPTIONS },
          { key: "category", label: "All categories", options: CATEGORY_OPTIONS },
        ]}
        columns={[
          { key: "client", label: "Client", type: "person" },
          { key: "policy", label: "Policy" },
          { key: "insurer", label: "Insurer" },
          { key: "expiry", label: "Expiry", type: "date" },
          { key: "daysLeft", label: "Days left", type: "number" },
          { key: "status", label: "Status", type: "chip" },
        ]}
      />
    </div>
  );
}
