import { IncentivesShell } from "@/components/modules/incentives/incentives-shell";
import { todayIST } from "@/lib/data/helpers";
import { getIncentivesDashboard } from "@/lib/data/incentives";
import { can } from "@/lib/rbac/permissions";
import { requirePermission } from "@/lib/rbac/server";

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

export default async function IncentivesPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const staff = await requirePermission("incentives.view");
  const canManage = can(staff, "incentives.manage");

  const params = await searchParams;
  const currentMonth = todayIST().slice(0, 7);
  const requested = typeof params.month === "string" ? params.month.trim() : "";
  const monthIso = MONTH_RE.test(requested) ? requested : currentMonth;

  const payload = await getIncentivesDashboard(monthIso, staff, canManage);

  return <IncentivesShell data={payload} />;
}
