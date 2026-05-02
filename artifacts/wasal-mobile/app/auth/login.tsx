import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
  Image, Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "@/lib/supabase";

const PRIMARY = "#0c7d4a";
const BG = "#f7f5f0";
const CARD = "#ffffff";
const BORDER = "#e5e7eb";
const MUTED = "#9ca3af";
const FG = "#1b2d45";

const WASAL_LOGO = require("../../assets/images/wasl-logo.png");

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("تنبيه", "يرجى إدخال البريد الإلكتروني وكلمة المرور");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) {
        const msg =
          error.message === "Invalid login credentials"
            ? "البريد الإلكتروني أو كلمة المرور غير صحيحة"
            : error.message === "Email not confirmed"
            ? "يرجى تأكيد بريدك الإلكتروني أولاً"
            : error.message;
        Alert.alert("خطأ في تسجيل الدخول", msg);
      } else if (data.user) {
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", data.user.id)
          .maybeSingle();
        const role = roleData?.role;
        if (role === "admin") router.replace("/(admin)");
        else if (role === "delivery_company") router.replace("/(delivery-company)");
        else if (role === "delivery_driver" || role === "driver") router.replace("/(rider)");
        else router.replace("/(customer)");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: BG }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 20 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Logo */}
        <View style={styles.logoContainer}>
          <View style={styles.logoBg}>
            <Image source={WASAL_LOGO} style={styles.logoImg} resizeMode="contain" />
          </View>
          <Text style={styles.appName}>وصال</Text>
          <Text style={styles.appSubtitle}>منصة النقل الذكية</Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>تسجيل الدخول</Text>
          <Text style={styles.cardSub}>أدخل بياناتك للوصول إلى حسابك</Text>

          {/* Email */}
          <View style={styles.inputWrapper}>
            <Feather name="mail" size={18} color={MUTED} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="البريد الإلكتروني"
              placeholderTextColor={MUTED}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              textAlign="right"
              autoCorrect={false}
            />
          </View>

          {/* Password */}
          <View style={styles.inputWrapper}>
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.inputIcon}>
              <Feather name={showPassword ? "eye-off" : "eye"} size={18} color={MUTED} />
            </TouchableOpacity>
            <TextInput
              style={styles.input}
              placeholder="كلمة المرور"
              placeholderTextColor={MUTED}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              textAlign="right"
            />
          </View>

          {/* Login Button */}
          <TouchableOpacity
            style={[styles.loginBtn, loading && styles.loginBtnDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.loginBtnText}>دخول</Text>
            }
          </TouchableOpacity>
        </View>

        {/* Features row */}
        <View style={styles.featuresRow}>
          {[
            { icon: "zap", label: "توصيل سريع", color: "#f59e0b" },
            { icon: "shield", label: "دفع آمن", color: PRIMARY },
            { icon: "star", label: "خدمة ممتازة", color: "#f97316" },
          ].map(f => (
            <View key={f.label} style={styles.featurePill}>
              <Feather name={f.icon as any} size={13} color={f.color} />
              <Text style={styles.featureText}>{f.label}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.footer}>منصة وصال للنقل الذكي 🇾🇪</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, paddingHorizontal: 20, alignItems: "center", justifyContent: "center" },
  logoContainer: { alignItems: "center", marginBottom: 36 },
  logoBg: {
    width: 96, height: 96, borderRadius: 26,
    backgroundColor: PRIMARY,
    justifyContent: "center", alignItems: "center", marginBottom: 14,
    shadowColor: PRIMARY, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 16, elevation: 8,
    overflow: "hidden",
  },
  logoImg: { width: 76, height: 76 },
  appName: { fontSize: 32, fontWeight: "700", color: PRIMARY, letterSpacing: 1 },
  appSubtitle: { fontSize: 14, color: MUTED, marginTop: 4 },
  card: {
    width: "100%", backgroundColor: CARD, borderRadius: 20, padding: 24,
    shadowColor: "#000", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.1, shadowRadius: 16, elevation: 5,
    borderWidth: 1, borderColor: BORDER,
  },
  cardTitle: { fontSize: 22, fontWeight: "700", color: FG, textAlign: "center", marginBottom: 4 },
  cardSub: { fontSize: 13, color: MUTED, textAlign: "center", marginBottom: 20 },
  inputWrapper: {
    flexDirection: "row-reverse", alignItems: "center",
    backgroundColor: BG, borderRadius: 12, marginBottom: 12,
    paddingHorizontal: 12, borderWidth: 1.5, borderColor: BORDER,
  },
  inputIcon: { padding: 4 },
  input: { flex: 1, height: 50, fontSize: 15, color: FG, paddingHorizontal: 8 },
  loginBtn: {
    backgroundColor: PRIMARY, borderRadius: 12, height: 52,
    justifyContent: "center", alignItems: "center", marginTop: 8,
    shadowColor: PRIMARY, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 5,
  },
  loginBtnDisabled: { opacity: 0.7 },
  loginBtnText: { color: "#fff", fontSize: 17, fontWeight: "700" },
  featuresRow: { flexDirection: "row", gap: 8, marginTop: 24, flexWrap: "wrap", justifyContent: "center" },
  featurePill: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: CARD, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: BORDER },
  featureText: { fontSize: 12, fontWeight: "600", color: FG },
  footer: { marginTop: 28, fontSize: 12, color: MUTED },
});
