import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Car, DollarSign, Star, MapPin, Navigation, Clock, Users, Play } from "lucide-react";
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
  const [activeRides, setActiveRides] = useState<any[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [activeTab, setActiveTab] = useState("pending");

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

  const fetchActiveRides = useCallback(async () => {
    if (!user || !driverData?.is_approved) return;
    const { data } = await supabase
      .from("ride_requests")
      .select("*")
      .eq("driver_id", user.id)
      .in("status", ["pending", "assigned", "in_progress"])
      .in("negotiation_status", ["offered", "accepted"])
      .order("created_at", { ascending: false });
    setActiveRides(data || []);
  }, [user, driverData]);

  useEffect(() => {
    if (driverData?.is_approved) {
      fetchPendingRequests();
      fetchActiveRides();
    }
  }, [driverData, fetchPendingRequests, fetchActiveRides]);

  useEffect(() => {
    if (!driverData?.is_approved) return;
    const channel = supabase
      .channel("driver-ride-requests")
      .on("postgres_changes", { event: "*", schema: "public", table: "ride_requests" }, () => {
        fetchPendingRequests();
        fetchActiveRides();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [driverData, fetchPendingRequests, fetchActiveRides]);

  useEffect(() => {
    if (!isOnline || !driverData?.id) return;
    let watchId: number;
    const updateLocation = async (lat: number, lng: number) => {
      await supabase
        .from("driver_locations")
        .upsert({ driver_id: driverData.id, lat, lng, is_online: true, updated_at: new Date().toISOString() }, { onConflict: "driver_id" });
    };
    if ("geolocation" in navigator) {
      watchId = navigator.geolocation.watchPosition(
        (pos) => updateLocation(pos.coords.latitude, pos.coords.longitude),
        (err) => console.error("GPS error:", err),
        { enableHighAccuracy: true, maximumAge: 30000, timeout: 10000 }
      );
    }
    return () => { if (watchId) navigator.geolocation.clearWatch(watchId); };
  }, [isOnline, driverData?.id]);

  const toggleOnline = async () => {
    if (!driverData) return;
    setTogglingOnline(true);
    const newStatus = !isOnline;
    const { error } = await supabase.from("drivers").update({ is_online: newStatus }).eq("id", driverData.id);
    if (!error) {
      setIsOnline(newStatus);
      setDriverData({ ...driverData, is_online: newStatus });
      if (!newStatus) {
        await supabase.from("driver_locations").upsert({ driver_id: driverData.id, is_online: false, lat: 0, lng: 0, updated_at: new Date().toISOString() }, { onConflict: "driver_id" });
      }
      toast({ title: newStatus ? "أنت الآن متصل ✅" : "أنت الآن غير متصل", description: newStatus ? "يمكنك استقبال الطلبات الآن" : "لن تتلقى طلبات جديدة" });
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
        <p className="text-muted-foreground max-w-md mx-auto">لم تتم الموافقة على حسابك بعد.</p>
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
    switch (type) { case "one_way": return "ذهاب فقط"; case "round_trip": return "ذهاب وعودة"; default: return type; }
  };

  const getStatusLabel = (status: string, negStatus: string) => {
    if (negStatus === "offered") return { label: "بانتظار رد العميل", variant: "secondary" as const };
    if (negStatus === "accepted" && status === "assigned") return { label: "تم القبول - توجه للعميل", variant: "default" as const };
    if (status === "in_progress") return { label: "رحلة جارية", variant: "default" as const };
    return { label: status, variant: "outline" as const };
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">مرحباً، {profile?.full_name || "سائق"}</h1>
          <p className="text-muted-foreground text-sm">لوحة تحكم السائق</p>
        </div>
        <div className="flex items-center gap-3 bg-card border border-border rounded-xl p-3">
          <span className="text-sm font-medium text-foreground">{isOnline ? "متصل" : "غير متصل"}</span>
          <Switch checked={isOnline} onCheckedChange={toggleOnline} disabled={togglingOnline} />
          <div className={`w-3 h-3 rounded-full ${isOnline ? "bg-primary animate-pulse" : "bg-muted-foreground"}`} />
        </div>
      </div>

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

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full">
          <TabsTrigger value="pending" className="flex-1">
            طلبات متاحة
            {pendingRequests.length > 0 && (
              <Badge variant="destructive" className="mr-2 text-xs">{pendingRequests.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="active" className="flex-1">
            رحلاتي النشطة
            {activeRides.length > 0 && (
              <Badge variant="secondary" className="mr-2 text-xs">{activeRides.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4">
          {!isOnline ? (
            <Card className="border-dashed">
              <CardContent className="text-center py-8">
                <Navigation className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground font-medium">قم بتفعيل الاتصال لاستقبال الطلبات</p>
              </CardContent>
            </Card>
          ) : pendingRequests.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="text-center py-8">
                <Car className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground font-medium">لا توجد طلبات متاحة حالياً</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {pendingRequests.map((req) => (
                <Card key={req.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="secondary" className="text-xs">{getRideTypeLabel(req.ride_type)}</Badge>
                          {req.waiting_time && <Badge variant="outline" className="text-xs"><Clock className="w-3 h-3 ml-1" />انتظار {req.waiting_time} د</Badge>}
                          <Badge variant="outline" className="text-xs"><Users className="w-3 h-3 ml-1" />{req.passenger_count || 1} راكب</Badge>
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-sm">
                            <div className="w-2 h-2 rounded-full bg-primary" />
                            <span className="text-foreground font-medium">{req.from_address || req.from_city}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <div className="w-2 h-2 rounded-full bg-destructive" />
                            <span className="text-foreground font-medium">{req.to_address || req.to_city}</span>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">{new Date(req.created_at).toLocaleString("ar-YE")}</p>
                      </div>
                      <Button size="sm" onClick={() => navigate(`/driver/rides/${req.id}`)}>تسعير</Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="active" className="mt-4">
          {activeRides.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="text-center py-8">
                <Play className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground font-medium">لا توجد رحلات نشطة</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {activeRides.map((ride) => {
                const statusInfo = getStatusLabel(ride.status, ride.negotiation_status);
                return (
                  <Card key={ride.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant={statusInfo.variant} className="text-xs">{statusInfo.label}</Badge>
                            {ride.final_price && (
                              <Badge variant="outline" className="text-xs">
                                <DollarSign className="w-3 h-3 ml-1" />{ride.final_price} ر.ي
                              </Badge>
                            )}
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-sm">
                              <div className="w-2 h-2 rounded-full bg-primary" />
                              <span className="text-foreground font-medium">{ride.from_address || ride.from_city}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <div className="w-2 h-2 rounded-full bg-destructive" />
                              <span className="text-foreground font-medium">{ride.to_address || ride.to_city}</span>
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground">{new Date(ride.created_at).toLocaleString("ar-YE")}</p>
                        </div>
                        <Button size="sm" onClick={() => navigate(`/driver/active-ride/${ride.id}`)}>
                          {ride.negotiation_status === "offered" ? "التفاصيل" : "إدارة الرحلة"}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DriverDashboard;
