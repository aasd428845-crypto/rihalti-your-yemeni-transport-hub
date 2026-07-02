import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://hhqhoqwpebnmfuhwhllw.supabase.co";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const ALLOWED_ORIGIN = process.env.APP_ORIGIN ?? "https://wasal-app.vercel.app";

function adminClient() {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function randomOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export default async function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
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

  const supabase = adminClient();

  // ── Rate limiting (requires otp_send_log table — degrades gracefully if missing) ──
  const clientIp =
    (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
    req.socket?.remoteAddress ||
    "unknown";

  const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();

  try {
    // Per-phone: max 3 sends per 15 minutes
    const { count: phoneCount } = await supabase
      .from("otp_send_log")
      .select("id", { count: "exact", head: true })
      .eq("phone_number", phone_number)
      .gte("created_at", fifteenMinAgo);

    if ((phoneCount ?? 0) >= 3) {
      return res
        .status(429)
        .json({ error: "لقد تجاوزت عدد المحاولات المسموح. حاول بعد 15 دقيقة." });
    }

    // Per-IP: max 10 sends per 15 minutes (catches multi-phone abuse)
    const { count: ipCount } = await supabase
      .from("otp_send_log")
      .select("id", { count: "exact", head: true })
      .eq("ip", clientIp)
      .gte("created_at", fifteenMinAgo);

    if ((ipCount ?? 0) >= 10) {
      return res
        .status(429)
        .json({ error: "تم إيقاف الطلبات مؤقتاً من هذا الجهاز. حاول لاحقاً." });
    }
  } catch {
    // otp_send_log table may not exist yet — allow the request through
  }

  // ── Generate and store OTP ─────────────────────────────────────────────────
  const otp = randomOtp();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  await supabase.from("verification_codes").delete().eq("phone", phone_number);

  const { error: insertErr } = await supabase.from("verification_codes").insert({
    phone: phone_number,
    code: otp,
    expires_at: expiresAt,
  });

  if (insertErr) {
    return res.status(500).json({ error: "فشل إرسال رمز التحقق. حاول مرة أخرى." });
  }

  // Log this send for rate-limit tracking (non-critical — don't fail on error)
  try {
    await supabase.from("otp_send_log").insert({ phone_number, ip: clientIp });
  } catch {
    // silent — don't block the user if the log table is missing
  }

  const isDev = process.env.NODE_ENV !== "production";

  return res.status(200).json({
    success: true,
    ...(isDev ? { dev_code: otp, dev_note: "DEV ONLY — رمز مرئي في وضع التطوير فقط" } : {}),
  });
}
