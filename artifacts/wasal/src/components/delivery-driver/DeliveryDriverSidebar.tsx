import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  Package,
  DollarSign,
  Settings,
  LogOut,
  User,
  History,
  Home,
} from "lucide-react";

const menuItems = [
  { title: "لوحة التحكم", url: "/delivery-driver", icon: LayoutDashboard },
  { title: "الطلبات", url: "/delivery-driver/orders", icon: Package },
  { title: "السجل", url: "/delivery-driver/history", icon: History },
  { title: "الأرباح", url: "/delivery-driver/earnings", icon: DollarSign },
  { title: "الملف الشخصي", url: "/delivery-driver/profile", icon: User },
  { title: "الإعدادات", url: "/delivery-driver/settings", icon: Settings },
];

const DeliveryDriverSidebar = () => {
  const { signOut, profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <Sidebar side="right" collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-bold">
            {profile?.full_name || "مندوب التوصيل"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton
                    onClick={() => navigate(item.url)}
                    isActive={location.pathname === item.url}
                    tooltip={item.title}
                  >
                    <item.icon className="w-4 h-4" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={() => navigate("/")} tooltip="العودة للرئيسية">
              <Home className="w-4 h-4" />
              <span>العودة للرئيسية</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleSignOut} tooltip="تسجيل الخروج">
              <LogOut className="w-4 h-4" />
              <span>تسجيل الخروج</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
};

export default DeliveryDriverSidebar;
