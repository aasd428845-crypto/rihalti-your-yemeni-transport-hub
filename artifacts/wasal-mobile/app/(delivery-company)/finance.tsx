import React, { useEffect, useState, useCallback } from "react";
import {
  View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import colors from "@/constants/colors";

export default function CompanyFinance() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState({
    totalRevenue: 0, monthRevenue: 0, pendingAmount: 0, invoices: [] as any[],
  });

  const load = useCallback(async () => {
    if (!user) return;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const [{ data: allTx }, { data: monthTx }, { data: invoices }] = await Promise.all([
      supabase.from("financial_transactions").select("amount, payment_status").eq("partner_id", user.id),
      supabase.from("financial_transactions").select("amount, payment_status").eq("partner_id", user.id).gte("created_at", monthStart),
      supabase.from("partner_invoices").select("*").eq("partner_id", user.id).order("created_at", { ascending: false }).limit(10),
    ]);

    const totalRevenue = (allTx ?? []).reduce((s: number, t: any) => s + Number(t.amount ?? 0), 0);
    const monthRevenue = (monthTx ?? []).reduce((s: number, t: any) => s + Number(t.amount ?? 0), 0);
    const pendingAmount = (invoices ?? []).filter((i: any) => ["pending", "overdue"].includes(i.status)).reduce((s: number, i: any) => s + Number(i.net_amount ?? 0), 0);

    setData({ totalRevenue, monthRevenue, pendingAmount, invoices: invoices ?? [] });
    setLoading(false);
  }, [user]);

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };
  useEffect(() => { load(); }, [load]);

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={colors.light.primary} /></View>;

  const INVOICE_STATUS: Record<string, { label: string; color: string }> = {
    pending: { label: "معلقة", color: "#f59e0b" },
    paid: { label: "مدفوعة", color: "#16a34a" },
    overdue: { label: "متأخرة", color: "#dc2626" },
    cancelled: { label: "ملغية", color: "#6b7280" },
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 100 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.light.primary} />}
    >
      {/* Revenue summary */}
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Feather name="trending-up" size={22} color={colors.light.primary} />
          <Text style={styles.statVal}>{data.totalRevenue.toLocaleString()}</Text>
          <Text style={styles.statLbl}>إجمالي الإيرادات (ر.ي)</Text>
        </View>
        <View style={styles.statBox}>
          <Feather name="calendar" size={22} color="#3b82f6" />
          <Text style={styles.statVal}>{data.monthRevenue.toLocaleString()}</Text>
          <Text style={styles.statLbl}>إيرادات الشهر</Text>
        </View>
      </View>
      {data.pendingAmount > 0 && (
        <View style={styles.alertBox}>
          <Feather name="alert-triangle" size={18} color="#dc2626" />
          <Text style={styles.alertText}>مستحقات معلقة: {data.pendingAmount.toLocaleString()} ر.ي</Text>
        </View>
      )}

      {/* Invoices */}
      <Text style={styles.sectionTitle}>الفواتير</Text>
      {data.invoices.length === 0 ? (
        <View style={styles.empty}>
          <Feather name="file-text" size={48} color={colors.light.muted} />
          <Text style={styles.emptyText}>لا توجد فواتير</Text>
        </View>
      ) : data.invoices.map((inv: any) => {
        const st = INVOICE_STATUS[inv.status] ?? { label: inv.status, color: "#888" };
        return (
          <View key={inv.id} style={styles.invoiceCard}>
            <View style={styles.invoiceTop}>
              <Text style={[styles.invoiceStatus, { color: st.color }]}>{st.label}</Text>
              <Text style={styles.invoiceNum}>{inv.invoice_number}</Text>
            </View>
            <View style={styles.invoiceRow}>
              <Text style={styles.invoiceLabel}>الفترة:</Text>
              <Text style={styles.invoiceVal}>{inv.period_start} — {inv.period_end}</Text>
            </View>
            <View style={styles.invoiceRow}>
              <Text style={styles.invoiceLabel}>الصافي:</Text>
              <Text style={[styles.invoiceVal, { color: colors.light.primary, fontWeight: "700" }]}>{Number(inv.net_amount).toLocaleString()} ر.ي</Text>
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.light.background },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  statsRow: { flexDirection: "row", padding: 12, gap: 12 },
  statBox: { flex: 1, backgroundColor: colors.light.card, borderRadius: 14, padding: 16, alignItems: "center", gap: 6, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  statVal: { fontSize: 20, fontWeight: "700", color: colors.light.foreground },
  statLbl: { fontSize: 11, color: colors.light.mutedForeground, textAlign: "center" },
  alertBox: { marginHorizontal: 16, marginBottom: 8, backgroundColor: "#fee2e2", borderRadius: 10, padding: 12, flexDirection: "row", alignItems: "center", gap: 8 },
  alertText: { fontSize: 14, fontWeight: "600", color: "#dc2626" },
  sectionTitle: { fontSize: 17, fontWeight: "700", color: colors.light.foreground, marginHorizontal: 16, marginVertical: 12, textAlign: "right" },
  invoiceCard: { marginHorizontal: 16, backgroundColor: colors.light.card, borderRadius: 12, padding: 14, marginBottom: 10, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  invoiceTop: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  invoiceStatus: { fontWeight: "700", fontSize: 13 },
  invoiceNum: { fontSize: 12, color: colors.light.mutedForeground },
  invoiceRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
  invoiceLabel: { fontSize: 13, color: colors.light.mutedForeground },
  invoiceVal: { fontSize: 13, color: colors.light.foreground },
  empty: { alignItems: "center", paddingVertical: 40, gap: 12 },
  emptyText: { fontSize: 16, color: colors.light.mutedForeground },
});
