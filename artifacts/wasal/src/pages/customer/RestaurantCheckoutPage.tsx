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
import { ShoppingCart, Phone, CreditCard, Minus, Plus, AlertTriangle, Navigation } from "lucide-react";
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

  // Distance-based pricing
  const [pricePerKm, setPricePerKm] = useState<number>(0);
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [distanceFee, setDistanceFee] = useState<number | null>(null);

  // Active offer (company-level promotion — may affect delivery fee or order subtotal)
  const [activeOffer, setActiveOffer] = useState<{
    offer: import("@/lib/deliveryOffersApi").DeliveryOffer;
    appliedFeeDiscount: (fee: number) => number;
    appliedOrderDiscount: (subtotal: number) => number;
  } | null>(null);

  useEffect(() => {
    if (!restaurantId) return;
    if (!user) {
      toast({ title: "يجب تسجيل الدخول أولاً", description: "يرجى تسجيل الدخول أو إنشاء حساب لإتمام الطلب.", variant: "destructive" });
      navigate(`/login`);
      return;
    }
    const load = async () => {
      try {
        const [r, cartData] = await Promise.all([
          getRestaurantById(restaurantId),
          getCart(user.id, restaurantId),
        ]);
        setRestaurant(r);
        if (cartData?.items) setCart(cartData.items as any as CartItem[]);
        setForm(f => ({ ...f, phone: profile?.phone || "" }));

        // Use restaurant-level price_per_km first, then fall back to company settings
        if (r?.delivery_company_id) {
          // Restaurant-level rate takes priority
          if ((r as any).price_per_km && Number((r as any).price_per_km) > 0) {
            setPricePerKm(Number((r as any).price_per_km));
          } else {
            // Fall back to company-level settings
            const settingsRes = await supabase
              .from("partner_settings" as any)
              .select("price_per_km")
              .eq("partner_id", r.delivery_company_id)
              .maybeSingle();
            if (settingsRes.data) {
              setPricePerKm(Number((settingsRes.data as any).price_per_km ?? 0));
            }
          }
          // Check for active delivery offers (restaurant-specific first, then company-wide)
          const offerResult = await getActiveOffersForCompany(r.delivery_company_id, restaurantId);
          if (offerResult) setActiveOffer(offerResult);
        }
      } catch (err: any) {
        toast({ title: "خطأ", description: err.message, variant: "destructive" });
      } finally { setLoading(false); }
    };
    load();
  }, [user, restaurantId]);

  // Calculate distance-based fee when address changes
  useEffect(() => {
    if (!selectedAddress) {
      setDistanceKm(null);
      setDistanceFee(null);
      return;
    }
    if (
      pricePerKm > 0 &&
      restaurant?.latitude != null && restaurant?.longitude != null &&
      selectedAddress.latitude != null && selectedAddress.longitude != null
    ) {
      const { fee, distanceKm: km } = calcDistanceDeliveryFee(
        Number(restaurant.latitude), Number(restaurant.longitude),
        Number(selectedAddress.latitude), Number(selectedAddress.longitude),
        pricePerKm,
        0
      );
      setDistanceKm(km);
      setDistanceFee(fee);
    } else {
      setDistanceKm(null);
      setDistanceFee(null);
    }
  }, [selectedAddress, pricePerKm, restaurant]);

  const updateQty = (itemId: string, delta: number) => {
    setCart(prev => prev.map(c => c.id === itemId ? { ...c, quantity: Math.max(0, c.quantity + delta) } : c).filter(c => c.quantity > 0));
  };

  const subtotal = useMemo(() => cart.reduce((s, c) => s + c.price * c.quantity, 0), [cart]);

  // Offer applicability: check min_order_amount against raw subtotal
  const baseFee = distanceFee ?? 0;
  const offerMinOrder = activeOffer?.offer.min_order_amount ?? 0;
  const offerApplies = !!activeOffer && subtotal >= offerMinOrder;

  // Delivery offers → reduce delivery fee
  const DELIVERY_OFFER_TYPES = ["free_delivery", "percent_off_delivery", "fixed_off_delivery"];
  const isDeliveryOffer = DELIVERY_OFFER_TYPES.includes(activeOffer?.offer.offer_type ?? "");

  // Order discount offers → reduce subtotal
  const ORDER_OFFER_TYPES = ["percent_off_order", "fixed_off_order"];
  const isOrderOffer = ORDER_OFFER_TYPES.includes(activeOffer?.offer.offer_type ?? "");

  const computedDeliveryFee = offerApplies && isDeliveryOffer ? activeOffer!.appliedFeeDiscount(baseFee) : baseFee;
  const deliveryDiscount = baseFee - computedDeliveryFee;

  const computedSubtotal = offerApplies && isOrderOffer ? activeOffer!.appliedOrderDiscount(subtotal) : subtotal;
  const orderDiscount = subtotal - computedSubtotal;

  const remainingForOffer = offerMinOrder > 0 && !offerApplies ? offerMinOrder - subtotal : 0;
  const tax = 0;
  const total = computedSubtotal + computedDeliveryFee + tax;
  const canOrder = !!selectedAddress;

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
      // Delivery subsidy: only charge the restaurant when sponsor_type is "restaurant" (or unset, default).
      // If the offer is sponsored by an external party or the platform, no debt is recorded on the restaurant.
      const sponsorType = activeOffer?.offer.sponsor_type;
      const restaurantIsResponsible = !sponsorType || sponsorType === "restaurant";
      const restaurantSubsidy = offerApplies && isDeliveryOffer && restaurantIsResponsible
        ? baseFee - computedDeliveryFee
        : 0;

      const order = await createOrderFromCart({
        customer_id: user.id,
        restaurant_id: restaurantId,
        delivery_company_id: restaurant.delivery_company_id,
        customer_name: (selectedAddress as any)?.customer_name || profile?.full_name || "عميل",
        customer_phone: phone,
        customer_address: fullAddress,
        items: cart,
        subtotal: computedSubtotal,
        delivery_fee: computedDeliveryFee,
        tax,
        total,
        payment_method: "pending",
        notes: form.notes || undefined,
        delivery_lat: selectedAddress.latitude,
        delivery_lng: selectedAddress.longitude,
        restaurant_delivery_subsidy: restaurantSubsidy,
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
      <div className="fixed inset-0 z-40 bg-background overflow-y-auto">
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
          <div className="container mx-auto px-4 py-3 max-w-3xl flex items-center gap-3">
            <button
              onClick={() => window.history.length > 2 ? navigate(-1) : navigate(`/restaurants/${restaurantId}`)}
              className="p-2 rounded-xl bg-muted/60 hover:bg-muted transition-colors shrink-0"
            >
              <span className="text-lg leading-none">›</span>
            </button>
            <h1 className="text-lg font-bold flex-1">إتمام الطلب</h1>
          </div>
        </div>
        <div className="container mx-auto px-4 py-6 max-w-3xl">
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
              {/* Active offer banner */}
              {activeOffer && offerApplies && (
                <div className="bg-green-50 dark:bg-green-950/20 border border-green-300 rounded-lg p-2.5 flex items-start gap-2 text-sm text-green-800 dark:text-green-300">
                  <span className="text-lg shrink-0">🎉</span>
                  <div className="space-y-0.5">
                    <span className="font-bold">{activeOffer.offer.title}</span>
                    {deliveryDiscount > 0 && <span className="text-green-600 text-xs mr-1">— وفّر {deliveryDiscount.toLocaleString()} ر.ي على التوصيل</span>}
                    {orderDiscount > 0 && <span className="text-green-600 text-xs mr-1">— وفّر {orderDiscount.toLocaleString()} ر.ي على طلبك</span>}
                    {/* Sponsor credit */}
                    {activeOffer.offer.sponsor_type === "external" && activeOffer.offer.sponsor_name && (
                      <p className="text-xs text-green-700 opacity-80">بدعم من: {activeOffer.offer.sponsor_name}</p>
                    )}
                    {activeOffer.offer.sponsor_type === "platform" && (
                      <p className="text-xs text-green-700 opacity-80">هدية من شركة التوصيل</p>
                    )}
                  </div>
                </div>
              )}
              {activeOffer && !offerApplies && offerMinOrder > 0 && (
                <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-300 rounded-lg p-2.5 flex items-center gap-2 text-sm text-amber-800 dark:text-amber-300">
                  <span className="text-lg">🎁</span>
                  <div>
                    <span className="font-bold">{activeOffer.offer.title}</span>
                    <p className="text-xs mt-0.5">أضف <span className="font-bold">{remainingForOffer.toLocaleString()} ر.ي</span> للحصول على هذا العرض</p>
                  </div>
                </div>
              )}
              <div className="space-y-1 text-sm">
                <div className="flex justify-between"><span>المجموع الفرعي</span><span>{subtotal.toLocaleString()} ر.ي</span></div>
                {offerApplies && orderDiscount > 0 && (
                  <div className="flex justify-between text-green-600 font-medium">
                    <span>خصم الطلب ({activeOffer!.offer.title})</span>
                    <span>- {orderDiscount.toLocaleString()} ر.ي</span>
                  </div>
                )}
                {offerApplies && orderDiscount > 0 && (
                  <div className="flex justify-between text-muted-foreground text-xs">
                    <span>بعد الخصم</span>
                    <span className="font-semibold text-foreground">{computedSubtotal.toLocaleString()} ر.ي</span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-1">
                    رسوم التوصيل
                    {distanceKm !== null && !offerApplies && (
                      <Badge variant="outline" className="text-[10px] gap-0.5">
                        <Navigation className="w-2.5 h-2.5" />
                        {distanceKm.toFixed(1)} كم
                      </Badge>
                    )}
                  </span>
                  <span>
                    {/* Free delivery offer active → always show مجاني regardless of address */}
                    {offerApplies && isDeliveryOffer && computedDeliveryFee === 0 ? (
                      <span className="flex items-center gap-1">
                        {baseFee > 0 && <span className="line-through text-muted-foreground text-xs">{baseFee.toLocaleString()} ر.ي</span>}
                        <span className="text-green-600 font-bold">مجاني 🎉</span>
                      </span>
                    ) : offerApplies && isDeliveryOffer && deliveryDiscount > 0 ? (
                      // Partial discount
                      <span className="flex items-center gap-1">
                        <span className="line-through text-muted-foreground text-xs">{baseFee.toLocaleString()}</span>
                        <span className="text-green-600 font-bold">{computedDeliveryFee.toLocaleString()} ر.ي</span>
                      </span>
                    ) : distanceFee === null ? (
                      /* No offer or not applicable — show pending until address selected */
                      activeOffer && isDeliveryOffer && offerMinOrder > 0 && !offerApplies ? (
                        <span className="text-amber-600 text-xs">أضف {(offerMinOrder - subtotal).toLocaleString()} ر.ي للتوصيل المجاني</span>
                      ) : (
                        <span className="text-muted-foreground text-xs">يُحسب بعد اختيار العنوان</span>
                      )
                    ) : (
                      <span>{computedDeliveryFee.toLocaleString()} ر.ي</span>
                    )}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between font-bold text-base"><span>الإجمالي</span><span className="text-primary">{total.toLocaleString()} ر.ي</span></div>
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
              {/* Distance fee info */}
              {selectedAddress && distanceKm !== null && (
                <div className={`border rounded-lg p-2 text-sm flex items-start gap-2 ${offerApplies && computedDeliveryFee === 0 ? "bg-amber-50 dark:bg-amber-950/20 border-amber-200 text-amber-700 dark:text-amber-300" : "bg-green-50 dark:bg-green-950/20 border-green-200 text-green-700 dark:text-green-300"}`}>
                  <Navigation className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    المسافة: <strong>{distanceKm.toFixed(2)} كم</strong> × {pricePerKm.toLocaleString()} ر.ي/كم = <strong>{baseFee.toLocaleString()} ر.ي</strong>
                    {offerApplies && computedDeliveryFee === 0 && (
                      <span className="block text-xs mt-0.5 text-amber-600 dark:text-amber-400">
                        ⚡ التوصيل مجاني للعميل — رسوم الكيلومتر ({baseFee.toLocaleString()} ر.ي) تُحتسب مديونية على المطعم
                      </span>
                    )}
                    {offerApplies && computedDeliveryFee > 0 && deliveryDiscount > 0 && (
                      <span className="block text-xs mt-0.5">
                        بعد الخصم: <strong>{computedDeliveryFee.toLocaleString()} ر.ي</strong>
                      </span>
                    )}
                  </span>
                </div>
              )}
              {selectedAddress && distanceKm === null && (
                <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 rounded-lg p-3">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>لم يتم تحديد موقع المطعم على الخريطة بعد — سيتم تحديد رسوم التوصيل لاحقاً</span>
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
    </div>
  );
};

export default RestaurantCheckoutPage;
