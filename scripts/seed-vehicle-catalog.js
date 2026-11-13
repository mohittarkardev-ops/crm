/**
 * Populates `vehicle_catalog` in Supabase with standard 2W, 4W, and CW models.
 * Run with: node scripts/seed-vehicle-catalog.js
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Parse .env.local
const envPath = path.resolve(__dirname, '..', '.env.local');
if (!fs.existsSync(envPath)) {
  console.error('.env.local file not found at:', envPath);
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
for (const line of envContent.split(/\r?\n/)) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m) env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
}

if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// Load catalog from lib/vehicle-catalog.ts (parsing JSON-like structure)
async function main() {
  console.log('Checking vehicle_catalog in Supabase...');

  // Test table existence
  const { error: testErr } = await supabase.from('vehicle_catalog').select('id').limit(1);
  if (testErr && testErr.code === 'PGRST205') {
    console.log('Note: vehicle_catalog table is not yet created in Supabase SQL schema.');
    console.log('Please execute the migration supabase/migrations/0024_vehicle_catalog.sql in the Supabase SQL editor.');
    console.log('The CRM application already uses the comprehensive embedded vehicle catalog in the meantime seamlessly.');
    return;
  }

  console.log('Table found! Preparing to seed vehicle records...');
  // Read embedded dataset from vehicle-catalog.ts
  const catalogFilePath = path.resolve(__dirname, '..', 'lib', 'vehicle-catalog.ts');
  const code = fs.readFileSync(catalogFilePath, 'utf8');

  // Simple regex to extract catalog entries
  const regex = /\{ category: "([^"]+)", make: "([^"]+)", model: "([^"]+)"(?:, bodyType: "([^"]+)")?(?:, isPopular: (true|false))? \}/g;
  let match;
  const entries = [];
  while ((match = regex.exec(code)) !== null) {
    entries.push({
      category: match[1],
      make: match[2],
      model: match[3],
      body_type: match[4] || null,
      is_popular: match[5] === 'true',
    });
  }

  console.log(`Parsed ${entries.length} vehicle models from catalog.`);

  // Insert in batches of 50
  const BATCH_SIZE = 50;
  let inserted = 0;
  for (let i = 0; i < entries.length; i += BATCH_SIZE) {
    const chunk = entries.slice(i, i + BATCH_SIZE);
    const { error } = await supabase
      .from('vehicle_catalog')
      .upsert(chunk, { onConflict: 'category,make,model' });
    if (error) {
      console.error(`Error in batch ${i / BATCH_SIZE}:`, error);
    } else {
      inserted += chunk.length;
    }
  }

  console.log(`Successfully synced ${inserted} vehicle models into vehicle_catalog!`);
}

main().catch(console.error);
