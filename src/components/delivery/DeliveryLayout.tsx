import { useAuth } from "@/contexts/AuthContext";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import DeliverySidebar from "./DeliverySidebar";
import { Menu } from "lucide-react";
import { usePartnerProfileCheck } from "@/hooks/usePartnerProfileCheck";

const DeliveryLayout = () => {
  const { role, loading, user } = useAuth();
  const { isComplete, checking } = usePartnerProfileCheck();
  const location = useLocation();

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
            <h1 className="text-sm font-bold text-foreground">لوحة تحكم شركة التوصيل</h1>
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
