import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { useAuth } from "@/contexts/AuthContext";
import colors from "@/constants/colors";

export default function Index() {
  const { session, role, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.light.background }}>
        <ActivityIndicator size="large" color={colors.light.primary} />
      </View>
    );
  }

  if (!session) return <Redirect href="/auth/login" />;

  switch (role) {
    case "admin":
      return <Redirect href="/(admin)" />;
    case "delivery_company":
      return <Redirect href="/(delivery-company)" />;
    case "delivery_driver":
      return <Redirect href="/(rider)" />;
    case "driver":
      return <Redirect href="/(rider)" />;
    default:
      return <Redirect href="/(customer)" />;
  }
}
