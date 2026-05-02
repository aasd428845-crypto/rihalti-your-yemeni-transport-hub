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

export default function AccountScreen() {
  const { user, profile, refreshProfile } = useAuth() as any;
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

  const handlePasswordReset = async () => {
    if (!user?.email) return;
    Alert.alert("إعادة تعيين كلمة المرور", "سيتم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني", [
      { text: "إلغاء", style: "cancel" },
      {
        text: "إرسال",
        onPress: async () => {
          await supabase.auth.resetPasswordForEmail(user.email!);
          Alert.alert("تم الإرسال", "تحقق من بريدك الإلكتروني");
        },
      },
    ]);
  };

  const initials = profile?.full_name?.[0] || user?.email?.[0]?.toUpperCase() || "؟";

  return (
    <ScrollView style={[styles.container, { paddingTop: insets.top }]} contentContainerStyle={{ paddingBottom: 80 }} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="chevron-right" size={22} color={FG} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>إعدادات الحساب</Text>
        <TouchableOpacity onPress={() => editing ? handleSave() : setEditing(true)} style={styles.editBtn}>
          {saving ? <ActivityIndicator size="small" color={PRIMARY} /> : <Text style={styles.editBtnText}>{editing ? "حفظ" : "تعديل"}</Text>}
        </TouchableOpacity>
      </View>

      {/* Avatar */}
      <View style={styles.avatarSection}>
        <View style={styles.avatarBox}>
          {profile?.avatar_url
            ? <Image source={{ uri: profile.avatar_url }} style={styles.avatarImg} />
            : <Text style={styles.avatarInitial}>{initials}</Text>
          }
        </View>
        <Text style={styles.avatarName}>{profile?.full_name || "مستخدم وصال"}</Text>
        <Text style={styles.avatarEmail}>{user?.email}</Text>
      </View>

      {/* Form */}
      <View style={styles.formCard}>
        <View style={styles.formRow}>
          <Text style={styles.formLabel}>الاسم الكامل</Text>
          {editing ? (
            <TextInput
              style={styles.formInput}
              value={fullName}
              onChangeText={setFullName}
              placeholder="أدخل اسمك"
              placeholderTextColor={MUTED}
              textAlign="right"
            />
          ) : (
            <Text style={styles.formValue}>{profile?.full_name || "-"}</Text>
          )}
        </View>

        <View style={[styles.formRow, styles.rowBorder]}>
          <Text style={styles.formLabel}>البريد الإلكتروني</Text>
          <Text style={[styles.formValue, { color: MUTED }]}>{user?.email || "-"}</Text>
        </View>

        <View style={[styles.formRow, styles.rowBorder]}>
          <Text style={styles.formLabel}>رقم الهاتف</Text>
          {editing ? (
            <TextInput
              style={styles.formInput}
              value={phone}
              onChangeText={setPhone}
              placeholder="05XXXXXXXX"
              placeholderTextColor={MUTED}
              keyboardType="phone-pad"
              textAlign="right"
            />
          ) : (
            <Text style={styles.formValue}>{profile?.phone || "-"}</Text>
          )}
        </View>

        <View style={[styles.formRow, styles.rowBorder]}>
          <Text style={styles.formLabel}>المدينة</Text>
          {editing ? (
            <TextInput
              style={styles.formInput}
              value={city}
              onChangeText={setCity}
              placeholder="أدخل مدينتك"
              placeholderTextColor={MUTED}
              textAlign="right"
            />
          ) : (
            <Text style={styles.formValue}>{profile?.city || "-"}</Text>
          )}
        </View>
      </View>

      {/* Security */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>الأمان</Text>
      </View>
      <View style={styles.formCard}>
        <TouchableOpacity style={styles.formRow} onPress={handlePasswordReset} activeOpacity={0.7}>
          <Feather name="chevron-left" size={16} color={MUTED} />
          <Text style={styles.formValue}>إعادة تعيين كلمة المرور</Text>
          <Feather name="lock" size={16} color={MUTED} />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12, backgroundColor: CARD, borderBottomWidth: 1, borderColor: BORDER },
  backBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: "center", alignItems: "center" },
  headerTitle: { fontSize: 17, fontWeight: "700", color: FG },
  editBtn: { paddingHorizontal: 12, paddingVertical: 6 },
  editBtnText: { fontSize: 14, color: PRIMARY, fontWeight: "600" },
  avatarSection: { alignItems: "center", paddingVertical: 28 },
  avatarBox: { width: 80, height: 80, borderRadius: 40, backgroundColor: PRIMARY, justifyContent: "center", alignItems: "center", marginBottom: 10, overflow: "hidden" },
  avatarImg: { width: 80, height: 80 },
  avatarInitial: { fontSize: 32, fontWeight: "700", color: "#fff" },
  avatarName: { fontSize: 19, fontWeight: "700", color: FG },
  avatarEmail: { fontSize: 13, color: MUTED, marginTop: 3 },
  formCard: { marginHorizontal: 16, backgroundColor: CARD, borderRadius: 16, borderWidth: 1, borderColor: BORDER, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 6, elevation: 1, marginBottom: 8 },
  formRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 14 },
  rowBorder: { borderTopWidth: 1, borderColor: BORDER },
  formLabel: { fontSize: 13, color: MUTED, width: 90, textAlign: "right" },
  formValue: { flex: 1, fontSize: 15, fontWeight: "600", color: FG, textAlign: "right" },
  formInput: { flex: 1, fontSize: 15, color: FG, borderBottomWidth: 1, borderColor: PRIMARY, paddingVertical: 2 },
  sectionHeader: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  sectionTitle: { fontSize: 13, fontWeight: "700", color: MUTED, textAlign: "right" },
});
