import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Car, DollarSign, Star, MapPin, Navigation, Clock, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

const DriverDashboard = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [driverData, setDriverData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(false);
  const [togglingOnline, setTogglingOnline] = useState(false);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);

  // Fetch driver data
  useEffect(() => {
    if (!user) return;
    const fetchDriver = async () => {
      const { data } = await supabase
        .from("drivers")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      setDriverData(data);
      setIsOnline(data?.is_online || false);
      setLoading(false);
    };
    fetchDriver();
  }, [user]);

  // Fetch pending ride requests
  const fetchPendingRequests = useCallback(async () => {
    if (!driverData?.is_approved) return;
    setLoadingRequests(true);
    const { data } = await supabase
      .from("ride_requests")
      .select("*")
      .eq("status", "pending")
      .eq("negotiation_status", "pending")
      .is("driver_id", null)
      .order("created_at", { ascending: false });
    setPendingRequests(data || []);
    setLoadingRequests(false);
  }, [driverData]);

  useEffect(() => {
    if (driverData?.is_approved) {
      fetchPendingRequests();
    }
  }, [driverData, fetchPendingRequests]);

  // Realtime subscription for new ride requests
  useEffect(() => {
    if (!driverData?.is_approved) return;
    const channel = supabase
      .channel("driver-ride-requests")
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "ride_requests",
      }, () => {
        fetchPendingRequests();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [driverData, fetchPendingRequests]);

  // GPS tracking when online
  useEffect(() => {
    if (!isOnline || !driverData?.id) return;
    let watchId: number;
    
    const updateLocation = async (lat: number, lng: number) => {
      await supabase
        .from("driver_locations")
        .upsert({
          driver_id: driverData.id,
          lat,
          lng,
          is_online: true,
          updated_at: new Date().toISOString(),
        }, { onConflict: "driver_id" });
    };

    if ("geolocation" in navigator) {
      watchId = navigator.geolocation.watchPosition(
        (pos) => updateLocation(pos.coords.latitude, pos.coords.longitude),
        (err) => console.error("GPS error:", err),
        { enableHighAccuracy: true, maximumAge: 30000, timeout: 10000 }
      );
    }

    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
    };
  }, [isOnline, driverData?.id]);

  // Toggle online/offline
  const toggleOnline = async () => {
    if (!driverData) return;
    setTogglingOnline(true);
    const newStatus = !isOnline;

    const { error } = await supabase
      .from("drivers")
      .update({ is_online: newStatus })
      .eq("id", driverData.id);

    if (!error) {
      setIsOnline(newStatus);
      setDriverData({ ...driverData, is_online: newStatus });
      
      // Update driver_locations
      if (!newStatus) {
        await supabase
          .from("driver_locations")
          .upsert({
            driver_id: driverData.id,
            is_online: false,
            lat: 0,
            lng: 0,
            updated_at: new Date().toISOString(),
          }, { onConflict: "driver_id" });
      }

      toast({
        title: newStatus ? "أنت الآن متصل ✅" : "أنت الآن غير متصل",
        description: newStatus ? "يمكنك استقبال الطلبات الآن" : "لن تتلقى طلبات جديدة",
      });
    }
    setTogglingOnline(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!driverData?.is_approved) {
    return (
      <div className="text-center py-20 space-y-4">
        <div className="w-20 h-20 mx-auto rounded-full bg-accent flex items-center justify-center">
          <span className="text-4xl">⏳</span>
        </div>
        <h2 className="text-xl font-bold text-foreground">حسابك قيد المراجعة</h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          لم تتم الموافقة على حسابك بعد. يرجى الانتظار حتى يراجع المشرف بياناتك ومستنداتك.
        </p>
      </div>
    );
  }

  const stats = [
    { title: "إجمالي الرحلات", value: driverData.total_trips || 0, icon: Car, color: "text-primary" },
    { title: "إجمالي الأرباح", value: `${driverData.total_earnings || 0} ر.ي`, icon: DollarSign, color: "text-primary" },
    { title: "التقييم", value: driverData.rating || "0.0", icon: Star, color: "text-primary" },
    { title: "الحالة", value: isOnline ? "متصل" : "غير متصل", icon: MapPin, color: isOnline ? "text-primary" : "text-muted-foreground" },
  ];

  const getRideTypeLabel = (type: string) => {
    switch (type) {
      case "one_way": return "ذهاب فقط";
      case "round_trip": return "ذهاب وعودة";
      default: return type;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with online toggle */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            مرحباً، {profile?.full_name || "سائق"}
          </h1>
          <p className="text-muted-foreground text-sm">لوحة تحكم السائق</p>
        </div>
        <div className="flex items-center gap-3 bg-card border border-border rounded-xl p-3">
          <span className="text-sm font-medium text-foreground">
            {isOnline ? "متصل" : "غير متصل"}
          </span>
          <Switch
            checked={isOnline}
            onCheckedChange={toggleOnline}
            disabled={togglingOnline}
          />
          <div className={`w-3 h-3 rounded-full ${isOnline ? "bg-primary animate-pulse" : "bg-muted-foreground"}`} />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground flex items-center gap-1">
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
                {stat.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl font-bold text-foreground">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pending Ride Requests */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-foreground">طلبات الأجرة المتاحة</h2>
          <Button variant="outline" size="sm" onClick={fetchPendingRequests} disabled={loadingRequests}>
            {loadingRequests ? "جاري التحديث..." : "تحديث"}
          </Button>
        </div>

        {!isOnline && (
          <Card className="border-dashed">
            <CardContent className="text-center py-8">
              <Navigation className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground font-medium">قم بتفعيل الاتصال لاستقبال الطلبات</p>
            </CardContent>
          </Card>
        )}

        {isOnline && pendingRequests.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="text-center py-8">
              <Car className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground font-medium">لا توجد طلبات متاحة حالياً</p>
              <p className="text-muted-foreground text-xs mt-1">ستظهر الطلبات الجديدة هنا تلقائياً</p>
            </CardContent>
          </Card>
        )}

        {isOnline && pendingRequests.length > 0 && (
          <div className="space-y-3">
            {pendingRequests.map((req) => (
              <Card key={req.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="secondary" className="text-xs">
                          {getRideTypeLabel(req.ride_type)}
                        </Badge>
                        {req.waiting_time && (
                          <Badge variant="outline" className="text-xs">
                            <Clock className="w-3 h-3 ml-1" />
                            انتظار {req.waiting_time} د
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-xs">
                          <Users className="w-3 h-3 ml-1" />
                          {req.passenger_count || 1} راكب
                        </Badge>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm">
                          <div className="w-2 h-2 rounded-full bg-primary" />
                          <span className="text-foreground font-medium">
                            {req.from_address || req.from_city}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <div className="w-2 h-2 rounded-full bg-destructive" />
                          <span className="text-foreground font-medium">
                            {req.to_address || req.to_city}
                          </span>
                        </div>
                      </div>

                      {req.notes && (
                        <p className="text-xs text-muted-foreground">{req.notes}</p>
                      )}

                      <p className="text-xs text-muted-foreground">
                        {new Date(req.created_at).toLocaleString("ar-YE")}
                      </p>
                    </div>

                    <Button
                      size="sm"
                      onClick={() => navigate(`/driver/rides/${req.id}`)}
                    >
                      تسعير
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DriverDashboard;
