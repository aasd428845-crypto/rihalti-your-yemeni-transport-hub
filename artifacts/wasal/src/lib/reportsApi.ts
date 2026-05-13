import { supabase } from "@/integrations/supabase/client";

export interface GeneratedReport {
  id: string;
  report_type: string;
  period_start: string;
  period_end: string;
  title: string;
  summary: any;
  file_url?: string;
  status: string;
  created_at: string;
}

export async function getGeneratedReports(limit = 50): Promise<GeneratedReport[]> {
  const { data } = await supabase
    .from("generated_reports")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data as any[]) || [];
}

export async function generateReport(reportType: string): Promise<any> {
  const { data, error } = await supabase.functions.invoke("generate-reports", {
    body: { report_type: reportType },
  });
  if (error) throw error;
  return data;
}

export async function deleteReport(id: string) {
  const { error } = await supabase.from("generated_reports").delete().eq("id", id);
  if (error) throw error;
}

export async function getReportStats(period: "daily" | "weekly" | "monthly" | "yearly") {
  const now = new Date();
  let periodStart: Date;
  switch (period) {
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
  const startStr = periodStart.toISOString();

  const [users, newUsers, trips, shipments, deliveries, rides, transactions, errors] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", startStr),
    supabase.from("trips").select("id", { count: "exact", head: true }).gte("created_at", startStr),
    supabase.from("shipment_requests").select("id", { count: "exact", head: true }).gte("created_at", startStr),
    supabase.from("delivery_orders").select("id", { count: "exact", head: true }).gte("created_at", startStr),
    supabase.from("ride_requests").select("id", { count: "exact", head: true }).gte("created_at", startStr),
    supabase.from("financial_transactions").select("amount, platform_commission, payment_status").gte("created_at", startStr),
    supabase.from("error_logs").select("id", { count: "exact", head: true }).gte("created_at", startStr),
  ]);

  const txData = (transactions.data || []) as any[];
  const totalRevenue = txData.reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const totalCommission = txData.reduce((s, t) => s + (Number(t.platform_commission) || 0), 0);

  return {
    totalUsers: users.count || 0,
    newUsers: newUsers.count || 0,
    trips: trips.count || 0,
    shipments: shipments.count || 0,
    deliveries: deliveries.count || 0,
    rides: rides.count || 0,
    totalTransactions: txData.length,
    totalRevenue,
    totalCommission,
    netRevenue: totalRevenue - totalCommission,
    errors: errors.count || 0,
  };
}
