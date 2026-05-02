import React, { useEffect, useState, useCallback } from "react";
import {
  View, Text, StyleSheet, FlatList,
  RefreshControl, ActivityIndicator,
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
  customer_address: string | null;
  payment_method: string | null;
  created_at: string;
}

const STATUS_LABELS: Record<OrderStatus, { label: string; color: string }> = {
  pending: { label: "قيد الانتظار", color: "#f59e0b" },
  accepted: { label: "تم القبول", color: "#3b82f6" },
  preparing: { label: "جاري التحضير", color: "#8b5cf6" },
  on_the_way: { label: "في الطريق", color: "#06b6d4" },
  delivered: { label: "تم التسليم", color: "#16a34a" },
  cancelled: { label: "ملغي", color: "#dc2626" },
};

export default function CustomerOrders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("delivery_orders")
      .select("id, status, total, restaurant_name, customer_address, payment_method, created_at")
      .eq("customer_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);
    setOrders((data ?? []) as OrderRow[]);
    setLoading(false);
  }, [user]);

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };
  useEffect(() => { load(); }, [load]);

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={colors.light.primary} /></View>;

  const renderItem = ({ item }: { item: OrderRow }) => {
    const st = STATUS_LABELS[item.status] ?? { label: item.status, color: colors.light.mutedForeground };
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={[styles.statusDot, { backgroundColor: st.color }]} />
          <Text style={[styles.statusText, { color: st.color }]}>{st.label}</Text>
          <Text style={styles.date}>
            {new Date(item.created_at).toLocaleDateString("ar-YE", { day: "numeric", month: "short" })}
          </Text>
        </View>
        <Text style={styles.restaurant}>{item.restaurant_name ?? "طلب توصيل"}</Text>
        <Text style={styles.address} numberOfLines={1}>{item.customer_address ?? "-"}</Text>
        <View style={styles.cardFooter}>
          <Text style={styles.amount}>{item.total ? `${item.total.toLocaleString()} ر.ي` : "-"}</Text>
          <Text style={styles.payMethod}>
            {item.payment_method === "cash" ? "💵 كاش" : item.payment_method ?? "-"}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <FlatList
      data={orders}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      contentContainerStyle={styles.list}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.light.primary} />}
      ListEmptyComponent={
        <View style={styles.empty}>
          <Feather name="shopping-bag" size={48} color={colors.light.muted} />
          <Text style={styles.emptyText}>لا يوجد طلبات حتى الآن</Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.light.background },
  list: { padding: 16, backgroundColor: colors.light.background, flexGrow: 1 },
  card: {
    backgroundColor: colors.light.card, borderRadius: 12, padding: 16, marginBottom: 12,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 3,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginLeft: 6 },
  statusText: { fontSize: 13, fontWeight: "600", flex: 1 },
  date: { fontSize: 12, color: colors.light.mutedForeground },
  restaurant: { fontSize: 16, fontWeight: "700", color: colors.light.foreground, textAlign: "right", marginBottom: 4 },
  address: { fontSize: 13, color: colors.light.mutedForeground, textAlign: "right", marginBottom: 10 },
  cardFooter: { flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: colors.light.border, paddingTop: 10 },
  amount: { fontSize: 15, fontWeight: "700", color: colors.light.primary },
  payMethod: { fontSize: 13, color: colors.light.mutedForeground },
  empty: { flex: 1, justifyContent: "center", alignItems: "center", paddingVertical: 60, gap: 12 },
  emptyText: { fontSize: 16, color: colors.light.mutedForeground },
});
