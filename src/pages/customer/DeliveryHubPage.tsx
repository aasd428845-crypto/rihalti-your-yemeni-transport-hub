import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Star, Clock, Truck,
  UtensilsCrossed, ChefHat, Sparkles, X,
  AlertTriangle, Info, ChevronLeft, ChevronRight
} from "lucide-react";
import { getActiveRestaurants, getServiceTypes, getRestaurantCuisines, CoverageStatus } from "@/lib/restaurantApi";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

// ─── Types ───────────────────────────────────────────────────────────────────
type Tab = "restaurants" | "grocery" | "pharmacy";

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
  "سلطة":          "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&q=80&fit=crop",
  "دجاج":          "https://images.unsplash.com/photo-1598103442097-8b74394b95c7?w=400&q=80&fit=crop",
  "كباب":          "https://images.unsplash.com/photo-1544025162-d76694265947?w=400&q=80&fit=crop",
  "default":       "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&q=80&fit=crop",
};

// Default banners if DB has none
const DEFAULT_BANNERS = [
  {
    id: "d1",
    title: "اطلب من مطاعمك المفضلة",
    subtitle: "توصيل سريع لباب منزلك",
    image_url: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200&q=80&fit=crop",
    badge_text: "جديد",
    link_tab: "restaurants",
  },
  {
    id: "d2",
    title: "عروض حصرية كل يوم",
    subtitle: "لا تفوّت أفضل الأسعار",
    image_url: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=1200&q=80&fit=crop",
    badge_text: "عرض محدود",
    link_tab: "restaurants",
  },
  {
    id: "d3",
    title: "مطاعم يمنية أصيلة",
    subtitle: "أطباق شعبية بلمسة عصرية",
    image_url: "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=1200&q=80&fit=crop",
    badge_text: null,
    link_tab: "restaurants",
  },
];

// ─── Hero Banner Carousel ─────────────────────────────────────────────────────
const BannerCarousel = ({
  banners,
  onTabChange,
  onNavigate,
}: {
  banners: any[];
  onTabChange: (tab: Tab) => void;
  onNavigate: (url: string) => void;
}) => {
  const [idx, setIdx] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    timerRef.current = setInterval(() => setIdx(i => (i + 1) % banners.length), 4500);
    return () => clearInterval(timerRef.current);
  }, [banners.length]);

  const go = (dir: number) => {
    clearInterval(timerRef.current);
    setIdx(i => (i + dir + banners.length) % banners.length);
  };

  const handleBannerClick = (banner: any) => {
    if (banner.link_url) {
      onNavigate(banner.link_url);
    } else if (banner.link_tab && ["restaurants", "grocery", "pharmacy"].includes(banner.link_tab)) {
      onTabChange(banner.link_tab as Tab);
    } else if (banner.link_tab === "more") {
      onNavigate("/shipments");
    }
  };

  if (!banners.length) return null;

  return (
    <div className="relative w-full overflow-hidden rounded-2xl shadow-xl" style={{ aspectRatio: "16/7", minHeight: 160, maxHeight: 280 }}>
      {banners.map((banner, i) => (
        <div
          key={banner.id}
          className={`absolute inset-0 transition-opacity duration-700 ${i === idx ? "opacity-100" : "opacity-0 pointer-events-none"} ${banner.link_url || banner.link_tab ? "cursor-pointer" : ""}`}
          onClick={() => i === idx && handleBannerClick(banner)}
        >
          <img
            src={banner.image_url}
            alt={banner.title || ""}
            className="w-full h-full object-cover"
            loading={i === 0 ? "eager" : "lazy"}
          />
          {/* Dark gradient at bottom for text readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          {banner.badge_text && (
            <Badge className="absolute top-3 right-3 bg-amber-500 text-white border-0 shadow-lg font-bold text-xs">
              {banner.badge_text}
            </Badge>
          )}
          {(banner.title || banner.subtitle) && (
            <div className="absolute bottom-8 right-4 left-4 text-white">
              {banner.title && (
                <h3 className="text-xl font-black drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] leading-tight">
                  {banner.title}
                </h3>
              )}
              {banner.subtitle && (
                <p className="text-sm text-white/90 mt-1 drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] font-medium">
                  {banner.subtitle}
                </p>
              )}
            </div>
          )}
        </div>
      ))}

      {/* Controls */}
      {banners.length > 1 && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); go(-1); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/70 transition-colors z-10"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); go(1); }}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/70 transition-colors z-10"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
            {banners.map((_, i) => (
              <button
                key={i}
                onClick={(e) => { e.stopPropagation(); setIdx(i); }}
                className={`rounded-full transition-all duration-300 ${i === idx ? "w-5 h-2 bg-white" : "w-2 h-2 bg-white/50"}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

// ─── Service Category Tiles ───────────────────────────────────────────────────
const SERVICE_TILES = [
  {
    key: "restaurants",
    label: "مطاعم وتوصيل",
    subLabel: "أطعمة • مشروبات • حلويات",
    emoji: "🍔",
    gradient: "from-orange-500 to-amber-500",
    img: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&q=80&fit=crop",
  },
  {
    key: "grocery",
    label: "بقالة وتسوق",
    subLabel: "سوبرماركت • فواكه • خضروات",
    emoji: "🛒",
    gradient: "from-emerald-500 to-green-500",
    img: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=600&q=80&fit=crop",
  },
  {
    key: "pharmacy",
    label: "صيدليات",
    subLabel: "أدوية • مستحضرات • رعاية",
    emoji: "💊",
    gradient: "from-blue-500 to-sky-500",
    img: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600&q=80&fit=crop",
  },
  {
    key: "more",
    label: "المزيد",
    subLabel: "ورد • هدايا • طلب خاص",
    emoji: "🎁",
    gradient: "from-purple-500 to-pink-500",
    img: "https://images.unsplash.com/photo-1607344645866-009c320b63e0?w=600&q=80&fit=crop",
  },
];

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
const RestaurantCard = ({ r, onClick, size = "normal" }: { r: any; onClick: () => void; size?: "normal" | "featured" | "wide" }) => {
  const primaryCuisine = r.cuisine_type?.[0] || "";
  const fallbackImg = CUISINE_IMAGES[primaryCuisine] || CUISINE_IMAGES["default"];
  const heroSrc = r.cover_image || r.cover_image_url || fallbackImg;
  const isOpen = r.is_active !== false;
  const isOutOfRange = r.coverage_status === "out_of_range";
  const displayFee = r.computed_delivery_fee ?? r.delivery_fee ?? 0;

  const imgH = size === "featured" ? "h-56" : size === "wide" ? "h-40" : "h-44";
  const cardW = size === "featured" ? "min-w-[260px] max-w-[280px]" : size === "wide" ? "min-w-[320px] max-w-[360px]" : "";

  return (
    <Card
      onClick={onClick}
      className={`cursor-pointer overflow-hidden rounded-2xl border border-border/20 bg-card shadow-md hover:shadow-2xl hover:-translate-y-1.5 hover:border-amber-400/40 transition-all duration-300 group ${cardW} ${isOutOfRange ? "opacity-60" : ""}`}
    >
      <div className={`${imgH} relative overflow-hidden`}>
        <img
          src={heroSrc}
          alt={r.name_ar}
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
          <div className="mb-2 flex items-center gap-1.5 text-[11px] text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 rounded-lg px-2 py-1.5 font-medium">
            <AlertTriangle className="w-3 h-3 shrink-0" />لا يوصل لمنطقتك
          </div>
        )}
        {r.coverage_status === "extra_fee" && (
          <div className="mb-2 flex items-center gap-1.5 text-[11px] text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 rounded-lg px-2 py-1.5 font-medium">
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

// ─── Coming Soon Section ──────────────────────────────────────────────────────
const ComingSoonSection = ({ label, emoji, gradient }: { label: string; emoji: string; gradient: string }) => (
  <div className="py-20 text-center space-y-5">
    <div className={`w-24 h-24 mx-auto rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-5xl shadow-xl`}>
      {emoji}
    </div>
    <div>
      <h2 className="text-2xl font-black text-foreground">قريباً — {label}</h2>
      <p className="text-muted-foreground mt-2 max-w-sm mx-auto">نعمل بجد لإحضار أفضل تجربة في قسم {label}. ترقّبوا!</p>
    </div>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────
const DeliveryHubPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<Tab>("restaurants");
  const [selectedCity, setSelectedCity] = useState<string>(() => localStorage.getItem("wasal_selected_city") || "صنعاء");
  const [cuisineFilter, setCuisineFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [cuisines, setCuisines] = useState<any[]>([]);
  const [banners, setBanners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Load initial static data
  useEffect(() => {
    Promise.all([
      getRestaurantCuisines(),
      // Try to load banners from DB (table may not exist yet)
      supabase.from("delivery_banners" as any).select("*").eq("is_active", true).order("sort_order")
        .then(({ data }) => data || [])
        .catch(() => []),
    ]).then(([cuisinesData, bannersData]) => {
      setCuisines([{ id: "all", name_ar: "الكل", image_url: null }, ...(cuisinesData || [])]);
      setBanners(bannersData.length > 0 ? bannersData : DEFAULT_BANNERS);
    }).catch(() => {
      setBanners(DEFAULT_BANNERS);
    });
  }, []);

  // Sync city from user profile
  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("city").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => {
        if (data?.city) {
          setSelectedCity(data.city);
          localStorage.setItem("wasal_selected_city", data.city);
        }
      });
  }, [user?.id]);

  // Fetch restaurants by city
  useEffect(() => {
    setLoading(true);
    getActiveRestaurants(selectedCity === "all" ? undefined : selectedCity)
      .then(data => setRestaurants(data || []))
      .catch(() => setRestaurants([]))
      .finally(() => setLoading(false));
  }, [selectedCity]);

  // Handle URL params
  useEffect(() => {
    const t = searchParams.get("tab") as Tab;
    if (t && ["restaurants", "grocery", "pharmacy"].includes(t)) setActiveTab(t);
    const q = searchParams.get("q");
    if (q) setSearch(q);
  }, [searchParams]);

  const filtered = restaurants.filter((r) => {
    const matchesCuisine = cuisineFilter === "all" || r.cuisine_type?.includes(cuisineFilter);
    const matchesSearch = !search || r.name_ar.toLowerCase().includes(search.toLowerCase()) || r.name_en?.toLowerCase().includes(search.toLowerCase());
    return matchesCuisine && matchesSearch && activeTab === "restaurants";
  });

  const featured = filtered.filter(r => r.is_featured);
  const highlyRated = filtered.filter(r => r.rating >= 4.5 && !r.is_featured);
  const rest = filtered.filter(r => !r.is_featured && r.rating < 4.5);
  const showSections = !search && cuisineFilter === "all";

  return (
    <div className="min-h-screen bg-background pb-24" dir="rtl">

      {/* ── Content ── (pt-20 to clear the fixed SuperAppHeader) */}
      <div className="container mx-auto px-4 max-w-5xl space-y-7 pt-6">

        {/* Hero Banner Carousel */}
        {activeTab === "restaurants" && !search && (
          <BannerCarousel banners={banners} onTabChange={setActiveTab} onNavigate={navigate} />
        )}

        {/* Service Category Grid */}
        {!search && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {SERVICE_TILES.map(tile => (
              <button
                key={tile.key}
                onClick={() => {
                  if (tile.key === "more") navigate("/shipments");
                  else if (tile.key === "grocery") setActiveTab("grocery");
                  else if (tile.key === "pharmacy") setActiveTab("pharmacy");
                  else setActiveTab(tile.key as Tab);
                }}
                className={`relative rounded-2xl overflow-hidden shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group h-28 ${activeTab === tile.key ? "ring-2 ring-offset-2 ring-primary" : ""}`}
              >
                <img src={tile.img} alt={tile.label} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <div className={`absolute inset-0 bg-gradient-to-br ${tile.gradient} opacity-75 group-hover:opacity-85 transition-opacity`} />
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-2">
                  <span className="text-3xl mb-1">{tile.emoji}</span>
                  <span className="font-black text-sm leading-tight text-center">{tile.label}</span>
                </div>
                {activeTab === tile.key && (
                  <div className="absolute inset-0 ring-2 ring-white/60 rounded-2xl" />
                )}
              </button>
            ))}
          </div>
        )}

        {/* ── Restaurants Tab ── */}
        {activeTab === "restaurants" && (
          <div className="space-y-8">

            {/* Cuisine filter pills */}
            <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide -mx-4 px-4">
              {cuisines.map(cat => {
                const isActive = cuisineFilter === cat.name_ar || (cat.id === "all" && cuisineFilter === "all");
                return (
                  <button
                    key={cat.id}
                    onClick={() => setCuisineFilter(cat.id === "all" ? "all" : cat.name_ar)}
                    className="flex flex-col items-center gap-1.5 shrink-0 transition-all duration-200"
                  >
                    <div className={`w-16 h-16 rounded-2xl overflow-hidden border-2 transition-all shadow ${isActive ? "border-primary shadow-primary/30 scale-110" : "border-transparent bg-card hover:border-primary/30"}`}>
                      {cat.image_url ? (
                        <img src={cat.image_url} alt={cat.name_ar} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-primary/10">
                          {cat.id === "all" ? <UtensilsCrossed className="w-6 h-6 text-primary" /> : <ChefHat className="w-6 h-6 text-primary" />}
                        </div>
                      )}
                    </div>
                    <span className={`text-[11px] font-bold ${isActive ? "text-primary" : "text-muted-foreground"}`}>{cat.name_ar}</span>
                  </button>
                );
              })}
            </div>


            {/* Loading skeletons */}
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
                    {filtered.map(r => (
                      <RestaurantCard key={r.id} r={r} onClick={() => navigate(`/restaurants/${r.id}`)} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Sections (no search) */}
            {!loading && !search && showSections && (
              <>
                {/* Featured horizontal scroll */}
                {featured.length > 0 && (
                  <section>
                    <div className="flex items-center gap-2 mb-4">
                      <div className="p-1.5 rounded-lg bg-amber-500/10">
                        <Sparkles className="w-5 h-5 text-amber-500" />
                      </div>
                      <h2 className="text-xl font-black text-foreground">اختيارات مميزة</h2>
                      <Badge variant="secondary" className="mr-auto">{featured.length}</Badge>
                    </div>
                    <div className="flex gap-4 overflow-x-auto pb-3 scrollbar-hide -mx-4 px-4">
                      {featured.map(r => (
                        <RestaurantCard key={r.id} r={r} size="featured" onClick={() => navigate(`/restaurants/${r.id}`)} />
                      ))}
                    </div>
                  </section>
                )}

                {/* Highly rated */}
                {highlyRated.length > 0 && (
                  <section>
                    <div className="flex items-center gap-2 mb-4">
                      <div className="p-1.5 rounded-lg bg-orange-500/10">
                        <Star className="w-5 h-5 text-orange-500 fill-orange-500" />
                      </div>
                      <h2 className="text-xl font-black text-foreground">الأعلى تقييماً</h2>
                      <Badge variant="secondary" className="mr-auto">{highlyRated.length}</Badge>
                    </div>
                    <div className="flex gap-4 overflow-x-auto pb-3 scrollbar-hide -mx-4 px-4">
                      {highlyRated.slice(0, 8).map(r => (
                        <RestaurantCard key={r.id} r={r} size="featured" onClick={() => navigate(`/restaurants/${r.id}`)} />
                      ))}
                    </div>
                  </section>
                )}

                {/* All restaurants grid */}
                {rest.length > 0 && (
                  <section>
                    <div className="flex items-center gap-2 mb-4">
                      <div className="p-1.5 rounded-lg bg-primary/10">
                        <UtensilsCrossed className="w-5 h-5 text-primary" />
                      </div>
                      <h2 className="text-xl font-black text-foreground">جميع المطاعم</h2>
                      <Badge variant="secondary" className="mr-auto">{rest.length}</Badge>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                      {rest.map(r => (
                        <RestaurantCard key={r.id} r={r} onClick={() => navigate(`/restaurants/${r.id}`)} />
                      ))}
                    </div>
                  </section>
                )}

                {/* Empty state */}
                {filtered.length === 0 && (
                  <div className="text-center py-16 space-y-3">
                    <div className="text-6xl">🍽️</div>
                    <p className="font-black text-xl">لا توجد مطاعم في {selectedCity} حالياً</p>
                    <p className="text-muted-foreground text-sm">جرّب اختيار مدينة أخرى</p>
                  </div>
                )}
              </>
            )}

            {/* Cuisine filter results (shown when a specific cuisine is selected) */}
            {!loading && !search && cuisineFilter !== "all" && (
              <>
                {filtered.length === 0 ? (
                  <div className="text-center py-16 space-y-3">
                    <div className="text-5xl">🍽️</div>
                    <p className="font-bold text-lg">لا توجد مطاعم بهذا النوع في {selectedCity}</p>
                    <button onClick={() => setCuisineFilter("all")} className="text-primary text-sm hover:underline">عرض جميع المطاعم</button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {filtered.map(r => (
                      <RestaurantCard key={r.id} r={r} onClick={() => navigate(`/restaurants/${r.id}`)} />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ── Grocery Tab ── */}
        {activeTab === "grocery" && (
          <ComingSoonSection label="البقالة" emoji="🛒" gradient="from-emerald-500 to-green-600" />
        )}

        {/* ── Pharmacy Tab ── */}
        {activeTab === "pharmacy" && (
          <ComingSoonSection label="الصيدلية" emoji="💊" gradient="from-blue-500 to-sky-600" />
        )}
      </div>
    </div>
  );
};

export default DeliveryHubPage;
