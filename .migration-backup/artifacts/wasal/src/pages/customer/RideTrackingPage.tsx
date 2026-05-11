import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { MapPin, Phone, Clock, Car, Navigation, CheckCircle, User } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import BackButton from "@/components/common/BackButton";

const trackingSteps = [
  { status: "assigned", label: "تم تعيين السائق", icon: Car },
  { status: "arrived", label: "السائق وصل", icon: Navigation },
  { status: "started", label: "بدأت الرحلة", icon: MapPin },
  { status: "completed", label: "تم الوصول", icon: CheckCircle },
];

const RideTrackingPage = () => {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [ride, setRide] = useState<any>(null);
  const [driverLocation, setDriverLocation] = useState<any>(null);
  const [driverProfile, setDriverProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadRide = async () => {
    if (!id) return;
    try {
      const { data, error } = await supabase
        .from("rides" as any)
        .select("*")
        .eq("request_id", id)
        .maybeSingle();
      if (error) throw error;
      setRide(data);

      if ((data as any)?.driver_id) {
        // Load driver profile
        const { data: driver } = await supabase
          .from("drivers" as any)
          .select("*")
          .eq("id", (data as any).driver_id)
          .maybeSingle();
        if (driver) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name, phone, avatar_url")
            .eq("user_id", (driver as any).user_id)
            .maybeSingle();
          setDriverProfile({ ...(driver as any), profile });
        }

        // Load driver location
        const { data: loc } = await supabase
          .from("driver_locations" as any)
          .select("*")
          .eq("driver_id", (data as any).driver_id)
          .maybeSingle();
        if (loc) setDriverLocation(loc);
      }
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadRide(); }, [id]);

  // Realtime for ride status and driver location
  useEffect(() => {
    if (!ride) return;
    const driverId = (ride as any)?.driver_id;

    const channel = supabase.channel(`ride-tracking-${id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rides', filter: `request_id=eq.${id}` },
        (payload) => setRide(payload.new)
      );

    if (driverId) {
      channel.on('postgres_changes', { event: '*', schema: 'public', table: 'driver_locations', filter: `driver_id=eq.${driverId}` },
        (payload) => setDriverLocation(payload.new)
      );
    }

    channel.subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id, ride?.driver_id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" dir="rtl">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!ride) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3" dir="rtl">
        <Car size={48} className="text-muted-foreground" />
        <p className="text-muted-foreground">لم يتم بدء الرحلة بعد</p>
        <p className="text-xs text-muted-foreground">ستظهر تفاصيل التتبع بمجرد قبول السائق</p>
      </div>
    );
  }

  const r = ride as any;
  const currentStepIndex = trackingSteps.findIndex(s => s.status === r.status);

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <BackButton />
          <h1 className="text-xl font-bold text-foreground">تتبع الرحلة</h1>
        </div>

        {/* Map Placeholder */}
        <Card className="mb-4 overflow-hidden">
          <div className="h-48 bg-muted relative flex items-center justify-center">
            <div className="text-center">
              <MapPin size={32} className="mx-auto text-primary mb-2" />
              {driverLocation ? (
                <div>
                  <p className="text-sm font-medium text-foreground">موقع السائق</p>
                  <p className="text-xs text-muted-foreground">
                    {(driverLocation as any).lat?.toFixed(4)}, {(driverLocation as any).lng?.toFixed(4)}
                  </p>
                  {(driverLocation as any).speed && (
                    <p className="text-xs text-primary mt-1">السرعة: {Math.round((driverLocation as any).speed)} كم/س</p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">جاري تحميل موقع السائق...</p>
              )}
            </div>
          </div>
        </Card>

        {/* Progress Tracker */}
        <Card className="mb-4">
          <CardContent className="p-5">
            <h3 className="font-semibold text-foreground mb-4">حالة الرحلة</h3>
            <div className="space-y-1">
              {trackingSteps.map((step, idx) => {
                const isActive = idx <= currentStepIndex;
                const isCurrent = idx === currentStepIndex;
                const StepIcon = step.icon;
                return (
                  <div key={step.status} className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                      isActive ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                    } ${isCurrent ? 'ring-2 ring-primary/30 ring-offset-2' : ''}`}>
                      <StepIcon size={14} />
                    </div>
                    <div className="flex-1">
                      <p className={`text-sm font-medium ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {step.label}
                      </p>
                    </div>
                    {isCurrent && (
                      <Badge variant="outline" className="text-primary border-primary/30 text-xs">الحالية</Badge>
                    )}
                    {idx < trackingSteps.length - 1 && (
                      <div className="absolute" />
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Driver Info */}
        {driverProfile && (
          <Card className="mb-4">
            <CardContent className="p-5">
              <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                <User size={16} className="text-primary" />
                السائق
              </h3>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
                  <User size={28} className="text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-foreground">{driverProfile.profile?.full_name || 'السائق'}</p>
                  <p className="text-sm text-muted-foreground">⭐ {driverProfile.rating || '0'} — {driverProfile.total_trips || 0} رحلة</p>
                </div>
                {driverProfile.profile?.phone && (
                  <a
                    href={`tel:${driverProfile.profile.phone}`}
                    className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium"
                  >
                    <Phone size={14} />
                    اتصال
                  </a>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Ride Summary */}
        <Card>
          <CardContent className="p-5">
            <h3 className="font-semibold text-foreground mb-3">ملخص الرحلة</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">من</span>
                <span className="text-foreground">{r.pickup_location}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">إلى</span>
                <span className="text-foreground">{r.dropoff_location}</span>
              </div>
              <div className="flex justify-between border-t border-border pt-2 mt-2">
                <span className="text-muted-foreground">السعر</span>
                <span className="font-bold text-primary text-lg">{r.price} ريال</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RideTrackingPage;
