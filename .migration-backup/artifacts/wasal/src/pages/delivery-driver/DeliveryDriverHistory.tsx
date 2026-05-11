import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package, Clock, DollarSign, MapPin } from "lucide-react";

const DeliveryDriverHistory = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      // Get driver record first
      const { data: driver } = await supabase
        .from("delivery_drivers")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!driver) { setLoading(false); return; }

      const { data } = await supabase
        .from("delivery_orders")
        .select("*")
        .eq("rider_id", driver.id)
        .eq("status", "delivered")
        .order("delivered_at", { ascending: false });
      setOrders(data || []);
      setLoading(false);
    };
    load();
  }, [user]);

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">سجل الطلبات</h1>

      {orders.length === 0 ? (
        <div className="text-center py-20 space-y-3">
          <Package className="w-16 h-16 mx-auto text-muted-foreground" />
          <p className="text-muted-foreground">لا توجد طلبات مكتملة بعد</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <Card
              key={order.id}
              className="cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => navigate(`/delivery-driver/orders/${order.id}`)}
            >
              <CardContent className="pt-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-primary" />
                    <span className="text-sm font-bold text-foreground">{order.customer_name}</span>
                  </div>
                  <Badge variant="outline" className="text-xs">تم التوصيل</Badge>
                </div>

                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <MapPin className="w-3 h-3" />
                  <span className="truncate max-w-[200px]">{order.customer_address}</span>
                </div>

                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    {order.delivered_at ? new Date(order.delivered_at).toLocaleDateString("ar-YE", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}
                  </div>
                  <div className="flex items-center gap-1 text-sm font-bold text-primary">
                    <DollarSign className="w-3.5 h-3.5" />
                    {order.total} ر.ي
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default DeliveryDriverHistory;
