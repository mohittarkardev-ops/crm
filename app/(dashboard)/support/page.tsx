import { CheckCircle2, Headset, LifeBuoy, Ticket } from "lucide-react";
import { ModulePage } from "@/components/modules/module-page";
import { ModuleEmptyCharacter } from "@/components/ui/characters";
import { MiniStat, StatRow } from "@/components/ui/mini-stat";
import { getSupport } from "@/lib/data/engagement";
import { SUPPORT_STATUS_OPTIONS } from "@/lib/options";
import { requirePermission } from "@/lib/rbac/server";

export default async function SupportPage() {
  await requirePermission("support.view");
  const { rows, totalCount, stats } = await getSupport();

  return (
    <div className="space-y-4">
      <StatRow>
        <MiniStat index={0} title="Total Tickets" icon={LifeBuoy} value={stats.total} />
        <MiniStat index={1} title="Open" icon={Ticket} value={stats.open} />
        <MiniStat index={2} title="In Progress" icon={Headset} value={stats.in_progress} />
        <MiniStat index={3} title="Resolved" icon={CheckCircle2} value={stats.resolved} />
      </StatRow>

      <ModulePage
        index={4}
        rows={rows}
        totalCount={totalCount}
        exportName="support-tickets"
        emptyLabel="No support tickets yet"
        emptyIllustration={<ModuleEmptyCharacter variant="support" />}
        rowHref="/support"
        search="Search user or subject…"
        tabs={{ key: "status", label: "Ticket status", options: SUPPORT_STATUS_OPTIONS }}
        columns={[
          { key: "user", label: "User", type: "person" },
          { key: "mobile", label: "Mobile" },
          { key: "subject", label: "Subject" },
          { key: "createdOn", label: "Created", type: "date" },
          { key: "status", label: "Status", type: "chip" },
        ]}
      />
    </div>
  );
}
