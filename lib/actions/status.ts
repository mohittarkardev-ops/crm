"use server";

import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/module-types";
import { NOT_STAFF, audit, dbMessage, done, fail, requireStaff } from "@/lib/actions/shared";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Values allowed by the database check constraints.
const QUOTE_STATUSES = ["new", "pending", "in_progress", "completed", "closed", "renewed"];
const TICKET_STATUSES = ["open", "in_progress", "resolved"];

export async function setQuoteStatus(id: string, status: string): Promise<ActionState> {
  const staff = await requireStaff();
  if (!staff) return fail(NOT_STAFF);
  if (!UUID.test(id) || !QUOTE_STATUSES.includes(status)) return fail("That change is not allowed.");

  const db = await createClient();
  const result = await db.from("quote_requests").update({ status }).eq("id", id).select("id");
  if (result.error) return fail(dbMessage(result.error));
  if ((result.data ?? []).length === 0) return fail("That quote request could not be found.");

  await audit(db, staff.id, `quote.${status}`, "quote_request", id);
  return done("Quote request updated.");
}

export async function setTicketStatus(id: string, status: string): Promise<ActionState> {
  const staff = await requireStaff();
  if (!staff) return fail(NOT_STAFF);
  if (!UUID.test(id) || !TICKET_STATUSES.includes(status)) return fail("That change is not allowed.");

  const db = await createClient();
  const result = await db.from("support_tickets").update({ status }).eq("id", id).select("id");
  if (result.error) return fail(dbMessage(result.error));
  if ((result.data ?? []).length === 0) return fail("That ticket could not be found.");

  await audit(db, staff.id, `ticket.${status}`, "support_ticket", id);
  return done("Ticket updated.");
}
