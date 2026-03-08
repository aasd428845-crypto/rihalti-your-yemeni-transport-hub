import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Package, MapPin, Phone, DollarSign, Clock, User, CheckCircle, Truck, Store, Navigation, MessageCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import BackButton from "@/components/common/BackButton";
import OrderChat from "@/components/orders/OrderChat";

const STATUS_FLOW: Record<string, { next: string; label: string; icon: any }> = {
  pending: { next: "assigned", label: "قبول الطلب", icon: CheckCircle },
  assigned: { next: "picked_up", label: "تم استلام الطلب", icon: Package },
  picked_up: { next: "in_transit", label: "في الطريق للعميل", icon: Truck },
  in_transit: { next: "delivered", label: "تم التوصيل", icon: CheckCircle },
};

const STATUS_BADGES: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  pending: { label: "بانتظار مندوب", variant: "secondary" },
  assigned: { label: "تم التعيين", variant: "default" },
  picked_up: { label: "تم الاستلام", variant: "default" },
  in_transit: { label: "في الطريق", variant: "default" },
  delivered: { label: "تم التوصيل", variant: "outline" },
  cancelled: { label: "ملغي", variant: "destructive" },
};

const DeliveryDriverOrderDetails = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const [order, setOrder] = useState<any>(null);
  const [driverData, setDriverData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [showChat, setShowChat] = useState(false);

  // Fetch order + driver data
  useEffect(() => {
    if (!user || !id) return;
    const load = async () => {
      const [orderRes, driverRes] = await Promise.all([
        supabase.from("delivery_orders").select("*").eq("id", id).maybeSingle(),
        supabase.from("delivery_drivers").select("*").eq("user_id", user.id).maybeSingle(),
      ]);
      setOrder(orderRes.data);
      setDriverData(driverRes.data);
      setLoading(false);
    };
    load();
  }, [user, id]);

  // Real-time order status subscription
  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`order_rt_${id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "delivery_orders", filter: `id=eq.${id}` }, (payload) => {
        setOrder((prev: any) => prev ? { ...prev, ...payload.new } : payload.new);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id]);

  const sendNotification = (userId: string, title: string, body: string, data: Record<string, string>) => {
    supabase.functions.invoke("send-push-notification", { body: { userId, title, body, data } });
  };

  const acceptOrder = async () => {
    if (!order || !driverData) return;
    setUpdating(true);
    const { error } = await supabase
      .from("delivery_orders")
      .update({ rider_id: driverData.id, status: "assigned", assigned_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("id", order.id)
      .eq("status", "pending");

    if (error) {
      toast({ title: "خطأ", description: "تعذر قبول الطلب. ربما تم قبوله من مندوب آخر.", variant: "destructive" });
    } else {
      toast({ title: "تم قبول الطلب ✅", description: "توجه لاستلام الطلب" });
      if (order.customer_id) sendNotification(order.customer_id, "تم تعيين مندوب لطلبك 🚚", "مندوب التوصيل في طريقه لاستلام طلبك", { type: "delivery_assigned", orderId: order.id });
      if (order.delivery_company_id) sendNotification(order.delivery_company_id, "تم قبول طلب من مندوب", `المندوب قبل الطلب #${order.id.slice(0, 8)}`, { type: "order_accepted", orderId: order.id });
    }
    setUpdating(false);
  };

  const updateStatus = async (newStatus: string) => {
    if (!order) return;
    setUpdating(true);
    const updates: any = { status: newStatus, updated_at: new Date().toISOString() };
    if (newStatus === "picked_up") updates.picked_up_at = new Date().toISOString();
    if (newStatus === "delivered") updates.delivered_at = new Date().toISOString();

    const { error } = await supabase.from("delivery_orders").update(updates).eq("id", order.id);
    if (error) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "تم التحديث ✅" });
      const statusMessages: Record<string, string> = {
        picked_up: "تم استلام طلبك من المطعم 📦",
        in_transit: "طلبك في الطريق إليك 🚚",
        delivered: "تم توصيل طلبك بنجاح ✅",
      };
      if (order.customer_id && statusMessages[newStatus]) {
        sendNotification(order.customer_id, statusMessages[newStatus], statusMessages[newStatus], { type: "delivery_status", orderId: order.id, status: newStatus });
      }
      if (newStatus === "delivered" && driverData) {
        const { data: settings } = await supabase.from("accounting_settings").select("global_commission_delivery").limit(1).maybeSingle();
        const commRate = settings?.global_commission_delivery || 12;
        const amount = order.delivery_fee || order.total || 0;
        const commission = Math.floor(amount * commRate / 100);
        await supabase.from("financial_transactions").insert({
          partner_id: user!.id, customer_id: order.customer_id || user!.id, reference_id: order.id,
          amount, platform_commission: commission, partner_earning: amount - commission,
          transaction_type: "delivery", payment_method: order.payment_method || "cash",
        });
      }
    }
    setUpdating(false);
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
  }

  if (!order) {
    return (
      <div className="text-center py-20 space-y-4">
        <Package className="w-16 h-16 mx-auto text-muted-foreground" />
        <h2 className="text-xl font-bold text-foreground">الطلب غير موجود</h2>
        <BackButton />
      </div>
    );
  }

  const items = Array.isArray(order.items) ? order.items : [];
  const isMyOrder = order.rider_id === driverData?.id;
  const canAccept = order.status === "pending" && !order.rider_id;
  const statusInfo = STATUS_BADGES[order.status] || { label: order.status, variant: "outline" as const };
  const flow = STATUS_FLOW[order.status];
  const canAct = canAccept || (isMyOrder && flow);
  const hasLocation = order.delivery_lat && order.delivery_lng;
  const chatUnlocked = isMyOrder && ["assigned", "picked_up", "in_transit"].includes(order.status);

  const handleAction = () => {
    if (canAccept) return acceptOrder();
    if (flow) return updateStatus(flow.next);
  };

  const openInGoogleMaps = () => {
    if (hasLocation) window.open(`https://www.google.com/maps/dir/?api=1&destination=${order.delivery_lat},${order.delivery_lng}`, "_blank");
  };

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <BackButton />

      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">تفاصيل الطلب</h1>
        <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
      </div>

      {/* Customer Info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><User className="w-4 h-4 text-primary" />معلومات العميل</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center gap-2 text-sm"><User className="w-4 h-4 text-muted-foreground" /><span className="text-foreground font-medium">{order.customer_name}</span></div>
          <div className="flex items-center gap-2 text-sm"><MapPin className="w-4 h-4 text-muted-foreground" /><span className="text-foreground">{order.customer_address}</span></div>
          {(isMyOrder || order.status !== "pending") && order.customer_phone && !order.customer_phone_hidden && (
            <div className="flex items-center gap-2 text-sm">
              <Phone className="w-4 h-4 text-muted-foreground" />
              <a href={`tel:${order.customer_phone}`} className="text-primary hover:underline" dir="ltr">{order.customer_phone}</a>
            </div>
          )}
          {/* Google Maps Navigation */}
          {hasLocation && isMyOrder && (
            <Button variant="outline" size="sm" className="w-full mt-2" onClick={openInGoogleMaps}>
              <Navigation className="w-4 h-4 ml-2" />
              فتح في خرائط Google
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Order Items */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Store className="w-4 h-4 text-primary" />الأصناف ({items.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground">لا توجد تفاصيل أصناف</p>
          ) : (
            <div className="space-y-2">
              {items.map((item: any, i: number) => (
                <div key={i} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs min-w-[24px] justify-center">{item.quantity || 1}</Badge>
                    <span className="text-sm text-foreground">{item.name || item.name_ar || `صنف ${i + 1}`}</span>
                  </div>
                  <span className="text-sm font-medium text-foreground">{item.price || "—"} ر.ي</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pricing */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><DollarSign className="w-4 h-4 text-primary" />الحساب</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between text-sm"><span className="text-muted-foreground">المجموع الفرعي</span><span className="text-foreground">{order.subtotal} ر.ي</span></div>
          <div className="flex justify-between text-sm"><span className="text-muted-foreground">رسوم التوصيل</span><span className="text-foreground">{order.delivery_fee} ر.ي</span></div>
          {order.tax > 0 && <div className="flex justify-between text-sm"><span className="text-muted-foreground">الضريبة</span><span className="text-foreground">{order.tax} ر.ي</span></div>}
          <Separator />
          <div className="flex justify-between text-sm font-bold"><span className="text-foreground">الإجمالي</span><span className="text-primary">{order.total} ر.ي</span></div>
        </CardContent>
      </Card>

      {/* Timestamps */}
      <Card>
        <CardContent className="pt-4 space-y-2">
          {[
            { key: "created_at", label: "إنشاء الطلب" },
            { key: "assigned_at", label: "تعيين المندوب" },
            { key: "picked_up_at", label: "الاستلام" },
            { key: "delivered_at", label: "التوصيل" },
          ].map(({ key, label }) => order[key] && (
            <div key={key} className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              {label}: {new Date(order[key]).toLocaleString("ar-YE")}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Action Button */}
      {canAct && (
        <Button className="w-full h-12 text-base font-bold" onClick={handleAction} disabled={updating}>
          {updating ? (
            <div className="animate-spin w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full" />
          ) : (
            <>
              {canAccept ? <CheckCircle className="w-5 h-5 ml-2" /> : flow && <flow.icon className="w-5 h-5 ml-2" />}
              {canAccept ? "قبول الطلب" : flow?.label}
            </>
          )}
        </Button>
      )}

      {order.status === "delivered" && (
        <div className="text-center py-4">
          <CheckCircle className="w-12 h-12 mx-auto text-primary mb-2" />
          <p className="text-foreground font-bold">تم التوصيل بنجاح</p>
        </div>
      )}

      {/* Chat Toggle & Panel */}
      {isMyOrder && order.status !== "delivered" && order.status !== "cancelled" && (
        <>
          <Button variant="outline" className="w-full" onClick={() => setShowChat(!showChat)}>
            <MessageCircle className="w-4 h-4 ml-2" />
            {showChat ? "إخفاء الدردشة" : "الدردشة مع العميل"}
          </Button>
          {showChat && (
            <OrderChat orderId={order.id} orderType="delivery" isUnlocked={chatUnlocked} />
          )}
        </>
      )}
    </div>
  );
};

export default DeliveryDriverOrderDetails;
