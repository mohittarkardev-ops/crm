export type PolicyStatus =
  | "active"
  | "expiring"
  | "expired"
  | "quote_sent"
  | "pending"
  | "renewed";

export type ChipTone = "positive" | "warning" | "negative" | "info" | "neutral" | "accent";

/** Policy status → label + chip tone (design.md section 2.1). */
export const STATUS_META: Record<PolicyStatus, { label: string; tone: ChipTone }> = {
  active: { label: "Active", tone: "positive" },
  expiring: { label: "Expiring Soon", tone: "warning" },
  expired: { label: "Expired", tone: "negative" },
  quote_sent: { label: "Quote Sent", tone: "info" },
  pending: { label: "Pending", tone: "neutral" },
  renewed: { label: "Renewed", tone: "accent" },
};

const TONES: Record<string, ChipTone> = {
  lapsed: "negative",
  open: "warning",
  in_progress: "info",
  resolved: "positive",
  closed: "neutral",
  new: "info",
  converted: "positive",
  declined: "negative",
  sent: "positive",
  scheduled: "info",
  draft: "neutral",
  failed: "negative",
  live: "positive",
  off: "neutral",
  advisor_client: "accent",
  general: "neutral",
  advisor_added: "accent",
  user_added: "neutral",
  admin: "accent",
  staff: "info",
  invited: "warning",
  manual: "neutral",
  automated: "info",
  broadcast: "accent",
  user_specific: "neutral",
  completed: "positive",
  approved: "positive",
  verified: "positive",
  unverified: "warning",
  rejected: "negative",
  unread: "warning",
  read: "neutral",
  on: "positive",
  ended: "neutral",
};

const LABELS: Record<string, string> = {
  car: "Car",
  bike: "Two Wheeler",
  health: "Health",
  term: "Term",
  other: "Other",
  user_added: "External policy",
  advisor_added: "Insured by agency",
};

/** Category code from the database (car, bike, health, term, other) → display name. */
export function categoryLabel(code: string | null | undefined): string {
  return code ? (LABELS[code] ?? code.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase())) : "Other";
}

/** Any status-like value → chip label + tone. Unknown values fall back to a neutral chip. */
export function chipFor(value: string): { label: string; tone: ChipTone } {
  const meta = STATUS_META[value as PolicyStatus];
  if (meta) return meta;
  const label = LABELS[value] ?? value.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
  return { label, tone: TONES[value] ?? "neutral" };
}
