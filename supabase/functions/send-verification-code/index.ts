import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

async function sendWhatsAppViaTwilioDirect(
  toPhone: string,
  code: string
): Promise<{ ok: boolean; error?: string }> {
  const ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
  const AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
  const FROM = Deno.env.get("TWILIO_WHATSAPP_FROM");

  if (!ACCOUNT_SID || !AUTH_TOKEN || !FROM) {
    return { ok: false, error: "twilio_direct_not_configured" };
  }

  const fromFormatted = FROM.startsWith("whatsapp:") ? FROM : `whatsapp:${FROM}`;
  const toFormatted = `whatsapp:${toPhone}`;
  const body = new URLSearchParams({
    To: toFormatted,
    From: fromFormatted,
    Body: `رمز التحقق الخاص بك في وصل: ${code}\n\nالرمز صالح لمدة 5 دقائق. لا تشاركه مع أي شخص.`,
  });

  const auth = btoa(`${ACCOUNT_SID}:${AUTH_TOKEN}`);
  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${ACCOUNT_SID}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    }
  );

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    console.error("Twilio direct error:", response.status, data);
    return {
      ok: false,
      error: data?.message || `Twilio error ${response.status}`,
    };
  }
  return { ok: true };
}

async function sendWhatsAppViaLovable(
  toPhone: string,
  code: string
): Promise<{ ok: boolean; error?: string }> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  const TWILIO_API_KEY =
    Deno.env.get("TWILIO_API_KEY_1") || Deno.env.get("TWILIO_API_KEY");
  const FROM = Deno.env.get("TWILIO_WHATSAPP_FROM");

  if (!LOVABLE_API_KEY || !TWILIO_API_KEY || !FROM) {
    return { ok: false, error: "lovable_gateway_not_configured" };
  }

  const fromFormatted = FROM.startsWith("whatsapp:") ? FROM : `whatsapp:${FROM}`;
  const toFormatted = `whatsapp:${toPhone}`;
  const body = new URLSearchParams({
    To: toFormatted,
    From: fromFormatted,
    Body: `رمز التحقق الخاص بك في وصل: ${code}\n\nالرمز صالح لمدة 5 دقائق. لا تشاركه مع أي شخص.`,
  });

  const response = await fetch(
    "https://connector-gateway.lovable.dev/twilio/Messages.json",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": TWILIO_API_KEY,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    }
  );

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    console.error("Lovable gateway error:", response.status, data);
    return {
      ok: false,
      error: data?.message || `Gateway error ${response.status}`,
    };
  }
  return { ok: true };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { phone_number } = await req.json().catch(() => ({}));
    if (!phone_number || !/^\+967\d{9}$/.test(phone_number)) {
      return json({ error: "رقم هاتف يمني غير صالح" });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceKey) {
      return json({
        error:
          "إعدادات الخادم غير مكتملة (SUPABASE_URL أو SUPABASE_SERVICE_ROLE_KEY). راجع إعدادات Supabase.",
        code: "supabase_env_missing",
      });
    }
    const supabase = createClient(supabaseUrl, serviceKey);

    // Delete old codes for this number
    await supabase
      .from("verification_codes")
      .delete()
      .eq("phone_number", phone_number);

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expires_at = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    const { error: dbError } = await supabase.from("verification_codes").insert({
      phone_number,
      code,
      expires_at,
      attempts: 0,
    });

    if (dbError) {
      console.error("DB insert error:", dbError);
      return json({
        error: "فشل في إنشاء رمز التحقق في قاعدة البيانات",
        code: "db_insert_failed",
        details: dbError.message,
      });
    }

    // Try direct Twilio first (more reliable), then fall back to Lovable gateway
    let sendResult = await sendWhatsAppViaTwilioDirect(phone_number, code);
    let attemptedDirect = sendResult.error !== "twilio_direct_not_configured";

    if (!attemptedDirect) {
      sendResult = await sendWhatsAppViaLovable(phone_number, code);
    }

    if (!sendResult.ok) {
      // Surface a clear, actionable Arabic message
      const isConfig =
        sendResult.error === "twilio_direct_not_configured" ||
        sendResult.error === "lovable_gateway_not_configured";

      const userMessage = isConfig
        ? "خدمة إرسال واتساب غير معدّة بعد. يجب على المسؤول إضافة أسرار Twilio في إعدادات Supabase. (راجع إعدادات Edge Functions)"
        : `فشل إرسال رمز واتساب: ${sendResult.error}`;

      return json({
        error: userMessage,
        code: isConfig ? "twilio_not_configured" : "twilio_send_failed",
        details: sendResult.error,
      });
    }

    return json({
      success: true,
      message: "تم إرسال رمز التحقق إلى واتساب الخاص بك",
    });
  } catch (err) {
    console.error("send-verification-code error:", err);
    return json({
      error: "خطأ غير متوقع في الخادم",
      code: "unexpected_error",
      details: String(err?.message || err),
    });
  }
});
