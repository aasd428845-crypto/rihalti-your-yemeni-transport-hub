import React, { useEffect, useState, useCallback } from "react";
import {
  View, Text, StyleSheet, FlatList, RefreshControl, ActivityIndicator,
  TouchableOpacity, TextInput,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import colors from "@/constants/colors";

const ROLE_CONFIG: Record<string, { label: string; color: string }> = {
  customer: { label: "عميل", color: "#3b82f6" },
  supplier: { label: "مورد", color: "#f59e0b" },
  delivery_company: { label: "شركة توصيل", color: "#10b981" },
  delivery_driver: { label: "مندوب", color: "#8b5cf6" },
  driver: { label: "سائق", color: "#6366f1" },
  admin: { label: "مشرف", color: "#dc2626" },
};

export default function AdminUsers() {
  interface UserListItem {
    user_id: string;
    role: string;
    name: string;
    phone: string;
    city: string;
    status: string;
  }
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [filtered, setFiltered] = useState<UserListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("user_roles")
      .select("user_id, role, profiles(full_name, phone, city, account_status)")
      .limit(100);
    type ProfileRef = { full_name: string | null; phone: string | null; city: string | null; account_status: string | null };
    type UserRoleRow = { user_id: string; role: string; profiles: ProfileRef[] | ProfileRef | null };
    const list = ((data ?? []) as unknown as UserRoleRow[]).map((u) => {
      const profile = Array.isArray(u.profiles) ? u.profiles[0] : u.profiles;
      return {
        user_id: u.user_id,
        role: u.role,
        name: profile?.full_name ?? "-",
        phone: profile?.phone ?? "-",
        city: profile?.city ?? "-",
        status: profile?.account_status ?? "active",
      };
    });
    setUsers(list);
    setFiltered(list);
    setLoading(false);
  }, []);

  const onSearch = (q: string) => {
    setSearch(q);
    if (!q.trim()) { setFiltered(users); return; }
    setFiltered(users.filter(u => u.name.includes(q) || u.phone.includes(q) || u.city.includes(q)));
  };

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };
  useEffect(() => { load(); }, [load]);

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={colors.light.primary} /></View>;

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <Feather name="search" size={18} color={colors.light.mutedForeground} />
        <TextInput
          style={styles.searchInput}
          placeholder="بحث بالاسم أو الهاتف أو المدينة"
          placeholderTextColor={colors.light.mutedForeground}
          value={search}
          onChangeText={onSearch}
          textAlign="right"
        />
      </View>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.user_id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.light.primary} />}
        contentContainerStyle={{ padding: 16, flexGrow: 1 }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="users" size={48} color={colors.light.muted} />
            <Text style={styles.emptyText}>لا يوجد مستخدمون</Text>
          </View>
        }
        renderItem={({ item }) => {
          const rc = ROLE_CONFIG[item.role] ?? { label: item.role, color: "#888" };
          return (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <View style={[styles.roleBadge, { backgroundColor: rc.color + "22" }]}>
                  <Text style={[styles.roleBadgeText, { color: rc.color }]}>{rc.label}</Text>
                </View>
                <View style={[styles.statusDot, { backgroundColor: item.status === "active" ? "#16a34a" : "#f59e0b" }]} />
              </View>
              <Text style={styles.name}>{item.name}</Text>
              <View style={styles.infoRow}>
                <Feather name="phone" size={13} color={colors.light.mutedForeground} />
                <Text style={styles.infoText}>{item.phone}</Text>
                {item.city !== "-" && (
                  <>
                    <Feather name="map-pin" size={13} color={colors.light.mutedForeground} style={{ marginRight: 8 }} />
                    <Text style={styles.infoText}>{item.city}</Text>
                  </>
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
  searchBar: { flexDirection: "row", alignItems: "center", backgroundColor: colors.light.card, margin: 12, borderRadius: 10, paddingHorizontal: 12, borderWidth: 1, borderColor: colors.light.border, gap: 8 },
  searchInput: { flex: 1, height: 44, fontSize: 14, color: colors.light.foreground },
  card: { backgroundColor: colors.light.card, borderRadius: 12, padding: 14, marginBottom: 10, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  roleBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  roleBadgeText: { fontSize: 12, fontWeight: "700" },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  name: { fontSize: 16, fontWeight: "700", color: colors.light.foreground, textAlign: "right", marginBottom: 8 },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  infoText: { fontSize: 13, color: colors.light.mutedForeground },
  empty: { flex: 1, justifyContent: "center", alignItems: "center", paddingVertical: 60, gap: 12 },
  emptyText: { fontSize: 16, color: colors.light.mutedForeground },
});
