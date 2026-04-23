import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  Search, UserCheck, Eye, XCircle, CreditCard, CheckCircle2, ExternalLink,
  MessageCircle, Package, MapPin, Banknote, Truck, Phone,
} from "lucide-react";
import { getDeliveryOrders, updateOrderStatus, assignRiderToOrder, getRiders, getOrderTracking } from "@/lib/deliveryApi";
import { ORDER_STATUS_MAP } from "@/types/delivery.types";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// ── Parse notes helpers ──────────────────────────────────────────────────────
function parseNote(notes: string, key: string): string {
  const line = (notes || '').split('\n').find(l => l.includes(key));
  return line ? line.split(':').slice(1).join(':').trim() : '';
}
function isCashPayment(notes: string): boolean {
  return parseNote(notes, 'طريقة الدفع').includes('عند الاستلام');
}

// ── WhatsApp composer ────────────────────────────────────────────────────────
function composeWhatsApp(sr: any, rider: any): string {
  const notes = sr.notes || '';
  const cash = isCashPayment(notes);
  const senderLine = parseNote(notes, 'المُرسِل');
  const promo = parseNote(notes, 'العرض المطبّق');

  const lines = [
    `🚚 *طلب توصيل جديد*`,
    `━━━━━━━━━━━━━━━━━━━`,
    `📍 *الاستلام:* ${sr.from_city}${sr.from_address ? ' — ' + sr.from_address : ''}`,
    `📍 *التسليم:* ${sr.to_city}${sr.to_address ? ' — ' + sr.to_address : ''}`,
    `📦 *التفاصيل:* ${sr.description || ''}`,
    parseNote(notes, 'الحجم') ? `📐 *الحجم:* ${parseNote(notes, 'الحجم')}` : null,
    sr.receiver_name ? `👤 *المستلم:* ${sr.receiver_name}` : null,
    sr.receiver_phone ? `📞 *هاتف المستلم:* ${sr.receiver_phone}` : null,
    senderLine ? `👤 *المُرسِل:* ${senderLine}` : null,
    promo ? `🎁 *العرض:* ${promo}` : null,
    parseNote(notes, 'ملاحظات') ? `📝 *ملاحظات:* ${parseNote(notes, 'ملاحظات')}` : null,
    `━━━━━━━━━━━━━━━━━━━`,
    cash
      ? `💵 *المبلغ المطلوب تحصيله:* ${Number(sr.proposed_price || 0).toLocaleString()} ريال\n⚠️ يجب تحصيل هذا المبلغ من العميل عند التسليم`
      : `✅ *تم الدفع مسبقاً عبر التحويل البنكي — لا تطلب أي مبلغ من العميل*`,
    `━━━━━━━━━━━━━━━━━━━`,
    `رقم الطلب: #${(sr.id || '').slice(0, 8)}`,
  ].filter(Boolean).join('\n');

  return lines;
}

// ── SR Status badge ──────────────────────────────────────────────────────────
const SR_STATUS: Record<string, { label: string; color: string }> = {
  pending_price: { label: 'بانتظار السعر', color: 'border-amber-400 text-amber-600 bg-amber-50' },
  price_set: { label: 'تم تحديد السعر', color: 'border-blue-400 text-blue-600 bg-blue-50' },
  confirmed: { label: 'مؤكد', color: 'border-green-400 text-green-600 bg-green-50' },
  rejected: { label: 'مرفوض', color: 'border-red-400 text-red-600 bg-red-50' },
  completed: { label: 'مكتمل', color: 'border-gray-400 text-gray-600 bg-gray-50' },
  cancelled: { label: 'ملغي', color: 'border-red-400 text-red-600 bg-red-50' },
};

const DeliveryOrders = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  // ── Tabs ──
  const [activeTab, setActiveTab] = useState<'restaurant' | 'requests'>('restaurant');

  // ── Restaurant orders ──
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

  // ── Service requests ──
  const [serviceRequests, setServiceRequests] = useState<any[]>([]);
  const [srLoading, setSrLoading] = useState(false);
  const [srSearch, setSrSearch] = useState('');
  const [srStatusFilter, setSrStatusFilter] = useState('all');
  const [selectedSR, setSelectedSR] = useState<any>(null);
  const [showAssignSR, setShowAssignSR] = useState(false);
  const [assignSRId, setAssignSRId] = useState('');
  const [selectedRiderSR, setSelectedRiderSR] = useState('');

  // ── Load restaurant orders ──
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

  // ── Load service requests ──
  const loadSR = async () => {
    setSrLoading(true);
    try {
      const { data } = await supabase
        .from('service_requests' as any)
        .select('*, rider:partner_id(id, full_name, phone)')
        .in('type', ['shipment', 'delivery'])
        .order('created_at', { ascending: false });
      setServiceRequests((data as any[]) || []);
    } catch (err: any) {
      console.error('loadSR error:', err);
    } finally { setSrLoading(false); }
  };

  useEffect(() => { load(); }, [user, statusFilter]);
  useEffect(() => { if (activeTab === 'requests') loadSR(); }, [activeTab]);

  // ── Realtime: new restaurant order ──
  const prevOrderIdsRef = useRef<Set<string>>(new Set());
  useEffect(() => { prevOrderIdsRef.current = new Set(orders.map(o => o.id)); }, [orders]);
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("delivery-new-orders")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "delivery_orders", filter: `delivery_company_id=eq.${user.id}` }, (payload) => {
        const newOrder = payload.new as any;
        if (prevOrderIdsRef.current.has(newOrder.id)) return;
        prevOrderIdsRef.current.add(newOrder.id);
        try {
          const ctx = new AudioContext();
          const osc = ctx.createOscillator(); const gain = ctx.createGain();
          osc.connect(gain); gain.connect(ctx.destination);
          osc.frequency.setValueAtTime(880, ctx.currentTime);
          osc.frequency.setValueAtTime(660, ctx.currentTime + 0.15);
          osc.frequency.setValueAtTime(880, ctx.currentTime + 0.3);
          gain.gain.setValueAtTime(0.4, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
          osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.6);
        } catch {}
        toast({ title: "🍽️ طلب مطعم جديد!", description: `من ${newOrder.customer_name || "عميل"} — ${Number(newOrder.total || 0).toLocaleString()} ر.ي`, duration: 10000 });
        load();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  // ── Realtime: new service request ──
  useEffect(() => {
    const channel = supabase
      .channel("delivery-new-service-requests")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "service_requests" }, (payload) => {
        const sr = payload.new as any;
        if (sr.type !== 'shipment' && sr.type !== 'delivery') return;
        try {
          const ctx = new AudioContext();
          const osc = ctx.createOscillator(); const gain = ctx.createGain();
          osc.connect(gain); gain.connect(ctx.destination);
          osc.frequency.setValueAtTime(1046, ctx.currentTime);
          osc.frequency.setValueAtTime(784, ctx.currentTime + 0.2);
          gain.gain.setValueAtTime(0.5, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
          osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.8);
        } catch {}
        toast({ title: "📦 طلب توصيل جديد!", description: `من ${sr.from_city || ''} إلى ${sr.to_city || ''}`, duration: 10000 });
        if (activeTab === 'requests') loadSR();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeTab]);

  // ── Restaurant order handlers ──
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
    } catch (err: any) { toast({ title: "خطأ", description: err.message, variant: "destructive" }); }
  };

  const handleAssign = async () => {
    if (!selectedRider) return;
    try {
      await assignRiderToOrder(assignOrderId, selectedRider);
      toast({ title: "تم تعيين المندوب بنجاح" });
      setShowAssign(false);
      load();
    } catch (err: any) { toast({ title: "خطأ", description: err.message, variant: "destructive" }); }
  };

  const handleConfirmOrder = async (order: any) => {
    if (!user) return;
    try {
      await updateOrderStatus(order.id, "confirmed");
      if (paymentTx?.id && paymentTx.status === "pending") {
        await supabase.from("payment_transactions").update({ status: "verified", verified_by: user.id, verified_at: new Date().toISOString() }).eq("id", paymentTx.id);
      }
      try {
        await supabase.functions.invoke("send-push-notification", { body: { userId: order.customer_id, title: "✅ تم تأكيد طلبك!", body: `تم قبول طلبك من ${order.restaurant?.name_ar || "المطعم"}. جاري التحضير 🍳`, sound: "order_confirmed", data: { type: "order_confirmed", orderId: order.id } } });
      } catch {}
      try {
        await supabase.from("notifications").insert({ user_id: order.customer_id, title: "✅ تم تأكيد طلبك!", body: `تم قبول طلبك. جاري التحضير...`, data: { type: "order_confirmed", orderId: order.id } as any });
      } catch {}
      toast({ title: "✅ تم تأكيد الطلب" });
      setSelectedOrder(null);
      load();
    } catch (err: any) { toast({ title: "خطأ", description: err.message, variant: "destructive" }); }
  };

  const viewDetails = async (order: any) => {
    setSelectedOrder(order);
    setPaymentTx(null);
    try {
      const [trackingData, txData] = await Promise.all([
        getOrderTracking(order.id),
        supabase.from("payment_transactions").select("*").eq("related_entity_id", order.id).order("created_at", { ascending: false }).limit(1).maybeSingle().then(({ data }) => data, () => null),
      ]);
      setTracking(trackingData || []);
      setPaymentTx(txData || null);
    } catch {}
  };

  // ── Service request handlers ──
  const handleAssignRiderToSR = async () => {
    if (!selectedRiderSR || !assignSRId) return;
    const rider = riders.find(r => r.id === selectedRiderSR);
    const sr = serviceRequests.find(r => r.id === assignSRId);
    try {
      // Assign rider + confirm
      await supabase
        .from('service_requests' as any)
        .update({ partner_id: selectedRiderSR, status: 'confirmed' })
        .eq('id', assignSRId);

      // Notify customer
      if (sr?.customer_id) {
        await supabase.from('notifications').insert({
          user_id: sr.customer_id,
          title: '🚚 تم تعيين مندوب لطلبك',
          body: `سيتواصل معك المندوب ${rider?.full_name || ''} قريباً`,
        } as any);
        try {
          await supabase.functions.invoke('send-push-notification', {
            body: { userId: sr.customer_id, title: '🚚 تم تعيين مندوب', body: `المندوب ${rider?.full_name || ''} في طريقه إليك`, data: { type: 'sr_assigned', requestId: assignSRId } },
          });
        } catch {}
      }

      toast({ title: '✅ تم تعيين المندوب' });
      setShowAssignSR(false);
      setSelectedRiderSR('');

      // Open WhatsApp
      if (rider?.phone) {
        const msg = composeWhatsApp(sr, rider);
        const phone = rider.phone.replace(/[^0-9]/g, '');
        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
      }

      loadSR();
    } catch (err: any) {
      toast({ title: 'خطأ', description: err.message, variant: 'destructive' });
    }
  };

  const sendWhatsAppManual = (sr: any) => {
    const rider = sr.rider;
    if (!rider?.phone) {
      toast({ title: 'رقم المندوب غير متوفر', description: 'يرجى تعيين مندوب أولاً', variant: 'destructive' });
      return;
    }
    const msg = composeWhatsApp(sr, rider);
    const phone = rider.phone.replace(/[^0-9]/g, '');
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const handleSetSRPrice = async (srId: string, price: number) => {
    try {
      await supabase.from('service_requests' as any).update({ proposed_price: price, status: 'price_set' }).eq('id', srId);
      // Notify customer
      const sr = serviceRequests.find(r => r.id === srId);
      if (sr?.customer_id) {
        await supabase.from('notifications').insert({ user_id: sr.customer_id, title: '💰 تم تحديد السعر', body: `سعر طلب التوصيل: ${price.toLocaleString()} ريال — انتظر موافقتك` } as any);
        try { await supabase.functions.invoke('send-push-notification', { body: { userId: sr.customer_id, title: '💰 تم تحديد السعر', body: `السعر: ${price.toLocaleString()} ريال`, data: { type: 'price_set', requestId: srId } } }); } catch {}
      }
      toast({ title: '✅ تم تحديد السعر وإشعار العميل' });
      loadSR();
    } catch (err: any) { toast({ title: 'خطأ', description: err.message, variant: 'destructive' }); }
  };

  const handleCancelSR = async (srId: string) => {
    try {
      await supabase.from('service_requests' as any).update({ status: 'cancelled' }).eq('id', srId);
      toast({ title: 'تم إلغاء الطلب' });
      loadSR();
    } catch (err: any) { toast({ title: 'خطأ', description: err.message, variant: 'destructive' }); }
  };

  // ── Filters ──
  const filteredOrders = orders.filter(o =>
    o.customer_name?.includes(search) || o.customer_phone?.includes(search) || o.id.includes(search)
  );
  const filteredSR = serviceRequests.filter(r => {
    const matchSearch = !srSearch || r.description?.includes(srSearch) || r.from_city?.includes(srSearch) || r.to_city?.includes(srSearch) || r.id.includes(srSearch);
    const matchStatus = srStatusFilter === 'all' || r.status === srStatusFilter;
    return matchSearch && matchStatus;
  });

  const renderRestaurantActions = (order: any) => (
    <div className="flex flex-wrap gap-1">
      <Button size="sm" variant="ghost" onClick={() => viewDetails(order)} className="min-h-[44px] md:min-h-0"><Eye className="w-3 h-3" /></Button>
      {!order.rider_id && order.status !== "cancelled" && (
        <Button size="sm" variant="outline" onClick={() => { setAssignOrderId(order.id); setShowAssign(true); }} className="min-h-[44px] md:min-h-0">
          <UserCheck className="w-3 h-3 ml-1" /> تعيين
        </Button>
      )}
      {order.status === "assigned" && <Button size="sm" variant="outline" onClick={() => handleStatusUpdate(order.id, "picked_up")} className="min-h-[44px] md:min-h-0">تم الاستلام</Button>}
      {order.status === "picked_up" && <Button size="sm" variant="outline" onClick={() => handleStatusUpdate(order.id, "on_the_way")} className="min-h-[44px] md:min-h-0">في الطريق</Button>}
      {order.status === "on_the_way" && <Button size="sm" onClick={() => handleStatusUpdate(order.id, "delivered")} className="min-h-[44px] md:min-h-0">تم التوصيل</Button>}
      {!["delivered", "cancelled"].includes(order.status) && (
        <Button size="sm" variant="destructive" onClick={() => handleStatusUpdate(order.id, "cancelled")} className="min-h-[44px] md:min-h-0"><XCircle className="w-3 h-3" /></Button>
      )}
    </div>
  );

  if (loading && activeTab === 'restaurant') return <div className="flex justify-center py-20"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-4 md:space-y-6" dir="rtl">
      <h2 className="text-xl md:text-2xl font-bold">إدارة الطلبات</h2>

      {/* ── Tab Switch ── */}
      <div className="flex rounded-xl overflow-hidden border border-border bg-muted/30 p-1 gap-1">
        <button
          onClick={() => setActiveTab('restaurant')}
          className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'restaurant' ? 'bg-white shadow text-primary' : 'text-muted-foreground hover:text-foreground'}`}
        >
          🍽️ طلبات المطاعم
          {orders.filter(o => o.status === 'pending').length > 0 && (
            <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{orders.filter(o => o.status === 'pending').length}</span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('requests')}
          className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'requests' ? 'bg-white shadow text-primary' : 'text-muted-foreground hover:text-foreground'}`}
        >
          📦 طلبات التوصيل الخاصة
          {serviceRequests.filter(r => r.status === 'pending_price').length > 0 && (
            <span className="bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{serviceRequests.filter(r => r.status === 'pending_price').length}</span>
          )}
        </button>
      </div>

      {/* ══════════════ TAB: Restaurant Orders ══════════════ */}
      {activeTab === 'restaurant' && (
        <>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute right-3 top-2.5 w-4 h-4 text-muted-foreground" />
              <Input placeholder="بحث بالاسم أو الهاتف..." value={search} onChange={e => setSearch(e.target.value)} className="pr-9" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="الحالة" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                {Object.entries(ORDER_STATUS_MAP).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {filteredOrders.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">لا توجد طلبات</CardContent></Card>
          ) : (
            <>
              <div className="md:hidden space-y-3">
                {filteredOrders.map((order: any) => (
                  <Card key={order.id}>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-bold text-foreground">{order.customer_name}</p>
                          <p className="text-xs text-muted-foreground">{order.customer_phone}</p>
                        </div>
                        <Badge variant="outline" className={ORDER_STATUS_MAP[order.status]?.color || ""}>{ORDER_STATUS_MAP[order.status]?.label || order.status}</Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div><span className="text-muted-foreground">المبلغ:</span> <span className="font-medium">{Number(order.total).toLocaleString()} ر.ي</span></div>
                        <div><span className="text-muted-foreground">المندوب:</span> <span className="font-medium">{order.rider?.full_name || "غير معين"}</span></div>
                        <div className="col-span-2"><span className="text-muted-foreground">التاريخ:</span> <span className="text-xs">{new Date(order.created_at).toLocaleDateString("ar")}</span></div>
                      </div>
                      {renderRestaurantActions(order)}
                    </CardContent>
                  </Card>
                ))}
              </div>
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
                    {filteredOrders.map((order: any) => (
                      <tr key={order.id} className="border-b hover:bg-muted/30">
                        <td className="p-3 font-mono text-xs">{order.id.slice(0, 8)}</td>
                        <td className="p-3"><div>{order.customer_name}</div><div className="text-xs text-muted-foreground">{order.customer_phone}</div></td>
                        <td className="p-3">{Number(order.total).toLocaleString()} ر.ي</td>
                        <td className="p-3">{order.rider?.full_name || <span className="text-muted-foreground">غير معين</span>}</td>
                        <td className="p-3"><Badge variant="outline" className={ORDER_STATUS_MAP[order.status]?.color || ""}>{ORDER_STATUS_MAP[order.status]?.label || order.status}</Badge></td>
                        <td className="p-3 text-xs">{new Date(order.created_at).toLocaleDateString("ar")}</td>
                        <td className="p-3">{renderRestaurantActions(order)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}

      {/* ══════════════ TAB: Service Requests ══════════════ */}
      {activeTab === 'requests' && (
        <>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute right-3 top-2.5 w-4 h-4 text-muted-foreground" />
              <Input placeholder="بحث بالوصف أو المدينة..." value={srSearch} onChange={e => setSrSearch(e.target.value)} className="pr-9" />
            </div>
            <Select value={srStatusFilter} onValueChange={setSrStatusFilter}>
              <SelectTrigger className="w-full sm:w-44"><SelectValue placeholder="الحالة" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                {Object.entries(SR_STATUS).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {srLoading ? (
            <div className="flex justify-center py-16"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>
          ) : filteredSR.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">لا توجد طلبات توصيل خاصة</CardContent></Card>
          ) : (
            <div className="space-y-3">
              {filteredSR.map((sr: any) => {
                const cash = isCashPayment(sr.notes || '');
                const statusInfo = SR_STATUS[sr.status] || { label: sr.status, color: '' };
                return (
                  <Card key={sr.id} className="border-l-4" style={{ borderLeftColor: sr.status === 'pending_price' ? '#F59E0B' : sr.status === 'confirmed' ? '#10B981' : '#6B7280' }}>
                    <CardContent className="p-4 space-y-3">
                      {/* Header row */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className={statusInfo.color}>{statusInfo.label}</Badge>
                            <span className="text-[10px] font-mono text-muted-foreground">#{sr.id.slice(0, 8)}</span>
                            {cash
                              ? <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold flex items-center gap-1"><Banknote className="w-3 h-3" /> دفع عند الاستلام</span>
                              : <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold flex items-center gap-1"><CreditCard className="w-3 h-3" /> تحويل مصرفي</span>
                            }
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">{new Date(sr.created_at).toLocaleDateString('ar')} — {new Date(sr.created_at).toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                        {sr.proposed_price && (
                          <div className="text-left flex-shrink-0">
                            <p className="font-black text-primary text-lg">{Number(sr.proposed_price).toLocaleString()}</p>
                            <p className="text-xs text-muted-foreground">ريال</p>
                          </div>
                        )}
                      </div>

                      {/* Route */}
                      <div className="bg-gray-50 rounded-xl p-3 space-y-1.5">
                        <div className="flex items-start gap-2">
                          <MapPin className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-xs font-bold text-gray-600">الاستلام</p>
                            <p className="text-sm font-semibold">{sr.from_city}{sr.from_address ? ' — ' + sr.from_address : ''}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <MapPin className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-xs font-bold text-gray-600">التسليم</p>
                            <p className="text-sm font-semibold">{sr.to_city}{sr.to_address ? ' — ' + sr.to_address : ''}</p>
                          </div>
                        </div>
                      </div>

                      {/* Description */}
                      {sr.description && (
                        <div className="flex items-start gap-2">
                          <Package className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                          <p className="text-sm text-gray-700">{sr.description}</p>
                        </div>
                      )}

                      {/* Receiver */}
                      {sr.receiver_name && (
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="w-4 h-4 text-muted-foreground" />
                          <span className="text-muted-foreground">المستلم:</span>
                          <span className="font-semibold">{sr.receiver_name}</span>
                          {sr.receiver_phone && <span className="text-primary font-mono">{sr.receiver_phone}</span>}
                        </div>
                      )}

                      {/* Rider assigned */}
                      {sr.rider && (
                        <div className="flex items-center gap-2 text-sm bg-green-50 border border-green-100 rounded-xl px-3 py-2">
                          <Truck className="w-4 h-4 text-green-600" />
                          <span className="text-green-700 font-semibold">المندوب: {sr.rider.full_name}</span>
                          {sr.rider.phone && <span className="text-green-600 font-mono text-xs">{sr.rider.phone}</span>}
                        </div>
                      )}

                      {/* Cash collection badge */}
                      {cash && sr.proposed_price && sr.status === 'confirmed' && (
                        <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 flex items-center gap-2">
                          <Banknote className="w-4 h-4 text-amber-600 flex-shrink-0" />
                          <p className="text-sm font-bold text-amber-700">
                            المندوب يجب أن يحصّل: {Number(sr.proposed_price).toLocaleString()} ريال
                          </p>
                        </div>
                      )}
                      {!cash && sr.status === 'confirmed' && (
                        <div className="bg-green-50 border border-green-200 rounded-xl px-3 py-2 flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                          <p className="text-sm font-bold text-green-700">تم الدفع مسبقاً — لا يحصّل المندوب شيئاً</p>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex flex-wrap gap-2 pt-1">
                        <Button size="sm" variant="ghost" onClick={() => setSelectedSR(sr)} className="min-h-[40px] text-xs">
                          <Eye className="w-3.5 h-3.5 ml-1" /> تفاصيل
                        </Button>

                        {/* Assign rider */}
                        {sr.status !== 'cancelled' && sr.status !== 'completed' && (
                          <Button size="sm" variant="outline" onClick={() => { setAssignSRId(sr.id); setShowAssignSR(true); }} className="min-h-[40px] text-xs">
                            <UserCheck className="w-3.5 h-3.5 ml-1" /> تعيين مندوب
                          </Button>
                        )}

                        {/* Set price if pending */}
                        {sr.status === 'pending_price' && (
                          <SetPriceButton onSet={(price) => handleSetSRPrice(sr.id, price)} />
                        )}

                        {/* WhatsApp */}
                        {sr.rider?.phone && (
                          <Button size="sm" onClick={() => sendWhatsAppManual(sr)} className="min-h-[40px] text-xs bg-green-600 hover:bg-green-700 text-white gap-1.5">
                            <MessageCircle className="w-3.5 h-3.5" /> واتساب
                          </Button>
                        )}

                        {/* Cancel */}
                        {!['cancelled', 'completed'].includes(sr.status) && (
                          <Button size="sm" variant="destructive" onClick={() => handleCancelSR(sr.id)} className="min-h-[40px] text-xs">
                            <XCircle className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── Restaurant Order Details Dialog ── */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent dir="rtl" className="max-w-lg">
          <DialogHeader><DialogTitle>تفاصيل طلب المطعم</DialogTitle></DialogHeader>
          {selectedOrder && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-muted-foreground">العميل:</span> {selectedOrder.customer_name}</div>
                <div><span className="text-muted-foreground">الهاتف:</span> {selectedOrder.customer_phone}</div>
                <div className="col-span-2"><span className="text-muted-foreground">العنوان:</span> {selectedOrder.customer_address}</div>
                <div><span className="text-muted-foreground">المبلغ:</span> {Number(selectedOrder.total).toLocaleString()} ر.ي</div>
                <div><span className="text-muted-foreground">التوصيل:</span> {Number(selectedOrder.delivery_fee).toLocaleString()} ر.ي</div>
                <div><span className="text-muted-foreground">الدفع:</span> {selectedOrder.payment_method === "cash" ? "نقداً" : selectedOrder.payment_method === "bank_transfer" ? "تحويل بنكي" : selectedOrder.payment_method || "معلق"}</div>
                {selectedOrder.restaurant && <div className="col-span-2"><span className="text-muted-foreground">المطعم:</span> <span className="font-medium">{selectedOrder.restaurant.name_ar}</span></div>}
              </div>
              {(paymentTx || selectedOrder.payment_method === "bank_transfer") && (
                <div className="border rounded-xl p-3 space-y-2 bg-muted/30">
                  <h4 className="font-bold flex items-center gap-2"><CreditCard className="w-4 h-4 text-primary" />تفاصيل الدفع</h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div><span className="text-muted-foreground">طريقة الدفع: </span><span className="font-semibold">{selectedOrder.payment_method === "cash" ? "💵 نقداً" : "🏦 تحويل بنكي"}</span></div>
                    <div>
                      <span className="text-muted-foreground">حالة الدفع: </span>
                      <Badge variant="outline" className={paymentTx?.status === "verified" ? "border-green-500 text-green-600" : "border-amber-500 text-amber-600"}>
                        {paymentTx?.status === "verified" ? "✅ موثّق" : "⏳ قيد المراجعة"}
                      </Badge>
                    </div>
                    {paymentTx?.amount && <div><span className="text-muted-foreground">المبلغ: </span><span className="font-bold text-primary">{Number(paymentTx.amount).toLocaleString()} ر.ي</span></div>}
                    {paymentTx?.transfer_reference && <div className="col-span-2"><span className="text-muted-foreground">المرجع: </span><span className="font-bold font-mono bg-muted px-2 py-0.5 rounded">{paymentTx.transfer_reference}</span></div>}
                  </div>
                  {paymentTx?.transfer_receipt_url && (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground font-medium">📎 إيصال التحويل:</p>
                      <img src={paymentTx.transfer_receipt_url} alt="إيصال" className="w-full max-h-48 object-contain rounded-lg border cursor-pointer" onClick={() => window.open(paymentTx.transfer_receipt_url, "_blank")} />
                      <Button size="sm" variant="outline" className="w-full gap-2" onClick={() => window.open(paymentTx.transfer_receipt_url, "_blank")}><ExternalLink className="w-3.5 h-3.5" /> عرض الإيصال ↗</Button>
                    </div>
                  )}
                </div>
              )}
              {!["delivered", "cancelled", "confirmed", "assigned", "picked_up", "on_the_way"].includes(selectedOrder.status) && (
                <div className="border-2 border-primary/30 rounded-xl p-3 bg-primary/5 space-y-2">
                  <p className="text-sm font-semibold text-primary flex items-center gap-2"><CheckCircle2 className="w-4 h-4" />الطلب يحتاج تأكيداً</p>
                  <Button className="w-full gap-2 min-h-[48px] text-base font-bold" onClick={() => handleConfirmOrder(selectedOrder)}><CheckCircle2 className="w-5 h-5" />تأكيد الطلب وإشعار العميل</Button>
                </div>
              )}
              {selectedOrder.delivery_lat && selectedOrder.delivery_lng && (
                <a href={`https://www.google.com/maps?q=${selectedOrder.delivery_lat},${selectedOrder.delivery_lng}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline text-sm">📍 فتح الموقع في Google Maps</a>
              )}
              <div>
                <h4 className="font-bold mb-2">العناصر:</h4>
                {(selectedOrder.items || []).map((item: any, i: number) => (
                  <div key={i} className="flex justify-between border-b py-1"><span>{item.name_ar || item.name} × {item.quantity}</span><span>{Number(item.price * item.quantity).toLocaleString()} ر.ي</span></div>
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

      {/* ── Service Request Details Dialog ── */}
      <Dialog open={!!selectedSR} onOpenChange={() => setSelectedSR(null)}>
        <DialogContent dir="rtl" className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>تفاصيل طلب التوصيل</DialogTitle></DialogHeader>
          {selectedSR && (
            <div className="space-y-4 text-sm">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={SR_STATUS[selectedSR.status]?.color || ''}>{SR_STATUS[selectedSR.status]?.label || selectedSR.status}</Badge>
                {isCashPayment(selectedSR.notes || '')
                  ? <Badge variant="outline" className="border-amber-400 text-amber-600">💵 دفع عند الاستلام</Badge>
                  : <Badge variant="outline" className="border-green-400 text-green-600">✅ تم الدفع بالتحويل</Badge>}
              </div>
              {/* Route */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                <div className="flex items-start gap-2"><MapPin className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" /><div><p className="text-xs font-bold text-gray-500 mb-0.5">الاستلام</p><p className="font-semibold">{selectedSR.from_city}</p>{selectedSR.from_address && <p className="text-xs text-gray-500">{selectedSR.from_address}</p>}</div></div>
                <div className="flex items-start gap-2"><MapPin className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" /><div><p className="text-xs font-bold text-gray-500 mb-0.5">التسليم</p><p className="font-semibold">{selectedSR.to_city}</p>{selectedSR.to_address && <p className="text-xs text-gray-500">{selectedSR.to_address}</p>}</div></div>
              </div>
              {/* Details */}
              {selectedSR.description && <div className="border rounded-xl p-3"><p className="text-xs font-bold text-muted-foreground mb-1">التفاصيل</p><p>{selectedSR.description}</p></div>}
              {/* Notes parsed */}
              {selectedSR.notes && (
                <div className="border rounded-xl p-3 bg-gray-50">
                  <p className="text-xs font-bold text-muted-foreground mb-2">الملاحظات الكاملة</p>
                  <pre className="text-xs whitespace-pre-wrap font-sans text-gray-700">{selectedSR.notes}</pre>
                </div>
              )}
              {/* Receiver */}
              {selectedSR.receiver_name && <div className="grid grid-cols-2 gap-2 border rounded-xl p-3"><div><p className="text-xs text-muted-foreground">المستلم</p><p className="font-semibold">{selectedSR.receiver_name}</p></div>{selectedSR.receiver_phone && <div><p className="text-xs text-muted-foreground">الهاتف</p><p className="font-mono">{selectedSR.receiver_phone}</p></div>}</div>}
              {/* Price */}
              {selectedSR.proposed_price && (
                <div className="border-2 border-primary/30 rounded-xl p-3 bg-primary/5">
                  <p className="text-xs text-muted-foreground mb-1">السعر المحدد</p>
                  <p className="text-2xl font-black text-primary">{Number(selectedSR.proposed_price).toLocaleString()} ريال</p>
                  {isCashPayment(selectedSR.notes || '') && <p className="text-xs text-amber-600 font-bold mt-1">⚠️ يجب على المندوب تحصيل هذا المبلغ من العميل</p>}
                  {!isCashPayment(selectedSR.notes || '') && <p className="text-xs text-green-600 font-bold mt-1">✅ تم الدفع مسبقاً — لا تحصيل</p>}
                </div>
              )}
              {/* Rider */}
              {selectedSR.rider && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-center gap-3">
                  <Truck className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <div><p className="font-bold text-green-800">{selectedSR.rider.full_name}</p>{selectedSR.rider.phone && <p className="text-green-700 font-mono text-sm">{selectedSR.rider.phone}</p>}</div>
                  {selectedSR.rider.phone && (
                    <Button size="sm" onClick={() => { sendWhatsAppManual(selectedSR); setSelectedSR(null); }} className="mr-auto bg-green-600 hover:bg-green-700 text-white gap-1.5 text-xs">
                      <MessageCircle className="w-3.5 h-3.5" /> واتساب
                    </Button>
                  )}
                </div>
              )}
              <p className="text-xs text-muted-foreground">التاريخ: {new Date(selectedSR.created_at).toLocaleString('ar')}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Assign Rider (Restaurant) ── */}
      <Dialog open={showAssign} onOpenChange={setShowAssign}>
        <DialogContent dir="rtl">
          <DialogHeader><DialogTitle>تعيين مندوب — طلب مطعم</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Label>اختر مندوب</Label>
            <Select value={selectedRider} onValueChange={setSelectedRider}>
              <SelectTrigger><SelectValue placeholder="اختر مندوب..." /></SelectTrigger>
              <SelectContent>
                {riders.filter(r => r.is_active).map(r => <SelectItem key={r.id} value={r.id}>{r.full_name} {r.is_online ? "🟢" : "🔴"} - {r.vehicle_type}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter><Button onClick={handleAssign} disabled={!selectedRider} className="min-h-[44px]">تعيين</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Assign Rider (Service Request) ── */}
      <Dialog open={showAssignSR} onOpenChange={setShowAssignSR}>
        <DialogContent dir="rtl">
          <DialogHeader><DialogTitle>تعيين مندوب — طلب توصيل</DialogTitle></DialogHeader>
          {(() => {
            const sr = serviceRequests.find(r => r.id === assignSRId);
            const cash = sr ? isCashPayment(sr.notes || '') : false;
            return (
              <div className="space-y-4">
                {sr && (
                  <div className="bg-gray-50 rounded-xl p-3 text-sm space-y-1.5">
                    <p className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-green-500" /><strong>{sr.from_city}</strong> ← <strong>{sr.to_city}</strong></p>
                    {sr.description && <p className="text-muted-foreground text-xs">{sr.description}</p>}
                    {sr.proposed_price && cash && (
                      <p className="text-amber-700 font-bold flex items-center gap-1.5"><Banknote className="w-4 h-4" />المبلغ المطلوب تحصيله: {Number(sr.proposed_price).toLocaleString()} ريال</p>
                    )}
                    {sr.proposed_price && !cash && (
                      <p className="text-green-700 font-bold flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4" />تم الدفع — لا تحصيل على المندوب</p>
                    )}
                  </div>
                )}
                <div>
                  <Label className="mb-2 block">اختر مندوب</Label>
                  <Select value={selectedRiderSR} onValueChange={setSelectedRiderSR}>
                    <SelectTrigger><SelectValue placeholder="اختر مندوب..." /></SelectTrigger>
                    <SelectContent>
                      {riders.filter(r => r.is_active).map(r => <SelectItem key={r.id} value={r.id}>{r.full_name} {r.is_online ? "🟢" : "🔴"} — {r.phone || 'لا يوجد رقم'}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-xs text-muted-foreground flex items-center gap-1.5"><MessageCircle className="w-3.5 h-3.5 text-green-500" />سيتم فتح واتساب تلقائياً بعد التعيين لإرسال تفاصيل الطلب للمندوب</p>
              </div>
            );
          })()}
          <DialogFooter>
            <Button onClick={handleAssignRiderToSR} disabled={!selectedRiderSR} className="min-h-[44px] gap-2">
              <UserCheck className="w-4 h-4" /> تعيين وإرسال واتساب
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DeliveryOrders;

// ── Set Price Button ──────────────────────────────────────────────────────────
function SetPriceButton({ onSet }: { onSet: (price: number) => void }) {
  const [open, setOpen] = useState(false);
  const [price, setPrice] = useState('');
  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)} className="min-h-[40px] text-xs">
        💰 تحديد السعر
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent dir="rtl" className="max-w-xs">
          <DialogHeader><DialogTitle>تحديد سعر الطلب</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Label>السعر (ريال)</Label>
            <Input type="number" min="0" value={price} onChange={e => setPrice(e.target.value)} placeholder="مثال: 2500" className="text-lg font-bold" />
          </div>
          <DialogFooter>
            <Button onClick={() => { if (price && Number(price) > 0) { onSet(Number(price)); setOpen(false); setPrice(''); } }} disabled={!price || Number(price) <= 0} className="min-h-[44px]">
              تأكيد السعر وإشعار العميل
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
