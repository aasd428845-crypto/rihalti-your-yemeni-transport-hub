import React, { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, Image,
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

const ROLE_LABELS: Record<string, string> = {
  customer: "عميل",
  admin: "مشرف",
  supplier: "شريك نقل",
  delivery_company: "شركة توصيل",
  driver: "سائق",
  delivery_driver: "سائق توصيل",
};

export default function ProfileScreen() {
  const { user, profile, role, signOut, refreshProfile } = useAuth() as any;
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [phone, setPhone] = useState(profile?.phone || "");
  const [city, setCity] = useState(profile?.city || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName, phone, city })
      .eq("user_id", user.id);
    if (error) {
      Alert.alert("خطأ", "فشل حفظ البيانات");
    } else {
      if (refreshProfile) await refreshProfile();
      setEditing(false);
      Alert.alert("تم", "تم حفظ البيانات بنجاح");
    }
    setSaving(false);
  };

  const handleSignOut = () => {
    Alert.alert("تسجيل الخروج", "هل أنت متأكد؟", [
      { text: "إلغاء", style: "cancel" },
      { text: "خروج", style: "destructive", onPress: signOut },
    ]);
  };

  const initials = profile?.full_name?.[0] || user?.email?.[0]?.toUpperCase() || "؟";

  return (
    <ScrollView
      style={[styles.container, { paddingTop: insets.top }]}
      contentContainerStyle={{ paddingBottom: 90 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Profile Card */}
      <View style={styles.profileCard}>
        <View style={styles.avatarBox}>
          {profile?.avatar_url
            ? <Image source={{ uri: profile.avatar_url }} style={styles.avatarImg} />
            : <Text style={styles.avatarInitial}>{initials}</Text>
          }
        </View>
        <Text style={styles.profileName}>{profile?.full_name || "مستخدم وصال"}</Text>
        <Text style={styles.profileEmail}>{user?.email}</Text>
        {role && (
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>{ROLE_LABELS[role] || role}</Text>
          </View>
        )}
      </View>

      {/* Edit toggle */}
      <View style={styles.sectionRow}>
        <Text style={styles.sectionTitle}>بياناتي</Text>
        <TouchableOpacity
          style={styles.editBtn}
          onPress={() => editing ? handleSave() : setEditing(true)}
        >
          {saving
            ? <ActivityIndicator size="small" color={PRIMARY} />
            : <Text style={styles.editBtnText}>{editing ? "💾 حفظ" : "✏️ تعديل"}</Text>
          }
        </TouchableOpacity>
      </View>

      <View style={styles.formCard}>
        <View style={styles.formRow}>
          <Feather name="user" size={16} color={MUTED} />
          <Text style={styles.formLabel}>الاسم</Text>
          {editing
            ? <TextInput style={styles.formInput} value={fullName} onChangeText={setFullName} textAlign="right" placeholder="الاسم الكامل" placeholderTextColor={MUTED} />
            : <Text style={styles.formValue}>{profile?.full_name || "-"}</Text>
          }
        </View>
        <View style={[styles.formRow, styles.rowBorder]}>
          <Feather name="mail" size={16} color={MUTED} />
          <Text style={styles.formLabel}>البريد</Text>
          <Text style={[styles.formValue, { color: MUTED }]}>{user?.email || "-"}</Text>
        </View>
        <View style={[styles.formRow, styles.rowBorder]}>
          <Feather name="phone" size={16} color={MUTED} />
          <Text style={styles.formLabel}>الهاتف</Text>
          {editing
            ? <TextInput style={styles.formInput} value={phone} onChangeText={setPhone} textAlign="right" placeholder="05XXXXXXXX" placeholderTextColor={MUTED} keyboardType="phone-pad" />
            : <Text style={styles.formValue}>{profile?.phone || "-"}</Text>
          }
        </View>
        <View style={[styles.formRow, styles.rowBorder]}>
          <Feather name="map-pin" size={16} color={MUTED} />
          <Text style={styles.formLabel}>المدينة</Text>
          {editing
            ? <TextInput style={styles.formInput} value={city} onChangeText={setCity} textAlign="right" placeholder="المدينة" placeholderTextColor={MUTED} />
            : <Text style={styles.formValue}>{profile?.city || "-"}</Text>
          }
        </View>
      </View>

      {/* Quick links */}
      <Text style={styles.sectionTitle2}>الإجراءات السريعة</Text>
      <View style={styles.formCard}>
        {[
          { icon: "clock", label: "سجل الطلبات", onPress: () => router.push("/(customer)/orders") },
          { icon: "bell", label: "الإشعارات", onPress: () => router.push("/(customer)/notifications") },
          { icon: "menu", label: "المزيد", onPress: () => router.push("/(customer)/more") },
        ].map((item, i) => (
          <TouchableOpacity
            key={item.label}
            style={[styles.formRow, i > 0 && styles.rowBorder]}
            onPress={item.onPress}
            activeOpacity={0.7}
          >
            <Feather name="chevron-left" size={16} color={MUTED} />
            <Text style={[styles.formValue, { color: FG }]}>{item.label}</Text>
            <Feather name={item.icon as any} size={16} color={MUTED} />
          </TouchableOpacity>
        ))}
      </View>

      {/* Sign out */}
      <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut} activeOpacity={0.8}>
        <Feather name="log-out" size={16} color="#dc2626" />
        <Text style={styles.signOutText}>تسجيل الخروج</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  profileCard: { alignItems: "center", paddingVertical: 28, paddingHorizontal: 20, backgroundColor: CARD, borderBottomWidth: 1, borderColor: BORDER },
  avatarBox: { width: 80, height: 80, borderRadius: 40, backgroundColor: PRIMARY, justifyContent: "center", alignItems: "center", marginBottom: 10, overflow: "hidden", shadowColor: PRIMARY, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  avatarImg: { width: 80, height: 80 },
  avatarInitial: { fontSize: 32, fontWeight: "700", color: "#fff" },
  profileName: { fontSize: 20, fontWeight: "700", color: FG, marginBottom: 3 },
  profileEmail: { fontSize: 13, color: MUTED },
  roleBadge: { marginTop: 8, backgroundColor: PRIMARY + "18", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 4 },
  roleBadgeText: { fontSize: 12, fontWeight: "600", color: PRIMARY },
  sectionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 20, paddingBottom: 8 },
  sectionTitle: { fontSize: 14, fontWeight: "700", color: MUTED, textAlign: "right" },
  sectionTitle2: { fontSize: 14, fontWeight: "700", color: MUTED, textAlign: "right", paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  editBtn: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: PRIMARY + "12", borderRadius: 10 },
  editBtnText: { fontSize: 13, color: PRIMARY, fontWeight: "600" },
  formCard: { marginHorizontal: 16, backgroundColor: CARD, borderRadius: 16, borderWidth: 1, borderColor: BORDER, overflow: "hidden", shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 6, elevation: 1, marginBottom: 4 },
  formRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 14 },
  rowBorder: { borderTopWidth: 1, borderColor: BORDER },
  formLabel: { fontSize: 13, color: MUTED, width: 52, textAlign: "right" },
  formValue: { flex: 1, fontSize: 15, fontWeight: "600", color: FG, textAlign: "right" },
  formInput: { flex: 1, fontSize: 15, color: FG, borderBottomWidth: 1.5, borderColor: PRIMARY, paddingVertical: 2 },
  signOutBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: CARD, borderRadius: 14, paddingVertical: 15, marginHorizontal: 16, marginTop: 16, borderWidth: 1, borderColor: "#fca5a5" },
  signOutText: { fontSize: 15, fontWeight: "600", color: "#dc2626" },
});
