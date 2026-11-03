import type { Option } from "@/lib/module-types";

/** Fixed option lists shared by filters and forms. Values match the database (supabase/migrations). */
export const CATEGORY_OPTIONS: Option[] = [
  { value: "car", label: "Car" },
  { value: "bike", label: "Two Wheeler" },
  { value: "health", label: "Health" },
  { value: "term", label: "Term" },
  { value: "other", label: "Other" },
];

export const POLICY_STATUS_OPTIONS: Option[] = [
  { value: "active", label: "Active" },
  { value: "expiring", label: "Expiring Soon" },
  { value: "expired", label: "Expired" },
];

export const SOURCE_OPTIONS: Option[] = [
  { value: "advisor_added", label: "Advisor added" },
  { value: "user_added", label: "User added" },
];

export const VERIFICATION_OPTIONS: Option[] = [
  { value: "unverified", label: "Unverified" },
  { value: "verified", label: "Verified" },
  { value: "rejected", label: "Rejected" },
];

export const CLIENT_TYPE_OPTIONS: Option[] = [
  { value: "advisor_client", label: "Advisor client" },
  { value: "general", label: "General user" },
];

export const RENEWAL_STATUS_OPTIONS: Option[] = [
  { value: "pending", label: "Pending" },
  { value: "quote_sent", label: "Quote Sent" },
  { value: "renewed", label: "Renewed" },
  { value: "lapsed", label: "Lapsed" },
];

export const RENEWAL_WINDOW_OPTIONS: Option[] = [
  { value: "all", label: "All" },
  { value: "60", label: "60 days" },
  { value: "30", label: "30 days" },
  { value: "15", label: "15 days" },
  { value: "7", label: "7 days" },
  { value: "1", label: "1 day" },
];

export const QUOTE_STATUS_OPTIONS: Option[] = [
  { value: "new", label: "New" },
  { value: "in_progress", label: "In progress" },
  { value: "completed", label: "Completed" },
  { value: "closed", label: "Closed" },
];

export const NOTIFICATION_KIND_OPTIONS: Option[] = [
  { value: "renewal", label: "Renewal" },
  { value: "offer", label: "Offer" },
  { value: "greeting", label: "Greeting" },
  { value: "announcement", label: "Announcement" },
];

export const READ_OPTIONS: Option[] = [
  { value: "read", label: "Read" },
  { value: "unread", label: "Unread" },
];

export const AUDIENCE_OPTIONS: Option[] = [
  { value: "everyone", label: "Everyone" },
  { value: "advisor_clients", label: "Advisor clients" },
  { value: "general_users", label: "General users" },
  { value: "user", label: "One user" },
];

export const PLACEMENT_STATUS_OPTIONS: Option[] = [
  { value: "live", label: "Live" },
  { value: "scheduled", label: "Scheduled" },
  { value: "off", label: "Off" },
  { value: "ended", label: "Ended" },
];

export const SUPPORT_STATUS_OPTIONS: Option[] = [
  { value: "all", label: "All" },
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In progress" },
  { value: "resolved", label: "Resolved" },
];

export const DOCUMENT_TYPE_OPTIONS: Option[] = [
  { value: "Policy copy", label: "Policy copy" },
  { value: "RC", label: "RC" },
  { value: "ID proof", label: "ID proof" },
  { value: "Other", label: "Other" },
];

export const STAFF_ROLE_OPTIONS: Option[] = [
  { value: "admin", label: "Admin" },
  { value: "staff", label: "Staff" },
];
