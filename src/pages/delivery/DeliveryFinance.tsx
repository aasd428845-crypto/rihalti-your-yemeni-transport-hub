import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DollarSign, TrendingUp, TrendingDown, Wallet } from "lucide-react";
import { getDeliveryOrders, getRiders } from "@/lib/deliveryApi";
import { useToast } from "@/hooks/use-toast";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const DeliveryFinance = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [orders, setOrders] = useState<any[]>([]);
  const [riders, setRiders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        const [o, r] = await Promise.all([getDeliveryOrders(user.id), getRiders(user.id)]);
        setOrders(o || []);
        setRiders(r || []);
      } catch (err: any) {
        toast({ title: "خطأ", description: err.message, variant: "destructive" });
      } finally { setLoading(false); }
    };
    load();
  }, [user]);

  const deliveredOrders = orders.filter(o => o.status === "delivered");
  const totalRevenue = deliveredOrders.reduce((s, o) => s + Number(o.total), 0);
  const totalDeliveryFees = deliveredOrders.reduce((s, o) => s + Number(o.delivery_fee), 0);
  const totalRiderEarnings = riders.reduce((s, r) => s + Number(r.earnings), 0);

  const COLORS = ["hsl(var(--primary))", "#10b981", "#f59e0b", "#ef4444"];

  const statusData = [
    { name: "مكتمل", value: orders.filter(o => o.status === "delivered").length },
    { name: "نشط", value: orders.filter(o => !["delivered", "cancelled"].includes(o.status)).length },
    { name: "ملغي", value: orders.filter(o => o.status === "cancelled").length },
  ];

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-6" dir="rtl">
      <h2 className="text-2xl font-bold">الإدارة المالية</h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { title: "إجمالي الإيرادات", value: `${totalRevenue.toLocaleString()} ر.ي`, icon: DollarSign, color: "text-green-600" },
          { title: "رسوم التوصيل", value: `${totalDeliveryFees.toLocaleString()} ر.ي`, icon: TrendingUp, color: "text-blue-600" },
          { title: "أرباح المندوبين", value: `${totalRiderEarnings.toLocaleString()} ر.ي`, icon: TrendingDown, color: "text-orange-600" },
          { title: "صافي الربح", value: `${(totalRevenue - totalRiderEarnings).toLocaleString()} ر.ي`, icon: Wallet, color: "text-purple-600" },
        ].map((c, i) => (
          <Card key={i}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`p-2 rounded-lg bg-muted ${c.color}`}><c.icon className="w-5 h-5" /></div>
              <div>
                <p className="text-xs text-muted-foreground">{c.title}</p>
                <p className="text-lg font-bold">{c.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">توزيع الطلبات</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={statusData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                  {statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">أرباح المندوبين</CardTitle></CardHeader>
          <CardContent>
            {riders.length === 0 ? <p className="text-center text-muted-foreground py-8">لا يوجد مندوبين</p> : (
              <div className="space-y-2 max-h-[250px] overflow-y-auto">
                {riders.map(r => (
                  <div key={r.id} className="flex items-center justify-between p-2 border rounded">
                    <div>
                      <span className="font-medium">{r.full_name}</span>
                      <span className="text-xs text-muted-foreground mr-2">({r.total_deliveries} توصيلة)</span>
                    </div>
                    <Badge variant="outline">{Number(r.earnings).toLocaleString()} ر.ي</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Transactions */}
      <Card>
        <CardHeader><CardTitle className="text-base">أحدث المعاملات</CardTitle></CardHeader>
        <CardContent>
          {deliveredOrders.length === 0 ? <p className="text-center text-muted-foreground py-8">لا توجد معاملات</p> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b text-muted-foreground">
                  <th className="text-right p-2">الطلب</th>
                  <th className="text-right p-2">العميل</th>
                  <th className="text-right p-2">المبلغ</th>
                  <th className="text-right p-2">رسوم التوصيل</th>
                  <th className="text-right p-2">الدفع</th>
                  <th className="text-right p-2">التاريخ</th>
                </tr></thead>
                <tbody>
                  {deliveredOrders.slice(0, 20).map(o => (
                    <tr key={o.id} className="border-b">
                      <td className="p-2 font-mono text-xs">{o.id.slice(0, 8)}</td>
                      <td className="p-2">{o.customer_name}</td>
                      <td className="p-2">{Number(o.total).toLocaleString()} ر.ي</td>
                      <td className="p-2">{Number(o.delivery_fee).toLocaleString()} ر.ي</td>
                      <td className="p-2"><Badge variant="outline">{o.payment_method === "cash" ? "نقداً" : "بطاقة"}</Badge></td>
                      <td className="p-2 text-xs">{new Date(o.created_at).toLocaleDateString("ar")}</td>
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

export default DeliveryFinance;
