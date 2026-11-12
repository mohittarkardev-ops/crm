import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Supabase Edge Function: daily-reminders
 * Scheduled daily (e.g., via pg_cron / Supabase Cron) to send:
 *  1. Policy expiry reminders at 60 / 30 / 15 / 7 / 1 days before due_date, saod_due_date, or tp_due_date
 *     (skipping policies already marked 'renewed' in `renewals`).
 *  2. Birthday greetings for registered users whose `date_of_birth` matches today (IST).
 *
 * Deduplicates against notifications already sent today (IST), writes rows to `public.notifications`,
 * and dispatches Expo Push alerts to registered `public.device_tokens` with `DeviceNotRegistered` pruning.
 *
 * Auth: Requires Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>
 */

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const MILESTONE_DAYS = [1, 7, 15, 30, 60] as const;

type Named<T> = T | T[] | null;

function one<T>(value: Named<T>): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function todayIST(): string {
  // Format YYYY-MM-DD in Asia/Kolkata
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function addDaysISO(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

interface PendingNotification {
  user_id: string;
  policy_id: string | null;
  kind: "renewal" | "greeting";
  title: string;
  body: string;
  data: Record<string, unknown>;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ ok: false, error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!supabaseUrl || !serviceKey) {
    return new Response(JSON.stringify({ ok: false, error: "Missing Supabase environment variables" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  if (authHeader !== `Bearer ${serviceKey}`) {
    return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const today = todayIST();
  const todayStartUTC = new Date(`${today}T00:00:00+05:30`).toISOString();
  const targetDates = MILESTONE_DAYS.map((d) => ({ days: d, iso: addDaysISO(today, d) }));
  const dateToDays = new Map<string, number>(targetDates.map((t) => [t.iso, t.days]));
  const targetIsos = targetDates.map((t) => t.iso);
  const inClause = `(${targetIsos.join(",")})`;

  const candidates: PendingNotification[] = [];

  // 1. Collect renewal reminders across due_date, saod_due_date, and tp_due_date
  for (let start = 0; ; start += 1000) {
    const { data, error } = await admin
      .from("policies")
      .select(
        "id, user_id, policy_number, vehicle_reg_no, insurer_name, due_date, saod_due_date, tp_due_date, insurers(name), renewals(status, created_at), users!inner(id, auth_user_id)",
      )
      .not("user_id", "is", null)
      .not("users.auth_user_id", "is", null)
      .or(`due_date.in.${inClause},saod_due_date.in.${inClause},tp_due_date.in.${inClause}`)
      .order("id")
      .range(start, start + 999);

    if (error) {
      return new Response(JSON.stringify({ ok: false, error: error.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const rows = (data ?? []) as unknown as {
      id: string;
      user_id: string;
      policy_number: string | null;
      vehicle_reg_no: string | null;
      insurer_name: string | null;
      due_date: string;
      saod_due_date: string | null;
      tp_due_date: string | null;
      insurers: Named<{ name: string }>;
      renewals: { status: string | null; created_at: string }[] | null;
    }[];

    for (const row of rows) {
      const latestRenewal = [...(row.renewals ?? [])].sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
      if (latestRenewal?.status === "renewed") continue;

      const label =
        row.vehicle_reg_no ||
        row.policy_number ||
        one(row.insurers)?.name ||
        row.insurer_name ||
        "your policy";

      const dueDays = dateToDays.get(row.due_date);
      const saodDays = row.saod_due_date && row.saod_due_date !== row.due_date ? dateToDays.get(row.saod_due_date) : undefined;
      const tpDays =
        row.tp_due_date && row.tp_due_date !== row.due_date && row.tp_due_date !== row.saod_due_date
          ? dateToDays.get(row.tp_due_date)
          : undefined;

      const pushReminder = (daysLeft: number, partLabel: string) => {
        const whenText = daysLeft === 1 ? "tomorrow" : `in ${daysLeft} days`;
        const title = daysLeft === 1 ? "Policy expires tomorrow" : `Renewal due in ${daysLeft} days`;
        const body = `${partLabel} for ${label} expires ${whenText}. Tap to view and request a renewal quote.`;
        candidates.push({
          user_id: row.user_id,
          policy_id: row.id,
          kind: "renewal",
          title,
          body,
          data: { kind: "renewal", policy_id: row.id },
        });
      };

      if (dueDays !== undefined) pushReminder(dueDays, "Your policy");
      if (saodDays !== undefined) pushReminder(saodDays, "Own-damage cover");
      if (tpDays !== undefined) pushReminder(tpDays, "Third-party cover");
    }

    if (rows.length < 1000) break;
  }

  // 2. Collect birthday greetings (matching MM-DD in IST)
  const mmdd = today.slice(5); // "MM-DD"
  for (let start = 0; ; start += 1000) {
    const { data, error } = await admin
      .from("users")
      .select("id, full_name, date_of_birth")
      .not("auth_user_id", "is", null)
      .not("date_of_birth", "is", null)
      .order("id")
      .range(start, start + 999);

    if (error) {
      return new Response(JSON.stringify({ ok: false, error: error.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    for (const user of data ?? []) {
      const dob = typeof user.date_of_birth === "string" ? user.date_of_birth : "";
      if (dob.slice(5) !== mmdd) continue;
      const firstName = typeof user.full_name === "string" ? user.full_name.trim().split(/\s+/)[0] : "";
      const title = firstName ? `Happy Birthday, ${firstName}!` : "Happy Birthday!";
      candidates.push({
        user_id: user.id as string,
        policy_id: null,
        kind: "greeting",
        title,
        body: "Wishing you a safe and wonderful year ahead from Secure Drive.",
        data: { kind: "greeting" },
      });
    }

    if ((data ?? []).length < 1000) break;
  }

  if (candidates.length === 0) {
    return new Response(JSON.stringify({ ok: true, created: 0, pushSent: 0 }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  // 3. Deduplicate against notifications already sent today (IST)
  const existingKeys = new Set<string>();
  for (let start = 0; ; start += 1000) {
    const { data, error } = await admin
      .from("notifications")
      .select("user_id, policy_id, kind, title")
      .gte("sent_at", todayStartUTC)
      .order("id")
      .range(start, start + 999);

    if (error) break;
    for (const row of data ?? []) {
      existingKeys.add(`${row.user_id}|${row.policy_id ?? ""}|${row.kind}|${row.title}`);
    }
    if ((data ?? []).length < 1000) break;
  }

  const toSend = candidates.filter((c) => {
    const key = `${c.user_id}|${c.policy_id ?? ""}|${c.kind}|${c.title}`;
    if (existingKeys.has(key)) return false;
    existingKeys.add(key);
    return true;
  });

  if (toSend.length === 0) {
    return new Response(JSON.stringify({ ok: true, created: 0, pushSent: 0 }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  // 4. Insert notification feed rows in 500-row batches
  for (let i = 0; i < toSend.length; i += 500) {
    const chunk = toSend.slice(i, i + 500).map((c) => ({
      user_id: c.user_id,
      policy_id: c.policy_id,
      kind: c.kind,
      title: c.title,
      body: c.body,
    }));
    const { error } = await admin.from("notifications").insert(chunk);
    if (error) {
      return new Response(JSON.stringify({ ok: false, error: error.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  // 5. Fetch device tokens for affected users & dispatch Expo Push alerts
  const uniqueUsers = [...new Set(toSend.map((c) => c.user_id))];
  const tokensByUser = new Map<string, string[]>();

  for (let i = 0; i < uniqueUsers.length; i += 500) {
    const { data } = await admin
      .from("device_tokens")
      .select("user_id, token")
      .in("user_id", uniqueUsers.slice(i, i + 500));

    for (const row of data ?? []) {
      if (!row.user_id || !row.token) continue;
      const list = tokensByUser.get(row.user_id as string) ?? [];
      list.push(row.token as string);
      tokensByUser.set(row.user_id as string, list);
    }
  }

  const pushMessages: { to: string; sound: string; title: string; body: string; data: Record<string, unknown> }[] = [];
  for (const item of toSend) {
    const tokens = tokensByUser.get(item.user_id);
    if (!tokens || tokens.length === 0) continue;
    for (const to of tokens) {
      pushMessages.push({
        to,
        sound: "default",
        title: item.title,
        body: item.body,
        data: item.data,
      });
    }
  }

  const expoAccessToken = Deno.env.get("EXPO_ACCESS_TOKEN");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (expoAccessToken) {
    headers.Authorization = `Bearer ${expoAccessToken}`;
  }

  let pushSent = 0;
  let pushFailed = 0;
  const staleTokens: string[] = [];

  for (let i = 0; i < pushMessages.length; i += 100) {
    const batch = pushMessages.slice(i, i + 100);
    try {
      const res = await fetch(EXPO_PUSH_URL, {
        method: "POST",
        headers,
        body: JSON.stringify(batch),
      });
      if (!res.ok) {
        pushFailed += batch.length;
        continue;
      }
      const json = (await res.json()) as {
        data?: { status?: string; details?: { error?: string } }[];
      };
      const tickets = json.data ?? [];
      for (let idx = 0; idx < batch.length; idx++) {
        const ticket = tickets[idx];
        if (ticket?.status === "ok") {
          pushSent++;
        } else {
          pushFailed++;
          if (ticket?.details?.error === "DeviceNotRegistered") {
            staleTokens.push(batch[idx].to);
          }
        }
      }
    } catch {
      pushFailed += batch.length;
    }
  }

  for (let i = 0; i < staleTokens.length; i += 200) {
    await admin.from("device_tokens").delete().in("token", staleTokens.slice(i, i + 200));
  }

  return new Response(
    JSON.stringify({
      ok: true,
      date: today,
      created: toSend.length,
      pushSent,
      pushFailed,
    }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
});
