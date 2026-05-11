import { Router } from "express";
import { Client } from "pg";

const router = Router();

async function execSQL(sql: string): Promise<void> {
  const url = process.env.SUPABASE_URL ?? "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  const ref = url.replace("https://", "").split(".")[0];

  const client = new Client({
    host: "aws-0-us-east-1.pooler.supabase.com",
    port: 6543,
    database: "postgres",
    user: `postgres.${ref}`,
    password: key,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15000,
  });

  await client.connect();
  try {
    await client.query(sql);
  } finally {
    await client.end();
  }
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

export default router;
