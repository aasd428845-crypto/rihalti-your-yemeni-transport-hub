import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Package, DollarSign, Clock, MapPin, CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

const DeliveryDriverOrders = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [driverData, setDriverData] = useState<any>(null);
  const [activeOrders, setActiveOrders] = useState<any[]>([]);
  const [completedOrders, setCompletedOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data: dd } = await supabase
        .from("delivery_drivers")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      setDriverData(dd);

      if (dd) {
        const [activeRes, completedRes] = await Promise.all([
          supabase
            .from("delivery_orders")
            .select("*")
            .eq("rider_id", dd.id)
            .in("status", ["assigned", "picked_up", "in_transit"])
            .order("created_at", { ascending: false }),
          supabase
            .from("delivery_orders")
            .select("*")
            .eq("rider_id", dd.id)
            .eq("status", "delivered")
            .order("delivered_at", { ascending: false })
            .limit(50),
        ]);
        setActiveOrders(activeRes.data || []);
        setCompletedOrders(completedRes.data || []);
      }
      setLoading(false);
    };
    fetch();
  }, [user]);

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    const updates: any = { status: newStatus, updated_at: new Date().toISOString() };
    if (newStatus === "picked_up") updates.picked_up_at = new Date().toISOString();
    if (newStatus === "delivered") updates.delivered_at = new Date().toISOString();

    const { error } = await supabase.from("delivery_orders").update(updates).eq("id", orderId);
    if (error) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "تم التحديث ✅" });
      // Refresh
      setActiveOrders((prev) => {
        if (newStatus === "delivered") return prev.filter((o) => o.id !== orderId);
        return prev.map((o) => (o.id === orderId ? { ...o, ...updates } : o));
      });
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "assigned": return "تم التعيين";
      case "picked_up": return "تم الاستلام";
      case "in_transit": return "في الطريق";
      case "delivered": return "تم التوصيل";
      default: return status;
    }
  };

  const getNextAction = (status: string) => {
    switch (status) {
      case "assigned": return { label: "تم الاستلام", next: "picked_up" };
      case "picked_up": return { label: "في الطريق", next: "in_transit" };
      case "in_transit": return { label: "تم التوصيل", next: "delivered" };
      default: return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">الطلبات</h1>

      <Tabs defaultValue="active">
        <TabsList className="w-full">
          <TabsTrigger value="active" className="flex-1">
            نشطة
            {activeOrders.length > 0 && <Badge variant="destructive" className="mr-2 text-xs">{activeOrders.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="completed" className="flex-1">مكتملة</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-4">
          {activeOrders.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="text-center py-12">
                <Package className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">لا توجد طلبات نشطة</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {activeOrders.map((order) => {
                const nextAction = getNextAction(order.status);
                return (
                  <Card key={order.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge className="text-xs">{getStatusLabel(order.status)}</Badge>
                            <Badge variant="outline" className="text-xs">
                              <DollarSign className="w-3 h-3 ml-1" />{order.total} ر.ي
                            </Badge>
                          </div>
                          <p className="text-sm font-medium text-foreground">{order.customer_name}</p>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <MapPin className="w-3 h-3" />
                            {order.customer_address}
                          </div>
                        </div>
                        {nextAction && (
                          <Button size="sm" onClick={() => updateOrderStatus(order.id, nextAction.next)}>
                            {nextAction.label}
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="completed" className="mt-4">
          {completedOrders.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="text-center py-12">
                <CheckCircle className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">لا توجد طلبات مكتملة بعد</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {completedOrders.map((order) => (
                <Card key={order.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium text-foreground">{order.customer_name}</p>
                        <p className="text-xs text-muted-foreground">{order.customer_address}</p>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs bg-primary/10 text-primary">مكتملة ✓</Badge>
                          <Badge variant="outline" className="text-xs">
                            <DollarSign className="w-3 h-3 ml-1" />{order.total} ر.ي
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {order.delivered_at && new Date(order.delivered_at).toLocaleDateString("ar-YE")}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DeliveryDriverOrders;
