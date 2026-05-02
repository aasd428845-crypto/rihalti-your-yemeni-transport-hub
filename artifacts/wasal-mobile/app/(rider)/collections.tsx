import React, { useEffect, useState, useCallback } from "react";
import {
  View, Text, StyleSheet, FlatList, RefreshControl, ActivityIndicator,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import colors from "@/constants/colors";

type CollectionStatus = "pending_pickup" | "collected" | "settled" | "cancelled";

interface OrderRef {
  restaurant_name: string | null;
  customer_address: string | null;
}

interface CollectionRow {
  id: string;
  status: CollectionStatus;
  amount: number;
  created_at: string;
  delivery_orders: OrderRef | null;
}

const STATUS: Record<CollectionStatus, { label: string; color: string }> = {
  pending_pickup: { label: "في انتظار الاستلام", color: "#f59e0b" },
  collected: { label: "تم الاستلام", color: "#3b82f6" },
  settled: { label: "تمت التسوية", color: "#16a34a" },
  cancelled: { label: "ملغي", color: "#dc2626" },
};

export default function RiderCollections() {
  const { user } = useAuth();
  const [collections, setCollections] = useState<CollectionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [totals, setTotals] = useState({ pending: 0, settled: 0 });

  const load = useCallback(async () => {
    if (!user) return;
    const { data: rider } = await supabase
      .from("riders")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!rider) { setLoading(false); return; }
    const { data } = await supabase
      .from("rider_cash_collections")
      .select("id, status, amount, created_at, delivery_orders(restaurant_name, customer_address)")
      .eq("rider_id", rider.id)
      .order("created_at", { ascending: false });
    const typed = (data ?? []) as CollectionRow[];
    setCollections(typed);
    const pending = typed
      .filter(c => c.status === "pending_pickup" || c.status === "collected")
      .reduce((s, c) => s + Number(c.amount), 0);
    const settled = typed
      .filter(c => c.status === "settled")
      .reduce((s, c) => s + Number(c.amount), 0);
    setTotals({ pending, settled });
    setLoading(false);
  }, [user]);

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };
  useEffect(() => { load(); }, [load]);

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={colors.light.primary} /></View>;

  return (
    <View style={styles.container}>
      <View style={styles.summaryRow}>
        <View style={[styles.summaryBox, { borderLeftWidth: 4, borderLeftColor: colors.light.accent }]}>
          <Text style={styles.summaryVal}>{totals.pending.toLocaleString()} ر.ي</Text>
          <Text style={styles.summaryLbl}>مبالغ معلقة</Text>
        </View>
        <View style={[styles.summaryBox, { borderLeftWidth: 4, borderLeftColor: colors.light.primary }]}>
          <Text style={styles.summaryVal}>{totals.settled.toLocaleString()} ر.ي</Text>
          <Text style={styles.summaryLbl}>تمت التسوية</Text>
        </View>
      </View>
      <FlatList
        data={collections}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.light.primary} />}
        contentContainerStyle={{ padding: 16, flexGrow: 1 }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="dollar-sign" size={48} color={colors.light.muted} />
            <Text style={styles.emptyText}>لا توجد تحصيلات</Text>
          </View>
        }
        renderItem={({ item }) => {
          const st = STATUS[item.status] ?? { label: item.status, color: colors.light.mutedForeground };
          return (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={[styles.status, { color: st.color }]}>{st.label}</Text>
                <Text style={styles.date}>{new Date(item.created_at).toLocaleDateString("ar-YE")}</Text>
              </View>
              <Text style={styles.restaurant}>{item.delivery_orders?.restaurant_name ?? "طلب"}</Text>
              <Text style={styles.address} numberOfLines={1}>{item.delivery_orders?.customer_address ?? "-"}</Text>
              <Text style={styles.amount}>{Number(item.amount).toLocaleString()} ر.ي</Text>
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
  summaryRow: { flexDirection: "row", padding: 12, gap: 12 },
  summaryBox: {
    flex: 1, backgroundColor: colors.light.card, borderRadius: 12, padding: 14,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  summaryVal: { fontSize: 20, fontWeight: "700", color: colors.light.foreground, textAlign: "right" },
  summaryLbl: { fontSize: 12, color: colors.light.mutedForeground, textAlign: "right", marginTop: 4 },
  card: {
    backgroundColor: colors.light.card, borderRadius: 12, padding: 16, marginBottom: 12,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 3,
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  status: { fontSize: 13, fontWeight: "700" },
  date: { fontSize: 12, color: colors.light.mutedForeground },
  restaurant: { fontSize: 16, fontWeight: "700", color: colors.light.foreground, textAlign: "right", marginBottom: 4 },
  address: { fontSize: 13, color: colors.light.mutedForeground, textAlign: "right", marginBottom: 10 },
  amount: { fontSize: 16, fontWeight: "700", color: colors.light.primary, textAlign: "right" },
  empty: { flex: 1, justifyContent: "center", alignItems: "center", paddingVertical: 60, gap: 12 },
  emptyText: { fontSize: 16, color: colors.light.mutedForeground },
});
