import React, { useEffect, useState, useCallback } from "react";
import {
  View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import colors from "@/constants/colors";

type UserRole = "customer" | "supplier" | "delivery_company" | "admin" | "driver" | "delivery_driver";

interface UserRoleRow {
  role: UserRole;
}

interface TxRow {
  id: string;
  platform_commission: number | null;
}

interface JoinReqRow {
  id: string;
}

interface AdminStats {
  totalUsers: number;
  customers: number;
  suppliers: number;
  deliveryCompanies: number;
  drivers: number;
  txMonth: number;
  txToday: number;
  platformEarnings: number;
  pendingJoinRequests: number;
  overdueInvoices: number;
}

const FEATHER_ICONS = {
  users: "users" as const,
  shopping_bag: "shopping-bag" as const,
  trending_up: "trending-up" as const,
  clock: "clock" as const,
  user_plus: "user-plus" as const,
  alert_triangle: "alert-triangle" as const,
};

export default function AdminOverview() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const today = new Date().toISOString().split("T")[0];
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

    const [{ data: roles }, { data: txMonth }, { data: txToday }, { data: joinReqs }, { data: invoices }] = await Promise.all([
      supabase.from("user_roles").select("role"),
      supabase.from("financial_transactions").select("id, platform_commission").gte("created_at", monthStart),
      supabase.from("financial_transactions").select("id").gte("created_at", today),
      supabase.from("partner_join_requests").select("id").eq("status", "pending"),
      supabase.from("partner_invoices").select("id").eq("status", "overdue"),
    ]);

    const roleList = (roles ?? []) as UserRoleRow[];
    const txList = (txMonth ?? []) as TxRow[];
    const roleCount = (role: UserRole) => roleList.filter(r => r.role === role).length;
    const earnings = txList.reduce((s, t) => s + Number(t.platform_commission ?? 0), 0);

    setStats({
      totalUsers: roleList.length,
      customers: roleCount("customer"),
      suppliers: roleCount("supplier"),
      deliveryCompanies: roleCount("delivery_company"),
      drivers: roleCount("delivery_driver") + roleCount("driver"),
      txMonth: (txMonth ?? []).length,
      txToday: (txToday ?? []).length,
      platformEarnings: earnings,
      pendingJoinRequests: (joinReqs ?? []).length,
      overdueInvoices: (invoices ?? []).length,
    });
    setLoading(false);
  }, []);

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };
  useEffect(() => { load(); }, [load]);

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={colors.light.primary} /></View>;

  const kpiCards = [
    { icon: FEATHER_ICONS.users, label: "إجمالي المستخدمين", value: stats!.totalUsers, color: "#3b82f6" },
    { icon: FEATHER_ICONS.shopping_bag, label: "معاملات الشهر", value: stats!.txMonth, color: colors.light.primary },
    { icon: FEATHER_ICONS.trending_up, label: "إيرادات المنصة", value: `${stats!.platformEarnings.toLocaleString()} ر.ي`, color: colors.light.accent },
    { icon: FEATHER_ICONS.clock, label: "معاملات اليوم", value: stats!.txToday, color: "#8b5cf6" },
  ];

  const roleCards = [
    { label: "العملاء", value: stats!.customers, color: "#06b6d4" },
    { label: "الشركات", value: stats!.deliveryCompanies, color: "#10b981" },
    { label: "الموردون", value: stats!.suppliers, color: "#f59e0b" },
    { label: "السائقون", value: stats!.drivers, color: "#6366f1" },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 100 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.light.primary} />}
    >
      {(stats!.pendingJoinRequests > 0 || stats!.overdueInvoices > 0) && (
        <View style={styles.alertsContainer}>
          {stats!.pendingJoinRequests > 0 && (
            <View style={styles.alertBox}>
              <Feather name={FEATHER_ICONS.user_plus} size={16} color="#f59e0b" />
              <Text style={styles.alertText}>{stats!.pendingJoinRequests} طلب انضمام معلق</Text>
            </View>
          )}
          {stats!.overdueInvoices > 0 && (
            <View style={[styles.alertBox, { backgroundColor: "#fee2e2" }]}>
              <Feather name={FEATHER_ICONS.alert_triangle} size={16} color="#dc2626" />
              <Text style={[styles.alertText, { color: "#dc2626" }]}>{stats!.overdueInvoices} فاتورة متأخرة</Text>
            </View>
          )}
        </View>
      )}

      <View style={styles.kpiGrid}>
        {kpiCards.map((k, i) => (
          <View key={i} style={styles.kpiCard}>
            <View style={[styles.kpiIcon, { backgroundColor: k.color + "22" }]}>
              <Feather name={k.icon} size={22} color={k.color} />
            </View>
            <Text style={styles.kpiVal}>{k.value}</Text>
            <Text style={styles.kpiLbl}>{k.label}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.sectionTitle}>توزيع الأدوار</Text>
      <View style={styles.rolesRow}>
        {roleCards.map((r, i) => (
          <View key={i} style={[styles.roleBox, { borderTopWidth: 3, borderTopColor: r.color }]}>
            <Text style={[styles.roleVal, { color: r.color }]}>{r.value}</Text>
            <Text style={styles.roleLbl}>{r.label}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.light.background },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  alertsContainer: { padding: 12, gap: 8 },
  alertBox: { backgroundColor: "#fef3c7", borderRadius: 10, padding: 12, flexDirection: "row", alignItems: "center", gap: 8 },
  alertText: { fontSize: 14, fontWeight: "600", color: "#92400e" },
  kpiGrid: { flexDirection: "row", flexWrap: "wrap", padding: 12, gap: 10 },
  kpiCard: { flex: 1, minWidth: "44%", backgroundColor: colors.light.card, borderRadius: 14, padding: 16, alignItems: "center", gap: 6, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 3 },
  kpiIcon: { width: 48, height: 48, borderRadius: 24, justifyContent: "center", alignItems: "center" },
  kpiVal: { fontSize: 22, fontWeight: "700", color: colors.light.foreground },
  kpiLbl: { fontSize: 12, color: colors.light.mutedForeground, textAlign: "center" },
  sectionTitle: { fontSize: 17, fontWeight: "700", color: colors.light.foreground, marginHorizontal: 16, marginVertical: 10, textAlign: "right" },
  rolesRow: { flexDirection: "row", marginHorizontal: 12, gap: 8 },
  roleBox: { flex: 1, backgroundColor: colors.light.card, borderRadius: 12, padding: 12, alignItems: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  roleVal: { fontSize: 20, fontWeight: "700" },
  roleLbl: { fontSize: 11, color: colors.light.mutedForeground, marginTop: 4 },
});
