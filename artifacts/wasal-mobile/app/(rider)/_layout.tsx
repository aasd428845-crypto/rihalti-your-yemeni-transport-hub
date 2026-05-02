import { Redirect, Tabs } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { Platform, ActivityIndicator, View } from "react-native";
import { useAuth } from "@/contexts/AuthContext";
import colors from "@/constants/colors";

export default function RiderLayout() {
  const { session, role, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.light.background }}>
        <ActivityIndicator size="large" color={colors.light.primary} />
      </View>
    );
  }

  if (!session) return <Redirect href="/auth/login" />;
  if (role && role !== "delivery_driver" && role !== "driver") {
    if (role === "admin") return <Redirect href="/(admin)" />;
    if (role === "delivery_company") return <Redirect href="/(delivery-company)" />;
    return <Redirect href="/(customer)" />;
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.light.primary,
        tabBarInactiveTintColor: colors.light.mutedForeground,
        headerStyle: { backgroundColor: colors.light.primary },
        headerTintColor: "#fff",
        headerTitleAlign: "center",
        tabBarStyle: {
          backgroundColor: colors.light.card,
          borderTopColor: colors.light.border,
          height: Platform.OS === "web" ? 84 : 60,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "طلباتي", tabBarIcon: ({ color }) => <Feather name="package" size={22} color={color} />, headerTitle: "طلبات المندوب" }} />
      <Tabs.Screen name="collections" options={{ title: "التحصيلات", tabBarIcon: ({ color }) => <Feather name="dollar-sign" size={22} color={color} />, headerTitle: "التحصيلات النقدية" }} />
      <Tabs.Screen name="profile" options={{ title: "حسابي", tabBarIcon: ({ color }) => <Feather name="user" size={22} color={color} />, headerTitle: "الملف الشخصي" }} />
    </Tabs>
  );
}
