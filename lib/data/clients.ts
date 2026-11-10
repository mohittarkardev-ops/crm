import { createClient } from "@/lib/supabase/server";
import { countOf, dateIST, monthStart, pagedRows, todayIST } from "@/lib/data/helpers";
import type { Row } from "@/lib/module-types";

type UserRecord = {
  id: string;
  full_name: string | null;
  mobile_number: string;
  email: string | null;
  is_advisor_client: boolean;
  date_of_birth: string | null;
  created_at: string;
  policies: { count: number }[] | null;
};

/** Clients and general users (the `users` table), paged past 1,000 rows up to 10,000. */
export async function getClients() {
  const db = await createClient();
  const month = monthStart(todayIST());
  const head = { count: "exact", head: true } as const;

  const [records, all, advisor, fresh] = await Promise.all([
    pagedRows<UserRecord>(
      (from, to) =>
        db
          .from("users")
          .select("id, full_name, mobile_number, email, is_advisor_client, date_of_birth, created_at, policies(count)")
          .order("created_at", { ascending: false })
          .order("id", { ascending: false })
          .range(from, to),
      "Clients",
    ),
    db.from("users").select("id", head),
    db.from("users").select("id", head).eq("is_advisor_client", true),
    db.from("users").select("id", head).gte("created_at", month),
  ]);

  const rows: Row[] = records.map((u) => ({
    id: u.id,
    name: u.full_name ?? u.mobile_number,
    mobile: u.mobile_number,
    email: u.email,
    type: u.is_advisor_client ? "advisor_client" : "general",
    dob: u.date_of_birth ?? "",
    policies: u.policies?.[0]?.count ?? 0,
    joined: dateIST(u.created_at),
  }));

  const total = countOf(all, "Clients count");
  const advisors = countOf(advisor, "Advisor clients count");
  return {
    rows,
    totalCount: total,
    stats: { total, advisors, general: total - advisors, fresh: countOf(fresh, "New clients count") },
  };
}
