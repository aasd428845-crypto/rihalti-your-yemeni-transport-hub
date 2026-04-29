import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import {
  Tag,
  ChevronLeft,
  ChevronRight,
  Flame,
  Sparkles,
  Zap,
  Shield,
  Star,
  TrendingUp,
  ChevronLeft as ArrowLeftIcon,
} from "lucide-react";
import { getRestaurantCuisines } from "@/lib/restaurantApi";
import { supabase } from "@/integrations/supabase/client";
import FavoriteHeart from "@/components/customer/FavoriteHeart";
import DeliveryRequestBanner from "@/components/customer/DeliveryRequestBanner";
import FeaturedRestaurantsSection from "@/components/customer/FeaturedRestaurantsSection";

// ─── Reusable: Section header ────────────────────────────────────────────────
const SectionHeader = ({
  title,
  icon: Icon,
  onMore,
}: {
  title: string;
  icon?: any;
  onMore?: () => void;
}) => (
  <div className="flex items-center justify-between mb-1.5">
    <h2 className="text-[15px] font-black text-foreground flex items-center gap-1.5">
      {Icon && <Icon className="w-4 h-4 text-primary" />}
      {title}
    </h2>
    {onMore && (
      <button
        onClick={onMore}
        className="text-xs text-primary font-semibold flex items-center gap-0.5"
      >
        عرض الكل
        <ArrowLeftIcon className="w-3.5 h-3.5" />
      </button>
    )}
  </div>
);

// Small feature pills (توصيل سريع، دفع آمن، …)
const FEATURES = [
  { icon: Zap, label: "توصيل سريع", color: "text-amber-500" },
  { icon: Shield, label: "دفع آمن", color: "text-emerald-500" },
  { icon: Star, label: "تقييمات موثوقة", color: "text-orange-500" },
  { icon: TrendingUp, label: "أسعار تنافسية", color: "text-blue-500" },
];

// ─── Item Card (used by Most-rated & Featured) ───────────────────────────────
const ItemCard = ({ item }: { item: any }) => {
  const navigate = useNavigate();
  const price = item.discounted_price ?? item.price;
  const hasDiscount =
    item.discounted_price && item.discounted_price < item.price;
  const ratingNum = Number(item.rating || 0);

  return (
    <div
      onClick={() => item.restaurant_id && navigate(`/restaurants/${item.restaurant_id}`)}
      className="min-w-[140px] w-[140px] bg-card rounded-xl border border-border/40 overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all text-right shrink-0 cursor-pointer"
    >
      <div className="relative w-full h-[90px] bg-muted">
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.name_ar}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-2xl">
            🍔
          </div>
        )}
        {/* Favorite heart top-right */}
        <div className="absolute top-1.5 right-1.5">
          <FavoriteHeart entityType="menu_item" entityId={item.id} size="sm" />
        </div>
        {/* Rating bottom-right pill (replaces time pill) — always shown */}
        <div className="absolute bottom-1.5 right-1.5 bg-emerald-600 text-white text-[10px] font-bold rounded-md px-1.5 py-0.5 shadow inline-flex items-center gap-0.5">
          <Star className="w-2.5 h-2.5 fill-yellow-300 text-yellow-300" />
          {ratingNum > 0 ? ratingNum.toFixed(1) : "جديد"}
        </div>
        {hasDiscount && (
          <Badge className="absolute bottom-1.5 left-1.5 bg-red-500 hover:bg-red-500 text-white text-[9px] font-bold border-0 shadow px-1.5 py-0">
            خصم
          </Badge>
        )}
      </div>
      <div className="p-2">
        <p className="font-bold text-[12px] text-foreground leading-tight line-clamp-1">
          {item.name_ar}
        </p>
        {item.restaurants?.name_ar && (
          <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">
            {item.restaurants.name_ar}
          </p>
        )}
        <div className="flex items-center justify-between mt-1">
          <span className="text-primary font-black text-[12px]">
            {Number(price).toLocaleString("ar-YE")} ر.ي
          </span>
          {hasDiscount && (
            <span className="text-[10px] text-muted-foreground line-through">
              {Number(item.price).toLocaleString("ar-YE")}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Most-rated Items section (was "الأكثر طلباً") ──────────────────────────
const TopRatedItems = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    // Try ordering by rating first; fall back to is_popular if rating column missing.
    supabase
      .from("menu_items")
      .select(
        "id, name_ar, image_url, price, discounted_price, preparation_time, rating, total_ratings, restaurant_id, restaurants(name_ar, estimated_delivery_time)",
      )
      .eq("is_available", true)
      .order("rating", { ascending: false })
      .order("total_ratings", { ascending: false })
      .limit(10)
      .then(({ data, error }) => {
        if (error) {
          // Fallback: rating column may not exist yet. Use is_popular.
          supabase
            .from("menu_items")
            .select("id, name_ar, image_url, price, discounted_price, preparation_time, restaurant_id, restaurants(name_ar, estimated_delivery_time)")
            .eq("is_popular", true)
            .eq("is_available", true)
            .limit(10)
            .then(({ data: d2 }) => setItems(d2 || []));
        } else {
          setItems(data || []);
        }
      });
  }, []);

  if (items.length === 0) return null;

  return (
    <div>
      <SectionHeader
        title="الأكثر تقييماً"
        icon={Flame}
        onMore={() => navigate("/food")}
      />
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-4 px-4">
        {items.map((it) => (
          <ItemCard key={it.id} item={it} />
        ))}
      </div>
    </div>
  );
};

// ─── Featured Items (مختارات لك) ─────────────────────────────────────────────
const FeaturedItems = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    supabase
      .from("menu_items")
      .select(
        "id, name_ar, image_url, price, discounted_price, preparation_time, rating, total_ratings, restaurant_id, restaurants(name_ar, estimated_delivery_time)",
      )
      .eq("is_featured", true)
      .eq("is_available", true)
      .limit(10)
      .then(({ data }) => setItems(data || []));
  }, []);

  if (items.length === 0) return null;

  return (
    <div>
      <SectionHeader
        title="مختارات لك"
        icon={Sparkles}
        onMore={() => navigate("/food")}
      />
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-4 px-4">
        {items.map((it) => (
          <ItemCard key={it.id} item={it} />
        ))}
      </div>
    </div>
  );
};

// ─── Default carousel banners if DB has none ──────────────────────────────────
const DEFAULT_BANNERS = [
  {
    id: "d1",
    title: "اطلب من مطاعمك المفضلة",
    subtitle: "توصيل سريع لباب منزلك",
    image_url: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200&q=80&fit=crop",
    badge_text: "جديد",
    link_url: "/food",
    banner_type: "carousel",
  },
  {
    id: "d2",
    title: "خدمات توصيل، تسوق، انقل من أي مكان",
    subtitle: "مناديب لتوصيل طرودك وطلباتك في أسرع وقت",
    image_url: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1200&q=80&fit=crop",
    badge_text: "متاح الآن",
    link_url: "/delivery-request",
    banner_type: "carousel",
  },
  {
    id: "d3",
    title: "عروض حصرية كل يوم",
    subtitle: "لا تفوّت أفضل الأسعار",
    image_url: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=1200&q=80&fit=crop",
    badge_text: "عرض محدود",
    link_url: "/food",
    banner_type: "carousel",
  },
];

// Default offer tiles if DB has none
const DEFAULT_OFFERS = [
  {
    id: "o1",
    title: "خصم 20% على أول طلب",
    subtitle: "لعملاء وصل الجدد",
    image_url: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&q=80&fit=crop",
    badge_text: "عرض خاص",
    link_url: "/food",
    banner_type: "offer",
  },
  {
    id: "o2",
    title: "توصيل مجاني",
    subtitle: "عند الطلب فوق 2000 ر.ي",
    image_url: "https://images.unsplash.com/photo-1519984388953-d2406bc725e1?w=600&q=80&fit=crop",
    badge_text: "مجاني",
    link_url: "/food",
    banner_type: "offer",
  },
  {
    id: "o3",
    title: "وجبات البرجر المميزة",
    subtitle: "أقل سعر في المدينة",
    image_url: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&q=80&fit=crop",
    badge_text: "تخفيض",
    link_url: "/food",
    banner_type: "offer",
  },
];

// Default service tiles
const DEFAULT_SERVICE_TILES = [
  {
    key: "food",
    label: "مطاعم وتوصيل",
    img: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&q=80&fit=crop",
    action: "food",
  },
  {
    key: "grocery",
    label: "بقالة وتسوق",
    img: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=600&q=80&fit=crop",
    action: "grocery",
  },
  {
    key: "pharmacy",
    label: "صيدليات",
    img: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600&q=80&fit=crop",
    action: "pharmacy",
  },
  {
    key: "more",
    label: "المزيد",
    img: "https://images.unsplash.com/photo-1607344645866-009c320b63e0?w=600&q=80&fit=crop",
    action: "more",
  },
];

// ─── Hero Banner Carousel ─────────────────────────────────────────────────────
const BannerCarousel = ({ banners, onNavigate }: { banners: any[]; onNavigate: (url: string) => void }) => {
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

  const handleClick = (banner: any) => {
    let dest = banner.link_url || (banner.link_tab === "more" ? "/shipments" : banner.link_tab ? `/food?tab=${banner.link_tab}` : null);
    // Defensive: legacy banners stored in DB that still point to the old "/shipment-request"
    // should open the new customer delivery-request flow instead.
    if (dest === "/shipment-request") dest = "/delivery-request";
    if (dest) onNavigate(dest);
  };

  if (!banners.length) return null;

  return (
    <div className="relative w-full overflow-hidden rounded-xl shadow-md" style={{ aspectRatio: "16/8", minHeight: 130, maxHeight: 200 }}>
      {banners.map((banner, i) => (
        <div
          key={banner.id}
          className={`absolute inset-0 transition-opacity duration-700 ${i === idx ? "opacity-100" : "opacity-0 pointer-events-none"} ${banner.link_url || banner.link_tab ? "cursor-pointer" : ""}`}
          onClick={() => i === idx && handleClick(banner)}
        >
          <img src={banner.image_url} alt={banner.title || ""} className="w-full h-full object-cover" loading={i === 0 ? "eager" : "lazy"} />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          {banner.badge_text && (
            <Badge className="absolute top-3 right-3 bg-amber-500 text-white border-0 shadow-lg font-bold text-xs">{banner.badge_text}</Badge>
          )}
          {(banner.title || banner.subtitle) && (
            <div className="absolute bottom-8 right-4 left-4 text-white">
              {banner.title && <h3 className="text-xl font-black drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] leading-tight">{banner.title}</h3>}
              {banner.subtitle && <p className="text-sm text-white/90 mt-1 drop-shadow font-medium">{banner.subtitle}</p>}
            </div>
          )}
        </div>
      ))}
      {banners.length > 1 && (
        <>
          <button onClick={(e) => { e.stopPropagation(); go(-1); }} className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/70 z-10"><ChevronRight className="w-4 h-4" /></button>
          <button onClick={(e) => { e.stopPropagation(); go(1); }} className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/70 z-10"><ChevronLeft className="w-4 h-4" /></button>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
            {banners.map((_, i) => (
              <button key={i} onClick={(e) => { e.stopPropagation(); setIdx(i); }} className={`rounded-full transition-all duration-300 ${i === idx ? "w-5 h-2 bg-white" : "w-2 h-2 bg-white/50"}`} />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

// ─── Categories Scroller (circular) ──────────────────────────────────────────
const CategoryScroller = ({ onNavigate }: { onNavigate: (url: string) => void }) => {
  const [cats, setCats] = useState<any[]>([]);

  useEffect(() => {
    supabase
      .from("menu_categories")
      .select("id, name_ar, image_url, restaurant_id")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .limit(12)
      .then(({ data }) => setCats(data || []));
  }, []);

  if (cats.length === 0) return null;

  // De-duplicate by name_ar so the scroller stays clean.
  const seen = new Set<string>();
  const unique = cats.filter((c) => {
    if (seen.has(c.name_ar)) return false;
    seen.add(c.name_ar);
    return true;
  });

  return (
    <section>
      <div className="flex items-center justify-between mb-1.5">
        <h2 className="text-[15px] font-black text-foreground">التصنيفات</h2>
        <button
          onClick={() => onNavigate("/food?tab=restaurants")}
          className="text-xs text-primary font-semibold flex items-center gap-0.5"
        >
          عرض الكل
          <ArrowLeftIcon className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-4 px-4">
        {unique.map((c) => (
          <button
            key={c.id}
            onClick={() =>
              onNavigate(`/food?tab=restaurants&category=${encodeURIComponent(c.name_ar)}`)
            }
            className="flex flex-col items-center gap-1 shrink-0 group"
            style={{ minWidth: 60 }}
          >
            <div className="w-14 h-14 rounded-2xl overflow-hidden bg-card border border-border/40 shadow-sm group-hover:shadow-md group-hover:-translate-y-0.5 transition-all">
              {c.image_url ? (
                <img
                  src={c.image_url}
                  alt={c.name_ar}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full bg-primary/10 flex items-center justify-center text-xl">
                  🍽️
                </div>
              )}
            </div>
            <span className="text-[10px] font-bold text-foreground text-center leading-tight max-w-[60px] truncate">
              {c.name_ar}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
};

// ─── Offers / Deals Horizontal Scroll ─────────────────────────────────────────
const OffersSection = ({ offers, onNavigate }: { offers: any[]; onNavigate: (url: string) => void }) => {
  if (!offers.length) return null;
  return (
    <section>
      <div className="flex items-center gap-1.5 mb-1.5">
        <div className="p-1 rounded-md bg-red-500/10">
          <Tag className="w-3.5 h-3.5 text-red-500" />
        </div>
        <h2 className="text-[15px] font-black text-foreground">عروض وخصومات</h2>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-4 px-4">
        {offers.map((offer) => (
          <button
            key={offer.id}
            onClick={() => {
              let dest = offer.link_url || "/food";
              if (dest === "/shipment-request") dest = "/delivery-request";
              onNavigate(dest);
            }}
            className="relative shrink-0 rounded-xl overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 group cursor-pointer"
            style={{ width: 130, height: 72 }}
          >
            <img src={offer.image_url} alt={offer.title || ""} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
            {offer.badge_text && (
              <Badge className="absolute top-2 right-2 bg-red-500 text-white border-0 shadow text-[10px] font-bold px-1.5 py-0.5">{offer.badge_text}</Badge>
            )}
            <div className="absolute bottom-0 right-0 left-0 p-2 text-white text-right">
              {offer.title && <p className="font-black text-xs leading-tight drop-shadow">{offer.title}</p>}
              {offer.subtitle && <p className="text-[10px] text-white/80 mt-0.5 drop-shadow leading-tight">{offer.subtitle}</p>}
            </div>
          </button>
        ))}
      </div>
    </section>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const DeliveryHubPage = () => {
  const navigate = useNavigate();
  const [carouselBanners, setCarouselBanners] = useState<any[]>([]);
  const [offerBanners, setOfferBanners] = useState<any[]>([]);
  const [serviceTiles, setServiceTiles] = useState<any[]>([]);
  // Whether any banner row exists in the DB. If yes, the company is actively
  // managing this section, so we should respect explicit empty states (e.g.
  // they deleted all service tiles) instead of falling back to defaults.
  const [companyManaged, setCompanyManaged] = useState(false);

  useEffect(() => {
    supabase
      .from("delivery_banners" as any)
      .select("*")
      .eq("is_active", true)
      .order("sort_order")
      .then(({ data }) => {
        const bannersData = data || [];
        const carousel = bannersData.filter((b: any) => !b.banner_type || b.banner_type === "carousel");
        const offers = bannersData.filter((b: any) => b.banner_type === "offer");
        const tiles = bannersData.filter((b: any) => b.banner_type === "service_tile");
        setCompanyManaged(bannersData.length > 0);
        setCarouselBanners(carousel.length > 0 ? carousel : DEFAULT_BANNERS);
        setOfferBanners(offers.length > 0 ? offers : DEFAULT_OFFERS);
        setServiceTiles(tiles);
      }, () => {
        setCompanyManaged(false);
        setCarouselBanners(DEFAULT_BANNERS);
        setOfferBanners(DEFAULT_OFFERS);
        setServiceTiles([]);
      });
  }, []);

  // Tile click handler
  const handleTileClick = (tile: any) => {
    const action = tile.tile_action || tile.action || tile.key || "food";
    if (action === "food" || action === "restaurants") navigate("/food");
    else if (action === "grocery") navigate("/food?tab=grocery");
    else if (action === "pharmacy") navigate("/food?tab=pharmacy");
    else if (action === "more") navigate("/shipments");
    else if (tile.link_url) {
      const dest = tile.link_url === "/shipment-request" ? "/delivery-request" : tile.link_url;
      navigate(dest);
    }
    else navigate("/food");
  };

  // If the company has any banner rows in the DB, respect the empty
  // service_tiles state (they intentionally deleted all tiles). Only fall back
  // to defaults for a brand-new install where the company hasn't set anything.
  const displayTiles =
    serviceTiles.length > 0
      ? serviceTiles
      : companyManaged
        ? []
        : DEFAULT_SERVICE_TILES;

  return (
    <div className="min-h-screen bg-background pb-24" dir="rtl">
      <div className="container mx-auto px-3 max-w-5xl space-y-2.5 pt-2">

        {/* ── 1. Service Tiles (image only, no colored gradient) ── */}
        {displayTiles.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {displayTiles.map((tile: any, idx: number) => {
            const imgSrc = tile.image_url || tile.img || "";
            const label = tile.title || tile.label || "";
            return (
              <button
                key={tile.id || tile.key || idx}
                onClick={() => handleTileClick(tile)}
                className="relative rounded-xl overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 group h-20"
              >
                {imgSrc && (
                  <img
                    src={imgSrc}
                    alt={label}
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                )}
                {/* Only a subtle dark gradient for text readability — no color overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                {/* Label at bottom */}
                <div className="absolute bottom-0 right-0 left-0 px-3 py-2.5 flex items-center justify-center">
                  <span className="font-black text-sm text-white leading-tight text-center drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
                    {label}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
        )}

        {/* ── 2. Hero Banner Carousel ── */}
        <BannerCarousel banners={carouselBanners} onNavigate={navigate} />

        {/* ── 3. Offers / Deals Section ── */}
        <OffersSection offers={offerBanners} onNavigate={navigate} />

        {/* ── 4. Categories (circular scroller) ── */}
        <CategoryScroller onNavigate={navigate} />

        {/* ── 5. Most rated ── */}
        <TopRatedItems />

        {/* ── 6. Delivery request banner (small green CTA) ── */}
        <DeliveryRequestBanner />

        {/* ── 7. Featured for you ── */}
        <FeaturedItems />

        {/* ── 8. Featured restaurants (highest-rated marked-as-featured) ── */}
        <FeaturedRestaurantsSection />

        {/* ── 9. Feature pills (fast delivery, secure payment, …) ── */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
          {FEATURES.map((feat) => (
            <div
              key={feat.label}
              className="flex items-center gap-1 shrink-0 bg-card border border-border/40 rounded-full px-2.5 py-1 shadow-sm"
            >
              <feat.icon className={`w-3 h-3 ${feat.color}`} />
              <span className="text-[10px] font-semibold text-foreground whitespace-nowrap">
                {feat.label}
              </span>
            </div>
          ))}
        </div>

        {/* ── 8. Platform stats (مطاعم / مدينة / تقييم) ── */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { num: "+500", label: "مطعم" },
            { num: "+20", label: "مدينة" },
            { num: "4.9 ⭐", label: "تقييم" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-card border border-border/40 rounded-xl p-2 text-center shadow-sm"
            >
              <p className="font-black text-sm text-primary">{stat.num}</p>
              <p className="text-[10px] text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
};

export default DeliveryHubPage;
