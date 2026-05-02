import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Package, DollarSign, Star, MapPin, Navigation, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

const DeliveryDriverDashboard = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [driverData, setDriverData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(false);
  const [togglingOnline, setTogglingOnline] = useState(false);
  const [pendingOrders, setPendingOrders] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data } = await supabase
        .from("delivery_drivers")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      setDriverData(data);
      setIsOnline(data?.is_online || false);
      setLoading(false);
    };
    fetch();
  }, [user]);

  const fetchPendingOrders = useCallback(async () => {
    if (!driverData?.is_approved || !driverData?.delivery_company_id) return;
    const { data } = await supabase
      .from("delivery_orders")
      .select("*")
      .eq("delivery_company_id", driverData.delivery_company_id)
      .eq("status", "pending")
      .is("rider_id", null)
      .order("created_at", { ascending: false })
      .limit(20);
    setPendingOrders(data || []);
  }, [driverData]);

  useEffect(() => {
    if (driverData?.is_approved) fetchPendingOrders();
  }, [driverData, fetchPendingOrders]);

  useEffect(() => {
    if (!driverData?.is_approved) return;
    const channel = supabase
      .channel("dd-orders")
      .on("postgres_changes", { event: "*", schema: "public", table: "delivery_orders" }, () => {
        fetchPendingOrders();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [driverData, fetchPendingOrders]);

  // GPS tracking when online
  useEffect(() => {
    if (!isOnline || !user) return;
    let watchId: number;
    const updateLoc = async (lat: number, lng: number) => {
      await supabase
        .from("delivery_drivers")
        .update({ current_lat: lat, current_lng: lng, updated_at: new Date().toISOString() })
        .eq("user_id", user.id);
    };
    if ("geolocation" in navigator) {
      watchId = navigator.geolocation.watchPosition(
        (pos) => updateLoc(pos.coords.latitude, pos.coords.longitude),
        (err) => console.error("GPS error:", err),
        { enableHighAccuracy: true, maximumAge: 30000, timeout: 10000 }
      );
    }
    return () => { if (watchId) navigator.geolocation.clearWatch(watchId); };
  }, [isOnline, user]);

  const toggleOnline = async () => {
    if (!driverData) return;
    setTogglingOnline(true);
    const newStatus = !isOnline;
    const { error } = await supabase
      .from("delivery_drivers")
      .update({ is_online: newStatus, updated_at: new Date().toISOString() })
      .eq("id", driverData.id);
    if (!error) {
      setIsOnline(newStatus);
      setDriverData({ ...driverData, is_online: newStatus });
      toast({
        title: newStatus ? "أنت الآن متصل ✅" : "أنت الآن غير متصل",
        description: newStatus ? "يمكنك استقبال طلبات التوصيل الآن" : "لن تتلقى طلبات جديدة",
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

  if (!driverData) {
    return (
      <div className="text-center py-20 space-y-4">
        <div className="w-20 h-20 mx-auto rounded-full bg-accent flex items-center justify-center">
          <span className="text-4xl">⚠️</span>
        </div>
        <h2 className="text-xl font-bold text-foreground">لم يتم العثور على حسابك</h2>
        <p className="text-muted-foreground max-w-md mx-auto">يرجى التواصل مع شركة التوصيل لتفعيل حسابك.</p>
      </div>
    );
  }

  if (!driverData.is_approved) {
    return (
      <div className="text-center py-20 space-y-4">
        <div className="w-20 h-20 mx-auto rounded-full bg-accent flex items-center justify-center">
          <span className="text-4xl">⏳</span>
        </div>
        <h2 className="text-xl font-bold text-foreground">حسابك قيد المراجعة</h2>
        <p className="text-muted-foreground max-w-md mx-auto">سيتم إعلامك عند الموافقة على حسابك من قبل الشركة.</p>
      </div>
    );
  }

  const stats = [
    { title: "إجمالي التوصيلات", value: driverData.total_deliveries || 0, icon: Package },
    { title: "إجمالي الأرباح", value: `${driverData.total_earnings || 0} ر.ي`, icon: DollarSign },
    { title: "التقييم", value: driverData.rating || "0.0", icon: Star },
    { title: "الحالة", value: isOnline ? "متصل" : "غير متصل", icon: MapPin },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">مرحباً، {profile?.full_name || "مندوب"}</h1>
          <p className="text-muted-foreground text-sm">لوحة تحكم مندوب التوصيل</p>
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
                <stat.icon className="w-4 h-4 text-primary" />
                {stat.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl font-bold text-foreground">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" />
            طلبات متاحة
            {pendingOrders.length > 0 && (
              <Badge variant="destructive" className="text-xs">{pendingOrders.length}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!isOnline ? (
            <div className="text-center py-8">
              <Navigation className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground font-medium">قم بتفعيل الاتصال لاستقبال الطلبات</p>
            </div>
          ) : pendingOrders.length === 0 ? (
            <div className="text-center py-8">
              <Package className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground font-medium">لا توجد طلبات متاحة حالياً</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingOrders.map((order) => (
                <div key={order.id} className="flex items-start justify-between gap-4 p-3 bg-muted/50 rounded-lg">
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium text-foreground">{order.customer_name}</p>
                    <p className="text-xs text-muted-foreground">{order.customer_address}</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="text-xs">
                        <DollarSign className="w-3 h-3 ml-1" />{order.total} ر.ي
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        <Clock className="w-3 h-3 ml-1" />
                        {new Date(order.created_at).toLocaleTimeString("ar-YE", { hour: "2-digit", minute: "2-digit" })}
                      </Badge>
                    </div>
                  </div>
                  <Button size="sm" onClick={() => navigate(`/delivery-driver/orders/${order.id}`)}>
                    قبول
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DeliveryDriverDashboard;
