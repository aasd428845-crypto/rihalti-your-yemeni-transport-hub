import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

    const body = await req.json().catch(() => ({}));
    const reportType = body.report_type || "daily";

    // Calculate period
    const now = new Date();
    let periodStart: Date;
    switch (reportType) {
      case "weekly":
        periodStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "monthly":
        periodStart = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        break;
      case "yearly":
        periodStart = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        break;
      default:
        periodStart = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    const startStr = periodStart.toISOString().split("T")[0];
    const endStr = now.toISOString().split("T")[0];

    // Gather stats in parallel
    const [
      totalUsers,
      newUsers,
      totalTrips,
      totalShipments,
      totalDeliveries,
      totalRides,
      transactions,
      errors,
      unresolvedErrors,
    ] = await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", startStr),
      supabase.from("trips").select("id", { count: "exact", head: true }).gte("created_at", startStr),
      supabase.from("shipment_requests").select("id", { count: "exact", head: true }).gte("created_at", startStr),
      supabase.from("delivery_orders").select("id", { count: "exact", head: true }).gte("created_at", startStr),
      supabase.from("ride_requests").select("id", { count: "exact", head: true }).gte("created_at", startStr),
      supabase.from("financial_transactions").select("amount, platform_commission, payment_status").gte("created_at", startStr),
      supabase.from("error_logs").select("id, severity", { count: "exact", head: false }).gte("created_at", startStr),
      supabase.from("error_logs").select("id", { count: "exact", head: true }).eq("is_resolved", false),
    ]);

    // Financial calculations
    const txData = transactions.data || [];
    const totalRevenue = txData.reduce((s: number, t: any) => s + (Number(t.amount) || 0), 0);
    const totalCommission = txData.reduce((s: number, t: any) => s + (Number(t.platform_commission) || 0), 0);
    const completedTx = txData.filter((t: any) => t.payment_status === "completed").length;
    const failedTx = txData.filter((t: any) => t.payment_status === "failed").length;

    // Error breakdown
    const errorData = errors.data || [];
    const criticalErrors = errorData.filter((e: any) => e.severity === "critical").length;
    const warningErrors = errorData.filter((e: any) => e.severity === "warning").length;

    // Top services
    const services = [
      { name: "رحلات", count: totalTrips.count || 0 },
      { name: "شحنات", count: totalShipments.count || 0 },
      { name: "توصيلات", count: totalDeliveries.count || 0 },
      { name: "أجرة", count: totalRides.count || 0 },
    ].sort((a, b) => b.count - a.count);

    const summary = {
      period: { start: startStr, end: endStr, type: reportType },
      users: {
        total: totalUsers.count || 0,
        new: newUsers.count || 0,
      },
      services: {
        trips: totalTrips.count || 0,
        shipments: totalShipments.count || 0,
        deliveries: totalDeliveries.count || 0,
        rides: totalRides.count || 0,
        top_services: services,
      },
      financial: {
        total_revenue: totalRevenue,
        total_commission: totalCommission,
        net_revenue: totalRevenue - totalCommission,
        completed_transactions: completedTx,
        failed_transactions: failedTx,
        total_transactions: txData.length,
      },
      errors: {
        total: errors.count || 0,
        critical: criticalErrors,
        warnings: warningErrors,
        unresolved: unresolvedErrors.count || 0,
      },
    };

    const periodLabels: Record<string, string> = {
      daily: "يومي",
      weekly: "أسبوعي",
      monthly: "شهري",
      yearly: "سنوي",
    };
    const title = `تقرير ${periodLabels[reportType] || reportType} - ${startStr} إلى ${endStr}`;

    // Save report
    const { data: report, error: insertError } = await supabase
      .from("generated_reports")
      .insert({
        report_type: reportType,
        period_start: startStr,
        period_end: endStr,
        title,
        summary,
        status: "completed",
      } as any)
      .select()
      .single();

    if (insertError) throw insertError;

    return new Response(
      JSON.stringify({ success: true, report, summary }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
