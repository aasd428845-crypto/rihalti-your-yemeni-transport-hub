import { supabase } from "@/integrations/supabase/client";

export interface LiveEvent {
  id: string;
  event_type: string;
  entity_id?: string;
  entity_type?: string;
  user_id?: string;
  metadata?: Record<string, any>;
  severity: string;
  created_at: string;
}

export interface ErrorLog {
  id: string;
  error_code?: string;
  error_message: string;
  stack_trace?: string;
  endpoint?: string;
  user_id?: string;
  severity: string;
  is_resolved: boolean;
  resolved_at?: string;
  created_at: string;
}

export interface SystemMetric {
  id: string;
  metric_name: string;
  metric_value: number;
  tags?: Record<string, any>;
  created_at: string;
}

export interface DailyStats {
  id: string;
  stat_date: string;
  total_users: number;
  new_users: number;
  total_trips: number;
  total_shipments: number;
  total_deliveries: number;
  total_rides: number;
  total_transactions: number;
  total_revenue: number;
  platform_commission: number;
  error_count: number;
}

// Fetch recent events
export async function getRecentEvents(limit = 50): Promise<LiveEvent[]> {
  const { data } = await supabase
    .from("system_event_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data as any[]) || [];
}

// Fetch recent errors
export async function getRecentErrors(limit = 50, unresolvedOnly = false): Promise<ErrorLog[]> {
  let q = supabase.from("error_logs").select("*").order("created_at", { ascending: false }).limit(limit);
  if (unresolvedOnly) q = q.eq("is_resolved", false);
  const { data } = await q;
  return (data as any[]) || [];
}

// Fetch system metrics for a given metric name (last N)
export async function getMetrics(metricName: string, limit = 60): Promise<SystemMetric[]> {
  const { data } = await supabase
    .from("system_metrics")
    .select("*")
    .eq("metric_name", metricName)
    .order("created_at", { ascending: false })
    .limit(limit);
  return ((data as any[]) || []).reverse();
}

// Fetch daily stats
export async function getDailyStats(days = 30): Promise<DailyStats[]> {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const { data } = await supabase
    .from("daily_performance_stats")
    .select("*")
    .gte("stat_date", since.toISOString().split("T")[0])
    .order("stat_date", { ascending: true });
  return (data as any[]) || [];
}

// Mark error as resolved
export async function resolveError(errorId: string) {
  await supabase.from("error_logs").update({ is_resolved: true, resolved_at: new Date().toISOString() } as any).eq("id", errorId);
}

// Get monitoring summary counts
export async function getMonitoringSummary() {
  const now = new Date();
  const today = now.toISOString().split("T")[0];
  const hourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();

  const [eventsToday, errorsUnresolved, errorsToday, eventsLastHour] = await Promise.all([
    supabase.from("system_event_logs").select("id", { count: "exact", head: true }).gte("created_at", today),
    supabase.from("error_logs").select("id", { count: "exact", head: true }).eq("is_resolved", false),
    supabase.from("error_logs").select("id", { count: "exact", head: true }).gte("created_at", today),
    supabase.from("system_event_logs").select("id", { count: "exact", head: true }).gte("created_at", hourAgo),
  ]);

  return {
    eventsToday: eventsToday.count || 0,
    unresolvedErrors: errorsUnresolved.count || 0,
    errorsToday: errorsToday.count || 0,
    eventsLastHour: eventsLastHour.count || 0,
  };
}

// Subscribe to realtime events
export function subscribeToEvents(onEvent: (e: LiveEvent) => void, onError: (e: ErrorLog) => void) {
  const channel = supabase
    .channel("monitoring-realtime")
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "system_event_logs" }, (payload) => {
      onEvent(payload.new as LiveEvent);
    })
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "error_logs" }, (payload) => {
      onError(payload.new as ErrorLog);
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
