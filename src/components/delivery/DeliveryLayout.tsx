import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import DeliverySidebar from "./DeliverySidebar";
import { Menu, Sun, Moon, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTheme } from "next-themes";
import { usePartnerProfileCheck } from "@/hooks/usePartnerProfileCheck";
import { supabase } from "@/integrations/supabase/client";

const DeliveryLayout = () => {
  const { role, loading, user } = useAuth();
  const { isComplete, checking } = usePartnerProfileCheck();
  const { theme, setTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch unread notifications count
  useEffect(() => {
    if (!user) return;
    const fetchCount = async () => {
      const { count } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .is("read_at", null);
      setUnreadCount(count || 0);
    };
    fetchCount();

    // Realtime subscription for new notifications
    const channel = supabase
      .channel(`delivery-notifs-${user.id}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${user.id}`,
      }, () => {
        setUnreadCount(c => c + 1);
      })
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "delivery_orders",
      }, () => {
        // Refresh unread on any new order activity
        fetchCount();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  // Also watch for new pending delivery orders to show in badge
  useEffect(() => {
    if (!user) return;
    const orderChannel = supabase
      .channel(`delivery-orders-bell-${user.id}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "delivery_orders",
      }, () => {
        setUnreadCount(c => c + 1);
      })
      .subscribe();
    return () => { supabase.removeChannel(orderChannel); };
  }, [user]);

  if (loading || checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (role !== "delivery_company") return <Navigate to="/" replace />;

  const isOnProfilePage = location.pathname === "/delivery/profile";
  if (!isComplete && !isOnProfilePage) {
    return <Navigate to="/delivery/profile" replace />;
  }

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

            {/* Notification Bell */}
            <Button
              variant="ghost"
              size="icon"
              className="relative"
              onClick={() => {
                setUnreadCount(0);
                navigate("/notifications");
              }}
              title="الإشعارات"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <Badge className="absolute -top-1 -left-1 h-5 min-w-[20px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold border-2 border-card flex items-center justify-center animate-pulse">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </Badge>
              )}
            </Button>

            <Button variant="ghost" size="icon" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
          </header>
          <div className="flex-1 p-4 md:p-6 bg-background overflow-auto">
            {!isComplete && isOnProfilePage && (
              <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm text-center">
                يرجى إكمال ملفك الشخصي أولاً (الاسم، الهاتف، مناطق العمل) لتتمكن من استخدام لوحة التحكم
              </div>
            )}
            <Outlet />
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default DeliveryLayout;
