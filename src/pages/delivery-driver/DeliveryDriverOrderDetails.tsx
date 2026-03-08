import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Package, MapPin, Phone, DollarSign, Clock, User, ArrowRight, CheckCircle, Truck, Store } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import BackButton from "@/components/common/BackButton";

const DeliveryDriverOrderDetails = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [order, setOrder] = useState<any>(null);
  const [driverData, setDriverData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (!user || !id) return;
    const fetch = async () => {
      const [orderRes, driverRes] = await Promise.all([
        supabase.from("delivery_orders").select("*").eq("id", id).maybeSingle(),
        supabase.from("delivery_drivers").select("*").eq("user_id", user.id).maybeSingle(),
      ]);
      setOrder(orderRes.data);
      setDriverData(driverRes.data);
      setLoading(false);
    };
    fetch();
  }, [user, id]);

  const acceptOrder = async () => {
    if (!order || !driverData) return;
    setUpdating(true);
    const { error } = await supabase
      .from("delivery_orders")
      .update({
        rider_id: driverData.id,
        status: "assigned",
        assigned_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", order.id)
      .eq("status", "pending"); // Ensure still pending

    if (error) {
      toast({ title: "خطأ", description: "تعذر قبول الطلب. ربما تم قبوله من مندوب آخر.", variant: "destructive" });
    } else {
      toast({ title: "تم قبول الطلب ✅", description: "توجه لاستلام الطلب" });
      setOrder({ ...order, rider_id: driverData.id, status: "assigned", assigned_at: new Date().toISOString() });
      // Notify customer
      if (order.customer_id) {
        supabase.functions.invoke("send-push-notification", {
          body: {
            userId: order.customer_id,
            title: "تم تعيين مندوب لطلبك 🚚",
            body: "مندوب التوصيل في طريقه لاستلام طلبك",
            data: { type: "delivery_assigned", orderId: order.id },
          },
        });
      }
      // Notify company
      if (order.delivery_company_id) {
        supabase.functions.invoke("send-push-notification", {
          body: {
            userId: order.delivery_company_id,
            title: "تم قبول طلب من مندوب",
            body: `المندوب قبل الطلب #${order.id.slice(0, 8)}`,
            data: { type: "order_accepted", orderId: order.id },
          },
        });
      }
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
      setOrder({ ...order, ...updates });
      toast({ title: "تم التحديث ✅" });

      // Notify customer
      if (order.customer_id) {
        const statusMessages: Record<string, string> = {
          picked_up: "تم استلام طلبك من المطعم 📦",
          in_transit: "طلبك في الطريق إليك 🚚",
          delivered: "تم توصيل طلبك بنجاح ✅",
        };
        supabase.functions.invoke("send-push-notification", {
          body: {
            userId: order.customer_id,
            title: statusMessages[newStatus] || "تحديث الطلب",
            body: statusMessages[newStatus] || `حالة الطلب: ${newStatus}`,
            data: { type: "delivery_status", orderId: order.id, status: newStatus },
          },
        });
      }

      // If delivered, create financial transaction
      if (newStatus === "delivered" && driverData) {
        const { data: settings } = await supabase
          .from("accounting_settings")
          .select("global_commission_delivery")
          .limit(1)
          .maybeSingle();
        const commRate = settings?.global_commission_delivery || 12;
        const amount = order.delivery_fee || order.total || 0;
        const commission = Math.floor(amount * commRate / 100);

        await supabase.from("financial_transactions").insert({
          partner_id: user!.id,
          customer_id: order.customer_id || user!.id,
          reference_id: order.id,
          amount,
          platform_commission: commission,
          partner_earning: amount - commission,
          transaction_type: "delivery",
          payment_method: order.payment_method || "cash",
        });
      }
    }
    setUpdating(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
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

  const getStatusBadge = (status: string) => {
    const map: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
      pending: { label: "بانتظار مندوب", variant: "secondary" },
      assigned: { label: "تم التعيين", variant: "default" },
      picked_up: { label: "تم الاستلام", variant: "default" },
      in_transit: { label: "في الطريق", variant: "default" },
      delivered: { label: "تم التوصيل", variant: "outline" },
      cancelled: { label: "ملغي", variant: "destructive" },
    };
    const info = map[status] || { label: status, variant: "outline" as const };
    return <Badge variant={info.variant}>{info.label}</Badge>;
  };

  const getNextAction = () => {
    if (canAccept) return { label: "قبول الطلب", action: acceptOrder, icon: CheckCircle };
    if (!isMyOrder) return null;
    switch (order.status) {
      case "assigned": return { label: "تم استلام الطلب", action: () => updateStatus("picked_up"), icon: Package };
      case "picked_up": return { label: "في الطريق للعميل", action: () => updateStatus("in_transit"), icon: Truck };
      case "in_transit": return { label: "تم التوصيل", action: () => updateStatus("delivered"), icon: CheckCircle };
      default: return null;
    }
  };

  const nextAction = getNextAction();

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <BackButton />

      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">تفاصيل الطلب</h1>
        {getStatusBadge(order.status)}
      </div>

      {/* Customer Info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="w-4 h-4 text-primary" />
            معلومات العميل
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <User className="w-4 h-4 text-muted-foreground" />
            <span className="text-foreground font-medium">{order.customer_name}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="w-4 h-4 text-muted-foreground" />
            <span className="text-foreground">{order.customer_address}</span>
          </div>
          {(isMyOrder || order.status !== "pending") && order.customer_phone && !order.customer_phone_hidden && (
            <div className="flex items-center gap-2 text-sm">
              <Phone className="w-4 h-4 text-muted-foreground" />
              <a href={`tel:${order.customer_phone}`} className="text-primary hover:underline" dir="ltr">
                {order.customer_phone}
              </a>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Order Items */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Store className="w-4 h-4 text-primary" />
            الأصناف ({items.length})
          </CardTitle>
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
          <CardTitle className="text-base flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-primary" />
            الحساب
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">المجموع الفرعي</span>
            <span className="text-foreground">{order.subtotal} ر.ي</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">رسوم التوصيل</span>
            <span className="text-foreground">{order.delivery_fee} ر.ي</span>
          </div>
          {order.tax > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">الضريبة</span>
              <span className="text-foreground">{order.tax} ر.ي</span>
            </div>
          )}
          <Separator />
          <div className="flex justify-between text-sm font-bold">
            <span className="text-foreground">الإجمالي</span>
            <span className="text-primary">{order.total} ر.ي</span>
          </div>
        </CardContent>
      </Card>

      {/* Timestamps */}
      <Card>
        <CardContent className="pt-4 space-y-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            إنشاء الطلب: {new Date(order.created_at).toLocaleString("ar-YE")}
          </div>
          {order.assigned_at && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              تعيين المندوب: {new Date(order.assigned_at).toLocaleString("ar-YE")}
            </div>
          )}
          {order.picked_up_at && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              الاستلام: {new Date(order.picked_up_at).toLocaleString("ar-YE")}
            </div>
          )}
          {order.delivered_at && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              التوصيل: {new Date(order.delivered_at).toLocaleString("ar-YE")}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Button */}
      {nextAction && (
        <Button
          className="w-full h-12 text-base font-bold"
          onClick={nextAction.action}
          disabled={updating}
        >
          {updating ? (
            <div className="animate-spin w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full" />
          ) : (
            <>
              <nextAction.icon className="w-5 h-5 ml-2" />
              {nextAction.label}
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
    </div>
  );
};

export default DeliveryDriverOrderDetails;
