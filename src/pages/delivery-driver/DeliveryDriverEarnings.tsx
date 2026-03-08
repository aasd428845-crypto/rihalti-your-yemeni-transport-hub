import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingUp, Package, Percent } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const DeliveryDriverEarnings = () => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data } = await supabase
        .from("financial_transactions")
        .select("*")
        .eq("partner_id", user.id)
        .eq("transaction_type", "delivery")
        .order("created_at", { ascending: false });
      setTransactions(data || []);
      setLoading(false);
    };
    fetch();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const totalEarnings = transactions.reduce((s, t) => s + (t.partner_earning || 0), 0);
  const totalCommission = transactions.reduce((s, t) => s + (t.platform_commission || 0), 0);
  const totalAmount = transactions.reduce((s, t) => s + (t.amount || 0), 0);

  const monthlyData: Record<string, number> = {};
  transactions.forEach((t) => {
    const month = new Date(t.created_at).toLocaleDateString("ar-YE", { year: "numeric", month: "short" });
    monthlyData[month] = (monthlyData[month] || 0) + (t.partner_earning || 0);
  });
  const chartData = Object.entries(monthlyData).map(([month, earning]) => ({ month, earning })).reverse();

  const stats = [
    { title: "إجمالي الأرباح", value: `${totalEarnings} ر.ي`, icon: DollarSign },
    { title: "إجمالي المبالغ", value: `${totalAmount} ر.ي`, icon: TrendingUp },
    { title: "عمولة المنصة", value: `${totalCommission} ر.ي`, icon: Percent },
    { title: "عدد التوصيلات", value: transactions.length, icon: Package },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">الأرباح</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground flex items-center gap-1">
                <stat.icon className="w-4 h-4 text-primary" />
                {stat.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl font-bold text-foreground">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">الأرباح الشهرية</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                  <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, color: "hsl(var(--foreground))" }}
                    formatter={(value: number) => [`${value} ر.ي`, "الأرباح"]}
                  />
                  <Bar dataKey="earning" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {transactions.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-lg">آخر المعاملات</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {transactions.slice(0, 10).map((t) => (
                <div key={t.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div>
                    <p className="text-sm font-medium text-foreground">{t.partner_earning} ر.ي</p>
                    <p className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleDateString("ar-YE")}</p>
                  </div>
                  <div className="text-left">
                    <p className="text-xs text-muted-foreground">عمولة: {t.platform_commission} ر.ي</p>
                    <p className="text-xs text-muted-foreground">المبلغ: {t.amount} ر.ي</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DeliveryDriverEarnings;
