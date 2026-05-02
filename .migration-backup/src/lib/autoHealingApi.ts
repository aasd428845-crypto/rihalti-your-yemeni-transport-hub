import { supabase } from "@/integrations/supabase/client";

export interface AutoHealingLog {
  id: string;
  action_type: string;
  entity_type?: string;
  entity_id?: string;
  description: string;
  status: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export async function getAutoHealingLogs(limit = 50): Promise<AutoHealingLog[]> {
  const { data } = await supabase
    .from("auto_healing_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data as any[]) || [];
}

export async function triggerAutoHealing(): Promise<any> {
  const { data, error } = await supabase.functions.invoke("auto-healing");
  if (error) throw error;
  return data;
}

export async function getSystemHealthStats() {
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

  const [
    stuckTrips,
    stuckShipments,
    stuckDeliveries,
    stuckRides,
    unresolvedErrors,
    healingToday,
  ] = await Promise.all([
    supabase.from("trips").select("id", { count: "exact", head: true }).eq("status", "pending").lt("created_at", oneHourAgo),
    supabase.from("shipment_requests").select("id", { count: "exact", head: true }).eq("status", "pending").lt("created_at", oneHourAgo),
    supabase.from("delivery_orders").select("id", { count: "exact", head: true }).eq("status", "pending").lt("created_at", oneHourAgo),
    supabase.from("ride_requests").select("id", { count: "exact", head: true }).eq("status", "pending").lt("created_at", oneHourAgo),
    supabase.from("error_logs").select("id", { count: "exact", head: true }).eq("is_resolved", false),
    supabase.from("auto_healing_logs").select("id", { count: "exact", head: true }).gte("created_at", oneDayAgo),
  ]);

  return {
    stuckTrips: stuckTrips.count || 0,
    stuckShipments: stuckShipments.count || 0,
    stuckDeliveries: stuckDeliveries.count || 0,
    stuckRides: stuckRides.count || 0,
    unresolvedErrors: unresolvedErrors.count || 0,
    healingActionsToday: healingToday.count || 0,
  };
}
