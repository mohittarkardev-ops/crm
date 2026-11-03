import { BarChart3, PieChart, Users, Wallet } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { MiniStat, StatRow } from "@/components/ui/mini-stat";
import { getReportStats } from "@/lib/data/admin";

const REPORTS = [
  { title: "Renewals by month", icon: BarChart3 },
  { title: "Policies by category", icon: PieChart },
  { title: "Clients vs general users", icon: Users },
  { title: "Commission", icon: Wallet },
];

export default async function ReportsPage() {
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
            <EmptyState label="Not built yet" icon={report.icon} className="h-52" />
          </Card>
        ))}
      </div>
    </div>
  );
}
