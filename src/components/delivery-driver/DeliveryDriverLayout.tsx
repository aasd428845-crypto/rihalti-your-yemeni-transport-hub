import { useAuth } from "@/contexts/AuthContext";
import { Navigate, Outlet } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import DeliveryDriverSidebar from "./DeliveryDriverSidebar";
import { Menu, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";

const DeliveryDriverLayout = () => {
  const { role, loading, user } = useAuth();
  const { theme, setTheme } = useTheme();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (role !== "delivery_driver") return (
    <div className="min-h-screen flex items-center justify-center bg-background" dir="rtl">
      <div className="text-center space-y-4 p-8">
        <div className="w-16 h-16 mx-auto rounded-full bg-destructive/10 flex items-center justify-center">
          <span className="text-3xl">🚫</span>
        </div>
        <h1 className="text-2xl font-bold text-foreground">غير مصرح</h1>
        <p className="text-muted-foreground">هذا التطبيق مخصص لسائقي التوصيل فقط.</p>
        <a href="/" className="inline-block text-primary hover:underline text-sm">العودة للصفحة الرئيسية</a>
      </div>
    </div>
  );

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full" dir="rtl">
        <DeliveryDriverSidebar />
        <main className="flex-1 flex flex-col">
          <header className="h-14 border-b bg-card flex items-center px-4 gap-3 sticky top-0 z-10">
            <SidebarTrigger>
              <Menu className="w-5 h-5" />
            </SidebarTrigger>
            <h1 className="text-sm font-bold text-foreground">تطبيق مندوب التوصيل</h1>
          </header>
          <div className="flex-1 p-4 md:p-6 bg-background overflow-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default DeliveryDriverLayout;
