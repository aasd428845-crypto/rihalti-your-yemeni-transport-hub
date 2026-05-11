import { Router } from "express";
import { logger } from "../lib/logger";

const router = Router();

const SUPABASE_URL = process.env["SUPABASE_URL"]!;
const SUPABASE_SERVICE_ROLE_KEY = process.env["SUPABASE_SERVICE_ROLE_KEY"]!;
const TRACCAR_TOKEN = process.env["TRACCAR_TOKEN"]!;

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// POST /api/sms/send
router.post("/sms/send", async (req, res) => {
  const { phone_number } = req.body as { phone_number?: string };

  if (!phone_number) {
    res.status(400).json({ error: "رقم الهاتف مطلوب" });
    return;
  }

  if (!TRACCAR_TOKEN) {
    logger.error("TRACCAR_TOKEN not configured");
    res.status(500).json({ error: "خدمة الرسائل غير مهيأة" });
    return;
  }

  const otp = generateOtp();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

  try {
    // Delete old OTPs for this phone
    await fetch(
      `${SUPABASE_URL}/rest/v1/phone_otps?phone=eq.${encodeURIComponent(phone_number)}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          apikey: SUPABASE_SERVICE_ROLE_KEY,
        },
      }
    );

    // Store new OTP
    const storeRes = await fetch(`${SUPABASE_URL}/rest/v1/phone_otps`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({ phone: phone_number, otp, expires_at: expiresAt }),
    });

    if (!storeRes.ok) {
      const errBody = await storeRes.text();
      logger.error({ status: storeRes.status, body: errBody }, "Failed to store OTP");
      res.status(500).json({ error: "فشل في حفظ رمز التحقق" });
      return;
    }

    // Send via Traccar SMS Gateway
    const message = `رمز التحقق الخاص بك في وصل: ${otp}\nصالح لمدة 5 دقائق`;

    const smsRes = await fetch("https://www.traccar.org/sms-gateway/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${TRACCAR_TOKEN}`,
      },
      body: JSON.stringify({ to: phone_number, message }),
    });

    if (!smsRes.ok) {
      const errText = await smsRes.text();
      logger.error({ status: smsRes.status, body: errText }, "Traccar SMS failed");
      res.status(502).json({ error: `فشل إرسال الرسالة عبر البوابة (${smsRes.status})` });
      return;
    }

    logger.info({ phone: phone_number }, "OTP sent via Traccar");
    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, "SMS send error");
    res.status(500).json({ error: "خطأ في الاتصال بالخدمة" });
  }
});

// POST /api/sms/verify
router.post("/sms/verify", async (req, res) => {
  const { phone_number, code } = req.body as { phone_number?: string; code?: string };

  if (!phone_number || !code) {
    res.status(400).json({ error: "رقم الهاتف والرمز مطلوبان" });
    return;
  }

  try {
    const now = new Date().toISOString();

    // Look up OTP
    const otpRes = await fetch(
      `${SUPABASE_URL}/rest/v1/phone_otps?phone=eq.${encodeURIComponent(phone_number)}&otp=eq.${code}&expires_at=gt.${encodeURIComponent(now)}&select=*`,
      {
        headers: {
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          apikey: SUPABASE_SERVICE_ROLE_KEY,
        },
      }
    );

    const otpRecords = (await otpRes.json()) as unknown[];

    if (!otpRecords || otpRecords.length === 0) {
      res.status(400).json({ error: "رمز التحقق غير صحيح أو منتهي الصلاحية" });
      return;
    }

    // Delete used OTP
    await fetch(
      `${SUPABASE_URL}/rest/v1/phone_otps?phone=eq.${encodeURIComponent(phone_number)}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          apikey: SUPABASE_SERVICE_ROLE_KEY,
        },
      }
    );

    // Build phone-based email
    const phoneEmail = `${phone_number.replace(/[^0-9]/g, "")}@phone.wasal.app`;

    // Find existing user by phone or generated email
    const usersRes = await fetch(
      `${SUPABASE_URL}/auth/v1/admin/users?page=1&per_page=1000`,
      {
        headers: {
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          apikey: SUPABASE_SERVICE_ROLE_KEY,
        },
      }
    );

    type AuthUser = { id: string; email?: string; phone?: string; user_metadata?: Record<string, string> };
    const usersData = (await usersRes.json()) as { users?: AuthUser[] };
    const users = usersData.users || [];

    let existingUser = users.find(
      (u) =>
        u.phone === phone_number ||
        u.user_metadata?.phone === phone_number ||
        u.email === phoneEmail
    );

    let isNewUser = false;
    let userEmail = phoneEmail;

    if (!existingUser) {
      // Create new user
      const createRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: phoneEmail,
          email_confirm: true,
          phone: phone_number,
          phone_confirm: true,
          user_metadata: { phone: phone_number, role: "customer" },
        }),
      });

      const newUser = (await createRes.json()) as AuthUser & { id?: string };

      if (!createRes.ok || !newUser.id) {
        logger.error({ body: newUser }, "Failed to create user");
        res.status(500).json({ error: "فشل في إنشاء الحساب" });
        return;
      }

      existingUser = newUser as AuthUser;
      isNewUser = true;

      // Add customer role
      await fetch(`${SUPABASE_URL}/rest/v1/user_roles`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          "Content-Type": "application/json",
          Prefer: "resolution=ignore-duplicates",
        },
        body: JSON.stringify({ user_id: newUser.id, role: "customer" }),
      });

      // Create minimal profile
      await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          "Content-Type": "application/json",
          Prefer: "resolution=ignore-duplicates",
        },
        body: JSON.stringify({
          user_id: newUser.id,
          full_name: "",
          phone: phone_number,
          account_status: "approved",
          is_verified: false,
          violations_count: 0,
          is_trial_active: false,
          profile_completed: false,
        }),
      });
    } else {
      userEmail = existingUser.email || phoneEmail;
    }

    // Generate magic link token for session
    const linkRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/generate_link`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: "magiclink",
        email: userEmail,
      }),
    });

    const linkData = (await linkRes.json()) as { hashed_token?: string; error?: string };

    if (!linkRes.ok || !linkData.hashed_token) {
      logger.error({ body: linkData }, "Failed to generate magic link");
      res.status(500).json({ error: "فشل في إنشاء جلسة الدخول" });
      return;
    }

    logger.info({ phone: phone_number, isNewUser }, "OTP verified successfully");

    res.json({
      success: true,
      email: userEmail,
      token_hash: linkData.hashed_token,
      is_new_user: isNewUser,
    });
  } catch (err) {
    logger.error({ err }, "OTP verify error");
    res.status(500).json({ error: "خطأ في التحقق من الرمز" });
  }
});

export default router;
