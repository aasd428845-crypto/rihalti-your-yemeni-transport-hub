import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DollarSign, TrendingUp, TrendingDown, Wallet, CheckCircle, XCircle,
  Clock, Eye, ExternalLink, X, Phone, User, Hash, Calendar, Image
} from "lucide-react";
import { getDeliveryOrders, getRiders } from "@/lib/deliveryApi";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

const statusLabels: Record<string, string> = {
  pending: "بانتظار التأكيد",
  confirmed: "مؤكد",
  verified: "مراجعة المنصة",
  paid: "مدفوع",
  rejected: "مرفوض",
};
const statusColors: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 border-amber-200",
  confirmed: "bg-green-100 text-green-800 border-green-200",
  verified: "bg-blue-100 text-blue-800 border-blue-200",
  paid: "bg-emerald-100 text-emerald-800 border-emerald-200",
  rejected: "bg-red-100 text-red-800 border-red-200",
};

const DeliveryFinance = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [orders, setOrders] = useState<any[]>([]);
  const [riders, setRiders] = useState<any[]>([]);
  const [paymentTxns, setPaymentTxns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTx, setSelectedTx] = useState<any>(null);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [processing, setProcessing] = useState(false);
  const [showImage, setShowImage] = useState(false);
  const [imageUrl, setImageUrl] = useState("");

  const loadData = async () => {
    if (!user) return;
    try {
      const [o, r, txRes] = await Promise.all([
        getDeliveryOrders(user.id),
        getRiders(user.id),
        supabase
          .from("payment_transactions")
          .select(`*, profiles:user_id ( full_name, phone, email )`)
          .eq("partner_id", user.id)
          .order("created_at", { ascending: false })
          .limit(100),
      ]);
      setOrders(o || []);
      setRiders(r || []);
      setPaymentTxns(txRes.data || []);
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    } finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, [user]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("delivery-finance-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "payment_transactions", filter: `partner_id=eq.${user.id}` }, () => loadData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const handleApprove = async (tx: any) => {
    setProcessing(true);
    try {
      await supabase
        .from("payment_transactions")
        .update({ status: "verified", verified_by: user!.id, verified_at: new Date().toISOString() })
        .eq("id", tx.id);

      await supabase
        .from("financial_transactions")
        .update({ payment_status: "paid", paid_at: new Date().toISOString() } as any)
        .eq("payment_transaction_id", tx.id);

      if (tx.related_entity_id) {
        if (tx.entity_type === "delivery") {
          await supabase.from("delivery_orders").update({ payment_status: "confirmed" } as any).eq("id", tx.related_entity_id);
        } else if (tx.entity_type === "booking") {
          await supabase.from("bookings").update({ status: "confirmed" } as any).eq("id", tx.related_entity_id);
        } else if (tx.entity_type === "shipment") {
          await supabase.from("shipment_requests").update({ status: "approved" } as any).eq("id", tx.related_entity_id);
        }
      }

      await supabase.from("notifications").insert({
        user_id: tx.user_id,
        title: "تمت الموافقة على دفعتك ✅",
        body: `تم قبول دفعتك بقيمة ${Number(tx.amount).toLocaleString()} ر.ي. شكراً لثقتك.`,
        data: { type: "payment_verified" } as any,
      });

      toast({ title: "تمت الموافقة", description: "تم قبول الدفعة وتحديث حالة الطلب" });
      setSelectedTx(null);
      loadData();
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    } finally { setProcessing(false); }
  };

  const handleReject = async () => {
    if (!selectedTx) return;
    setProcessing(true);
    try {
      await supabase
        .from("payment_transactions")
        .update({ status: "rejected", verified_by: user!.id, verified_at: new Date().toISOString(), notes: rejectReason } as any)
        .eq("id", selectedTx.id);

      await supabase.from("notifications").insert({
        user_id: selectedTx.user_id,
        title: "تم رفض الدفعة ❌",
        body: rejectReason || "تم رفض الدفعة. يرجى التواصل مع الدعم.",
        data: { type: "payment_rejected" } as any,
      });

      toast({ title: "تم الرفض" });
      setShowRejectDialog(false);
      setSelectedTx(null);
      setRejectReason("");
      loadData();
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    } finally { setProcessing(false); }
  };

  const deliveredOrders = orders.filter(o => o.status === "delivered");
  const totalRevenue = deliveredOrders.reduce((s, o) => s + Number(o.total), 0);
  const totalDeliveryFees = deliveredOrders.reduce((s, o) => s + Number(o.delivery_fee), 0);
  const totalRiderEarnings = riders.reduce((s, r) => s + Number(r.earnings), 0);
  const pendingTx = paymentTxns.filter(t => t.status === "pending");

  const COLORS = ["hsl(var(--primary))", "#10b981", "#f59e0b", "#ef4444"];
  const statusData = [
    { name: "مكتمل", value: orders.filter(o => o.status === "delivered").length },
    { name: "نشط", value: orders.filter(o => !["delivered", "cancelled"].includes(o.status)).length },
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

      {/* Stats */}
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

      <Tabs defaultValue="transactions">
        <TabsList>
          <TabsTrigger value="transactions">
            المعاملات
            {pendingTx.length > 0 && (
              <Badge className="mr-2 bg-destructive text-destructive-foreground text-xs">{pendingTx.length}</Badge>
            )}
          </TabsTrigger>
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
                      <div
                        key={tx.id}
                        className="bg-card border border-border rounded-xl p-4 space-y-3 cursor-pointer active:bg-muted/50 transition-colors"
                        onClick={() => setSelectedTx(tx)}
                      >
                        <div className="flex items-center justify-between">
                          <p className="font-bold text-base">{Number(tx.amount).toLocaleString()} ر.ي</p>
                          <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${statusColors[tx.status] || "bg-muted text-muted-foreground"}`}>
                            {statusLabels[tx.status] || tx.status}
                          </span>
                        </div>
                        {tx.profiles && (
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <User className="w-3.5 h-3.5" /> {tx.profiles.full_name}
                          </p>
                        )}
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{new Date(tx.created_at).toLocaleDateString("ar-YE")}</span>
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
                          <tr
                            key={tx.id}
                            className="border-b hover:bg-muted/30 cursor-pointer"
                            onClick={() => setSelectedTx(tx)}
                          >
                            <td className="p-3">
                              <div>
                                <p className="font-medium text-sm">{tx.profiles?.full_name || "—"}</p>
                                <p className="text-xs text-muted-foreground">{tx.profiles?.phone || ""}</p>
                              </div>
                            </td>
                            <td className="p-3 font-bold">{Number(tx.amount).toLocaleString()} ر.ي</td>
                            <td className="p-3 font-mono text-xs">{tx.transfer_reference || "—"}</td>
                            <td className="p-3">
                              <Badge variant="outline" className="text-xs">
                                {tx.payment_method === "bank_transfer" ? "تحويل بنكي" : tx.payment_method === "cash" ? "نقداً" : tx.payment_method}
                              </Badge>
                            </td>
                            <td className="p-3">
                              <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${statusColors[tx.status] || "bg-muted text-muted-foreground"}`}>
                                {statusLabels[tx.status] || tx.status}
                              </span>
                            </td>
                            <td className="p-3 text-xs text-muted-foreground">{new Date(tx.created_at).toLocaleDateString("ar-YE")}</td>
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
                  { label: "إجمالي الإيرادات", value: `${totalRevenue.toLocaleString()} ر.ي`, cls: "" },
                  { label: "رسوم التوصيل", value: `${totalDeliveryFees.toLocaleString()} ر.ي`, cls: "" },
                  { label: "أرباح المندوبين", value: `${totalRiderEarnings.toLocaleString()} ر.ي`, cls: "text-orange-600" },
                  { label: "صافي الربح", value: `${(totalRevenue - totalRiderEarnings).toLocaleString()} ر.ي`, cls: "text-primary font-bold" },
                ].map((row, i) => (
                  <div key={i} className={`flex justify-between p-3 rounded-lg ${i === 3 ? "bg-primary/10 border border-primary/20" : "bg-muted/50"}`}>
                    <span className={i === 3 ? "font-semibold" : "text-muted-foreground"}>{row.label}</span>
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

      {/* ── Transaction Detail Modal ── */}
      {selectedTx && !showRejectDialog && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setSelectedTx(null)}>
          <div
            className="bg-card border border-border rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl"
            onClick={e => e.stopPropagation()}
            dir="rtl"
          >
            <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-card rounded-t-2xl">
              <h2 className="text-lg font-bold">تفاصيل المعاملة</h2>
              <button onClick={() => setSelectedTx(null)} className="p-1.5 hover:bg-muted rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Receipt image */}
              {selectedTx.transfer_receipt_url && (
                <div>
                  <p className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-1"><Image className="w-4 h-4" /> صورة الحوالة</p>
                  <img
                    src={selectedTx.transfer_receipt_url}
                    alt="الحوالة"
                    className="w-full rounded-xl cursor-pointer hover:opacity-90 transition-opacity border border-border"
                    onClick={() => window.open(selectedTx.transfer_receipt_url, "_blank")}
                  />
                  <p className="text-xs text-muted-foreground mt-1 text-center">اضغط للتكبير</p>
                </div>
              )}

              {/* Details grid */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "العميل", value: selectedTx.profiles?.full_name || "—", icon: User },
                  { label: "رقم الهاتف", value: selectedTx.profiles?.phone || "—", icon: Phone },
                  { label: "المبلغ", value: `${Number(selectedTx.amount).toLocaleString()} ر.ي`, icon: DollarSign },
                  { label: "رقم الحوالة", value: selectedTx.transfer_reference || "—", icon: Hash },
                  { label: "التاريخ", value: new Date(selectedTx.created_at).toLocaleDateString("ar-YE"), icon: Calendar },
                  { label: "طريقة الدفع", value: selectedTx.payment_method === "bank_transfer" ? "تحويل بنكي" : selectedTx.payment_method === "cash" ? "نقداً" : (selectedTx.payment_method || "—"), icon: Wallet },
                ].map(({ label, value, icon: Icon }, i) => (
                  <div key={i} className="bg-muted/40 rounded-xl p-3">
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1"><Icon className="w-3.5 h-3.5" />{label}</p>
                    <p className="font-semibold text-sm">{value}</p>
                  </div>
                ))}
              </div>

              {/* Status */}
              <div className="flex items-center gap-2 p-3 bg-muted/40 rounded-xl">
                <span className="text-sm text-muted-foreground">الحالة:</span>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${statusColors[selectedTx.status] || "bg-muted"}`}>
                  {statusLabels[selectedTx.status] || selectedTx.status}
                </span>
              </div>

              {/* Actions */}
              {selectedTx.status === "pending" && (
                <div className="flex gap-3 pt-2">
                  <Button
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white gap-2"
                    onClick={() => handleApprove(selectedTx)}
                    disabled={processing}
                  >
                    <CheckCircle className="w-4 h-4" />موافقة
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 text-destructive border-destructive/30 hover:bg-destructive/10 gap-2"
                    onClick={() => setShowRejectDialog(true)}
                    disabled={processing}
                  >
                    <XCircle className="w-4 h-4" />رفض
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Reject Reason Dialog ── */}
      {showRejectDialog && selectedTx && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-sm p-5 shadow-2xl" dir="rtl">
            <h3 className="text-lg font-bold mb-3">سبب الرفض</h3>
            <Textarea
              placeholder="اكتب سبب رفض الدفعة..."
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              className="mb-4"
              rows={3}
            />
            <div className="flex gap-3">
              <Button
                className="flex-1 bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                onClick={handleReject}
                disabled={processing}
              >
                <XCircle className="w-4 h-4 ml-1" />تأكيد الرفض
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => { setShowRejectDialog(false); setRejectReason(""); }}>
                إلغاء
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeliveryFinance;
