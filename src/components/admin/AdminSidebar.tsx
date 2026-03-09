import { LayoutDashboard, Users, CheckCircle, DollarSign, Settings, LogOut, Shield, Mail, XCircle, FileText, Send, Home, UserPlus, Receipt, ShieldAlert, MessageCircle, QrCode, CreditCard, Headphones, Bell } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarFooter,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";

const menuItems = [
  { title: "لوحة التحكم", url: "/admin", icon: LayoutDashboard },
  { title: "إدارة المستخدمين", url: "/admin/users", icon: Users },
  { title: "الموافقات", url: "/admin/approvals", icon: CheckCircle },
  { title: "طلبات الانضمام", url: "/admin/join-requests", icon: UserPlus },
  { title: "المعاملات المالية", url: "/admin/transactions", icon: DollarSign },
  { title: "الفواتير", url: "/admin/invoices", icon: Receipt },
  { title: "الإدارة المالية", url: "/admin/finance", icon: DollarSign },
  { title: "الدعوات", url: "/admin/invitations", icon: Send },
  { title: "الإلغاءات", url: "/admin/cancellations", icon: XCircle },
  { title: "المخالفات", url: "/admin/violations", icon: ShieldAlert },
  { title: "الرسائل", url: "/admin/messages", icon: Mail },
  { title: "مراقبة المحادثات", url: "/admin/chat-monitoring", icon: MessageCircle },
  { title: "إثباتات التسليم", url: "/admin/delivery-proofs", icon: QrCode },
  { title: "التقارير", url: "/admin/reports", icon: FileText },
  { title: "التحويلات البنكية", url: "/admin/payment-review", icon: CreditCard },
  { title: "صلاحيات الشركاء", url: "/admin/partner-controls", icon: Shield },
  { title: "إرسال إشعار", url: "/admin/send-notification", icon: Bell },
  { title: "سجل الإشعارات", url: "/admin/notification-logs", icon: FileText },
  { title: "الإعدادات", url: "/admin/settings", icon: Settings },
  { title: "رسائل الدعم", url: "/admin/support-messages", icon: Headphones },
];

const AdminSidebar = () => {
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
                <Shield className="w-4 h-4 text-primary-foreground" />
              </div>
              <div className="text-right">
                <div className="font-bold text-sm text-sidebar-foreground">لوحة التحكم</div>
                <div className="text-[10px] text-muted-foreground">{profile?.full_name || "المشرف"}</div>
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
                      end={item.url === "/admin"}
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

export default AdminSidebar;
