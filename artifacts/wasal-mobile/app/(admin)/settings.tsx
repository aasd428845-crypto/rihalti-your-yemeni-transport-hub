import React, { useEffect, useState, useCallback } from "react";
import {
  View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator, TouchableOpacity, Alert,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import colors from "@/constants/colors";

export default function AdminSettings() {
  const { signOut } = useAuth();
  const [settings, setSettings] = useState<any[]>([]);
  const [accounting, setAccounting] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const [{ data: s }, { data: a }] = await Promise.all([
      supabase.from("admin_settings").select("*").order("key"),
      supabase.from("accounting_settings").select("*").eq("id", 1 as any).maybeSingle(),
    ]);
    setSettings(s ?? []);
    setAccounting(a);
    setLoading(false);
  }, []);

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };
  useEffect(() => { load(); }, [load]);

  const handleLogout = () => {
    Alert.alert("تسجيل الخروج", "هل تريد تسجيل الخروج؟", [
      { text: "إلغاء", style: "cancel" },
      { text: "خروج", style: "destructive", onPress: signOut },
    ]);
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={colors.light.primary} /></View>;

  const commRows = accounting ? [
    { label: "عمولة الحجز", value: `${accounting.global_commission_booking ?? 0}%` },
    { label: "عمولة التوصيل", value: `${accounting.global_commission_delivery ?? 0}%` },
    { label: "عمولة الشحن", value: `${accounting.global_commission_shipment ?? 0}%` },
    { label: "أيام الاستحقاق", value: `${accounting.payment_due_days ?? 0} يوم` },
    { label: "أيام الإيقاف التلقائي", value: `${accounting.auto_suspend_days ?? 0} يوم` },
  ] : [];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 100 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.light.primary} />}
    >
      {/* Accounting */}
      {accounting && (
        <>
          <Text style={styles.sectionTitle}>إعدادات العمولات</Text>
          <View style={styles.card}>
            {commRows.map((r, i) => (
              <View key={i} style={[styles.row, i < commRows.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.light.border }]}>
                <Text style={styles.rowVal}>{r.value}</Text>
                <Text style={styles.rowLbl}>{r.label}</Text>
              </View>
            ))}
          </View>
        </>
      )}

      {/* Settings */}
      {settings.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>إعدادات النظام</Text>
          <View style={styles.card}>
            {settings.map((s: any, i: number) => (
              <View key={s.id} style={[styles.row, i < settings.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.light.border }]}>
                <Text style={styles.rowVal} numberOfLines={1}>{s.value}</Text>
                <Text style={styles.rowLbl}>{s.key}</Text>
              </View>
            ))}
          </View>
        </>
      )}

      {/* App info */}
      <Text style={styles.sectionTitle}>معلومات التطبيق</Text>
      <View style={styles.card}>
        {[
          { label: "الإصدار", value: "1.0.0" },
          { label: "المنصة", value: "وصال للنقل الذكي" },
        ].map((r, i) => (
          <View key={i} style={[styles.row, i === 0 && { borderBottomWidth: 1, borderBottomColor: colors.light.border }]}>
            <Text style={styles.rowVal}>{r.value}</Text>
            <Text style={styles.rowLbl}>{r.label}</Text>
          </View>
        ))}
      </View>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
        <Text style={styles.logoutText}>تسجيل الخروج</Text>
        <Feather name="log-out" size={18} color={colors.light.destructive} />
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.light.background },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  sectionTitle: { fontSize: 17, fontWeight: "700", color: colors.light.foreground, marginHorizontal: 16, marginVertical: 12, textAlign: "right" },
  card: { marginHorizontal: 16, backgroundColor: colors.light.card, borderRadius: 14, paddingHorizontal: 16, marginBottom: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 14 },
  rowLbl: { fontSize: 14, color: colors.light.mutedForeground },
  rowVal: { fontSize: 14, fontWeight: "600", color: colors.light.foreground, flex: 1, textAlign: "right", marginLeft: 12 },
  logoutBtn: { marginHorizontal: 16, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8, backgroundColor: colors.light.card, borderRadius: 12, paddingVertical: 16, borderWidth: 1, borderColor: colors.light.destructive + "44" },
  logoutText: { fontSize: 16, fontWeight: "600", color: colors.light.destructive },
});
