import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://hhqhoqwpebnmfuhwhllw.supabase.co";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const APP_URL = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : process.env.APP_URL ?? "https://localhost:5000";

function adminClient() {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function phoneToEmail(phone: string) {
  return `phone.${phone.replace(/\D/g, "")}@wasal-auth.local`;
}

export default async function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

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

  await supabase.from("verification_codes").delete().eq("phone", phone_number);

  const email = phoneToEmail(phone_number);
  let is_new_user = false;

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

  const { data: linkData, error: linkErr } = await supabase.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: { redirectTo: `${APP_URL}/` },
  });

  if (linkErr || !linkData?.properties?.hashed_token) {
    return res.status(500).json({ error: "فشل إنشاء رمز الجلسة. حاول مرة أخرى." });
  }

  return res.status(200).json({
    success: true,
    email,
    token_hash: linkData.properties.hashed_token,
    is_new_user,
  });
}
