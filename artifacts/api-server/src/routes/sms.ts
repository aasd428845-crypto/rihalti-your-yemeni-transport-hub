import { Router } from "express";
import { createClient } from "@supabase/supabase-js";

const router = Router();

const SUPABASE_URL = process.env.SUPABASE_URL ?? "https://hhqhoqwpebnmfuhwhllw.supabase.co";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

function adminClient() {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function phoneToEmail(phone: string) {
  return `phone.${phone.replace(/\D/g, "")}@wasal-auth.local`;
}

function randomOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// ─── POST /api/sms/send ────────────────────────────────────────────────────────
router.post("/sms/send", async (req, res) => {
  const { phone_number } = req.body ?? {};

  if (!phone_number || typeof phone_number !== "string") {
    return res.status(400).json({ error: "رقم الهاتف مطلوب" });
  }

  if (!SERVICE_ROLE_KEY) {
    return res.status(503).json({
      error: "خدمة التحقق غير مهيأة. يرجى إضافة SUPABASE_SERVICE_ROLE_KEY في إعدادات المشروع.",
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

    // Per-IP: max 10 sends per 15 minutes
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

  // Delete any previous code for this phone then insert a fresh one
  await supabase.from("verification_codes").delete().eq("phone", phone_number);

  const { error: insertErr } = await supabase.from("verification_codes").insert({
    phone: phone_number,
    code: otp,
    expires_at: expiresAt,
  });

  if (insertErr) {
    return res.status(500).json({ error: "فشل إرسال رمز التحقق. حاول مرة أخرى." });
  }

  // Log this send for rate-limit tracking (non-critical)
  try {
    await supabase.from("otp_send_log").insert({ phone_number, ip: clientIp });
  } catch {
    // silent — don't block the user if the log table is missing
  }

  const isDev = process.env.NODE_ENV === "development";

  return res.json({
    success: true,
    ...(isDev
      ? {
          dev_code: otp,
          dev_note: "وضع التطوير: الرمز مرئي هنا فقط — في الإنتاج يُرسل عبر SMS",
        }
      : {}),
  });
});

// ─── POST /api/sms/verify ──────────────────────────────────────────────────────
router.post("/sms/verify", async (req, res) => {
  const { phone_number, code } = req.body ?? {};

  if (!phone_number || !code) {
    return res.status(400).json({ error: "رقم الهاتف والرمز مطلوبان" });
  }

  if (!SERVICE_ROLE_KEY) {
    return res.status(503).json({ error: "خدمة التحقق غير مهيأة" });
  }

  const supabase = adminClient();

  const { data: record, error: fetchErr } = await supabase
    .from("verification_codes")
    .select("code, expires_at, attempts")
    .eq("phone", phone_number)
    .maybeSingle();

  if (fetchErr || !record) {
    return res
      .status(400)
      .json({ error: "لم يتم إرسال رمز لهذا الرقم. اضغط إرسال مرة أخرى." });
  }

  // ── Brute-force lockout ────────────────────────────────────────────────────
  if ((record.attempts ?? 0) >= 5) {
    await supabase.from("verification_codes").delete().eq("phone", phone_number);
    return res
      .status(429)
      .json({ error: "تجاوزت عدد المحاولات المسموح. اطلب رمزاً جديداً." });
  }

  if (new Date(record.expires_at) < new Date()) {
    return res
      .status(400)
      .json({ error: "انتهت صلاحية الرمز (10 دقائق). أرسل رمزاً جديداً." });
  }

  if (record.code !== String(code)) {
    // Increment the attempts counter then reject
    await supabase
      .from("verification_codes")
      .update({ attempts: (record.attempts ?? 0) + 1 })
      .eq("phone", phone_number);
    return res.status(400).json({ error: "رمز التحقق غير صحيح" });
  }

  // ── Code correct — delete it so it can't be reused ────────────────────────
  await supabase.from("verification_codes").delete().eq("phone", phone_number);

  const email = phoneToEmail(phone_number);
  let is_new_user = false;

  // Create the user; a 422 / "already registered" error just means they exist — that's fine
  const { error: createErr } = await supabase.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { phone: phone_number },
  });

  if (createErr) {
    const alreadyExists =
      createErr.message?.toLowerCase().includes("already") ||
      createErr.status === 422 ||
      (createErr as any).code === "email_exists";

    if (!alreadyExists) {
      return res.status(500).json({ error: "فشل إنشاء الحساب. حاول مرة أخرى." });
    }
  } else {
    is_new_user = true;
  }

  // Generate a magic-link token_hash for the client to call supabase.auth.verifyOtp
  const { data: linkData, error: linkErr } = await supabase.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: { redirectTo: `${process.env.APP_URL ?? "http://localhost:5000"}/` },
  });

  if (linkErr || !linkData?.properties?.hashed_token) {
    return res.status(500).json({ error: "فشل إنشاء رمز الجلسة. حاول مرة أخرى." });
  }

  return res.json({
    success: true,
    email,
    token_hash: linkData.properties.hashed_token,
    is_new_user,
  });
});

export default router;
