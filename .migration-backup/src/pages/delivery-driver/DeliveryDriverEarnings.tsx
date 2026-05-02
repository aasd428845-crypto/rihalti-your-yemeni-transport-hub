import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingUp, Package, Percent, CalendarDays, CalendarRange, Calendar } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const DeliveryDriverEarnings = () => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from("financial_transactions")
        .select("*")
        .eq("partner_id", user.id)
        .eq("transaction_type", "delivery")
        .order("created_at", { ascending: false });
      setTransactions(data || []);
      setLoading(false);
    };
    load();
  }, [user]);

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
  }

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfWeek = startOfDay - 6 * 86400000;
  const startOfMonth = startOfDay - 29 * 86400000;

  const calcEarnings = (since: number) =>
    transactions.filter((t) => new Date(t.created_at).getTime() >= since).reduce((s, t) => s + (t.partner_earning || 0), 0);

  const todayEarnings = calcEarnings(startOfDay);
  const weekEarnings = calcEarnings(startOfWeek);
  const monthEarnings = calcEarnings(startOfMonth);
  const totalEarnings = transactions.reduce((s, t) => s + (t.partner_earning || 0), 0);
  const totalCommission = transactions.reduce((s, t) => s + (t.platform_commission || 0), 0);

  const periodStats = [
    { title: "أرباح اليوم", value: `${todayEarnings} ر.ي`, icon: CalendarDays, color: "text-green-500" },
    { title: "أرباح الأسبوع", value: `${weekEarnings} ر.ي`, icon: CalendarRange, color: "text-blue-500" },
    { title: "أرباح الشهر", value: `${monthEarnings} ر.ي`, icon: Calendar, color: "text-purple-500" },
  ];

  const overallStats = [
    { title: "إجمالي الأرباح", value: `${totalEarnings} ر.ي`, icon: DollarSign },
    { title: "عمولة المنصة", value: `${totalCommission} ر.ي`, icon: Percent },
    { title: "عدد التوصيلات", value: transactions.length, icon: Package },
  ];

  // Monthly chart data
  const monthlyData: Record<string, number> = {};
  transactions.forEach((t) => {
    const month = new Date(t.created_at).toLocaleDateString("ar-YE", { year: "numeric", month: "short" });
    monthlyData[month] = (monthlyData[month] || 0) + (t.partner_earning || 0);
  });
  const chartData = Object.entries(monthlyData).map(([month, earning]) => ({ month, earning })).reverse();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">الأرباح</h1>

      {/* Period earnings */}
      <div className="grid grid-cols-3 gap-3">
        {periodStats.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="pt-4 text-center">
              <stat.icon className={`w-6 h-6 mx-auto mb-1 ${stat.color}`} />
              <p className="text-xs text-muted-foreground">{stat.title}</p>
              <p className="text-lg font-bold text-foreground mt-1">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Overall stats */}
      <div className="grid grid-cols-3 gap-3">
        {overallStats.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="pt-4 text-center">
              <stat.icon className="w-5 h-5 mx-auto mb-1 text-primary" />
              <p className="text-xs text-muted-foreground">{stat.title}</p>
              <p className="text-base font-bold text-foreground mt-1">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-lg">الأرباح الشهرية</CardTitle></CardHeader>
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

      {/* Recent transactions */}
      {transactions.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-lg">آخر المعاملات</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {transactions.slice(0, 15).map((t) => (
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
