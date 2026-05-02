import { Redirect, Tabs } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { Platform, ActivityIndicator, View } from "react-native";
import { useAuth } from "@/contexts/AuthContext";
import colors from "@/constants/colors";

export default function CustomerLayout() {
  const { session, role, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.light.background }}>
        <ActivityIndicator size="large" color={colors.light.primary} />
      </View>
    );
  }

  if (!session) return <Redirect href="/auth/login" />;

  if (role === "admin") return <Redirect href="/(admin)/" />;
  if (role === "delivery_company") return <Redirect href="/(delivery-company)/" />;
  if (role === "delivery_driver" || role === "driver") return <Redirect href="/(rider)/" />;

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
      <Tabs.Screen
        name="index"
        options={{
          title: "الرئيسية",
          tabBarLabel: "الرئيسية",
          tabBarIcon: ({ color }) => <Feather name="home" size={22} color={color} />,
          headerTitle: "وصال",
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: "طلباتي",
          tabBarLabel: "طلباتي",
          tabBarIcon: ({ color }) => <Feather name="shopping-bag" size={22} color={color} />,
          headerTitle: "طلباتي",
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "حسابي",
          tabBarLabel: "حسابي",
          tabBarIcon: ({ color }) => <Feather name="user" size={22} color={color} />,
          headerTitle: "الملف الشخصي",
        }}
      />
    </Tabs>
  );
}
