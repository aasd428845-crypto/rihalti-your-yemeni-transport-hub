import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { MapPin, Phone, MessageCircle, X, Check, Clock, Car, User, CreditCard, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { fetchRideRequestById, acceptRidePrice, rejectRidePrice, cancelRideRequest } from "@/lib/rideApi";
import { supabase } from "@/integrations/supabase/client";
import OrderChat from "@/components/orders/OrderChat";
import BackButton from "@/components/common/BackButton";

const statusMap: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  pending: { label: "بانتظار عرض سعر", color: "bg-amber-100 text-amber-800 border-amber-200", icon: Clock },
  driver_assigned: { label: "تم تعيين سائق", color: "bg-blue-100 text-blue-800 border-blue-200", icon: Car },
  driver_arrived: { label: "السائق وصل", color: "bg-indigo-100 text-indigo-800 border-indigo-200", icon: Navigation },
  in_progress: { label: "جاري الرحلة", color: "bg-green-100 text-green-800 border-green-200", icon: Car },
  completed: { label: "مكتملة", color: "bg-emerald-100 text-emerald-800 border-emerald-200", icon: Check },
  cancelled: { label: "ملغاة", color: "bg-red-100 text-red-800 border-red-200", icon: X },
};

const negotiationMap: Record<string, { label: string; color: string }> = {
  pending: { label: "بانتظار التسعير", color: "text-amber-600" },
  offered: { label: "تم تقديم عرض سعر", color: "text-blue-600" },
  accepted: { label: "تم القبول", color: "text-green-600" },
  rejected: { label: "مرفوض", color: "text-red-600" },
  cancelled: { label: "ملغي", color: "text-muted-foreground" },
};

const RideDetailsPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, role } = useAuth();
  const [ride, setRide] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [driverProfile, setDriverProfile] = useState<any>(null);

  const loadRide = async () => {
    if (!id) return;
    try {
      const data = await fetchRideRequestById(id);
      setRide(data);

      // Load driver profile if assigned
      if ((data as any)?.driver_id) {
        const { data: driverData } = await supabase
          .from("drivers" as any)
          .select("*")
          .eq("id", (data as any).driver_id)
          .maybeSingle();
        if (driverData) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name, phone, avatar_url")
            .eq("user_id", (driverData as any).user_id)
            .maybeSingle();
          setDriverProfile({ ...(driverData as any), profile });
        }
      }
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadRide(); }, [id]);

  // Realtime subscription
  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`ride-${id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'ride_requests', filter: `id=eq.${id}` },
        () => loadRide()
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id]);

  const handleAcceptPrice = async () => {
    setActionLoading(true);
    try {
      await acceptRidePrice(id!);
      toast({ title: "✅ تم قبول السعر", description: "يمكنك الآن التواصل مع السائق" });
      loadRide();
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectPrice = async () => {
    setActionLoading(true);
    try {
      await rejectRidePrice(id!);
      toast({ title: "تم رفض العرض", description: "سيتم إعادة طلبك للسائقين الآخرين" });
      loadRide();
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!cancelReason.trim()) {
      toast({ title: "يرجى إدخال سبب الإلغاء", variant: "destructive" });
      return;
    }
    setActionLoading(true);
    try {
      await cancelRideRequest(id!, cancelReason);
      toast({ title: "تم إلغاء الطلب" });
      loadRide();
      setShowCancelDialog(false);
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" dir="rtl">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!ride) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" dir="rtl">
        <p className="text-muted-foreground">طلب غير موجود</p>
      </div>
    );
  }

  const r = ride as any;
  const statusInfo = statusMap[r.status] || statusMap.pending;
  const negInfo = negotiationMap[r.negotiation_status] || negotiationMap.pending;
  const isAccepted = r.negotiation_status === 'accepted';
  const isOffered = r.negotiation_status === 'offered';
  const canCancel = !['completed', 'cancelled'].includes(r.status);

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <BackButton />
          <div className="flex-1">
            <h1 className="text-xl font-bold text-foreground">تفاصيل طلب الأجرة</h1>
            <p className="text-xs text-muted-foreground">#{r.id?.slice(0, 8)}</p>
          </div>
          <Badge className={`${statusInfo.color} border px-3 py-1`}>
            {statusInfo.label}
          </Badge>
        </div>

        {/* Route Info */}
        <Card className="mb-4">
          <CardContent className="p-5">
            <div className="flex flex-col gap-3">
              <div className="flex items-start gap-3">
                <div className="w-3 h-3 rounded-full bg-green-500 mt-1.5 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">الانطلاق</p>
                  <p className="font-semibold text-foreground">{r.from_city}</p>
                  {r.from_address && <p className="text-sm text-muted-foreground">{r.from_address}</p>}
                </div>
              </div>
              <div className="border-r-2 border-dashed border-muted mr-1.5 h-4" />
              <div className="flex items-start gap-3">
                <div className="w-3 h-3 rounded-full bg-red-500 mt-1.5 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">الوجهة</p>
                  <p className="font-semibold text-foreground">{r.to_city}</p>
                  {r.to_address && <p className="text-sm text-muted-foreground">{r.to_address}</p>}
                </div>
              </div>
            </div>

            <div className="flex gap-4 mt-4 pt-3 border-t border-border text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Car size={14} />
                {r.ride_type === 'round_trip' ? 'ذهاب وعودة' : 'ذهاب فقط'}
              </span>
              <span className="flex items-center gap-1">
                <User size={14} />
                {r.passenger_count || 1} راكب
              </span>
              <span className="flex items-center gap-1">
                <CreditCard size={14} />
                {r.payment_method === 'cash' ? 'نقداً' : 'تحويل'}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Price Offer */}
        {isOffered && (
          <Card className="mb-4 border-primary/30 bg-primary/5">
            <CardContent className="p-5">
              <h3 className="font-semibold text-foreground mb-3">💰 عرض سعر من السائق</h3>
              <div className="text-center mb-4">
                <span className="text-3xl font-bold text-primary">{r.proposed_price}</span>
                <span className="text-muted-foreground mr-1">ريال</span>
              </div>
              <div className="flex gap-3">
                <Button onClick={handleAcceptPrice} disabled={actionLoading} className="flex-1 gap-2">
                  <Check size={16} /> قبول السعر
                </Button>
                <Button variant="outline" onClick={handleRejectPrice} disabled={actionLoading} className="flex-1 gap-2">
                  <X size={16} /> رفض
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Accepted Price */}
        {isAccepted && (
          <Card className="mb-4 border-green-300 bg-green-50/50">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-sm text-green-700 font-medium">✅ السعر المتفق عليه</span>
                <span className="text-2xl font-bold text-green-700">{r.final_price} ريال</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Negotiation Status */}
        {!isOffered && !isAccepted && r.negotiation_status !== 'cancelled' && (
          <Card className="mb-4">
            <CardContent className="p-5 text-center">
              <Clock size={32} className="mx-auto text-amber-500 mb-2" />
              <p className={`font-semibold ${negInfo.color}`}>{negInfo.label}</p>
              <p className="text-xs text-muted-foreground mt-1">
                سيقوم أحد السائقين بتقديم عرض سعر قريباً
              </p>
            </CardContent>
          </Card>
        )}

        {/* Driver Info (after acceptance) */}
        {isAccepted && driverProfile && (
          <Card className="mb-4">
            <CardContent className="p-5">
              <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                <Car size={16} className="text-primary" />
                معلومات السائق
              </h3>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                  <User size={24} className="text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold">{driverProfile.profile?.full_name || 'سائق'}</p>
                  <p className="text-sm text-muted-foreground">⭐ {driverProfile.rating || '0'} — {driverProfile.total_trips || 0} رحلة</p>
                </div>
                {driverProfile.profile?.phone && (
                  <a href={`tel:${driverProfile.profile.phone}`} className="flex items-center gap-1 text-primary text-sm">
                    <Phone size={14} />
                    {driverProfile.profile.phone}
                  </a>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Chat */}
        {r.driver_id && (
          <div className="mb-4">
            <Button variant="outline" onClick={() => setShowChat(!showChat)} className="w-full gap-2 mb-2">
              <MessageCircle size={16} />
              {showChat ? 'إخفاء المحادثة' : 'فتح المحادثة مع السائق'}
            </Button>
            {showChat && <OrderChat orderId={r.id} orderType="ride" />}
          </div>
        )}

        {/* Cancel */}
        {canCancel && (
          <div className="mt-6">
            {!showCancelDialog ? (
              <Button variant="ghost" className="w-full text-destructive" onClick={() => setShowCancelDialog(true)}>
                إلغاء الطلب
              </Button>
            ) : (
              <Card className="border-destructive/30">
                <CardContent className="p-4 space-y-3">
                  <p className="text-sm font-medium text-destructive">هل أنت متأكد من إلغاء الطلب؟</p>
                  <Input
                    value={cancelReason}
                    onChange={e => setCancelReason(e.target.value)}
                    placeholder="سبب الإلغاء..."
                  />
                  <div className="flex gap-2">
                    <Button variant="destructive" size="sm" onClick={handleCancel} disabled={actionLoading}>
                      تأكيد الإلغاء
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setShowCancelDialog(false)}>
                      تراجع
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {r.notes && (
          <div className="mt-4 p-3 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground">ملاحظات</p>
            <p className="text-sm text-foreground">{r.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RideDetailsPage;
