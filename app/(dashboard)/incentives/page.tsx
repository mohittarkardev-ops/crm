import { IncentivesShell } from "@/components/modules/incentives/incentives-shell";
import { todayIST } from "@/lib/data/helpers";
import { getIncentivesDashboard } from "@/lib/data/incentives";
import { can } from "@/lib/rbac/permissions";
import { requirePermission } from "@/lib/rbac/server";

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
const DAY_RE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

export default async function IncentivesPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; day?: string }>;
}) {
  const staff = await requirePermission("incentives.view");
  const canManage = can(staff, "incentives.manage");

  const params = await searchParams;
  const currentMonth = todayIST().slice(0, 7);
  const requested = typeof params.month === "string" ? params.month.trim() : "";
  const requestedDay = typeof params.day === "string" ? params.day.trim() : "";
  const validDay = DAY_RE.test(requestedDay) ? requestedDay : null;
  const monthIso = MONTH_RE.test(requested)
    ? requested
    : validDay
      ? validDay.slice(0, 7)
      : currentMonth;
  const initialSelectedDay = validDay && validDay.slice(0, 7) === monthIso ? validDay : null;

  const payload = await getIncentivesDashboard(monthIso, staff, canManage);

  return <IncentivesShell data={payload} initialSelectedDay={initialSelectedDay} />;
}
