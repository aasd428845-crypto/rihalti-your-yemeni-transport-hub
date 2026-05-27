import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Package, DollarSign, Star, MapPin, Navigation, Clock, CheckCircle2, Truck, PhoneCall } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { updateOrderStatus } from "@/lib/deliveryApi";

// ── Status helpers ────────────────────────────────────────────────────────────
const STATUS_LABEL: Record<string, string> = {
  pending:    "في الانتظار",
  confirmed:  "مؤكد",
  accepted:   "مقبول",
  preparing:  "قيد التحضير",
  ready:      "جاهز",
  assigned:   "معيّن لك ✅",
  picked_up:  "استلمته 📦",
  on_the_way: "في الطريق 🚗",
  delivered:  "تم التوصيل ✔️",
  cancelled:  "ملغي",
  returned:   "مرتجع",
};
const STATUS_COLOR: Record<string, string> = {
  assigned:   "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  picked_up:  "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300",
  on_the_way: "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300",
  delivered:  "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  cancelled:  "bg-red-100 text-red-800",
};

// ── Cash notice (status-aware) ────────────────────────────────────────────────
const cashNotice = (order: any): { text: string; cls: string } | null => {
  const amount = Number(order.total || 0);
  if (order.payment_method === "cash" && amount > 0) {
    if (order.status === "delivered") {
      return {
        text: `📋 تم تسجيل ${amount.toLocaleString()} ر.ي عليك — يجب تسليم المبلغ للإدارة`,
        cls: "bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800",
      };
    }
    return {
      text: `💵 عليك تحصيل: ${amount.toLocaleString()} ر.ي`,
      cls: "bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800",
    };
  }
  if (order.payment_method === "bank_transfer" || order.payment_method === "online") {
    return {
      text: "✅ مدفوع مسبقاً — لا يلزم تحصيل أي مبلغ",
      cls: "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800",
    };
  }
  return null;
};

// ── Format items with add-ons ─────────────────────────────────────────────────
const getItemsWithAddons = (items: any[]): { base: string; addons: string[] }[] => {
  if (!items?.length) return [];
  return items
    .filter((i: any) => i.order_type !== "delivery_request")
    .map((i: any) => {
      const base = `${i.quantity || 1}× ${i.name_ar || i.name || "صنف"}`;
      const addons: string[] = [];
      // selectedOptions is an object { groupId: [{ name_ar, price }] }
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
      // fallback: options array
      if (!addons.length && Array.isArray(i.options)) {
        i.options.flatMap((o: any) => o.items || o.selected || [])
          .forEach((oi: any) => oi?.name_ar && addons.push(oi.name_ar));
      }
      return { base, addons };
    });
};

const DeliveryDriverDashboard = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [driverData, setDriverData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(false);
  const [togglingOnline, setTogglingOnline] = useState(false);
  const [pendingOrders, setPendingOrders] = useState<any[]>([]);
  const [myOrders, setMyOrders] = useState<any[]>([]);
  const [updatingOrder, setUpdatingOrder] = useState<string | null>(null);

  // ── Load driver data ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    const loadDriverData = async () => {
      const { data } = await supabase
        .from("riders")
        .select("*")
        .eq("user_id" as any, user.id)
        .maybeSingle();

      if (data) {
        setDriverData(data);
        setIsOnline(data.is_online || false);
        setLoading(false);
        return;
      }

      // Fallback: ربط الحساب عبر API server (service role — يتجاوز RLS)
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser?.email) {
        try {
          const linkRes = await window.fetch("/api/riders/link", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: authUser.email, userId: user.id }),
          });
          if (linkRes.ok) {
            const { rider } = await linkRes.json();
            if (rider) {
              setDriverData(rider);
              setIsOnline(rider.is_online || false);
              setLoading(false);
              return;
            }
          }
        } catch (_) {}
      }

      setDriverData(null);
      setLoading(false);
    };
    loadDriverData();
  }, [user]);

  // ── Fetch available (unassigned) orders ────────────────────────────────────
  const fetchPendingOrders = useCallback(async () => {
    if (!driverData?.is_approved || !driverData?.delivery_company_id) return;
    const { data } = await supabase
      .from("delivery_orders")
      .select("*, restaurant:restaurants(name_ar, address, phone)")
      .eq("delivery_company_id", driverData.delivery_company_id)
      .eq("status", "pending")
      .is("rider_id", null)
      .order("created_at", { ascending: false })
      .limit(20);
    setPendingOrders(data || []);
  }, [driverData]);

  // ── Fetch MY assigned orders (via API server to bypass RLS) ─────────────────
  const fetchMyOrders = useCallback(async () => {
    if (!user?.id) return;
    try {
      const res = await window.fetch(`/api/riders/orders/${user.id}`);
      if (res.ok) {
        const json = await res.json();
        setMyOrders(json.orders || []);
        return;
      }
    } catch (_) {}
    // Fallback: direct query (works if RLS allows)
    if (!driverData?.id) return;
    const { data } = await supabase
      .from("delivery_orders")
      .select("*, restaurant:restaurants(name_ar, address, phone)")
      .eq("rider_id" as any, driverData.id)
      .not("status", "in", '("delivered","cancelled","returned")')
      .order("assigned_at", { ascending: false })
      .limit(30);
    setMyOrders(data || []);
  }, [user, driverData]);

  useEffect(() => {
    if (driverData?.is_approved) {
      fetchPendingOrders();
      fetchMyOrders();
    }
  }, [driverData, fetchPendingOrders, fetchMyOrders]);

  // ── Realtime updates ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!driverData?.is_approved) return;
    const channel = supabase
      .channel("dd-orders")
      .on("postgres_changes", { event: "*", schema: "public", table: "delivery_orders" }, () => {
        fetchPendingOrders();
        fetchMyOrders();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [driverData, fetchPendingOrders, fetchMyOrders]);

  // ── GPS tracking when online ────────────────────────────────────────────────
  useEffect(() => {
    if (!isOnline || !user || !driverData?.id) return;
    let watchId: number;
    const updateLoc = async (lat: number, lng: number) => {
      await supabase
        .from("riders")
        .update({ current_lat: lat, current_lng: lng, updated_at: new Date().toISOString() } as any)
        .eq("id", driverData.id);
    };
    if ("geolocation" in navigator) {
      watchId = navigator.geolocation.watchPosition(
        (pos) => updateLoc(pos.coords.latitude, pos.coords.longitude),
        (err) => console.error("GPS error:", err),
        { enableHighAccuracy: true, maximumAge: 30000, timeout: 10000 }
      );
    }
    return () => { if (watchId) navigator.geolocation.clearWatch(watchId); };
  }, [isOnline, user, driverData]);

  // ── Toggle online status ────────────────────────────────────────────────────
  const toggleOnline = async () => {
    if (!driverData) return;
    setTogglingOnline(true);
    const newStatus = !isOnline;
    const { error } = await supabase
      .from("riders")
      .update({ is_online: newStatus, updated_at: new Date().toISOString() } as any)
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

  // ── Update order status (by rider) ─────────────────────────────────────────
  const handleOrderStatus = async (orderId: string, newStatus: string, label: string) => {
    setUpdatingOrder(orderId);
    try {
      await updateOrderStatus(orderId, newStatus);
      toast({ title: `✅ ${label}`, description: "تم تحديث حالة الطلب" });
      fetchMyOrders();
      fetchPendingOrders();
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    } finally {
      setUpdatingOrder(null);
    }
  };

  // ── Render status action buttons for an order ───────────────────────────────
  const renderStatusActions = (order: any) => {
    const busy = updatingOrder === order.id;
    if (order.status === "assigned" || order.status === "ready") {
      return (
        <Button
          size="sm"
          className="w-full gap-2 bg-cyan-600 hover:bg-cyan-700 text-white"
          disabled={busy}
          onClick={() => handleOrderStatus(order.id, "picked_up", "استلمت الطلب")}
        >
          <Package className="w-4 h-4" />
          {busy ? "جاري..." : "استلمت الطلب 📦"}
        </Button>
      );
    }
    if (order.status === "picked_up") {
      return (
        <Button
          size="sm"
          className="w-full gap-2 bg-teal-600 hover:bg-teal-700 text-white"
          disabled={busy}
          onClick={() => handleOrderStatus(order.id, "on_the_way", "في الطريق")}
        >
          <Truck className="w-4 h-4" />
          {busy ? "جاري..." : "في الطريق 🚗"}
        </Button>
      );
    }
    if (order.status === "on_the_way") {
      return (
        <Button
          size="sm"
          className="w-full gap-2 bg-green-600 hover:bg-green-700 text-white"
          disabled={busy}
          onClick={() => handleOrderStatus(order.id, "delivered", "تم التوصيل")}
        >
          <CheckCircle2 className="w-4 h-4" />
          {busy ? "جاري..." : "تم التوصيل ✔️"}
        </Button>
      );
    }
    return null;
  };

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  // ── Not linked ──────────────────────────────────────────────────────────────
  if (!driverData) {
    return (
      <div className="text-center py-20 space-y-4" dir="rtl">
        <div className="w-20 h-20 mx-auto rounded-full bg-accent flex items-center justify-center">
          <span className="text-4xl">⚠️</span>
        </div>
        <h2 className="text-xl font-bold text-foreground">لم يتم العثور على حسابك</h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          لم يتم ربط حسابك بشركة توصيل بعد. يرجى التأكد من أنك استخدمت رابط الدعوة الصحيح الذي أرسلته لك الشركة، أو تواصل معهم لإعادة إرسال الرابط.
        </p>
        <Button variant="outline" onClick={() => window.location.reload()}>إعادة المحاولة</Button>
      </div>
    );
  }

  // ── Pending approval ────────────────────────────────────────────────────────
  if (!driverData.is_approved) {
    return (
      <div className="text-center py-20 space-y-4" dir="rtl">
        <div className="w-20 h-20 mx-auto rounded-full bg-accent flex items-center justify-center">
          <span className="text-4xl">⏳</span>
        </div>
        <h2 className="text-xl font-bold text-foreground">حسابك قيد المراجعة</h2>
        <p className="text-muted-foreground max-w-md mx-auto">سيتم إعلامك عند الموافقة على حسابك من قبل الشركة.</p>
      </div>
    );
  }

  const stats = [
    { title: "إجمالي التوصيلات", value: driverData.total_deliveries || 0,                             icon: Package  },
    { title: "إجمالي الأرباح",    value: `${Number(driverData.earnings || 0).toLocaleString()} ر.ي`,  icon: DollarSign },
    { title: "التقييم",           value: driverData.rating || "0.0",                                  icon: Star     },
    { title: "الحالة",            value: isOnline ? "متصل" : "غير متصل",                              icon: MapPin   },
  ];

  return (
    <div className="space-y-6" dir="rtl">
      {/* ── Header + Online Toggle ───────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            مرحباً، {profile?.full_name || driverData.full_name || "مندوب"}
          </h1>
          <p className="text-muted-foreground text-sm">مرحباً بك في منصة وصل للتوصيل</p>
        </div>
        <div className="flex items-center gap-3 bg-card border border-border rounded-xl p-3">
          <span className="text-sm font-medium text-foreground">{isOnline ? "متصل" : "غير متصل"}</span>
          <Switch checked={isOnline} onCheckedChange={toggleOnline} disabled={togglingOnline} />
          <div className={`w-3 h-3 rounded-full ${isOnline ? "bg-primary animate-pulse" : "bg-muted-foreground"}`} />
        </div>
      </div>

      {/* ── Stats ───────────────────────────────────────────────────────── */}
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

      {/* ── MY ASSIGNED ORDERS ──────────────────────────────────────────── */}
      {myOrders.length > 0 && (
        <Card className="border-2 border-primary/40">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Truck className="w-5 h-5 text-primary" />
              طلباتي الحالية
              <Badge className="bg-primary text-white text-xs">{myOrders.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {myOrders.map((order: any) => {
              const itemRows = getItemsWithAddons(order.items || []);
              const notice = cashNotice(order);
              return (
                <div
                  key={order.id}
                  className="border rounded-xl p-4 space-y-3 bg-primary/5 border-primary/20"
                >
                  {/* Status + order ID */}
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <Badge
                      variant="outline"
                      className={STATUS_COLOR[order.status] || "bg-gray-100 text-gray-800"}
                    >
                      {STATUS_LABEL[order.status] || order.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground font-mono">#{order.id.slice(0, 8)}</span>
                  </div>

                  {/* Restaurant */}
                  {order.restaurant?.name_ar && (
                    <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <span>🏪</span> {order.restaurant.name_ar}
                    </div>
                  )}

                  {/* Items with add-ons */}
                  {itemRows.length > 0 && (
                    <div className="bg-muted/50 rounded-lg px-3 py-2 space-y-1">
                      {itemRows.map((item, idx) => (
                        <div key={idx}>
                          <p className="text-xs font-medium text-foreground">🍽️ {item.base}</p>
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
                        <span className="text-muted-foreground">{order.restaurant.address}</span>
                      </div>
                    )}
                    <div className="flex items-start gap-2">
                      <span className="w-2 h-2 rounded-full bg-red-500 mt-1.5 shrink-0" />
                      <span className="text-foreground font-medium">{order.customer_address}</span>
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
                      <MapPin className="w-3.5 h-3.5" /> 📍 فتح موقع العميل في الخريطة
                    </a>
                  )}

                  {/* Customer + phone */}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">👤 {order.customer_name}</span>
                    {order.customer_phone && (
                      <a
                        href={`tel:${order.customer_phone}`}
                        className="flex items-center gap-1 text-primary font-medium"
                      >
                        <PhoneCall className="w-4 h-4" />
                        {order.customer_phone}
                      </a>
                    )}
                  </div>

                  {/* Cash notice (status-aware) */}
                  {notice && (
                    <div className={`text-sm font-semibold rounded-lg px-3 py-2 ${notice.cls}`}>
                      {notice.text}
                    </div>
                  )}

                  {/* Notes */}
                  {order.notes && (
                    <p className="text-xs text-muted-foreground">📌 {order.notes}</p>
                  )}

                  {/* Action buttons */}
                  {renderStatusActions(order)}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* ── AVAILABLE ORDERS (unassigned, for rider to pick up) ─────────── */}
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
              {pendingOrders.map((order: any) => {
                const itemRows = getItemsWithAddons(order.items || []);
                return (
                  <div key={order.id} className="flex items-start justify-between gap-4 p-3 bg-muted/50 rounded-lg">
                    <div className="flex-1 space-y-1 min-w-0">
                      {order.restaurant?.name_ar && (
                        <p className="text-xs font-bold text-primary truncate">🏪 {order.restaurant.name_ar}</p>
                      )}
                      <p className="text-sm font-medium text-foreground">{order.customer_name}</p>
                      <p className="text-xs text-muted-foreground truncate">{order.customer_address}</p>
                      {itemRows.length > 0 && (
                        <p className="text-xs text-muted-foreground truncate">
                          🍽️ {itemRows.map(r => r.addons.length ? `${r.base} (+${r.addons.join("، ")})` : r.base).join(" | ")}
                        </p>
                      )}
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-xs">
                          <DollarSign className="w-3 h-3 ml-1" />{order.total} ر.ي
                        </Badge>
                        <Badge variant="outline" className={`text-xs ${order.payment_method === "cash" ? "border-amber-400 text-amber-700" : "border-green-400 text-green-700"}`}>
                          {order.payment_method === "cash" ? "💵 نقداً" : "✅ مدفوع"}
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
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DeliveryDriverDashboard;
