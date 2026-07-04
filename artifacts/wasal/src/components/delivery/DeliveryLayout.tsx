import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate, Outlet } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import DeliverySidebar from "./DeliverySidebar";
import SubscriptionBanner from "./SubscriptionBanner";
import DeliveryOnboarding, { useDeliveryOnboardingKey } from "./DeliveryOnboarding";
import { Menu, Sun, Moon, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import NotificationBell from "@/components/notifications/NotificationBell";

const DeliveryLayout = () => {
  const { role, loading, user } = useAuth();
  const { theme, setTheme } = useTheme();
  const [helpOpen, setHelpOpen] = useState(false);
  const onboardingKey = useDeliveryOnboardingKey(user?.id);

  useEffect(() => {
    if (!user) return;
    const seen = localStorage.getItem(onboardingKey);
    if (!seen) setHelpOpen(true);
  }, [user, onboardingKey]);

  if (loading || (user && role === null)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (role !== "delivery_company") return <Navigate to="/" replace />;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full" dir="rtl">
        <DeliverySidebar />
        <main className="flex-1 flex flex-col">
          <header className="h-14 border-b bg-card flex items-center px-4 gap-3 sticky top-0 z-10">
            <SidebarTrigger>
              <Menu className="w-5 h-5" />
            </SidebarTrigger>
            <h1 className="text-sm font-bold text-foreground flex-1">لوحة تحكم شركة التوصيل</h1>
            <NotificationBell
              notificationsPath="/delivery/notifications"
              notificationTypes={["new_order", "order_assigned", "driver_update", "payment"]}
            />
            <Button variant="ghost" size="icon" onClick={() => setHelpOpen(true)} title="دليل الاستخدام">
              <HelpCircle className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
          </header>
          <SubscriptionBanner />
          <div className="flex-1 p-4 md:p-6 bg-background overflow-auto">
            <Outlet />
          </div>
        </main>
      </div>
      <DeliveryOnboarding open={helpOpen} onOpenChange={setHelpOpen} />
    </SidebarProvider>
  );
};

export default DeliveryLayout;
