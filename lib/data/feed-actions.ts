"use server";

import { getStaff } from "@/lib/auth";
import { getActivityFeed, type FeedItem } from "@/lib/data/feed";

/** Called by the notification bell. Only CRM staff get a feed. */
export async function fetchFeed(): Promise<FeedItem[]> {
  const { staff } = await getStaff();
  if (!staff) return [];
  return getActivityFeed();
}
