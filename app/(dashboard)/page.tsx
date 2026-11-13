import { UserPlus } from "lucide-react";
import { ActivePoliciesCard } from "@/components/dashboard/active-policies-card";
import { AgencyClaimsCard } from "@/components/dashboard/agency-claims-card";
import { BusinessPaymentCard } from "@/components/dashboard/business-payment-card";
import { DashboardCompanion } from "@/components/dashboard/dashboard-companion";
import { NewCustomersCard } from "@/components/dashboard/new-customers-card";
import { RenewalRetentionCard } from "@/components/dashboard/renewal-retention-card";
import { UpcomingRenewals } from "@/components/dashboard/upcoming-renewals";
import { WelcomeClientMini } from "@/components/ui/characters";
import { StatCard } from "@/components/ui/stat-card";
import { getDashboard } from "@/lib/data/dashboard";
import { can } from "@/lib/rbac/permissions";
import { requirePermission } from "@/lib/rbac/server";

export default async function DashboardPage() {
  const staff = await requirePermission("dashboard.view");
  const data = await getDashboard();
  const canViewPolicies = can(staff, "policies.view");
  const canViewRenewals = can(staff, "renewals.view");
  const canViewClients = can(staff, "clients.view");
  const canViewClaims = can(staff, "claims.approve");

  return (
    <div className="space-y-4">
      <DashboardCompanion
        staffName={staff.full_name}
        activePolicies={data.activePolicies}
        upcomingCount={data.upcoming.length}
        canViewRenewals={canViewRenewals}
        canViewPolicies={canViewPolicies}
      />

      {/* Top Stat Cards: 4 symmetrical, clickable cards across the board */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ActivePoliciesCard
          index={1}
          data={data.activeRenewed}
          canViewPolicies={canViewPolicies}
        />
        <StatCard
          index={2}
          title="New clients"
          icon={UserPlus}
          value={data.newClients}
          visual={<WelcomeClientMini />}
          href={canViewClients ? "/clients" : undefined}
          actionLabel="View clients"
        />
        <UpcomingRenewals
          index={3}
          items={data.upcoming}
          canViewRenewals={canViewRenewals}
        />
        <AgencyClaimsCard
          index={4}
          pendingCount={data.pendingClaimsCount}
          canViewClaims={canViewClaims}
        />
      </div>

      {/* Pinterest-Style Balanced Masonry Layout (Zero blank voids, auto-fitting heights) */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] items-start">
        {/* Left Column: New Customers Bar Chart + Renewal Retention stacked seamlessly */}
        <div className="flex flex-col gap-4">
          <NewCustomersCard index={5} data={data.newCustomers} />
          <RenewalRetentionCard index={6} data={data.renewalRetention} />
        </div>

        {/* Right Column: Total Business Payment with Donut & Category Breakdown */}
        <div className="flex flex-col gap-4">
          <BusinessPaymentCard index={7} data={data.businessPayment} />
        </div>
      </div>
    </div>
  );
}
