import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Search, UserCheck, Eye, XCircle, CreditCard, CheckCircle2, ExternalLink } from "lucide-react";
import { getDeliveryOrders, updateOrderStatus, assignRiderToOrder, getRiders, getOrderTracking } from "@/lib/deliveryApi";
import { ORDER_STATUS_MAP } from "@/types/delivery.types";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const DeliveryOrders = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [orders, setOrders] = useState<any[]>([]);
  const [riders, setRiders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [showAssign, setShowAssign] = useState(false);
  const [assignOrderId, setAssignOrderId] = useState("");
  const [selectedRider, setSelectedRider] = useState("");
  const [tracking, setTracking] = useState<any[]>([]);
  const [paymentTx, setPaymentTx] = useState<any>(null);

  const load = async () => {
    if (!user) return;
    try {
      const [ordersData, ridersData] = await Promise.all([
        getDeliveryOrders(user.id, statusFilter),
        getRiders(user.id),
      ]);
      setOrders(ordersData || []);
      setRiders(ridersData || []);
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [user, statusFilter]);

  const handleStatusUpdate = async (orderId: string, status: string) => {
    try {
      await updateOrderStatus(orderId, status);
      toast({ title: "تم تحديث الحالة" });
      const order = orders.find(o => o.id === orderId);
      if (order?.customer_id) {
        const statusLabel = ORDER_STATUS_MAP[status]?.label || status;
        try {
          await supabase.functions.invoke("send-push-notification", {
            body: { userId: order.customer_id, title: "تحديث حالة الطلب 📦", body: `حالة طلبك: ${statusLabel}`, sound: "delivery", data: { type: "order_status", orderId } },
          });
        } catch {}
      }
      load();
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    }
  };

  const handleAssign = async () => {
    if (!selectedRider) return;
    try {
      await assignRiderToOrder(assignOrderId, selectedRider);
      toast({ title: "تم تعيين المندوب بنجاح" });
      setShowAssign(false);
      load();
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    }
  };

  // ── Confirm Order ──────────────────────────────────────────
  const handleConfirmOrder = async (order: any) => {
    if (!user) return;
    try {
      // 1. Update order status → confirmed
      await updateOrderStatus(order.id, "confirmed");

      // 2. If payment transaction is pending → mark verified
      if (paymentTx?.id && paymentTx.status === "pending") {
        await supabase
          .from("payment_transactions")
          .update({ status: "verified", verified_by: user.id, verified_at: new Date().toISOString() })
          .eq("id", paymentTx.id);
      }

      // 3. Push notification to customer with sound
      try {
        await supabase.functions.invoke("send-push-notification", {
          body: {
            userId: order.customer_id,
            title: "✅ تم تأكيد طلبك!",
            body: `تم قبول طلبك من ${order.restaurant?.name_ar || "المطعم"}. جاري التحضير 🍳`,
            sound: "order_confirmed",
            data: { type: "order_confirmed", orderId: order.id },
          },
        });
      } catch {}

      // 4. In-app notification record
      try {
        await supabase.from("notifications").insert({
          user_id: order.customer_id,
          title: "✅ تم تأكيد طلبك!",
          body: `تم قبول طلبك. جاري التحضير...`,
          data: { type: "order_confirmed", orderId: order.id } as any,
        });
      } catch {}

      toast({ title: "✅ تم تأكيد الطلب", description: "تم إشعار العميل بصوت وإشعار فوري" });
      setSelectedOrder(null);
      load();
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    }
  };

  // ── Realtime: reload orders list when a new order arrives ──
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("delivery-orders-refresh")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "delivery_orders", filter: `delivery_company_id=eq.${user.id}` },
        () => load()
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const viewDetails = async (order: any) => {
    setSelectedOrder(order);
    setPaymentTx(null);
    try {
      const [trackingData, txData] = await Promise.all([
        getOrderTracking(order.id),
        supabase.from("payment_transactions")
          .select("*")
          .eq("related_entity_id", order.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()
          .then(({ data }) => data, () => null),
      ]);
      setTracking(trackingData || []);
      setPaymentTx(txData || null);
    } catch {}
  };

  const filtered = orders.filter(o =>
    o.customer_name?.includes(search) || o.customer_phone?.includes(search) || o.id.includes(search)
  );

  const renderActions = (order: any) => (
    <div className="flex flex-wrap gap-1">
      <Button size="sm" variant="ghost" onClick={() => viewDetails(order)} className="min-h-[44px] md:min-h-0"><Eye className="w-3 h-3" /></Button>
      {!order.rider_id && order.status !== "cancelled" && (
        <Button size="sm" variant="outline" onClick={() => { setAssignOrderId(order.id); setShowAssign(true); }} className="min-h-[44px] md:min-h-0">
          <UserCheck className="w-3 h-3 ml-1" /> تعيين
        </Button>
      )}
      {order.status === "assigned" && (
        <Button size="sm" variant="outline" onClick={() => handleStatusUpdate(order.id, "picked_up")} className="min-h-[44px] md:min-h-0">تم الاستلام</Button>
      )}
      {order.status === "picked_up" && (
        <Button size="sm" variant="outline" onClick={() => handleStatusUpdate(order.id, "on_the_way")} className="min-h-[44px] md:min-h-0">في الطريق</Button>
      )}
      {order.status === "on_the_way" && (
        <Button size="sm" onClick={() => handleStatusUpdate(order.id, "delivered")} className="min-h-[44px] md:min-h-0">تم التوصيل</Button>
      )}
      {!["delivered", "cancelled"].includes(order.status) && (
        <Button size="sm" variant="destructive" onClick={() => handleStatusUpdate(order.id, "cancelled")} className="min-h-[44px] md:min-h-0">
          <XCircle className="w-3 h-3" />
        </Button>
      )}
    </div>
  );

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-4 md:space-y-6" dir="rtl">
      <h2 className="text-xl md:text-2xl font-bold">إدارة الطلبات</h2>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute right-3 top-2.5 w-4 h-4 text-muted-foreground" />
          <Input placeholder="بحث بالاسم أو الهاتف..." value={search} onChange={e => setSearch(e.target.value)} className="pr-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="الحالة" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">الكل</SelectItem>
            {Object.entries(ORDER_STATUS_MAP).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">لا توجد طلبات</CardContent></Card>
      ) : (
        <>
          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {filtered.map((order: any) => (
              <Card key={order.id}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-bold text-foreground">{order.customer_name}</p>
                      <p className="text-xs text-muted-foreground">{order.customer_phone}</p>
                    </div>
                    <Badge variant="outline" className={ORDER_STATUS_MAP[order.status]?.color || ""}>
                      {ORDER_STATUS_MAP[order.status]?.label || order.status}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-muted-foreground">المبلغ:</span> <span className="font-medium">{Number(order.total).toLocaleString()} ر.ي</span></div>
                    <div><span className="text-muted-foreground">المندوب:</span> <span className="font-medium">{order.rider?.full_name || "غير معين"}</span></div>
                    <div className="col-span-2"><span className="text-muted-foreground">التاريخ:</span> <span className="text-xs">{new Date(order.created_at).toLocaleDateString("ar")}</span></div>
                  </div>
                  {renderActions(order)}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm bg-card rounded-lg border">
              <thead><tr className="border-b text-muted-foreground bg-muted/50">
                <th className="text-right p-3">الرقم</th>
                <th className="text-right p-3">العميل</th>
                <th className="text-right p-3">المبلغ</th>
                <th className="text-right p-3">المندوب</th>
                <th className="text-right p-3">الحالة</th>
                <th className="text-right p-3">التاريخ</th>
                <th className="text-right p-3">إجراءات</th>
              </tr></thead>
              <tbody>
                {filtered.map((order: any) => (
                  <tr key={order.id} className="border-b hover:bg-muted/30">
                    <td className="p-3 font-mono text-xs">{order.id.slice(0, 8)}</td>
                    <td className="p-3">
                      <div>{order.customer_name}</div>
                      <div className="text-xs text-muted-foreground">{order.customer_phone}</div>
                    </td>
                    <td className="p-3">{Number(order.total).toLocaleString()} ر.ي</td>
                    <td className="p-3">{order.rider?.full_name || <span className="text-muted-foreground">غير معين</span>}</td>
                    <td className="p-3">
                      <Badge variant="outline" className={ORDER_STATUS_MAP[order.status]?.color || ""}>
                        {ORDER_STATUS_MAP[order.status]?.label || order.status}
                      </Badge>
                    </td>
                    <td className="p-3 text-xs">{new Date(order.created_at).toLocaleDateString("ar")}</td>
                    <td className="p-3">{renderActions(order)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Order Details Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent dir="rtl" className="max-w-lg">
          <DialogHeader><DialogTitle>تفاصيل الطلب</DialogTitle></DialogHeader>
          {selectedOrder && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-muted-foreground">العميل:</span> {selectedOrder.customer_name}</div>
                <div><span className="text-muted-foreground">الهاتف:</span> {selectedOrder.customer_phone}</div>
                <div className="col-span-2"><span className="text-muted-foreground">العنوان:</span> {selectedOrder.customer_address}</div>
                <div><span className="text-muted-foreground">المبلغ:</span> {Number(selectedOrder.total).toLocaleString()} ر.ي</div>
                <div><span className="text-muted-foreground">التوصيل:</span> {Number(selectedOrder.delivery_fee).toLocaleString()} ر.ي</div>
                <div><span className="text-muted-foreground">الدفع:</span> {selectedOrder.payment_method === "cash" ? "نقداً" : selectedOrder.payment_method === "bank_transfer" ? "تحويل بنكي" : selectedOrder.payment_method || "معلق"}</div>
                {selectedOrder.restaurant && (
                  <div className="col-span-2"><span className="text-muted-foreground">المطعم:</span> <span className="font-medium">{selectedOrder.restaurant.name_ar}</span></div>
                )}
                {selectedOrder.payment_status && (
                  <div><span className="text-muted-foreground">حالة الدفع:</span> <Badge variant="outline">{selectedOrder.payment_status === "paid" ? "مدفوع" : selectedOrder.payment_status === "pending" ? "معلق" : selectedOrder.payment_status}</Badge></div>
                )}
              </div>

              {/* ── Payment Proof Section ── */}
              {(paymentTx || selectedOrder.payment_method === "bank_transfer") && (
                <div className="border rounded-xl p-3 space-y-2 bg-muted/30">
                  <h4 className="font-bold flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-primary" />
                    تفاصيل الدفع
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">طريقة الدفع: </span>
                      <span className="font-semibold">
                        {selectedOrder.payment_method === "cash" ? "💵 نقداً" : selectedOrder.payment_method === "bank_transfer" ? "🏦 تحويل بنكي" : selectedOrder.payment_method}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">حالة الدفع: </span>
                      <Badge variant="outline" className={
                        paymentTx?.status === "verified" ? "border-green-500 text-green-600" :
                        paymentTx?.status === "pending" ? "border-amber-500 text-amber-600" :
                        selectedOrder.payment_status === "paid" ? "border-green-500 text-green-600" : ""
                      }>
                        {paymentTx?.status === "verified" ? "✅ موثّق" :
                         paymentTx?.status === "pending" ? "⏳ قيد المراجعة" :
                         selectedOrder.payment_status === "paid" ? "✅ مدفوع" : "⏳ معلق"}
                      </Badge>
                    </div>
                    {paymentTx?.amount && (
                      <div>
                        <span className="text-muted-foreground">المبلغ المحوّل: </span>
                        <span className="font-bold text-primary">{Number(paymentTx.amount).toLocaleString()} ر.ي</span>
                      </div>
                    )}
                    {paymentTx?.transfer_reference && (
                      <div className="col-span-2 flex items-center gap-2">
                        <span className="text-muted-foreground">رقم المرجع: </span>
                        <span className="font-bold font-mono tracking-wider bg-muted px-2 py-0.5 rounded">{paymentTx.transfer_reference}</span>
                      </div>
                    )}
                    {paymentTx?.notes && (
                      <div className="col-span-2">
                        <span className="text-muted-foreground">ملاحظات: </span>
                        <span>{paymentTx.notes}</span>
                      </div>
                    )}
                    {paymentTx?.created_at && (
                      <div className="col-span-2">
                        <span className="text-muted-foreground">وقت الإيداع: </span>
                        <span>{new Date(paymentTx.created_at).toLocaleString("ar")}</span>
                      </div>
                    )}
                  </div>
                  {paymentTx?.transfer_receipt_url && (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground font-medium">📎 صورة إيصال التحويل:</p>
                      <div
                        className="relative rounded-lg overflow-hidden border cursor-pointer group bg-white"
                        onClick={() => window.open(paymentTx.transfer_receipt_url, "_blank")}
                      >
                        <img
                          src={paymentTx.transfer_receipt_url}
                          alt="إيصال التحويل"
                          className="w-full max-h-48 object-contain bg-white group-hover:opacity-80 transition-opacity"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                            (e.target as HTMLImageElement).parentElement!.innerHTML =
                              '<div class="p-4 text-center text-xs text-red-500">⚠️ تعذّر تحميل الصورة — انقر لفتح الرابط</div>';
                          }}
                        />
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/30 transition-opacity rounded-lg">
                          <span className="text-white text-xs font-bold bg-black/60 px-3 py-1 rounded-full flex items-center gap-1">
                            <ExternalLink className="w-3 h-3" /> فتح الصورة
                          </span>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full gap-2"
                        onClick={() => window.open(paymentTx.transfer_receipt_url, "_blank")}
                      >
                        <ExternalLink className="w-3.5 h-3.5" /> عرض صورة الإيصال بالكامل ↗
                      </Button>
                    </div>
                  )}
                  {!paymentTx?.transfer_receipt_url && selectedOrder.payment_method === "bank_transfer" && (
                    <p className="text-xs text-amber-600 bg-amber-50 rounded-lg p-2">⚠️ لم يتم رفع صورة الإيصال بعد</p>
                  )}
                </div>
              )}

              {/* ── Confirm Button ── */}
              {!["delivered", "cancelled", "confirmed", "assigned", "picked_up", "on_the_way"].includes(selectedOrder.status) && (
                <div className="border-2 border-primary/30 rounded-xl p-3 bg-primary/5 space-y-2">
                  <p className="text-sm font-semibold text-primary flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    الطلب يحتاج تأكيداً
                  </p>
                  {paymentTx?.status === "pending" && (
                    <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-2 py-1">
                      ⏳ الدفع قيد المراجعة — سيتم توثيقه تلقائياً عند التأكيد
                    </p>
                  )}
                  <Button
                    className="w-full gap-2 min-h-[48px] text-base font-bold"
                    onClick={() => handleConfirmOrder(selectedOrder)}
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    تأكيد الطلب وإشعار العميل
                  </Button>
                </div>
              )}

              {/* Google Maps link */}
              {selectedOrder.delivery_lat && selectedOrder.delivery_lng && (
                <a
                  href={`https://www.google.com/maps?q=${selectedOrder.delivery_lat},${selectedOrder.delivery_lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-primary hover:underline text-sm"
                >
                  📍 فتح الموقع في Google Maps
                </a>
              )}

              <div>
                <h4 className="font-bold mb-2">العناصر:</h4>
                {(selectedOrder.items || []).map((item: any, i: number) => (
                  <div key={i} className="flex justify-between border-b py-1">
                    <span>{item.name_ar || item.name} × {item.quantity}</span>
                    <span>{Number(item.price * item.quantity).toLocaleString()} ر.ي</span>
                  </div>
                ))}
              </div>
              {tracking.length > 0 && (
                <div>
                  <h4 className="font-bold mb-2">سجل التتبع:</h4>
                  {tracking.map((t: any) => (
                    <div key={t.id} className="flex items-center gap-2 py-1 border-b flex-wrap">
                      <Badge variant="outline" className={ORDER_STATUS_MAP[t.status]?.color || ""}>{ORDER_STATUS_MAP[t.status]?.label || t.status}</Badge>
                      <span className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleString("ar")}</span>
                      {t.note && <span className="text-xs">- {t.note}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Assign Rider Dialog */}
      <Dialog open={showAssign} onOpenChange={setShowAssign}>
        <DialogContent dir="rtl">
          <DialogHeader><DialogTitle>تعيين مندوب</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Label>اختر مندوب</Label>
            <Select value={selectedRider} onValueChange={setSelectedRider}>
              <SelectTrigger><SelectValue placeholder="اختر مندوب..." /></SelectTrigger>
              <SelectContent>
                {riders.filter(r => r.is_active).map(r => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.full_name} {r.is_online ? "🟢" : "🔴"} - {r.vehicle_type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter><Button onClick={handleAssign} disabled={!selectedRider} className="min-h-[44px]">تعيين</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DeliveryOrders;
