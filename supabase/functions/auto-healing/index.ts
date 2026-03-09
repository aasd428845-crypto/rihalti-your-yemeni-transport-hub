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

    const results: any[] = [];
    const now = new Date();

    // 1. Fix stuck trips (pending > 2 hours)
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString();
    const { data: stuckTrips } = await supabase
      .from("trips")
      .select("id, title, status, created_at")
      .eq("status", "pending")
      .lt("created_at", twoHoursAgo)
      .limit(50);

    if (stuckTrips && stuckTrips.length > 0) {
      for (const trip of stuckTrips) {
        await supabase
          .from("trips")
          .update({ status: "expired" } as any)
          .eq("id", trip.id);

        await supabase.from("auto_healing_logs").insert({
          action_type: "fix_stuck_trip",
          entity_type: "trip",
          entity_id: trip.id,
          description: `رحلة عالقة "${trip.title}" - تم تحويلها إلى منتهية الصلاحية`,
          status: "success",
          metadata: { original_status: trip.status, created_at: trip.created_at },
        } as any);
      }
      results.push({ type: "stuck_trips", fixed: stuckTrips.length });
    }

    // 2. Fix stuck shipment requests (pending > 4 hours)
    const fourHoursAgo = new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString();
    const { data: stuckShipments } = await supabase
      .from("shipment_requests")
      .select("id, status, created_at")
      .eq("status", "pending")
      .lt("created_at", fourHoursAgo)
      .limit(50);

    if (stuckShipments && stuckShipments.length > 0) {
      for (const s of stuckShipments) {
        await supabase
          .from("shipment_requests")
          .update({ status: "expired" } as any)
          .eq("id", s.id);

        await supabase.from("auto_healing_logs").insert({
          action_type: "fix_stuck_shipment",
          entity_type: "shipment_request",
          entity_id: s.id,
          description: `طلب شحن عالق - تم تحويله إلى منتهي الصلاحية`,
          status: "success",
        } as any);
      }
      results.push({ type: "stuck_shipments", fixed: stuckShipments.length });
    }

    // 3. Fix stuck delivery orders (pending > 3 hours)
    const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString();
    const { data: stuckDeliveries } = await supabase
      .from("delivery_orders")
      .select("id, status, created_at")
      .eq("status", "pending")
      .lt("created_at", threeHoursAgo)
      .limit(50);

    if (stuckDeliveries && stuckDeliveries.length > 0) {
      for (const d of stuckDeliveries) {
        await supabase
          .from("delivery_orders")
          .update({ status: "cancelled", cancellation_reason: "تجاوز الوقت المسموح - إصلاح تلقائي" })
          .eq("id", d.id);

        await supabase.from("auto_healing_logs").insert({
          action_type: "fix_stuck_delivery",
          entity_type: "delivery_order",
          entity_id: d.id,
          description: `طلب توصيل عالق - تم إلغاؤه تلقائياً`,
          status: "success",
        } as any);
      }
      results.push({ type: "stuck_deliveries", fixed: stuckDeliveries.length });
    }

    // 4. Fix stuck ride requests (pending > 30 minutes)
    const thirtyMinAgo = new Date(now.getTime() - 30 * 60 * 1000).toISOString();
    const { data: stuckRides } = await supabase
      .from("ride_requests")
      .select("id, status, created_at")
      .eq("status", "pending")
      .lt("created_at", thirtyMinAgo)
      .limit(50);

    if (stuckRides && stuckRides.length > 0) {
      for (const r of stuckRides) {
        await supabase
          .from("ride_requests")
          .update({ status: "expired" } as any)
          .eq("id", r.id);

        await supabase.from("auto_healing_logs").insert({
          action_type: "fix_stuck_ride",
          entity_type: "ride_request",
          entity_id: r.id,
          description: `طلب أجرة عالق - تم تحويله إلى منتهي الصلاحية`,
          status: "success",
        } as any);
      }
      results.push({ type: "stuck_rides", fixed: stuckRides.length });
    }

    // 5. Clean old unresolved errors (auto-resolve after 7 days)
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: oldErrors, count: oldErrorCount } = await supabase
      .from("error_logs")
      .select("id", { count: "exact" })
      .eq("is_resolved", false)
      .lt("created_at", sevenDaysAgo)
      .limit(100);

    if (oldErrors && oldErrors.length > 0) {
      const ids = oldErrors.map((e: any) => e.id);
      await supabase
        .from("error_logs")
        .update({ is_resolved: true, resolved_at: now.toISOString() } as any)
        .in("id", ids);

      await supabase.from("auto_healing_logs").insert({
        action_type: "auto_resolve_errors",
        entity_type: "error_log",
        description: `تم حل ${ids.length} خطأ قديم تلقائياً (أكثر من 7 أيام)`,
        status: "success",
        metadata: { count: ids.length },
      } as any);

      results.push({ type: "old_errors_resolved", fixed: ids.length });
    }

    // 6. Log system health event
    const totalFixed = results.reduce((s, r) => s + (r.fixed || 0), 0);
    if (totalFixed > 0) {
      await supabase.from("system_event_logs").insert({
        event_type: "auto_healing_completed",
        severity: "info",
        metadata: { results, total_fixed: totalFixed },
      } as any);
    }

    return new Response(
      JSON.stringify({ success: true, total_fixed: totalFixed, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
