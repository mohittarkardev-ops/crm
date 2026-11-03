import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { dateIST, one } from "@/lib/data/helpers";
import type { ClientInfo } from "@/lib/data/details";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type TicketDetail = {
  id: string;
  subject: string;
  description: string | null;
  status: string;
  createdOn: string | null;
  client: ClientInfo | null;
};

export async function getTicketDetail(id: string): Promise<TicketDetail> {
  if (!UUID.test(id)) notFound();
  const db = await createClient();

  const { data, error } = await db
    .from("support_tickets")
    .select(
      "id, subject, description, status, created_at, users(id, full_name, mobile_number, email, is_advisor_client, created_at)",
    )
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(`Support ticket: ${error.message}`);
  if (!data) notFound();

  const t = data as {
    id: string;
    subject: string;
    description: string | null;
    status: string;
    created_at: string;
    users: Record<string, unknown> | Record<string, unknown>[] | null;
  };
  const u = one(t.users) as {
    id: string;
    full_name: string | null;
    mobile_number: string;
    email: string | null;
    is_advisor_client: boolean | null;
    created_at: string;
  } | null;

  return {
    id: t.id,
    subject: t.subject,
    description: t.description,
    status: t.status,
    createdOn: dateIST(t.created_at),
    client: u
      ? {
          id: u.id,
          name: u.full_name,
          mobile: u.mobile_number,
          email: u.email,
          isAdvisorClient: Boolean(u.is_advisor_client),
          joinedOn: dateIST(u.created_at),
        }
      : null,
  };
}
