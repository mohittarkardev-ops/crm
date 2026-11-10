import { FileCheck2, IndianRupee, UserPlus, UserRoundCheck } from "lucide-react";
import { CategoryCard } from "@/components/dashboard/category-card";
import { DashboardCompanion } from "@/components/dashboard/dashboard-companion";
import { RenewalsCard } from "@/components/dashboard/renewals-card";
import { UpcomingRenewals } from "@/components/dashboard/upcoming-renewals";
import {
  GoalFlagMini,
  PolicyKeeperMini,
  RevenueVaultMini,
  WelcomeClientMini,
} from "@/components/ui/characters";
import { StatCard } from "@/components/ui/stat-card";
import { getDashboard } from "@/lib/data/dashboard";
import { can } from "@/lib/rbac/permissions";
import { requirePermission } from "@/lib/rbac/server";

export default async function DashboardPage() {
  const staff = await requirePermission("dashboard.view");
  const data = await getDashboard();
  const canViewPolicies = can(staff, "policies.view");
  const canViewRenewals = can(staff, "renewals.view");

  return (
    <div className="space-y-4">
      <DashboardCompanion
        staffName={staff.full_name}
        activePolicies={data.activePolicies}
        upcomingCount={data.upcoming.length}
        canViewRenewals={canViewRenewals}
        canViewPolicies={canViewPolicies}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          index={1}
          title="Active Policies"
          icon={FileCheck2}
          value={data.activePolicies}
          visual={<PolicyKeeperMini />}
        />
        <StatCard
          index={2}
          title="New Clients"
          icon={UserPlus}
          value={data.newClients}
          visual={<WelcomeClientMini />}
        />
        <StatCard
          index={3}
          title="Renewal Revenue"
          icon={IndianRupee}
          value={data.renewalRevenue}
          kind="inr"
          visual={<RevenueVaultMini />}
        />
        <StatCard
          index={4}
          title="Renewal Rate"
          icon={UserRoundCheck}
          value={data.renewalRate}
          kind="percent"
          visual={<GoalFlagMini />}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <RenewalsCard index={5} data={data.renewals} />
        <CategoryCard index={6} slices={data.categories} />
      </div>

      <UpcomingRenewals
        index={7}
        items={data.upcoming}
        canViewPolicies={canViewPolicies}
        canViewRenewals={canViewRenewals}
      />
    </div>
  );
}
