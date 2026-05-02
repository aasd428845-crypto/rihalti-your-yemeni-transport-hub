import { Tabs } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { Platform } from "react-native";
import colors from "@/constants/colors";

export default function AdminLayout() {
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
      <Tabs.Screen name="index" options={{ title: "الإحصائيات", tabBarIcon: ({ color }) => <Feather name="bar-chart-2" size={22} color={color} />, headerTitle: "لوحة المشرف" }} />
      <Tabs.Screen name="users" options={{ title: "المستخدمون", tabBarIcon: ({ color }) => <Feather name="users" size={22} color={color} />, headerTitle: "إدارة المستخدمين" }} />
      <Tabs.Screen name="settings" options={{ title: "الإعدادات", tabBarIcon: ({ color }) => <Feather name="settings" size={22} color={color} />, headerTitle: "إعدادات المنصة" }} />
    </Tabs>
  );
}
