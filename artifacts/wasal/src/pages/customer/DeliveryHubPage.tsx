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
  Clock,
  ChevronLeft as ArrowLeftIcon,
  Heart,
} from "lucide-react";
import { getRestaurantCuisines } from "@/lib/restaurantApi";
import { supabase } from "@/integrations/supabase/client";
import { getCustomerActiveOffers, type DeliveryOffer } from "@/lib/deliveryOffersApi";
import { computeItemPromo, isPromoScheduleActive } from "@/lib/promotionsApi";
import FavoriteHeart from "@/components/customer/FavoriteHeart";
import DeliveryRequestBanner from "@/components/customer/DeliveryRequestBanner";
import FeaturedRestaurantsSection from "@/components/customer/FeaturedRestaurantsSection";
import SharedCategoryScroller from "@/components/customer/CategoryScroller";

// ─── Promo fields to always SELECT on menu_items ─────────────────────────────
const PROMO_SELECT =
  "id, name_ar, image_url, price, discounted_price, preparation_time, rating, total_ratings, restaurant_id, " +
  "promo_type, promo_value, promo_text, promo_active, promo_starts_at, promo_ends_at, promo_active_days, promo_start_time, promo_end_time, " +
  "restaurants(name_ar, estimated_delivery_time)";

// ─── Shared: compute effective promo for a menu item ─────────────────────────
function getEffectivePromo(item: any) {
  const scheduleOk = isPromoScheduleActive(item);
  return computeItemPromo({ ...item, promo_active: scheduleOk && !!item.promo_active });
}

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

// ─── Item Card (small, 120px — for TopRated & Featured) ──────────────────────
const ItemCard = ({ item }: { item: any }) => {
  const navigate = useNavigate();
  const { originalPrice, finalPrice, promoLabel, hasPromo } = getEffectivePromo(item);
  const showDiscount = hasPromo && finalPrice < originalPrice;
  const discountPct =
    showDiscount && item.promo_type === "discount_percent" && item.promo_value
      ? item.promo_value
      : showDiscount
      ? Math.round((1 - finalPrice / originalPrice) * 100)
      : 0;
  const ratingNum = Number(item.rating || 0);
  const deliveryTime = item.restaurants?.estimated_delivery_time;

  return (
    <div
      onClick={() => item.restaurant_id && navigate(`/restaurants/${item.restaurant_id}`)}
      className="w-[120px] shrink-0 cursor-pointer hover:-translate-y-0.5 transition-all"
    >
      {/* ── صورة مع badges ── */}
      <div className="relative w-full h-[110px] rounded-xl bg-muted overflow-hidden shadow-sm">
        {item.image_url ? (
          <img src={item.image_url} alt={item.name_ar} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl">🍔</div>
        )}

        {/* قلب المفضلة */}
        <div className="absolute top-1.5 right-1.5">
          <FavoriteHeart entityType="menu_item" entityId={item.id} size="sm" />
        </div>

        {/* شارة خصم نسبي */}
        {showDiscount && discountPct > 0 && (
          <span className="absolute top-1.5 left-1.5 bg-red-500 text-white text-[8px] font-black rounded-md px-1 py-0.5 shadow">
            -{discountPct}%
          </span>
        )}
        {/* نص عرض مخصص (custom_text) */}
        {hasPromo && !showDiscount && promoLabel && (
          <span className="absolute top-1.5 left-1.5 bg-amber-500 text-white text-[8px] font-black rounded-md px-1 py-0.5 shadow line-clamp-1 max-w-[60px]">
            {promoLabel}
          </span>
        )}

        {/* وقت + تقييم — أسفل الصورة */}
        <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-1.5 pb-1.5 gap-1">
          {deliveryTime ? (
            <span className="inline-flex items-center gap-0.5 bg-black/65 backdrop-blur-sm text-white text-[9px] font-bold px-1 py-0.5 rounded-md">
              <Clock className="w-2 h-2" />{deliveryTime}
            </span>
          ) : <span />}
          <span className="inline-flex items-center gap-0.5 bg-black/65 backdrop-blur-sm text-white text-[9px] font-bold px-1 py-0.5 rounded-md">
            <Star className="w-2 h-2 fill-amber-400 text-amber-400" />
            {ratingNum > 0 ? ratingNum.toFixed(1) : "جديد"}
          </span>
        </div>
      </div>

      {/* ── نصوص ── */}
      <div className="pt-1.5 pb-1 px-0.5 text-center space-y-0.5">
        <p className="font-bold text-[11px] text-foreground leading-tight line-clamp-2">{item.name_ar}</p>
        {item.restaurants?.name_ar && (
          <p className="text-[9px] text-muted-foreground line-clamp-1">{item.restaurants.name_ar}</p>
        )}
        {showDiscount ? (
          <div className="flex items-center justify-center gap-1 flex-wrap">
            <span className="text-[9px] text-muted-foreground line-through">{Number(originalPrice).toLocaleString()} ر.ي</span>
            <span className="text-[12px] font-extrabold" style={{ color: "#2E7D32" }}>{Number(finalPrice).toLocaleString()} ر.ي</span>
          </div>
        ) : (
          <p className="text-[12px] font-extrabold text-primary">{Number(finalPrice).toLocaleString()} ر.ي</p>
        )}
      </div>
    </div>
  );
};

// ─── Meal Offer Card (wider, 160px — for عروض الوجبات section) ───────────────
const MealOfferCard = ({ item }: { item: any }) => {
  const navigate = useNavigate();
  const { originalPrice, finalPrice, promoLabel } = getEffectivePromo(item);
  const showDiscount = finalPrice < originalPrice;
  const discountPct =
    item.promo_type === "discount_percent" && item.promo_value
      ? item.promo_value
      : showDiscount
      ? Math.round((1 - finalPrice / originalPrice) * 100)
      : 0;
  const deliveryTime = item.restaurants?.estimated_delivery_time;

  return (
    <div
      onClick={() => item.restaurant_id && navigate(`/restaurants/${item.restaurant_id}`)}
      className="shrink-0 cursor-pointer hover:-translate-y-0.5 transition-all rounded-2xl overflow-hidden bg-white"
      style={{ width: 160, boxShadow: "0 4px 16px rgba(0,0,0,0.10)" }}
    >
      {/* صورة الوجبة */}
      <div className="relative w-full overflow-hidden bg-muted" style={{ height: 120 }}>
        {item.image_url ? (
          <img src={item.image_url} alt={item.name_ar} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-5xl">🍽️</div>
        )}

        {/* شارة الخصم — يسار أعلى */}
        {discountPct > 0 && (
          <span className="absolute top-2 left-2 bg-red-500 text-white text-[9px] font-black rounded-full px-1.5 py-0.5 shadow-md">
            -{discountPct}%
          </span>
        )}
        {!discountPct && promoLabel && (
          <span className="absolute top-2 left-2 bg-amber-500 text-white text-[9px] font-black rounded-full px-1.5 py-0.5 shadow-md">
            {promoLabel}
          </span>
        )}

        {/* زر المفضلة — يمين أعلى */}
        <div
          className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white flex items-center justify-center shadow"
          onClick={(e) => e.stopPropagation()}
        >
          <FavoriteHeart entityType="menu_item" entityId={item.id} size="sm" />
        </div>
      </div>

      {/* معلومات الوجبة */}
      <div className="p-2 text-right space-y-0.5">
        <p className="font-bold text-[13px] text-gray-900 leading-tight line-clamp-1">{item.name_ar}</p>
        {item.restaurants?.name_ar && (
          <p className="text-[11px] text-gray-400 line-clamp-1">{item.restaurants.name_ar}</p>
        )}

        {/* صف السعر */}
        {showDiscount ? (
          <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
            <span className="text-[10px] text-gray-400 line-through">{Number(originalPrice).toLocaleString()} ر.ي</span>
            <span className="text-[13px] font-extrabold" style={{ color: "#2E7D32" }}>{Number(finalPrice).toLocaleString()} ر.ي</span>
          </div>
        ) : (
          <p className="text-[13px] font-extrabold text-primary pt-0.5">{Number(finalPrice).toLocaleString()} ر.ي</p>
        )}

        {/* وقت التوصيل */}
        {deliveryTime && (
          <span className="inline-flex items-center gap-0.5 bg-gray-100 text-gray-500 text-[9px] font-semibold px-1.5 py-0.5 rounded-full mt-0.5">
            <Clock className="w-2.5 h-2.5" />{deliveryTime}
          </span>
        )}
      </div>
    </div>
  );
};

// ─── Most-rated Items section ─────────────────────────────────────────────────
const TopRatedItems = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    (supabase.from("menu_items") as any)
      .select(PROMO_SELECT)
      .eq("is_available", true)
      .order("rating", { ascending: false })
      .order("total_ratings", { ascending: false })
      .limit(10)
      .then(({ data, error }: any) => {
        if (error) {
          (supabase.from("menu_items") as any)
            .select(PROMO_SELECT)
            .eq("is_popular", true)
            .eq("is_available", true)
            .limit(10)
            .then(({ data: d2 }: any) => setItems(d2 || []));
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
    (supabase.from("menu_items") as any)
      .select(PROMO_SELECT)
      .eq("is_featured", true)
      .eq("is_available", true)
      .limit(10)
      .then(({ data }: any) => setItems(data || []));
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

// ─── عروض الوجبات Section (NEW) ───────────────────────────────────────────────
const MealOffersSection = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (supabase.from("menu_items") as any)
      .select(PROMO_SELECT)
      .eq("promo_active", true)
      .eq("is_available", true)
      .order("promo_value", { ascending: false })
      .limit(20)
      .then(({ data }: any) => {
        const now = new Date();
        const active = (data || []).filter((item: any) => isPromoScheduleActive(item));
        // Sort: highest discount percentage first
        active.sort((a: any, b: any) => {
          const pctA = a.promo_type === "discount_percent" ? (a.promo_value || 0) :
            (a.price && a.promo_value && a.promo_type === "fixed_price") ? Math.round((1 - a.promo_value / a.price) * 100) : 0;
          const pctB = b.promo_type === "discount_percent" ? (b.promo_value || 0) :
            (b.price && b.promo_value && b.promo_type === "fixed_price") ? Math.round((1 - b.promo_value / b.price) * 100) : 0;
          return pctB - pctA;
        });
        setItems(active.slice(0, 10));
        setLoaded(true);
      });
  }, []);

  // Hide if no active meal offers
  if (loaded && items.length === 0) return null;
  if (!loaded) return null;

  return (
    <div>
      <SectionHeader
        title="🔥 عروض الوجبات"
        onMore={() => navigate("/food")}
      />
      <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide -mx-4 px-4">
        {items.map((it) => (
          <MealOfferCard key={it.id} item={it} />
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

// Default offer tiles if DB has none — restaurant/delivery level only
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
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    timerRef.current = setInterval(() => setIdx(i => (i + 1) % banners.length), 4500);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [banners.length]);

  const go = (dir: number) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIdx(i => (i + dir + banners.length) % banners.length);
  };

  const handleClick = (banner: any) => {
    let dest = banner.link_url || (banner.link_tab === "more" ? "/shipments" : banner.link_tab ? `/food?tab=${banner.link_tab}` : null);
    if (dest === "/shipment-request") dest = "/delivery-request";
    if (dest) onNavigate(dest);
  };

  if (!banners.length) return null;

  return (
    <div className="relative w-full overflow-hidden rounded-xl shadow-md" style={{ aspectRatio: "16/7", minHeight: 100, maxHeight: 148 }}>
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

// ─── Offers / Deals Horizontal Scroll — restaurant/delivery offers ONLY ──────
// Bug #3 fix: this section ONLY shows delivery_company_offers (restaurant-level).
// Meal-item offers are displayed separately via MealOffersSection above.
const OFFER_PLACEHOLDER_IMAGES: Record<string, string> = {
  free_delivery: "https://images.unsplash.com/photo-1519984388953-d2406bc725e1?w=400&q=80&fit=crop",
  percent_off_delivery: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&q=80&fit=crop",
  fixed_off_delivery: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&q=80&fit=crop",
};

const OffersSection = ({
  offers,
  onNavigate,
}: {
  offers: (DeliveryOffer & { link_url?: string; subtitle?: string })[];
  onNavigate: (url: string) => void;
}) => {
  if (!offers.length) return null;

  const VALID_PATHS = ["/food", "/delivery-request", "/restaurants", "/shipments", "/deliveries", "/history", "/trips"];
  const isSafePath = (p: string) => VALID_PATHS.some(v => p === v || p.startsWith(v + "/") || p.startsWith(v + "?"));

  const handleOfferClick = (offer: DeliveryOffer & { link_url?: string }) => {
    if (offer.restaurant_id) {
      onNavigate(`/restaurants/${offer.restaurant_id}`);
      return;
    }
    let dest = (offer as any).link_url as string | undefined;
    if (!dest) { onNavigate("/food"); return; }
    if (dest === "/shipment-request" || dest === "/shipments") dest = "/delivery-request";
    onNavigate(isSafePath(dest) ? dest : "/food");
  };

  return (
    <section>
      <div className="flex items-center gap-1.5 mb-1.5">
        <div className="p-1 rounded-md bg-red-500/10">
          <Tag className="w-3.5 h-3.5 text-red-500" />
        </div>
        <h2 className="text-[15px] font-black text-foreground">عروض وخصومات التوصيل</h2>
      </div>
      <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-hide -mx-4 px-4">
        {offers.map((offer) => {
          const imgSrc =
            offer.image_url ||
            OFFER_PLACEHOLDER_IMAGES[(offer as any).offer_type as string] ||
            OFFER_PLACEHOLDER_IMAGES.free_delivery;
          const subtitle = (offer as any).subtitle || offer.description || null;
          const badge = offer.badge_text || (offer as any).badge_text;
          return (
            <button
              key={offer.id}
              onClick={() => handleOfferClick(offer)}
              className="shrink-0 rounded-xl overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer bg-card border border-border/30 flex"
              style={{ width: 185, height: 66 }}
            >
              <div className="w-[66px] h-full shrink-0 overflow-hidden">
                <img src={imgSrc} alt={offer.title || ""} className="w-full h-full object-cover" loading="lazy" />
              </div>
              <div className="flex-1 px-2.5 py-2 flex flex-col justify-center text-right">
                {badge && (
                  <span className="inline-block self-end bg-primary text-primary-foreground text-[8px] font-black rounded-md px-1.5 py-0.5 mb-1 leading-none">
                    {badge}
                  </span>
                )}
                {offer.title && (
                  <p className="font-black text-[11px] text-foreground leading-tight line-clamp-1">{offer.title}</p>
                )}
                {subtitle && (
                  <p className="text-[9px] text-muted-foreground mt-0.5 leading-tight line-clamp-2">{subtitle}</p>
                )}
                {offer.restaurant && (
                  <p className="text-[9px] text-primary/70 mt-0.5 font-semibold line-clamp-1">
                    {offer.restaurant.name_ar}
                  </p>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const DeliveryHubPage = () => {
  const navigate = useNavigate();
  const [carouselBanners, setCarouselBanners] = useState<any[] | null>(null);
  const [offerBanners, setOfferBanners] = useState<any[] | null>(null);
  const [liveOffers, setLiveOffers] = useState<DeliveryOffer[]>([]);
  const [serviceTiles, setServiceTiles] = useState<any[]>([]);
  const [bannersLoaded, setBannersLoaded] = useState(false);
  const [companyManaged, setCompanyManaged] = useState(false);

  useEffect(() => {
    Promise.all([
      supabase
        .from("delivery_banners" as any)
        .select("*")
        .eq("is_active", true)
        .order("sort_order"),
      getCustomerActiveOffers(),
    ]).then(([bannersRes, liveOffersData]) => {
      const bannersData = bannersRes.data || [];
      const carousel = bannersData.filter((b: any) => !b.banner_type || b.banner_type === "carousel");
      const bannerOffers = bannersData.filter((b: any) => b.banner_type === "offer");
      const tiles = bannersData.filter((b: any) => b.banner_type === "service_tile");
      setCompanyManaged(bannersData.length > 0);
      setCarouselBanners(carousel.length > 0 ? carousel : DEFAULT_BANNERS);
      setLiveOffers(liveOffersData);
      setOfferBanners(liveOffersData.length > 0 ? [] : (bannerOffers.length > 0 ? bannerOffers : DEFAULT_OFFERS));
      setServiceTiles(tiles);
      setBannersLoaded(true);
    }).catch(() => {
      setCompanyManaged(false);
      setCarouselBanners(DEFAULT_BANNERS);
      setLiveOffers([]);
      setOfferBanners(DEFAULT_OFFERS);
      setServiceTiles([]);
      setBannersLoaded(true);
    });
  }, []);

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

  const displayTiles =
    serviceTiles.length > 0
      ? serviceTiles
      : companyManaged
        ? []
        : DEFAULT_SERVICE_TILES;

  return (
    <div className="min-h-screen bg-background pb-24" dir="rtl">
      <div className="container mx-auto px-3 max-w-5xl space-y-2.5 pt-2">

        {/* ── 1. Service Tiles ── */}
        {!bannersLoaded ? (
          <div className="grid grid-cols-2 gap-2">
            {[1,2,3,4].map(i => <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />)}
          </div>
        ) : displayTiles.length > 0 && (
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
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
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
        {!bannersLoaded
          ? <div className="w-full rounded-xl bg-muted animate-pulse" style={{ aspectRatio: "16/8", minHeight: 130, maxHeight: 200 }} />
          : <BannerCarousel banners={carouselBanners!} onNavigate={navigate} />}

        {/* ── 3. عروض وخصومات التوصيل (restaurant/delivery offers ONLY — Bug #3) ── */}
        {bannersLoaded && (
          <OffersSection
            offers={liveOffers.length > 0 ? liveOffers : offerBanners!}
            onNavigate={navigate}
          />
        )}

        {/* ── 4. Categories (circular scroller) ── */}
        <SharedCategoryScroller />

        {/* ── 5. عروض الوجبات (NEW — meal-item offers section) ── */}
        <MealOffersSection />

        {/* ── 6. Most rated ── */}
        <TopRatedItems />

        {/* ── 7. Delivery request banner (small green CTA) ── */}
        <DeliveryRequestBanner />

        {/* ── 8. Featured for you ── */}
        <FeaturedItems />

        {/* ── 9. Featured restaurants ── */}
        <FeaturedRestaurantsSection />

        {/* ── 10. Feature pills ── */}
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

        {/* ── 11. Platform stats ── */}
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
