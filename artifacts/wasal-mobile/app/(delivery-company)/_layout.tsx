import { Redirect, Tabs } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { Platform, ActivityIndicator, View } from "react-native";
import { useAuth } from "@/contexts/AuthContext";
import colors from "@/constants/colors";

export default function DeliveryCompanyLayout() {
  const { session, role, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.light.background }}>
        <ActivityIndicator size="large" color={colors.light.primary} />
      </View>
    );
  }

  if (!session) return <Redirect href="/auth/login" />;
  if (role !== "delivery_company") {
    if (role === "admin") return <Redirect href="/(admin)" />;
    if (role === "delivery_driver" || role === "driver") return <Redirect href="/(rider)" />;
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
        tabBarLabelStyle: { fontSize: 10, fontWeight: "600" },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "الرئيسية", tabBarIcon: ({ color }) => <Feather name="grid" size={22} color={color} />, headerTitle: "لوحة القيادة" }} />
      <Tabs.Screen name="orders" options={{ title: "الطلبات", tabBarIcon: ({ color }) => <Feather name="shopping-bag" size={22} color={color} />, headerTitle: "الطلبات" }} />
      <Tabs.Screen name="riders" options={{ title: "المندوبون", tabBarIcon: ({ color }) => <Feather name="users" size={22} color={color} />, headerTitle: "المندوبون" }} />
      <Tabs.Screen name="finance" options={{ title: "المالية", tabBarIcon: ({ color }) => <Feather name="dollar-sign" size={22} color={color} />, headerTitle: "التقارير المالية" }} />
    </Tabs>
  );
}
