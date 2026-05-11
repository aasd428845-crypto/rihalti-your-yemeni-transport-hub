import { createClient } from '../node_modules/@supabase/supabase-js/dist/module/index.js';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(url, key);

// نفذ SQL عبر raw fetch لأن Supabase REST API لا يدعم DDL مباشرة
// نستخدم endpoint خاص بالـ SQL عبر service_role
async function execSQL(sql, label) {
  const resp = await fetch(`${url}/rest/v1/rpc/exec_ddl`, {
    method: 'POST',
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ sql })
  });
  const text = await resp.text();
  if (resp.ok || text.includes('already exists')) {
    console.log(`✓ ${label}`);
    return true;
  } else {
    console.log(`✗ ${label}: ${text.substring(0, 200)}`);
    return false;
  }
}

// نحاول عبر pg connection مباشر
async function runViaFetch(sql, label) {
  // Supabase pg REST - نستخدم endpoint /sql  
  const resp = await fetch(`${url}/pg/query`, {
    method: 'POST',
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query: sql })
  });
  const text = await resp.text();
  console.log(`${label}: status=${resp.status} result=${text.substring(0, 150)}`);
  return resp.status < 300;
}

console.log('Testing Supabase connection...');

// اختبار بسيط
const { data, error } = await supabase.from('profiles').select('id').limit(1);
if (error) {
  console.error('Connection failed:', error.message);
  process.exit(1);
}
console.log('✓ Connected to Supabase');
console.log('✓ profiles table accessible');

// فحص الجداول الناقصة
const tables = ['request_messages', 'phone_otps'];
for (const t of tables) {
  const { error: e } = await supabase.from(t).select('id').limit(1);
  if (e) {
    console.log(`✗ ${t}: MISSING - ${e.message}`);
  } else {
    console.log(`✓ ${t}: exists`);
  }
}

// فحص الأعمدة الناقصة في profiles
const { data: profileCols, error: colErr } = await supabase.from('profiles').select('phone,city,vehicle_color').limit(1);
if (colErr) {
  console.log(`✗ profiles missing columns: ${colErr.message}`);
} else {
  console.log('✓ profiles has phone, city, vehicle_color columns');
}

console.log('\n--- Summary ---');
console.log('Run the SQL below in Supabase Dashboard → SQL Editor:\n');

const missingSql = `
-- ① إنشاء جدول request_messages (ناقص)
CREATE TABLE IF NOT EXISTS public.request_messages (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id   UUID NOT NULL,
  sender_id    UUID NOT NULL,
  sender_role  TEXT NOT NULL,
  message      TEXT NOT NULL,
  is_blocked   BOOLEAN DEFAULT false,
  block_reason TEXT,
  read_at      TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ② إنشاء جدول phone_otps (ناقص)
CREATE TABLE IF NOT EXISTS public.phone_otps (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone      TEXT NOT NULL,
  otp        TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ③ إضافة أعمدة ناقصة في profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS vehicle_color TEXT;

-- ④ نسخ phone_number إلى phone (للتوافق)
UPDATE public.profiles SET phone = phone_number WHERE phone IS NULL AND phone_number IS NOT NULL;
`;

console.log(missingSql);
