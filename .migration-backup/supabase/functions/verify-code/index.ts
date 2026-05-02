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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { phone_number, code } = await req.json().catch(() => ({}));
    if (!phone_number || !code) {
      return json({ error: "رقم الهاتف والرمز مطلوبان" });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceKey) {
      return json({ error: "إعدادات الخادم غير مكتملة" });
    }
    const supabase = createClient(supabaseUrl, serviceKey);

    // Get latest code for this phone
    const { data: codeRecord } = await supabase
      .from("verification_codes")
      .select("*")
      .eq("phone_number", phone_number)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!codeRecord) {
      return json({ error: "لم يتم العثور على رمز تحقق. يرجى إعادة إرسال الرمز" });
    }

    if (new Date(codeRecord.expires_at) < new Date()) {
      return json({ error: "انتهت صلاحية رمز التحقق. يرجى إعادة إرسال الرمز" });
    }

    if ((codeRecord.attempts || 0) >= 3) {
      return json({ error: "تجاوزت الحد الأقصى للمحاولات. يرجى إعادة إرسال الرمز" });
    }

    // Increment attempts
    await supabase
      .from("verification_codes")
      .update({ attempts: (codeRecord.attempts || 0) + 1 })
      .eq("id", codeRecord.id);

    if (codeRecord.code !== code) {
      return json({ error: "رمز التحقق غير صحيح" });
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
        console.error("createUser error:", createError);
        return json({
          error: "فشل في إنشاء الحساب",
          details: createError?.message,
        });
      }
      userId = newUser.user.id;
      isNewUser = true;
    }

    // Generate a session token
    const { data: sessionData, error: linkError } =
      await supabase.auth.admin.generateLink({
        type: "magiclink",
        email,
      });

    if (linkError) {
      console.error("generateLink error:", linkError);
      return json({
        error: "فشل في إنشاء جلسة الدخول",
        details: linkError.message,
      });
    }

    // Clean up verification code
    await supabase.from("verification_codes").delete().eq("id", codeRecord.id);

    return json({
      success: true,
      user_id: userId,
      is_new_user: isNewUser,
      token_hash: sessionData?.properties?.hashed_token,
      email,
    });
  } catch (err: any) {
    console.error("verify-code error:", err);
    return json({
      error: "خطأ غير متوقع في الخادم",
      details: String(err?.message || err),
    });
  }
});
