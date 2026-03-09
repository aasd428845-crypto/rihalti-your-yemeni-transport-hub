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

    const today = new Date().toISOString().split("T")[0];
    const todayStart = `${today}T00:00:00Z`;

    // Collect daily stats from various tables
    const [
      profilesTotal,
      profilesNew,
      tripsToday,
      shipmentsToday,
      deliveriesToday,
      ridesToday,
      transactionsToday,
      errorsToday,
    ] = await Promise.all([
      supabase.from("profiles").select("user_id", { count: "exact", head: true }),
      supabase.from("profiles").select("user_id", { count: "exact", head: true }).gte("created_at", todayStart),
      supabase.from("trips").select("id", { count: "exact", head: true }).gte("created_at", todayStart),
      supabase.from("shipment_requests").select("id", { count: "exact", head: true }).gte("created_at", todayStart),
      supabase.from("delivery_orders").select("id", { count: "exact", head: true }).gte("created_at", todayStart),
      supabase.from("ride_requests").select("id", { count: "exact", head: true }).gte("created_at", todayStart),
      supabase.from("financial_transactions").select("id", { count: "exact", head: true }).gte("created_at", todayStart),
      supabase.from("error_logs").select("id", { count: "exact", head: true }).gte("created_at", todayStart),
    ]);

    // Get revenue for today
    const { data: revData } = await supabase
      .from("financial_transactions")
      .select("amount, platform_commission")
      .gte("created_at", todayStart);

    const totalRevenue = (revData || []).reduce((s: number, r: any) => s + Number(r.amount || 0), 0);
    const platformComm = (revData || []).reduce((s: number, r: any) => s + Number(r.platform_commission || 0), 0);

    // Upsert daily stats
    await supabase.from("daily_performance_stats").upsert({
      stat_date: today,
      total_users: profilesTotal.count || 0,
      new_users: profilesNew.count || 0,
      total_trips: tripsToday.count || 0,
      total_shipments: shipmentsToday.count || 0,
      total_deliveries: deliveriesToday.count || 0,
      total_rides: ridesToday.count || 0,
      total_transactions: transactionsToday.count || 0,
      total_revenue: totalRevenue,
      platform_commission: platformComm,
      error_count: errorsToday.count || 0,
    } as any, { onConflict: "stat_date" });

    return new Response(JSON.stringify({ success: true, date: today }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
