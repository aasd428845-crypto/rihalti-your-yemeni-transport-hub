import { Redirect, Tabs } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { Platform, ActivityIndicator, View } from "react-native";
import { useAuth } from "@/contexts/AuthContext";

const PRIMARY = "#0c7d4a";
const MUTED = "#9ca3af";
const CARD = "#ffffff";
const BORDER = "#e5e7eb";

export default function CustomerLayout() {
  const { session, role, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f7f5f0" }}>
        <ActivityIndicator size="large" color={PRIMARY} />
      </View>
    );
  }

  if (!session) return <Redirect href="/auth/login" />;
  if (role === "admin") return <Redirect href="/(admin)" />;
  if (role === "delivery_company") return <Redirect href="/(delivery-company)" />;
  if (role === "delivery_driver" || role === "driver") return <Redirect href="/(rider)" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: PRIMARY,
        tabBarInactiveTintColor: MUTED,
        tabBarStyle: {
          backgroundColor: CARD,
          borderTopColor: BORDER,
          borderTopWidth: 1,
          height: Platform.OS === "ios" ? 78 : 60,
          paddingBottom: Platform.OS === "ios" ? 20 : 6,
          paddingTop: 6,
          elevation: 10,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.08,
          shadowRadius: 10,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarLabel: "الرئيسية",
          tabBarIcon: ({ color, size }) => <Feather name="home" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          tabBarLabel: "طلباتي",
          tabBarIcon: ({ color, size }) => <Feather name="shopping-bag" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          tabBarLabel: "الإشعارات",
          tabBarIcon: ({ color, size }) => <Feather name="bell" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarLabel: "حسابي",
          tabBarIcon: ({ color, size }) => <Feather name="user" size={size} color={color} />,
        }}
      />
      {/* Hidden screens - reachable via router.push */}
      <Tabs.Screen name="restaurants" options={{ href: null }} />
      <Tabs.Screen name="more" options={{ href: null }} />
      <Tabs.Screen name="account" options={{ href: null }} />
      <Tabs.Screen name="addresses" options={{ href: null }} />
    </Tabs>
  );
}
