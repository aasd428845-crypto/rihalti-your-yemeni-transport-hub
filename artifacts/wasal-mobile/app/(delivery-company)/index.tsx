import React, { useEffect, useState, useCallback } from "react";
import {
  View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import colors from "@/constants/colors";

type OrderStatus = "pending" | "accepted" | "preparing" | "on_the_way" | "delivered" | "cancelled";

interface OrderRow {
  id: string;
  status: OrderStatus;
  total: number | null;
  restaurant_name: string | null;
  customer_name: string | null;
  created_at: string;
  delivery_company_id: string | null;
}

interface RiderRow {
  id: string;
  is_online: boolean;
  delivery_company_id: string | null;
}

interface Stats {
  todayOrders: number;
  activeOrders: number;
  todayRevenue: number;
  onlineRiders: number;
  totalRiders: number;
  pendingOrders: number;
}

const STATUS_COLORS: Record<OrderStatus, string> = {
  pending: "#f59e0b",
  accepted: "#3b82f6",
  preparing: "#8b5cf6",
  on_the_way: "#06b6d4",
  delivered: "#16a34a",
  cancelled: "#dc2626",
};

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "انتظار",
  accepted: "مقبول",
  preparing: "تحضير",
  on_the_way: "في الطريق",
  delivered: "مُسلَّم",
  cancelled: "ملغي",
};

const STAT_ICONS = {
  shopping_bag: "shopping-bag" as const,
  clock: "clock" as const,
  alert_circle: "alert-circle" as const,
  users: "users" as const,
  dollar_sign: "dollar-sign" as const,
};

export default function DeliveryDashboard() {
  const { user, profile } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentOrders, setRecentOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    const today = new Date().toISOString().split("T")[0];

    const [{ data: todayOrders }, { data: allOrders }, { data: riders }] = await Promise.all([
      supabase
        .from("delivery_orders")
        .select("id, total, status, delivery_company_id")
        .eq("delivery_company_id", user.id)
        .gte("created_at", today),
      supabase
        .from("delivery_orders")
        .select("id, status, total, restaurant_name, customer_name, created_at, delivery_company_id")
        .eq("delivery_company_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("riders")
        .select("id, is_online, delivery_company_id")
        .eq("delivery_company_id", user.id),
    ]);

    const typedToday = (todayOrders ?? []) as Array<{ id: string; total: number | null; status: OrderStatus; delivery_company_id: string | null }>;
    const typedRiders = (riders ?? []) as RiderRow[];

    const active = typedToday.filter(o => o.status !== "delivered" && o.status !== "cancelled").length;
    const revenue = typedToday.reduce((s, o) => s + Number(o.total ?? 0), 0);
    const online = typedRiders.filter(r => r.is_online).length;
    const pending = typedToday.filter(o => o.status === "pending").length;

    setStats({
      todayOrders: typedToday.length,
      activeOrders: active,
      todayRevenue: revenue,
      onlineRiders: online,
      totalRiders: typedRiders.length,
      pendingOrders: pending,
    });
    setRecentOrders(((allOrders ?? []) as OrderRow[]).slice(0, 8));
    setLoading(false);
  }, [user]);

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };
  useEffect(() => { load(); }, [load]);

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={colors.light.primary} /></View>;

  const statBoxes = [
    { icon: STAT_ICONS.shopping_bag, label: "طلبات اليوم", value: stats!.todayOrders, color: "#3b82f6" },
    { icon: STAT_ICONS.clock, label: "نشطة", value: stats!.activeOrders, color: "#f59e0b" },
    { icon: STAT_ICONS.alert_circle, label: "معلقة", value: stats!.pendingOrders, color: "#dc2626" },
    { icon: STAT_ICONS.users, label: `${stats!.onlineRiders}/${stats!.totalRiders}`, value: "متصل", color: "#16a34a" },
    { icon: STAT_ICONS.dollar_sign, label: "إيرادات اليوم", value: `${stats!.todayRevenue.toLocaleString()} ر.ي`, color: "#10b981" },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 100 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.light.primary} />}
    >
      <View style={styles.banner}>
        <Text style={styles.bannerTitle}>أهلاً، {profile?.full_name?.split(" ")[0] ?? "شركة التوصيل"}</Text>
        <Text style={styles.bannerSub}>لوحة تحكم شركة التوصيل</Text>
      </View>

      <View style={styles.statsGrid}>
        {statBoxes.map((s, i) => (
          <View key={i} style={styles.statBox}>
            <View style={[styles.statIcon, { backgroundColor: s.color + "22" }]}>
              <Feather name={s.icon} size={20} color={s.color} />
            </View>
            <Text style={styles.statVal}>{s.value}</Text>
            <Text style={styles.statLbl}>{s.label}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.sectionTitle}>آخر الطلبات</Text>
      {recentOrders.map((o) => (
        <View key={o.id} style={styles.orderCard}>
          <View style={styles.orderHeader}>
            <View style={[styles.statusDot, { backgroundColor: STATUS_COLORS[o.status] ?? "#888" }]} />
            <Text style={[styles.orderStatus, { color: STATUS_COLORS[o.status] ?? "#888" }]}>
              {STATUS_LABELS[o.status] ?? o.status}
            </Text>
            <Text style={styles.orderDate}>{new Date(o.created_at).toLocaleDateString("ar-YE")}</Text>
          </View>
          <Text style={styles.orderName}>{o.restaurant_name ?? o.customer_name ?? "طلب"}</Text>
          <Text style={styles.orderAmount}>{o.total ? `${Number(o.total).toLocaleString()} ر.ي` : "-"}</Text>
        </View>
      ))}
      {recentOrders.length === 0 && (
        <View style={styles.empty}>
          <Feather name="inbox" size={40} color={colors.light.muted} />
          <Text style={styles.emptyText}>لا توجد طلبات حديثة</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.light.background },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  banner: { backgroundColor: colors.light.primary, padding: 20, marginHorizontal: 16, marginTop: 16, borderRadius: 16 },
  bannerTitle: { fontSize: 20, fontWeight: "700", color: "#fff" },
  bannerSub: { fontSize: 13, color: "rgba(255,255,255,0.75)", marginTop: 4 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", padding: 12, gap: 10 },
  statBox: {
    flex: 1, minWidth: "28%",
    backgroundColor: colors.light.card, borderRadius: 12, padding: 12, alignItems: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  statIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: "center", alignItems: "center", marginBottom: 8 },
  statVal: { fontSize: 18, fontWeight: "700", color: colors.light.foreground },
  statLbl: { fontSize: 11, color: colors.light.mutedForeground, textAlign: "center", marginTop: 2 },
  sectionTitle: { fontSize: 17, fontWeight: "700", color: colors.light.foreground, marginHorizontal: 16, marginVertical: 12, textAlign: "right" },
  orderCard: { marginHorizontal: 16, backgroundColor: colors.light.card, borderRadius: 12, padding: 14, marginBottom: 10, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  orderHeader: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginLeft: 6 },
  orderStatus: { fontSize: 12, fontWeight: "600", flex: 1 },
  orderDate: { fontSize: 11, color: colors.light.mutedForeground },
  orderName: { fontSize: 15, fontWeight: "600", color: colors.light.foreground, textAlign: "right" },
  orderAmount: { fontSize: 14, fontWeight: "700", color: colors.light.primary, textAlign: "right", marginTop: 4 },
  empty: { alignItems: "center", paddingVertical: 40, gap: 12 },
  emptyText: { fontSize: 15, color: colors.light.mutedForeground },
});
