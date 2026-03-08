import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Star, Clock, Truck, MapPin, Plus, Minus, ShoppingCart, ArrowRight, Flame, Search } from "lucide-react";
import { getRestaurantById, getRestaurantMenu, getMenuItemOptions, upsertCart, getCart } from "@/lib/restaurantApi";
import { useToast } from "@/hooks/use-toast";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import BackButton from "@/components/common/BackButton";
import Header from "@/components/landing/Header";

interface CartItem {
  id: string;
  name_ar: string;
  price: number;
  quantity: number;
  image_url?: string;
  notes?: string;
  selectedOptions?: Record<string, any>;
}

interface OptionChoice {
  name_ar: string;
  name_en?: string;
  price: number;
}

const RestaurantMenuPage = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [restaurant, setRestaurant] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showItemDetail, setShowItemDetail] = useState<any>(null);
  const [itemQty, setItemQty] = useState(1);
  const [search, setSearch] = useState("");
  const [itemOptions, setItemOptions] = useState<any[]>([]);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, any>>({});
  useEffect(() => {
    const load = async () => {
      if (!id) return;
      try {
        const [r, menu] = await Promise.all([getRestaurantById(id), getRestaurantMenu(id)]);
        setRestaurant(r);
        setCategories(menu.categories);
        setItems(menu.items);
        if (menu.categories.length > 0) setSelectedCat(menu.categories[0].id);
        // Load existing cart
        if (user) {
          const existingCart = await getCart(user.id, id);
          if (existingCart && existingCart.items) setCart(existingCart.items as any as CartItem[]);
        }
      } catch (err: any) {
        toast({ title: "خطأ", description: err.message, variant: "destructive" });
      } finally { setLoading(false); }
    };
    load();
  }, [id, user]);

  const addToCart = (item: any, qty: number = 1) => {
    const optionsExtra = Object.values(selectedOptions).reduce((sum: number, val: any) => {
      if (Array.isArray(val)) return sum + val.reduce((s: number, c: OptionChoice) => s + (c.price || 0), 0);
      return sum + (val?.price || 0);
    }, 0);
    const price = (item.discounted_price || item.price) + optionsExtra;
    setCart(prev => {
      const existing = prev.find(c => c.id === item.id);
      if (existing) {
        return prev.map(c => c.id === item.id ? { ...c, quantity: c.quantity + qty, price, selectedOptions } : c);
      }
      return [...prev, { id: item.id, name_ar: item.name_ar, price, quantity: qty, image_url: item.image_url, selectedOptions }];
    });
    toast({ title: "تمت الإضافة", description: `${item.name_ar} أُضيف إلى السلة` });
    setShowItemDetail(null);
    setItemQty(1);
    setSelectedOptions({});
    setItemOptions([]);
  };

  const openItemDetail = async (item: any) => {
    setShowItemDetail(item);
    setItemQty(1);
    setSelectedOptions({});
    try {
      const opts = await getMenuItemOptions(item.id);
      setItemOptions(opts || []);
    } catch { setItemOptions([]); }
  };

  const updateCartQty = (itemId: string, delta: number) => {
    setCart(prev => prev.map(c => c.id === itemId ? { ...c, quantity: Math.max(0, c.quantity + delta) } : c).filter(c => c.quantity > 0));
  };

  const cartTotal = useMemo(() => cart.reduce((s, c) => s + c.price * c.quantity, 0), [cart]);
  const cartCount = useMemo(() => cart.reduce((s, c) => s + c.quantity, 0), [cart]);

  const handleCheckout = async () => {
    if (!user) { navigate("/login"); return; }
    if (!id || cart.length === 0) return;
    try {
      await upsertCart({ customer_id: user.id, restaurant_id: id, items: cart, total_amount: cartTotal });
      navigate(`/restaurants/${id}/checkout`);
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    }
  };

  const displayItems = useMemo(() => {
    let filtered = items;
    if (search) {
      filtered = items.filter(i => i.name_ar?.includes(search) || i.description?.includes(search));
    } else if (selectedCat) {
      filtered = items.filter(i => i.category_id === selectedCat);
    }
    return filtered;
  }, [items, selectedCat, search]);

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
  if (!restaurant) return <div className="text-center py-20 text-muted-foreground">المطعم غير موجود</div>;

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <Header />
      {/* Restaurant Header */}
      <div className="relative">
        <div className="h-48 md:h-64 bg-gradient-to-br from-primary/20 to-primary/5 overflow-hidden">
          {restaurant.cover_image && <img src={restaurant.cover_image} alt="" className="w-full h-full object-cover" />}
        </div>
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="relative -mt-12 flex items-end gap-4 mb-4">
            <div className="w-20 h-20 rounded-xl bg-background shadow-lg border-4 border-background overflow-hidden shrink-0">
              {restaurant.logo_url ? <img src={restaurant.logo_url} alt="" className="w-full h-full object-cover" /> :
                <div className="w-full h-full bg-primary/10 flex items-center justify-center text-2xl">🍽️</div>}
            </div>
            <div className="pb-1">
              <h1 className="text-2xl font-bold">{restaurant.name_ar}</h1>
              {restaurant.description && <p className="text-sm text-muted-foreground">{restaurant.description}</p>}
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-6 flex-wrap">
            <span className="flex items-center gap-1"><Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />{restaurant.rating || '0'} ({restaurant.total_ratings || 0})</span>
            {restaurant.estimated_delivery_time && <span className="flex items-center gap-1"><Clock className="w-4 h-4" />{restaurant.estimated_delivery_time} دقيقة</span>}
            <span className="flex items-center gap-1"><Truck className="w-4 h-4" />توصيل: {restaurant.delivery_fee || 0} ر.ي</span>
            {restaurant.min_order_amount > 0 && <span>الحد الأدنى: {restaurant.min_order_amount} ر.ي</span>}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 max-w-6xl pb-32">
        {/* Search */}
        <div className="relative max-w-sm mb-4">
          <Search className="absolute right-3 top-2.5 w-4 h-4 text-muted-foreground" />
          <Input placeholder="ابحث في المنيو..." value={search} onChange={e => { setSearch(e.target.value); if (e.target.value) setSelectedCat(null); }} className="pr-9" />
        </div>

        <div className="flex gap-6">
          {/* Category sidebar */}
          {!search && categories.length > 0 && (
            <div className="hidden md:block w-48 shrink-0 space-y-1 sticky top-4 self-start">
              {categories.map(c => (
                <button key={c.id}
                  className={`w-full text-right px-3 py-2 rounded-lg text-sm transition-colors ${selectedCat === c.id ? 'bg-primary text-primary-foreground font-medium' : 'hover:bg-muted'}`}
                  onClick={() => setSelectedCat(c.id)}>
                  {c.name_ar}
                </button>
              ))}
            </div>
          )}

          {/* Mobile category tabs */}
          {!search && categories.length > 0 && (
            <div className="md:hidden flex gap-2 overflow-x-auto pb-3 mb-4 w-full scrollbar-hide absolute left-0 px-4" style={{ position: 'relative' }}>
              {categories.map(c => (
                <Button key={c.id} size="sm" variant={selectedCat === c.id ? "default" : "outline"} className="shrink-0"
                  onClick={() => setSelectedCat(c.id)}>{c.name_ar}</Button>
              ))}
            </div>
          )}

          {/* Items Grid */}
          <div className="flex-1">
            {displayItems.length === 0 ? (
              <Card><CardContent className="py-12 text-center text-muted-foreground">لا توجد أصناف</CardContent></Card>
            ) : (
              <div className="space-y-3">
                {displayItems.map(item => {
                  const cartItem = cart.find(c => c.id === item.id);
                  const price = item.discounted_price || item.price;
                  return (
                    <Card key={item.id} className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => openItemDetail(item)}>
                      <CardContent className="p-0 flex">
                        <div className="flex-1 p-4 space-y-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold">{item.name_ar}</h3>
                            {item.is_popular && <Badge variant="secondary" className="text-xs"><Flame className="w-3 h-3 ml-0.5" />شائع</Badge>}
                          </div>
                          {item.description && <p className="text-sm text-muted-foreground line-clamp-2">{item.description}</p>}
                          <div className="flex items-center gap-2 pt-1">
                            {item.discounted_price ? (
                              <>
                                <span className="font-bold text-primary">{item.discounted_price} ر.ي</span>
                                <span className="text-xs text-muted-foreground line-through">{item.price} ر.ي</span>
                              </>
                            ) : (
                              <span className="font-bold text-primary">{item.price} ر.ي</span>
                            )}
                          </div>
                          {cartItem && (
                            <div className="flex items-center gap-2 pt-1" onClick={e => e.stopPropagation()}>
                              <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => updateCartQty(item.id, -1)}><Minus className="w-3 h-3" /></Button>
                              <span className="text-sm font-medium w-6 text-center">{cartItem.quantity}</span>
                              <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => updateCartQty(item.id, 1)}><Plus className="w-3 h-3" /></Button>
                            </div>
                          )}
                        </div>
                        <div className="w-28 h-28 shrink-0 bg-muted relative">
                          {item.image_url ? <img src={item.image_url} alt={item.name_ar} className="w-full h-full object-cover" /> :
                            <div className="w-full h-full flex items-center justify-center text-3xl">🍽️</div>}
                          {!cartItem && (
                            <button className="absolute bottom-1 left-1 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md"
                              onClick={(e) => { e.stopPropagation(); addToCart(item); }}>
                              <Plus className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Floating Cart Bar */}
      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-primary text-primary-foreground p-4 shadow-2xl z-50">
          <div className="container mx-auto max-w-6xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-primary-foreground/20 rounded-full px-3 py-1">
                <ShoppingCart className="w-5 h-5 inline ml-1" />{cartCount}
              </div>
              <span className="font-bold text-lg">{cartTotal} ر.ي</span>
            </div>
            <Button variant="secondary" onClick={handleCheckout} className="gap-2">
              متابعة الطلب <ArrowRight className="w-4 h-4 rotate-180" />
            </Button>
          </div>
        </div>
      )}

      {/* Item Detail Dialog */}
      <Dialog open={!!showItemDetail} onOpenChange={() => setShowItemDetail(null)}>
        <DialogContent dir="rtl" className="max-w-lg">
          {showItemDetail && (
            <>
              {showItemDetail.image_url && (
                <div className="h-48 -mx-6 -mt-6 mb-4 overflow-hidden rounded-t-lg">
                  <img src={showItemDetail.image_url} alt={showItemDetail.name_ar} className="w-full h-full object-cover" />
                </div>
              )}
              <DialogHeader>
                <DialogTitle className="text-xl">{showItemDetail.name_ar}</DialogTitle>
              </DialogHeader>
              {showItemDetail.description && <p className="text-muted-foreground">{showItemDetail.description}</p>}
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                {showItemDetail.preparation_time && <span className="flex items-center gap-1"><Clock className="w-4 h-4" />{showItemDetail.preparation_time} دقيقة</span>}
                {showItemDetail.calories && <span>{showItemDetail.calories} سعرة حرارية</span>}
              </div>
              <div className="flex items-center gap-2">
                {showItemDetail.discounted_price ? (
                  <>
                    <span className="text-2xl font-bold text-primary">{showItemDetail.discounted_price} ر.ي</span>
                    <span className="text-muted-foreground line-through">{showItemDetail.price} ر.ي</span>
                  </>
                ) : (
                  <span className="text-2xl font-bold text-primary">{showItemDetail.price} ر.ي</span>
                )}
              </div>
              <div className="flex items-center justify-center gap-4 py-2">
                <Button size="icon" variant="outline" onClick={() => setItemQty(Math.max(1, itemQty - 1))}><Minus className="w-4 h-4" /></Button>
                <span className="text-xl font-bold w-10 text-center">{itemQty}</span>
                <Button size="icon" variant="outline" onClick={() => setItemQty(itemQty + 1)}><Plus className="w-4 h-4" /></Button>
              </div>
              <DialogFooter>
                <Button className="w-full gap-2" size="lg" onClick={() => addToCart(showItemDetail, itemQty)}>
                  <ShoppingCart className="w-5 h-5" />
                  إضافة إلى السلة - {(showItemDetail.discounted_price || showItemDetail.price) * itemQty} ر.ي
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RestaurantMenuPage;
