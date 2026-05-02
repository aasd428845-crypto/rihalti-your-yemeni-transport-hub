import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate, Outlet, useNavigate } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import AdminSidebar from "./AdminSidebar";
import { Menu, Bell, Sun, Moon } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";

const AdminLayout = () => {
  const { role, loading, user } = useAuth();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const [alerts, setAlerts] = useState<{ overdueInvoices: number; pendingJoins: number; openSupport: number }>({ overdueInvoices: 0, pendingJoins: 0, openSupport: 0 });

  useEffect(() => {
    if (!user) return;
    const fetchAlerts = async () => {
      const [inv, joins, support] = await Promise.all([
        supabase.from("partner_invoices").select("id", { count: "exact", head: true }).eq("status", "overdue"),
        supabase.from("partner_join_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("conversations").select("id", { count: "exact", head: true }).eq("status", "open"),
      ]);
      setAlerts({ overdueInvoices: inv.count || 0, pendingJoins: joins.count || 0, openSupport: support.count || 0 });
    };
    fetchAlerts();
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (role !== "admin") return <Navigate to="/" replace />;

  const totalAlerts = alerts.overdueInvoices + alerts.pendingJoins + alerts.openSupport;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full" dir="rtl">
        <AdminSidebar />
        <main className="flex-1 flex flex-col">
          <header className="h-14 border-b bg-card flex items-center px-4 gap-3 sticky top-0 z-10">
            <SidebarTrigger>
              <Menu className="w-5 h-5" />
            </SidebarTrigger>
            <h1 className="text-sm font-bold text-foreground flex-1">لوحة تحكم المشرف</h1>
            {/* Theme Toggle */}
            <Button variant="ghost" size="icon" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
            {/* Notifications Bell */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="w-5 h-5" />
                  {totalAlerts > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                      {totalAlerts > 9 ? "9+" : totalAlerts}
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-72 p-0" dir="rtl">
                <div className="p-3 border-b font-bold text-sm">التنبيهات</div>
                <div className="divide-y">
                  {alerts.overdueInvoices > 0 && (
                    <div className="px-3 py-2.5 flex items-center justify-between text-sm cursor-pointer hover:bg-muted/50" onClick={() => navigate("/admin/invoices")}>
                      <span className="text-destructive font-medium">فواتير متأخرة</span>
                      <Badge variant="destructive" className="text-[10px]">{alerts.overdueInvoices}</Badge>
                    </div>
                  )}
                  {alerts.pendingJoins > 0 && (
                    <div className="px-3 py-2.5 flex items-center justify-between text-sm cursor-pointer hover:bg-muted/50" onClick={() => navigate("/admin/join-requests")}>
                      <span className="font-medium">طلبات انضمام</span>
                      <Badge className="bg-orange-100 text-orange-800 text-[10px]">{alerts.pendingJoins}</Badge>
                    </div>
                  )}
                  {alerts.openSupport > 0 && (
                    <div className="px-3 py-2.5 flex items-center justify-between text-sm cursor-pointer hover:bg-muted/50" onClick={() => navigate("/admin/support-messages")}>
                      <span className="font-medium">رسائل دعم مفتوحة</span>
                      <Badge variant="secondary" className="text-[10px]">{alerts.openSupport}</Badge>
                    </div>
                  )}
                  {totalAlerts === 0 && (
                    <div className="px-3 py-4 text-center text-sm text-muted-foreground">لا توجد تنبيهات</div>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </header>
          <div className="flex-1 p-4 md:p-6 bg-background overflow-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default AdminLayout;
