import type { PolicyStatus } from "@/lib/status";

export type RenewalRange = "week" | "month" | "year";
export type ChartDatum = { label: string; value: number };
export type CategorySlice = { name: string; value: number; color: string };

export type UpcomingRenewal = {
  id: string;
  client: string;
  policy: string;
  insurer: string;
  policyNumber: string;
  expiry: string; // ISO date
  daysLeft: number;
  status: PolicyStatus;
};

export type DashboardData = {
  activePolicies: number;
  newClients: number;
  renewalRevenue: number;
  renewalRate: number;
  renewals: Record<RenewalRange, ChartDatum[]>;
  categories: CategorySlice[];
  upcoming: UpcomingRenewal[];
};
