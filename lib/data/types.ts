import type { PolicyStatus } from "@/lib/status";

export type RenewalRange = "week" | "month" | "year";
export type DashboardTimeRange = "day" | "week" | "month" | "year";
export type ChartDatum = { label: string; value: number };
export type CategorySlice = { name: string; value: number; color: string; amount?: number };

export type BusinessCategorySlice = {
  name: string;
  code: string;
  rawAmount: number; // in INR
  percentage: number;
  color: string;
};

export type BusinessPeriodData = {
  slices: BusinessCategorySlice[];
  totalRaw: number;
  previousRaw: number;
  growthPercent: number | null;
  periodLabel: string;
  previousLabel: string;
};

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

export type RetentionPeriodData = {
  renewedCount: number;
  closedBaseCount: number;
  retentionRate: number;
  currentPeriodLabel: string;
  basePeriodLabel: string;
  trendPercent: number | null;
};

export type RenewalRetentionMetric = {
  monthly: RetentionPeriodData;
  yearly: RetentionPeriodData;
};

export type DashboardPolicyCategory = "all" | "2w" | "4w" | "health" | "term" | "sme";

export type CategoryRenewedCount = {
  policiesCount: number;
  customersCount: number;
};

export type ActiveRenewedMetric = {
  totalPolicies: number;
  totalCustomers: number;
  byCategory: Record<DashboardPolicyCategory, CategoryRenewedCount>;
};

export type DashboardData = {
  activePolicies: number;
  newClients: number;
  activeRenewed: ActiveRenewedMetric;
  pendingClaimsCount: number;
  renewalRevenue: number;
  renewalRate: number;
  renewalRetention: RenewalRetentionMetric;
  newCustomers: {
    total: number;
    breakdown: Record<DashboardTimeRange, ChartDatum[]>;
    periodTotals: Record<DashboardTimeRange, number>;
  };
  businessPayment: Record<DashboardTimeRange, BusinessPeriodData>;
  renewals: Record<RenewalRange, ChartDatum[]>;
  categories: CategorySlice[];
  upcoming: UpcomingRenewal[];
};
