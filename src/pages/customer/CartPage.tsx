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

        // Load restaurant names
        const rIds = [...new Set(validCarts.map((c: any) => c.restaurant_id).filter(Boolean))];
        if (rIds.length > 0) {
          const { data: rData } = await supabase
            .from("restaurants")
            .select("id, name_ar, delivery_fee, min_order_amount, logo_url")
            .in("id", rIds);
          if (rData) {
            const map: Record<string, any> = {};
            rData.forEach((r: any) => { map[r.id] = r; });
            setRestaurants(map);
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
      const fee = restaurants[cart.restaurant_id]?.delivery_fee || 0;
      return sum + subtotal + fee;
    }, 0);
  }, [carts, restaurants]);

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
            const fee = r?.delivery_fee || 0;

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
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between"><span>المجموع الفرعي</span><span>{subtotal} ر.ي</span></div>
                    <div className="flex justify-between">
                      <span>رسوم التوصيل</span>
                      <span>{fee === 0 ? "مجاني" : `${fee} ر.ي`}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-bold">
                      <span>الإجمالي</span>
                      <span className="text-primary">{subtotal + fee} ر.ي</span>
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
        </div>
      </div>
    </div>
  );
};

export default CartPage;
