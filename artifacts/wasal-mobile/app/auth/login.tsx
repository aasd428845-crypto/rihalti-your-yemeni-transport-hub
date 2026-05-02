import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "@/lib/supabase";
import colors from "@/constants/colors";

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
      style={{ flex: 1, backgroundColor: colors.light.background }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 20 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.logoContainer}>
          <View style={styles.logoBg}>
            <Image source={WASAL_LOGO} style={styles.logoImg} resizeMode="contain" />
          </View>
          <Text style={styles.appName}>وصال</Text>
          <Text style={styles.appSubtitle}>منصة النقل الذكية</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>تسجيل الدخول</Text>

          <View style={styles.inputWrapper}>
            <Feather name="mail" size={18} color={colors.light.mutedForeground} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="البريد الإلكتروني"
              placeholderTextColor={colors.light.mutedForeground}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              textAlign="right"
            />
          </View>

          <View style={styles.inputWrapper}>
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.inputIcon}>
              <Feather name={showPassword ? "eye-off" : "eye"} size={18} color={colors.light.mutedForeground} />
            </TouchableOpacity>
            <TextInput
              style={styles.input}
              placeholder="كلمة المرور"
              placeholderTextColor={colors.light.mutedForeground}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              textAlign="right"
            />
          </View>

          <TouchableOpacity
            style={[styles.loginBtn, loading && styles.loginBtnDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.loginBtnText}>دخول</Text>
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.footer}>منصة وصال للنقل الذكي</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, paddingHorizontal: 24, alignItems: "center", justifyContent: "center" },
  logoContainer: { alignItems: "center", marginBottom: 40 },
  logoBg: {
    width: 90, height: 90, borderRadius: 24,
    backgroundColor: colors.light.primary,
    justifyContent: "center", alignItems: "center", marginBottom: 12,
    shadowColor: colors.light.primary,
    shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 8,
    overflow: "hidden",
  },
  logoImg: { width: 72, height: 72 },
  appName: { fontSize: 30, fontWeight: "700", color: colors.light.primary, letterSpacing: 1 },
  appSubtitle: { fontSize: 14, color: colors.light.mutedForeground, marginTop: 4 },
  card: {
    width: "100%", backgroundColor: colors.light.card, borderRadius: colors.radius, padding: 24,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4,
  },
  cardTitle: { fontSize: 22, fontWeight: "700", color: colors.light.foreground, textAlign: "center", marginBottom: 24 },
  inputWrapper: {
    flexDirection: "row-reverse", alignItems: "center",
    backgroundColor: colors.light.muted, borderRadius: 10, marginBottom: 14,
    paddingHorizontal: 12, borderWidth: 1, borderColor: colors.light.border,
  },
  inputIcon: { padding: 4 },
  input: { flex: 1, height: 50, fontSize: 15, color: colors.light.foreground, paddingHorizontal: 8 },
  loginBtn: {
    backgroundColor: colors.light.primary, borderRadius: 10, height: 52,
    justifyContent: "center", alignItems: "center", marginTop: 8,
    shadowColor: colors.light.primary,
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4,
  },
  loginBtnDisabled: { opacity: 0.7 },
  loginBtnText: { color: "#fff", fontSize: 17, fontWeight: "700" },
  footer: { marginTop: 32, fontSize: 12, color: colors.light.mutedForeground },
});
