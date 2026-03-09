import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    // TODO: Integrate with SMS provider (Twilio/WhatsApp) to send the code
    // For now, log it for development
    console.log(`[DEV] Verification code for ${phone_number}: ${code}`);

    return new Response(JSON.stringify({ success: true, message: "تم إرسال رمز التحقق", dev_code: code }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "خطأ في الخادم" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
