import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DollarSign, TrendingUp, TrendingDown, Wallet, CheckCircle, Clock, Eye, ExternalLink } from "lucide-react";
import { getDeliveryOrders, getRiders } from "@/lib/deliveryApi";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

const DeliveryFinance = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [orders, setOrders] = useState<any[]>([]);
  const [riders, setRiders] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    if (!user) return;
    try {
      const [o, r, t] = await Promise.all([
        getDeliveryOrders(user.id),
        getRiders(user.id),
        supabase.from("financial_transactions").select("*").eq("partner_id", user.id).order("created_at", { ascending: false }).limit(50).then(res => { if (res.error) throw res.error; return res.data; }),
      ]);
      setOrders(o || []);
      setRiders(r || []);
      setTransactions(t || []);
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    } finally { setLoading(false); }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  // Real-time listener for new transactions
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("delivery-finance-rt")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "financial_transactions", filter: `partner_id=eq.${user.id}` }, () => {
        loadData();
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "financial_transactions", filter: `partner_id=eq.${user.id}` }, () => {
        loadData();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const handleApproveTransaction = async (tx: any) => {
    try {
      // Update financial_transactions
      const { error } = await supabase.from("financial_transactions").update({ payment_status: "confirmed", paid_at: new Date().toISOString() }).eq("id", tx.id);
      if (error) throw error;

      // Update related delivery_order payment_status
      if (tx.reference_id) {
        await supabase.from("delivery_orders").update({ payment_status: "confirmed" }).eq("id", tx.reference_id);
      }

      // Send notification to customer
      if (tx.customer_id) {
        await supabase.from("notifications").insert({
          user_id: tx.customer_id,
          title: "تمت الموافقة على دفعتك ✅",
          body: `تم تأكيد استلام المبلغ ${Number(tx.amount).toLocaleString()} ر.ي بنجاح.`,
          data: { url: `/order/delivery/${tx.reference_id}` } as any,
        });
      }

      toast({ title: "تم", description: "تمت الموافقة على المعاملة بنجاح" });
      loadData();
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    }
  };

  const deliveredOrders = orders.filter(o => o.status === "delivered");
  const totalRevenue = deliveredOrders.reduce((s, o) => s + Number(o.total), 0);
  const totalDeliveryFees = deliveredOrders.reduce((s, o) => s + Number(o.delivery_fee), 0);
  const totalRiderEarnings = riders.reduce((s, r) => s + Number(r.earnings), 0);
  const pendingTx = transactions.filter(t => t.payment_status === "pending");

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

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { title: "إجمالي الإيرادات", value: `${totalRevenue.toLocaleString()} ر.ي`, icon: DollarSign, color: "text-green-600" },
          { title: "رسوم التوصيل", value: `${totalDeliveryFees.toLocaleString()} ر.ي`, icon: TrendingUp, color: "text-blue-600" },
          { title: "أرباح المندوبين", value: `${totalRiderEarnings.toLocaleString()} ر.ي`, icon: TrendingDown, color: "text-orange-600" },
          { title: "معاملات معلقة", value: `${pendingTx.length}`, icon: Clock, color: "text-amber-600" },
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

      <Tabs defaultValue="transactions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="transactions">
            المعاملات المالية
            {pendingTx.length > 0 && <Badge className="mr-2 bg-destructive text-destructive-foreground">{pendingTx.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
          <TabsTrigger value="riders">أرباح المندوبين</TabsTrigger>
        </TabsList>

        {/* Transactions Tab */}
        <TabsContent value="transactions">
          <Card>
            <CardHeader><CardTitle className="text-base">المعاملات المالية</CardTitle></CardHeader>
            <CardContent>
              {transactions.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">لا توجد معاملات</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-muted-foreground">
                        <th className="text-right p-2">المرجع</th>
                        <th className="text-right p-2">النوع</th>
                        <th className="text-right p-2">المبلغ</th>
                        <th className="text-right p-2">العمولة</th>
                        <th className="text-right p-2">صافي الربح</th>
                        <th className="text-right p-2">طريقة الدفع</th>
                        <th className="text-right p-2">الحالة</th>
                        <th className="text-right p-2">التاريخ</th>
                        <th className="text-right p-2">إجراء</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map(tx => (
                        <tr key={tx.id} className="border-b hover:bg-muted/30">
                          <td className="p-2 font-mono text-xs">{tx.reference_id?.slice(0, 8)}</td>
                          <td className="p-2">
                            <Badge variant="outline" className="text-xs">
                              {tx.transaction_type === "delivery" ? "توصيل" : tx.transaction_type === "shipment" ? "شحن" : tx.transaction_type}
                            </Badge>
                          </td>
                          <td className="p-2 font-semibold">{Number(tx.amount).toLocaleString()} ر.ي</td>
                          <td className="p-2 text-destructive">{Number(tx.platform_commission).toLocaleString()} ر.ي</td>
                          <td className="p-2 text-green-600 font-semibold">{Number(tx.partner_earning).toLocaleString()} ر.ي</td>
                          <td className="p-2">
                            <Badge variant="secondary" className="text-xs">
                              {tx.payment_method === "cash" ? "نقداً" : tx.payment_method === "bank_transfer" ? "تحويل" : tx.payment_method}
                            </Badge>
                          </td>
                          <td className="p-2">
                            {tx.payment_status === "confirmed" ? (
                              <Badge className="bg-green-100 text-green-800 border-green-200 text-xs"><CheckCircle className="w-3 h-3 ml-1" />مؤكد</Badge>
                            ) : tx.payment_status === "pending" ? (
                              <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-xs"><Clock className="w-3 h-3 ml-1" />بانتظار التأكيد</Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs">{tx.payment_status}</Badge>
                            )}
                          </td>
                          <td className="p-2 text-xs">{new Date(tx.created_at).toLocaleDateString("ar")}</td>
                          <td className="p-2">
                            {tx.payment_status === "pending" && (
                              <Button size="sm" variant="default" className="text-xs h-7" onClick={() => handleApproveTransaction(tx)}>
                                <CheckCircle className="w-3 h-3 ml-1" />موافقة
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Overview Tab */}
        <TabsContent value="overview">
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
              <CardHeader><CardTitle className="text-base">ملخص مالي</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between p-3 bg-muted/50 rounded-lg">
                  <span className="text-muted-foreground">إجمالي الإيرادات</span>
                  <span className="font-bold">{totalRevenue.toLocaleString()} ر.ي</span>
                </div>
                <div className="flex justify-between p-3 bg-muted/50 rounded-lg">
                  <span className="text-muted-foreground">رسوم التوصيل</span>
                  <span className="font-bold">{totalDeliveryFees.toLocaleString()} ر.ي</span>
                </div>
                <div className="flex justify-between p-3 bg-muted/50 rounded-lg">
                  <span className="text-muted-foreground">أرباح المندوبين</span>
                  <span className="font-bold text-orange-600">{totalRiderEarnings.toLocaleString()} ر.ي</span>
                </div>
                <div className="flex justify-between p-3 bg-primary/10 rounded-lg border border-primary/20">
                  <span className="font-semibold">صافي الربح</span>
                  <span className="font-bold text-primary">{(totalRevenue - totalRiderEarnings).toLocaleString()} ر.ي</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Riders Tab */}
        <TabsContent value="riders">
          <Card>
            <CardHeader><CardTitle className="text-base">أرباح المندوبين</CardTitle></CardHeader>
            <CardContent>
              {riders.length === 0 ? <p className="text-center text-muted-foreground py-8">لا يوجد مندوبين</p> : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {riders.map(r => (
                    <div key={r.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/30">
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
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DeliveryFinance;
