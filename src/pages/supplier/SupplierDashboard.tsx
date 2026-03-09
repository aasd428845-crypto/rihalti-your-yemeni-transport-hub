import { useEffect, useState } from "react";
import { Bus, CalendarCheck, Package, DollarSign, TrendingUp, TrendingDown, Clock } from "lucide-react";
import { getSupplierDashboardStats } from "@/lib/supplierApi";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const StatCard = ({ title, value, icon: Icon, color = "text-primary" }: { title: string; value: string | number; icon: any; color?: string }) => (
  <Card>
    <CardContent className="p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{title}</p>
        <p className="text-lg font-bold">{value}</p>
      </div>
    </CardContent>
  </Card>
);

const SupplierDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      getSupplierDashboardStats(user.id).then((data) => {
        setStats(data);
        setLoading(false);
      });
    }
  }, [user?.id]);

  if (loading || !stats) {
    return <div className="flex items-center justify-center py-12"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
  }

  const chartData = [
    { name: "الرحلات", value: stats.totalTrips },
    { name: "الحجوزات", value: stats.totalBookings },
    { name: "الطرود", value: stats.totalShipmentRequests },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">لوحة التحكم</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="الرحلات النشطة" value={stats.activeTrips} icon={Bus} />
        <StatCard title="رحلات معلقة" value={stats.pendingTrips} icon={Clock} color="text-yellow-600" />
        <StatCard title="الحجوزات المؤكدة" value={stats.confirmedBookings} icon={CalendarCheck} />
        <StatCard title="طرود بانتظار التسعير" value={stats.pendingPricing} icon={Package} color="text-orange-600" />
        <StatCard title="إجمالي الإيرادات" value={`${stats.totalIncome.toLocaleString()} ر.ي`} icon={TrendingUp} color="text-green-600" />
        <StatCard title="المصروفات" value={`${stats.totalExpenses.toLocaleString()} ر.ي`} icon={TrendingDown} color="text-destructive" />
        <StatCard title="صافي الربح" value={`${stats.netProfit.toLocaleString()} ر.ي`} icon={DollarSign} color="text-primary" />
        <StatCard title="إجمالي الحجوزات" value={stats.totalBookings} icon={CalendarCheck} />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">نظرة عامة</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="hsl(195, 75%, 28%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default SupplierDashboard;
