import React, { useEffect, useState, useCallback } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Switch, RefreshControl, ActivityIndicator, Alert,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import colors from "@/constants/colors";

type OrderStatus = "pending" | "on_the_way" | "delivered";

interface OrderRow {
  id: string;
  status: OrderStatus;
  total: number | null;
  restaurant_name: string | null;
  customer_address: string | null;
  created_at: string;
}

interface RiderRow {
  id: string;
  is_online: boolean;
  earnings: number | null;
}

const STATUS_LABELS: Record<OrderStatus, { label: string; color: string; next?: OrderStatus; nextLabel?: string }> = {
  pending: { label: "قيد الانتظار", color: "#f59e0b", next: "on_the_way", nextLabel: "استلام الطلب" },
  on_the_way: { label: "في الطريق", color: "#3b82f6", next: "delivered", nextLabel: "تم التسليم" },
  delivered: { label: "تم التسليم", color: "#16a34a" },
};

export default function RiderOrders() {
  const { user } = useAuth();
  const [riderData, setRiderData] = useState<RiderRow | null>(null);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [isOnline, setIsOnline] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchRider = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("riders")
      .select("id, is_online, earnings")
      .eq("user_id", user.id)
      .maybeSingle();
    const typed = data as RiderRow | null;
    setRiderData(typed);
    setIsOnline(typed?.is_online ?? false);
  }, [user]);

  const fetchOrders = useCallback(async () => {
    if (!riderData?.id) return;
    const { data } = await supabase
      .from("delivery_orders")
      .select("id, status, total, restaurant_name, customer_address, created_at")
      .eq("rider_id", riderData.id)
      .in("status", ["pending", "on_the_way"])
      .order("created_at", { ascending: false });
    setOrders((data ?? []) as OrderRow[]);
  }, [riderData]);

  const load = useCallback(async () => {
    await fetchRider();
    setLoading(false);
  }, [fetchRider]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (riderData) fetchOrders(); }, [riderData, fetchOrders]);

  const toggleOnline = async (val: boolean) => {
    if (!riderData?.id) return;
    setIsOnline(val);
    await supabase.from("riders").update({ is_online: val }).eq("id", riderData.id);
  };

  const updateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
    Alert.alert("تأكيد", "هل تريد تغيير حالة الطلب؟", [
      { text: "إلغاء", style: "cancel" },
      {
        text: "تأكيد", onPress: async () => {
          await supabase.from("delivery_orders").update({ status: newStatus }).eq("id", orderId);
          fetchOrders();
        }
      },
    ]);
  };

  const onRefresh = async () => { setRefreshing(true); await fetchOrders(); setRefreshing(false); };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={colors.light.primary} /></View>;

  const renderItem = ({ item }: { item: OrderRow }) => {
    const st = STATUS_LABELS[item.status] ?? { label: item.status, color: colors.light.mutedForeground };
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={[styles.statusText, { color: st.color }]}>{st.label}</Text>
          <Text style={styles.date}>{new Date(item.created_at).toLocaleDateString("ar-YE")}</Text>
        </View>
        <Text style={styles.restaurant}>{item.restaurant_name ?? "طلب توصيل"}</Text>
        <Text style={styles.address}>{item.customer_address ?? "-"}</Text>
        <View style={styles.cardFooter}>
          <Text style={styles.amount}>{item.total ? `${item.total.toLocaleString()} ر.ي` : "-"}</Text>
          {st.next && (
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => updateOrderStatus(item.id, st.next!)}
              activeOpacity={0.8}
            >
              <Text style={styles.actionBtnText}>{st.nextLabel}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.onlineBar}>
        <Text style={styles.onlineLabel}>{isOnline ? "🟢 متصل الآن" : "🔴 غير متصل"}</Text>
        <Switch
          value={isOnline}
          onValueChange={toggleOnline}
          trackColor={{ true: colors.light.primary, false: colors.light.muted }}
          thumbColor="#fff"
        />
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statVal}>{orders.length}</Text>
          <Text style={styles.statLbl}>طلبات نشطة</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statVal}>{(riderData?.earnings ?? 0).toLocaleString()}</Text>
          <Text style={styles.statLbl}>الأرباح (ر.ي)</Text>
        </View>
      </View>

      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 16, flexGrow: 1 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.light.primary} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="inbox" size={48} color={colors.light.muted} />
            <Text style={styles.emptyText}>لا توجد طلبات نشطة</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.light.background },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  onlineBar: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: colors.light.card, padding: 16, borderBottomWidth: 1, borderBottomColor: colors.light.border,
  },
  onlineLabel: { fontSize: 16, fontWeight: "600", color: colors.light.foreground },
  statsRow: { flexDirection: "row", padding: 12, gap: 12, backgroundColor: colors.light.background },
  statBox: {
    flex: 1, backgroundColor: colors.light.card, borderRadius: 12, padding: 14, alignItems: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  statVal: { fontSize: 22, fontWeight: "700", color: colors.light.primary },
  statLbl: { fontSize: 12, color: colors.light.mutedForeground, marginTop: 4 },
  card: {
    backgroundColor: colors.light.card, borderRadius: 12, padding: 16, marginBottom: 12,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 3,
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  statusText: { fontSize: 13, fontWeight: "700" },
  date: { fontSize: 12, color: colors.light.mutedForeground },
  restaurant: { fontSize: 16, fontWeight: "700", color: colors.light.foreground, textAlign: "right", marginBottom: 4 },
  address: { fontSize: 13, color: colors.light.mutedForeground, textAlign: "right", marginBottom: 10 },
  cardFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderTopWidth: 1, borderTopColor: colors.light.border, paddingTop: 10 },
  amount: { fontSize: 15, fontWeight: "700", color: colors.light.primary },
  actionBtn: { backgroundColor: colors.light.primary, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  actionBtnText: { color: "#fff", fontWeight: "600", fontSize: 13 },
  empty: { flex: 1, justifyContent: "center", alignItems: "center", paddingVertical: 60, gap: 12 },
  emptyText: { fontSize: 16, color: colors.light.mutedForeground },
});
