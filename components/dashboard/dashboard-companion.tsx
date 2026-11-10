import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { buttonStyles } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getShiftForHour, type MascotShift } from "@/components/ui/characters";
import { CompanionMascot } from "@/components/dashboard/companion-mascot";

function istSchedule(): { greeting: string; shift: MascotShift } {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", { hour: "numeric", hour12: false, timeZone: "Asia/Kolkata" }).format(new Date()),
  );
  const shift = getShiftForHour(hour);
  const greeting =
    hour >= 5 && hour < 12
      ? "Good morning"
      : hour >= 12 && hour < 17
        ? "Good afternoon"
        : "Good evening";
  return { greeting, shift };
}

/**
 * Compact Hudson companion strip at the top of the Dashboard:
 * pairs the waving Shield mascot with a live IST greeting, time-of-day shift flair, portfolio pulse, and RBAC-safe shortcut.
 */
export function DashboardCompanion({
  staffName,
  activePolicies,
  upcomingCount,
  canViewRenewals,
  canViewPolicies,
}: {
  staffName: string;
  activePolicies: number;
  upcomingCount: number;
  canViewRenewals: boolean;
  canViewPolicies: boolean;
}) {
  const firstName = staffName.trim().split(/\s+/)[0] || staffName;
  const { greeting, shift } = istSchedule();
  const summary = `${activePolicies.toLocaleString("en-IN")} active ${activePolicies === 1 ? "policy" : "policies"} on watch${
    upcomingCount > 0 ? ` · ${upcomingCount} due in the next 60 days.` : " · all clear for the next 60 days."
  }`;
  const action = canViewRenewals && upcomingCount > 0
    ? { href: "/renewals", label: "Review renewals" }
    : canViewPolicies
      ? { href: "/policies", label: "Open policies" }
      : canViewRenewals
        ? { href: "/renewals", label: "View renewals" }
        : null;

  return (
    <Card index={0} className="p-4 sm:px-5 sm:py-3.5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <CompanionMascot
          initialShift={shift}
          greeting={greeting}
          firstName={firstName}
          summary={summary}
        />

        {action && (
          <Link href={action.href} className={buttonStyles("secondary", "h-9 px-3.5 text-xs shrink-0")}>
            {action.label}
            <ArrowUpRight size={14} strokeWidth={1.75} aria-hidden="true" />
          </Link>
        )}
      </div>
    </Card>
  );
}
