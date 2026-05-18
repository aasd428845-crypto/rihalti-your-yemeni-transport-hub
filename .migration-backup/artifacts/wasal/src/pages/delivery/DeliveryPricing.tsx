import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Navigation, Store, Inbox, DollarSign, MapPin, Send, CheckCircle2,
  Calculator, Truck, Clock,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getRestaurants, updateRestaurant, updateDeliveryOrder } from "@/lib/deliveryApi";

// ─── Types ────────────────────────────────────────────────────────────────
interface PricingRequest {
  id: string;
  customer_id: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  delivery_lat: number | null;
  delivery_lng: number | null;
  total: number;
  delivery_fee: number;
  status: string;
  payment_method: string | null;
  created_at: string;
  items: any[];
  notes?: string | null;
}

const isAwaitingPricing = (o: any): boolean => {
  if (!o) return false;
  const item = o.items?.[0];
  if (!item) return false;
  if (item.awaiting_pricing === true) return true;
  // Fallback: delivery_request with no fee yet
  return item.order_type === "delivery_request"
    && Number(o.delivery_fee || 0) === 0
    && o.status === "pending";
};

// ─── Page ─────────────────────────────────────────────────────────────────
const DeliveryPricing = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  // Company-wide delivery-request pricing
  const [pricePerKm, setPricePerKm] = useState<number>(0);
  const [minDeliveryFee, setMinDeliveryFee] = useState<number>(0);
  const [savingCompany, setSavingCompany] = useState(false);

  // Restaurants per-km pricing
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [restaurantPriceDraft, setRestaurantPriceDraft] = useState<Record<string, number>>({});
  const [savingRestId, setSavingRestId] = useState<string | null>(null);

  // Pricing inbox
  const [requests, setRequests] = useState<PricingRequest[]>([]);
  const [priceDraft, setPriceDraft] = useState<Record<string, string>>({});
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);

  // ── Load all sources ────────────────────────────────────────────────────
  const loadAll = async () => {
    if (!user) return;
    try {
      const [{ data: settings }, rests, { data: orders }] = await Promise.all([
        supabase.from("partner_settings" as any).select("*").eq("partner_id", user.id).maybeSingle(),
        getRestaurants(user.id),
        supabase.from("delivery_orders")
          .select("*")
          .eq("delivery_company_id", user.id)
          .order("created_at", { ascending: false })
          .limit(50),
      ]);

      if (settings) {
        setPricePerKm(Number((settings as any).price_per_km ?? 0));
        setMinDeliveryFee(Number((settings as any).min_delivery_fee ?? 0));
      }
      setRestaurants(rests || []);
      setRestaurantPriceDraft(
        Object.fromEntries((rests || []).map((r: any) => [r.id, Number(r.price_per_km || 0)]))
      );
      const awaiting = (orders || []).filter(isAwaitingPricing) as unknown as PricingRequest[];
      setRequests(awaiting);
    } catch (err: any) {
      toast({ title: "خطأ في التحميل", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, [user]);

  // ── Realtime: refresh inbox on new pricing requests ─────────────────────
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`pricing-inbox-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "delivery_orders", filter: `delivery_company_id=eq.${user.id}` },
        () => loadAll()
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "delivery_orders", filter: `delivery_company_id=eq.${user.id}` },
        () => loadAll()
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  // ── Save company-wide pricing ───────────────────────────────────────────
  const saveCompanyPricing = async () => {
    if (!user) return;
    setSavingCompany(true);
    try {
      await supabase.from("partner_settings" as any).upsert({
        partner_id: user.id,
        price_per_km: pricePerKm,
        min_delivery_fee: minDeliveryFee,
        updated_at: new Date().toISOString(),
      }, { onConflict: "partner_id" });
      toast({
        title: "تم حفظ تسعير طلبات التوصيل",
        description: pricePerKm > 0
          ? `${pricePerKm} ر.ي/كم${minDeliveryFee > 0 ? ` — حد أدنى ${minDeliveryFee} ر.ي` : ""}`
          : "تم إيقاف التسعير التلقائي",
      });
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    } finally {
      setSavingCompany(false);
    }
  };

  // ── Save per-restaurant pricing ─────────────────────────────────────────
  const saveRestaurantPrice = async (restId: string) => {
    setSavingRestId(restId);
    try {
      const newPrice = Number(restaurantPriceDraft[restId] || 0);
      await updateRestaurant(restId, { price_per_km: newPrice });
      setRestaurants(rs => rs.map(r => r.id === restId ? { ...r, price_per_km: newPrice } : r));
      toast({ title: "تم حفظ سعر المطعم", description: `${newPrice} ر.ي/كم` });
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    } finally {
      setSavingRestId(null);
    }
  };

  // ── Submit price for a customer request ─────────────────────────────────
  const submitPriceForRequest = async (req: PricingRequest) => {
    const raw = priceDraft[req.id];
    const finalPrice = Number(raw);
    if (!raw || isNaN(finalPrice) || finalPrice <= 0) {
      toast({ title: "أدخل سعراً صحيحاً", variant: "destructive" });
      return;
    }

    setSubmittingId(req.id);
    try {
      // Mark items[0].awaiting_pricing = false, attach company_quoted_price
      const updatedItems = (req.items || []).map((it: any, idx: number) =>
        idx === 0 ? { ...it, awaiting_pricing: false, company_quoted_price: finalPrice } : it
      );

      await updateDeliveryOrder(req.id, {
        total: finalPrice,
        delivery_fee: finalPrice,
        status: "priced",
        items: updatedItems,
      });

      // Notify the customer
      try {
        await (supabase.from as any)("notifications").insert({
          user_id: req.customer_id,
          title: "💰 تم تسعير طلبك!",
          body: `السعر: ${finalPrice.toLocaleString()} ر.ي — افتح الطلب لاختيار طريقة الدفع.`,
          data: {
            type: "order_priced",
            order_id: req.id,
            url: `/order/track/delivery/${req.id}`,
          },
          is_read: false,
        });
      } catch (_) {}

      toast({ title: "تم إرسال السعر للعميل", description: "سيتلقى إشعاراً ليختار طريقة الدفع." });
      setRequests(rs => rs.filter(r => r.id !== req.id));
      setPriceDraft(d => { const c = { ...d }; delete c[req.id]; return c; });
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    } finally {
      setSubmittingId(null);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-20"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Calculator className="w-6 h-6 text-primary" /> مركز التسعير
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            تحكّم بأسعار الكيلومتر للمطاعم وطلبات التوصيل، وراجع طلبات التسعير الواردة من العملاء.
          </p>
        </div>
        {requests.length > 0 && (
          <Badge className="bg-amber-500 hover:bg-amber-500 text-white text-sm gap-1.5 px-3 py-1.5">
            <Inbox className="w-3.5 h-3.5" />
            {requests.length} طلب تسعير جديد
          </Badge>
        )}
      </div>

      <Tabs defaultValue="inbox">
        <TabsList className="flex-wrap">
          <TabsTrigger value="inbox" className="gap-2">
            <Inbox className="w-4 h-4" /> طلبات التسعير
            {requests.length > 0 && (
              <span className="bg-amber-500 text-white text-[10px] rounded-full px-1.5 py-0.5 font-bold">
                {requests.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="delivery" className="gap-2">
            <Truck className="w-4 h-4" /> تسعير طلبات التوصيل
          </TabsTrigger>
          <TabsTrigger value="restaurants" className="gap-2">
            <Store className="w-4 h-4" /> تسعير المطاعم
          </TabsTrigger>
        </TabsList>

        {/* ──────────── Pricing Inbox ──────────── */}
        <TabsContent value="inbox" className="space-y-4">
          {requests.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center text-muted-foreground space-y-2">
                <Inbox className="w-12 h-12 mx-auto opacity-30" />
                <p className="font-medium">لا توجد طلبات بانتظار التسعير</p>
                <p className="text-xs">عند طلب عميل توصيلاً دون تحديد الموقع على الخريطة، سيظهر هنا لتُحدّد له السعر.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {requests.map(req => {
                const meta = req.items?.[0] || {};
                const svcLabel =
                  meta.service_type === "shopping" ? "تسوق" :
                  meta.service_type === "meal" ? "توصيل وجبة" : "نقل طرد";
                return (
                  <Card key={req.id} className="border-amber-200 dark:border-amber-900/50">
                    <CardContent className="p-4 space-y-4">
                      <div className="flex items-start justify-between flex-wrap gap-2">
                        <div>
                          <p className="font-bold text-base">{req.customer_name}</p>
                          <p className="text-xs text-muted-foreground">{req.customer_phone}</p>
                        </div>
                        <Badge variant="outline" className="gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(req.created_at).toLocaleString("ar", { dateStyle: "short", timeStyle: "short" })}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        <div className="space-y-1">
                          <p className="text-xs font-bold text-muted-foreground flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-green-500" /> من
                          </p>
                          <p className="text-xs">{meta.pickup_address || "غير محدد"}</p>
                          {meta.pickup_landmark && (
                            <p className="text-[11px] text-muted-foreground">{meta.pickup_landmark}</p>
                          )}
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs font-bold text-muted-foreground flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-red-500" /> إلى
                          </p>
                          <p className="text-xs">{req.customer_address || "غير محدد"}</p>
                          {meta.delivery_landmark && (
                            <p className="text-[11px] text-muted-foreground">{meta.delivery_landmark}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 text-xs">
                        <Badge variant="secondary">📦 {svcLabel}</Badge>
                        {meta.item_size && <Badge variant="outline">{meta.item_size}</Badge>}
                        {meta.item_description && (
                          <Badge variant="outline" className="max-w-xs truncate">{meta.item_description}</Badge>
                        )}
                      </div>

                      {meta.notes && (
                        <p className="text-xs bg-muted rounded-lg px-3 py-2">📌 {meta.notes}</p>
                      )}

                      <Separator />

                      <div className="flex flex-wrap items-end gap-3">
                        <div className="flex-1 min-w-[160px]">
                          <Label className="text-xs flex items-center gap-1 mb-1.5">
                            <DollarSign className="w-3 h-3" /> أدخل السعر النهائي (ر.ي)
                          </Label>
                          <Input
                            type="number"
                            min={0}
                            step={100}
                            value={priceDraft[req.id] ?? ""}
                            onChange={e => setPriceDraft(d => ({ ...d, [req.id]: e.target.value }))}
                            placeholder="مثال: 1500"
                            className="h-10"
                          />
                        </div>
                        <Button
                          onClick={() => submitPriceForRequest(req)}
                          disabled={submittingId === req.id}
                          className="h-10 gap-2 min-w-[140px]"
                        >
                          {submittingId === req.id ? (
                            <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                          ) : (
                            <><Send className="w-4 h-4" /> إرسال السعر للعميل</>
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ──────────── Delivery Request Pricing ──────────── */}
        <TabsContent value="delivery">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Navigation className="w-5 h-5 text-primary" />
                تسعير طلبات التوصيل بالكيلومتر
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4 text-sm text-blue-800 dark:text-blue-300 space-y-1">
                <p className="font-semibold">كيف تعمل هذه الإعدادات؟</p>
                <p>عندما يطلب العميل توصيلاً ويُحدّد نقطتي الاستلام والتسليم على الخريطة، يحسب النظام السعر تلقائياً بضرب المسافة في سعر الكيلومتر.</p>
                <p className="text-blue-600 dark:text-blue-400">مثال: 4 كم × 250 ر.ي = 1000 ر.ي</p>
                <p className="mt-1">⚠️ إذا لم يحدّد العميل الموقعين، سيصلك طلب تسعير في تبويب "طلبات التسعير".</p>
              </div>

              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-semibold">سعر الكيلومتر الواحد (ر.ي)</Label>
                  <p className="text-xs text-muted-foreground mb-2">اضبطه على 0 لإيقاف التسعير التلقائي وطلب تسعير يدوي لكل طلب</p>
                  <Input
                    type="number" min={0} step={50}
                    value={pricePerKm}
                    onChange={e => setPricePerKm(Number(e.target.value))}
                    placeholder="مثال: 250"
                    className="max-w-xs"
                  />
                </div>

                <div>
                  <Label className="text-sm font-semibold">الحد الأدنى للرسوم (ر.ي)</Label>
                  <p className="text-xs text-muted-foreground mb-2">لن يقل سعر التوصيل عن هذا المبلغ حتى لو كانت المسافة قصيرة</p>
                  <Input
                    type="number" min={0} step={100}
                    value={minDeliveryFee}
                    onChange={e => setMinDeliveryFee(Number(e.target.value))}
                    placeholder="مثال: 500"
                    className="max-w-xs"
                  />
                </div>

                {pricePerKm > 0 && (
                  <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 rounded-lg p-3 text-sm text-green-700 dark:text-green-300 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    التسعير التلقائي مفعّل — {pricePerKm} ر.ي/كم
                    {minDeliveryFee > 0 && ` — حد أدنى ${minDeliveryFee} ر.ي`}
                  </div>
                )}

                <Button onClick={saveCompanyPricing} disabled={savingCompany}>
                  {savingCompany ? "جاري الحفظ..." : "حفظ التسعير"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ──────────── Restaurants Pricing ──────────── */}
        <TabsContent value="restaurants" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Store className="w-5 h-5 text-primary" /> سعر الكيلومتر لكل مطعم
              </CardTitle>
            </CardHeader>
            <CardContent>
              {restaurants.length === 0 ? (
                <p className="py-10 text-center text-muted-foreground text-sm">
                  لا توجد مطاعم مرتبطة بشركتك. أضف مطاعم من قسم "المطاعم" أولاً.
                </p>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground bg-muted rounded-lg p-3">
                    💡 يستخدم هذا السعر عند توصيل طلبات هذا المطعم تحديداً، ويتجاوز سعر الكيلومتر العام للشركة.
                  </p>
                  {restaurants.map(r => (
                    <Card key={r.id} className="overflow-hidden">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3 flex-wrap">
                          {r.logo_url ? (
                            <img src={r.logo_url} alt="" className="w-12 h-12 rounded-lg object-cover" />
                          ) : (
                            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                              <Store className="w-6 h-6 text-primary" />
                            </div>
                          )}
                          <div className="flex-1 min-w-[140px]">
                            <p className="font-bold">{r.name_ar}</p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <MapPin className="w-3 h-3" />{r.city || "بدون مدينة"}
                            </p>
                          </div>
                          <div className="flex items-end gap-2">
                            <div>
                              <Label className="text-[10px] mb-1 block">سعر الكيلومتر</Label>
                              <Input
                                type="number" min={0} step={50}
                                value={restaurantPriceDraft[r.id] ?? 0}
                                onChange={e => setRestaurantPriceDraft(d => ({ ...d, [r.id]: Number(e.target.value) }))}
                                className="w-28 h-9"
                                placeholder="0"
                              />
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => saveRestaurantPrice(r.id)}
                              disabled={savingRestId === r.id}
                              className="h-9"
                            >
                              {savingRestId === r.id ? "..." : "حفظ"}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DeliveryPricing;
