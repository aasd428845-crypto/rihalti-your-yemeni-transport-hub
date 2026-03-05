import { LayoutDashboard, Bus, CalendarCheck, Package, DollarSign, Settings, MessageCircle, LogOut, Home, Megaphone } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarFooter,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";

const menuItems = [
  { title: "لوحة التحكم", url: "/supplier", icon: LayoutDashboard },
  { title: "الرحلات", url: "/supplier/trips", icon: Bus },
  { title: "الحجوزات", url: "/supplier/bookings", icon: CalendarCheck },
  { title: "الشحنات", url: "/supplier/shipments", icon: Package },
  { title: "المالية", url: "/supplier/finance", icon: DollarSign },
  { title: "الإعدادات", url: "/supplier/settings", icon: Settings },
  { title: "الرسائل", url: "/supplier/messages", icon: MessageCircle },
  { title: "العروض الترويجية", url: "/supplier/promotions", icon: Megaphone },
];

const SupplierSidebar = () => {
  const { signOut, profile } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => { await signOut(); navigate("/"); };

  return (
    <Sidebar className="border-l-0 border-r" dir="rtl">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <Bus className="w-4 h-4 text-primary-foreground" />
              </div>
              <div className="text-right">
                <div className="font-bold text-sm text-sidebar-foreground">لوحة المورد</div>
                <div className="text-[10px] text-muted-foreground">{profile?.full_name || "المورد"}</div>
              </div>
            </div>
          </SidebarGroupLabel>
          <SidebarGroupContent className="mt-2">
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/supplier"}
                      className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm text-muted-foreground hover:bg-sidebar-accent transition-colors"
                      activeClassName="bg-primary/10 text-primary font-medium"
                    >
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-3 space-y-2">
        <Button variant="ghost" className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground" onClick={() => navigate("/")}>
          <Home className="w-4 h-4" />العودة للرئيسية
        </Button>
        <Button variant="ghost" className="w-full justify-start gap-2 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={handleSignOut}>
          <LogOut className="w-4 h-4" />تسجيل الخروج
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
};

export default SupplierSidebar;
