import { createClient } from "@/lib/supabase/server";
import { countOf, monthStart, rowsOf, todayIST } from "@/lib/data/helpers";
import { dateIST } from "@/lib/data/helpers";
import type { Row } from "@/lib/module-types";

type UserRecord = {
  id: string;
  full_name: string | null;
  mobile_number: string;
  email: string | null;
  is_advisor_client: boolean;
  created_at: string;
  policies: { count: number }[] | null;
};

/** Clients and general users (the `users` table). Shows the latest 1000. */
export async function getClients() {
  const db = await createClient();
  const month = monthStart(todayIST());
  const head = { count: "exact", head: true } as const;

  const [list, all, advisor, fresh] = await Promise.all([
    db
      .from("users")
      .select("id, full_name, mobile_number, email, is_advisor_client, created_at, policies(count)")
      .order("created_at", { ascending: false })
      .limit(1000),
    db.from("users").select("id", head),
    db.from("users").select("id", head).eq("is_advisor_client", true),
    db.from("users").select("id", head).gte("created_at", month),
  ]);

  const rows: Row[] = rowsOf<UserRecord>(list, "Clients").map((u) => ({
    id: u.id,
    name: u.full_name ?? u.mobile_number,
    mobile: u.mobile_number,
    email: u.email,
    type: u.is_advisor_client ? "advisor_client" : "general",
    policies: u.policies?.[0]?.count ?? 0,
    joined: dateIST(u.created_at),
  }));

  const total = countOf(all, "Clients count");
  const advisors = countOf(advisor, "Advisor clients count");
  return { rows, stats: { total, advisors, general: total - advisors, fresh: countOf(fresh, "New clients count") } };
}
