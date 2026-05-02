import React, { useEffect, useState, useCallback } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, ActivityIndicator, Alert, TextInput,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

const PRIMARY = "#0c7d4a";
const BG = "#f7f5f0";
const CARD = "#ffffff";
const BORDER = "#e5e7eb";
const MUTED = "#9ca3af";
const FG = "#1b2d45";

interface Address {
  id: string;
  label: string;
  address: string;
  is_default: boolean;
  created_at: string;
}

export default function AddressesScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("addresses" as any)
      .select("id, label, address, is_default, created_at")
      .eq("user_id", user.id)
      .order("is_default", { ascending: false });
    setAddresses((data || []) as Address[]);
    setLoading(false);
  }, [user]);

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };
  useEffect(() => { load(); }, [load]);

  const handleAdd = async () => {
    if (!newLabel.trim() || !newAddress.trim()) {
      Alert.alert("تنبيه", "أدخل اسم العنوان والعنوان التفصيلي");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("addresses" as any).insert({
      user_id: user?.id,
      label: newLabel.trim(),
      address: newAddress.trim(),
      is_default: addresses.length === 0,
    });
    if (error) Alert.alert("خطأ", "فشل إضافة العنوان");
    else {
      setNewLabel("");
      setNewAddress("");
      setAdding(false);
      load();
    }
    setSaving(false);
  };

  const handleDelete = (id: string) => {
    Alert.alert("حذف العنوان", "هل تريد حذف هذا العنوان؟", [
      { text: "إلغاء", style: "cancel" },
      {
        text: "حذف", style: "destructive", onPress: async () => {
          await supabase.from("addresses" as any).delete().eq("id", id);
          load();
        }
      },
    ]);
  };

  const handleSetDefault = async (id: string) => {
    if (!user) return;
    await supabase.from("addresses" as any).update({ is_default: false }).eq("user_id", user.id);
    await supabase.from("addresses" as any).update({ is_default: true }).eq("id", id);
    load();
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="chevron-right" size={22} color={FG} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>عناويني</Text>
        <TouchableOpacity onPress={() => setAdding(!adding)} style={styles.addBtn}>
          <Feather name={adding ? "x" : "plus"} size={20} color={PRIMARY} />
        </TouchableOpacity>
      </View>

      {/* Add Form */}
      {adding && (
        <View style={styles.addForm}>
          <TextInput
            style={styles.addInput}
            placeholder="اسم العنوان (مثال: المنزل، العمل)"
            placeholderTextColor={MUTED}
            value={newLabel}
            onChangeText={setNewLabel}
            textAlign="right"
          />
          <TextInput
            style={[styles.addInput, { marginTop: 8, minHeight: 60 }]}
            placeholder="العنوان التفصيلي"
            placeholderTextColor={MUTED}
            value={newAddress}
            onChangeText={setNewAddress}
            textAlign="right"
            multiline
          />
          <TouchableOpacity style={styles.saveBtn} onPress={handleAdd} disabled={saving} activeOpacity={0.8}>
            {saving
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={styles.saveBtnText}>حفظ العنوان</Text>
            }
          </TouchableOpacity>
        </View>
      )}

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={PRIMARY} size="large" /></View>
      ) : (
        <FlatList
          data={addresses}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Feather name="map-pin" size={44} color="#d1d5db" />
              <Text style={styles.emptyText}>لا توجد عناوين محفوظة</Text>
              <Text style={styles.emptySub}>اضغط + لإضافة عنوان جديد</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={[styles.card, item.is_default && styles.cardDefault]}>
              <View style={styles.cardIcon}>
                <Feather name={item.label.includes("منزل") || item.label.includes("بيت") ? "home" : item.label.includes("عمل") ? "briefcase" : "map-pin"} size={18} color={item.is_default ? "#fff" : PRIMARY} />
              </View>
              <View style={styles.cardBody}>
                <View style={styles.cardTopRow}>
                  <Text style={[styles.cardLabel, item.is_default && styles.textWhite]}>{item.label}</Text>
                  {item.is_default && (
                    <View style={styles.defaultBadge}>
                      <Text style={styles.defaultBadgeText}>افتراضي</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.cardAddress, item.is_default && styles.textWhiteOpacity]} numberOfLines={2}>{item.address}</Text>
              </View>
              <View style={styles.cardActions}>
                {!item.is_default && (
                  <TouchableOpacity onPress={() => handleSetDefault(item.id)} style={styles.actionBtn}>
                    <Feather name="check-circle" size={18} color={MUTED} />
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.actionBtn}>
                  <Feather name="trash-2" size={18} color={item.is_default ? "rgba(255,255,255,0.7)" : "#dc2626"} />
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12, backgroundColor: CARD, borderBottomWidth: 1, borderColor: BORDER },
  backBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: "center", alignItems: "center" },
  headerTitle: { fontSize: 18, fontWeight: "700", color: FG },
  addBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: PRIMARY + "15", justifyContent: "center", alignItems: "center" },
  addForm: { backgroundColor: CARD, padding: 16, borderBottomWidth: 1, borderColor: BORDER },
  addInput: { backgroundColor: BG, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: FG, borderWidth: 1, borderColor: BORDER },
  saveBtn: { backgroundColor: PRIMARY, borderRadius: 10, paddingVertical: 12, marginTop: 10, alignItems: "center" },
  saveBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  list: { padding: 16, gap: 10, flexGrow: 1 },
  card: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: CARD, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: BORDER, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  cardDefault: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  cardIcon: { width: 42, height: 42, borderRadius: 12, backgroundColor: PRIMARY + "18", justifyContent: "center", alignItems: "center", flexShrink: 0 },
  cardBody: { flex: 1 },
  cardTopRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 3 },
  cardLabel: { fontSize: 15, fontWeight: "700", color: FG },
  defaultBadge: { backgroundColor: "rgba(255,255,255,0.25)", borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2 },
  defaultBadgeText: { fontSize: 10, color: "#fff", fontWeight: "600" },
  cardAddress: { fontSize: 13, color: MUTED },
  textWhite: { color: "#fff" },
  textWhiteOpacity: { color: "rgba(255,255,255,0.75)" },
  cardActions: { flexDirection: "column", gap: 6, flexShrink: 0 },
  actionBtn: { width: 32, height: 32, justifyContent: "center", alignItems: "center" },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 80, gap: 10 },
  emptyText: { fontSize: 16, fontWeight: "600", color: MUTED },
  emptySub: { fontSize: 13, color: "#c0c4cc" },
});
