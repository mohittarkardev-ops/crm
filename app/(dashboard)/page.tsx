import { FileCheck2, IndianRupee, UserPlus, UserRoundCheck } from "lucide-react";
import { CategoryCard } from "@/components/dashboard/category-card";
import { RenewalsCard } from "@/components/dashboard/renewals-card";
import { UpcomingRenewals } from "@/components/dashboard/upcoming-renewals";
import { StatCard } from "@/components/ui/stat-card";
import { getDashboard } from "@/lib/data/dashboard";
import { requirePermission } from "@/lib/rbac/server";

export default async function DashboardPage() {
  await requirePermission("dashboard.view");
  const data = await getDashboard();

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard index={0} title="Active Policies" icon={FileCheck2} value={data.activePolicies} />
        <StatCard index={1} title="New Clients" icon={UserPlus} value={data.newClients} />
        <StatCard index={2} title="Renewal Revenue" icon={IndianRupee} value={data.renewalRevenue} kind="inr" />
        <StatCard index={3} title="Renewal Rate" icon={UserRoundCheck} value={data.renewalRate} kind="percent" />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <RenewalsCard index={4} data={data.renewals} />
        <CategoryCard index={5} slices={data.categories} />
      </div>

      <UpcomingRenewals index={6} items={data.upcoming} />
    </div>
  );
}
