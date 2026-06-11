import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { ShoppingCart, Minus, Plus, Trash2, ArrowRight, Store } from "lucide-react";
import BackButton from "@/components/common/BackButton";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getActiveOffersListForCompany, type DeliveryOffer, isOfferCurrentlyActive } from "@/lib/deliveryOffersApi";

interface CartItem {
  id: string;
  name_ar: string;
  price: number;
  quantity: number;
  image_url?: string;
  selectedOptions?: Record<string, any>;
}

interface CartData {
  id: string;
  restaurant_id: string;
  items: CartItem[];
  total_amount: number;
}

const CartPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [carts, setCarts] = useState<CartData[]>([]);
  const [restaurants, setRestaurants] = useState<Record<string, any>>({});
  // Map of restaurant_id → best active free/discount delivery offer
  const [restaurantOffers, setRestaurantOffers] = useState<Record<string, DeliveryOffer | null>>({});
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!user) { navigate("/login"); return; }
    const load = async () => {
      try {
        const { data, error } = await supabase
          .from("carts")
          .select("*")
          .eq("customer_id", user.id);
        if (error) throw error;
        const validCarts = (data || []).filter((c: any) => {
          const items = c.items as CartItem[];
          return items && items.length > 0;
        });
        setCarts(validCarts.map((c: any) => ({
          id: c.id,
          restaurant_id: c.restaurant_id,
          items: c.items as CartItem[],
          total_amount: c.total_amount,
        })));

        // Load restaurant info including delivery pricing fields
        const rIds = [...new Set(validCarts.map((c: any) => c.restaurant_id).filter(Boolean))];
        if (rIds.length > 0) {
          const { data: rData } = await supabase
            .from("restaurants")
            .select("id, name_ar, delivery_fee, min_order_amount, logo_url, delivery_company_id, price_per_km")
            .in("id", rIds);
          if (rData) {
            const map: Record<string, any> = {};
            rData.forEach((r: any) => { map[r.id] = r; });
            setRestaurants(map);

            // Fetch active offers for each unique delivery company
            const companyIds = [...new Set(
              rData.map((r: any) => r.delivery_company_id).filter(Boolean)
            )] as string[];

            if (companyIds.length > 0) {
              const offerResults = await Promise.all(
                companyIds.map(cid => getActiveOffersListForCompany(cid).then(offers => ({ cid, offers })))
              );

              // Build restaurant_id → best offer map
              const offersMap: Record<string, DeliveryOffer | null> = {};
              rData.forEach((r: any) => {
                if (!r.delivery_company_id) { offersMap[r.id] = null; return; }
                const result = offerResults.find(x => x.cid === r.delivery_company_id);
                if (!result?.offers.length) { offersMap[r.id] = null; return; }
                // Prefer restaurant-specific offer, then company-wide
                const specific = result.offers.find(o => o.restaurant_id === r.id);
                const wide = result.offers.find(o => !o.restaurant_id);
                offersMap[r.id] = specific ?? wide ?? null;
              });
              setRestaurantOffers(offersMap);
            }
          }
        }
      } catch (err: any) {
        toast({ title: "خطأ", description: err.message, variant: "destructive" });
      } finally { setLoading(false); }
    };
    load();
  }, [user]);

  const updateQty = async (cartId: string, itemId: string, delta: number) => {
    setCarts(prev => prev.map(cart => {
      if (cart.id !== cartId) return cart;
      const newItems = cart.items
        .map(c => c.id === itemId ? { ...c, quantity: Math.max(0, c.quantity + delta) } : c)
        .filter(c => c.quantity > 0);
      return { ...cart, items: newItems, total_amount: newItems.reduce((s, c) => s + c.price * c.quantity, 0) };
    }).filter(c => c.items.length > 0));

    // Persist to DB
    const cart = carts.find(c => c.id === cartId);
    if (cart) {
      const newItems = cart.items
        .map(c => c.id === itemId ? { ...c, quantity: Math.max(0, c.quantity + delta) } : c)
        .filter(c => c.quantity > 0);
      if (newItems.length === 0) {
        await supabase.from("carts").delete().eq("id", cartId);
      } else {
        await supabase.from("carts").update({
          items: newItems as any,
          total_amount: newItems.reduce((s, c) => s + c.price * c.quantity, 0),
        }).eq("id", cartId);
      }
    }
  };

  const removeItem = (cartId: string, itemId: string) => updateQty(cartId, itemId, -999);

  const clearCartById = async (cartId: string) => {
    await supabase.from("carts").delete().eq("id", cartId);
    setCarts(prev => prev.filter(c => c.id !== cartId));
    toast({ title: "تم تفريغ السلة" });
  };

  const grandTotal = useMemo(() => {
    return carts.reduce((sum, cart) => {
      const subtotal = cart.items.reduce((s, c) => s + c.price * c.quantity, 0);
      const r = restaurants[cart.restaurant_id];
      const offer = restaurantOffers[cart.restaurant_id];
      const offerMin = offer?.min_order_amount ?? 0;
      const offerApplies = !!offer && subtotal >= offerMin;
      const isFreeDelivery = offerApplies && offer?.offer_type === "free_delivery";
      // For grand total preview in cart, only add fee if we know it's not free
      const fee = isFreeDelivery ? 0 : (r?.delivery_fee || 0);
      return sum + subtotal + fee;
    }, 0);
  }, [carts, restaurants, restaurantOffers]);

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
    </div>
  );

  if (carts.length === 0) return (
    <div className="container mx-auto px-4 py-20 text-center">
      <ShoppingCart className="w-20 h-20 mx-auto text-muted-foreground/20 mb-4" />
      <h2 className="text-xl font-bold mb-2">السلة فارغة</h2>
      <p className="text-muted-foreground mb-6">لم تقم بإضافة أي أصناف بعد</p>
      <Button onClick={() => navigate("/restaurants")} className="gap-2">
        <Store className="w-4 h-4" />
        تصفح المطاعم
      </Button>
    </div>
  );

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <div className="container mx-auto px-4 py-6 max-w-3xl pb-32">
        <BackButton />
        <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <ShoppingCart className="w-6 h-6" /> سلة الطلبات
        </h1>

        <div className="space-y-6">
          {carts.map(cart => {
            const r = restaurants[cart.restaurant_id];
            const subtotal = cart.items.reduce((s, c) => s + c.price * c.quantity, 0);
            const offer = restaurantOffers[cart.restaurant_id];
            const offerMin = offer?.min_order_amount ?? 0;
            const offerApplies = !!offer && subtotal >= offerMin;
            const isFreeDelivery = offerApplies && offer?.offer_type === "free_delivery";
            const isDistancePriced = !!(r?.price_per_km && Number(r.price_per_km) > 0);
            const staticFee: number = r?.delivery_fee || 0;

            // Determine what to show for delivery fee
            let deliveryFeeLabel: React.ReactNode;
            if (isFreeDelivery) {
              deliveryFeeLabel = (
                <span className="flex items-center gap-1">
                  <span className="line-through text-muted-foreground text-xs">رسوم</span>
                  <span className="text-green-600 font-bold">مجاني 🎉</span>
                </span>
              );
            } else if (offer && offerMin > subtotal) {
              const remaining = offerMin - subtotal;
              deliveryFeeLabel = (
                <span className="text-amber-600 text-xs">
                  أضف {remaining.toLocaleString()} ر.ي للتوصيل المجاني
                </span>
              );
            } else if (isDistancePriced) {
              deliveryFeeLabel = (
                <span className="text-muted-foreground text-xs">يُحسب عند التوصيل</span>
              );
            } else {
              deliveryFeeLabel = (
                <span>{staticFee === 0 ? "مجاني" : `${staticFee} ر.ي`}</span>
              );
            }

            const displayTotal = isFreeDelivery
              ? subtotal
              : isDistancePriced
                ? subtotal
                : subtotal + staticFee;

            return (
              <Card key={cart.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      {r?.logo_url && <img src={r.logo_url} alt="" className="w-8 h-8 rounded-lg object-cover" />}
                      {r?.name_ar || "مطعم"}
                    </CardTitle>
                    <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => clearCartById(cart.id)}>
                      <Trash2 className="w-4 h-4 ml-1" /> تفريغ
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {cart.items.map(item => (
                    <div key={item.id} className="flex items-center gap-3">
                      {item.image_url && (
                        <div className="w-14 h-14 rounded-lg overflow-hidden shrink-0 bg-muted">
                          <img src={item.image_url} alt="" className="w-full h-full object-cover" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{item.name_ar}</p>
                        {item.selectedOptions && Object.values(item.selectedOptions).length > 0 && (
                          <p className="text-xs text-muted-foreground truncate">
                            {Object.values(item.selectedOptions).map((opt: any) => {
                              if (Array.isArray(opt)) return opt.map(o => o.name_ar).join(", ");
                              return opt?.name_ar;
                            }).filter(Boolean).join(" · ")}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">{item.price} ر.ي</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => updateQty(cart.id, item.id, -1)}>
                          <Minus className="w-3 h-3" />
                        </Button>
                        <span className="text-sm font-medium w-6 text-center">{item.quantity}</span>
                        <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => updateQty(cart.id, item.id, 1)}>
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>
                      <p className="font-bold text-sm w-16 text-left">{item.price * item.quantity} ر.ي</p>
                    </div>
                  ))}
                  <Separator />

                  {/* Active offer banner in cart */}
                  {offer && offerApplies && (
                    <div className="bg-green-50 dark:bg-green-950/20 border border-green-300 rounded-lg px-3 py-2 flex items-center gap-2 text-sm text-green-800 dark:text-green-300">
                      <span className="text-base">🎉</span>
                      <span className="font-semibold">{offer.title}</span>
                    </div>
                  )}
                  {offer && !offerApplies && offerMin > 0 && (
                    <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 rounded-lg px-3 py-2 flex items-center gap-2 text-sm text-amber-700 dark:text-amber-300">
                      <span className="text-base">🎁</span>
                      <div>
                        <span className="font-semibold">{offer.title}</span>
                        <p className="text-xs mt-0.5">أضف <strong>{(offerMin - subtotal).toLocaleString()} ر.ي</strong> للحصول على هذا العرض</p>
                      </div>
                    </div>
                  )}

                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between"><span>المجموع الفرعي</span><span>{subtotal.toLocaleString()} ر.ي</span></div>
                    <div className="flex justify-between items-center">
                      <span>رسوم التوصيل</span>
                      {deliveryFeeLabel}
                    </div>
                    <Separator />
                    <div className="flex justify-between font-bold">
                      <span>الإجمالي</span>
                      <span className="text-primary">
                        {isDistancePriced && !isFreeDelivery
                          ? <span>{subtotal.toLocaleString()} ر.ي <span className="text-xs font-normal text-muted-foreground">+ رسوم التوصيل</span></span>
                          : `${displayTotal.toLocaleString()} ر.ي`}
                      </span>
                    </div>
                  </div>
                  {r?.min_order_amount > 0 && subtotal < r.min_order_amount && (
                    <p className="text-xs text-destructive">الحد الأدنى للطلب {r.min_order_amount} ر.ي</p>
                  )}
                  <Button className="w-full gap-2" onClick={() => navigate(`/restaurants/${cart.restaurant_id}/checkout`)}
                    disabled={r?.min_order_amount > 0 && subtotal < r.min_order_amount}>
                    متابعة الطلب <ArrowRight className="w-4 h-4 rotate-180" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default CartPage;
