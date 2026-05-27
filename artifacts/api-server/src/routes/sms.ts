import { Router } from "express";
import { createClient } from "@supabase/supabase-js";

const router = Router();

const SUPABASE_URL = process.env.SUPABASE_URL ?? "https://xugjqhxfdjlndljogvru.supabase.co";
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

  const otp = randomOtp();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  const supabase = adminClient();

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
    .select("code, expires_at")
    .eq("phone", phone_number)
    .maybeSingle();

  if (fetchErr || !record) {
    return res.status(400).json({ error: "لم يتم إرسال رمز لهذا الرقم. اضغط إرسال مرة أخرى." });
  }

  if (new Date(record.expires_at) < new Date()) {
    return res.status(400).json({ error: "انتهت صلاحية الرمز (10 دقائق). أرسل رمزاً جديداً." });
  }

  if (record.code !== String(code)) {
    return res.status(400).json({ error: "رمز التحقق غير صحيح" });
  }

  // Code correct — delete it so it can't be reused
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
