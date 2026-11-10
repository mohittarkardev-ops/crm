import { BarChart3, PieChart, Users, Wallet } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { ArchitectDraftsmanCharacter, type BlueprintVariant } from "@/components/ui/characters";
import { EmptyState } from "@/components/ui/empty-state";
import { MiniStat, StatRow } from "@/components/ui/mini-stat";
import { getReportStats } from "@/lib/data/admin";
import { requirePermission } from "@/lib/rbac/server";

const REPORTS: { title: string; icon: typeof BarChart3; variant: BlueprintVariant; hint: string }[] = [
  { title: "Renewals by month", icon: BarChart3, variant: "bars", hint: "Monthly renewal velocity blueprint" },
  { title: "Policies by category", icon: PieChart, variant: "donut", hint: "Category breakdown blueprint" },
  { title: "Clients vs general users", icon: Users, variant: "users", hint: "Conversion funnel blueprint" },
  { title: "Commission", icon: Wallet, variant: "rupee", hint: "Insurer payout ledger blueprint" },
];

export default async function ReportsPage() {
  await requirePermission("reports.view");
  const stats = await getReportStats();

  return (
    <div className="space-y-4">
      <StatRow>
        <MiniStat index={0} title="Total Users" icon={Users} value={stats.users} />
        <MiniStat index={1} title="Total Policies" icon={PieChart} value={stats.policies} />
        <MiniStat index={2} title="Renewals Due (60 days)" icon={BarChart3} value={stats.renewalsDue} />
        <MiniStat index={3} title="Commission" icon={Wallet} kind="inr" />
      </StatRow>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {REPORTS.map((report, i) => (
          <Card key={report.title} index={i + 4}>
            <CardHeader title={report.title} />
            <EmptyState
              label="Not built yet"
              hint={report.hint}
              icon={report.icon}
              illustration={<ArchitectDraftsmanCharacter variant={report.variant} />}
              className="h-52"
            />
          </Card>
        ))}
      </div>
    </div>
  );
}
