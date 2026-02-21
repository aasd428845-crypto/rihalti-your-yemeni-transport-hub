import { useEffect, useState } from "react";
import { Users, TrendingUp, Truck, Package, Map, DollarSign, Clock, CheckCircle } from "lucide-react";
import { getDashboardStats } from "@/lib/adminApi";
import StatCard from "@/components/admin/dashboard/StatsCards";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const COLORS = ["hsl(195, 75%, 28%)", "hsl(40, 85%, 55%)", "hsl(150, 60%, 40%)", "hsl(0, 84%, 60%)"];

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    totalUsers: 0, suppliers: 0, deliveryCompanies: 0, pendingApprovals: 0,
    totalTrips: 0, totalShipments: 0, totalDeliveries: 0, totalRevenue: 0, platformEarnings: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDashboardStats().then((data) => { setStats(data); setLoading(false); });
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center py-12"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
  }

  const pieData = [
    { name: "عملاء", value: Math.max(stats.totalUsers - stats.suppliers - stats.deliveryCompanies, 0) },
    { name: "موردون", value: stats.suppliers },
    { name: "شركات توصيل", value: stats.deliveryCompanies },
  ];

  const activityData = [
    { name: "رحلات", value: stats.totalTrips },
    { name: "شحنات", value: stats.totalShipments },
    { name: "توصيلات", value: stats.totalDeliveries },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">لوحة التحكم</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="إجمالي المستخدمين" value={stats.totalUsers} icon={Users} />
        <StatCard title="طلبات معلقة" value={stats.pendingApprovals} icon={Clock} />
        <StatCard title="الموردون" value={stats.suppliers} icon={TrendingUp} />
        <StatCard title="شركات التوصيل" value={stats.deliveryCompanies} icon={Truck} />
        <StatCard title="الرحلات" value={stats.totalTrips} icon={Map} />
        <StatCard title="الشحنات" value={stats.totalShipments} icon={Package} />
        <StatCard title="التوصيلات" value={stats.totalDeliveries} icon={CheckCircle} />
        <StatCard title="إيرادات المنصة" value={`${stats.platformEarnings.toLocaleString()} ر.ي`} icon={DollarSign} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">توزيع المستخدمين</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                  {pieData.map((_, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">نظرة عامة على النشاط</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={activityData}>
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
    </div>
  );
};

export default AdminDashboard;
