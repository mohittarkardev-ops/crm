const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const envPath = path.join(__dirname, '..', '.env.local');
const envText = fs.readFileSync(envPath, 'utf8');
const env = {};
envText.split('\n').forEach((line) => {
  const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)?$/);
  if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
});

if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function clearData() {
  console.log("Checking current counts before purge...");
  const [polRes, clientRes, claimRes, quoteRes, ticketRes] = await Promise.all([
    db.from('policies').select('id', { count: 'exact', head: true }),
    db.from('users').select('id', { count: 'exact', head: true }),
    db.from('claims').select('id', { count: 'exact', head: true }),
    db.from('quote_requests').select('id', { count: 'exact', head: true }),
    db.from('support_tickets').select('id', { count: 'exact', head: true })
  ]);

  console.log(`Current counts:
- Policies: ${polRes.count ?? 0}
- Clients (users): ${clientRes.count ?? 0}
- Claims: ${claimRes.count ?? 0}
- Quotes: ${quoteRes.count ?? 0}
- Support tickets: ${ticketRes.count ?? 0}`);

  console.log("\nPurging tables in foreign-key safe order...");

  // 1. Child tables of quotes & policies
  await db.from('quote_documents').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await db.from('policy_documents').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  // 2. Ledger and performance deltas
  await db.from('agent_incentive_ledger').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await db.from('agent_daily_performance').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  // 3. Renewals, claims, quotes, support
  await db.from('renewals').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await db.from('claims').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await db.from('quote_requests').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await db.from('support_tickets').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  // 4. Notifications & device tokens
  await db.from('notifications').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await db.from('device_tokens').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  // 5. Policies & family members
  await db.from('policies').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await db.from('family_members').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  // 6. Clients (users table)
  await db.from('users').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  console.log("\nVerifying counts after purge...");
  const [afterPol, afterClient, afterClaim, afterQuotes, afterTickets] = await Promise.all([
    db.from('policies').select('id', { count: 'exact', head: true }),
    db.from('users').select('id', { count: 'exact', head: true }),
    db.from('claims').select('id', { count: 'exact', head: true }),
    db.from('quote_requests').select('id', { count: 'exact', head: true }),
    db.from('support_tickets').select('id', { count: 'exact', head: true })
  ]);

  console.log(`Counts after purge:
- Policies: ${afterPol.count ?? 0}
- Clients (users): ${afterClient.count ?? 0}
- Claims: ${afterClaim.count ?? 0}
- Quotes: ${afterQuotes.count ?? 0}
- Support tickets: ${afterTickets.count ?? 0}`);

  console.log("\nClean state achieved successfully.");
}

clearData().catch((err) => {
  console.error("Error clearing data:", err);
  process.exit(1);
});
