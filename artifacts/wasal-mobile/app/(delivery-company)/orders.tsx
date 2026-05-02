import React, { useEffect, useState, useCallback } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, ActivityIndicator, Alert,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import colors from "@/constants/colors";

const STATUSES = [
  { key: "all", label: "الكل" },
  { key: "pending", label: "معلقة" },
  { key: "on_the_way", label: "في الطريق" },
  { key: "delivered", label: "مُسلَّمة" },
];

const STATUS_CONFIG: Record<string, { label: string; color: string; next?: string; nextLabel?: string }> = {
  pending: { label: "انتظار", color: "#f59e0b", next: "accepted", nextLabel: "قبول" },
  accepted: { label: "مقبول", color: "#3b82f6", next: "preparing", nextLabel: "تحضير" },
  preparing: { label: "تحضير", color: "#8b5cf6", next: "on_the_way", nextLabel: "تسليم للمندوب" },
  on_the_way: { label: "في الطريق", color: "#06b6d4" },
  delivered: { label: "مُسلَّم", color: "#16a34a" },
  cancelled: { label: "ملغي", color: "#dc2626" },
};

export default function CompanyOrders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    let q = supabase.from("delivery_orders").select("*").eq("delivery_company_id" as any, user.id).order("created_at", { ascending: false }).limit(100);
    if (filter !== "all") q = q.eq("status", filter);
    const { data } = await q;
    setOrders(data ?? []);
    setLoading(false);
  }, [user, filter]);

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };
  useEffect(() => { setLoading(true); load(); }, [load]);

  const updateStatus = (orderId: string, newStatus: string, label: string) => {
    Alert.alert("تأكيد", `تغيير الحالة إلى: ${label}؟`, [
      { text: "إلغاء", style: "cancel" },
      {
        text: "تأكيد", onPress: async () => {
          await supabase.from("delivery_orders").update({ status: newStatus }).eq("id", orderId);
          load();
        }
      },
    ]);
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={colors.light.primary} /></View>;

  return (
    <View style={styles.container}>
      {/* Filter tabs */}
      <View style={styles.filterRow}>
        {STATUSES.map(s => (
          <TouchableOpacity
            key={s.key}
            style={[styles.filterTab, filter === s.key && styles.filterTabActive]}
            onPress={() => setFilter(s.key)}
          >
            <Text style={[styles.filterTabText, filter === s.key && styles.filterTabTextActive]}>{s.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.light.primary} />}
        contentContainerStyle={{ padding: 16, flexGrow: 1 }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="inbox" size={48} color={colors.light.muted} />
            <Text style={styles.emptyText}>لا توجد طلبات</Text>
          </View>
        }
        renderItem={({ item }) => {
          const sc = STATUS_CONFIG[item.status] ?? { label: item.status, color: "#888" };
          return (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <Text style={[styles.statusBadge, { color: sc.color, borderColor: sc.color + "44", backgroundColor: sc.color + "11" }]}>{sc.label}</Text>
                <Text style={styles.date}>{new Date(item.created_at).toLocaleDateString("ar-YE")}</Text>
              </View>
              <Text style={styles.title}>{item.restaurant_name ?? item.customer_name ?? "طلب"}</Text>
              <Text style={styles.address} numberOfLines={1}>{item.customer_address ?? "-"}</Text>
              <View style={styles.cardFooter}>
                <Text style={styles.amount}>{item.total ? `${Number(item.total).toLocaleString()} ر.ي` : "-"}</Text>
                {sc.next && (
                  <TouchableOpacity style={styles.actionBtn} onPress={() => updateStatus(item.id, sc.next!, sc.nextLabel!)}>
                    <Text style={styles.actionBtnText}>{sc.nextLabel}</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.light.background },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  filterRow: { flexDirection: "row", backgroundColor: colors.light.card, paddingHorizontal: 12, paddingVertical: 8, gap: 8, borderBottomWidth: 1, borderBottomColor: colors.light.border },
  filterTab: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: colors.light.muted },
  filterTabActive: { backgroundColor: colors.light.primary },
  filterTabText: { fontSize: 13, color: colors.light.mutedForeground, fontWeight: "600" },
  filterTabTextActive: { color: "#fff" },
  card: { backgroundColor: colors.light.card, borderRadius: 12, padding: 14, marginBottom: 10, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  statusBadge: { fontSize: 12, fontWeight: "700", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
  date: { fontSize: 11, color: colors.light.mutedForeground },
  title: { fontSize: 16, fontWeight: "700", color: colors.light.foreground, textAlign: "right", marginBottom: 4 },
  address: { fontSize: 13, color: colors.light.mutedForeground, textAlign: "right", marginBottom: 10 },
  cardFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderTopWidth: 1, borderTopColor: colors.light.border, paddingTop: 10 },
  amount: { fontSize: 15, fontWeight: "700", color: colors.light.primary },
  actionBtn: { backgroundColor: colors.light.primary, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  actionBtnText: { color: "#fff", fontWeight: "600", fontSize: 13 },
  empty: { flex: 1, justifyContent: "center", alignItems: "center", paddingVertical: 60, gap: 12 },
  emptyText: { fontSize: 16, color: colors.light.mutedForeground },
});
