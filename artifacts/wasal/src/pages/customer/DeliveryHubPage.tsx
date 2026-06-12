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
  MapPin,
  Truck,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getCustomerActiveOffers, type DeliveryOffer } from "@/lib/deliveryOffersApi";
import { computeItemPromo, isPromoScheduleActive } from "@/lib/promotionsApi";
import FavoriteHeart from "@/components/customer/FavoriteHeart";
import DeliveryRequestBanner from "@/components/customer/DeliveryRequestBanner";
import FeaturedRestaurantsSection from "@/components/customer/FeaturedRestaurantsSection";
import SharedCategoryScroller from "@/components/customer/CategoryScroller";

// This project uses Supabase for data — preserve all supabase.from().select() calls exactly as they are

// ─── Promo fields to always SELECT on menu_items ─────────────────────────────
const PROMO_SELECT =
  "id, name_ar, image_url, price, discounted_price, preparation_time, rating, total_ratings, restaurant_id, " +
  "promo_type, promo_value, promo_text, promo_active, promo_starts_at, promo_ends_at, promo_active_days, promo_start_time, promo_end_time, " +
  "restaurants(name_ar, estimated_delivery_time)";

// ─── Shared: compute effective promo ─────────────────────────────────────────
function getEffectivePromo(item: any) {
  const scheduleOk = isPromoScheduleActive(item);
  return computeItemPromo({ ...item, promo_active: scheduleOk && !!item.promo_active });
}

// ─── Design tokens ────────────────────────────────────────────────────────────
const PRIMARY = "#1B4332";
const LIGHT_GREEN = "#52B788";
const CARD_BG = "#FFFFFF";
const PAGE_BG = "#F8F8F8";
const TEXT_PRIMARY = "#1A1A1A";
const TEXT_SECONDARY = "#888888";
const RATING_GOLD = "#FFC107";
const DANGER = "#E53935";

// ─── Section header ───────────────────────────────────────────────────────────
const SectionHeader = ({
  title,
  icon: Icon,
  onMore,
}: {
  title: string;
  icon?: any;
  onMore?: () => void;
}) => (
  <div className="flex items-center justify-between mb-3">
    <h2 className="text-[15px] font-black flex items-center gap-1.5" style={{ color: TEXT_PRIMARY }}>
      {Icon && <Icon className="w-4 h-4" style={{ color: LIGHT_GREEN }} />}
      {title}
    </h2>
    {onMore && (
      <button
        onClick={onMore}
        className="text-[12px] font-bold flex items-center gap-0.5"
        style={{ color: LIGHT_GREEN }}
      >
        عرض الكل
        <ArrowLeftIcon className="w-3.5 h-3.5" />
      </button>
    )}
  </div>
);

// Small feature pills
const FEATURES = [
  { icon: Zap, label: "توصيل سريع", color: "#F59E0B" },
  { icon: Shield, label: "دفع آمن", color: LIGHT_GREEN },
  { icon: Star, label: "تقييمات موثوقة", color: "#F97316" },
  { icon: TrendingUp, label: "أسعار تنافسية", color: "#3B82F6" },
];

// ─── COMPONENT 1: Hero Offers Banner (عروض وخصومات التوصيل) ──────────────────
// Redesigned: dark green carousel, food image right, text left, dots pagination
const FALLBACK_OFFER_IMAGES = [
  "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&q=80&fit=crop",
  "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&q=80&fit=crop",
  "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&q=80&fit=crop",
];

function getOfferDiscountText(offer: DeliveryOffer): string {
  if (offer.offer_type === "free_delivery") return "توصيل مجاني";
  if (offer.offer_type === "percent_off_delivery" && offer.discount_percent)
    return `${offer.discount_percent}%`;
  if (offer.offer_type === "percent_off_order" && offer.discount_percent)
    return `${offer.discount_percent}%`;
  if ((offer as any).discount_value) return `${(offer as any).discount_value}%`;
  return "";
}

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

  const handleClick = (offer: DeliveryOffer & { link_url?: string }) => {
    if (offer.restaurant_id) { onNavigate(`/restaurants/${offer.restaurant_id}`); return; }
    let dest = (offer as any).link_url as string | undefined;
    if (!dest) { onNavigate("/food"); return; }
    if (dest === "/shipment-request" || dest === "/shipments") dest = "/delivery-request";
    onNavigate(isSafePath(dest) ? dest : "/food");
  };

  const getBadge = (offer: DeliveryOffer): { text: string; color: string } => {
    if (offer.offer_type === "free_delivery") return { text: "مجاني", color: "#1B9E6E" };
    if (offer.offer_type === "percent_off_delivery" && offer.discount_percent) return { text: "تخفيض", color: "#E53935" };
    if (offer.offer_type === "percent_off_order" && offer.discount_percent) return { text: "تخفيض", color: "#E53935" };
    return { text: "عرض خاص", color: PRIMARY };
  };

  return (
    <section>
      <SectionHeader title="عروض وخصومات التوصيل" icon={Tag} />
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
        {offers.map((offer, i) => {
          const discountText = getOfferDiscountText(offer);
          const badge = getBadge(offer);
          const imgSrc = offer.image_url || FALLBACK_OFFER_IMAGES[i % FALLBACK_OFFER_IMAGES.length];
          const titleText = discountText && discountText !== "توصيل مجاني"
            ? `خصم ${discountText} ${offer.title || ""}`.trim()
            : offer.title || (discountText === "توصيل مجاني" ? "توصيل مجاني" : "");
          const subtitle = (offer as any).subtitle || offer.description || "";

          return (
            <button
              key={offer.id}
              onClick={() => handleClick(offer)}
              className="relative shrink-0 overflow-hidden text-right hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200"
              style={{ width: 175, height: 112, borderRadius: 14 }}
            >
              {/* Background food image */}
              <img
                src={imgSrc}
                alt={titleText}
                className="absolute inset-0 w-full h-full object-cover"
                style={{ filter: "brightness(0.52)" }}
                loading="lazy"
              />

              {/* Badge — top right */}
              <span
                className="absolute top-2.5 right-2.5 z-10 text-white font-black text-[10px] px-2.5 py-1 shadow-md"
                style={{ backgroundColor: badge.color, borderRadius: 99 }}
              >
                {badge.text}
              </span>

              {/* Text — bottom gradient */}
              <div
                className="absolute bottom-0 right-0 left-0 px-2.5 pb-2.5 pt-6 z-10"
                style={{ background: "linear-gradient(to top, rgba(0,0,0,0.68) 60%, transparent)" }}
              >
                {titleText && (
                  <p className="text-white font-black leading-tight line-clamp-2" style={{ fontSize: 12 }}>
                    {titleText}
                  </p>
                )}
                {subtitle && (
                  <p className="text-white/80 leading-tight line-clamp-1 mt-0.5" style={{ fontSize: 10 }}>
                    {subtitle}
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

// ─── COMPONENT 2: Meal/Restaurant Card (horizontal scroll) ───────────────────
// Redesigned: 160px wide, white bg, square image, delivery pill, heart, name, tags, rating+price
const ItemCard = ({ item }: { item: any }) => {
  const navigate = useNavigate();
  const { originalPrice, finalPrice, hasPromo } = getEffectivePromo(item);
  const showDiscount = hasPromo && finalPrice < originalPrice;
  const discountPct =
    showDiscount && item.promo_type === "discount_percent" && item.promo_value
      ? item.promo_value
      : showDiscount
      ? Math.round((1 - finalPrice / originalPrice) * 100)
      : 0;
  const ratingNum = Number(item.rating || 0);
  const deliveryTime = item.restaurants?.estimated_delivery_time;
  const restaurantName = item.restaurants?.name_ar;

  return (
    <div
      onClick={() => item.restaurant_id && navigate(`/restaurants/${item.restaurant_id}`)}
      className="shrink-0 cursor-pointer hover:-translate-y-1 transition-all duration-200"
      style={{
        width: 160,
        borderRadius: 16,
        backgroundColor: CARD_BG,
        boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
        overflow: "hidden",
      }}
    >
      {/* Image section — 3D floating food effect */}
      <div
        className="relative w-full overflow-hidden"
        style={{ height: 140, background: "#ffffff" }}
      >
        {/* Fallback emoji — shown when image missing/fails */}
        <div className="absolute inset-0 flex items-center justify-center text-5xl select-none" style={{ zIndex: 0 }}>🍔</div>

        {item.image_url && (
          <img
            src={item.image_url}
            alt={item.name_ar}
            loading="lazy"
            className="absolute inset-0 w-full h-full"
            style={{
              objectFit: "contain",
              objectPosition: "center",
              filter: "drop-shadow(0px 12px 20px rgba(0,0,0,0.28)) drop-shadow(0px 4px 8px rgba(0,0,0,0.14))",
              transform: "scale(1.06) translateY(-5px)",
              transition: "transform 0.3s ease",
              zIndex: 1,
            }}
            onError={(e) => { e.currentTarget.style.display = "none"; }}
          />
        )}

        {/* Subtle bottom fade */}
        <div
          className="absolute inset-x-0 bottom-0 h-8"
          style={{ background: "linear-gradient(to top, rgba(255,255,255,0.95), transparent)", zIndex: 2 }}
        />

        {/* Heart top-right */}
        <div className="absolute top-2 right-2" style={{ zIndex: 3 }}>
          <div className="w-7 h-7 rounded-full bg-white shadow flex items-center justify-center">
            <FavoriteHeart entityType="menu_item" entityId={item.id} size="sm" />
          </div>
        </div>

        {/* Discount badge top-left */}
        {showDiscount && discountPct > 0 && (
          <span
            className="absolute top-2 left-2 text-white font-black text-[9px] px-1.5 py-0.5 rounded-full shadow"
            style={{ backgroundColor: DANGER, zIndex: 3 }}
          >
            -{discountPct}%
          </span>
        )}

        {/* Delivery time pill bottom-right */}
        {deliveryTime && (
          <span
            className="absolute bottom-2 right-2 inline-flex items-center gap-0.5 text-white font-bold text-[9px] px-2 py-0.5 rounded-full"
            style={{ backgroundColor: PRIMARY, zIndex: 3 }}
          >
            <Clock className="w-2.5 h-2.5" />
            {deliveryTime} د
          </span>
        )}
      </div>

      {/* Info section */}
      <div className="p-2.5 space-y-1">
        {/* Meal name */}
        <p className="font-black text-[13px] leading-tight line-clamp-1" style={{ color: TEXT_PRIMARY }}>
          {item.name_ar}
        </p>

        {/* Restaurant as tag */}
        {restaurantName && (
          <p className="text-[10px] line-clamp-1" style={{ color: TEXT_SECONDARY }}>
            {restaurantName}
          </p>
        )}

        {/* Rating + price */}
        <div className="flex items-center justify-between pt-0.5">
          <span className="inline-flex items-center gap-0.5 text-[10px] font-bold" style={{ color: TEXT_SECONDARY }}>
            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
            {ratingNum > 0 ? ratingNum.toFixed(1) : "جديد"}
          </span>
          {showDiscount ? (
            <div className="flex flex-col items-end leading-tight">
              <span className="text-[8px] line-through" style={{ color: TEXT_SECONDARY }}>
                {Number(originalPrice).toLocaleString()} ر.ي
              </span>
              <span className="font-extrabold text-[11px]" style={{ color: LIGHT_GREEN }}>
                {Number(finalPrice).toLocaleString()} ر.ي
              </span>
            </div>
          ) : (
            <span className="font-extrabold text-[11px]" style={{ color: PRIMARY }}>
              {Number(finalPrice).toLocaleString()} ر.ي
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── عروض الوجبات Card (160px wide, full spec) ────────────────────────────────
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
      className="shrink-0 cursor-pointer hover:-translate-y-1 transition-all duration-200"
      style={{
        width: 160,
        borderRadius: 16,
        backgroundColor: CARD_BG,
        boxShadow: "0 4px 16px rgba(0,0,0,0.10)",
        overflow: "hidden",
      }}
    >
      {/* Image — 3D floating food effect */}
      <div
        className="relative w-full overflow-hidden"
        style={{ height: 140, background: "#ffffff" }}
      >
        <div className="absolute inset-0 flex items-center justify-center text-5xl select-none" style={{ zIndex: 0 }}>🍽️</div>

        {item.image_url && (
          <img
            src={item.image_url}
            alt={item.name_ar}
            loading="lazy"
            className="absolute inset-0 w-full h-full"
            style={{
              objectFit: "contain",
              objectPosition: "center",
              filter: "drop-shadow(0px 12px 20px rgba(0,0,0,0.28)) drop-shadow(0px 4px 8px rgba(0,0,0,0.14))",
              transform: "scale(1.06) translateY(-5px)",
              transition: "transform 0.3s ease",
              zIndex: 1,
            }}
            onError={(e) => { e.currentTarget.style.display = "none"; }}
          />
        )}

        <div
          className="absolute inset-x-0 bottom-0 h-8"
          style={{ background: "linear-gradient(to top, rgba(255,255,255,0.95), transparent)", zIndex: 2 }}
        />

        {/* Discount pill top-left */}
        {discountPct > 0 && (
          <span className="absolute top-2 left-2 text-white font-black text-[9px] px-1.5 py-0.5 rounded-full shadow" style={{ backgroundColor: DANGER, zIndex: 3 }}>
            -{discountPct}%
          </span>
        )}
        {!discountPct && promoLabel && (
          <span className="absolute top-2 left-2 text-white font-black text-[9px] px-1.5 py-0.5 rounded-full shadow" style={{ backgroundColor: "#F59E0B", zIndex: 3 }}>
            {promoLabel}
          </span>
        )}

        {/* Heart top-right */}
        <div className="absolute top-2 right-2" style={{ zIndex: 3 }}>
          <div className="w-7 h-7 rounded-full bg-white shadow flex items-center justify-center" onClick={e => e.stopPropagation()}>
            <FavoriteHeart entityType="menu_item" entityId={item.id} size="sm" />
          </div>
        </div>

        {/* Delivery time bottom-right */}
        {deliveryTime && (
          <span className="absolute bottom-2 right-2 inline-flex items-center gap-0.5 text-white font-bold text-[9px] px-2 py-0.5 rounded-full" style={{ backgroundColor: PRIMARY, zIndex: 3 }}>
            <Clock className="w-2.5 h-2.5" />{deliveryTime} د
          </span>
        )}
      </div>

      {/* Info */}
      <div className="p-2.5 space-y-1">
        <p className="font-black text-[13px] leading-tight line-clamp-1" style={{ color: TEXT_PRIMARY }}>
          {item.name_ar}
        </p>
        {item.restaurants?.name_ar && (
          <p className="text-[10px] line-clamp-1" style={{ color: TEXT_SECONDARY }}>
            {item.restaurants.name_ar}
          </p>
        )}
        {showDiscount ? (
          <div className="flex items-center gap-1.5 pt-0.5 flex-wrap">
            <span className="text-[9px] line-through" style={{ color: TEXT_SECONDARY }}>
              {Number(originalPrice).toLocaleString()} ر.ي
            </span>
            <span className="font-extrabold text-[12px]" style={{ color: LIGHT_GREEN }}>
              {Number(finalPrice).toLocaleString()} ر.ي
            </span>
          </div>
        ) : (
          <p className="font-extrabold text-[12px] pt-0.5" style={{ color: PRIMARY }}>
            {Number(finalPrice).toLocaleString()} ر.ي
          </p>
        )}
      </div>
    </div>
  );
};

// ─── TopRatedItems ────────────────────────────────────────────────────────────
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
      <SectionHeader title="الأكثر تقييماً 🔥" onMore={() => navigate("/food")} />
      <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide -mx-4 px-4">
        {items.map((it) => <ItemCard key={it.id} item={it} />)}
      </div>
    </div>
  );
};

// ─── FeaturedItems ────────────────────────────────────────────────────────────
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
      <SectionHeader title="مختارات لك ✨" onMore={() => navigate("/food")} />
      <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide -mx-4 px-4">
        {items.map((it) => <ItemCard key={it.id} item={it} />)}
      </div>
    </div>
  );
};

// ─── MealOffersSection ────────────────────────────────────────────────────────
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
        const active = (data || []).filter((item: any) => isPromoScheduleActive(item));
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

  if (loaded && items.length === 0) return null;
  if (!loaded) return null;

  return (
    <div>
      <SectionHeader title="🔥 عروض الوجبات" onMore={() => navigate("/food")} />
      <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide -mx-4 px-4">
        {items.map((it) => <MealOfferCard key={it.id} item={it} />)}
      </div>
    </div>
  );
};

// ─── Default banners / offers / tiles ────────────────────────────────────────
const DEFAULT_BANNERS = [
  { id: "d1", title: "اطلب من مطاعمك المفضلة", subtitle: "توصيل سريع لباب منزلك", image_url: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200&q=80&fit=crop", badge_text: "جديد", link_url: "/food", banner_type: "carousel" },
  { id: "d2", title: "خدمات توصيل، تسوق، انقل من أي مكان", subtitle: "مناديب لتوصيل طرودك وطلباتك في أسرع وقت", image_url: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1200&q=80&fit=crop", badge_text: "متاح الآن", link_url: "/delivery-request", banner_type: "carousel" },
  { id: "d3", title: "عروض حصرية كل يوم", subtitle: "لا تفوّت أفضل الأسعار", image_url: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=1200&q=80&fit=crop", badge_text: "عرض محدود", link_url: "/food", banner_type: "carousel" },
];

const DEFAULT_OFFERS: any[] = [
  { id: "o1", title: "خصم 20% على أول طلب", subtitle: "لعملاء وصل الجدد", image_url: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&q=80&fit=crop", badge_text: "عرض خاص", link_url: "/food", offer_type: "percent_off_order", discount_percent: 20, is_active: true, delivery_company_id: "", sort_order: 0, created_at: "" },
  { id: "o2", title: "توصيل مجاني", subtitle: "عند الطلب فوق 2000 ر.ي", image_url: "https://images.unsplash.com/photo-1519984388953-d2406bc725e1?w=600&q=80&fit=crop", badge_text: "مجاني", link_url: "/food", offer_type: "free_delivery", is_active: true, delivery_company_id: "", sort_order: 1, created_at: "" },
  { id: "o3", title: "وجبات البرجر المميزة", subtitle: "أقل سعر في المدينة", image_url: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&q=80&fit=crop", badge_text: "تخفيض", link_url: "/food", offer_type: "percent_off_delivery", discount_percent: 30, is_active: true, delivery_company_id: "", sort_order: 2, created_at: "" },
];

const DEFAULT_SERVICE_TILES = [
  { key: "food", label: "مطاعم وتوصيل", img: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&q=80&fit=crop", action: "food" },
  { key: "grocery", label: "بقالة وتسوق", img: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=600&q=80&fit=crop", action: "grocery" },
  { key: "pharmacy", label: "صيدليات", img: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600&q=80&fit=crop", action: "pharmacy" },
  { key: "more", label: "المزيد", img: "https://images.unsplash.com/photo-1607344645866-009c320b63e0?w=600&q=80&fit=crop", action: "more" },
];

// ─── Hero Banner Carousel (unchanged logic) ───────────────────────────────────
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
    <div className="relative w-full overflow-hidden shadow-md" style={{ aspectRatio: "16/7", minHeight: 100, maxHeight: 148, borderRadius: 20 }}>
      {banners.map((banner, i) => (
        <div
          key={banner.id}
          className={`absolute inset-0 transition-opacity duration-700 ${i === idx ? "opacity-100" : "opacity-0 pointer-events-none"} ${banner.link_url || banner.link_tab ? "cursor-pointer" : ""}`}
          onClick={() => i === idx && handleClick(banner)}
        >
          <img src={banner.image_url} alt={banner.title || ""} className="w-full h-full object-cover" loading={i === 0 ? "eager" : "lazy"} />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          {banner.badge_text && (
            <Badge className="absolute top-3 right-3 text-white border-0 shadow-lg font-bold text-xs" style={{ backgroundColor: LIGHT_GREEN }}>
              {banner.badge_text}
            </Badge>
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
              <button key={i} onClick={(e) => { e.stopPropagation(); setIdx(i); }}
                className="rounded-full transition-all duration-300"
                style={{ width: i === idx ? 20 : 8, height: 8, backgroundColor: i === idx ? "#fff" : "rgba(255,255,255,0.4)" }}
              />
            ))}
          </div>
        </>
      )}
    </div>
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
      supabase.from("delivery_banners" as any).select("*").eq("is_active", true).order("sort_order"),
      getCustomerActiveOffers(),
    ]).then(([bannersRes, liveOffersData]) => {
      console.log("🎯 liveOffers fetched:", liveOffersData.length, liveOffersData);
      const bannersData = bannersRes.data || [];
      const carousel = bannersData.filter((b: any) => !b.banner_type || b.banner_type === "carousel");
      const bannerOffers = bannersData.filter((b: any) => b.banner_type === "offer");
      const tiles = bannersData.filter((b: any) => b.banner_type === "service_tile");
      setCompanyManaged(bannersData.length > 0);
      setCarouselBanners(carousel.length > 0 ? carousel : DEFAULT_BANNERS);
      setLiveOffers(liveOffersData);
      setOfferBanners(liveOffersData.length > 0 ? [] : (bannerOffers.length > 0 ? bannerOffers : []));
      setServiceTiles(tiles);
      setBannersLoaded(true);
    }).catch(() => {
      setCompanyManaged(false);
      setCarouselBanners(DEFAULT_BANNERS);
      setLiveOffers([]);
      setOfferBanners([]);
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
    else if (tile.link_url) navigate(tile.link_url === "/shipment-request" ? "/delivery-request" : tile.link_url);
    else navigate("/food");
  };

  const displayTiles = serviceTiles.length > 0 ? serviceTiles : companyManaged ? [] : DEFAULT_SERVICE_TILES;

  return (
    <div className="min-h-screen pb-24 dir-rtl" style={{ backgroundColor: PAGE_BG, direction: "rtl" }}>
      <div className="container mx-auto px-3 max-w-5xl space-y-4 pt-3">

        {/* ── 1. Service Tiles ── */}
        {!bannersLoaded ? (
          <div className="grid grid-cols-2 gap-2">
            {[1,2,3,4].map(i => <div key={i} className="h-20 rounded-2xl bg-gray-200 animate-pulse" />)}
          </div>
        ) : displayTiles.length > 0 && (
          <div className="grid grid-cols-2 gap-2">
            {displayTiles.map((tile: any, i: number) => {
              const imgSrc = tile.image_url || tile.img || "";
              const label = tile.title || tile.label || "";
              return (
                <button
                  key={tile.id || tile.key || i}
                  onClick={() => handleTileClick(tile)}
                  className="relative overflow-hidden group h-20 hover:-translate-y-0.5 transition-all duration-300"
                  style={{ borderRadius: 16, boxShadow: "0 4px 16px rgba(0,0,0,0.08)" }}
                >
                  {imgSrc && <img src={imgSrc} alt={label} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                  <div className="absolute bottom-0 right-0 left-0 px-3 py-2.5 flex items-center justify-center">
                    <span className="font-black text-sm text-white leading-tight text-center drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">{label}</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* ── 2. Hero Banner Carousel ── */}
        {!bannersLoaded
          ? <div className="w-full animate-pulse bg-gray-200" style={{ aspectRatio: "16/8", minHeight: 130, borderRadius: 20 }} />
          : <BannerCarousel banners={carouselBanners!} onNavigate={navigate} />}

        {/* ── 3. Offers Banner (restaurant/delivery level only) ── */}
        {bannersLoaded && (
          <OffersSection
            offers={liveOffers.length > 0 ? liveOffers : offerBanners!}
            onNavigate={navigate}
          />
        )}

        {/* ── 4. Categories ── */}
        <SharedCategoryScroller />

        {/* ── 5. عروض الوجبات ── */}
        <MealOffersSection />

        {/* ── 6. الأكثر تقييماً ── */}
        <TopRatedItems />

        {/* ── 7. Delivery request banner ── */}
        <DeliveryRequestBanner />

        {/* ── 8. مختارات لك ── */}
        <FeaturedItems />

        {/* ── 9. Featured restaurants ── */}
        <FeaturedRestaurantsSection />

        {/* ── 10. Feature pills ── */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {FEATURES.map((feat) => (
            <div
              key={feat.label}
              className="flex items-center gap-1.5 shrink-0 border border-gray-200 px-3 py-1.5 shadow-sm"
              style={{ borderRadius: 99, backgroundColor: CARD_BG }}
            >
              <feat.icon className="w-3 h-3" style={{ color: feat.color }} />
              <span className="text-[10px] font-semibold whitespace-nowrap" style={{ color: TEXT_SECONDARY }}>
                {feat.label}
              </span>
            </div>
          ))}
        </div>

        {/* ── 11. Platform stats ── */}
        <div className="grid grid-cols-3 gap-2 pb-4">
          {[
            { num: "+500", label: "مطعم" },
            { num: "+20", label: "مدينة" },
            { num: "4.9 ⭐", label: "تقييم" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="text-center p-2.5 shadow-sm"
              style={{ backgroundColor: CARD_BG, borderRadius: 16, boxShadow: "0 4px 16px rgba(0,0,0,0.06)" }}
            >
              <p className="font-black text-sm" style={{ color: PRIMARY }}>{stat.num}</p>
              <p className="text-[10px]" style={{ color: TEXT_SECONDARY }}>{stat.label}</p>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
};

export default DeliveryHubPage;
