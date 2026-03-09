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
    const { phone_number, code } = await req.json();
    if (!phone_number || !code) {
      return new Response(JSON.stringify({ error: "رقم الهاتف والرمز مطلوبان" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Get latest code for this phone
    const { data: codeRecord, error: fetchError } = await supabase
      .from("verification_codes")
      .select("*")
      .eq("phone_number", phone_number)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!codeRecord) {
      return new Response(JSON.stringify({ error: "لم يتم العثور على رمز تحقق" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (new Date(codeRecord.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: "انتهت صلاحية رمز التحقق" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if ((codeRecord.attempts || 0) >= 3) {
      return new Response(JSON.stringify({ error: "تجاوزت الحد الأقصى للمحاولات. أعد إرسال الرمز" }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Increment attempts
    await supabase
      .from("verification_codes")
      .update({ attempts: (codeRecord.attempts || 0) + 1 })
      .eq("id", codeRecord.id);

    if (codeRecord.code !== code) {
      return new Response(JSON.stringify({ error: "رمز التحقق غير صحيح" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Code is valid - create or get user via admin API
    const email = `${phone_number.replace("+", "")}@phone.rihlati.app`;

    // Check if user exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(
      (u: any) => u.phone === phone_number || u.email === email
    );

    let userId: string;
    let isNewUser = false;

    if (existingUser) {
      userId = existingUser.id;
    } else {
      // Create new user
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email,
        phone: phone_number,
        email_confirm: true,
        phone_confirm: true,
        user_metadata: { role: "customer", phone: phone_number },
      });

      if (createError || !newUser.user) {
        return new Response(JSON.stringify({ error: "فشل في إنشاء الحساب" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      userId = newUser.user.id;
      isNewUser = true;
    }

    // Generate a session token
    const { data: sessionData, error: sessionError } = await supabase.auth.admin.generateLink({
      type: "magiclink",
      email,
    });

    // Clean up verification code
    await supabase.from("verification_codes").delete().eq("id", codeRecord.id);

    return new Response(
      JSON.stringify({
        success: true,
        user_id: userId,
        is_new_user: isNewUser,
        // Return token for client-side session
        token_hash: sessionData?.properties?.hashed_token,
        email,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("verify-code error:", err);
    return new Response(JSON.stringify({ error: "خطأ في الخادم" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
