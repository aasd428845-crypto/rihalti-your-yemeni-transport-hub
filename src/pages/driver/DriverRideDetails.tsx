import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, MapPin, Users, Clock, Car, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import CustomerLocationMap from "@/components/maps/CustomerLocationMap";

const DriverRideDetails = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [ride, setRide] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [proposedPrice, setProposedPrice] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!id) return;
    const fetchRide = async () => {
      const { data, error } = await supabase
        .from("ride_requests")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (data) setRide(data);
      setLoading(false);
    };
    fetchRide();
  }, [id]);

  const handleSubmitPrice = async () => {
    if (!proposedPrice || !ride || !user) return;
    const price = parseFloat(proposedPrice);
    if (isNaN(price) || price <= 0) {
      toast({ title: "خطأ", description: "يرجى إدخال سعر صحيح", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    const { error } = await supabase
      .from("ride_requests")
      .update({
        driver_id: user.id,
        proposed_price: price,
        negotiation_status: "offered",
        price_offered_at: new Date().toISOString(),
      })
      .eq("id", ride.id);

    if (error) {
      toast({ title: "خطأ", description: "فشل في إرسال السعر. ربما قبل سائق آخر هذا الطلب.", variant: "destructive" });
    } else {
      // Notify customer
      try {
        await supabase.functions.invoke("send-push-notification", {
          body: {
            userId: ride.customer_id,
            title: "عرض سعر جديد 💰",
            body: `سائق اقترح سعر ${price} ر.ي لرحلتك من ${ride.from_city} إلى ${ride.to_city}`,
            sound: "default",
            data: { type: "ride_offer", rideId: ride.id },
          },
        });
      } catch (e) {
        console.error("Notification error:", e);
      }

      toast({ title: "تم إرسال عرض السعر ✅", description: "سيتم إشعارك عند رد العميل" });
      navigate("/driver");
    }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!ride) {
    return (
      <div className="text-center py-20 space-y-4">
        <p className="text-muted-foreground">الطلب غير موجود أو تم قبوله من سائق آخر</p>
        <Button variant="outline" onClick={() => navigate("/driver")}>
          <ArrowRight className="w-4 h-4 ml-2" />
          العودة
        </Button>
      </div>
    );
  }

  const alreadyOffered = ride.negotiation_status !== "pending";

  const getRideTypeLabel = (type: string) => {
    switch (type) {
      case "one_way": return "ذهاب فقط";
      case "round_trip": return "ذهاب وعودة";
      default: return type;
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <Button variant="ghost" size="sm" onClick={() => navigate("/driver")}>
        <ArrowRight className="w-4 h-4 ml-2" />
        العودة للطلبات
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Car className="w-5 h-5 text-primary" />
            تفاصيل طلب الأجرة
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Route */}
          <div className="space-y-3 p-4 rounded-xl bg-muted/50">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-primary" />
              <div>
                <p className="text-xs text-muted-foreground">نقطة الانطلاق</p>
                <p className="font-medium text-foreground">{ride.from_address || ride.from_city}</p>
              </div>
            </div>
            <div className="mr-1.5 border-r-2 border-dashed border-muted-foreground/30 h-4" />
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-destructive" />
              <div>
                <p className="text-xs text-muted-foreground">الوجهة</p>
                <p className="font-medium text-foreground">{ride.to_address || ride.to_city}</p>
              </div>
            </div>
          </div>

          {/* Info badges */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">
              <Car className="w-3 h-3 ml-1" />
              {getRideTypeLabel(ride.ride_type)}
            </Badge>
            <Badge variant="outline">
              <Users className="w-3 h-3 ml-1" />
              {ride.passenger_count || 1} راكب
            </Badge>
            {ride.waiting_time && (
              <Badge variant="outline">
                <Clock className="w-3 h-3 ml-1" />
                انتظار {ride.waiting_time} دقيقة
              </Badge>
            )}
            <Badge variant="outline">
              {ride.payment_method === "cash" ? "نقداً" : "تحويل بنكي"}
            </Badge>
          </div>

          {/* Notes */}
          {ride.notes && (
            <div className="p-3 rounded-lg bg-muted/30 border border-border">
              <p className="text-xs text-muted-foreground mb-1">ملاحظات العميل:</p>
              <p className="text-sm text-foreground">{ride.notes}</p>
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            تاريخ الطلب: {new Date(ride.created_at).toLocaleString("ar-YE")}
          </p>
        </CardContent>
      </Card>

      {/* Price Offer */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">تقديم عرض السعر</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {alreadyOffered ? (
            <div className="text-center py-4 space-y-2">
              <Badge variant="secondary" className="text-sm">
                {ride.negotiation_status === "offered" ? "تم إرسال عرض سعر" : ride.negotiation_status === "accepted" ? "تم القبول ✅" : "مرفوض"}
              </Badge>
              {ride.proposed_price && (
                <p className="text-lg font-bold text-foreground">{ride.proposed_price} ر.ي</p>
              )}
            </div>
          ) : (
            <>
              <div>
                <Label htmlFor="price" className="text-sm font-medium">السعر المقترح (ريال يمني)</Label>
                <div className="relative mt-1">
                  <Input
                    id="price"
                    type="number"
                    value={proposedPrice}
                    onChange={(e) => setProposedPrice(e.target.value)}
                    placeholder="مثال: 5000"
                    className="h-12 text-lg font-bold pl-16"
                    dir="ltr"
                    min="0"
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">ر.ي</span>
                </div>
              </div>

              <Button
                className="w-full h-12 font-bold"
                onClick={handleSubmitPrice}
                disabled={submitting || !proposedPrice}
              >
                {submitting ? (
                  "جاري الإرسال..."
                ) : (
                  <>
                    <Send className="w-4 h-4 ml-2" />
                    إرسال عرض السعر
                  </>
                )}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DriverRideDetails;
