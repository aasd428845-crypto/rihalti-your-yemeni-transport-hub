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
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];

    // 1. Send reminders for invoices due within 3 days
    const threeDaysLater = new Date(today);
    threeDaysLater.setDate(threeDaysLater.getDate() + 3);
    const threeDaysStr = threeDaysLater.toISOString().split("T")[0];

    const { data: upcomingInvoices } = await supabase
      .from("partner_invoices")
      .select("*")
      .eq("status", "pending")
      .gte("due_date", todayStr)
      .lte("due_date", threeDaysStr);

    let reminderCount = 0;
    if (upcomingInvoices) {
      for (const inv of upcomingInvoices) {
        try {
          await supabase.functions.invoke("send-push-notification", {
            body: {
              userId: inv.partner_id,
              title: "تذكير بفاتورة قريبة الاستحقاق ⏰",
              body: `فاتورتك رقم ${inv.invoice_number} مستحقة في ${inv.due_date}. يرجى السداد لتجنب الحظر.`,
              data: { type: "invoice_reminder" },
            },
          });
          reminderCount++;
        } catch (e) {
          console.error("Notification error:", e);
        }
      }
    }

    // 2. Find overdue invoices (past due date)
    const { data: overdueInvoices } = await supabase
      .from("partner_invoices")
      .select("*")
      .eq("status", "pending")
      .lt("due_date", todayStr);

    let overdueCount = 0;
    let suspendedCount = 0;

    if (overdueInvoices) {
      for (const inv of overdueInvoices) {
        // Mark as overdue
        await supabase.from("partner_invoices").update({ status: "overdue" }).eq("id", inv.id);
        overdueCount++;

        const dueDate = new Date(inv.due_date);
        const daysPastDue = Math.floor((Date.now() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

        if (daysPastDue >= autoSuspendDays) {
          // Suspend partner
          await supabase
            .from("profiles")
            .update({ account_status: "suspended" })
            .eq("user_id", inv.partner_id);

          suspendedCount++;

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

          await supabase.from("audit_logs").insert({
            admin_id: "00000000-0000-0000-0000-000000000000",
            action: "حظر تلقائي - تأخر سداد فاتورة",
            entity_type: "partner_invoice",
            entity_id: inv.id,
            details: { partner_id: inv.partner_id, invoice_number: inv.invoice_number, days_past_due: daysPastDue },
          });
        } else {
          // Send overdue reminder
          try {
            await supabase.functions.invoke("send-push-notification", {
              body: {
                userId: inv.partner_id,
                title: "فاتورة متأخرة ⚠️",
                body: `فاتورتك رقم ${inv.invoice_number} متأخرة بـ ${daysPastDue} يوم. سيتم حظر حسابك بعد ${autoSuspendDays - daysPastDue} يوم.`,
                data: { type: "invoice_overdue" },
              },
            });
          } catch (e) {
            console.error("Notification error:", e);
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, reminderCount, overdueCount, suspendedCount }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
