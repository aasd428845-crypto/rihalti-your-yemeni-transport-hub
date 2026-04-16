import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/twilio";

async function sendWhatsAppCode(toPhone: string, code: string): Promise<{ ok: boolean; error?: string }> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  const TWILIO_API_KEY = Deno.env.get("TWILIO_API_KEY_1") || Deno.env.get("TWILIO_API_KEY");
  const TWILIO_WHATSAPP_FROM = Deno.env.get("TWILIO_WHATSAPP_FROM");

  if (!LOVABLE_API_KEY) return { ok: false, error: "LOVABLE_API_KEY not configured" };
  if (!TWILIO_API_KEY) return { ok: false, error: "TWILIO_API_KEY not configured" };
  if (!TWILIO_WHATSAPP_FROM) return { ok: false, error: "TWILIO_WHATSAPP_FROM not configured" };

  // Normalize From: ensure it has whatsapp: prefix
  const fromFormatted = TWILIO_WHATSAPP_FROM.startsWith("whatsapp:")
    ? TWILIO_WHATSAPP_FROM
    : `whatsapp:${TWILIO_WHATSAPP_FROM}`;
  const toFormatted = `whatsapp:${toPhone}`;

  const body = new URLSearchParams({
    To: toFormatted,
    From: fromFormatted,
    Body: `رمز التحقق الخاص بك في وصل: ${code}\n\nالرمز صالح لمدة 5 دقائق. لا تشاركه مع أي شخص.`,
  });

  const response = await fetch(`${GATEWAY_URL}/Messages.json`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${LOVABLE_API_KEY}`,
      "X-Connection-Api-Key": TWILIO_API_KEY,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  const data = await response.json();
  if (!response.ok) {
    console.error("Twilio error:", response.status, data);
    return { ok: false, error: data?.message || `Twilio error ${response.status}` };
  }
  return { ok: true };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { phone_number } = await req.json();
    if (!phone_number || !/^\+967\d{9}$/.test(phone_number)) {
      return new Response(JSON.stringify({ error: "رقم هاتف يمني غير صالح" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Delete old codes for this number
    await supabase.from("verification_codes").delete().eq("phone_number", phone_number);

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expires_at = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    const { error } = await supabase.from("verification_codes").insert({
      phone_number,
      code,
      expires_at,
      attempts: 0,
    });

    if (error) {
      return new Response(JSON.stringify({ error: "فشل في إنشاء رمز التحقق" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Send code via WhatsApp (Twilio)
    const sendResult = await sendWhatsAppCode(phone_number, code);

    if (!sendResult.ok) {
      console.error("Failed to send WhatsApp code:", sendResult.error);
      return new Response(
        JSON.stringify({
          error: "فشل في إرسال رمز التحقق عبر واتساب. تأكد من إعدادات الاتصال أو حاول لاحقاً.",
          details: sendResult.error,
        }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: "تم إرسال رمز التحقق إلى واتساب الخاص بك" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("send-verification-code error:", err);
    return new Response(JSON.stringify({ error: "خطأ في الخادم" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
