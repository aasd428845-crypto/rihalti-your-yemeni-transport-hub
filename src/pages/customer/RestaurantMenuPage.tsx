import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Star, Clock, Truck, Plus, Minus, ShoppingCart, ArrowLeft, Flame, Search, ChevronLeft } from "lucide-react";
import { getRestaurantById, getRestaurantMenu, getMenuItemOptions, upsertCart, getCart } from "@/lib/restaurantApi";
import { useToast } from "@/hooks/use-toast";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface CartItem {
  id: string;
  name_ar: string;
  price: number;
  quantity: number;
  image_url?: string;
  selectedOptions?: Record<string, any>;
}

interface OptionChoice {
  name_ar: string;
  name_en?: string;
  price: number;
}

// ── Compute open/closed status from opening_hours JSONB ──
const DAY_KEYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const formatTime12 = (t: string) => {
  if (!t) return "";
  const [hStr, m] = t.split(":");
  const h = parseInt(hStr, 10);
  if (isNaN(h)) return t;
  const period = h >= 12 ? "م" : "ص";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${m || "00"} ${period}`;
};
const getOpenStatus = (hours: any): { isOpen: boolean; subtext: string } => {
  if (!hours || typeof hours !== "object") return { isOpen: true, subtext: "" };
  const now = new Date();
  const todayKey = DAY_KEYS[now.getDay()];
  const today = hours[todayKey];
  if (!today || today.open === false) {
    // Find next open day
    for (let i = 1; i <= 7; i++) {
      const next = hours[DAY_KEYS[(now.getDay() + i) % 7]];
      if (next && next.open !== false && next.from) {
        const dayLabels: Record<string, string> = {
          sunday: "الأحد", monday: "الاثنين", tuesday: "الثلاثاء", wednesday: "الأربعاء",
          thursday: "الخميس", friday: "الجمعة", saturday: "السبت",
        };
        const dayName = dayLabels[DAY_KEYS[(now.getDay() + i) % 7]];
        return { isOpen: false, subtext: `يفتح ${i === 1 ? "غداً" : dayName} ${formatTime12(next.from)}` };
      }
    }
    return { isOpen: false, subtext: "" };
  }
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const [fH, fM] = (today.from || "00:00").split(":").map(Number);
  const [tH, tM] = (today.to || "23:59").split(":").map(Number);
  const fromMin = fH * 60 + (fM || 0);
  const toMin = tH * 60 + (tM || 0);
  if (nowMin >= fromMin && nowMin < toMin) {
    return { isOpen: true, subtext: `مفتوح حتى ${formatTime12(today.to)}` };
  }
  if (nowMin < fromMin) {
    return { isOpen: false, subtext: `يفتح اليوم ${formatTime12(today.from)}` };
  }
  return { isOpen: false, subtext: "مغلق الآن" };
};

// Category icon emojis fallback map
const CATEGORY_EMOJI: Record<string, string> = {
  برجر: "🍔", بيتزا: "🍕", شاورما: "🌯", مشاوي: "🍖", مشروبات: "🥤", حلويات: "🧁",
  سلطات: "🥗", دجاج: "🍗", أسماك: "🐟", باستا: "🍝", وجبات: "🍽️", فطور: "🍳",
  سندويشات: "🥪", مقبلات: "🫕", main: "🍽️",
};
const getCategoryEmoji = (name: string) => {
  for (const [k, v] of Object.entries(CATEGORY_EMOJI)) {
    if (name?.includes(k)) return v;
  }
  return "🍽️";
};

const RestaurantMenuPage = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [restaurant, setRestaurant] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showItemDetail, setShowItemDetail] = useState<any>(null);
  const [itemQty, setItemQty] = useState(1);
  const [search, setSearch] = useState("");
  const [itemOptions, setItemOptions] = useState<any[]>([]);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, any>>({});

  // Refs for section scroll
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const chipScrollRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      try {
        const [r, menu] = await Promise.all([getRestaurantById(id), getRestaurantMenu(id)]);
        setRestaurant(r);
        setCategories(menu.categories);
        setItems(menu.items);
        if (menu.categories.length > 0) setActiveCat(menu.categories[0].id);
        if (user) {
          const existingCart = await getCart(user.id, id);
          if (existingCart?.items) setCart(existingCart.items as unknown as CartItem[]);
        }
      } catch (err: any) {
        toast({ title: "خطأ", description: err.message, variant: "destructive" });
      } finally { setLoading(false); }
    };
    load();
  }, [id, user]);

  // IntersectionObserver: update active chip as user scrolls through sections
  useEffect(() => {
    if (categories.length === 0) return;
    observerRef.current?.disconnect();
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const catId = entry.target.getAttribute("data-cat-id");
            if (catId) setActiveCat(catId);
          }
        });
      },
      { rootMargin: "-40% 0px -55% 0px", threshold: 0 }
    );
    Object.values(sectionRefs.current).forEach(el => { if (el) observerRef.current?.observe(el); });
    return () => observerRef.current?.disconnect();
  }, [categories, items]);

  const scrollToCategory = useCallback((catId: string) => {
    setActiveCat(catId);
    const el = sectionRefs.current[catId];
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    // Scroll chip into view in the chip bar
    const chip = chipScrollRef.current?.querySelector(`[data-chip="${catId}"]`) as HTMLElement;
    if (chip && chipScrollRef.current) {
      const bar = chipScrollRef.current;
      bar.scrollTo({ left: chip.offsetLeft - bar.clientWidth / 2 + chip.offsetWidth / 2, behavior: "smooth" });
    }
  }, []);

  const addToCart = (item: any, qty: number = 1) => {
    const optionsExtra = Object.values(selectedOptions).reduce((sum: number, val: any) => {
      if (Array.isArray(val)) return sum + val.reduce((s: number, c: OptionChoice) => s + (c.price || 0), 0);
      return sum + (val?.price || 0);
    }, 0);
    const price = (item.discounted_price || item.price) + optionsExtra;
    setCart(prev => {
      const existing = prev.find(c => c.id === item.id);
      if (existing) return prev.map(c => c.id === item.id ? { ...c, quantity: c.quantity + qty, price, selectedOptions } : c);
      return [...prev, { id: item.id, name_ar: item.name_ar, price, quantity: qty, image_url: item.image_url, selectedOptions }];
    });
    toast({ title: "✅ تمت الإضافة", description: `${item.name_ar} أُضيف إلى السلة` });
    setShowItemDetail(null); setItemQty(1); setSelectedOptions({}); setItemOptions([]);
  };

  const openItemDetail = async (item: any) => {
    setShowItemDetail(item); setItemQty(1); setSelectedOptions({});
    try { const opts = await getMenuItemOptions(item.id); setItemOptions(opts || []); }
    catch { setItemOptions([]); }
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
      navigate(`/cart`);
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    }
  };

  // Group items by category
  const itemsByCategory = useMemo(() => {
    const map: Record<string, any[]> = {};
    if (search) {
      const q = search.toLowerCase();
      const filtered = items.filter(i => i.name_ar?.toLowerCase().includes(q) || i.description?.toLowerCase().includes(q));
      map["__search__"] = filtered;
    } else {
      categories.forEach(c => { map[c.id] = items.filter(i => i.category_id === c.id); });
      // Items with no category
      const uncategorized = items.filter(i => !i.category_id || !categories.find(c => c.id === i.category_id));
      if (uncategorized.length > 0) map["__other__"] = uncategorized;
    }
    return map;
  }, [items, categories, search]);

  if (loading) return (
    <div className="flex justify-center items-center min-h-screen">
      <div className="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full" />
    </div>
  );
  if (!restaurant) return <div className="text-center py-20 text-muted-foreground">المطعم غير موجود</div>;

  return (
    <div className="min-h-screen bg-muted/30" dir="rtl">

      {/* ── Restaurant Header ── */}
      <div className="relative bg-background shadow-sm">
        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white"
        >
          <ChevronLeft className="w-5 h-5 rotate-180" />
        </button>

        {/* Cover */}
        <div className="h-44 md:h-56 overflow-hidden bg-gradient-to-br from-primary/20 to-muted">
          {restaurant.cover_image_url || restaurant.cover_image
            ? <img src={restaurant.cover_image_url || restaurant.cover_image} alt="" loading="lazy" className="w-full h-full object-cover" />
            : <div className="w-full h-full flex items-center justify-center text-6xl opacity-30">🍽️</div>}
        </div>

        {/* Logo + Info */}
        <div className="px-4 pb-4">
          <div className="flex items-end gap-3 -mt-10 mb-3">
            <div className="w-20 h-20 rounded-2xl bg-background shadow-lg border-4 border-background overflow-hidden shrink-0">
              {restaurant.logo_url
                ? <img src={restaurant.logo_url} alt="" className="w-full h-full object-cover" />
                : <div className="w-full h-full bg-primary/10 flex items-center justify-center text-3xl">🍽️</div>}
            </div>
            <div className="pb-1 flex-1 min-w-0">
              <h1 className="text-xl font-bold truncate">{restaurant.name_ar}</h1>
              {restaurant.description && <p className="text-xs text-muted-foreground line-clamp-1">{restaurant.description}</p>}
            </div>
          </div>

          {/* Open/Closed status */}
          {(() => {
            const status = getOpenStatus(restaurant.opening_hours);
            return (
              <div className="flex items-center gap-2 mb-2">
                <span className={`inline-flex items-center gap-1.5 text-sm font-bold ${status.isOpen ? 'text-green-600' : 'text-red-600'}`}>
                  <span className={`w-2 h-2 rounded-full ${status.isOpen ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                  {status.isOpen ? 'مفتوح' : 'مغلق'}
                </span>
                {status.subtext && (
                  <span className="text-xs text-muted-foreground">· {status.subtext}</span>
                )}
              </div>
            );
          })()}

          {/* Stats row */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1 font-medium">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              {restaurant.rating || '0'} ({restaurant.total_ratings || 0})
            </span>
            {restaurant.estimated_delivery_time && (
              <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{restaurant.estimated_delivery_time} د</span>
            )}
            <span className="flex items-center gap-1">
              <Truck className="w-3.5 h-3.5" />توصيل: {restaurant.delivery_fee || 0} ر.ي
            </span>
            {Number(restaurant.min_order_amount) > 0 && (
              <span>الحد الأدنى: {restaurant.min_order_amount} ر.ي</span>
            )}
          </div>
        </div>

        {/* Search bar */}
        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute right-3 top-2.5 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="ابحث في المنيو..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pr-9 bg-muted/50 border-0 rounded-xl h-9 text-sm"
            />
          </div>
        </div>

        {/* ── Category Chips (horizontal pill bar) ── */}
        {!search && categories.length > 0 && (
          <div
            ref={chipScrollRef}
            className="flex gap-2 overflow-x-auto scrollbar-hide px-4 pb-3 border-t border-border/50 pt-3"
          >
            {categories.map(cat => {
              const emoji = cat.image_url ? null : getCategoryEmoji(cat.name_ar || "");
              const isActive = activeCat === cat.id;
              return (
                <button
                  key={cat.id}
                  data-chip={cat.id}
                  onClick={() => scrollToCategory(cat.id)}
                  className={`shrink-0 inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full text-xs font-semibold transition-all border ${
                    isActive
                      ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                      : 'bg-background text-foreground border-border hover:border-primary/50'
                  }`}
                >
                  {cat.image_url ? (
                    <img src={cat.image_url} alt="" className="w-5 h-5 rounded-full object-cover" />
                  ) : (
                    <span className="text-sm leading-none">{emoji}</span>
                  )}
                  <span>{cat.name_ar}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Menu Sections ── */}
      <div className="pb-32">
        {search ? (
          /* Search results */
          <div className="px-4 pt-4">
            {(itemsByCategory["__search__"] || []).length === 0 ? (
              <p className="text-center py-10 text-muted-foreground">لا توجد نتائج</p>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {(itemsByCategory["__search__"] || []).map(item => (
                  <MenuItemCard key={item.id} item={item} cartItem={cart.find(c => c.id === item.id)}
                    onOpen={() => openItemDetail(item)} onAdd={() => addToCart(item)}
                    onUpdateQty={updateCartQty} />
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Grouped sections */
          <>
            {categories.map(cat => {
              const catItems = itemsByCategory[cat.id] || [];
              if (catItems.length === 0) return null;
              return (
                <div
                  key={cat.id}
                  data-cat-id={cat.id}
                  ref={el => { sectionRefs.current[cat.id] = el; }}
                  className="pt-4"
                >
                  {/* Section header */}
                  <div className="flex items-center gap-2 px-4 mb-3">
                    <span className="text-xl">{getCategoryEmoji(cat.name_ar || "")}</span>
                    <h2 className="text-base font-bold">{cat.name_ar}</h2>
                    <span className="text-xs text-muted-foreground">({catItems.length})</span>
                  </div>
                  {/* Items */}
                  <div className="px-4">
                    <div className="grid grid-cols-2 gap-3">
                      {catItems.map(item => (
                        <MenuItemCard key={item.id} item={item} cartItem={cart.find(c => c.id === item.id)}
                          onOpen={() => openItemDetail(item)} onAdd={() => addToCart(item)}
                          onUpdateQty={updateCartQty} />
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Uncategorized items */}
            {(itemsByCategory["__other__"] || []).length > 0 && (
              <div className="pt-4">
                <div className="flex items-center gap-2 px-4 mb-3">
                  <span className="text-xl">🍽️</span>
                  <h2 className="text-base font-bold">أصناف أخرى</h2>
                </div>
                <div className="px-4">
                  <div className="grid grid-cols-2 gap-3">
                    {(itemsByCategory["__other__"] || []).map(item => (
                      <MenuItemCard key={item.id} item={item} cartItem={cart.find(c => c.id === item.id)}
                        onOpen={() => openItemDetail(item)} onAdd={() => addToCart(item)}
                        onUpdateQty={updateCartQty} />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {items.length === 0 && (
              <div className="text-center py-20 text-muted-foreground">
                <p className="text-4xl mb-3">🍽️</p>
                <p>لا توجد أصناف في المنيو حتى الآن</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Floating Cart Bar ── */}
      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-4 pt-2 bg-gradient-to-t from-background/95 to-transparent backdrop-blur-sm">
          <button
            onClick={handleCheckout}
            className="w-full bg-primary text-primary-foreground rounded-2xl h-14 flex items-center justify-between px-5 shadow-xl hover:bg-primary/90 active:scale-[0.98] transition-all"
          >
            <div className="bg-primary-foreground/20 rounded-full px-3 py-1 flex items-center gap-1.5">
              <ShoppingCart className="w-4 h-4" />
              <span className="font-bold text-sm">{cartCount}</span>
            </div>
            <span className="font-bold text-base">متابعة الطلب</span>
            <span className="font-bold text-base">{cartTotal.toLocaleString()} ر.ي</span>
          </button>
        </div>
      )}

      {/* ── Item Detail Modal ── */}
      <Dialog open={!!showItemDetail} onOpenChange={() => { setShowItemDetail(null); setItemOptions([]); setSelectedOptions({}); }}>
        <DialogContent dir="rtl" className="max-w-lg max-h-[90vh] overflow-y-auto p-0">
          {showItemDetail && (
            <>
              {/* Food image */}
              <div className="h-56 overflow-hidden rounded-t-lg bg-muted">
                {showItemDetail.image_url
                  ? <img src={showItemDetail.image_url} alt={showItemDetail.name_ar} loading="lazy" className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center text-6xl">🍽️</div>}
              </div>

              <div className="p-5 space-y-4">
                <DialogHeader>
                  <DialogTitle className="text-xl text-right">{showItemDetail.name_ar}</DialogTitle>
                </DialogHeader>

                {showItemDetail.description && (
                  <p className="text-sm text-muted-foreground">{showItemDetail.description}</p>
                )}

                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  {showItemDetail.preparation_time && <span className="flex items-center gap-1"><Clock className="w-4 h-4" />{showItemDetail.preparation_time} دقيقة</span>}
                  {showItemDetail.calories && <span>{showItemDetail.calories} سعرة</span>}
                </div>

                {/* Price */}
                <div className="flex items-center gap-2">
                  {showItemDetail.discounted_price ? (
                    <>
                      <span className="text-2xl font-bold text-primary">{showItemDetail.discounted_price} ر.ي</span>
                      <span className="text-muted-foreground line-through text-sm">{showItemDetail.price} ر.ي</span>
                    </>
                  ) : (
                    <span className="text-2xl font-bold text-primary">{showItemDetail.price} ر.ي</span>
                  )}
                </div>

                {/* Options */}
                {itemOptions.length > 0 && (
                  <div className="space-y-4 border-t pt-4">
                    {itemOptions.map((opt: any) => {
                      const choices = (opt.choices as OptionChoice[]) || [];
                      return (
                        <div key={opt.id} className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Label className="font-bold">{opt.name_ar}</Label>
                            {opt.is_required && <Badge variant="destructive" className="text-xs">مطلوب</Badge>}
                          </div>
                          {opt.option_type === "single" ? (
                            <RadioGroup value={selectedOptions[opt.id]?.name_ar || ""}
                              onValueChange={v => { const c = choices.find(c => c.name_ar === v); setSelectedOptions(prev => ({ ...prev, [opt.id]: c })); }}>
                              {choices.map((choice, i) => (
                                <div key={i} className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <RadioGroupItem value={choice.name_ar} id={`${opt.id}-${i}`} />
                                    <Label htmlFor={`${opt.id}-${i}`}>{choice.name_ar}</Label>
                                  </div>
                                  {choice.price > 0 && <span className="text-sm text-muted-foreground">+{choice.price} ر.ي</span>}
                                </div>
                              ))}
                            </RadioGroup>
                          ) : (
                            <div className="space-y-2">
                              {choices.map((choice, i) => {
                                const selected = (selectedOptions[opt.id] as OptionChoice[] || []);
                                const isChecked = selected.some(s => s.name_ar === choice.name_ar);
                                return (
                                  <div key={i} className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <Checkbox id={`${opt.id}-${i}`} checked={isChecked}
                                        onCheckedChange={checked => {
                                          setSelectedOptions(prev => {
                                            const cur = (prev[opt.id] as OptionChoice[] || []);
                                            return { ...prev, [opt.id]: checked ? [...cur, choice] : cur.filter(s => s.name_ar !== choice.name_ar) };
                                          });
                                        }} />
                                      <Label htmlFor={`${opt.id}-${i}`}>{choice.name_ar}</Label>
                                    </div>
                                    {choice.price > 0 && <span className="text-sm text-muted-foreground">+{choice.price} ر.ي</span>}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Qty */}
                <div className="flex items-center justify-center gap-5 py-2">
                  <button className="w-9 h-9 rounded-full border-2 border-border flex items-center justify-center hover:bg-muted"
                    onClick={() => setItemQty(Math.max(1, itemQty - 1))}>
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="text-2xl font-bold w-10 text-center">{itemQty}</span>
                  <button className="w-9 h-9 rounded-full border-2 border-primary bg-primary/10 flex items-center justify-center hover:bg-primary/20"
                    onClick={() => setItemQty(itemQty + 1)}>
                    <Plus className="w-4 h-4 text-primary" />
                  </button>
                </div>

                <DialogFooter>
                  <Button className="w-full h-12 rounded-xl gap-2 text-base" onClick={() => addToCart(showItemDetail, itemQty)}>
                    <ShoppingCart className="w-5 h-5" />
                    إضافة إلى السلة — {((showItemDetail.discounted_price || showItemDetail.price) * itemQty).toLocaleString()} ر.ي
                  </Button>
                </DialogFooter>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ── Menu Item Card Component ──
const MenuItemCard = ({
  item, cartItem, onOpen, onAdd, onUpdateQty,
}: {
  item: any; cartItem?: CartItem; onOpen: () => void; onAdd: () => void;
  onUpdateQty: (id: string, delta: number) => void;
}) => {
  const hasDiscount = !!item.discounted_price && Number(item.discounted_price) < Number(item.price);
  const price = hasDiscount ? item.discounted_price : item.price;
  const discountPct = hasDiscount
    ? Math.round((1 - Number(item.discounted_price) / Number(item.price)) * 100)
    : 0;
  return (
    <div
      className="flex flex-col bg-background rounded-xl overflow-hidden shadow-sm border border-border/60 hover:shadow-md transition-all active:scale-[0.99] cursor-pointer"
      onClick={onOpen}
    >
      {/* Image (top) */}
      <div className="relative w-full h-48 bg-muted overflow-hidden">
        {item.image_url
          ? <img src={item.image_url} alt={item.name_ar} loading="lazy" className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center text-5xl">🍽️</div>}
        {item.is_popular && (
          <div className="absolute top-2 right-2">
            <Badge className="text-[10px] px-1.5 py-0 bg-amber-500 text-white border-0 gap-0.5 h-5 shadow">
              <Flame className="w-2.5 h-2.5" />شائع
            </Badge>
          </div>
        )}
      </div>

      {/* Content (bottom) */}
      <div className="p-3 flex flex-col flex-1 gap-1">
        <h3 className="font-bold text-sm leading-snug line-clamp-2">{item.name_ar}</h3>
        {item.description && (
          <p className="text-[11px] text-muted-foreground line-clamp-1 leading-relaxed">{item.description}</p>
        )}
        {hasDiscount && (
          <div className="inline-flex items-center gap-1 self-start bg-red-50 text-red-600 text-[10px] font-bold px-1.5 py-0.5 rounded-md border border-red-200">
            <Flame className="w-2.5 h-2.5" />
            <span>خصم {discountPct}%</span>
          </div>
        )}

        {/* Price + Add button row */}
        <div className="mt-auto pt-2 flex items-center justify-between gap-2">
          <div className="flex flex-col leading-tight">
            <span className="font-bold text-primary text-sm">{price} ر.ي</span>
            {hasDiscount && (
              <span className="text-[10px] text-muted-foreground line-through">{item.price} ر.ي</span>
            )}
          </div>

          {cartItem ? (
            <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
              <button
                className="w-7 h-7 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center"
                onClick={() => onUpdateQty(item.id, -1)}
              >
                <Minus className="w-3 h-3 text-primary" />
              </button>
              <span className="text-xs font-bold min-w-[18px] text-center">{cartItem.quantity}</span>
              <button
                className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center"
                onClick={() => onUpdateQty(item.id, 1)}
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <button
              className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow hover:bg-primary/90 active:scale-95 transition-all shrink-0"
              onClick={e => { e.stopPropagation(); onAdd(); }}
              aria-label="أضف للسلة"
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default RestaurantMenuPage;
