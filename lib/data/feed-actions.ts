"use server";

import { getStaff } from "@/lib/auth";
import { can } from "@/lib/rbac/permissions";
import { getActivityFeed, type FeedItem } from "@/lib/data/feed";

/** Called by the notification bell. Only CRM staff get the activity feed slices they can view. */
export async function fetchFeed(): Promise<FeedItem[]> {
  const { staff } = await getStaff();
  if (!staff) return [];
  return getActivityFeed({
    quotes: can(staff, "quotes.view"),
    support: can(staff, "support.view"),
    policies: can(staff, "policies.view"),
    clients: can(staff, "clients.view"),
  });
}
