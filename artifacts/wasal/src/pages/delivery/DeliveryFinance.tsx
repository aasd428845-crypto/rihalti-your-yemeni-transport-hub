import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DollarSign, TrendingUp, TrendingDown, CheckCircle, XCircle,
  Clock, Store,
} from "lucide-react";
import { getDeliveryOrders, getRiders, getRestaurantCommissionSummary, type RestaurantCommissionSummary } from "@/lib/deliveryApi";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { PaymentReviewDialog, statusLabels, statusColors } from "@/components/delivery/PaymentReviewDialog";
import { RestaurantCommissionCard } from "@/components/delivery/RestaurantCommissionCard";
import type { Tables } from "@/integrations/supabase/types";

type DeliveryOrderRow = Tables<"delivery_orders">;
type RiderRow = Tables<"riders">;
type RestaurantRow = Tables<"restaurants">;
type PaymentTransactionRow = Tables<"payment_transactions"> & {
  profiles: { full_name: string | null; phone: string | null } | null;
};

const getPeriodStart = (period: string): Date => {
  const now = new Date();
  if (period === "daily") { const d = new Date(now); d.setHours(0, 0, 0, 0); return d; }
  if (period === "weekly") { const d = new Date(now); d.setDate(d.getDate() - d.getDay()); d.setHours(0, 0, 0, 0); return d; }
  return new Date(now.getFullYear(), now.getMonth(), 1);
};

const DeliveryFinance = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [orders, setOrders] = useState<DeliveryOrderRow[]>([]);
  const [riders, setRiders] = useState<RiderRow[]>([]);
  const [restaurants, setRestaurants] = useState<RestaurantRow[]>([]);
  const [paymentTxns, setPaymentTxns] = useState<PaymentTransactionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTx, setSelectedTx] = useState<PaymentTransactionRow | null>(null);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [processing, setProcessing] = useState(false);
  const [restaurantPeriod, setRestaurantPeriod] = useState<"daily" | "weekly" | "monthly">("monthly");
  const [expandedRestaurant, setExpandedRestaurant] = useState<string | null>(null);
  const [commissionSummaries, setCommissionSummaries] = useState<Map<string, RestaurantCommissionSummary>>(new Map());

  const loadData = async () => {
    if (!user) return;
    try {
      const [{ data: o }, r, txRes, restRes] = await Promise.all([
        getDeliveryOrders(user.id),
        getRiders(user.id),
        supabase
          .from("payment_transactions")
          .select("*")
          .eq("partner_id", user.id)
          .order("created_at", { ascending: false })
          .limit(100),
        supabase
          .from("restaurants")
          .select("*")
          .eq("delivery_company_id", user.id)
          .eq("is_active", true)
          .order("created_at", { ascending: false }),
      ]);
      setOrders(o || []);
      setRiders(r || []);
      const txRows = txRes.data || [];
      const userIds = [...new Set(txRows.map(t => t.user_id).filter(Boolean))];
      const profilesById = new Map<string, { full_name: string | null; phone: string | null }>();
      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, full_name, phone")
          .in("id", userIds);
        (profilesData || []).forEach(p => profilesById.set(p.id, p));
      }
      setPaymentTxns(txRows.map(t => ({ ...t, profiles: profilesById.get(t.user_id) ?? null })));
      setRestaurants(restRes.data || []);
    } catch (err) {
      toast({ title: "خطأ", description: err instanceof Error ? err.message : String(err), variant: "destructive" });
    } finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, [user]);

  useEffect(() => {
    if (!user) return;
    getRestaurantCommissionSummary(user.id, restaurantPeriod)
      .then(rows => setCommissionSummaries(new Map(rows.map(r => [r.restaurant_id, r]))))
      .catch(() => {});
  }, [user, restaurantPeriod]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("delivery-finance-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "payment_transactions", filter: `partner_id=eq.${user.id}` }, () => loadData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const handleApprove = async (tx: PaymentTransactionRow) => {
    setProcessing(true);
    try {
      const { error } = await supabase.rpc("approve_payment_transaction", {
        p_transaction_id: tx.id,
        p_approver_id: user!.id,
      });
      if (error) throw error;
      toast({ title: "تمت الموافقة" });
      setSelectedTx(null);
      loadData();
    } catch (err) {
      toast({ title: "تعذّرت الموافقة على المعاملة", description: err instanceof Error ? err.message : String(err), variant: "destructive" });
    } finally { setProcessing(false); }
  };

  const handleReject = async () => {
    if (!selectedTx) return;
    setProcessing(true);
    try {
      const { error } = await supabase.rpc("reject_payment_transaction", {
        p_transaction_id: selectedTx.id,
        p_approver_id: user!.id,
        p_reason: rejectReason,
      });
      if (error) throw error;
      toast({ title: "تم الرفض" });
      setShowRejectDialog(false);
      setSelectedTx(null);
      setRejectReason("");
      loadData();
    } catch (err) {
      toast({ title: "تعذّر رفض المعاملة", description: err instanceof Error ? err.message : String(err), variant: "destructive" });
    } finally { setProcessing(false); }
  };

  // ── Derived financial values ──
  const deliveredOrders = orders.filter(o => o.status === "delivered");
  const activeCodOrders = orders.filter(o => o.payment_method === "cash" && !["delivered", "cancelled"].includes(o.status ?? ""));
  const bankDeliveredOrders = deliveredOrders.filter(o => o.payment_method !== "cash");
  const codDeliveredOrders = deliveredOrders.filter(o => o.payment_method === "cash");
  const totalBankDeliveryFees = bankDeliveredOrders.reduce((s, o) => s + Number(o.delivery_fee || 0), 0);
  const totalCodDeliveryFees = codDeliveredOrders.reduce((s, o) => s + Number(o.delivery_fee || 0), 0);
  const totalCustomerDeliveryFees = totalBankDeliveryFees + totalCodDeliveryFees;
  const totalRestaurantSubsidies = deliveredOrders.reduce((s, o) => s + Number(o.restaurant_delivery_subsidy || 0), 0);
  const totalDeliveryRevenue = totalCustomerDeliveryFees + totalRestaurantSubsidies;
  const totalRiderEarnings = riders.reduce((s, r) => s + Number(r.earnings || 0), 0);
  const pendingTx = paymentTxns.filter(t => t.status === "pending");

  // ── Restaurant stats ──
  const restaurantStats = useMemo(() => {
    const periodStart = getPeriodStart(restaurantPeriod);
    return restaurants.map(rest => {
      const restOrders = deliveredOrders.filter(o => o.restaurant_id === rest.id);
      const restActiveCod = activeCodOrders.filter(o => o.restaurant_id === rest.id);
      const periodOrders = restOrders.filter(o => new Date(o.created_at ?? 0) >= periodStart);

      const totalFoodRevenue = restOrders.reduce((s, o) => s + Number(o.total || 0) - Number(o.delivery_fee || 0), 0);
      const periodFoodRevenue = periodOrders.reduce((s, o) => s + Number(o.total || 0) - Number(o.delivery_fee || 0), 0);
      const pendingCodFoodRevenue = restActiveCod.reduce((s, o) => s + Number(o.total || 0) - Number(o.delivery_fee || 0), 0);
      const totalSubsidy = restOrders.reduce((s, o) => s + Number(o.restaurant_delivery_subsidy || 0), 0);
      const periodSubsidy = periodOrders.reduce((s, o) => s + Number(o.restaurant_delivery_subsidy || 0), 0);

      const cs = commissionSummaries.get(rest.id);
      const commissionRate   = cs ? Number(cs.commission_rate)       : Number(rest.commission_rate || 0);
      const totalCommissionCut  = cs ? Number(cs.total_commission_cut)  : Math.floor(totalFoodRevenue * commissionRate / 100);
      const periodCommissionCut = cs ? Number(cs.period_commission_cut) : Math.floor(periodFoodRevenue * commissionRate / 100);

      const totalRevenue = totalFoodRevenue - totalCommissionCut - totalSubsidy;
      const periodRevenue = periodFoodRevenue - periodCommissionCut - periodSubsidy;

      const allRelevantOrders = [...restOrders, ...restActiveCod]
        .sort((a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime());

      const freeDeliveryOrders = restOrders.filter(o => Number(o.restaurant_delivery_subsidy || 0) > 0);
      const discountOrders = restOrders.filter(o =>
        ['percent_off_order', 'fixed_off_order', 'percent_off_delivery'].includes(o.applied_offer_type || '')
        && Number(o.restaurant_delivery_subsidy || 0) === 0
      );
      const totalDeliveryFeeRevenue = restOrders.reduce((s, o) => s + Number(o.delivery_fee || 0), 0);

      return {
        ...rest,
        totalOrders: restOrders.length,
        pendingCodCount: restActiveCod.length,
        periodOrders: periodOrders.length,
        totalFoodRevenue, periodFoodRevenue, pendingCodFoodRevenue,
        totalSubsidy, periodSubsidy, commissionRate, totalCommissionCut, periodCommissionCut,
        totalRevenue, periodRevenue,
        freeDeliveryOrdersCount: freeDeliveryOrders.length,
        discountOrdersCount: discountOrders.length,
        totalDeliveryFeeRevenue,
        recentOrders: allRelevantOrders.slice(0, 15),
      };
    }).sort((a, b) => b.totalRevenue - a.totalRevenue);
  }, [restaurants, deliveredOrders, activeCodOrders, restaurantPeriod, commissionSummaries]);

  const COLORS = ["hsl(var(--primary))", "#10b981", "#f59e0b", "#ef4444"];
  const statusData = [
    { name: "مكتمل", value: orders.filter(o => o.status === "delivered").length },
    { name: "نشط", value: orders.filter(o => !["delivered", "cancelled"].includes(o.status ?? "")).length },
    { name: "ملغي", value: orders.filter(o => o.status === "cancelled").length },
  ];

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
    </div>
  );

  return (
    <div className="space-y-6" dir="rtl">
      <h2 className="text-2xl font-bold">الإدارة المالية</h2>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { title: "إيرادات التوصيل", value: `${totalDeliveryRevenue.toLocaleString()} ر.ي`, sub: "رسوم التوصيل فقط", icon: DollarSign, color: "text-green-600" },
          { title: "رسوم التوصيل", value: `${totalDeliveryRevenue.toLocaleString()} ر.ي`, sub: `من ${deliveredOrders.length} طلب`, icon: TrendingUp, color: "text-blue-600" },
          { title: "أرباح المندوبين", value: `${totalRiderEarnings.toLocaleString()} ر.ي`, sub: `${riders.length} مندوب`, icon: TrendingDown, color: "text-orange-600" },
          { title: "معاملات معلقة", value: `${pendingTx.length}`, sub: "تحتاج موافقة", icon: Clock, color: "text-amber-600" },
        ].map((c, i) => (
          <Card key={i}>
            <CardContent className="p-4 flex items-start gap-3">
              <div className={`p-2 rounded-lg bg-muted ${c.color} shrink-0`}><c.icon className="w-5 h-5" /></div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground truncate">{c.title}</p>
                <p className="text-base md:text-lg font-bold leading-tight">{c.value}</p>
                {c.sub && <p className="text-[10px] text-muted-foreground">{c.sub}</p>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="transactions">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="transactions">
            المعاملات
            {pendingTx.length > 0 && (
              <Badge className="mr-1.5 bg-destructive text-destructive-foreground text-xs px-1.5 py-0">{pendingTx.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="restaurants"><Store className="w-3.5 h-3.5 ml-1" /> إيرادات المطاعم</TabsTrigger>
          <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
          <TabsTrigger value="riders">أرباح المندوبين</TabsTrigger>
        </TabsList>

        {/* ── Transactions Tab ── */}
        <TabsContent value="transactions">
          <Card>
            <CardHeader><CardTitle className="text-base">الحوالات والمدفوعات</CardTitle></CardHeader>
            <CardContent className="p-0 md:p-6">
              {paymentTxns.length === 0 ? (
                <p className="text-center text-muted-foreground py-10">لا توجد معاملات بعد</p>
              ) : (
                <>
                  {/* Mobile Cards */}
                  <div className="md:hidden space-y-3 p-4">
                    {paymentTxns.map(tx => (
                      <div key={tx.id} className="bg-card border border-border rounded-xl p-4 space-y-3 cursor-pointer active:bg-muted/50 transition-colors" onClick={() => setSelectedTx(tx)}>
                        <div className="flex items-center justify-between">
                          <p className="font-bold text-base">{Number(tx.amount).toLocaleString()} ر.ي</p>
                          <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${statusColors[tx.status ?? ""] || "bg-muted text-muted-foreground"}`}>
                            {statusLabels[tx.status ?? ""] || tx.status}
                          </span>
                        </div>
                        {tx.profiles && <p className="text-sm text-muted-foreground">{tx.profiles.full_name}</p>}
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{new Date(tx.created_at ?? 0).toLocaleDateString("ar-YE")}</span>
                          <span className="text-primary font-medium">اضغط للتفاصيل</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Desktop Table */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-muted-foreground bg-muted/30">
                          <th className="text-right p-3">العميل</th>
                          <th className="text-right p-3">المبلغ</th>
                          <th className="text-right p-3">رقم الحوالة</th>
                          <th className="text-right p-3">طريقة الدفع</th>
                          <th className="text-right p-3">الحالة</th>
                          <th className="text-right p-3">التاريخ</th>
                          <th className="text-right p-3">إجراء</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paymentTxns.map(tx => (
                          <tr key={tx.id} className="border-b hover:bg-muted/30 cursor-pointer" onClick={() => setSelectedTx(tx)}>
                            <td className="p-3"><p className="font-medium">{tx.profiles?.full_name || "—"}</p><p className="text-xs text-muted-foreground">{tx.profiles?.phone || ""}</p></td>
                            <td className="p-3 font-bold">{Number(tx.amount).toLocaleString()} ر.ي</td>
                            <td className="p-3 font-mono text-xs">{tx.transfer_reference || "—"}</td>
                            <td className="p-3">
                              <Badge variant="outline" className="text-xs">
                                {tx.payment_method === "bank_transfer" ? "تحويل بنكي" : tx.payment_method === "cash" ? "نقداً" : tx.payment_method}
                              </Badge>
                            </td>
                            <td className="p-3">
                              <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${statusColors[tx.status ?? ""] || "bg-muted"}`}>
                                {statusLabels[tx.status ?? ""] || tx.status}
                              </span>
                            </td>
                            <td className="p-3 text-xs text-muted-foreground">{new Date(tx.created_at ?? 0).toLocaleDateString("ar-YE")}</td>
                            <td className="p-3" onClick={e => e.stopPropagation()}>
                              {tx.status === "pending" && (
                                <div className="flex gap-1">
                                  <Button size="sm" className="h-7 text-xs gap-1 bg-green-600 hover:bg-green-700" onClick={() => handleApprove(tx)}>
                                    <CheckCircle className="w-3 h-3" />موافقة
                                  </Button>
                                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-destructive border-destructive/30" onClick={() => { setSelectedTx(tx); setShowRejectDialog(true); }}>
                                    <XCircle className="w-3 h-3" />رفض
                                  </Button>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Restaurant Revenue Tab ── */}
        <TabsContent value="restaurants">
          <RestaurantCommissionCard
            restaurantStats={restaurantStats}
            totalRestaurantsCount={restaurants.length}
            restaurantPeriod={restaurantPeriod}
            setRestaurantPeriod={setRestaurantPeriod}
            expandedRestaurant={expandedRestaurant}
            setExpandedRestaurant={setExpandedRestaurant}
            toast={toast}
          />
        </TabsContent>

        {/* ── Overview Tab ── */}
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
                {[
                  { label: "رسوم التوصيل — تحويل بنكي (محصّل)", value: `${totalBankDeliveryFees.toLocaleString()} ر.ي`, cls: "text-green-600" },
                  { label: "رسوم التوصيل — كاش مع المناديب (موصّل)", value: `${totalCodDeliveryFees.toLocaleString()} ر.ي`, cls: "text-amber-600" },
                  { label: "رسوم التوصيل (على المطاعم - عروض مجانية)", value: `${totalRestaurantSubsidies.toLocaleString()} ر.ي`, cls: "text-destructive" },
                  { label: "إجمالي إيرادات التوصيل", value: `${totalDeliveryRevenue.toLocaleString()} ر.ي`, cls: "" },
                  { label: "إيرادات المطاعم (وجبات موصّلة، صافية)", value: `${restaurantStats.reduce((s, r) => s + r.totalRevenue, 0).toLocaleString()} ر.ي`, cls: "" },
                  { label: "وجبات كاش في الطريق (متوقعة)", value: `${restaurantStats.reduce((s, r) => s + r.pendingCodFoodRevenue, 0).toLocaleString()} ر.ي`, cls: "text-amber-600" },
                  { label: "أرباح المناديب", value: `${totalRiderEarnings.toLocaleString()} ر.ي`, cls: "text-orange-600" },
                  { label: "صافي ربح التوصيل", value: `${(totalDeliveryRevenue - totalRiderEarnings).toLocaleString()} ر.ي`, cls: "text-primary font-bold" },
                ].map((row, i) => (
                  <div key={i} className={`flex justify-between p-3 rounded-lg ${i === 7 ? "bg-primary/10 border border-primary/20" : "bg-muted/50"}`}>
                    <span className={i === 7 ? "font-semibold" : "text-muted-foreground text-sm"}>{row.label}</span>
                    <span className={row.cls || "font-bold"}>{row.value}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Riders Tab ── */}
        <TabsContent value="riders">
          <Card>
            <CardHeader><CardTitle className="text-base">أرباح المندوبين</CardTitle></CardHeader>
            <CardContent>
              {riders.length === 0
                ? <p className="text-center text-muted-foreground py-8">لا يوجد مندوبين</p>
                : (
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {riders.map(r => (
                      <div key={r.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/30">
                        <div>
                          <span className="font-medium">{r.full_name}</span>
                          <span className="text-xs text-muted-foreground mr-2">({r.total_deliveries || 0} توصيلة)</span>
                        </div>
                        <Badge variant="outline">{Number(r.earnings || 0).toLocaleString()} ر.ي</Badge>
                      </div>
                    ))}
                  </div>
                )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <PaymentReviewDialog
        selectedTx={selectedTx}
        showRejectDialog={showRejectDialog}
        rejectReason={rejectReason}
        processing={processing}
        onClose={() => setSelectedTx(null)}
        onApprove={handleApprove}
        onReject={handleReject}
        setShowRejectDialog={setShowRejectDialog}
        setRejectReason={setRejectReason}
      />
    </div>
  );
};

export default DeliveryFinance;
