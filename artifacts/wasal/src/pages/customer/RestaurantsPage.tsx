import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Star, Clock, Truck, Tag, AlertTriangle, Info, Sparkles, Search, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { getActiveRestaurants, CoverageStatus } from "@/lib/restaurantApi";
import { getOpenStatus } from "@/lib/restaurantHours";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import CategoryScroller from "@/components/customer/CategoryScroller";

// ─── Cuisine Fallback Images ──────────────────────────────────────────────────
const CUISINE_IMAGES: Record<string, string> = {
  "يمني":          "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=400&q=80&fit=crop",
  "برجر":          "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&q=80&fit=crop",
  "بيتزا":         "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&q=80&fit=crop",
  "مأكولات بحرية": "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&q=80&fit=crop",
  "حلويات":        "https://images.unsplash.com/photo-1551024601-bec78aea704b?w=400&q=80&fit=crop",
  "مشروبات":       "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&q=80&fit=crop",
  "شاورما":        "https://images.unsplash.com/photo-1561651823-34feb02250e4?w=400&q=80&fit=crop",
  "مرق":           "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400&q=80&fit=crop",
  "دجاج":          "https://images.unsplash.com/photo-1598103442097-8b74394b95c7?w=400&q=80&fit=crop",
  "كباب":          "https://images.unsplash.com/photo-1544025162-d76694265947?w=400&q=80&fit=crop",
  "default":       "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&q=80&fit=crop",
};

// Emoji map for cuisine types
const CUISINE_EMOJI: Record<string, string> = {
  "الكل": "🍽️",
  "يمني": "🫕",
  "برجر": "🍔",
  "بيتزا": "🍕",
  "مأكولات بحرية": "🦐",
  "حلويات": "🍰",
  "مشروبات": "🧃",
  "شاورما": "🌯",
  "مرق": "🍲",
  "دجاج": "🍗",
  "دجاج مقلي": "🍗",
  "كباب": "🥙",
  "سلطة": "🥗",
  "مندي": "🫙",
  "فطائر": "🥐",
  "مكرونة": "🍝",
};

// Default offers if DB empty
const DEFAULT_OFFERS = [
  { id: "o1", title: "خصم 20% على أول طلب", subtitle: "لعملاء وصل الجدد", image_url: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&q=80&fit=crop", badge_text: "عرض خاص" },
  { id: "o2", title: "توصيل مجاني", subtitle: "عند الطلب فوق 2000 ر.ي", image_url: "https://images.unsplash.com/photo-1519984388953-d2406bc725e1?w=600&q=80&fit=crop", badge_text: "مجاني" },
  { id: "o3", title: "وجبات البرجر المميزة", subtitle: "أقل سعر في المدينة", image_url: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&q=80&fit=crop", badge_text: "تخفيض" },
];

// ─── Coverage Badge ───────────────────────────────────────────────────────────
const CoverageBadge = ({ status }: { status: CoverageStatus }) => {
  if (status === "full" || status === "covered") return null;
  if (status === "extra_fee") return (
    <Badge className="absolute top-3 left-3 bg-amber-500/90 text-white border-0 shadow text-[10px] font-bold gap-1 px-2 py-0.5 backdrop-blur-sm">
      <Info className="w-2.5 h-2.5" />رسوم إضافية
    </Badge>
  );
  return (
    <Badge className="absolute top-3 left-3 bg-red-600/90 text-white border-0 shadow text-[10px] font-bold gap-1 px-2 py-0.5 backdrop-blur-sm">
      <AlertTriangle className="w-2.5 h-2.5" />خارج التغطية
    </Badge>
  );
};

// ─── Restaurant Card (HungerStation-style horizontal card) ────────────────────
const RestaurantCard = ({ r, onClick }: { r: any; onClick: () => void }) => {
  const primaryCuisine = r.cuisine_type?.[0] || "";
  const fallbackImg = CUISINE_IMAGES[primaryCuisine] || CUISINE_IMAGES["default"];
  const heroSrc = r.cover_image || r.cover_image_url || r.logo_url || fallbackImg;
  const isOutOfRange = r.coverage_status === "out_of_range";
  const displayFee = r.computed_delivery_fee ?? r.delivery_fee ?? 0;
  const status = getOpenStatus(r.opening_hours);
  const isOpen = r.is_active !== false && status.isOpen;
  const ratingNum = Number(r.rating || 0);
  const hasDiscount =
    !!r.has_active_offer ||
    (Array.isArray(r.cuisine_type) && r.discount_percent > 0);
  const discountPct = r.discount_percent || 20;

  return (
    <button
      onClick={onClick}
      className={`w-full bg-card rounded-2xl border border-border/40 overflow-hidden shadow-sm hover:shadow-md hover:border-primary/30 transition-all text-right active:scale-[0.99] ${
        isOutOfRange ? "opacity-60" : ""
      }`}
    >
      <div className="flex items-stretch gap-3 p-2.5">
        {/* Image RIGHT */}
        <div className="relative w-[88px] h-[88px] rounded-xl overflow-hidden bg-muted shrink-0">
          <img
            src={heroSrc}
            alt={r.name_ar}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={(e) => { (e.target as HTMLImageElement).src = CUISINE_IMAGES["default"]; }}
          />
          {hasDiscount && (
            <span className="absolute top-1 right-1 bg-emerald-600 text-white text-[9px] font-black rounded-md px-1.5 py-0.5 shadow">
              خصم {discountPct}%
            </span>
          )}
          {!isOpen && (
            <div className="absolute inset-0 bg-black/55 flex items-center justify-center">
              <span className="bg-black/80 text-white text-[10px] font-bold px-2 py-0.5 rounded-md">مغلق</span>
            </div>
          )}
        </div>

        {/* Info LEFT (which is actually right side because rtl, text-right) */}
        <div className="flex-1 min-w-0 flex flex-col py-0.5">
          <div className="flex items-start gap-2">
            <h3 className="flex-1 font-black text-[15px] leading-tight text-foreground line-clamp-1">
              {r.name_ar}
            </h3>
            {r.is_featured && (
              <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
            )}
          </div>

          {Array.isArray(r.cuisine_type) && r.cuisine_type.length > 0 && (
            <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
              {r.cuisine_type.slice(0, 3).join(" - ")}
            </p>
          )}

          {/* Coverage warnings */}
          {isOutOfRange && (
            <div className="mt-1 flex items-center gap-1 text-[10px] text-red-600 font-medium">
              <AlertTriangle className="w-2.5 h-2.5" />لا يوصل لمنطقتك
            </div>
          )}
          {r.coverage_status === "extra_fee" && (
            <div className="mt-1 flex items-center gap-1 text-[10px] text-amber-700 font-medium">
              <Info className="w-2.5 h-2.5" />رسوم إضافية
            </div>
          )}

          {/* Bottom row: rating + time + fee */}
          <div className="mt-auto flex items-center gap-3 text-[11px] text-muted-foreground pt-1">
            <span className="flex items-center gap-0.5 font-bold text-foreground">
              <Clock className="w-3 h-3" />
              {r.estimated_delivery_time
                ? `${r.estimated_delivery_time} د`
                : "20-30 د"}
            </span>
            <span className="flex items-center gap-0.5">
              <Truck className="w-3 h-3" />
              {displayFee === 0
                ? <span className="text-emerald-600 font-bold">توصيل مجاني</span>
                : <span className="font-medium">توصيل {displayFee} ر.ي</span>}
            </span>
            <span className="mr-auto inline-flex items-center gap-0.5 bg-amber-50 dark:bg-amber-950/30 text-amber-700 font-black rounded-md px-1.5 py-0.5">
              <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
              {ratingNum > 0 ? ratingNum.toFixed(1) : "جديد"}
            </span>
          </div>
        </div>
      </div>
    </button>
  );
};

// ─── Skeleton Card ─────────────────────────────────────────────────────────────
const SkeletonCard = () => (
  <div className="bg-card rounded-2xl border border-border/40 p-2.5 animate-pulse">
    <div className="flex gap-3">
      <div className="w-[88px] h-[88px] rounded-xl bg-muted shrink-0" />
      <div className="flex-1 space-y-2 py-1">
        <div className="h-4 bg-muted rounded w-3/4" />
        <div className="h-3 bg-muted rounded w-1/2" />
        <div className="h-3 bg-muted rounded w-2/3 mt-3" />
      </div>
    </div>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────
const RestaurantsPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [offerBanners, setOfferBanners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [cuisineFilter, setCuisineFilter] = useState(searchParams.get("category") || "all");
  const [categoryRestaurantMap, setCategoryRestaurantMap] = useState<Record<string, Set<string>>>({});
  const [search, setSearch] = useState(searchParams.get("q") || "");
  const [selectedCity, setSelectedCity] = useState<string>(() => localStorage.getItem("wasal_selected_city") || "");
  const [selectedArea, setSelectedArea] = useState<string>(() => localStorage.getItem("wasal_selected_area") || "");

  // Load offers from DB
  useEffect(() => {
    supabase
      .from("delivery_banners" as any)
      .select("*")
      .eq("is_active", true)
      .order("sort_order")
      .then(({ data }) => {
        const offers = (data || []).filter((b: any) => b.banner_type === "offer");
        setOfferBanners(offers.length > 0 ? offers : DEFAULT_OFFERS);
      }, () => setOfferBanners(DEFAULT_OFFERS));
  }, []);

  // Sync city from user address
  useEffect(() => {
    if (!user) return;
    supabase
      .from("customer_addresses" as any).select("city, district").eq("customer_id", user.id).eq("is_default", true).maybeSingle()
      .then(({ data }: { data: any }) => {
        if (data?.city) { setSelectedCity(data.city); localStorage.setItem("wasal_selected_city", data.city); }
        const area = data?.district || "";
        setSelectedArea(area); localStorage.setItem("wasal_selected_area", area);
      }, () => {});
  }, [user?.id]);

  // Fetch restaurants
  useEffect(() => {
    setLoading(true);
    getActiveRestaurants(
      selectedCity && selectedCity !== "all" ? selectedCity : undefined,
      selectedArea || undefined
    ).then(data => setRestaurants(data || [])).catch(() => setRestaurants([])).finally(() => setLoading(false));
  }, [selectedCity, selectedArea]);

  // URL search & category query
  useEffect(() => {
    const q = searchParams.get("q");
    if (q) setSearch(q);
    const cat = searchParams.get("category");
    if (cat) setCuisineFilter(cat);
  }, [searchParams]);

  // Load category→restaurant map (so we can filter by menu_categories.name_ar too)
  useEffect(() => {
    supabase
      .from("menu_categories")
      .select("name_ar, restaurant_id")
      .eq("is_active", true)
      .then(({ data }) => {
        const map: Record<string, Set<string>> = {};
        (data || []).forEach((row: any) => {
          if (!row.name_ar || !row.restaurant_id) return;
          if (!map[row.name_ar]) map[row.name_ar] = new Set();
          map[row.name_ar].add(row.restaurant_id);
        });
        setCategoryRestaurantMap(map);
      });
  }, []);

  const filtered = restaurants.filter(r => {
    const inCuisine = cuisineFilter === "all" || r.cuisine_type?.includes(cuisineFilter);
    const inMenuCats = cuisineFilter !== "all" && categoryRestaurantMap[cuisineFilter]?.has(r.id);
    const matchesCategory = cuisineFilter === "all" || inCuisine || inMenuCats;
    const matchesSearch = !search || r.name_ar.toLowerCase().includes(search.toLowerCase()) || r.name_en?.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Featured items appear inline in the list (marked with sparkle), no separate scroller
  const sortedList = [
    ...filtered.filter(r => r.is_featured),
    ...filtered.filter(r => !r.is_featured),
  ];

  return (
    <div className="min-h-screen bg-background pb-24" dir="rtl">
      <div className="container mx-auto px-4 max-w-5xl space-y-3 pt-3">

        {/* ── 0. Page header (back, title) ── */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-full bg-card border border-border flex items-center justify-center hover:bg-muted transition"
            aria-label="رجوع"
          >
            <ArrowRight className="w-4 h-4" />
          </button>
          <h1 className="text-base font-black text-foreground">جميع المطاعم</h1>
          <div className="w-9 h-9" />
        </div>

        {/* ── 0.5 Search bar ── */}
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="ابحث عن مطعم أو مطبخ..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-9 bg-muted/50 border-0 rounded-xl h-10 text-sm"
          />
        </div>

        {/* ── 1. Offers / Deals Section ── */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 rounded-lg bg-red-500/10">
              <Tag className="w-4 h-4 text-red-500" />
            </div>
            <h2 className="text-lg font-black text-foreground">عروض وخصومات</h2>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
            {offerBanners.map((offer) => (
              <button
                key={offer.id}
                onClick={() => offer.link_url && navigate(offer.link_url)}
                className="relative shrink-0 rounded-2xl overflow-hidden shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group"
                style={{ width: 145, height: 88 }}
              >
                <img src={offer.image_url} alt={offer.title || ""} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                {offer.badge_text && (
                  <Badge className="absolute top-2 right-2 bg-red-500 text-white border-0 shadow text-[10px] font-bold px-1.5 py-0.5">{offer.badge_text}</Badge>
                )}
                <div className="absolute bottom-0 right-0 left-0 p-2 text-white text-right">
                  {offer.title && <p className="font-black text-xs leading-tight drop-shadow">{offer.title}</p>}
                  {offer.subtitle && <p className="text-[10px] text-white/80 mt-0.5 drop-shadow">{offer.subtitle}</p>}
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* ── 2. Categories scroller (replaces old cuisine pills) ── */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-[15px] font-black text-foreground">التصنيفات</h2>
            {cuisineFilter !== "all" && (
              <button
                onClick={() => setCuisineFilter("all")}
                className="text-xs text-primary font-semibold"
              >
                إظهار الكل
              </button>
            )}
          </div>
          <CategoryScroller
            showHeader={false}
            active={cuisineFilter === "all" ? undefined : cuisineFilter}
            onSelect={(c) => setCuisineFilter(prev => prev === c.name_ar ? "all" : c.name_ar)}
          />
        </div>

        {/* ── 3. Restaurant List ── */}
        <section>
          {loading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
            </div>
          )}

          {/* Search results */}
          {!loading && search && (
            <div>
              <p className="text-sm text-muted-foreground mb-4">نتائج البحث عن "<strong>{search}</strong>" ({filtered.length})</p>
              {filtered.length === 0 ? (
                <div className="text-center py-16">
                  <div className="text-5xl mb-3">🔍</div>
                  <p className="font-bold text-lg">لم يُعثر على نتائج</p>
                  <p className="text-muted-foreground text-sm">جرّب بحثاً مختلفاً</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {filtered.map(r => <RestaurantCard key={r.id} r={r} onClick={() => navigate(`/restaurants/${r.id}`)} />)}
                </div>
              )}
            </div>
          )}

          {/* Normal listing */}
          {!loading && !search && (
            <>
              {sortedList.length > 0 ? (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <h2 className="text-base font-black">
                      {cuisineFilter !== "all"
                        ? `${CUISINE_EMOJI[cuisineFilter] || "🍴"} ${cuisineFilter}`
                        : "جميع المطاعم"}
                    </h2>
                    <Badge variant="secondary" className="mr-auto text-[11px] px-2 py-0">
                      {sortedList.length}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {sortedList.map(r => (
                      <RestaurantCard key={r.id} r={r} onClick={() => navigate(`/restaurants/${r.id}`)} />
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-16 space-y-3">
                  <div className="text-6xl">🍽️</div>
                  <p className="font-black text-xl">
                    {cuisineFilter !== "all"
                      ? `لا توجد مطاعم بنوع "${cuisineFilter}"`
                      : `لا توجد مطاعم ${selectedCity ? `في ${selectedCity}` : ""} حالياً`}
                  </p>
                  {cuisineFilter !== "all" && (
                    <button onClick={() => setCuisineFilter("all")} className="text-primary text-sm hover:underline">عرض جميع المطاعم</button>
                  )}
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
};

export default RestaurantsPage;
