import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Star, Clock, Truck, Plus, Minus, ShoppingCart, ArrowLeft, Flame, Search, ChevronLeft, Heart, Share2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { getRestaurantById, getRestaurantMenu, getMenuItemOptions, upsertCart, getCart } from "@/lib/restaurantApi";
import { useToast } from "@/hooks/use-toast";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { getCategoryFallbackImage } from "@/components/customer/CategoryScroller";

interface CartItem {
  id: string;
  name_ar: string;
  price: number;
  quantity: number;
  image_url?: string;
  selectedOptions?: Record<string, any>;
  notes?: string;
}

interface OptionChoice {
  name_ar: string;
  name_en?: string;
  price: number;
  image_url?: string;
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
  const [itemNotes, setItemNotes] = useState("");

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
    const notes = itemNotes.trim() || undefined;
    setCart(prev => {
      const existing = prev.find(c => c.id === item.id);
      if (existing) return prev.map(c => c.id === item.id ? { ...c, quantity: c.quantity + qty, price, selectedOptions, notes } : c);
      return [...prev, { id: item.id, name_ar: item.name_ar, price, quantity: qty, image_url: item.image_url, selectedOptions, notes }];
    });
    toast({ title: "✅ تمت الإضافة", description: `${item.name_ar} أُضيف إلى السلة` });
    setShowItemDetail(null); setItemQty(1); setSelectedOptions({}); setItemOptions([]); setItemNotes("");
  };

  const openItemDetail = async (item: any) => {
    setShowItemDetail(item); setItemQty(1); setSelectedOptions({}); setItemNotes("");
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

        {/* ── Categories Scroller (circular images, scroll-to-section on click) ── */}
        {!search && categories.length > 0 && (
          <div className="border-t border-border/50 pt-3 pb-3 px-4">
            <h3 className="text-[13px] font-black text-foreground mb-2">التصنيفات</h3>
            <div
              ref={chipScrollRef}
              className="flex gap-2.5 overflow-x-auto scrollbar-hide -mx-4 px-4"
            >
              {categories.map(cat => {
                const isActive = activeCat === cat.id;
                const src = cat.image_url || getCategoryFallbackImage(cat.name_ar || "");
                return (
                  <button
                    key={cat.id}
                    data-chip={cat.id}
                    onClick={() => scrollToCategory(cat.id)}
                    className="flex flex-col items-center gap-1 shrink-0 group"
                    style={{ minWidth: 64 }}
                  >
                    <div
                      className={`w-14 h-14 rounded-full overflow-hidden bg-card border-2 shadow-sm group-hover:shadow-md group-hover:-translate-y-0.5 transition-all ${
                        isActive
                          ? 'border-primary ring-2 ring-primary/30'
                          : 'border-border/40'
                      }`}
                    >
                      <img
                        src={src}
                        alt={cat.name_ar}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = getCategoryFallbackImage("default");
                        }}
                      />
                    </div>
                    <span
                      className={`text-[10px] font-bold text-center leading-tight max-w-[64px] truncate ${
                        isActive ? 'text-primary' : 'text-foreground'
                      }`}
                    >
                      {cat.name_ar}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Popular items ("الأكثر طلباً") ── */}
      {!search && (() => {
        const popular = items.filter(i => i.is_popular).slice(0, 10);
        if (popular.length === 0) return null;
        return (
          <div className="pt-4 pb-2">
            <div className="flex items-center justify-between px-4 mb-2">
              <h2 className="text-base font-black flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-amber-500" />
                الأكثر طلباً
              </h2>
              <span className="text-[11px] text-muted-foreground">{popular.length}</span>
            </div>
            <div className="flex gap-2.5 overflow-x-auto scrollbar-hide px-4 pb-2">
              {popular.map(item => {
                const price = item.discounted_price || item.price;
                return (
                  <button
                    key={`pop-${item.id}`}
                    onClick={() => openItemDetail(item)}
                    className="min-w-[130px] w-[130px] bg-card rounded-xl border border-border/40 overflow-hidden shadow-sm hover:shadow-md transition shrink-0 text-right"
                  >
                    <div className="relative w-full h-[88px] bg-muted">
                      {item.image_url
                        ? <img src={item.image_url} alt={item.name_ar} className="w-full h-full object-cover" loading="lazy" />
                        : <div className="w-full h-full flex items-center justify-center text-2xl">🍽️</div>}
                    </div>
                    <div className="p-2 space-y-1">
                      <p className="font-bold text-[12px] leading-tight line-clamp-1">{item.name_ar}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-primary font-black text-[12px]">{price} ر.ي</span>
                        <span className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow">
                          <Plus className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* ── Menu Sections ── */}
      <div className="pb-32">
        {search ? (
          /* Search results */
          <div className="px-4 pt-4">
            {(itemsByCategory["__search__"] || []).length === 0 ? (
              <p className="text-center py-10 text-muted-foreground">لا توجد نتائج</p>
            ) : (
              <div className="grid grid-cols-1 gap-4">
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
                    <div className="grid grid-cols-1 gap-4">
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
                  <div className="grid grid-cols-1 gap-4">
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

      {/* ── Item Detail Modal — HungerStation-style ── */}
      <Dialog open={!!showItemDetail} onOpenChange={() => { setShowItemDetail(null); setItemOptions([]); setSelectedOptions({}); setItemNotes(""); }}>
        <DialogContent dir="rtl" className="max-w-md max-h-[95vh] overflow-hidden p-0 gap-0 flex flex-col">
          {showItemDetail && (() => {
            const basePrice = Number(showItemDetail.discounted_price || showItemDetail.price);
            const optionsExtra = Object.values(selectedOptions).reduce((sum: number, val: any) => {
              if (Array.isArray(val)) return sum + val.reduce((s: number, c: OptionChoice) => s + (c.price || 0), 0);
              return sum + (val?.price || 0);
            }, 0);
            const totalPrice = (basePrice + optionsExtra) * itemQty;
            const ratingNum = Number(showItemDetail.rating || 0);
            const totalRatings = Number(showItemDetail.total_ratings || 0);

            return (
              <>
                {/* Scrollable content */}
                <div className="overflow-y-auto flex-1">
                  {/* Hero image with floating buttons */}
                  <div className="relative h-64 bg-muted">
                    {showItemDetail.image_url
                      ? <img src={showItemDetail.image_url} alt={showItemDetail.name_ar} loading="lazy" className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-7xl">🍽️</div>}
                    <button
                      onClick={() => { setShowItemDetail(null); setItemOptions([]); setSelectedOptions({}); setItemNotes(""); }}
                      className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/95 shadow-lg flex items-center justify-center hover:bg-white transition"
                      aria-label="رجوع"
                    >
                      <ArrowLeft className="w-4 h-4 rotate-180" />
                    </button>
                    <div className="absolute top-3 left-3 flex gap-2">
                      <button className="w-9 h-9 rounded-full bg-white/95 shadow-lg flex items-center justify-center hover:bg-white transition" aria-label="مفضلة">
                        <Heart className="w-4 h-4" />
                      </button>
                      <button className="w-9 h-9 rounded-full bg-white/95 shadow-lg flex items-center justify-center hover:bg-white transition" aria-label="مشاركة">
                        <Share2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Body */}
                  <div className="p-4 space-y-4">
                    {/* Title row */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <DialogTitle className="text-xl font-black text-right">{showItemDetail.name_ar}</DialogTitle>
                        {showItemDetail.name_en && (
                          <p className="text-xs text-muted-foreground mt-0.5">{showItemDetail.name_en}</p>
                        )}
                      </div>
                      <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 dark:bg-amber-950/30 rounded-md px-2 py-1 text-xs font-bold whitespace-nowrap">
                        <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                        {ratingNum > 0 ? ratingNum.toFixed(1) : "جديد"}
                        {totalRatings > 0 && <span className="text-[10px] text-muted-foreground">({totalRatings})</span>}
                      </span>
                    </div>

                    {showItemDetail.description && (
                      <p className="text-sm text-muted-foreground leading-relaxed">{showItemDetail.description}</p>
                    )}

                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      {showItemDetail.preparation_time && (
                        <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{showItemDetail.preparation_time} د</span>
                      )}
                      {showItemDetail.calories && <span>🔥 {showItemDetail.calories} سعرة</span>}
                    </div>

                    {/* Options groups */}
                    {itemOptions.length > 0 && (
                      <div className="space-y-5 pt-2 border-t border-border/50">
                        {itemOptions.map((opt: any) => {
                          const choices = (opt.choices as OptionChoice[]) || [];
                          const isSingle = opt.option_type === "single" || opt.option_type === "size" || opt.option_type === "remove";
                          return (
                            <div key={opt.id} className="space-y-2.5 pt-3">
                              {/* Header */}
                              <div className="flex items-center justify-between">
                                <div>
                                  <h4 className="font-black text-base">{isSingle ? "اختر " : "اختر "}{opt.name_ar}</h4>
                                  <p className="text-[11px] text-muted-foreground mt-0.5">
                                    {isSingle ? "اختيار واحد" : `حتى ${opt.max_selections || choices.length} خيارات`}
                                  </p>
                                </div>
                                {opt.is_required && <Badge className="bg-emerald-600 text-white text-[10px] px-2">مطلوب</Badge>}
                              </div>

                              {/* Choices */}
                              {isSingle ? (
                                /* Pill / image card buttons row */
                                <div className="flex flex-wrap gap-2">
                                  {choices.map((choice, i) => {
                                    const isSelected = selectedOptions[opt.id]?.name_ar === choice.name_ar;
                                    return (
                                      <button
                                        key={i}
                                        type="button"
                                        onClick={() => setSelectedOptions(prev => ({ ...prev, [opt.id]: choice }))}
                                        className={`flex items-center gap-2 ${choice.image_url ? "pr-1 pl-3 py-1" : "px-4 py-2"} rounded-xl border-2 text-sm font-bold transition-all ${
                                          isSelected
                                            ? "bg-emerald-50 border-emerald-600 text-emerald-700 dark:bg-emerald-950/40"
                                            : "bg-background border-border text-foreground hover:border-emerald-400"
                                        }`}
                                      >
                                        {choice.image_url && (
                                          <img src={choice.image_url} alt={choice.name_ar} loading="lazy" className="w-9 h-9 rounded-lg object-cover" />
                                        )}
                                        <span className="text-right">
                                          {choice.name_ar}
                                          {choice.price > 0 && (
                                            <span className="block text-[10px] font-medium text-muted-foreground mt-0.5">+{choice.price} ر.ي</span>
                                          )}
                                        </span>
                                      </button>
                                    );
                                  })}
                                </div>
                              ) : (
                                /* Right-aligned checkbox list with thumbnails */
                                <div className="space-y-1">
                                  {choices.map((choice, i) => {
                                    const selected = (selectedOptions[opt.id] as OptionChoice[] || []);
                                    const isChecked = selected.some(s => s.name_ar === choice.name_ar);
                                    const max = opt.max_selections || choices.length;
                                    const atMax = !isChecked && selected.length >= max;
                                    return (
                                      <label
                                        key={i}
                                        htmlFor={`${opt.id}-${i}`}
                                        className={`flex items-center gap-2.5 py-2 px-1 border-b border-border/50 last:border-0 cursor-pointer ${
                                          atMax ? "opacity-50" : ""
                                        }`}
                                      >
                                        {choice.image_url ? (
                                          <img src={choice.image_url} alt={choice.name_ar} loading="lazy" className="w-10 h-10 rounded-lg object-cover shrink-0" />
                                        ) : (
                                          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-base shrink-0">🍽️</div>
                                        )}
                                        <span className="text-sm font-medium flex-1">{choice.name_ar}</span>
                                        <span className="text-xs text-muted-foreground">
                                          {choice.price > 0 ? `+ ${choice.price} ر.ي` : ""}
                                        </span>
                                        <Checkbox
                                          id={`${opt.id}-${i}`}
                                          checked={isChecked}
                                          disabled={atMax}
                                          onCheckedChange={(checked) => {
                                            setSelectedOptions((prev) => {
                                              const cur = (prev[opt.id] as OptionChoice[] || []);
                                              return {
                                                ...prev,
                                                [opt.id]: checked
                                                  ? [...cur, choice]
                                                  : cur.filter(s => s.name_ar !== choice.name_ar),
                                              };
                                            });
                                          }}
                                        />
                                      </label>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Notes */}
                    <div className="space-y-2 pt-3 border-t border-border/50">
                      <h4 className="font-black text-base">الملاحظات</h4>
                      <Textarea
                        value={itemNotes}
                        onChange={(e) => setItemNotes(e.target.value)}
                        placeholder="اكتب ملاحظاتك هنا..."
                        rows={2}
                        className="resize-none text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Sticky bottom bar */}
                <div className="border-t bg-background p-3 flex items-center gap-3">
                  {/* Qty */}
                  <div className="flex items-center gap-2 bg-muted rounded-xl p-1">
                    <button
                      className="w-8 h-8 rounded-lg bg-background border border-border flex items-center justify-center hover:bg-muted"
                      onClick={() => setItemQty(Math.max(1, itemQty - 1))}
                      aria-label="تقليل"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-base font-black min-w-[24px] text-center">{itemQty}</span>
                    <button
                      className="w-8 h-8 rounded-lg bg-background border border-border flex items-center justify-center hover:bg-muted"
                      onClick={() => setItemQty(itemQty + 1)}
                      aria-label="زيادة"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Add to cart */}
                  <Button
                    className="flex-1 h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm gap-2"
                    onClick={() => addToCart(showItemDetail, itemQty)}
                  >
                    <ShoppingCart className="w-4 h-4" />
                    أضف للسلة — {totalPrice.toLocaleString()} ر.ي
                  </Button>
                </div>
              </>
            );
          })()}
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
      className="flex flex-col w-full bg-background rounded-xl overflow-hidden shadow-sm border border-border/60 hover:shadow-md transition-all active:scale-[0.99] cursor-pointer"
      onClick={onOpen}
    >
      {/* Image (top) — compact */}
      <div className="relative w-full h-40 bg-muted overflow-hidden">
        {item.image_url
          ? <img src={item.image_url} alt={item.name_ar} loading="lazy" className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center text-4xl">🍽️</div>}
        {item.is_popular && (
          <div className="absolute top-2 right-2">
            <Badge className="text-[10px] px-1.5 py-0 bg-amber-500 text-white border-0 gap-0.5 h-5 shadow">
              <Flame className="w-2.5 h-2.5" />شائع
            </Badge>
          </div>
        )}
      </div>

      {/* Content (bottom) — compact */}
      <div className="p-3 flex flex-col flex-1 gap-1.5">
        <h3 className="font-bold text-sm leading-snug line-clamp-1">{item.name_ar}</h3>
        {item.description && (
          <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">{item.description}</p>
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
            <span className="font-extrabold text-primary text-base">{price} ر.ي</span>
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
                <Minus className="w-3.5 h-3.5 text-primary" />
              </button>
              <span className="text-sm font-bold min-w-[20px] text-center">{cartItem.quantity}</span>
              <button
                className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center"
                onClick={() => onUpdateQty(item.id, 1)}
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              className="h-9 px-3.5 rounded-full bg-primary text-primary-foreground flex items-center gap-1 font-bold text-xs shadow-md hover:bg-primary/90 active:scale-95 transition-all shrink-0"
              onClick={e => { e.stopPropagation(); onAdd(); }}
              aria-label="أضف للسلة"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>إضافة</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default RestaurantMenuPage;
