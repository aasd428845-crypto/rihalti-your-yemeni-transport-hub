import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://hhqhoqwpebnmfuhwhllw.supabase.co";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

function adminClient() {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function randomOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export default async function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { phone_number } = req.body ?? {};

  if (!phone_number || typeof phone_number !== "string") {
    return res.status(400).json({ error: "رقم الهاتف مطلوب" });
  }

  if (!SERVICE_ROLE_KEY) {
    return res.status(503).json({
      error: "خدمة التحقق غير مهيأة. يرجى إضافة SUPABASE_SERVICE_ROLE_KEY في إعدادات Vercel.",
    });
  }

  const otp = randomOtp();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  const supabase = adminClient();

  await supabase.from("verification_codes").delete().eq("phone", phone_number);

  const { error: insertErr } = await supabase.from("verification_codes").insert({
    phone: phone_number,
    code: otp,
    expires_at: expiresAt,
  });

  if (insertErr) {
    return res.status(500).json({ error: "فشل إرسال رمز التحقق. حاول مرة أخرى." });
  }

  const isDev = process.env.NODE_ENV !== "production";

  return res.status(200).json({
    success: true,
    ...(isDev ? { dev_code: otp, dev_note: "DEV ONLY" } : {}),
  });
}
