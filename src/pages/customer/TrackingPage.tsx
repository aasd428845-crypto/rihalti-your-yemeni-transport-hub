import { useState } from "react";
import { Search, Package, MapPin, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

const TrackingPage = () => {
  const { toast } = useToast();
  const [trackingNumber, setTrackingNumber] = useState("");
  const [result, setResult] = useState<any>(null);
  const [tracking, setTracking] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [resultType, setResultType] = useState<"shipment" | "delivery" | null>(null);

  const handleSearch = async () => {
    if (!trackingNumber.trim()) {
      toast({ title: "يرجى إدخال رقم التتبع", variant: "destructive" });
      return;
    }

    setLoading(true);
    setResult(null);
    setTracking([]);

    try {
      // Search shipments first
      const { data: shipment } = await supabase
        .from("shipment_requests")
        .select("*")
        .or(`tracking_number.eq.${trackingNumber},barcode.eq.${trackingNumber},id.eq.${trackingNumber}`)
        .maybeSingle();

      if (shipment) {
        setResult(shipment);
        setResultType("shipment");
        setLoading(false);
        return;
      }

      // Search delivery orders
      const { data: delivery } = await supabase
        .from("delivery_orders")
        .select("*")
        .eq("id", trackingNumber)
        .maybeSingle();

      if (delivery) {
        setResult(delivery);
        setResultType("delivery");

        const { data: trackingData } = await supabase
          .from("order_tracking")
          .select("*")
          .eq("order_id", delivery.id)
          .order("created_at", { ascending: true });
        setTracking(trackingData || []);
        setLoading(false);
        return;
      }

      toast({ title: "لم يتم العثور على نتائج", variant: "destructive" });
    } catch (err: any) {
      toast({ title: "خطأ في البحث", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const statusLabels: Record<string, string> = {
    pending: "قيد الانتظار",
    pending_approval: "بانتظار الموافقة",
    pending_pricing: "بانتظار التسعير",
    priced: "تم التسعير",
    accepted: "مقبول",
    preparing: "جاري التحضير",
    assigned: "تم التعيين",
    picked_up: "تم الاستلام",
    on_the_way: "في الطريق",
    delivered: "تم التوصيل",
    cancelled: "ملغي",
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <div className="container mx-auto px-4 pt-24 pb-12 max-w-2xl">
        <h1 className="text-3xl font-bold text-foreground mb-2">تتبع الشحنة</h1>
        <p className="text-muted-foreground mb-8">أدخل رقم التتبع أو رقم الطلب للمتابعة</p>

        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex gap-3">
              <Input
                placeholder="رقم التتبع أو رقم الطلب"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="flex-1"
              />
              <Button onClick={handleSearch} disabled={loading} className="gap-2">
                <Search className="w-4 h-4" />
                {loading ? "بحث..." : "بحث"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {result && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5 text-primary" />
                {resultType === "shipment" ? "تفاصيل الشحنة" : "تفاصيل الطلب"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">الحالة:</span>
                <Badge variant="secondary">{statusLabels[result.status] || result.status}</Badge>
              </div>

              {resultType === "shipment" && (
                <>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">من:</span>
                      <p className="font-medium">{result.pickup_address || "-"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">إلى:</span>
                      <p className="font-medium">{result.delivery_address || "-"}</p>
                    </div>
                  </div>
                  {result.tracking_number && (
                    <p className="text-sm"><span className="text-muted-foreground">رقم التتبع:</span> {result.tracking_number}</p>
                  )}
                </>
              )}

              {resultType === "delivery" && (
                <>
                  <div className="text-sm">
                    <span className="text-muted-foreground">العنوان:</span>
                    <p className="font-medium">{result.customer_address}</p>
                  </div>
                  <p className="text-sm font-semibold">الإجمالي: {result.total} ر.ي</p>
                </>
              )}

              {tracking.length > 0 && (
                <div className="mt-6">
                  <h4 className="font-semibold mb-3">سجل التتبع</h4>
                  <div className="space-y-3 border-r-2 border-primary/20 pr-4">
                    {tracking.map((t) => (
                      <div key={t.id} className="relative">
                        <div className="absolute -right-[1.35rem] top-1 w-3 h-3 rounded-full bg-primary" />
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="w-3 h-3 text-muted-foreground" />
                          <span className="text-muted-foreground">{format(new Date(t.created_at), "dd/MM HH:mm", { locale: ar })}</span>
                          <Badge variant="outline" className="text-xs">{statusLabels[t.status] || t.status}</Badge>
                        </div>
                        {t.note && <p className="text-sm text-muted-foreground mt-1">{t.note}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default TrackingPage;
