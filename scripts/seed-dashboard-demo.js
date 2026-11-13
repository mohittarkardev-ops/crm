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

const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function seed() {
  console.log('--- 1. Fetching Metadata ---');
  const [typesRes, insRes, staffRes] = await Promise.all([
    db.from('policy_types').select('id, name, code'),
    db.from('insurers').select('id, name'),
    db.from('staff_users').select('id, full_name, email, role')
  ]);

  const policyTypes = typesRes.data || [];
  const insurers = insRes.data || [];
  const staff = staffRes.data || [];

  const typeBike = policyTypes.find((t) => t.code === 'bike') || policyTypes[0];
  const typeCar = policyTypes.find((t) => t.code === 'car') || policyTypes[1];
  const typeHealth = policyTypes.find((t) => t.code === 'health') || policyTypes[2];
  const typeTerm = policyTypes.find((t) => t.code === 'term') || policyTypes[3];
  const typeOther = policyTypes.find((t) => t.code === 'other') || policyTypes[4];

  const getInsurer = (nameFragment) =>
    insurers.find((i) => i.name.toLowerCase().includes(nameFragment.toLowerCase())) || insurers[0];

  const insHdfc = getInsurer('HDFC');
  const insBajaj = getInsurer('Bajaj');
  const insStar = getInsurer('Star') || insurers[1];
  const insIcici = getInsurer('ICICI') || insurers[2];
  const insTata = getInsurer('Tata') || insurers[3];
  const insNewIndia = getInsurer('New India') || insurers[0];

  const agentSagar = staff.find((s) => s.full_name.toUpperCase().includes('SAGAR')) || staff[0];
  const agentRiya = staff.find((s) => s.full_name.toUpperCase().includes('RIYA')) || staff[0];
  const adminStaff = staff.find((s) => s.role === 'admin') || staff[0];

  console.log('--- 2. Purging Existing Policies, Renewals, Claims & Clients ---');
  // Order of deletion to respect foreign keys
  await db.from('policy_documents').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await db.from('agent_incentive_ledger').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await db.from('agent_daily_performance').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await db.from('renewals').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await db.from('claims').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await db.from('quote_requests').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await db.from('policies').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await db.from('family_members').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await db.from('users').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  console.log('--- 3. Creating Demo Clients (Users) ---');
  // 15 realistic Indian clients across diverse states and registration times
  const clientsData = [
    { full_name: 'Rahul Sharma', mobile_number: '+919820011001', email: 'rahul.sharma@example.com', created_at: '2026-11-02T10:00:00Z' },
    { full_name: 'Priya Patel', mobile_number: '+919820011002', email: 'priya.patel@example.com', created_at: '2026-11-04T11:30:00Z' },
    { full_name: 'Amitabh Verma', mobile_number: '+919820011003', email: 'amitabh.verma@example.com', created_at: '2026-11-05T09:15:00Z' },
    { full_name: 'Sneha Kulkarni', mobile_number: '+919820011004', email: 'sneha.k@example.com', created_at: '2026-11-07T14:20:00Z' },
    { full_name: 'Vikram Mehta', mobile_number: '+919820011005', email: 'vikram.mehta@example.com', created_at: '2026-11-08T16:45:00Z' },
    { full_name: 'Ananya Iyer', mobile_number: '+919820011006', email: 'ananya.iyer@example.com', created_at: '2026-11-10T11:00:00Z' },
    { full_name: 'Rajesh Singhal', mobile_number: '+919820011007', email: 'rajesh.singhal@example.com', created_at: '2026-11-11T13:30:00Z' },
    { full_name: 'Sunita Deshmukh', mobile_number: '+919820011008', email: 'sunita.d@example.com', created_at: '2026-11-12T15:10:00Z' },
    { full_name: 'Manish Gupta', mobile_number: '+919820011009', email: 'manish.gupta@example.com', created_at: '2026-11-13T09:00:00Z' },
    { full_name: 'Pooja Reddy', mobile_number: '+919820011010', email: 'pooja.reddy@example.com', created_at: '2026-11-13T10:15:00Z' },
    // Earlier clients for monthly/yearly trend
    { full_name: 'Karan Malhotra', mobile_number: '+919820011011', email: 'karan.m@example.com', created_at: '2026-10-15T10:00:00Z' },
    { full_name: 'Deepika Nair', mobile_number: '+919820011012', email: 'deepika.nair@example.com', created_at: '2026-10-22T14:00:00Z' },
    { full_name: 'Harish Joshi', mobile_number: '+919820011013', email: 'harish.joshi@example.com', created_at: '2026-09-10T09:30:00Z' },
    { full_name: 'Bhavna Shah', mobile_number: '+919820011014', email: 'bhavna.shah@example.com', created_at: '2026-08-18T12:00:00Z' },
    { full_name: 'Sanjay Rawat', mobile_number: '+919820011015', email: 'sanjay.rawat@example.com', created_at: '2025-11-10T10:00:00Z' },
  ];

  const userIns = await db.from('users').insert(clientsData).select('id, full_name, mobile_number');
  if (userIns.error) throw userIns.error;
  const createdUsers = userIns.data;
  console.log(`Created ${createdUsers.length} clients.`);

  const uMap = {};
  createdUsers.forEach((u) => { uMap[u.mobile_number] = u; });

  console.log('--- 4. Creating Demo Policies across 5 Categories ---');
  // Today is 2026-11-13.
  // We construct:
  // - 2W: 4 active renewed, 1 upcoming due in 15 days (2026-11-28)
  // - 4W: 4 active renewed, 1 upcoming due in 22 days (2026-12-05)
  // - Health: 3 active renewed, 1 upcoming due in 37 days (2026-12-20)
  // - Term: 3 active renewed
  // - SME / Commercial: 2 active (Tata Ace, Shopkeeper package)
  // Total Active Renewed: 18 policies across 15 clients!
  const policiesToInsert = [
    // --- 2W POLICIES ---
    {
      user_id: uMap['+919820011001'].id,
      insurer_id: insHdfc.id,
      insurer_name: insHdfc.name,
      type_id: typeBike.id,
      policy_number: 'POL-2W-2026-001',
      vehicle_category: '2W',
      vehicle_reg_no: 'GJ01DM1001',
      vehicle_make: 'Honda',
      vehicle_model: 'Activa 6G',
      idv: 78000,
      premium_amount: 2450,
      start_date: '2026-11-05',
      due_date: '2027-11-04',
      status: 'Active',
      verification_status: 'verified',
      source: 'advisor_added',
      holder_name: 'Rahul Sharma',
      holder_mobile: '+919820011001',
      pin: '380009',
      created_at: '2026-11-05T10:00:00Z'
    },
    {
      user_id: uMap['+919820011002'].id,
      insurer_id: insBajaj.id,
      insurer_name: insBajaj.name,
      type_id: typeBike.id,
      policy_number: 'POL-2W-2026-002',
      vehicle_category: '2W',
      vehicle_reg_no: 'GJ01DM1002',
      vehicle_make: 'Hero',
      vehicle_model: 'Splendor Plus',
      idv: 62000,
      premium_amount: 2150,
      start_date: '2026-11-06',
      due_date: '2027-11-05',
      status: 'Active',
      verification_status: 'verified',
      source: 'advisor_added',
      holder_name: 'Priya Patel',
      holder_mobile: '+919820011002',
      pin: '380015',
      created_at: '2026-11-06T11:00:00Z'
    },
    {
      user_id: uMap['+919820011003'].id,
      insurer_id: insNewIndia.id,
      insurer_name: insNewIndia.name,
      type_id: typeBike.id,
      policy_number: 'POL-2W-2026-003',
      vehicle_category: '2W',
      vehicle_reg_no: 'GJ01DM1003',
      vehicle_make: 'Royal Enfield',
      vehicle_model: 'Classic 350',
      idv: 185000,
      premium_amount: 4200,
      start_date: '2026-11-07',
      due_date: '2027-11-06',
      status: 'Active',
      verification_status: 'verified',
      source: 'advisor_added',
      holder_name: 'Amitabh Verma',
      holder_mobile: '+919820011003',
      pin: '382010',
      created_at: '2026-11-07T12:00:00Z'
    },
    {
      user_id: uMap['+919820011004'].id,
      insurer_id: insTata.id,
      insurer_name: insTata.name,
      type_id: typeBike.id,
      policy_number: 'POL-2W-2026-004',
      vehicle_category: '2W',
      vehicle_reg_no: 'GJ01DM1004',
      vehicle_make: 'Bajaj',
      vehicle_model: 'Pulsar 150',
      idv: 95000,
      premium_amount: 2800,
      start_date: '2026-11-08',
      due_date: '2027-11-07',
      status: 'Active',
      verification_status: 'verified',
      source: 'advisor_added',
      holder_name: 'Sneha Kulkarni',
      holder_mobile: '+919820011004',
      pin: '380054',
      created_at: '2026-11-08T14:00:00Z'
    },
    // Upcoming 2W renewal in next 15 days!
    {
      user_id: uMap['+919820011005'].id,
      insurer_id: insHdfc.id,
      insurer_name: insHdfc.name,
      type_id: typeBike.id,
      policy_number: 'POL-2W-2025-099',
      vehicle_category: '2W',
      vehicle_reg_no: 'GJ01DM1005',
      vehicle_make: 'TVS',
      vehicle_model: 'Jupiter',
      idv: 72000,
      premium_amount: 2300,
      start_date: '2025-11-29',
      due_date: '2026-11-28', // Due in 15 days!
      status: 'Expiring Soon',
      verification_status: 'verified',
      source: 'advisor_added',
      holder_name: 'Vikram Mehta',
      holder_mobile: '+919820011005',
      pin: '380001',
      created_at: '2025-11-29T10:00:00Z'
    },

    // --- 4W POLICIES ---
    {
      user_id: uMap['+919820011006'].id,
      insurer_id: insHdfc.id,
      insurer_name: insHdfc.name,
      type_id: typeCar.id,
      policy_number: 'POL-4W-2026-001',
      vehicle_category: '4W',
      vehicle_reg_no: 'GJ01AB2001',
      vehicle_make: 'Maruti Suzuki',
      vehicle_model: 'Swift Dzire',
      idv: 540000,
      premium_amount: 14200,
      start_date: '2026-11-06',
      due_date: '2027-11-05',
      status: 'Active',
      verification_status: 'verified',
      source: 'advisor_added',
      holder_name: 'Ananya Iyer',
      holder_mobile: '+919820011006',
      pin: '380015',
      created_at: '2026-11-06T15:00:00Z'
    },
    {
      user_id: uMap['+919820011007'].id,
      insurer_id: insTata.id,
      insurer_name: insTata.name,
      type_id: typeCar.id,
      policy_number: 'POL-4W-2026-002',
      vehicle_category: '4W',
      vehicle_reg_no: 'GJ01AB2002',
      vehicle_make: 'Hyundai',
      vehicle_model: 'Creta',
      idv: 1150000,
      premium_amount: 22800,
      start_date: '2026-11-08',
      due_date: '2027-11-07',
      status: 'Active',
      verification_status: 'verified',
      source: 'advisor_added',
      holder_name: 'Rajesh Singhal',
      holder_mobile: '+919820011007',
      pin: '380054',
      created_at: '2026-11-08T16:00:00Z'
    },
    {
      user_id: uMap['+919820011008'].id,
      insurer_id: insBajaj.id,
      insurer_name: insBajaj.name,
      type_id: typeCar.id,
      policy_number: 'POL-4W-2026-003',
      vehicle_category: '4W',
      vehicle_reg_no: 'GJ01AB2003',
      vehicle_make: 'Tata',
      vehicle_model: 'Nexon EV',
      idv: 1450000,
      premium_amount: 26500,
      start_date: '2026-11-10',
      due_date: '2027-11-09',
      status: 'Active',
      verification_status: 'verified',
      source: 'advisor_added',
      holder_name: 'Sunita Deshmukh',
      holder_mobile: '+919820011008',
      pin: '380009',
      created_at: '2026-11-10T12:00:00Z'
    },
    {
      user_id: uMap['+919820011009'].id,
      insurer_id: insIcici.id,
      insurer_name: insIcici.name,
      type_id: typeCar.id,
      policy_number: 'POL-4W-2026-004',
      vehicle_category: '4W',
      vehicle_reg_no: 'GJ01AB2004',
      vehicle_make: 'Kia',
      vehicle_model: 'Seltos',
      idv: 1280000,
      premium_amount: 24200,
      start_date: '2026-11-11',
      due_date: '2027-11-10',
      status: 'Active',
      verification_status: 'verified',
      source: 'advisor_added',
      holder_name: 'Manish Gupta',
      holder_mobile: '+919820011009',
      pin: '380052',
      created_at: '2026-11-11T14:30:00Z'
    },
    // Upcoming 4W renewal in next 22 days!
    {
      user_id: uMap['+919820011010'].id,
      insurer_id: insTata.id,
      insurer_name: insTata.name,
      type_id: typeCar.id,
      policy_number: 'POL-4W-2025-088',
      vehicle_category: '4W',
      vehicle_reg_no: 'GJ01AB2005',
      vehicle_make: 'Mahindra',
      vehicle_model: 'Thar',
      idv: 1350000,
      premium_amount: 25000,
      start_date: '2025-12-06',
      due_date: '2026-12-05', // Due in 22 days!
      status: 'Expiring Soon',
      verification_status: 'verified',
      source: 'advisor_added',
      holder_name: 'Pooja Reddy',
      holder_mobile: '+919820011010',
      pin: '380015',
      created_at: '2025-12-06T10:00:00Z'
    },

    // --- HEALTH POLICIES ---
    {
      user_id: uMap['+919820011011'].id,
      insurer_id: insStar.id,
      insurer_name: insStar.name,
      type_id: typeHealth.id,
      policy_number: 'POL-HLTH-2026-001',
      vehicle_category: null,
      idv: null,
      premium_amount: 21800,
      start_date: '2026-11-04',
      due_date: '2027-11-03',
      status: 'Active',
      verification_status: 'verified',
      source: 'advisor_added',
      holder_name: 'Karan Malhotra',
      holder_mobile: '+919820011011',
      pin: '380009',
      created_at: '2026-11-04T10:00:00Z'
    },
    {
      user_id: uMap['+919820011012'].id,
      insurer_id: insHdfc.id,
      insurer_name: insHdfc.name,
      type_id: typeHealth.id,
      policy_number: 'POL-HLTH-2026-002',
      vehicle_category: null,
      idv: null,
      premium_amount: 28400,
      start_date: '2026-11-07',
      due_date: '2027-11-06',
      status: 'Active',
      verification_status: 'verified',
      source: 'advisor_added',
      holder_name: 'Deepika Nair',
      holder_mobile: '+919820011012',
      pin: '380054',
      created_at: '2026-11-07T11:00:00Z'
    },
    {
      user_id: uMap['+919820011013'].id,
      insurer_id: insBajaj.id,
      insurer_name: insBajaj.name,
      type_id: typeHealth.id,
      policy_number: 'POL-HLTH-2026-003',
      vehicle_category: null,
      idv: null,
      premium_amount: 18500,
      start_date: '2026-11-10',
      due_date: '2027-11-09',
      status: 'Active',
      verification_status: 'verified',
      source: 'advisor_added',
      holder_name: 'Harish Joshi',
      holder_mobile: '+919820011013',
      pin: '380015',
      created_at: '2026-11-10T15:00:00Z'
    },
    // Upcoming Health renewal in next 37 days!
    {
      user_id: uMap['+919820011014'].id,
      insurer_id: insStar.id,
      insurer_name: insStar.name,
      type_id: typeHealth.id,
      policy_number: 'POL-HLTH-2025-077',
      vehicle_category: null,
      idv: null,
      premium_amount: 24000,
      start_date: '2025-12-21',
      due_date: '2026-12-20', // Due in 37 days!
      status: 'Expiring Soon',
      verification_status: 'verified',
      source: 'advisor_added',
      holder_name: 'Bhavna Shah',
      holder_mobile: '+919820011014',
      pin: '380001',
      created_at: '2025-12-21T10:00:00Z'
    },

    // --- TERM LIFE POLICIES ---
    {
      user_id: uMap['+919820011001'].id,
      insurer_id: insIcici.id,
      insurer_name: insIcici.name,
      type_id: typeTerm.id,
      policy_number: 'POL-TERM-2026-001',
      vehicle_category: null,
      idv: null,
      premium_amount: 19500,
      start_date: '2026-11-05',
      due_date: '2027-11-04',
      status: 'Active',
      verification_status: 'verified',
      source: 'advisor_added',
      holder_name: 'Rahul Sharma',
      holder_mobile: '+919820011001',
      pin: '380009',
      created_at: '2026-11-05T10:30:00Z'
    },
    {
      user_id: uMap['+919820011003'].id,
      insurer_id: insHdfc.id,
      insurer_name: insHdfc.name,
      type_id: typeTerm.id,
      policy_number: 'POL-TERM-2026-002',
      vehicle_category: null,
      idv: null,
      premium_amount: 22000,
      start_date: '2026-11-07',
      due_date: '2027-11-06',
      status: 'Active',
      verification_status: 'verified',
      source: 'advisor_added',
      holder_name: 'Amitabh Verma',
      holder_mobile: '+919820011003',
      pin: '382010',
      created_at: '2026-11-07T14:00:00Z'
    },
    {
      user_id: uMap['+919820011007'].id,
      insurer_id: insTata.id,
      insurer_name: insTata.name,
      type_id: typeTerm.id,
      policy_number: 'POL-TERM-2026-003',
      vehicle_category: null,
      idv: null,
      premium_amount: 16800,
      start_date: '2026-11-09',
      due_date: '2027-11-08',
      status: 'Active',
      verification_status: 'verified',
      source: 'advisor_added',
      holder_name: 'Rajesh Singhal',
      holder_mobile: '+919820011007',
      pin: '380054',
      created_at: '2026-11-09T16:00:00Z'
    },

    // --- SME & COMMERCIAL (CV / OTHER) POLICIES ---
    {
      user_id: uMap['+919820011005'].id,
      insurer_id: insTata.id,
      insurer_name: insTata.name,
      type_id: typeOther.id,
      policy_number: 'POL-CV-2026-001',
      vehicle_category: 'CV',
      vehicle_reg_no: 'GJ01CW3001',
      vehicle_make: 'Tata',
      vehicle_model: 'Ace Gold Diesel',
      idv: 380000,
      premium_amount: 15500,
      start_date: '2026-11-08',
      due_date: '2027-11-07',
      status: 'Active',
      verification_status: 'verified',
      source: 'advisor_added',
      holder_name: 'Vikram Mehta',
      holder_mobile: '+919820011005',
      pin: '380001',
      created_at: '2026-11-08T11:00:00Z'
    },
    {
      user_id: uMap['+919820011009'].id,
      insurer_id: insNewIndia.id,
      insurer_name: insNewIndia.name,
      type_id: typeOther.id,
      policy_number: 'POL-SME-2026-002',
      vehicle_category: null,
      idv: null,
      premium_amount: 32000,
      start_date: '2026-11-11',
      due_date: '2027-11-10',
      status: 'Active',
      verification_status: 'verified',
      source: 'advisor_added',
      holder_name: 'Manish Gupta',
      holder_mobile: '+919820011009',
      pin: '380052',
      created_at: '2026-11-11T12:00:00Z'
    },

    // --- CLOSED BASE POLICIES IN PREVIOUS YEAR (Nov 2025 Base for Retention Calculation) ---
    // 10 policies closed/due in Nov 2025 to create the closedBaseCount = 10!
    ...Array.from({ length: 10 }).map((_, idx) => ({
      user_id: uMap['+919820011015'].id,
      insurer_id: insHdfc.id,
      insurer_name: insHdfc.name,
      type_id: idx % 2 === 0 ? typeBike.id : typeCar.id,
      policy_number: `POL-BASE-2025-${String(idx + 1).padStart(3, '0')}`,
      vehicle_category: idx % 2 === 0 ? '2W' : '4W',
      vehicle_reg_no: `GJ01BASE${String(idx + 1).padStart(2, '0')}`,
      idv: 100000,
      premium_amount: 5000,
      start_date: '2024-11-15',
      due_date: '2025-11-14', // Due in Nov 2025!
      status: 'Expired',
      verification_status: 'verified',
      source: 'advisor_added',
      holder_name: 'Sanjay Rawat',
      holder_mobile: '+919820011015',
      pin: '380001',
      created_at: '2024-11-15T10:00:00Z'
    }))
  ];

  const polIns = await db.from('policies').insert(policiesToInsert).select('id, policy_number, vehicle_category, due_date, user_id');
  if (polIns.error) throw polIns.error;
  const createdPolicies = polIns.data;
  console.log(`Created ${createdPolicies.length} policies.`);

  const pMap = {};
  createdPolicies.forEach((p) => { pMap[p.policy_number] = p; });

  console.log('--- 5. Creating Renewals (Setting Up 80.0% Monthly & 84.0% Yearly Retention) ---');
  // Monthly Retention:
  // - Nov 2025 Closed Base: 10 policies (POL-BASE-2025-001..010 due in 2025-11)
  // - Nov 2026 Renewed: exactly 8 policies renewed this month!
  // -> Rate = 8 / 10 = 80.0%!
  const renewalsToInsert = [
    // 8 renewals in Nov 2026:
    {
      policy_id: pMap['POL-2W-2026-001'].id,
      status: 'renewed',
      renewal_date: '2026-11-05',
      previous_due_date: '2026-11-05',
      new_due_date: '2027-11-04',
      previous_policy_number: 'POL-2W-2025-001',
      new_policy_number: 'POL-2W-2026-001',
      previous_insurer_name: 'HDFC ERGO',
      new_insurer_name: 'HDFC ERGO',
      premium_amount: 2450,
      created_at: '2026-11-05T10:00:00Z'
    },
    {
      policy_id: pMap['POL-2W-2026-002'].id,
      status: 'renewed',
      renewal_date: '2026-11-06',
      previous_due_date: '2026-11-06',
      new_due_date: '2027-11-05',
      previous_policy_number: 'POL-2W-2025-002',
      new_policy_number: 'POL-2W-2026-002',
      previous_insurer_name: 'Bajaj Allianz',
      new_insurer_name: 'Bajaj Allianz',
      premium_amount: 2150,
      created_at: '2026-11-06T11:00:00Z'
    },
    {
      policy_id: pMap['POL-2W-2026-003'].id,
      status: 'renewed',
      renewal_date: '2026-11-07',
      previous_due_date: '2026-11-07',
      new_due_date: '2027-11-06',
      previous_policy_number: 'POL-2W-2025-003',
      new_policy_number: 'POL-2W-2026-003',
      previous_insurer_name: 'New India',
      new_insurer_name: 'New India',
      premium_amount: 4200,
      created_at: '2026-11-07T12:00:00Z'
    },
    {
      policy_id: pMap['POL-2W-2026-004'].id,
      status: 'renewed',
      renewal_date: '2026-11-08',
      previous_due_date: '2026-11-08',
      new_due_date: '2027-11-07',
      previous_policy_number: 'POL-2W-2025-004',
      new_policy_number: 'POL-2W-2026-004',
      previous_insurer_name: 'Tata AIG',
      new_insurer_name: 'Tata AIG',
      premium_amount: 2800,
      created_at: '2026-11-08T14:00:00Z'
    },
    {
      policy_id: pMap['POL-4W-2026-001'].id,
      status: 'renewed',
      renewal_date: '2026-11-06',
      previous_due_date: '2026-11-06',
      new_due_date: '2027-11-05',
      previous_policy_number: 'POL-4W-2025-001',
      new_policy_number: 'POL-4W-2026-001',
      previous_insurer_name: 'HDFC ERGO',
      new_insurer_name: 'HDFC ERGO',
      premium_amount: 14200,
      created_at: '2026-11-06T15:00:00Z'
    },
    {
      policy_id: pMap['POL-4W-2026-002'].id,
      status: 'renewed',
      renewal_date: '2026-11-08',
      previous_due_date: '2026-11-08',
      new_due_date: '2027-11-07',
      previous_policy_number: 'POL-4W-2025-002',
      new_policy_number: 'POL-4W-2026-002',
      previous_insurer_name: 'Tata AIG',
      new_insurer_name: 'Tata AIG',
      premium_amount: 22800,
      created_at: '2026-11-08T16:00:00Z'
    },
    {
      policy_id: pMap['POL-HLTH-2026-001'].id,
      status: 'renewed',
      renewal_date: '2026-11-04',
      previous_due_date: '2026-11-04',
      new_due_date: '2027-11-03',
      previous_policy_number: 'POL-HLTH-2025-001',
      new_policy_number: 'POL-HLTH-2026-001',
      previous_insurer_name: 'Star Health',
      new_insurer_name: 'Star Health',
      premium_amount: 21800,
      created_at: '2026-11-04T10:00:00Z'
    },
    {
      policy_id: pMap['POL-HLTH-2026-002'].id,
      status: 'renewed',
      renewal_date: '2026-11-07',
      previous_due_date: '2026-11-07',
      new_due_date: '2027-11-06',
      previous_policy_number: 'POL-HLTH-2025-002',
      new_policy_number: 'POL-HLTH-2026-002',
      previous_insurer_name: 'HDFC ERGO',
      new_insurer_name: 'HDFC ERGO',
      premium_amount: 28400,
      created_at: '2026-11-07T11:00:00Z'
    },

    // 10 lapsed renewals for Nov 2025 Base (so closedInSameMonthPrevYear = 10, total 2025 base = 25)
    ...Array.from({ length: 10 }).map((_, idx) => ({
      policy_id: pMap[`POL-BASE-2025-${String(idx + 1).padStart(3, '0')}`].id,
      status: 'lapsed',
      renewal_date: '2025-11-15',
      previous_due_date: '2025-11-15',
      new_due_date: '2026-11-14',
      previous_policy_number: `POL-BASE-2024-${String(idx + 1).padStart(3, '0')}`,
      new_policy_number: `POL-BASE-2025-${String(idx + 1).padStart(3, '0')}`,
      previous_insurer_name: 'HDFC ERGO',
      new_insurer_name: 'HDFC ERGO',
      premium_amount: 5000,
      created_at: '2025-11-15T10:00:00Z'
    })),

    // Additional 13 renewals throughout 2026 (Jan to Oct) to reach 21 renewed in 2026!
    ...Array.from({ length: 13 }).map((_, idx) => ({
      policy_id: pMap['POL-4W-2026-003'].id,
      status: 'renewed',
      renewal_date: `2026-0${(idx % 9) + 1}-15`,
      previous_due_date: `2026-0${(idx % 9) + 1}-15`,
      new_due_date: `2027-0${(idx % 9) + 1}-14`,
      previous_policy_number: `POL-HIST-2025-${idx + 1}`,
      new_policy_number: `POL-HIST-2026-${idx + 1}`,
      previous_insurer_name: 'HDFC ERGO',
      new_insurer_name: 'HDFC ERGO',
      premium_amount: 12000,
      created_at: `2026-0${(idx % 9) + 1}-15T10:00:00Z`
    })),

    // 15 additional lapsed entries in 2025 to reach 25 closedBaseCount in 2025!
    // -> Yearly rate = 21 / 25 = 84.0%!
    ...Array.from({ length: 15 }).map((_, idx) => ({
      policy_id: pMap['POL-BASE-2025-001'].id,
      status: 'lapsed',
      renewal_date: `2025-0${(idx % 9) + 1}-20`,
      previous_due_date: `2025-0${(idx % 9) + 1}-20`,
      new_due_date: `2026-0${(idx % 9) + 1}-19`,
      previous_policy_number: `POL-OLD-2024-${idx + 1}`,
      new_policy_number: `POL-OLD-2025-${idx + 1}`,
      previous_insurer_name: 'Bajaj Allianz',
      new_insurer_name: 'Bajaj Allianz',
      premium_amount: 8000,
      created_at: `2025-0${(idx % 9) + 1}-20T10:00:00Z`
    }))
  ];

  const renIns = await db.from('renewals').insert(renewalsToInsert);
  if (renIns.error) throw renIns.error;
  console.log(`Inserted ${renewalsToInsert.length} renewal history records.`);

  console.log('--- 6. Creating Demo Claims (Pending & Approved for /claim & Dashboard) ---');
  const claimsToInsert = [
    // 2 Pending Claims to test the Agency Claims Card & Pending Badge
    {
      staff_id: agentSagar.id,
      employee_name: agentSagar.full_name,
      vehicle_reg_no: 'GJ01DM9991',
      vehicle_category: '2W',
      vehicle_make: 'Honda',
      vehicle_model: 'Activa 125',
      idv: 82000,
      customer_name: 'Rohan Mehra',
      customer_mobile: '+919820099991',
      customer_pincode: '380009',
      customer_state: 'Gujarat',
      policy_number: '231100/31/2026/901',
      insurer_name: 'HDFC ERGO',
      due_date: '2027-11-12',
      payment_date: '2026-11-12',
      payment_mode: 'Online',
      payment_amount: 2500,
      status: 'pending',
      vehicle_validation_status: 'VALID',
      vehicle_manual_review_required: false,
      created_at: '2026-11-12T11:00:00Z'
    },
    {
      staff_id: agentRiya.id,
      employee_name: agentRiya.full_name,
      vehicle_reg_no: 'GJ01AB9992',
      vehicle_category: '4W',
      vehicle_make: 'Maruti Suzuki',
      vehicle_model: 'Brezza',
      idv: 950000,
      customer_name: 'Meena Kapoor',
      customer_mobile: '+919820099992',
      customer_pincode: '380015',
      customer_state: 'Gujarat',
      policy_number: '231100/31/2026/902',
      insurer_name: 'Tata AIG',
      due_date: '2027-11-13',
      payment_date: '2026-11-13',
      payment_mode: 'Online',
      payment_amount: 18500,
      status: 'pending',
      vehicle_validation_status: 'VALID',
      vehicle_manual_review_required: false,
      created_at: '2026-11-13T09:30:00Z'
    },
    // 4 Approved Claims linked to policies
    {
      staff_id: agentSagar.id,
      employee_name: agentSagar.full_name,
      policy_id: pMap['POL-2W-2026-001'].id,
      vehicle_reg_no: 'GJ01DM1001',
      vehicle_category: '2W',
      vehicle_make: 'Honda',
      vehicle_model: 'Activa 6G',
      idv: 78000,
      customer_name: 'Rahul Sharma',
      customer_mobile: '+919820011001',
      customer_pincode: '380009',
      customer_state: 'Gujarat',
      policy_number: 'POL-2W-2026-001',
      insurer_name: 'HDFC ERGO',
      due_date: '2027-11-04',
      payment_date: '2026-11-05',
      payment_mode: 'Online',
      payment_amount: 2450,
      status: 'approved',
      vehicle_validation_status: 'VALID',
      vehicle_manual_review_required: false,
      reviewed_by: adminStaff.id,
      reviewed_at: '2026-11-05T12:00:00Z',
      created_at: '2026-11-05T10:00:00Z'
    },
    {
      staff_id: agentSagar.id,
      employee_name: agentSagar.full_name,
      policy_id: pMap['POL-2W-2026-002'].id,
      vehicle_reg_no: 'GJ01DM1002',
      vehicle_category: '2W',
      vehicle_make: 'Hero',
      vehicle_model: 'Splendor Plus',
      idv: 62000,
      customer_name: 'Priya Patel',
      customer_mobile: '+919820011002',
      customer_pincode: '380015',
      customer_state: 'Gujarat',
      policy_number: 'POL-2W-2026-002',
      insurer_name: 'Bajaj Allianz',
      due_date: '2027-11-05',
      payment_date: '2026-11-06',
      payment_mode: 'Online',
      payment_amount: 2150,
      status: 'approved',
      vehicle_validation_status: 'VALID',
      vehicle_manual_review_required: false,
      reviewed_by: adminStaff.id,
      reviewed_at: '2026-11-06T13:00:00Z',
      created_at: '2026-11-06T11:00:00Z'
    },
    {
      staff_id: agentRiya.id,
      employee_name: agentRiya.full_name,
      policy_id: pMap['POL-4W-2026-001'].id,
      vehicle_reg_no: 'GJ01AB2001',
      vehicle_category: '4W',
      vehicle_make: 'Maruti Suzuki',
      vehicle_model: 'Swift Dzire',
      idv: 540000,
      customer_name: 'Ananya Iyer',
      customer_mobile: '+919820011006',
      customer_pincode: '380015',
      customer_state: 'Gujarat',
      policy_number: 'POL-4W-2026-001',
      insurer_name: 'HDFC ERGO',
      due_date: '2027-11-05',
      payment_date: '2026-11-06',
      payment_mode: 'Online',
      payment_amount: 14200,
      status: 'approved',
      vehicle_validation_status: 'VALID',
      vehicle_manual_review_required: false,
      reviewed_by: adminStaff.id,
      reviewed_at: '2026-11-06T16:00:00Z',
      created_at: '2026-11-06T15:00:00Z'
    },
    {
      staff_id: agentRiya.id,
      employee_name: agentRiya.full_name,
      policy_id: pMap['POL-4W-2026-002'].id,
      vehicle_reg_no: 'GJ01AB2002',
      vehicle_category: '4W',
      vehicle_make: 'Hyundai',
      vehicle_model: 'Creta',
      idv: 1150000,
      customer_name: 'Rajesh Singhal',
      customer_mobile: '+919820011007',
      customer_pincode: '380054',
      customer_state: 'Gujarat',
      policy_number: 'POL-4W-2026-002',
      insurer_name: 'Tata AIG',
      due_date: '2027-11-07',
      payment_date: '2026-11-08',
      payment_mode: 'Online',
      payment_amount: 22800,
      status: 'approved',
      vehicle_validation_status: 'VALID',
      vehicle_manual_review_required: false,
      reviewed_by: adminStaff.id,
      reviewed_at: '2026-11-08T17:00:00Z',
      created_at: '2026-11-08T16:00:00Z'
    }
  ];

  const clmIns = await db.from('claims').insert(claimsToInsert);
  if (clmIns.error) throw clmIns.error;
  console.log(`Created ${claimsToInsert.length} claims (2 pending, 4 approved).`);

  console.log('--- SEED COMPLETED SUCCESSFULLY! ---');
}

seed().catch((err) => {
  console.error('Seed Error:', err);
  process.exit(1);
});
