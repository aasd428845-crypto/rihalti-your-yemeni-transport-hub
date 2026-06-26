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
import { getCustomerActiveOffers, DeliveryOffer } from "@/lib/deliveryOffersApi";

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

// Fallback offer images
const OFFER_FALLBACK_IMGS = [
  "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=700&q=80&fit=crop",
  "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=700&q=80&fit=crop",
  "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=700&q=80&fit=crop",
  "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=700&q=80&fit=crop",
];

const DEFAULT_OFFERS: DeliveryOffer[] = [
  { id: "o1", title: "خصم 20% على أول طلب", description: "لعملاء وصال الجدد", image_url: OFFER_FALLBACK_IMGS[0], badge_text: "عرض خاص", offer_type: "percent_off_order", discount_percent: 20, is_active: true, sort_order: 1, created_at: "", delivery_company_id: "", scope: "restaurant" },
  { id: "o2", title: "توصيل مجاني", description: "عند الطلب فوق 2000 ر.ي", image_url: OFFER_FALLBACK_IMGS[1], badge_text: "مجاني", offer_type: "free_delivery", is_active: true, sort_order: 2, created_at: "", delivery_company_id: "", scope: "restaurant" },
  { id: "o3", title: "وجبتك بنصف السعر", description: "على الطلب الثاني في اليوم", image_url: OFFER_FALLBACK_IMGS[2], badge_text: "تخفيض", offer_type: "percent_off_order", discount_percent: 50, is_active: true, sort_order: 3, created_at: "", delivery_company_id: "", scope: "restaurant" },
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

// ─── Restaurant Card ──────────────────────────────────────────────────────────
const RestaurantCard = ({ r, onClick }: { r: any; onClick: () => void }) => {
  const primaryCuisine = r.cuisine_type?.[0] || "";
  const fallbackImg = CUISINE_IMAGES[primaryCuisine] || CUISINE_IMAGES["default"];
  const heroSrc = r.cover_image || r.cover_image_url || r.logo_url || fallbackImg;
  const isOutOfRange = r.coverage_status === "out_of_range";
  const displayFee = r.computed_delivery_fee ?? r.delivery_fee ?? 0;
  const status = getOpenStatus(r);
  const isOpen = r.is_active !== false && status.isOpen;
  const ratingNum = Number(r.rating || 0);
  const hasDiscount =
    !!r.has_active_offer ||
    (Array.isArray(r.cuisine_type) && r.discount_percent > 0);
  const discountPct = r.discount_percent || 20;

  return (
    <button
      onClick={onClick}
      className={`w-full bg-card rounded-2xl border border-border/30 shadow-sm hover:shadow-md transition-all text-right active:scale-[0.99] ${
        isOutOfRange ? "opacity-60" : ""
      }`}
    >
      <div className="flex items-center gap-3 p-3">

        {/* ── صورة المطعم ── */}
        <div className="relative w-[112px] h-[112px] rounded-xl overflow-hidden bg-muted shrink-0">
          <img
            src={heroSrc}
            alt={r.name_ar}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={(e) => { (e.target as HTMLImageElement).src = CUISINE_IMAGES["default"]; }}
          />
          {hasDiscount && (
            <span className="absolute top-1.5 right-1.5 bg-emerald-600 text-white text-[9px] font-black rounded-md px-1.5 py-0.5 shadow-sm">
              خصم {discountPct}%
            </span>
          )}
          {!isOpen && (
            <div className="absolute inset-0 bg-black/55 flex items-center justify-center">
              <span className="bg-black/80 text-white text-[10px] font-bold px-2 py-0.5 rounded-md">مغلق</span>
            </div>
          )}
        </div>

        {/* ── معلومات المطعم ── */}
        <div className="flex-1 min-w-0 flex flex-col gap-1">

          {/* الاسم */}
          <h3 className="font-black text-[15px] leading-tight text-foreground line-clamp-1">
            {r.name_ar}
          </h3>

          {/* التصنيف */}
          {Array.isArray(r.cuisine_type) && r.cuisine_type.length > 0 && (
            <p className="text-[11px] text-muted-foreground line-clamp-1">
              {r.cuisine_type.slice(0, 3).join(" • ")}
            </p>
          )}

          {/* تحذير التغطية */}
          {isOutOfRange && (
            <div className="flex items-center gap-1 text-[10px] text-red-600 font-medium">
              <AlertTriangle className="w-2.5 h-2.5" />لا يوصل لمنطقتك
            </div>
          )}

          {/* سطر: تقييم + وقت التوصيل + رسوم */}
          <div className="flex items-center flex-wrap gap-1.5 mt-0.5">
            {/* تقييم */}
            <span className="inline-flex items-center gap-0.5 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 font-black rounded-lg px-1.5 py-0.5 text-[11px] shrink-0">
              <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
              {ratingNum > 0 ? ratingNum.toFixed(1) : "جديد"}
            </span>

            {/* وقت التوصيل */}
            {r.estimated_delivery_time && (
              <span className="inline-flex items-center gap-0.5 text-[11px] text-muted-foreground shrink-0">
                <Clock className="w-3 h-3" />{r.estimated_delivery_time} د
              </span>
            )}

            {/* رسوم التوصيل */}
            <span className="inline-flex items-center gap-0.5 text-[11px] shrink-0">
              <Truck className="w-3 h-3 text-muted-foreground" />
              {r.price_per_km > 0
                ? <span className="text-muted-foreground">{displayFee > 0 ? `${displayFee} ر.ي` : "بالمسافة"}</span>
                : displayFee === 0
                  ? <span className="text-emerald-600 font-bold">مجاني</span>
                  : <span className="text-muted-foreground">{displayFee} ر.ي</span>}
            </span>

            {/* حالة الفتح */}
            <span className={`text-[10px] font-bold shrink-0 ${isOpen ? "text-emerald-600" : "text-red-500"}`}>
              {isOpen ? "مفتوح" : "مغلق"}
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
      <div className="w-[100px] h-[100px] rounded-xl bg-muted shrink-0" />
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
  const [offerBanners, setOfferBanners] = useState<DeliveryOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [cuisineFilter, setCuisineFilter] = useState(searchParams.get("category") || "all");
  const [categoryRestaurantMap, setCategoryRestaurantMap] = useState<Record<string, Set<string>>>({});
  const [search, setSearch] = useState(searchParams.get("q") || "");
  const [selectedCity, setSelectedCity] = useState<string>(() => localStorage.getItem("wasal_selected_city") || "");
  const [selectedArea, setSelectedArea] = useState<string>(() => localStorage.getItem("wasal_selected_area") || "");

  // Load offers from the same source as the homepage
  useEffect(() => {
    getCustomerActiveOffers()
      .then((data) => setOfferBanners(data.length > 0 ? data : DEFAULT_OFFERS))
      .catch(() => setOfferBanners(DEFAULT_OFFERS));
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

  // Fetch restaurants — try with city filter first, fallback to all if empty result
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const cityArg = selectedCity && selectedCity !== "all" ? selectedCity : undefined;

    const run = async () => {
      try {
        let data = await getActiveRestaurants(cityArg, selectedArea || undefined);
        if (!data || data.length === 0) {
          // fallback: show all restaurants regardless of city
          data = await getActiveRestaurants(undefined, undefined);
        }
        if (!cancelled) setRestaurants(data || []);
      } catch {
        try {
          const all = await getActiveRestaurants(undefined, undefined);
          if (!cancelled) setRestaurants(all || []);
        } catch {
          if (!cancelled) setRestaurants([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    return () => { cancelled = true; };
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
    ...filtered.filter(r => r.is_featured === true),
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
            {offerBanners.map((offer, i) => {
              const imgSrc = offer.image_url || OFFER_FALLBACK_IMGS[i % OFFER_FALLBACK_IMGS.length];
              const badgeText = offer.badge_text
                || (offer.offer_type === "free_delivery" ? "مجاني"
                  : offer.discount_percent ? `خصم ${offer.discount_percent}%`
                  : "عرض خاص");
              return (
                <button
                  key={offer.id}
                  onClick={() => (offer as any).scope === "shipment" ? navigate("/delivery-request") : offer.restaurant_id ? navigate(`/restaurants/${offer.restaurant_id}`) : navigate("/restaurants")}
                  className="relative shrink-0 rounded-2xl overflow-hidden shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group"
                  style={{ width: 190, height: 115 }}
                >
                  <img src={imgSrc} alt={offer.title || ""} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                  <Badge className="absolute top-2 right-2 bg-red-500 text-white border-0 shadow text-[10px] font-bold px-1.5 py-0.5">{badgeText}</Badge>
                  <div className="absolute bottom-0 right-0 left-0 p-2.5 text-white text-right">
                    {offer.title && <p className="font-black text-[13px] leading-snug drop-shadow">{offer.title}</p>}
                    {offer.description && <p className="text-[11px] text-white/85 mt-1 drop-shadow leading-tight">{offer.description}</p>}
                  </div>
                </button>
              );
            })}
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
            onSelect={(c) => navigate(`/category/${encodeURIComponent(c.name_ar)}`)}
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
