import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { ShoppingCart, Phone, CreditCard, Minus, Plus, ArrowRight, AlertTriangle } from "lucide-react";
import BackButton from "@/components/common/BackButton";
import AddressSelector, { SelectedAddress } from "@/components/addresses/AddressSelector";
import { getRestaurantById, getCart, createOrderFromCart } from "@/lib/restaurantApi";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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
  const [form, setForm] = useState({
    phone: "",
    notes: "",
  });

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
      } catch (err: any) {
        toast({ title: "خطأ", description: err.message, variant: "destructive" });
      } finally { setLoading(false); }
    };
    load();
  }, [user, restaurantId]);

  const updateQty = (itemId: string, delta: number) => {
    setCart(prev => prev.map(c => c.id === itemId ? { ...c, quantity: Math.max(0, c.quantity + delta) } : c).filter(c => c.quantity > 0));
  };

  const subtotal = useMemo(() => cart.reduce((s, c) => s + c.price * c.quantity, 0), [cart]);
  const deliveryFee = restaurant?.delivery_fee || 0;
  const tax = 0;
  const total = subtotal + deliveryFee + tax;

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
        subtotal, delivery_fee: deliveryFee, tax, total,
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
              <div className="space-y-1 text-sm">
                <div className="flex justify-between"><span>المجموع الفرعي</span><span>{subtotal} ر.ي</span></div>
                <div className="flex justify-between"><span>رسوم التوصيل</span><span>{deliveryFee} ر.ي</span></div>
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

          <Button className="w-full h-12 text-lg gap-2" onClick={handleSubmit} disabled={submitting || !selectedAddress}>
            {submitting ? <div className="animate-spin w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full" /> :
              <>تأكيد الطلب - {total} ر.ي</>}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default RestaurantCheckoutPage;
