import { Router } from "express";
import { createClient } from "@supabase/supabase-js";

const router = Router();

const SUPABASE_URL = process.env["SUPABASE_URL"] || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env["SUPABASE_SERVICE_ROLE_KEY"] || "";

const adminSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

router.post("/sms/send", async (req, res) => {
  const { phone_number } = req.body as { phone_number?: string };

  if (!phone_number || !/^\+967\d{9}$/.test(phone_number)) {
    res.status(400).json({ error: "رقم الهاتف غير صحيح. يجب أن يبدأ بـ +967 ويتكون من 9 أرقام بعده" });
    return;
  }

  const code = generateOtp();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  await adminSupabase.from("phone_otps").delete().eq("phone", phone_number);

  const { error } = await adminSupabase.from("phone_otps").insert({
    phone: phone_number,
    otp: code,
    expires_at: expiresAt,
  });

  if (error) {
    console.error("[SMS-OTP] Insert error:", JSON.stringify(error));
    res.status(500).json({ error: "فشل حفظ رمز التحقق", detail: error.message });
    return;
  }

  console.log(`[SMS-OTP] ${phone_number} → otp: ${code}`);

  res.json({ success: true, message: "تم إرسال رمز التحقق" });
});

router.post("/sms/verify", async (req, res) => {
  const { phone_number, code } = req.body as { phone_number?: string; code?: string };

  if (!phone_number || !code) {
    res.status(400).json({ error: "رقم الهاتف ورمز التحقق مطلوبان" });
    return;
  }

  const { data: otpRow, error: otpError } = await adminSupabase
    .from("phone_otps")
    .select("*")
    .eq("phone", phone_number)
    .eq("otp", code)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (otpError || !otpRow) {
    res.status(400).json({ error: "رمز التحقق غير صحيح أو منتهي الصلاحية" });
    return;
  }

  await adminSupabase.from("phone_otps").delete().eq("phone", phone_number);

  const { data: profileData } = await adminSupabase
    .from("profiles")
    .select("user_id, full_name")
    .eq("phone", phone_number)
    .maybeSingle();

  let userEmail: string;
  let isNewUser = false;

  if (profileData?.user_id) {
    const { data: userData } = await adminSupabase.auth.admin.getUserById(profileData.user_id);
    if (!userData?.user?.email) {
      res.status(500).json({ error: "فشل الحصول على بيانات المستخدم" });
      return;
    }
    userEmail = userData.user.email;
  } else {
    const randomSuffix = Math.random().toString(36).slice(2, 10);
    userEmail = `phone_${phone_number.replace("+", "")}${randomSuffix}@wasal.app`;
    const randomPassword = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);

    const { data: newUser, error: createError } = await adminSupabase.auth.admin.createUser({
      email: userEmail,
      password: randomPassword,
      email_confirm: true,
      user_metadata: { phone: phone_number },
    });

    if (createError || !newUser?.user) {
      res.status(500).json({ error: "فشل إنشاء الحساب" });
      return;
    }

    await adminSupabase.from("profiles").update({ phone: phone_number }).eq("user_id", newUser.user.id);

    isNewUser = true;
  }

  const { data: linkData, error: linkError } = await adminSupabase.auth.admin.generateLink({
    type: "magiclink",
    email: userEmail,
  });

  if (linkError || !linkData?.properties?.hashed_token) {
    res.status(500).json({ error: "فشل إنشاء رمز الدخول" });
    return;
  }

  res.json({
    success: true,
    email: userEmail,
    token_hash: linkData.properties.hashed_token,
    is_new_user: isNewUser,
  });
});

export default router;
