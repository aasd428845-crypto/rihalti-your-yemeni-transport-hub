import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
    const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000).toISOString();

    // Get active alert rules
    const { data: rules } = await supabase
      .from("alert_rules")
      .select("*")
      .eq("is_active", true);

    if (!rules || rules.length === 0) {
      return new Response(JSON.stringify({ message: "No active rules", alerts: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Gather metrics
    const [errorsLastHour, errorsLast5Min, failedPayments, unresolvedErrors] =
      await Promise.all([
        supabase
          .from("error_logs")
          .select("id", { count: "exact", head: true })
          .gte("created_at", oneHourAgo),
        supabase
          .from("error_logs")
          .select("id", { count: "exact", head: true })
          .gte("created_at", fiveMinAgo),
        supabase
          .from("financial_transactions")
          .select("id", { count: "exact", head: true })
          .eq("payment_status", "failed")
          .gte("created_at", oneHourAgo),
        supabase
          .from("error_logs")
          .select("id", { count: "exact", head: true })
          .eq("is_resolved", false),
      ]);

    const metrics: Record<string, number> = {
      error_rate_hour: errorsLastHour.count || 0,
      error_rate_5min: errorsLast5Min.count || 0,
      failed_transactions: failedPayments.count || 0,
      unresolved_errors: unresolvedErrors.count || 0,
    };

    let alertsTriggered = 0;

    for (const rule of rules) {
      const condition = rule.condition as {
        metric?: string;
        operator?: string;
        value?: number;
      };
      if (!condition.metric || !condition.operator || condition.value == null) continue;

      const currentValue = metrics[condition.metric] ?? 0;
      let triggered = false;

      switch (condition.operator) {
        case ">":
          triggered = currentValue > condition.value;
          break;
        case ">=":
          triggered = currentValue >= condition.value;
          break;
        case "<":
          triggered = currentValue < condition.value;
          break;
        case "=":
          triggered = currentValue === condition.value;
          break;
      }

      if (triggered) {
        // Check if same rule triggered in last 15 min to avoid spam
        const fifteenMinAgo = new Date(now.getTime() - 15 * 60 * 1000).toISOString();
        const { count: recentAlerts } = await supabase
          .from("alert_history")
          .select("id", { count: "exact", head: true })
          .eq("rule_id", rule.id)
          .gte("triggered_at", fifteenMinAgo);

        if ((recentAlerts || 0) > 0) continue;

        const message = `⚠️ تنبيه: ${rule.rule_name} - القيمة الحالية ${currentValue} ${condition.operator} ${condition.value}`;

        await supabase.from("alert_history").insert({
          rule_id: rule.id,
          metric_value: currentValue,
          message,
          metadata: { metrics, condition },
        });

        // Log as system event
        await supabase.from("system_event_logs").insert({
          event_type: "alert_triggered",
          entity_type: "alert_rule",
          entity_id: rule.id,
          severity: rule.severity || "warning",
          metadata: { rule_name: rule.rule_name, metric_value: currentValue },
        });

        alertsTriggered++;
      }
    }

    return new Response(
      JSON.stringify({ success: true, alerts: alertsTriggered, metrics }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
