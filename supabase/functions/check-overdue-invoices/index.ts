// supabase/functions/check-overdue-invoices/index.ts
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

    const { data: settings } = await supabase
      .from("accounting_settings")
      .select("*")
      .eq("id", 1)
      .single();

    const autoSuspendDays = settings?.auto_suspend_days || 15;
    const today = new Date().toISOString().split("T")[0];

    // Find pending invoices past due date
    const { data: overdueInvoices } = await supabase
      .from("partner_invoices")
      .select("*")
      .eq("status", "pending")
      .lt("due_date", today);

    if (!overdueInvoices || overdueInvoices.length === 0) {
      return new Response(JSON.stringify({ message: "No overdue invoices" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let overdueCount = 0;
    let suspendedCount = 0;

    for (const inv of overdueInvoices) {
      // Mark as overdue
      await supabase.from("partner_invoices").update({ status: "overdue" }).eq("id", inv.id);
      overdueCount++;

      // Check if past auto-suspend threshold
      const dueDate = new Date(inv.due_date);
      const daysPastDue = Math.floor((Date.now() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

      if (daysPastDue >= autoSuspendDays) {
        // Suspend partner
        await supabase
          .from("profiles")
          .update({ account_status: "suspended" })
          .eq("user_id", inv.partner_id);

        suspendedCount++;

        // Notify partner of suspension
        try {
          await supabase.functions.invoke("send-push-notification", {
            body: {
              userId: inv.partner_id,
              title: "تم تعليق حسابك ⚠️",
              body: `تم تعليق حسابك بسبب تأخر سداد الفاتورة رقم ${inv.invoice_number}. تواصل مع الدعم.`,
              data: { type: "suspension" },
            },
          });
        } catch (e) {
          console.error("Notification error:", e);
        }

        // Log in audit
        await supabase.from("audit_logs").insert({
          admin_id: "00000000-0000-0000-0000-000000000000",
          action: "حظر تلقائي - تأخر سداد فاتورة",
          entity_type: "partner_invoice",
          entity_id: inv.id,
          details: { partner_id: inv.partner_id, invoice_number: inv.invoice_number, days_past_due: daysPastDue },
        });
      } else {
        // Send reminder
        try {
          await supabase.functions.invoke("send-push-notification", {
            body: {
              userId: inv.partner_id,
              title: "تذكير بفاتورة متأخرة ⏰",
              body: `فاتورتك رقم ${inv.invoice_number} متأخرة بـ ${daysPastDue} يوم. يرجى السداد قبل حظر حسابك.`,
              data: { type: "invoice_reminder" },
            },
          });
        } catch (e) {
          console.error("Notification error:", e);
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, overdueCount, suspendedCount }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
