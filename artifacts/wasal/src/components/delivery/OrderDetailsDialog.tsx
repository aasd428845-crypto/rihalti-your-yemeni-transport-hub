import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreditCard, CheckCircle2, ExternalLink, MapPin, Package } from "lucide-react";
import { getOrderTracking, updateOrderStatus } from "@/lib/deliveryApi";
import { ORDER_STATUS_MAP } from "@/types/delivery.types";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { isDeliveryRequest, getDeliveryRequestInfo } from "@/lib/riderMessageBuilder";
import { logNotificationFailure } from "@/lib/notificationFailureLogger";

interface Props {
  order: any | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const OrderDetailsDialog = ({ order, onClose, onSuccess }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tracking, setTracking] = useState<any[]>([]);
  const [paymentTx, setPaymentTx] = useState<any>(null);

  useEffect(() => {
    if (!order) { setTracking([]); setPaymentTx(null); return; }
    setPaymentTx(null);
    Promise.all([
      getOrderTracking(order.id),
      supabase.from("payment_transactions")
        .select("*")
        .eq("related_entity_id", order.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()
        .then(({ data }) => data, () => null),
    ]).then(([trackingData, txData]) => {
      setTracking(trackingData || []);
      setPaymentTx(txData || null);
    }).catch(() => {});
  }, [order?.id]);

  const handleConfirmOrder = async () => {
    if (!order || !user) return;
    try {
      await updateOrderStatus(order.id, "confirmed");
      if (paymentTx?.id && paymentTx.status === "pending" && order.payment_method !== "cash") {
        await supabase
          .from("payment_transactions")
          .update({ status: "verified", verified_by: user.id, verified_at: new Date().toISOString() })
          .eq("id", paymentTx.id);
      }
      const pushPayload = {
        userId: order.customer_id,
        title: "✅ تم تأكيد طلبك!",
        body: `تم قبول طلبك من ${order.restaurant?.name_ar || "المطعم"}. جاري التحضير 🍳`,
        sound: "order_confirmed",
        data: { type: "order_confirmed", orderId: order.id },
      };
      try {
        await supabase.functions.invoke("send-push-notification", { body: pushPayload });
      } catch (pushErr) {
        logNotificationFailure("send-push-notification", pushPayload, pushErr);
      }
      const inAppPayload = {
        user_id: order.customer_id,
        title: "✅ تم تأكيد طلبك!",
        body: `تم قبول طلبك. جاري التحضير...`,
        data: { type: "order_confirmed", orderId: order.id },
      };
      try {
        await supabase.from("notifications").insert(inAppPayload as any);
      } catch (inAppErr) {
        logNotificationFailure("notifications.insert", inAppPayload, inAppErr);
      }
      toast({ title: "✅ تم تأكيد الطلب", description: "تم إشعار العميل بصوت وإشعار فوري" });
      onClose();
      onSuccess();
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    }
  };

  return (
    <Dialog open={!!order} onOpenChange={() => onClose()}>
      <DialogContent dir="rtl" className="max-w-lg flex flex-col max-h-[90vh] p-0">
        <DialogHeader className="px-4 pt-4 pb-2 border-b shrink-0"><DialogTitle>تفاصيل الطلب</DialogTitle></DialogHeader>
        {order && (
          <div className="space-y-4 text-sm overflow-y-auto flex-1 px-4 py-4">
            <div className="grid grid-cols-2 gap-2">
              <div><span className="text-muted-foreground">العميل:</span> {order.customer_name}</div>
              <div><span className="text-muted-foreground">الهاتف:</span> {order.customer_phone}</div>
              <div className="col-span-2"><span className="text-muted-foreground">العنوان:</span> {order.customer_address}</div>
              <div><span className="text-muted-foreground">المبلغ:</span> {Number(order.total).toLocaleString()} ر.ي</div>
              <div><span className="text-muted-foreground">التوصيل:</span> {Number(order.delivery_fee).toLocaleString()} ر.ي</div>
              <div><span className="text-muted-foreground">الدفع:</span> {order.payment_method === "cash" ? "نقداً عند الاستلام" : order.payment_method === "bank_transfer" ? "تحويل بنكي" : order.payment_method || "معلق"}</div>
              {order.restaurant && (
                <div className="col-span-2"><span className="text-muted-foreground">المطعم:</span> <span className="font-medium">{order.restaurant.name_ar}</span></div>
              )}
              {order.payment_status && (
                <div><span className="text-muted-foreground">حالة الدفع:</span> <Badge variant="outline">{order.payment_status === "paid" ? "مدفوع" : order.payment_status === "pending" ? "معلق" : order.payment_status}</Badge></div>
              )}
            </div>

            {/* ── Payment Details Section ── */}
            {order.payment_method === "cash" ? (
              <div className="border rounded-xl p-3 space-y-2 bg-amber-50/60 dark:bg-amber-950/20 border-amber-300/60">
                <h4 className="font-bold flex items-center gap-2 text-amber-800 dark:text-amber-300">
                  <CreditCard className="w-4 h-4" />تفاصيل الدفع — عند الاستلام
                </h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div><span className="text-muted-foreground">طريقة الدفع: </span><span className="font-semibold">💵 نقداً عند التسليم</span></div>
                  <div>
                    <span className="text-muted-foreground">حالة التحصيل: </span>
                    <Badge variant="outline" className={order.status === "delivered" ? "border-green-500 text-green-600" : "border-amber-500 text-amber-600"}>
                      {order.status === "delivered" ? "✅ تم التحصيل" : "⏳ سيُحصَّل عند التسليم"}
                    </Badge>
                  </div>
                  <div className="col-span-2">
                    <span className="text-muted-foreground">المبلغ المطلوب تحصيله من العميل: </span>
                    <span className="font-bold text-lg text-amber-700 dark:text-amber-300">{Number(order.total).toLocaleString()} ر.ي</span>
                  </div>
                  {order.rider ? (
                    <div className="col-span-2 bg-amber-100/80 dark:bg-amber-900/30 rounded-lg p-2 border border-amber-200">
                      <p className="font-semibold text-amber-900 dark:text-amber-200 mb-0.5">📋 المندوب المسؤول عن التحصيل</p>
                      <p className="font-bold">{order.rider.full_name}</p>
                      <p className="text-muted-foreground mt-0.5">
                        سيُسجَّل مبلغ <span className="font-bold text-amber-700 dark:text-amber-300">{Number(order.total).toLocaleString()} ر.ي</span> على ذمة المندوب عند التسليم
                      </p>
                    </div>
                  ) : (
                    <div className="col-span-2 text-amber-600 text-xs bg-amber-100/60 rounded-lg p-2">
                      ⚠️ لم يُعيَّن مندوب بعد — سيُسجَّل المبلغ على المندوب عند تعيينه
                    </div>
                  )}
                </div>
              </div>
            ) : (paymentTx || order.payment_method === "bank_transfer") && (
              <div className="border rounded-xl p-3 space-y-2 bg-muted/30">
                <h4 className="font-bold flex items-center gap-2"><CreditCard className="w-4 h-4 text-primary" />تفاصيل الدفع</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div><span className="text-muted-foreground">طريقة الدفع: </span><span className="font-semibold">{order.payment_method === "bank_transfer" ? "🏦 تحويل بنكي" : order.payment_method}</span></div>
                  <div>
                    <span className="text-muted-foreground">حالة الدفع: </span>
                    <Badge variant="outline" className={paymentTx?.status === "verified" ? "border-green-500 text-green-600" : paymentTx?.status === "pending" ? "border-amber-500 text-amber-600" : order.payment_status === "paid" ? "border-green-500 text-green-600" : ""}>
                      {paymentTx?.status === "verified" ? "✅ موثّق" : paymentTx?.status === "pending" ? "⏳ قيد المراجعة" : order.payment_status === "paid" ? "✅ مدفوع" : "⏳ معلق"}
                    </Badge>
                  </div>
                  {paymentTx?.amount && <div><span className="text-muted-foreground">المبلغ المحوَّل: </span><span className="font-bold text-primary">{Number(paymentTx.amount).toLocaleString()} ر.ي</span></div>}
                  {paymentTx?.transfer_reference && (
                    <div className="col-span-2 flex items-center gap-2">
                      <span className="text-muted-foreground">رقم المرجع: </span>
                      <span className="font-bold font-mono tracking-wider bg-muted px-2 py-0.5 rounded">{paymentTx.transfer_reference}</span>
                    </div>
                  )}
                  {paymentTx?.notes && <div className="col-span-2"><span className="text-muted-foreground">ملاحظات: </span><span>{paymentTx.notes}</span></div>}
                  {paymentTx?.created_at && <div className="col-span-2"><span className="text-muted-foreground">وقت الإيداع: </span><span>{new Date(paymentTx.created_at).toLocaleString("ar")}</span></div>}
                </div>
                {paymentTx?.transfer_receipt_url && (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground font-medium">📎 صورة إيصال التحويل:</p>
                    <Button size="sm" className="w-full gap-2 bg-primary text-white" onClick={() => window.open(paymentTx.transfer_receipt_url, "_blank")}>
                      <ExternalLink className="w-3.5 h-3.5" /> فتح صورة الإيصال ↗
                    </Button>
                    <div className="relative rounded-lg overflow-hidden border cursor-pointer bg-muted/30" onClick={() => window.open(paymentTx.transfer_receipt_url, "_blank")}>
                      <img src={paymentTx.transfer_receipt_url} alt="إيصال التحويل" className="w-full max-h-56 object-contain" referrerPolicy="no-referrer"
                        onError={(e) => {
                          const img = e.target as HTMLImageElement;
                          img.style.display = "none";
                          const parent = img.parentElement;
                          if (parent && !parent.querySelector(".receipt-fallback")) {
                            const fb = document.createElement("div");
                            fb.className = "receipt-fallback p-4 text-center text-xs text-muted-foreground";
                            fb.textContent = "اضغط على الزر أعلاه لفتح صورة الإيصال";
                            parent.appendChild(fb);
                          }
                        }}
                      />
                    </div>
                  </div>
                )}
                {!paymentTx?.transfer_receipt_url && order.payment_method === "bank_transfer" && (
                  <p className="text-xs text-amber-600 bg-amber-50 rounded-lg p-2">⚠️ لم يتم رفع صورة الإيصال بعد</p>
                )}
              </div>
            )}

            {/* ── Confirm Button ── */}
            {!["delivered", "cancelled", "confirmed", "assigned", "picked_up", "on_the_way"].includes(order.status) && (
              <div className="border-2 border-primary/30 rounded-xl p-3 bg-primary/5 space-y-2">
                <p className="text-sm font-semibold text-primary flex items-center gap-2"><CheckCircle2 className="w-4 h-4" />الطلب يحتاج تأكيداً</p>
                {paymentTx?.status === "pending" && (
                  <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-2 py-1">⏳ الدفع قيد المراجعة — سيتم توثيقه تلقائياً عند التأكيد</p>
                )}
                <Button className="w-full gap-2 min-h-[48px] text-base font-bold" onClick={handleConfirmOrder}>
                  <CheckCircle2 className="w-5 h-5" />تأكيد الطلب وإشعار العميل
                </Button>
              </div>
            )}

            {/* ── Delivery Request Info ── */}
            {isDeliveryRequest(order) && (() => {
              const info = getDeliveryRequestInfo(order);
              const svcMap: Record<string, string> = { parcel: "نقل طرد 📦", shopping: "تسوق 🛍️", meal: "توصيل وجبة 🍔" };
              const sizeMap: Record<string, string> = { small: "صغير", medium: "متوسط", large: "كبير" };
              return (
                <div className="border rounded-xl p-3 space-y-2 bg-muted/30">
                  <h4 className="font-bold flex items-center gap-2 text-sm"><Package className="w-4 h-4 text-primary" /> تفاصيل طلب التوصيل</h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div><span className="text-muted-foreground">نوع الخدمة: </span><span className="font-semibold">{svcMap[info.serviceType] || info.serviceType}</span></div>
                    {info.itemSize && <div><span className="text-muted-foreground">الحجم: </span><span>{sizeMap[info.itemSize] || info.itemSize}</span></div>}
                    {info.itemDescription && <div className="col-span-2"><span className="text-muted-foreground">وصف الطرد: </span><span>{info.itemDescription}</span></div>}
                    {info.notes && <div className="col-span-2"><span className="text-muted-foreground">ملاحظات: </span><span>{info.notes}</span></div>}
                  </div>
                  <div className="border-t pt-2 space-y-1.5 text-xs">
                    <div className="flex items-start gap-2">
                      <span className="w-2 h-2 rounded-full bg-green-500 mt-1 shrink-0" />
                      <div>
                        <span className="text-muted-foreground">من: </span><span className="font-medium">{info.pickupAddress}</span>
                        {info.pickupLandmark && <span className="text-muted-foreground"> ({info.pickupLandmark})</span>}
                        {info.pickupLat && (
                          <a href={`https://maps.google.com/?q=${info.pickupLat},${info.pickupLng}`} target="_blank" rel="noreferrer" className="mr-2 text-primary hover:underline inline-flex items-center gap-0.5">
                            <MapPin className="w-3 h-3" /> خريطة
                          </a>
                        )}
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="w-2 h-2 rounded-full bg-red-500 mt-1 shrink-0" />
                      <div>
                        <span className="text-muted-foreground">إلى: </span><span className="font-medium">{order.customer_address}</span>
                        {info.deliveryLandmark && <span className="text-muted-foreground"> ({info.deliveryLandmark})</span>}
                        {order.delivery_lat && (
                          <a href={`https://maps.google.com/?q=${order.delivery_lat},${order.delivery_lng}`} target="_blank" rel="noreferrer" className="mr-2 text-primary hover:underline inline-flex items-center gap-0.5">
                            <MapPin className="w-3 h-3" /> خريطة
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="border-t pt-2 grid grid-cols-2 gap-2 text-xs">
                    <div><span className="text-muted-foreground">المرسِل: </span><span className="font-medium">{info.senderName}</span></div>
                    <div><span className="text-muted-foreground">هاتف المرسِل: </span><span>{info.senderPhone}</span></div>
                    <div><span className="text-muted-foreground">المستلِم: </span><span className="font-medium">{info.recipientName}</span></div>
                    <div><span className="text-muted-foreground">هاتف المستلِم: </span><span>{info.recipientPhone}</span></div>
                  </div>
                  {info.distanceKm && (
                    <div className="text-xs text-muted-foreground pt-1">
                      📏 المسافة: <strong>{info.distanceKm} كم</strong>
                      {info.pricePerKm ? ` · سعر الكم: ${info.pricePerKm} ر.ي` : ""}
                    </div>
                  )}
                  {info.imageUrl && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">📷 صورة الطرد:</p>
                      <img src={info.imageUrl} alt="الطرد" className="rounded-lg max-h-32 object-contain border" />
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Google Maps link (non-delivery-request) */}
            {!isDeliveryRequest(order) && order.delivery_lat && order.delivery_lng && (
              <a href={`https://www.google.com/maps?q=${order.delivery_lat},${order.delivery_lng}`} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-primary hover:underline text-sm">
                📍 فتح الموقع في Google Maps
              </a>
            )}

            {/* Items list */}
            {!isDeliveryRequest(order) && (
              <div>
                <h4 className="font-bold mb-2">العناصر:</h4>
                {(order.items || []).map((item: any, i: number) => {
                  const opts = item.selectedOptions && typeof item.selectedOptions === "object" ? item.selectedOptions : {};
                  const flatChoices: { name_ar: string; price: number; image_url?: string }[] = [];
                  Object.values(opts).forEach((v: any) => {
                    if (Array.isArray(v)) v.forEach((c: any) => c?.name_ar && flatChoices.push(c));
                    else if (v?.name_ar) flatChoices.push(v);
                  });
                  return (
                    <div key={i} className="border-b py-2 space-y-1.5">
                      <div className="flex justify-between gap-2">
                        <span className="font-medium">{item.name_ar || item.name} × {item.quantity}</span>
                        <span className="text-primary font-semibold whitespace-nowrap">{Number(item.price * item.quantity).toLocaleString()} ر.ي</span>
                      </div>
                      {flatChoices.length > 0 && (
                        <div className="bg-muted/40 rounded-md p-2 space-y-1">
                          <div className="text-[11px] font-bold text-muted-foreground">الإضافات:</div>
                          <div className="flex flex-wrap gap-1.5">
                            {flatChoices.map((c, j) => (
                              <span key={j} className="inline-flex items-center gap-1 bg-background border border-border/60 rounded-full pr-1 pl-2 py-0.5 text-xs">
                                {c.image_url && <img src={c.image_url} alt="" className="w-4 h-4 rounded-full object-cover" />}
                                <span>{c.name_ar}</span>
                                {Number(c.price) > 0 && <span className="text-muted-foreground">+{c.price}</span>}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {item.notes && (
                        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-md p-2 text-xs">
                          <span className="font-bold text-amber-700 dark:text-amber-400">📌 ملاحظة العميل: </span>
                          <span>{item.notes}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Tracking */}
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
  );
};
