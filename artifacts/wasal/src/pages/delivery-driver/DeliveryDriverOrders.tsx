import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Package, MapPin, CheckCircle, PhoneCall, Navigation } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// ── Status label ──────────────────────────────────────────────────────────────
const STATUS_LABEL: Record<string, string> = {
  assigned:   "تم التعيين ✅",
  picked_up:  "تم الاستلام 📦",
  on_the_way: "في الطريق 🚗",
  in_transit: "في الطريق 🚗",
  delivered:  "تم التوصيل ✔️",
  cancelled:  "ملغي",
};
const STATUS_COLOR: Record<string, string> = {
  assigned:   "bg-purple-100 text-purple-800",
  picked_up:  "bg-cyan-100 text-cyan-800",
  on_the_way: "bg-teal-100 text-teal-800",
  in_transit: "bg-teal-100 text-teal-800",
  delivered:  "bg-green-100 text-green-800",
  cancelled:  "bg-red-100 text-red-800",
};

// ── Cash notice (status-aware) ────────────────────────────────────────────────
const cashNotice = (order: any): { text: string; cls: string } | null => {
  const amount = Number(order.total || 0);
  if (order.payment_method === "cash" && amount > 0) {
    if (order.status === "delivered") {
      return {
        text: `📋 تم تسجيل ${amount.toLocaleString()} ر.ي عليك — يجب تسليم المبلغ للإدارة`,
        cls: "bg-blue-50 text-blue-800 border border-blue-200",
      };
    }
    return {
      text: `💵 عليك تحصيل: ${amount.toLocaleString()} ر.ي`,
      cls: "bg-amber-50 text-amber-800 border border-amber-200",
    };
  }
  if (order.payment_method === "bank_transfer" || order.payment_method === "online") {
    return {
      text: "✅ مدفوع مسبقاً — لا يلزم تحصيل أي مبلغ",
      cls: "bg-green-50 text-green-700 border border-green-200",
    };
  }
  return null;
};

// ── Items with add-ons ────────────────────────────────────────────────────────
const getItemsWithAddons = (items: any[]): { base: string; addons: string[] }[] => {
  if (!items?.length) return [];
  return items
    .filter((i: any) => i.order_type !== "delivery_request")
    .map((i: any) => {
      const base = `${i.quantity || 1}× ${i.name_ar || i.name || "صنف"}`;
      const addons: string[] = [];
      const opts = i.selectedOptions || i.selected_options;
      if (opts && typeof opts === "object" && !Array.isArray(opts)) {
        Object.values(opts).forEach((v: any) => {
          if (Array.isArray(v)) v.forEach((c: any) => c?.name_ar && addons.push(c.name_ar));
          else if (v?.name_ar) addons.push(v.name_ar);
        });
      } else if (Array.isArray(opts)) {
        opts.flatMap((o: any) => o.items || o.selected || [])
          .forEach((oi: any) => oi?.name_ar && addons.push(oi.name_ar));
      }
      if (!addons.length && Array.isArray(i.options)) {
        i.options.flatMap((o: any) => o.items || o.selected || [])
          .forEach((oi: any) => oi?.name_ar && addons.push(oi.name_ar));
      }
      return { base, addons };
    });
};

const DeliveryDriverOrders = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [driverData, setDriverData] = useState<any>(null);
  const [activeOrders, setActiveOrders] = useState<any[]>([]);
  const [completedOrders, setCompletedOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingOrder, setUpdatingOrder] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const loadOrders = async () => {
      try {
        const [activeRes, completedRes] = await Promise.all([
          window.fetch(`/api/riders/orders/${user.id}`),
          window.fetch(`/api/riders/orders/${user.id}?completed=true`),
        ]);
        if (activeRes.ok && completedRes.ok) {
          const [activeJson, completedJson] = await Promise.all([
            activeRes.json(),
            completedRes.json(),
          ]);
          setDriverData(activeJson.rider || completedJson.rider || null);
          setActiveOrders(activeJson.orders || []);
          setCompletedOrders(completedJson.orders || []);
          setLoading(false);
          return;
        }
      } catch (_) {}

      // Fallback: direct Supabase query
      const { data: dd } = await supabase
        .from("riders")
        .select("*")
        .eq("user_id" as any, user.id)
        .maybeSingle();
      setDriverData(dd);
      if (dd) {
        const [activeRes, completedRes] = await Promise.all([
          supabase
            .from("delivery_orders")
            .select("*, restaurant:restaurants(name_ar, address, phone)")
            .eq("rider_id" as any, dd.id)
            .in("status", ["assigned", "picked_up", "on_the_way", "in_transit"])
            .order("created_at", { ascending: false }),
          supabase
            .from("delivery_orders")
            .select("*, restaurant:restaurants(name_ar, address, phone)")
            .eq("rider_id" as any, dd.id)
            .eq("status", "delivered")
            .order("delivered_at", { ascending: false })
            .limit(50),
        ]);
        setActiveOrders(activeRes.data || []);
        setCompletedOrders(completedRes.data || []);
      }
      setLoading(false);
    };
    loadOrders();
  }, [user]);

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    setUpdatingOrder(orderId);
    const updates: any = { status: newStatus, updated_at: new Date().toISOString() };
    if (newStatus === "picked_up")  updates.picked_up_at  = new Date().toISOString();
    if (newStatus === "delivered")  updates.delivered_at  = new Date().toISOString();

    const { error } = await supabase.from("delivery_orders").update(updates).eq("id", orderId);
    if (error) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "✅ تم التحديث" });
      if (newStatus === "delivered") {
        setActiveOrders((prev) => prev.filter((o) => o.id !== orderId));
      } else {
        setActiveOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, ...updates } : o));
      }
    }
    setUpdatingOrder(null);
  };

  const getNextAction = (status: string) => {
    switch (status) {
      case "assigned":   return { label: "استلمت الطلب 📦", next: "picked_up" };
      case "picked_up":  return { label: "في الطريق 🚗",    next: "on_the_way" };
      case "in_transit":
      case "on_the_way": return { label: "تم التوصيل ✔️",   next: "delivered" };
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
    <div className="space-y-4" dir="rtl">
      <h1 className="text-2xl font-bold text-foreground">الطلبات</h1>

      <Tabs defaultValue="active">
        <TabsList className="w-full">
          <TabsTrigger value="active" className="flex-1">
            نشطة
            {activeOrders.length > 0 && (
              <Badge variant="destructive" className="mr-2 text-xs">{activeOrders.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="completed" className="flex-1">مكتملة</TabsTrigger>
        </TabsList>

        {/* ── Active Orders ── */}
        <TabsContent value="active" className="mt-4 space-y-3">
          {activeOrders.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="text-center py-12">
                <Package className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">لا توجد طلبات نشطة</p>
              </CardContent>
            </Card>
          ) : (
            activeOrders.map((order) => {
              const nextAction   = getNextAction(order.status);
              const itemRows     = getItemsWithAddons(order.items || []);
              const notice       = cashNotice(order);
              const busy         = updatingOrder === order.id;

              return (
                <Card key={order.id} className="overflow-hidden">
                  <CardContent className="p-4 space-y-3">
                    {/* Header row: status + order ID */}
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <Badge
                        variant="outline"
                        className={`text-xs ${STATUS_COLOR[order.status] || "bg-gray-100 text-gray-800"}`}
                      >
                        {STATUS_LABEL[order.status] || order.status}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        #{order.id.slice(0, 8)}
                      </span>
                    </div>

                    {/* Restaurant */}
                    {order.restaurant?.name_ar && (
                      <p className="text-sm font-bold text-foreground">🏪 {order.restaurant.name_ar}</p>
                    )}

                    {/* Items + add-ons */}
                    {itemRows.length > 0 && (
                      <div className="bg-muted/50 rounded-lg px-3 py-2 space-y-1">
                        {itemRows.map((item, idx) => (
                          <div key={idx}>
                            <p className="text-xs font-medium">🍽️ {item.base}</p>
                            {item.addons.length > 0 && (
                              <p className="text-[11px] text-muted-foreground pr-4">
                                + {item.addons.join("، ")}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Addresses */}
                    <div className="space-y-1 text-sm">
                      {order.restaurant?.address && (
                        <div className="flex items-start gap-2">
                          <span className="w-2 h-2 rounded-full bg-green-500 mt-1.5 shrink-0" />
                          <span className="text-muted-foreground text-xs">{order.restaurant.address}</span>
                        </div>
                      )}
                      <div className="flex items-start gap-2">
                        <span className="w-2 h-2 rounded-full bg-red-500 mt-1.5 shrink-0" />
                        <span className="text-foreground font-medium text-xs">{order.customer_address}</span>
                      </div>
                    </div>

                    {/* GPS link */}
                    {order.delivery_lat && order.delivery_lng && (
                      <a
                        href={`https://www.google.com/maps?q=${order.delivery_lat},${order.delivery_lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-primary text-xs font-medium hover:underline"
                      >
                        <Navigation className="w-3.5 h-3.5" /> 📍 فتح موقع العميل في الخريطة
                      </a>
                    )}

                    {/* Customer + phone */}
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground text-xs">👤 {order.customer_name}</span>
                      {order.customer_phone && (
                        <a
                          href={`tel:${order.customer_phone}`}
                          className="flex items-center gap-1 text-primary font-medium text-xs"
                        >
                          <PhoneCall className="w-3.5 h-3.5" /> {order.customer_phone}
                        </a>
                      )}
                    </div>

                    {/* Cash notice */}
                    {notice && (
                      <div className={`text-xs font-semibold rounded-lg px-3 py-2 ${notice.cls}`}>
                        {notice.text}
                      </div>
                    )}

                    {/* Notes */}
                    {order.notes && (
                      <p className="text-xs text-muted-foreground">📌 {order.notes}</p>
                    )}

                    {/* Action button */}
                    {nextAction && (
                      <Button
                        className="w-full gap-2"
                        disabled={busy}
                        onClick={() => updateOrderStatus(order.id, nextAction.next)}
                      >
                        {busy ? (
                          <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> جاري...</>
                        ) : nextAction.label}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        {/* ── Completed Orders ── */}
        <TabsContent value="completed" className="mt-4 space-y-3">
          {completedOrders.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="text-center py-12">
                <CheckCircle className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">لا توجد طلبات مكتملة بعد</p>
              </CardContent>
            </Card>
          ) : (
            completedOrders.map((order) => {
              const notice = cashNotice({ ...order, status: "delivered" });
              return (
                <Card key={order.id}>
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-xs bg-green-50 text-green-700">مكتملة ✓</Badge>
                      <span className="text-[10px] text-muted-foreground font-mono">#{order.id.slice(0, 8)}</span>
                    </div>
                    <p className="text-sm font-medium">👤 {order.customer_name}</p>
                    <p className="text-xs text-muted-foreground">
                      <MapPin className="w-3 h-3 inline ml-1" />{order.customer_address}
                    </p>
                    {notice && (
                      <div className={`text-xs font-semibold rounded-lg px-3 py-2 ${notice.cls}`}>
                        {notice.text}
                      </div>
                    )}
                    <p className="text-[10px] text-muted-foreground">
                      {order.delivered_at && new Date(order.delivered_at).toLocaleDateString("ar-YE")}
                    </p>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DeliveryDriverOrders;
