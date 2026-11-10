import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { buttonStyles } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { WavingShieldCharacter } from "@/components/ui/characters";
import { Chip } from "@/components/ui/chip";

function istGreeting(): string {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", { hour: "numeric", hour12: false, timeZone: "Asia/Kolkata" }).format(new Date()),
  );
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

/**
 * Compact Hudson companion strip at the top of the Dashboard:
 * pairs the waving Shield mascot with a live IST greeting, portfolio pulse, and RBAC-safe shortcut.
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
        <div className="flex min-w-0 items-center gap-3.5">
          <WavingShieldCharacter />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-ink sm:text-[15px]">
                {istGreeting()}, {firstName}
              </p>
              <Chip tone="accent">Shield Crew</Chip>
            </div>
            <p className="mt-0.5 text-xs text-ink-muted tabular-nums">
              {activePolicies.toLocaleString("en-IN")} active {activePolicies === 1 ? "policy" : "policies"} on watch
              {upcomingCount > 0
                ? ` · ${upcomingCount} due in the next 60 days.`
                : " · all clear for the next 60 days."}
            </p>
          </div>
        </div>

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
