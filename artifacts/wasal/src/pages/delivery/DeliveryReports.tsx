import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { BarChart3, TrendingUp, ShoppingBag, Store, Star, DollarSign, Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const DeliveryReports = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [orders, setOrders] = useState<any[]>([]);
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("30");

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLoading(true);
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - Number(period));
      try {
        const [ordersRes, restRes] = await Promise.all([
          supabase.from("delivery_orders").select("id, total, status, restaurant_id, items, created_at").eq("delivery_company_id", user.id).gte("created_at", daysAgo.toISOString()),
          supabase.from("restaurants").select("id, name_ar, rating, total_ratings").eq("delivery_company_id", user.id),
        ]);
        setOrders(ordersRes.data || []);
        setRestaurants(restRes.data || []);
      } catch (err: any) {
        toast({ title: "خطأ", description: err.message, variant: "destructive" });
      } finally { setLoading(false); }
    };
    load();
  }, [user, period]);

  const stats = useMemo(() => {
    const delivered = orders.filter(o => o.status === "delivered");
    const cancelled = orders.filter(o => o.status === "cancelled");
    const totalRevenue = delivered.reduce((s, o) => s + Number(o.total), 0);

    // Top restaurants
    const restMap: Record<string, { count: number; revenue: number; name: string }> = {};
    orders.forEach(o => {
      if (!o.restaurant_id) return;
      const r = restaurants.find(r => r.id === o.restaurant_id);
      if (!restMap[o.restaurant_id]) restMap[o.restaurant_id] = { count: 0, revenue: 0, name: r?.name_ar || "غير معروف" };
      restMap[o.restaurant_id].count++;
      if (o.status === "delivered") restMap[o.restaurant_id].revenue += Number(o.total);
    });
    const topRestaurants = Object.entries(restMap).sort((a, b) => b[1].count - a[1].count).slice(0, 5);

    // Top items
    const itemMap: Record<string, { count: number; revenue: number }> = {};
    orders.forEach(o => {
      if (!o.items || !Array.isArray(o.items)) return;
      (o.items as any[]).forEach(item => {
        const key = item.name_ar || item.name || "غير معروف";
        if (!itemMap[key]) itemMap[key] = { count: 0, revenue: 0 };
        itemMap[key].count += (item.quantity || 1);
        itemMap[key].revenue += (item.price || 0) * (item.quantity || 1);
      });
    });
    const topItems = Object.entries(itemMap).sort((a, b) => b[1].count - a[1].count).slice(0, 10);

    // Daily distribution
    const dailyMap: Record<string, number> = {};
    orders.forEach(o => {
      const day = new Date(o.created_at).toLocaleDateString("ar-EG", { weekday: "long" });
      dailyMap[day] = (dailyMap[day] || 0) + 1;
    });

    return { total: orders.length, delivered: delivered.length, cancelled: cancelled.length, totalRevenue, topRestaurants, topItems, dailyMap };
  }, [orders, restaurants]);

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-2xl font-bold flex items-center gap-2"><BarChart3 className="w-6 h-6" /> التقارير والتحليلات</h2>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="7">آخر 7 أيام</SelectItem>
            <SelectItem value="30">آخر 30 يوم</SelectItem>
            <SelectItem value="90">آخر 3 أشهر</SelectItem>
            <SelectItem value="365">آخر سنة</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <ShoppingBag className="w-8 h-8 mx-auto text-primary mb-2" />
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-xs text-muted-foreground">إجمالي الطلبات</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Package className="w-8 h-8 mx-auto text-green-600 mb-2" />
            <p className="text-2xl font-bold">{stats.delivered}</p>
            <p className="text-xs text-muted-foreground">تم التوصيل</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <DollarSign className="w-8 h-8 mx-auto text-amber-600 mb-2" />
            <p className="text-2xl font-bold">{stats.totalRevenue.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">الإيرادات (ر.ي)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <TrendingUp className="w-8 h-8 mx-auto text-red-500 mb-2" />
            <p className="text-2xl font-bold">{stats.cancelled}</p>
            <p className="text-xs text-muted-foreground">ملغية</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Top Restaurants */}
        <Card>
          <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Store className="w-5 h-5" /> أكثر المطاعم طلباً</CardTitle></CardHeader>
          <CardContent>
            {stats.topRestaurants.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">لا توجد بيانات</p>
            ) : (
              <div className="space-y-3">
                {stats.topRestaurants.map(([id, data], i) => (
                  <div key={id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-bold">{i + 1}</span>
                      <span className="font-medium text-sm">{data.name}</span>
                    </div>
                    <div className="text-left">
                      <Badge variant="secondary">{data.count} طلب</Badge>
                      <span className="text-xs text-muted-foreground mr-2">{data.revenue.toLocaleString()} ر.ي</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Items */}
        <Card>
          <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Star className="w-5 h-5" /> أكثر الأصناف مبيعاً</CardTitle></CardHeader>
          <CardContent>
            {stats.topItems.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">لا توجد بيانات</p>
            ) : (
              <div className="space-y-3">
                {stats.topItems.map(([name, data], i) => (
                  <div key={name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-bold">{i + 1}</span>
                      <span className="font-medium text-sm">{name}</span>
                    </div>
                    <div className="text-left">
                      <Badge variant="secondary">{data.count} قطعة</Badge>
                      <span className="text-xs text-muted-foreground mr-2">{data.revenue.toLocaleString()} ر.ي</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Daily Distribution */}
      <Card>
        <CardHeader><CardTitle className="text-lg">توزيع الطلبات حسب الأيام</CardTitle></CardHeader>
        <CardContent>
          {Object.entries(stats.dailyMap).length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">لا توجد بيانات</p>
          ) : (
            <div className="flex gap-3 flex-wrap">
              {Object.entries(stats.dailyMap).map(([day, count]) => (
                <div key={day} className="text-center p-3 bg-muted/50 rounded-lg min-w-[80px]">
                  <p className="text-xs text-muted-foreground">{day}</p>
                  <p className="text-xl font-bold text-primary">{count}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DeliveryReports;
