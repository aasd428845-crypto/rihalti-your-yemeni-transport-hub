import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Parse optional body for period_type override
    let requestedPeriodType = "weekly";
    try {
      const body = await req.json();
      if (body?.period_type) requestedPeriodType = body.period_type;
    } catch {}

    // Get accounting settings
    const { data: settings } = await supabase
      .from("accounting_settings")
      .select("*")
      .eq("id", 1)
      .single();

    const dueDays = settings?.payment_due_days || 7;

    // Get all partners
    const { data: roles } = await supabase
      .from("user_roles")
      .select("user_id, role")
      .in("role", ["supplier", "delivery_company", "driver"]);

    if (!roles || roles.length === 0) {
      return new Response(JSON.stringify({ message: "No partners found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const today = new Date();
    let periodStart: Date, periodEnd: Date;

    if (requestedPeriodType === "monthly") {
      periodEnd = new Date(today.getFullYear(), today.getMonth(), 0); // Last day of prev month
      periodStart = new Date(periodEnd.getFullYear(), periodEnd.getMonth(), 1);
    } else if (requestedPeriodType === "yearly") {
      periodEnd = new Date(today.getFullYear() - 1, 11, 31);
      periodStart = new Date(today.getFullYear() - 1, 0, 1);
    } else {
      // weekly
      periodEnd = new Date(today);
      periodEnd.setDate(periodEnd.getDate() - 1);
      periodStart = new Date(periodEnd);
      periodStart.setDate(periodStart.getDate() - 6);
    }

    const periodStartStr = periodStart.toISOString().split("T")[0];
    const periodEndStr = periodEnd.toISOString().split("T")[0];

    let invoicesCreated = 0;

    for (const partner of roles) {
      // Check if partner is in trial period
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_trial_active, trial_end_date")
        .eq("user_id", partner.user_id)
        .maybeSingle();

      if (profile?.is_trial_active && profile?.trial_end_date) {
        const trialEnd = new Date(profile.trial_end_date);
        if (trialEnd > today) continue; // Skip partners in active trial
      }

      // Check if invoice already exists for this period
      const { data: existing } = await supabase
        .from("partner_invoices")
        .select("id")
        .eq("partner_id", partner.user_id)
        .eq("period_start", periodStartStr)
        .eq("period_end", periodEndStr)
        .maybeSingle();

      if (existing) continue;

      // Get transactions for this partner in the period
      const { data: txns } = await supabase
        .from("financial_transactions")
        .select("amount, platform_commission, partner_earning")
        .eq("partner_id", partner.user_id)
        .gte("created_at", periodStartStr)
        .lte("created_at", periodEndStr + "T23:59:59");

      if (!txns || txns.length === 0) continue;

      const totalAmount = txns.reduce((s, t) => s + Number(t.amount), 0);
      const totalCommission = txns.reduce((s, t) => s + Number(t.platform_commission), 0);
      const netAmount = txns.reduce((s, t) => s + Number(t.partner_earning), 0);

      const dueDate = new Date(periodEnd);
      dueDate.setDate(dueDate.getDate() + dueDays);

      const invoiceNumber = `INV-${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(invoicesCreated + 1).padStart(4, "0")}-${partner.user_id.slice(0, 4)}`;

      await supabase.from("partner_invoices").insert({
        partner_id: partner.user_id,
        invoice_number: invoiceNumber,
        period_start: periodStartStr,
        period_end: periodEndStr,
        period_type: requestedPeriodType,
        total_transactions: txns.length,
        total_amount: totalAmount,
        total_commission: totalCommission,
        net_amount: netAmount,
        due_date: dueDate.toISOString().split("T")[0],
      });

      invoicesCreated++;

      // Send notification
      try {
        await supabase.functions.invoke("send-push-notification", {
          body: {
            userId: partner.user_id,
            title: "فاتورة جديدة 📄",
            body: `فاتورة رقم ${invoiceNumber} بمبلغ عمولة ${totalCommission.toLocaleString()} ر.ي مستحقة في ${dueDate.toISOString().split("T")[0]}`,
            data: { type: "invoice" },
          },
        });
      } catch (e) {
        console.error("Failed to send invoice notification:", e);
      }
    }

    return new Response(
      JSON.stringify({ success: true, invoicesCreated, periodType: requestedPeriodType }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
