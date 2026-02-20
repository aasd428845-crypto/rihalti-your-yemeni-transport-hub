import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, CheckCircle, DollarSign, TrendingUp, Clock, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const AdminOverview = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    pendingApprovals: 0,
    suppliers: 0,
    deliveryCompanies: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      const [profilesRes, pendingRes, rolesRes] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("approval_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("user_roles").select("role"),
      ]);

      const roles = rolesRes.data || [];
      setStats({
        totalUsers: profilesRes.count || 0,
        pendingApprovals: pendingRes.count || 0,
        suppliers: roles.filter((r) => r.role === "supplier").length,
        deliveryCompanies: roles.filter((r) => r.role === "delivery_company").length,
      });
    };
    fetchStats();
  }, []);

  const cards = [
    { title: "إجمالي المستخدمين", value: stats.totalUsers, icon: Users, color: "text-primary" },
    { title: "طلبات معلقة", value: stats.pendingApprovals, icon: Clock, color: "text-secondary" },
    { title: "الموردون", value: stats.suppliers, icon: TrendingUp, color: "text-success" },
    { title: "شركات التوصيل", value: stats.deliveryCompanies, icon: CheckCircle, color: "text-accent-foreground" },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">نظرة عامة</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
              <card.icon className={`w-5 h-5 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{card.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default AdminOverview;
