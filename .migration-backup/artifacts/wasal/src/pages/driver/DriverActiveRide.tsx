import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowRight, Car, Users, Clock, MapPin, Phone, MessageCircle, Play, CheckCircle, Navigation } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import OrderChat from "@/components/orders/OrderChat";

const DriverActiveRide = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [ride, setRide] = useState<any>(null);
  const [customerProfile, setCustomerProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [showChat, setShowChat] = useState(false);

  const fetchRide = async () => {
    if (!id) return;
    const { data } = await supabase
      .from("ride_requests")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (data) {
      setRide(data);
      // Fetch customer profile if accepted
      if (data.negotiation_status === "accepted" || data.status === "in_progress") {
        const { data: prof } = await supabase
          .from("profiles")
          .select("full_name, phone")
          .eq("user_id", data.customer_id)
          .maybeSingle();
        setCustomerProfile(prof);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRide();
  }, [id]);

  // Realtime updates
  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`active-ride-${id}`)
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "ride_requests",
        filter: `id=eq.${id}`,
      }, (payload) => {
        setRide(payload.new);
        if ((payload.new as any).negotiation_status === "accepted" && !(payload.old as any)?.customer_accepted) {
          toast({ title: "العميل قبل عرض السعر! 🎉", description: "يمكنك التوجه إلى موقع العميل الآن" });
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id]);

  const updateStatus = async (newStatus: string, extraFields: Record<string, any> = {}) => {
    if (!ride || !user) return;
    setUpdating(true);

    const updateData: any = { status: newStatus, ...extraFields };

    const { error } = await supabase
      .from("ride_requests")
      .update(updateData)
      .eq("id", ride.id);

    if (error) {
      toast({ title: "خطأ", description: "فشل تحديث الحالة", variant: "destructive" });
    } else {
      // Send notification to customer
      const statusMessages: Record<string, string> = {
        assigned: "السائق في طريقه إلى موقعك 🚗",
        in_progress: "بدأت الرحلة 🚀",
        completed: "تم إنهاء الرحلة بنجاح ✅",
      };

      try {
        await supabase.functions.invoke("send-push-notification", {
          body: {
            userId: ride.customer_id,
            title: "تحديث الرحلة",
            body: statusMessages[newStatus] || `حالة الرحلة: ${newStatus}`,
            sound: "default",
            data: { type: "ride_status", rideId: ride.id },
          },
        });
      } catch (e) {
        console.error("Notification error:", e);
      }

      // If completed, create financial transaction
      if (newStatus === "completed") {
        await createFinancialTransaction();
      }

      toast({ title: "تم تحديث الحالة ✅" });
      fetchRide();
    }
    setUpdating(false);
  };

  const createFinancialTransaction = async () => {
    if (!ride || !user) return;
    try {
      // Check for partner-specific commission first
      const { data: partnerCommission } = await supabase
        .from("partner_commission_settings")
        .select("commission_value, override_global")
        .eq("partner_id", user.id)
        .maybeSingle();

      let commissionRate = 10;

      if (partnerCommission?.override_global && partnerCommission?.commission_value != null) {
        commissionRate = partnerCommission.commission_value;
      } else {
        const { data: settings } = await supabase
          .from("accounting_settings")
          .select("global_commission_ride")
          .eq("id", 1)
          .maybeSingle();
        commissionRate = settings?.global_commission_ride || 10;
      }

      const finalPrice = ride.final_price || ride.proposed_price || 0;
      const commission = Math.floor(finalPrice * commissionRate / 100);
      const partnerEarning = finalPrice - commission;

      await supabase.from("financial_transactions").insert({
        customer_id: ride.customer_id,
        partner_id: user.id,
        reference_id: ride.id,
        transaction_type: "ride",
        amount: finalPrice,
        platform_commission: commission,
        partner_earning: partnerEarning,
        payment_method: ride.payment_method || "cash",
        payment_status: "pending",
        currency: "YER",
      } as any);

      // Notify customer to pay
      try {
        await supabase.functions.invoke("send-push-notification", {
          body: {
            userId: ride.customer_id,
            title: "الرحلة انتهت - ادفع الآن 💳",
            body: `المبلغ المستحق: ${finalPrice} ر.ي`,
            sound: "payment_success",
            data: { type: "ride_payment", rideId: ride.id, paymentUrl: `/payment/ride/${ride.id}` },
          },
        });
      } catch {}
    } catch (e) {
      console.error("Financial transaction error:", e);
    }
  };

  const handleArrivedAtPickup = () => updateStatus("assigned", { assigned_at: new Date().toISOString() });
  const handleStartRide = () => updateStatus("in_progress", { started_at: new Date().toISOString() });
  const handleCompleteRide = () => updateStatus("completed", { completed_at: new Date().toISOString() });

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
        <p className="text-muted-foreground">الرحلة غير موجودة</p>
        <Button variant="outline" onClick={() => navigate("/driver")}>
          <ArrowRight className="w-4 h-4 ml-2" />العودة
        </Button>
      </div>
    );
  }

  const isAccepted = ride.negotiation_status === "accepted";
  const isUnlocked = isAccepted;
  const finalPrice = ride.final_price || ride.proposed_price;

  const getRideTypeLabel = (type: string) => {
    switch (type) { case "one_way": return "ذهاب فقط"; case "round_trip": return "ذهاب وعودة"; default: return type; }
  };

  const getStatusConfig = () => {
    if (ride.status === "completed") return { label: "مكتملة", color: "bg-primary" };
    if (ride.status === "in_progress") return { label: "جارية", color: "bg-primary" };
    if (ride.status === "assigned") return { label: "تم الوصول للعميل", color: "bg-accent" };
    if (ride.negotiation_status === "offered") return { label: "بانتظار رد العميل", color: "bg-muted" };
    if (ride.negotiation_status === "accepted") return { label: "تم القبول", color: "bg-primary" };
    return { label: ride.status, color: "bg-muted" };
  };

  const statusConfig = getStatusConfig();

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <Button variant="ghost" size="sm" onClick={() => navigate("/driver")}>
        <ArrowRight className="w-4 h-4 ml-2" />العودة
      </Button>

      {/* Status Banner */}
      <div className={`rounded-xl p-4 ${statusConfig.color} text-primary-foreground`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Car className="w-5 h-5" />
            <span className="font-bold">{statusConfig.label}</span>
          </div>
          {finalPrice && (
            <span className="font-bold text-lg">{finalPrice} ر.ي</span>
          )}
        </div>
      </div>

      {/* Route Details */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-primary" />
              <div>
                <p className="text-xs text-muted-foreground">الانطلاق</p>
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

          <div className="flex flex-wrap gap-2 pt-2">
            <Badge variant="secondary"><Car className="w-3 h-3 ml-1" />{getRideTypeLabel(ride.ride_type)}</Badge>
            <Badge variant="outline"><Users className="w-3 h-3 ml-1" />{ride.passenger_count || 1} راكب</Badge>
            {ride.waiting_time && <Badge variant="outline"><Clock className="w-3 h-3 ml-1" />انتظار {ride.waiting_time} د</Badge>}
          </div>
        </CardContent>
      </Card>

      {/* Customer Info (shown after acceptance) */}
      {isAccepted && customerProfile && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              معلومات العميل
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-foreground font-medium">{customerProfile.full_name}</p>
            {customerProfile.phone && (
              <a href={`tel:${customerProfile.phone}`} className="flex items-center gap-2 text-primary text-sm hover:underline">
                <Phone className="w-4 h-4" />
                {customerProfile.phone}
              </a>
            )}
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      {ride.status !== "completed" && ride.status !== "cancelled" && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">إجراءات الرحلة</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {ride.negotiation_status === "offered" && (
              <div className="text-center py-4">
                <div className="animate-pulse text-muted-foreground text-sm">⏳ بانتظار رد العميل على عرض السعر...</div>
              </div>
            )}

            {isAccepted && ride.status === "pending" && (
              <Button className="w-full h-12" onClick={handleArrivedAtPickup} disabled={updating}>
                <Navigation className="w-4 h-4 ml-2" />
                {updating ? "جاري التحديث..." : "وصلت إلى موقع العميل"}
              </Button>
            )}

            {ride.status === "assigned" && (
              <Button className="w-full h-12" onClick={handleStartRide} disabled={updating}>
                <Play className="w-4 h-4 ml-2" />
                {updating ? "جاري التحديث..." : "بدأت الرحلة"}
              </Button>
            )}

            {ride.status === "in_progress" && (
              <Button className="w-full h-12" variant="default" onClick={handleCompleteRide} disabled={updating}>
                <CheckCircle className="w-4 h-4 ml-2" />
                {updating ? "جاري التحديث..." : "أنهيت الرحلة"}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Completed banner */}
      {ride.status === "completed" && (
        <Card className="border-primary/30">
          <CardContent className="text-center py-6 space-y-2">
            <CheckCircle className="w-12 h-12 mx-auto text-primary" />
            <h3 className="font-bold text-foreground">تم إنهاء الرحلة بنجاح</h3>
            <p className="text-muted-foreground text-sm">المبلغ: {finalPrice} ر.ي</p>
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      {isAccepted && ride.status !== "completed" && (
        <div className="flex gap-3">
          {ride.pickup_lat && ride.pickup_lng && ride.status !== "in_progress" && (
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${ride.pickup_lat},${ride.pickup_lng}`, "_blank")}
            >
              <Navigation className="w-4 h-4 ml-2" />
              التنقل لموقع العميل
            </Button>
          )}
          {ride.dropoff_lat && ride.dropoff_lng && ride.status === "in_progress" && (
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${ride.dropoff_lat},${ride.dropoff_lng}`, "_blank")}
            >
              <Navigation className="w-4 h-4 ml-2" />
              التنقل للوجهة
            </Button>
          )}
        </div>
      )}

      {/* Chat Section */}
      {(isAccepted || ride.status === "in_progress") && (
        <div>
          <Button
            variant="outline"
            className="w-full mb-3"
            onClick={() => setShowChat(!showChat)}
          >
            <MessageCircle className="w-4 h-4 ml-2" />
            {showChat ? "إخفاء الدردشة" : "فتح الدردشة مع العميل"}
          </Button>

          {showChat && (
            <OrderChat
              orderId={ride.id}
              orderType="ride"
              isUnlocked={isUnlocked}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default DriverActiveRide;
