import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Star, Clock, Truck, Tag, AlertTriangle, Info, Sparkles } from "lucide-react";
import { getActiveRestaurants, getRestaurantCuisines, CoverageStatus } from "@/lib/restaurantApi";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

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

// ─── Restaurant Card ──────────────────────────────────────────────────────────
const RestaurantCard = ({ r, onClick }: { r: any; onClick: () => void }) => {
  const primaryCuisine = r.cuisine_type?.[0] || "";
  const fallbackImg = CUISINE_IMAGES[primaryCuisine] || CUISINE_IMAGES["default"];
  const heroSrc = r.cover_image || r.cover_image_url || fallbackImg;
  const isOpen = r.is_active !== false;
  const isOutOfRange = r.coverage_status === "out_of_range";
  const displayFee = r.computed_delivery_fee ?? r.delivery_fee ?? 0;

  return (
    <Card
      onClick={onClick}
      className={`cursor-pointer overflow-hidden rounded-2xl border border-border/20 bg-card shadow-md hover:shadow-xl hover:-translate-y-1 hover:border-amber-400/40 transition-all duration-300 group ${isOutOfRange ? "opacity-60" : ""}`}
    >
      <div className="h-44 relative overflow-hidden">
        <img
          src={heroSrc} alt={r.name_ar}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
          onError={(e) => { (e.target as HTMLImageElement).src = CUISINE_IMAGES["default"]; }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
        {r.is_featured && (
          <Badge className="absolute top-3 right-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 shadow-lg text-xs font-bold gap-1 px-2.5">
            <Sparkles className="w-3 h-3" />مميز
          </Badge>
        )}
        <CoverageBadge status={r.coverage_status ?? "full"} />
        {!isOpen && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="bg-black/70 text-white text-xs font-bold px-3 py-1.5 rounded-full backdrop-blur-sm">مغلق الآن</span>
          </div>
        )}
        {r.logo_url && (
          <div className="absolute bottom-12 left-3 w-10 h-10 rounded-xl bg-white shadow-xl overflow-hidden border-2 border-white/30">
            <img src={r.logo_url} alt="" className="w-full h-full object-cover" />
          </div>
        )}
        <div className="absolute bottom-3 right-3 left-3 text-white">
          <h3 className="font-black text-base drop-shadow-lg leading-tight">{r.name_ar}</h3>
          {r.cuisine_type?.length > 0 && (
            <p className="text-xs text-white/75 mt-0.5">{r.cuisine_type.slice(0, 2).join(" • ")}</p>
          )}
        </div>
      </div>
      <CardContent className="p-3">
        {isOutOfRange && (
          <div className="mb-2 flex items-center gap-1.5 text-[11px] text-red-600 bg-red-50 dark:bg-red-950/30 rounded-lg px-2 py-1.5 font-medium">
            <AlertTriangle className="w-3 h-3 shrink-0" />لا يوصل لمنطقتك
          </div>
        )}
        {r.coverage_status === "extra_fee" && (
          <div className="mb-2 flex items-center gap-1.5 text-[11px] text-amber-700 bg-amber-50 dark:bg-amber-950/30 rounded-lg px-2 py-1.5 font-medium">
            <Info className="w-3 h-3 shrink-0" />رسوم توصيل إضافية
          </div>
        )}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1 px-2 py-1 rounded-full font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/30">
            <Star className="w-3.5 h-3.5 fill-current" />{Number(r.rating || 0).toFixed(1)}
          </span>
          {r.estimated_delivery_time && (
            <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{r.estimated_delivery_time} د</span>
          )}
          <span className="flex items-center gap-1 mr-auto">
            <Truck className="w-3.5 h-3.5" />
            {displayFee === 0
              ? <span className="text-emerald-600 font-semibold">مجاني</span>
              : <span className={r.coverage_status === "extra_fee" ? "text-amber-600 font-bold" : ""}>{displayFee} ر.ي</span>}
          </span>
        </div>
      </CardContent>
    </Card>
  );
};

// ─── Skeleton Card ─────────────────────────────────────────────────────────────
const SkeletonCard = () => (
  <div className="rounded-2xl overflow-hidden bg-card border border-border/30 shadow-sm animate-pulse">
    <div className="h-44 bg-muted" />
    <div className="p-4 space-y-3">
      <div className="h-4 bg-muted rounded w-3/4" />
      <div className="h-3 bg-muted rounded w-1/2" />
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
  const [cuisineFilter, setCuisineFilter] = useState("all");
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
      })
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
      }).catch(() => {});
  }, [user?.id]);

  // Fetch restaurants
  useEffect(() => {
    setLoading(true);
    getActiveRestaurants(
      selectedCity && selectedCity !== "all" ? selectedCity : undefined,
      selectedArea || undefined
    ).then(data => setRestaurants(data || [])).catch(() => setRestaurants([])).finally(() => setLoading(false));
  }, [selectedCity, selectedArea]);

  // URL search query
  useEffect(() => {
    const q = searchParams.get("q");
    if (q) setSearch(q);
  }, [searchParams]);

  const filtered = restaurants.filter(r => {
    const matchesCuisine = cuisineFilter === "all" || r.cuisine_type?.includes(cuisineFilter);
    const matchesSearch = !search || r.name_ar.toLowerCase().includes(search.toLowerCase()) || r.name_en?.toLowerCase().includes(search.toLowerCase());
    return matchesCuisine && matchesSearch;
  });

  const featured = filtered.filter(r => r.is_featured);
  const rest = filtered.filter(r => !r.is_featured);

  // Build cuisine pills dynamically from actual restaurant data
  const allCuisineTypes = Array.from(new Set(restaurants.flatMap(r => r.cuisine_type || [])));
  const cuisinePills = [
    { key: "all", label: "الكل", emoji: "🍽️" },
    ...allCuisineTypes.map(c => ({ key: c, label: c, emoji: CUISINE_EMOJI[c] || "🍴" })),
  ];

  return (
    <div className="min-h-screen bg-background pb-24" dir="rtl">
      <div className="container mx-auto px-4 max-w-5xl space-y-5 pt-3">

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
                style={{ width: 175, height: 105 }}
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

        {/* ── 2. Cuisine Filter Pills (emoji + text, no images) ── */}
        {!loading && cuisinePills.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-4 px-4">
            {cuisinePills.map(pill => {
              const isActive = cuisineFilter === pill.key;
              return (
                <button
                  key={pill.key}
                  onClick={() => setCuisineFilter(pill.key)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-full shrink-0 text-sm font-bold border transition-all duration-200 ${
                    isActive
                      ? "bg-primary text-white border-primary shadow-md shadow-primary/20"
                      : "bg-card text-foreground border-border hover:border-primary/40 hover:bg-primary/5"
                  }`}
                >
                  <span className="text-base leading-none">{pill.emoji}</span>
                  <span>{pill.label}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* ── 3. Restaurant List ── */}
        <section>
          {loading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
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
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {filtered.map(r => <RestaurantCard key={r.id} r={r} onClick={() => navigate(`/restaurants/${r.id}`)} />)}
                </div>
              )}
            </div>
          )}

          {/* Normal listing */}
          {!loading && !search && (
            <>
              {/* Featured — horizontal scroll, only when no filter */}
              {featured.length > 0 && cuisineFilter === "all" && (
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="w-5 h-5 text-amber-500" />
                    <h2 className="text-lg font-black">اختيارات مميزة</h2>
                    <Badge variant="secondary" className="mr-auto">{featured.length}</Badge>
                  </div>
                  <div className="flex gap-4 overflow-x-auto pb-3 scrollbar-hide -mx-4 px-4">
                    {featured.map(r => (
                      <div key={r.id} className="min-w-[240px] max-w-[260px] shrink-0">
                        <RestaurantCard r={r} onClick={() => navigate(`/restaurants/${r.id}`)} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* All / filtered restaurants */}
              {(cuisineFilter === "all" ? rest : filtered).length > 0 ? (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <h2 className="text-lg font-black">
                      {cuisineFilter !== "all"
                        ? `${CUISINE_EMOJI[cuisineFilter] || "🍴"} ${cuisineFilter}`
                        : "جميع المطاعم"}
                    </h2>
                    <Badge variant="secondary" className="mr-auto">
                      {cuisineFilter === "all" ? rest.length : filtered.length}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {(cuisineFilter === "all" ? rest : filtered).map(r => (
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
