import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShoppingBag, DollarSign, Users, TrendingUp, Clock } from "lucide-react";
import { getDeliveryStats, getDeliveryOrders } from "@/lib/deliveryApi";
import { ORDER_STATUS_MAP } from "@/types/delivery.types";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useToast } from "@/hooks/use-toast";

const DeliveryDashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [stats, setStats] = useState<any>(null);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        const [statsData, ordersData] = await Promise.all([
          getDeliveryStats(user.id),
          getDeliveryOrders(user.id),
        ]);
        setStats(statsData);
        setRecentOrders((ordersData || []).slice(0, 10));
      } catch (err: any) {
        toast({ title: "خطأ", description: err.message, variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  const statCards = [
    { title: "طلبات اليوم", value: stats?.todayOrders || 0, icon: ShoppingBag, color: "text-blue-600" },
    { title: "طلبات نشطة", value: stats?.activeOrders || 0, icon: Clock, color: "text-orange-600" },
    { title: "إيرادات اليوم", value: `${stats?.todayRevenue?.toLocaleString() || 0} ر.ي`, icon: DollarSign, color: "text-green-600" },
    { title: "مندوبين متصلين", value: `${stats?.onlineRiders || 0}/${stats?.totalRiders || 0}`, icon: Users, color: "text-purple-600" },
    { title: "إجمالي الإيرادات", value: `${stats?.totalRevenue?.toLocaleString() || 0} ر.ي`, icon: TrendingUp, color: "text-emerald-600" },
  ];

  return (
    <div className="space-y-6" dir="rtl">
      <h2 className="text-2xl font-bold text-foreground">لوحة القيادة</h2>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {statCards.map((card, i) => (
          <Card key={i}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`p-2 rounded-lg bg-muted ${card.color}`}>
                <card.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{card.title}</p>
                <p className="text-lg font-bold">{card.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Chart */}
      <Card>
        <CardHeader><CardTitle className="text-base">الطلبات خلال الأسبوع</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={[
              { day: "سبت", orders: 12 }, { day: "أحد", orders: 19 }, { day: "إثنين", orders: 15 },
              { day: "ثلاثاء", orders: 22 }, { day: "أربعاء", orders: 18 }, { day: "خميس", orders: 25 },
              { day: "جمعة", orders: 30 },
            ]}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="orders" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Recent Orders */}
      <Card>
        <CardHeader><CardTitle className="text-base">أحدث الطلبات</CardTitle></CardHeader>
        <CardContent>
          {recentOrders.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">لا توجد طلبات حتى الآن</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b text-muted-foreground">
                  <th className="text-right p-2">الرقم</th>
                  <th className="text-right p-2">العميل</th>
                  <th className="text-right p-2">المبلغ</th>
                  <th className="text-right p-2">الحالة</th>
                  <th className="text-right p-2">التاريخ</th>
                </tr></thead>
                <tbody>
                  {recentOrders.map((order: any) => (
                    <tr key={order.id} className="border-b hover:bg-muted/50">
                      <td className="p-2 font-mono text-xs">{order.id.slice(0, 8)}</td>
                      <td className="p-2">{order.customer_name}</td>
                      <td className="p-2">{Number(order.total).toLocaleString()} ر.ي</td>
                      <td className="p-2">
                        <Badge variant="outline" className={ORDER_STATUS_MAP[order.status]?.color || ""}>
                          {ORDER_STATUS_MAP[order.status]?.label || order.status}
                        </Badge>
                      </td>
                      <td className="p-2 text-xs text-muted-foreground">{new Date(order.created_at).toLocaleDateString("ar")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DeliveryDashboard;
