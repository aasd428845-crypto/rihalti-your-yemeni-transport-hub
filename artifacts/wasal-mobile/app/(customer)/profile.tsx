import React from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { useAuth } from "@/contexts/AuthContext";
import colors from "@/constants/colors";

type FeatherIconName = ComponentProps<typeof Feather>["name"];

interface InfoRow {
  icon: FeatherIconName;
  label: string;
  value: string;
}

export default function CustomerProfile() {
  const { profile, user, signOut } = useAuth();

  const handleLogout = () => {
    Alert.alert("تسجيل الخروج", "هل أنت متأكد؟", [
      { text: "إلغاء", style: "cancel" },
      { text: "خروج", style: "destructive", onPress: signOut },
    ]);
  };

  const rows: InfoRow[] = [
    { icon: "user", label: "الاسم", value: profile?.full_name ?? "-" },
    { icon: "mail", label: "البريد الإلكتروني", value: user?.email ?? "-" },
    { icon: "phone", label: "الهاتف", value: profile?.phone ?? "-" },
    { icon: "map-pin", label: "المدينة", value: profile?.city ?? "-" },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 100 }}>
      <View style={styles.avatarSection}>
        <View style={styles.avatar}>
          <Text style={styles.avatarInitial}>
            {profile?.full_name?.charAt(0) ?? user?.email?.charAt(0)?.toUpperCase() ?? "؟"}
          </Text>
        </View>
        <Text style={styles.name}>{profile?.full_name ?? "المستخدم"}</Text>
        <Text style={styles.email}>{user?.email}</Text>
      </View>

      <View style={styles.section}>
        {rows.map((r, i) => (
          <View key={i} style={[styles.row, i < rows.length - 1 && styles.rowBorder]}>
            <Text style={styles.rowValue}>{r.value}</Text>
            <Text style={styles.rowLabel}>{r.label}</Text>
            <Feather name={r.icon} size={18} color={colors.light.mutedForeground} />
          </View>
        ))}
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
        <Text style={styles.logoutText}>تسجيل الخروج</Text>
        <Feather name="log-out" size={18} color={colors.light.destructive} />
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.light.background },
  avatarSection: { alignItems: "center", paddingVertical: 32 },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: colors.light.primary,
    justifyContent: "center", alignItems: "center", marginBottom: 12,
  },
  avatarInitial: { fontSize: 32, fontWeight: "700", color: "#fff" },
  name: { fontSize: 20, fontWeight: "700", color: colors.light.foreground },
  email: { fontSize: 13, color: colors.light.mutedForeground, marginTop: 4 },
  section: {
    marginHorizontal: 16,
    backgroundColor: colors.light.card,
    borderRadius: 14,
    paddingHorizontal: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 16,
  },
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 14, gap: 10 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.light.border },
  rowLabel: { color: colors.light.mutedForeground, fontSize: 13, marginLeft: "auto" },
  rowValue: { fontSize: 15, fontWeight: "600", color: colors.light.foreground, flex: 1, textAlign: "right" },
  logoutBtn: {
    marginHorizontal: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.light.card,
    borderRadius: 12,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: colors.light.destructive + "44",
  },
  logoutText: { fontSize: 16, fontWeight: "600", color: colors.light.destructive },
});
