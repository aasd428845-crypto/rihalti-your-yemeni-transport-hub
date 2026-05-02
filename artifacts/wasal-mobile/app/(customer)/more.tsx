import React from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Image, Linking,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
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

const MENU_SECTIONS = [
  {
    title: "حسابي",
    items: [
      { icon: "map-pin", label: "عناويني", desc: "عناوين التوصيل المحفوظة", color: "#3b82f6", bg: "#eff6ff", route: "/(customer)/addresses" },
      { icon: "clock", label: "سجل الطلبات", desc: "جميع طلباتك ورحلاتك", color: "#8b5cf6", bg: "#f5f3ff", route: "/(customer)/orders" },
      { icon: "settings", label: "الإعدادات", desc: "إعدادات الحساب", color: "#6b7280", bg: "#f9fafb", route: "/(customer)/account" },
    ],
  },
  {
    title: "قانوني",
    items: [
      { icon: "file-text", label: "الشروط والأحكام", desc: "شروط استخدام وصال", color: "#f97316", bg: "#fff7ed", route: null },
      { icon: "shield", label: "سياسة الخصوصية", desc: "كيف نحمي بياناتك", color: "#0d9488", bg: "#f0fdfa", route: null },
      { icon: "info", label: "عن وصال", desc: "منصة النقل الذكي", color: PRIMARY, bg: "#f0fdf4", route: null },
    ],
  },
];

export default function MoreScreen() {
  const { user, profile, role, signOut } = useAuth();
  const insets = useSafeAreaInsets();
  const router = useRouter();

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
        <View style={styles.profileCardBg} />
        <View style={styles.profileRow}>
          <View style={styles.avatar}>
            {profile?.avatar_url
              ? <Image source={{ uri: profile.avatar_url }} style={styles.avatarImg} />
              : <Text style={styles.avatarInitial}>{initials}</Text>
            }
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.profileName} numberOfLines={1}>{profile?.full_name || "مستخدم وصال"}</Text>
            <Text style={styles.profileEmail} numberOfLines={1}>{user?.email}</Text>
            {role && (
              <View style={styles.roleBadge}>
                <Text style={styles.roleBadgeText}>{ROLE_LABELS[role] || role}</Text>
              </View>
            )}
          </View>
          <TouchableOpacity style={styles.settingsBtn} onPress={() => router.push("/(customer)/account")}>
            <Feather name="settings" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.content}>
        {/* WhatsApp Support */}
        <TouchableOpacity
          style={styles.waCard}
          activeOpacity={0.85}
          onPress={() => Linking.openURL("https://wa.me/967712345678")}
        >
          <View style={styles.waIcon}>
            <Feather name="phone" size={22} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.waTitle}>واتساب الدعم</Text>
            <Text style={styles.waSubtitle}>+967 712 345 678</Text>
          </View>
          <Feather name="chevron-left" size={16} color={MUTED} />
        </TouchableOpacity>

        {/* Menu Sections */}
        {MENU_SECTIONS.map(section => (
          <View key={section.title}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.sectionCard}>
              {section.items.map((item, i) => (
                <TouchableOpacity
                  key={item.label}
                  style={[styles.menuRow, i < section.items.length - 1 && styles.menuRowBorder]}
                  activeOpacity={0.7}
                  onPress={() => item.route ? router.push(item.route as any) : null}
                >
                  <View style={[styles.menuIcon, { backgroundColor: item.bg }]}>
                    <Feather name={item.icon as any} size={18} color={item.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.menuLabel}>{item.label}</Text>
                    <Text style={styles.menuDesc}>{item.desc}</Text>
                  </View>
                  <Feather name="chevron-left" size={16} color={MUTED} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        {/* Sign Out */}
        {user && (
          <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut} activeOpacity={0.8}>
            <Feather name="log-out" size={16} color="#dc2626" />
            <Text style={styles.signOutText}>تسجيل الخروج</Text>
          </TouchableOpacity>
        )}

        <Text style={styles.footer}>وصال v2.0 • منصة النقل الذكي 🇾🇪</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  profileCard: {
    margin: 16, borderRadius: 20, overflow: "hidden",
    backgroundColor: PRIMARY, padding: 20,
    shadowColor: PRIMARY, shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
  profileCardBg: { position: "absolute", top: -40, left: -40, width: 160, height: 160, borderRadius: 80, backgroundColor: "rgba(255,255,255,0.08)" },
  profileRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: "rgba(255,255,255,0.25)", justifyContent: "center", alignItems: "center", borderWidth: 3, borderColor: "rgba(255,255,255,0.3)", overflow: "hidden" },
  avatarImg: { width: 64, height: 64 },
  avatarInitial: { fontSize: 26, fontWeight: "700", color: "#fff" },
  profileName: { fontSize: 18, fontWeight: "700", color: "#fff", textAlign: "right" },
  profileEmail: { fontSize: 13, color: "rgba(255,255,255,0.7)", marginTop: 2, textAlign: "right" },
  roleBadge: { marginTop: 6, alignSelf: "flex-end", backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  roleBadgeText: { color: "#fff", fontSize: 11, fontWeight: "600" },
  settingsBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(255,255,255,0.2)", justifyContent: "center", alignItems: "center" },
  content: { paddingHorizontal: 16, gap: 16 },
  waCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: "#f0fdf4", borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: "#bbf7d0",
  },
  waIcon: { width: 48, height: 48, borderRadius: 14, backgroundColor: "#22c55e", justifyContent: "center", alignItems: "center" },
  waTitle: { fontSize: 15, fontWeight: "700", color: "#15803d", textAlign: "right" },
  waSubtitle: { fontSize: 13, color: MUTED, textAlign: "right", marginTop: 2 },
  sectionTitle: { fontSize: 12, fontWeight: "700", color: MUTED, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8, textAlign: "right" },
  sectionCard: { backgroundColor: CARD, borderRadius: 16, borderWidth: 1, borderColor: BORDER, overflow: "hidden", shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  menuRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  menuRowBorder: { borderBottomWidth: 1, borderColor: BORDER },
  menuIcon: { width: 40, height: 40, borderRadius: 10, justifyContent: "center", alignItems: "center", flexShrink: 0 },
  menuLabel: { fontSize: 14, fontWeight: "600", color: FG, textAlign: "right" },
  menuDesc: { fontSize: 12, color: MUTED, textAlign: "right", marginTop: 1 },
  signOutBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: CARD, borderRadius: 14, paddingVertical: 15,
    borderWidth: 1, borderColor: "#fca5a5",
  },
  signOutText: { fontSize: 15, fontWeight: "600", color: "#dc2626" },
  footer: { textAlign: "center", fontSize: 12, color: "#d1d5db", paddingBottom: 8 },
});
