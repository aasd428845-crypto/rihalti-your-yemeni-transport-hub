import React, { useEffect, useState, useCallback } from "react";
import {
  View, Text, StyleSheet, FlatList, RefreshControl, ActivityIndicator, TouchableOpacity,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import colors from "@/constants/colors";

export default function CompanyRiders() {
  const { user } = useAuth();
  const [riders, setRiders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("riders")
      .select("*, profiles(full_name, phone)")
      .eq("delivery_company_id", user.id)
      .order("created_at", { ascending: false });
    setRiders(data ?? []);
    setLoading(false);
  }, [user]);

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };
  useEffect(() => { load(); }, [load]);

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={colors.light.primary} /></View>;

  const onlineCount = riders.filter(r => r.is_online).length;

  return (
    <View style={styles.container}>
      <View style={styles.summary}>
        <View style={styles.summaryBox}>
          <Text style={styles.summaryVal}>{riders.length}</Text>
          <Text style={styles.summaryLbl}>إجمالي المندوبين</Text>
        </View>
        <View style={[styles.summaryBox, { borderColor: "#16a34a44" }]}>
          <Text style={[styles.summaryVal, { color: "#16a34a" }]}>{onlineCount}</Text>
          <Text style={styles.summaryLbl}>متصل الآن</Text>
        </View>
        <View style={[styles.summaryBox, { borderColor: "#dc262644" }]}>
          <Text style={[styles.summaryVal, { color: "#dc2626" }]}>{riders.length - onlineCount}</Text>
          <Text style={styles.summaryLbl}>غير متصل</Text>
        </View>
      </View>

      <FlatList
        data={riders}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.light.primary} />}
        contentContainerStyle={{ padding: 16, flexGrow: 1 }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="users" size={48} color={colors.light.muted} />
            <Text style={styles.emptyText}>لا يوجد مندوبون مسجلون</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardLeft}>
              <View style={[styles.onlineDot, { backgroundColor: item.is_online ? "#16a34a" : "#d1d5db" }]} />
              <View style={styles.avatarCircle}>
                <Feather name="user" size={22} color={colors.light.primary} />
              </View>
            </View>
            <View style={styles.cardBody}>
              <Text style={styles.riderName}>{item.full_name ?? item.profiles?.full_name ?? "مندوب"}</Text>
              <Text style={styles.riderPhone}>{item.phone ?? item.profiles?.phone ?? "-"}</Text>
              <Text style={styles.riderVehicle}>
                {item.vehicle_type ? `${item.vehicle_type} · ${item.vehicle_number ?? ""}` : "لا يوجد مركبة"}
              </Text>
            </View>
            <View style={styles.earningBox}>
              <Text style={styles.earningVal}>{Number(item.earnings ?? 0).toLocaleString()}</Text>
              <Text style={styles.earningLbl}>ر.ي</Text>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.light.background },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  summary: { flexDirection: "row", padding: 12, gap: 10 },
  summaryBox: { flex: 1, backgroundColor: colors.light.card, borderRadius: 12, padding: 12, alignItems: "center", borderWidth: 1, borderColor: colors.light.border },
  summaryVal: { fontSize: 22, fontWeight: "700", color: colors.light.primary },
  summaryLbl: { fontSize: 11, color: colors.light.mutedForeground, marginTop: 4, textAlign: "center" },
  card: { backgroundColor: colors.light.card, borderRadius: 12, padding: 14, marginBottom: 10, flexDirection: "row", alignItems: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  cardLeft: { position: "relative", marginLeft: 12 },
  onlineDot: { position: "absolute", top: 0, right: 0, width: 10, height: 10, borderRadius: 5, zIndex: 1, borderWidth: 2, borderColor: colors.light.card },
  avatarCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.light.muted, justifyContent: "center", alignItems: "center" },
  cardBody: { flex: 1 },
  riderName: { fontSize: 15, fontWeight: "700", color: colors.light.foreground, textAlign: "right" },
  riderPhone: { fontSize: 13, color: colors.light.mutedForeground, textAlign: "right", marginTop: 2 },
  riderVehicle: { fontSize: 12, color: colors.light.mutedForeground, textAlign: "right", marginTop: 2 },
  earningBox: { alignItems: "center", marginRight: 4 },
  earningVal: { fontSize: 15, fontWeight: "700", color: colors.light.primary },
  earningLbl: { fontSize: 11, color: colors.light.mutedForeground },
  empty: { flex: 1, justifyContent: "center", alignItems: "center", paddingVertical: 60, gap: 12 },
  emptyText: { fontSize: 16, color: colors.light.mutedForeground },
});
