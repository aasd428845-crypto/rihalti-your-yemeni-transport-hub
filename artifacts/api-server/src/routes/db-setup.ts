import { Router } from "express";
import { Client } from "pg";

const router = Router();

async function execSQL(sql: string): Promise<void> {
  const url = process.env.SUPABASE_URL ?? "";
  const dbPass = process.env.SUPABASE_DB_PASSWORD ?? "";
  const ref = url.replace("https://", "").split(".")[0];

  // جرب pooler أولاً ثم direct
  const configs = [
    { host: `aws-0-us-east-1.pooler.supabase.com`, port: 6543, user: `postgres.${ref}` },
    { host: `aws-0-us-east-1.pooler.supabase.com`, port: 5432, user: `postgres.${ref}` },
    { host: `${ref}.supabase.co`, port: 5432, user: "postgres" },
  ];

  let lastErr: Error | null = null;
  for (const cfg of configs) {
    const client = new Client({
      host: cfg.host,
      port: cfg.port,
      database: "postgres",
      user: cfg.user,
      password: dbPass,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 10000,
    });
    try {
      await client.connect();
      await client.query(sql);
      await client.end();
      return;
    } catch (e: any) {
      lastErr = e;
      try { await client.end(); } catch (_) {}
    }
  }
  throw lastErr ?? new Error("All connection attempts failed");
}

router.post("/db-setup", async (req, res) => {
  const secret = req.headers["x-setup-secret"];
  if (secret !== "wasal-setup-2026") {
    return res.status(403).json({ error: "forbidden" });
  }

  const statements: Array<{ name: string; sql: string }> = [
    {
      name: "create_request_messages",
      sql: `CREATE TABLE IF NOT EXISTS public.request_messages (
        id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        request_id   UUID NOT NULL,
        sender_id    UUID NOT NULL,
        sender_role  TEXT NOT NULL,
        message      TEXT NOT NULL,
        is_blocked   BOOLEAN DEFAULT false,
        block_reason TEXT,
        read_at      TIMESTAMPTZ,
        created_at   TIMESTAMPTZ DEFAULT NOW()
      )`,
    },
    {
      name: "create_phone_otps",
      sql: `CREATE TABLE IF NOT EXISTS public.phone_otps (
        id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        phone      TEXT NOT NULL,
        otp        TEXT NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`,
    },
    {
      name: "add_profiles_phone",
      sql: `ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT`,
    },
    {
      name: "add_profiles_city",
      sql: `ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS city TEXT`,
    },
    {
      name: "add_profiles_vehicle_color",
      sql: `ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS vehicle_color TEXT`,
    },
    {
      name: "sync_phone",
      sql: `UPDATE public.profiles SET phone = phone_number WHERE phone IS NULL AND phone_number IS NOT NULL`,
    },
  ];

  const results: Record<string, string> = {};

  for (const stmt of statements) {
    try {
      await execSQL(stmt.sql);
      results[stmt.name] = "ok";
    } catch (e: any) {
      results[stmt.name] = "error: " + e.message;
    }
  }

  return res.json({ results });
});

// endpoint للتحقق من الاتصال
router.get("/db-setup/check", async (req, res) => {
  const secret = req.headers["x-setup-secret"];
  if (secret !== "wasal-setup-2026") {
    return res.status(403).json({ error: "forbidden" });
  }

  const url = process.env.SUPABASE_URL ?? "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

  // فحص الجداول عبر REST API
  const tables = ["request_messages", "phone_otps"];
  const missing: string[] = [];
  const existing: string[] = [];

  for (const t of tables) {
    const r = await fetch(`${url}/rest/v1/${t}?limit=0`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    if (r.status === 200) existing.push(t);
    else missing.push(t);
  }

  // فحص أعمدة profiles
  const colCheck = await fetch(
    `${url}/rest/v1/profiles?select=phone,city,vehicle_color&limit=0`,
    { headers: { apikey: key, Authorization: `Bearer ${key}` } }
  );
  const colsOk = colCheck.status === 200;

  return res.json({ existing, missing, profiles_cols_ok: colsOk });
});

export default router;
