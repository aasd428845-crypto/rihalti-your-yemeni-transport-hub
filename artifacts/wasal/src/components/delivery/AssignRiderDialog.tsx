import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageCircle, ExternalLink, Truck, CreditCard } from "lucide-react";
import { assignRiderToOrder, getRiderOutstandingCash } from "@/lib/deliveryApi";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { isDeliveryRequest, getDeliveryRequestInfo, buildRiderWhatsApp, buildRiderTelegram } from "@/lib/riderMessageBuilder";

interface Props {
  open: boolean;
  assignOrderId: string;
  orders: any[];
  riders: any[];
  onClose: () => void;
  onSuccess: () => void;
}

export const AssignRiderDialog = ({ open, assignOrderId, orders, riders, onClose, onSuccess }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedRider, setSelectedRider] = useState("");
  const [riderOutstanding, setRiderOutstanding] = useState(0);
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    if (!open) { setSelectedRider(""); setRiderOutstanding(0); }
  }, [open]);

  useEffect(() => {
    if (!selectedRider) { setRiderOutstanding(0); return; }
    getRiderOutstandingCash(selectedRider)
      .then(setRiderOutstanding)
      .catch(() => setRiderOutstanding(0));
  }, [selectedRider]);

  const handleAssign = async () => {
    if (!selectedRider || assigning) return;
    setAssigning(true);
    try {
      await assignRiderToOrder(assignOrderId, selectedRider);

      const order = orders.find(o => o.id === assignOrderId);
      const rider = riders.find(r => r.id === selectedRider);

      if (order && rider) {
        const isReq = isDeliveryRequest(order);
        const info = isReq ? getDeliveryRequestInfo(order) : null;
        const amount = Number(order.total || 0);

        let paymentMsg = "";
        if (order.payment_method === "cash" && amount > 0) {
          paymentMsg = `💵 يرجى تحصيل ${amount.toLocaleString()} ر.ي نقداً عند الاستلام`;
        } else if (order.payment_method === "bank_transfer") {
          paymentMsg = "✅ تم الدفع مسبقاً عبر تحويل بنكي — لا يلزم تحصيل أي مبلغ";
        }

        const pickupAddr = info?.pickupAddress || order.customer_address || "";
        const dropoffAddr = order.customer_address || "";
        const notifBody = [
          `📍 من: ${pickupAddr}`,
          `📍 إلى: ${dropoffAddr}`,
          paymentMsg,
        ].filter(Boolean).join(" | ");

        try {
          await supabase.functions.invoke("send-push-notification", {
            body: {
              userId: rider.user_id || rider.id,
              title: "🚚 تم تعيينك في طلب جديد!",
              body: notifBody,
              sound: "delivery",
              data: { type: "rider_assigned", orderId: assignOrderId },
            },
          });
        } catch (_) {}

        try {
          await (supabase.from as any)("notifications").insert({
            user_id: rider.user_id || rider.id,
            title: "🚚 تم تعيينك في طلب جديد!",
            body: notifBody,
            data: { type: "rider_assigned", order_id: assignOrderId },
            is_read: false,
          });
        } catch (_) {}
      }

      toast({ title: "تم تعيين المندوب بنجاح", description: "تم إرسال إشعار للمندوب بتفاصيل الدفع" });
      onClose();
      onSuccess();
    } catch (err: any) {
      const alreadyAssigned = /تم تعيين مندوب آخر لهذا الطلب بالفعل/.test(err.message || "");
      toast({
        title: alreadyAssigned ? "لم يعد بالإمكان تعيين هذا المندوب" : "خطأ",
        description: alreadyAssigned
          ? "تم تعيين مندوب آخر لهذا الطلب بالفعل من قبل مستخدم آخر — جارٍ تحديث القائمة."
          : err.message,
        variant: "destructive",
      });
      if (alreadyAssigned) { onClose(); onSuccess(); }
    } finally {
      setAssigning(false);
    }
  };

  const order = orders.find(o => o.id === assignOrderId);
  const rider = riders.find(r => r.id === selectedRider);
  const amount = Number(order?.total || 0);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent dir="rtl">
        <DialogHeader><DialogTitle>تعيين مندوب</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Label>اختر مندوب</Label>
          <Select value={selectedRider} onValueChange={setSelectedRider}>
            <SelectTrigger><SelectValue placeholder="اختر مندوب..." /></SelectTrigger>
            <SelectContent>
              {riders
                .filter(r => r.is_active || r.user_id)
                .map(r => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.full_name} {r.is_online ? "🟢" : "🔴"} - {r.vehicle_type || "—"}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>

          {selectedRider && order && (
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2 border rounded-lg px-3 py-2 bg-muted/40">
                <span className="text-xs text-muted-foreground w-full font-medium mb-1">إرسال تفاصيل الطلب للمندوب:</span>
                {rider?.phone ? (
                  <button
                    onClick={() => window.open(buildRiderWhatsApp(order, rider.phone), "_blank")}
                    className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
                  >
                    <MessageCircle className="w-3.5 h-3.5" /> واتساب
                  </button>
                ) : (
                  <span className="text-xs text-muted-foreground italic">لا يوجد رقم هاتف للمندوب</span>
                )}
                <button
                  onClick={() => window.open(buildRiderTelegram(order), "_blank")}
                  className="flex items-center gap-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> تلغرام
                </button>
              </div>

              {(order.payment_method === "cash" || order.payment_method === "bank_transfer") && (
                <div className={`text-xs rounded-lg px-3 py-2 ${
                  order.payment_method === "cash"
                    ? "bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400"
                    : "bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400"
                }`}>
                  {order.payment_method === "cash" && amount > 0
                    ? `💵 سيتلقى المندوب إشعاراً بتحصيل ${amount.toLocaleString()} ر.ي نقداً وسيُسجَّل المبلغ على حسابه`
                    : "✅ سيتلقى المندوب إشعاراً بأن الدفع تم مسبقاً (لن يُسجَّل أي مبلغ على حسابه)"}
                </div>
              )}

              {riderOutstanding > 0 && (
                <div className="text-xs rounded-lg px-3 py-2 bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-900/50">
                  <div className="flex items-center gap-1.5 font-semibold">
                    <CreditCard className="w-3.5 h-3.5" />
                    رصيد المندوب الحالي غير المسلَّم:
                    <span className="font-bold">{riderOutstanding.toLocaleString()} ر.ي</span>
                  </div>
                  {order.payment_method === "cash" && amount > 0 && (
                    <div className="mt-1 text-[11px] opacity-80">
                      بعد هذا الطلب: <strong>{(riderOutstanding + amount).toLocaleString()} ر.ي</strong>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button onClick={handleAssign} disabled={!selectedRider || assigning} className="min-h-[44px]">
            {assigning ? (
              <><div className="w-4 h-4 ml-1 border-2 border-white border-t-transparent rounded-full animate-spin" /> جارٍ التعيين...</>
            ) : (
              <><Truck className="w-4 h-4 ml-1" /> تعيين وإرسال إشعار</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
