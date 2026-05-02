import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from "react-native";
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

export default function RiderProfile() {
  const { profile, user, signOut } = useAuth();

  const handleLogout = () => {
    Alert.alert("تسجيل الخروج", "هل أنت متأكد؟", [
      { text: "إلغاء", style: "cancel" },
      { text: "خروج", style: "destructive", onPress: signOut },
    ]);
  };

  const rows: InfoRow[] = [
    { icon: "mail", label: "البريد", value: user?.email ?? "-" },
    { icon: "phone", label: "الهاتف", value: profile?.phone ?? "-" },
    { icon: "map-pin", label: "المدينة", value: profile?.city ?? "-" },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 100 }}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Feather name="user" size={36} color="#fff" />
        </View>
        <Text style={styles.name}>{profile?.full_name ?? "المندوب"}</Text>
        <Text style={styles.role}>مندوب توصيل</Text>
      </View>

      <View style={styles.infoCard}>
        {rows.map((r, i) => (
          <View
            key={i}
            style={[
              styles.row,
              i < rows.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.light.border },
            ]}
          >
            <Text style={styles.rowVal}>{r.value}</Text>
            <Text style={styles.rowLbl}>{r.label}</Text>
            <Feather name={r.icon} size={16} color={colors.light.mutedForeground} />
          </View>
        ))}
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>تسجيل الخروج</Text>
        <Feather name="log-out" size={18} color={colors.light.destructive} />
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.light.background },
  header: { alignItems: "center", paddingVertical: 32, backgroundColor: colors.light.primary },
  avatar: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center", alignItems: "center", marginBottom: 10,
  },
  name: { fontSize: 20, fontWeight: "700", color: "#fff" },
  role: { fontSize: 13, color: "rgba(255,255,255,0.7)", marginTop: 4 },
  infoCard: {
    marginHorizontal: 16, marginTop: 16,
    backgroundColor: colors.light.card, borderRadius: 14, paddingHorizontal: 16,
  },
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 14, gap: 10 },
  rowLbl: { color: colors.light.mutedForeground, fontSize: 13, marginLeft: "auto" },
  rowVal: { fontSize: 15, fontWeight: "600", color: colors.light.foreground, flex: 1, textAlign: "right" },
  logoutBtn: {
    margin: 16,
    flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8,
    backgroundColor: colors.light.card, borderRadius: 12, paddingVertical: 16,
    borderWidth: 1, borderColor: colors.light.destructive + "44",
  },
  logoutText: { fontSize: 16, fontWeight: "600", color: colors.light.destructive },
});
