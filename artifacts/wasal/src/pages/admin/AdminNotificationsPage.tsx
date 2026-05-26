import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bell, AlertTriangle, FileText, MessageSquare, Users, ChevronLeft } from "lucide-react";
import NotificationsInbox, { NavResolver } from "@/components/notifications/NotificationsInbox";

const resolveNav: NavResolver = (data: any, type?: string) => {
  const t = type || data?.type || "";
  if (["join_request", "new_company", "approval"].includes(t)) return "/admin/join-requests";
  if (["support", "support_message", "conversation"].includes(t)) return "/admin/support-messages";
  if (["invoice", "overdue_invoice"].includes(t)) return "/admin/invoices";
  if (["payment_review", "payment"].includes(t)) return "/admin/payment-review";
  if (["violation"].includes(t)) return "/admin/violations";
  if (["user", "registration"].includes(t)) return "/admin/users";
  if (data?.orderId || data?.order_id) return "/admin";
  return null;
};

const AdminNotificationsPage = () => {
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState({ overdueInvoices: 0, pendingJoins: 0, openSupport: 0 });

  useEffect(() => {
    const fetchAlerts = async () => {
      const [inv, joins, support] = await Promise.all([
        supabase.from("partner_invoices").select("id", { count: "exact", head: true }).eq("status", "overdue"),
        supabase.from("partner_join_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("conversations").select("id", { count: "exact", head: true }).eq("status", "open"),
      ]);
      setAlerts({ overdueInvoices: inv.count || 0, pendingJoins: joins.count || 0, openSupport: support.count || 0 });
    };
    fetchAlerts();
  }, []);

  const systemAlerts = [
    { show: alerts.overdueInvoices > 0, icon: FileText, label: "فواتير متأخرة", count: alerts.overdueInvoices, path: "/admin/invoices", color: "text-red-500", bg: "bg-red-50 dark:bg-red-950/20 border-red-200" },
    { show: alerts.pendingJoins > 0, icon: Users, label: "طلبات انضمام معلّقة", count: alerts.pendingJoins, path: "/admin/join-requests", color: "text-orange-500", bg: "bg-orange-50 dark:bg-orange-950/20 border-orange-200" },
    { show: alerts.openSupport > 0, icon: MessageSquare, label: "محادثات دعم مفتوحة", count: alerts.openSupport, path: "/admin/support-messages", color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-950/20 border-blue-200" },
  ].filter(a => a.show);

  return (
    <div className="space-y-6" dir="rtl">
      <h2 className="text-xl font-bold flex items-center gap-2">
        <Bell className="w-5 h-5 text-primary" />
        الإشعارات والتنبيهات
      </h2>

      {/* System Alerts */}
      {systemAlerts.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              تنبيهات النظام
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {systemAlerts.map((alert) => (
              <div
                key={alert.label}
                onClick={() => navigate(alert.path)}
                className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer hover:opacity-80 transition-opacity ${alert.bg}`}
              >
                <div className="flex items-center gap-3">
                  <alert.icon className={`w-5 h-5 ${alert.color}`} />
                  <span className="text-sm font-medium">{alert.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={`text-xs font-bold ${alert.color.replace("text-", "bg-").replace("-500", "-100")} ${alert.color} border-0`}>
                    {alert.count}
                  </Badge>
                  <ChevronLeft className="w-4 h-4 text-muted-foreground" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Notifications Inbox */}
      <NotificationsInbox
        title="إشعارات المنصة"
        resolveNav={resolveNav}
      />
    </div>
  );
};

export default AdminNotificationsPage;
