import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Phone, CreditCard, Minus, Plus, ArrowRight, AlertTriangle, MapPin, Loader2, Navigation } from "lucide-react";
import BackButton from "@/components/common/BackButton";
import AddressSelector, { SelectedAddress } from "@/components/addresses/AddressSelector";
import { getRestaurantById, getCart, createOrderFromCart } from "@/lib/restaurantApi";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { calcDistanceDeliveryFee } from "@/lib/distanceUtils";
import { getActiveOffersForCompany } from "@/lib/deliveryOffersApi";

interface CartItem {
  id: string;
  name_ar: string;
  price: number;
  quantity: number;
  image_url?: string;
}

const RestaurantCheckoutPage = () => {
  const { id: restaurantId } = useParams<{ id: string }>();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [restaurant, setRestaurant] = useState<any>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<SelectedAddress | null>(null);
  const [form, setForm] = useState({ phone: "", notes: "" });

  // Delivery zone pricing
  const [deliveryZones, setDeliveryZones] = useState<any[]>([]);
  const [matchedZone, setMatchedZone] = useState<any>(null);
  const [quoteRequested, setQuoteRequested] = useState(false);
  const [quoteStatus, setQuoteStatus] = useState<string | null>(null);
  const [quotedFee, setQuotedFee] = useState<number | null>(null);

  // Distance-based pricing
  const [pricePerKm, setPricePerKm] = useState<number>(0);
  const [minDeliveryFee, setMinDeliveryFee] = useState<number>(0);
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [distanceFee, setDistanceFee] = useState<number | null>(null);

  // Active delivery offer (company-level promotion)
  const [activeOffer, setActiveOffer] = useState<{ title: string; appliedFeeDiscount: (fee: number) => number } | null>(null);

  useEffect(() => {
    if (!user || !restaurantId) { navigate("/login"); return; }
    const load = async () => {
      try {
        const [r, cartData] = await Promise.all([
          getRestaurantById(restaurantId),
          getCart(user.id, restaurantId),
        ]);
        setRestaurant(r);
        if (cartData?.items) setCart(cartData.items as any as CartItem[]);
        setForm(f => ({ ...f, phone: profile?.phone || "" }));

        // Fetch delivery zones and pricing settings for this company
        if (r?.delivery_company_id) {
          const [zonesRes, settingsRes] = await Promise.all([
            supabase.from("delivery_zones" as any).select("*").eq("delivery_company_id", r.delivery_company_id).eq("is_active", true),
            supabase.from("partner_settings" as any).select("price_per_km, min_delivery_fee").eq("partner_id", r.delivery_company_id).maybeSingle(),
          ]);
          setDeliveryZones(zonesRes.data || []);
          if (settingsRes.data) {
            setPricePerKm(Number((settingsRes.data as any).price_per_km ?? 0));
            setMinDeliveryFee(Number((settingsRes.data as any).min_delivery_fee ?? 0));
          }
          // Check for active delivery offers (e.g. Thursday free delivery)
          const offerResult = await getActiveOffersForCompany(r.delivery_company_id);
          if (offerResult) {
            setActiveOffer({ title: offerResult.offer.title, appliedFeeDiscount: offerResult.appliedFeeDiscount });
          }
        }
      } catch (err: any) {
        toast({ title: "خطأ", description: err.message, variant: "destructive" });
      } finally { setLoading(false); }
    };
    load();
  }, [user, restaurantId]);

  // Match zone and calculate distance when address changes
  useEffect(() => {
    if (!selectedAddress) {
      setMatchedZone(null);
      setDistanceKm(null);
      setDistanceFee(null);
      return;
    }

    // Distance-based fee (takes priority if price_per_km is set and both coordinates exist)
    if (
      pricePerKm > 0 &&
      restaurant?.latitude != null && restaurant?.longitude != null &&
      selectedAddress.latitude != null && selectedAddress.longitude != null
    ) {
      const { fee, distanceKm: km } = calcDistanceDeliveryFee(
        Number(restaurant.latitude), Number(restaurant.longitude),
        Number(selectedAddress.latitude), Number(selectedAddress.longitude),
        pricePerKm,
        minDeliveryFee
      );
      setDistanceKm(km);
      setDistanceFee(fee);
      setMatchedZone(null);
      return;
    }

    setDistanceKm(null);
    setDistanceFee(null);

    // Fallback: zone-based matching
    if (deliveryZones.length === 0) { setMatchedZone(null); return; }
    const addressParts = [selectedAddress.district, selectedAddress.city, selectedAddress.address_name, selectedAddress.full_address].filter(Boolean).map(s => s!.toLowerCase());
    const found = deliveryZones.find((z: any) => {
      const zoneName = z.zone_name.toLowerCase();
      return addressParts.some(part => part.includes(zoneName) || zoneName.includes(part));
    });
    setMatchedZone(found || null);
  }, [selectedAddress, deliveryZones, pricePerKm, minDeliveryFee, restaurant]);

  // Realtime for quote response
  useEffect(() => {
    if (!user || !quoteRequested) return;
    const channel = supabase
      .channel("customer-quote")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "delivery_quote_requests", filter: `customer_id=eq.${user.id}` }, (payload: any) => {
        if (payload.new.status === "quoted" && payload.new.quoted_fee) {
          setQuotedFee(Number(payload.new.quoted_fee));
          setQuoteStatus("quoted");
          toast({ title: "تم تحديد سعر التوصيل! 🎉", description: `سعر التوصيل: ${Number(payload.new.quoted_fee).toLocaleString()} ر.ي` });
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, quoteRequested]);

  const handleRequestQuote = async () => {
    if (!user || !restaurant || !selectedAddress) return;
    try {
      await supabase.from("delivery_quote_requests" as any).insert({
        delivery_company_id: restaurant.delivery_company_id,
        customer_id: user.id,
        customer_address: selectedAddress.full_address,
        delivery_lat: selectedAddress.latitude,
        delivery_lng: selectedAddress.longitude,
      });
      setQuoteRequested(true);
      setQuoteStatus("pending");
      toast({ title: "تم إرسال طلب التسعيرة", description: "سيتم إبلاغك فور تحديد سعر التوصيل" });
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    }
  };

  const updateQty = (itemId: string, delta: number) => {
    setCart(prev => prev.map(c => c.id === itemId ? { ...c, quantity: Math.max(0, c.quantity + delta) } : c).filter(c => c.quantity > 0));
  };

  // Priority: distance-based > zone-matched > quoted > restaurant default
  const baseFee = distanceFee !== null
    ? distanceFee
    : matchedZone
      ? Number(matchedZone.delivery_fee)
      : quotedFee ?? (restaurant?.delivery_fee || 0);
  // Apply company-level offer on top (e.g. Thursday free delivery)
  const computedDeliveryFee = activeOffer ? activeOffer.appliedFeeDiscount(baseFee) : baseFee;
  const deliveryDiscount = baseFee - computedDeliveryFee;
  const subtotal = useMemo(() => cart.reduce((s, c) => s + c.price * c.quantity, 0), [cart]);
  const tax = 0;
  const total = subtotal + computedDeliveryFee + tax;
  // Can order: distance-mode (always ok if address selected) | zone/quote mode (need match or quote)
  const usingDistancePricing = distanceFee !== null;
  const canOrder = selectedAddress && (usingDistancePricing || matchedZone || quotedFee !== null || deliveryZones.length === 0);

  const handleSubmit = async () => {
    if (!user || !restaurantId || !restaurant) return;

    if (!selectedAddress) {
      toast({ title: "يرجى اختيار عنوان التوصيل", description: "اختر عنواناً محفوظاً أو أضف عنواناً جديداً", variant: "destructive" });
      return;
    }
    const phone = selectedAddress.phone || form.phone;
    if (!phone?.trim()) {
      toast({ title: "أدخل رقم الهاتف", variant: "destructive" });
      return;
    }
    if (cart.length === 0) {
      toast({ title: "السلة فارغة", variant: "destructive" });
      return;
    }

    const fullAddress = [selectedAddress.full_address, selectedAddress.district, selectedAddress.street, selectedAddress.landmark].filter(Boolean).join("، ");

    setSubmitting(true);
    try {
      const order = await createOrderFromCart({
        customer_id: user.id,
        restaurant_id: restaurantId,
        delivery_company_id: restaurant.delivery_company_id,
        customer_name: profile?.full_name || "عميل",
        customer_phone: phone,
        customer_address: fullAddress,
        items: cart,
        subtotal, delivery_fee: computedDeliveryFee, tax, total,
        payment_method: "pending",
        notes: form.notes || undefined,
        delivery_lat: selectedAddress.latitude,
        delivery_lng: selectedAddress.longitude,
      });
      try {
        await supabase.functions.invoke("send-push-notification", {
          body: {
            userId: restaurant.delivery_company_id,
            title: "طلب جديد 🍽️",
            body: `طلب جديد من ${profile?.full_name || 'عميل'} - ${restaurant.name_ar}`,
            sound: "new_shipment",
            data: { type: "restaurant_order" },
          },
        });
      } catch {}
      const orderId = order?.id;
      toast({ title: "تم تأكيد الطلب بنجاح! 🎉", description: "سيتم توجيهك لإتمام الدفع." });
      navigate(orderId ? `/payment/delivery/${orderId}` : "/history");
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    } finally { setSubmitting(false); }
  };

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
  if (cart.length === 0) return (
    <div className="container mx-auto px-4 py-20 text-center">
      <ShoppingCart className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
      <p className="text-muted-foreground mb-4">السلة فارغة</p>
      <Button onClick={() => navigate(`/restaurants/${restaurantId}`)}>العودة للمنيو</Button>
    </div>
  );

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <div className="container mx-auto px-4 py-6 max-w-3xl">
        <BackButton />
        <h1 className="text-2xl font-bold mb-6">إتمام الطلب</h1>

        <div className="space-y-6">
          {/* Cart Summary */}
          <Card>
            <CardHeader><CardTitle className="text-lg flex items-center gap-2"><ShoppingCart className="w-5 h-5" />ملخص الطلب من {restaurant?.name_ar}</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {cart.map(item => (
                <div key={item.id} className="flex items-center justify-between gap-3">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{item.name_ar}</p>
                    <p className="text-xs text-muted-foreground">{item.price} ر.ي × {item.quantity}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => updateQty(item.id, -1)}><Minus className="w-3 h-3" /></Button>
                    <span className="text-sm font-medium w-6 text-center">{item.quantity}</span>
                    <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => updateQty(item.id, 1)}><Plus className="w-3 h-3" /></Button>
                  </div>
                  <p className="font-bold text-sm w-20 text-left">{item.price * item.quantity} ر.ي</p>
                </div>
              ))}
              <Separator />
              {/* Active delivery offer banner */}
              {activeOffer && (
                <div className="bg-green-50 dark:bg-green-950/20 border border-green-300 rounded-lg p-2.5 flex items-center gap-2 text-sm text-green-800 dark:text-green-300">
                  <span className="text-lg">🎉</span>
                  <div>
                    <span className="font-bold">{activeOffer.title}</span>
                    {deliveryDiscount > 0 && <span className="text-green-600 text-xs mr-1">— وفّر {deliveryDiscount.toLocaleString()} ر.ي</span>}
                  </div>
                </div>
              )}
              <div className="space-y-1 text-sm">
                <div className="flex justify-between"><span>المجموع الفرعي</span><span>{subtotal} ر.ي</span></div>
                <div className="flex justify-between">
                  <span className="flex items-center gap-1">
                    رسوم التوصيل
                    {usingDistancePricing && distanceKm !== null && (
                      <Badge variant="outline" className="text-[10px] gap-0.5">
                        <Navigation className="w-2.5 h-2.5" />
                        {distanceKm.toFixed(1)} كم
                      </Badge>
                    )}
                    {matchedZone && !usingDistancePricing && <Badge variant="outline" className="text-[10px]">{matchedZone.zone_name}</Badge>}
                    {activeOffer && baseFee > computedDeliveryFee && (
                      <Badge className="text-[10px] bg-green-500 text-white border-0">
                        <span className="line-through ml-1 opacity-70">{baseFee}</span>
                      </Badge>
                    )}
                  </span>
                  <span className={activeOffer && deliveryDiscount > 0 ? "text-green-600 font-bold" : ""}>
                    {computedDeliveryFee} ر.ي
                    {computedDeliveryFee === 0 && <span className="text-xs mr-1 text-green-600">(مجاني!)</span>}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between font-bold text-base"><span>الإجمالي</span><span className="text-primary">{total} ر.ي</span></div>
              </div>
            </CardContent>
          </Card>

          {/* Delivery Address - Using AddressSelector */}
          <Card>
            <CardHeader><CardTitle className="text-lg">عنوان التوصيل</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <AddressSelector
                label="اختر عنوان التوصيل *"
                onSelect={(addr) => {
                  setSelectedAddress(addr);
                  if (addr?.phone) setForm(f => ({ ...f, phone: addr.phone! }));
                }}
              />
              {selectedAddress && (
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 text-sm space-y-1">
                  <p className="font-semibold">{selectedAddress.address_name}</p>
                  <p className="text-muted-foreground">{selectedAddress.full_address}</p>
                  {selectedAddress.landmark && <p className="text-muted-foreground">📍 {selectedAddress.landmark}</p>}
                  {selectedAddress.phone && <p className="text-muted-foreground">📞 {selectedAddress.phone}</p>}
                </div>
              )}
              {/* Distance-based fee badge */}
              {usingDistancePricing && distanceKm !== null && (
                <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 rounded-lg p-2 text-sm text-green-700 dark:text-green-300 flex items-center gap-2">
                  <Navigation className="w-4 h-4 shrink-0" />
                  <span>
                    المسافة: {distanceKm.toFixed(2)} كم — رسوم التوصيل: {computedDeliveryFee.toLocaleString()} ر.ي
                    <span className="text-green-600 text-xs mr-1">({pricePerKm} ر.ي/كم)</span>
                  </span>
                </div>
              )}

              {/* Zone pricing or quote request */}
              {selectedAddress && !usingDistancePricing && deliveryZones.length > 0 && !matchedZone && quotedFee === null && (
                <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 rounded-lg p-3 space-y-2">
                  <p className="text-sm text-amber-700 dark:text-amber-300">⚠️ منطقتك غير مسجلة في مناطق التغطية</p>
                  {quoteStatus === "pending" ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>بانتظار رد شركة التوصيل على طلب التسعيرة...</span>
                    </div>
                  ) : (
                    <Button size="sm" variant="outline" onClick={handleRequestQuote}>
                      <MapPin className="w-4 h-4 ml-1" /> طلب تسعيرة توصيل
                    </Button>
                  )}
                </div>
              )}
              {matchedZone && !usingDistancePricing && (
                <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 rounded-lg p-2 text-sm text-green-700 dark:text-green-300">
                  ✅ منطقة التوصيل: {matchedZone.zone_name} — {Number(matchedZone.delivery_fee).toLocaleString()} ر.ي
                  {matchedZone.estimated_time && <span className="text-muted-foreground"> • {matchedZone.estimated_time}</span>}
                </div>
              )}
              {quotedFee !== null && (
                <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 rounded-lg p-2 text-sm text-green-700 dark:text-green-300">
                  ✅ تم تحديد سعر التوصيل: {quotedFee.toLocaleString()} ر.ي
                </div>
              )}
              {!selectedAddress && (
                <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 rounded-lg p-3">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>يجب اختيار عنوان محفوظ أو إضافة عنوان جديد لإتمام الطلب</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Phone */}
          <Card>
            <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Phone className="w-5 h-5" />رقم الهاتف</CardTitle></CardHeader>
            <CardContent>
              <Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="رقم التواصل" />
            </CardContent>
          </Card>

          {/* Payment info note */}
          <Card>
            <CardHeader><CardTitle className="text-lg flex items-center gap-2"><CreditCard className="w-5 h-5" />طريقة الدفع</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">سيتم اختيار طريقة الدفع في الخطوة التالية بعد تأكيد الطلب</p>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardContent className="pt-6">
              <Label>ملاحظات إضافية</Label>
              <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="أي ملاحظات للمطعم أو المندوب..." />
            </CardContent>
          </Card>

          <Button className="w-full h-12 text-lg gap-2" onClick={handleSubmit} disabled={submitting || !canOrder}>
            {submitting ? <div className="animate-spin w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full" /> :
              <>تأكيد الطلب - {total} ر.ي</>}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default RestaurantCheckoutPage;
