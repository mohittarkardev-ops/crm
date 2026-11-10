import { CheckCircle2, Clock, Hourglass, Sparkles } from "lucide-react";
import { ModulePage } from "@/components/modules/module-page";
import { MiniStat, StatRow } from "@/components/ui/mini-stat";
import { getQuotes } from "@/lib/data/engagement";
import { CATEGORY_OPTIONS, CLIENT_TYPE_OPTIONS, QUOTE_STATUS_OPTIONS } from "@/lib/options";
import { requirePermission } from "@/lib/rbac/server";

export default async function QuotesPage() {
  await requirePermission("quotes.view");
  const { rows, totalCount, stats } = await getQuotes();

  return (
    <div className="space-y-4">
      <StatRow>
        <MiniStat index={0} title="New" icon={Sparkles} value={stats.new} />
        <MiniStat index={1} title="Pending" icon={Hourglass} value={stats.pending} />
        <MiniStat index={2} title="In Progress" icon={Clock} value={stats.in_progress} />
        <MiniStat index={3} title="Renewed" icon={CheckCircle2} value={stats.renewed} />
      </StatRow>

      <ModulePage
        index={4}
        rows={rows}
        totalCount={totalCount}
        exportName="quote-requests"
        emptyLabel="No quote requests yet"
        rowHref="/quotes"
        search="Search user or policy…"
        filters={[
          { key: "status", label: "All statuses", options: QUOTE_STATUS_OPTIONS },
          { key: "category", label: "All categories", options: CATEGORY_OPTIONS },
          { key: "userType", label: "All users", options: CLIENT_TYPE_OPTIONS },
        ]}
        columns={[
          { key: "user", label: "Requested by", type: "person" },
          { key: "mobile", label: "Mobile" },
          { key: "policy", label: "Policy" },
          { key: "category", label: "Category", type: "chip" },
          { key: "requestedOn", label: "Requested on", type: "date" },
          { key: "status", label: "Status", type: "chip" },
        ]}
      />
    </div>
  );
}
