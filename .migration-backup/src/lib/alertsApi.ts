import { supabase } from "@/integrations/supabase/client";

export interface AlertRule {
  id: string;
  rule_name: string;
  rule_type: string;
  condition: { metric?: string; operator?: string; value?: number };
  severity: string;
  notification_channels: string[];
  is_active: boolean;
  created_at: string;
}

export interface AlertHistoryItem {
  id: string;
  rule_id: string;
  triggered_at: string;
  metric_value: number;
  message: string;
  is_acknowledged: boolean;
  acknowledged_by?: string;
  acknowledged_at?: string;
  resolved_at?: string;
  metadata?: Record<string, any>;
  alert_rules?: { rule_name: string; severity: string } | null;
}

export async function getAlertRules(): Promise<AlertRule[]> {
  const { data } = await supabase
    .from("alert_rules")
    .select("*")
    .order("created_at", { ascending: false });
  return (data as any[]) || [];
}

export async function createAlertRule(rule: Partial<AlertRule>) {
  const { error } = await supabase.from("alert_rules").insert(rule as any);
  if (error) throw error;
}

export async function updateAlertRule(id: string, updates: Partial<AlertRule>) {
  const { error } = await supabase.from("alert_rules").update(updates as any).eq("id", id);
  if (error) throw error;
}

export async function deleteAlertRule(id: string) {
  const { error } = await supabase.from("alert_rules").delete().eq("id", id);
  if (error) throw error;
}

export async function getAlertHistory(limit = 50): Promise<AlertHistoryItem[]> {
  const { data } = await supabase
    .from("alert_history")
    .select("*, alert_rules(rule_name, severity)")
    .order("triggered_at", { ascending: false })
    .limit(limit);
  return (data as any[]) || [];
}

export async function acknowledgeAlert(id: string) {
  const { error } = await supabase
    .from("alert_history")
    .update({ is_acknowledged: true, acknowledged_at: new Date().toISOString() } as any)
    .eq("id", id);
  if (error) throw error;
}

export async function resolveAlert(id: string) {
  const { error } = await supabase
    .from("alert_history")
    .update({ is_acknowledged: true, resolved_at: new Date().toISOString() } as any)
    .eq("id", id);
  if (error) throw error;
}

export function subscribeToAlerts(onAlert: (a: AlertHistoryItem) => void) {
  const channel = supabase
    .channel("alerts-realtime")
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "alert_history" }, (payload) => {
      onAlert(payload.new as AlertHistoryItem);
    })
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}
