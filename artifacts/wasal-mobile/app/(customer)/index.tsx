import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import colors from "@/constants/colors";

const SERVICE_ICONS: Record<string, string> = {
  مطاعم: "coffee",
  بقالة: "shopping-cart",
  صيدلية: "plus-circle",
  نقل: "truck",
};

export default function CustomerHome() {
  const { profile } = useAuth();
  const insets = useSafeAreaInsets();
  const [services, setServices] = useState<any[]>([]);
  const [cuisines, setCuisines] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [activeOrders, setActiveOrders] = useState(0);

  const load = async () => {
    const [{ data: s }, { data: c }, { data: o }] = await Promise.all([
      supabase.from("service_types").select("*").eq("is_active", true).order("sort_order"),
      supabase.from("restaurant_cuisines").select("*").eq("is_active", true).order("sort_order").limit(6),
      supabase.from("delivery_orders").select("id", { count: "exact" }).neq("status", "delivered"),
    ]);
    setServices(s ?? []);
    setCuisines(c ?? []);
    setActiveOrders(o?.length ?? 0);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  useEffect(() => { load(); }, []);

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingTop: 16, paddingBottom: 100 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.light.primary} />}
    >
      {/* Header Banner */}
      <View style={styles.banner}>
        <View>
          <Text style={styles.greeting}>مرحباً {profile?.full_name?.split(" ")[0] ?? ""}! 👋</Text>
          <Text style={styles.bannerSub}>تريد توصيل شيء؟</Text>
        </View>
        {activeOrders > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{activeOrders} طلب نشط</Text>
          </View>
        )}
      </View>

      {/* Services */}
      <Text style={styles.sectionTitle}>الخدمات</Text>
      <View style={styles.servicesGrid}>
        {(services.length > 0 ? services : [
          { id: "1", name_ar: "مطاعم" },
          { id: "2", name_ar: "بقالة" },
          { id: "3", name_ar: "صيدلية" },
          { id: "4", name_ar: "نقل" },
        ]).map((s: any) => (
          <TouchableOpacity key={s.id} style={styles.serviceCard} activeOpacity={0.75}>
            {s.image_url ? (
              <Image source={{ uri: s.image_url }} style={styles.serviceImg} />
            ) : (
              <View style={[styles.serviceImg, styles.serviceImgFallback]}>
                <Feather name={(SERVICE_ICONS[s.name_ar] ?? "box") as any} size={28} color={colors.light.primary} />
              </View>
            )}
            <Text style={styles.serviceLabel}>{s.name_ar}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Cuisines */}
      {cuisines.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>أنواع المطبخ</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.cuisineRow}>
            {cuisines.map((c: any) => (
              <TouchableOpacity key={c.id} style={styles.cuisineChip} activeOpacity={0.75}>
                {c.image_url ? (
                  <Image source={{ uri: c.image_url }} style={styles.cuisineImg} />
                ) : (
                  <View style={[styles.cuisineImg, styles.cuisineImgFallback]}>
                    <Feather name="star" size={20} color={colors.light.accent} />
                  </View>
                )}
                <Text style={styles.cuisineLabel}>{c.name_ar}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </>
      )}

      {/* Quick actions */}
      <Text style={styles.sectionTitle}>إجراءات سريعة</Text>
      <View style={styles.quickRow}>
        <TouchableOpacity style={styles.quickBtn} activeOpacity={0.8}>
          <Feather name="map-pin" size={20} color={colors.light.primary} />
          <Text style={styles.quickBtnText}>تتبع طلب</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.quickBtn} activeOpacity={0.8}>
          <Feather name="headphones" size={20} color={colors.light.accent} />
          <Text style={styles.quickBtnText}>الدعم</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.light.background },
  banner: {
    marginHorizontal: 16,
    backgroundColor: colors.light.primary,
    borderRadius: 16,
    padding: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  greeting: { fontSize: 20, fontWeight: "700", color: "#fff" },
  bannerSub: { fontSize: 13, color: "rgba(255,255,255,0.8)", marginTop: 2 },
  badge: { backgroundColor: colors.light.accent, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  badgeText: { color: "#fff", fontWeight: "700", fontSize: 12 },
  sectionTitle: { fontSize: 17, fontWeight: "700", color: colors.light.foreground, marginHorizontal: 16, marginBottom: 12, textAlign: "right" },
  servicesGrid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 12, gap: 12, marginBottom: 24 },
  serviceCard: {
    width: "45%",
    backgroundColor: colors.light.card,
    borderRadius: 14,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  serviceImg: { width: "100%", height: 100, resizeMode: "cover" },
  serviceImgFallback: { backgroundColor: "#e8f5ee", justifyContent: "center", alignItems: "center" },
  serviceLabel: { fontSize: 15, fontWeight: "600", color: colors.light.foreground, textAlign: "center", padding: 10 },
  cuisineRow: { paddingHorizontal: 16, marginBottom: 24 },
  cuisineChip: { alignItems: "center", marginRight: 12 },
  cuisineImg: { width: 70, height: 70, borderRadius: 35, resizeMode: "cover" },
  cuisineImgFallback: { backgroundColor: "#fef3c7", justifyContent: "center", alignItems: "center" },
  cuisineLabel: { fontSize: 12, fontWeight: "600", color: colors.light.foreground, marginTop: 6, textAlign: "center" },
  quickRow: { flexDirection: "row", marginHorizontal: 16, gap: 12 },
  quickBtn: {
    flex: 1,
    backgroundColor: colors.light.card,
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  quickBtnText: { fontSize: 14, fontWeight: "600", color: colors.light.foreground },
});
