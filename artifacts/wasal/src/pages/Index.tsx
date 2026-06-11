import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  Star,
  Clock,
  Tag,
  ChevronLeft as ArrowLeftIcon,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { getCustomerActiveOffers, type DeliveryOffer } from "@/lib/deliveryOffersApi";

// ─── Promo Banners (fallback if DB has none) ─────────────────────────────────
const FALLBACK_BANNERS = [
  {
    id: "b1",
    title: "خصم 30% على أول طلب",
    subtitle: "اطلب من مطاعمك المفضلة الآن",
    cta: "اطلب الآن",
    route: "/restaurants?tab=restaurants",
    overlay: "from-orange-900/80 via-orange-800/50 to-transparent",
    img: "https://images.unsplash.com/photo-1526367790999-0150786686a2?w=700&q=80",
    badge: "عرض محدود",
  },
  {
    id: "b2",
    title: "رحلات مريحة بين المدن",
    subtitle: "احجز مقعدك مع أفضل شركات النقل",
    cta: "احجز الآن",
    route: "/trips",
    overlay: "from-emerald-900/80 via-emerald-800/50 to-transparent",
    img: "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=700&q=80",
    badge: "جديد",
  },
  {
    id: "b3",
    title: "توصيل سريع في 30 دقيقة",
    subtitle: "بقالتك وصيدليتك تصل لبابك",
    cta: "اكتشف المتاجر",
    route: "/restaurants?tab=grocery",
    overlay: "from-violet-900/80 via-violet-800/50 to-transparent",
    img: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=700&q=80",
    badge: "حصري",
  },
];

// ─── Service Grid (verticals) ─────────────────────────────────────────────────
const SERVICES = [
  {
    id: "restaurants",
    img: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&q=80",
    label: "مطاعم وتوصيل",
    desc: "اطلب من مطاعمك المفضلة",
    route: "/restaurants?tab=restaurants",
    shadow: "shadow-orange-200 dark:shadow-orange-900/40",
    isNew: false,
  },
  {
    id: "trips",
    img: "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=400&q=80",
    label: "رحلات بين المدن",
    desc: "احجز مقعدك بسهولة",
    route: "/trips",
    shadow: "shadow-emerald-200 dark:shadow-emerald-900/40",
    isNew: false,
  },
  {
    id: "shipments",
    img: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=400&q=80",
    label: "طرود آمنة",
    desc: "أرسل طردك بثقة",
    route: "/delivery-request",
    shadow: "shadow-blue-200 dark:shadow-blue-900/40",
    isNew: false,
  },
  {
    id: "taxi",
    img: "https://images.unsplash.com/photo-1549924231-f129b911e442?w=400&q=80",
    label: "سيارة أجرة",
    desc: "احجز سيارتك فوراً",
    route: "/ride/request",
    shadow: "shadow-yellow-200 dark:shadow-yellow-900/40",
    isNew: true,
  },
];

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
  <div className="flex items-center justify-between mb-3">
    <h2 className="text-lg font-black text-foreground flex items-center gap-2">
      {Icon && <Icon className="w-5 h-5 text-primary" />}
      {title}
    </h2>
    {onMore && (
      <button
        onClick={onMore}
        className="text-sm text-primary font-semibold flex items-center gap-1"
      >
        عرض الكل
        <ArrowLeftIcon className="w-4 h-4" />
      </button>
    )}
  </div>
);

// ─── Page intro (greeting line — header has location/search/bell) ────────────
const PageIntro = () => (
  <div className="mb-4">
    <h1 className="text-2xl font-black text-foreground leading-tight">
      ماذا تريد اليوم؟
    </h1>
    <p className="text-xs text-muted-foreground mt-0.5">
      كل ما تحتاجه — في مكان واحد
    </p>
  </div>
);

// ─── Route map for link_tab values ───────────────────────────────────────────
const TAB_ROUTE: Record<string, string> = {
  restaurants: "/restaurants?tab=restaurants",
  grocery: "/restaurants?tab=grocery",
  pharmacy: "/restaurants?tab=pharmacy",
  more: "/delivery-request",
  trips: "/trips",
  taxi: "/ride/request",
  shipments: "/delivery-request",
};

const CACHE_KEY = "wasal_home_banners_v2";

// ─── Banner Carousel (auto-scroll) ───────────────────────────────────────────
const BannerCarousel = () => {
  const navigate = useNavigate();
  const [current, setCurrent] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // null = still loading (show skeleton); array = ready to display
  const [banners, setBanners] = useState<typeof FALLBACK_BANNERS | null>(() => {
    try {
      const cached = sessionStorage.getItem(CACHE_KEY);
      if (cached) return JSON.parse(cached);
    } catch {}
    return null;
  });

  useEffect(() => {
    supabase
      .from("delivery_banners")
      .select("id, title, subtitle, image_url, badge_text, link_tab, tile_gradient, tile_action")
      .eq("banner_type", "carousel")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .then(
        ({ data }) => {
          const next = data && data.length > 0
            ? data.map((b) => ({
                id: b.id,
                title: b.title || "",
                subtitle: b.subtitle || "",
                cta: b.tile_action || "اكتشف الآن",
                route: TAB_ROUTE[b.link_tab || ""] || b.link_tab || "/",
                overlay: b.tile_gradient || "from-orange-900/80 via-orange-800/50 to-transparent",
                img: b.image_url,
                badge: b.badge_text || "",
              }))
            : FALLBACK_BANNERS;

          // Only update state (and cause a re-render) if content actually changed.
          // This prevents the visible flash when navigating back to the home page
          // with a warm sessionStorage cache that already matches the DB.
          const nextJson = JSON.stringify(next);
          const cachedJson = sessionStorage.getItem(CACHE_KEY);
          if (nextJson !== cachedJson) {
            setBanners(next);
            try { sessionStorage.setItem(CACHE_KEY, nextJson); } catch {}
          }
        },
        () => {
          // Only fall back if we have nothing cached yet
          setBanners((prev) => prev ?? FALLBACK_BANNERS);
        },
      );
  }, []);

  useEffect(() => {
    if (!banners) return;
    intervalRef.current = setInterval(() => {
      setCurrent((p) => (p + 1) % banners.length);
    }, 4500);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [banners]);

  const go = (dir: "next" | "prev") => {
    if (!banners) return;
    if (intervalRef.current) clearInterval(intervalRef.current);
    setCurrent((p) =>
      dir === "next"
        ? (p + 1) % banners.length
        : (p - 1 + banners.length) % banners.length,
    );
    intervalRef.current = setInterval(() => {
      setCurrent((p) => (p + 1) % banners!.length);
    }, 4500);
  };

  // Skeleton while loading
  if (!banners) {
    return (
      <div
        className="relative rounded-3xl overflow-hidden shadow-xl mb-6 bg-muted animate-pulse"
        style={{ minHeight: 190 }}
      />
    );
  }

  const banner = banners[current];

  return (
    <div
      className="relative rounded-3xl overflow-hidden shadow-xl mb-6"
      style={{ minHeight: 190 }}
    >
      <img
        key={banner.id}
        src={banner.img}
        alt={banner.title}
        className="absolute inset-0 w-full h-full object-cover transition-opacity duration-700"
        loading="eager"
      />
      <div className={`absolute inset-0 bg-gradient-to-l ${banner.overlay}`} />
      <div className="relative z-10 p-6 min-h-[190px] flex flex-col justify-between">
        <div className="flex justify-start">
          <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-sm text-xs font-bold px-3 py-1">
            {banner.badge}
          </Badge>
        </div>
        <div>
          <h2 className="text-white font-black text-xl leading-tight mb-1 drop-shadow-lg">
            {banner.title}
          </h2>
          <p className="text-white/90 text-sm mb-4 drop-shadow-md">
            {banner.subtitle}
          </p>
          <button
            onClick={() => navigate(banner.route)}
            className="bg-white/25 backdrop-blur-sm text-white text-sm font-bold px-5 py-2.5 rounded-full border border-white/40 hover:bg-white/35 transition-colors shadow-lg"
          >
            {banner.cta} ←
          </button>
        </div>
      </div>
      <button
        onClick={() => go("prev")}
        className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center hover:bg-black/50"
        aria-label="السابق"
      >
        <ChevronLeft className="w-5 h-5 text-white" />
      </button>
      <button
        onClick={() => go("next")}
        className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center hover:bg-black/50"
        aria-label="التالي"
      >
        <ChevronRight className="w-5 h-5 text-white" />
      </button>
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex gap-1.5">
        {banners.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`rounded-full transition-all duration-300 ${
              i === current ? "w-6 h-2 bg-white" : "w-2 h-2 bg-white/50"
            }`}
            aria-label={`بانر ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
};

// ─── COMPONENT 3: Nearby Restaurant Card (horizontal, Talabat style) ───────────
const RestaurantCard = ({ r }: { r: any }) => {
  const navigate = useNavigate();
  const heroSrc = r.cover_image || r.logo_url;
  const ratingNum = Number(r.rating || 0);
  const deliveryTime = r.estimated_delivery_time;
  const deliveryFee = r.delivery_fee ?? 0;

  return (
    <button
      onClick={() => navigate(`/restaurants/${r.id}`)}
      className="w-full text-right active:scale-[0.99] transition-all duration-200 hover:-translate-y-0.5"
      style={{
        backgroundColor: "#fff",
        borderRadius: 16,
        boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
        overflow: "hidden",
      }}
    >
      <div className="flex items-stretch gap-0" style={{ height: 100 }}>
        {/* LEFT: Image with badges */}
        <div className="relative shrink-0 overflow-hidden" style={{ width: 100, borderRadius: "16px 0 0 16px", backgroundColor: "#f0f0f0" }}>
          <div className="absolute inset-0 flex items-center justify-center text-3xl select-none" style={{ zIndex: 0 }}>🏪</div>
          {heroSrc && (
            <img
              src={heroSrc}
              alt={r.name_ar}
              className="absolute inset-0 w-full h-full"
              style={{ objectFit: "cover", objectPosition: "center", zIndex: 1 }}
              loading="lazy"
              onError={(e) => { e.currentTarget.style.display = "none"; }}
            />
          )}
          {/* Distance badge top-left (gray pill) */}
          <span
            className="absolute top-2 right-2 text-[9px] font-bold px-1.5 py-0.5 rounded-full"
            style={{ backgroundColor: "rgba(0,0,0,0.55)", color: "#fff" }}
          >
            {r.city || "قريب"}
          </span>
          {/* Featured label */}
          {r.is_featured && (
            <span
              className="absolute bottom-2 right-2 text-[9px] font-black px-1.5 py-0.5 rounded-full"
              style={{ backgroundColor: "#F59E0B", color: "#fff" }}
            >
              مميز
            </span>
          )}
        </div>

        {/* RIGHT: Info */}
        <div className="flex-1 min-w-0 flex flex-col justify-center px-3 py-2 gap-1">
          {/* Name */}
          <p className="font-black text-[14px] leading-tight line-clamp-1" style={{ color: "#1A1A1A" }}>
            {r.name_ar}
          </p>

          {/* Row: rating | delivery time | delivery fee */}
          <div className="flex items-center gap-2.5 flex-wrap" style={{ fontSize: 11, color: "#888" }}>
            <span className="inline-flex items-center gap-0.5 font-bold" style={{ color: "#F59E0B" }}>
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
              {ratingNum > 0 ? ratingNum.toFixed(1) : "جديد"}
            </span>
            {deliveryTime && (
              <span className="inline-flex items-center gap-0.5">
                <Clock className="w-3 h-3" />
                {deliveryTime} د
              </span>
            )}
            <span className="inline-flex items-center gap-0.5">
              <Tag className="w-3 h-3" />
              {deliveryFee === 0 ? (
                <span className="font-semibold" style={{ color: "#52B788" }}>مجاني</span>
              ) : (
                `${Number(deliveryFee).toLocaleString("ar-YE")} ر.ي`
              )}
            </span>
          </div>
        </div>
      </div>
    </button>
  );
};

// ─── Nearby Restaurants section ──────────────────────────────────────────────
const NearbyRestaurants = ({ city }: { city: string }) => {
  const navigate = useNavigate();
  const [list, setList] = useState<any[]>([]);

  useEffect(() => {
    let q = supabase
      .from("restaurants")
      .select(
        "id, name_ar, cover_image, logo_url, rating, total_ratings, delivery_fee, estimated_delivery_time, is_featured, city",
      )
      .eq("is_active", true)
      .order("is_featured", { ascending: false })
      .order("rating", { ascending: false })
      .limit(6);
    if (city && city !== "اليمن") q = q.eq("city", city);
    q.then(({ data }) => setList(data || []));
  }, [city]);

  if (list.length === 0) return null;

  return (
    <div className="mb-6">
      <SectionHeader
        title="مطاعم بالقرب منك"
        onMore={() => navigate("/restaurants?tab=restaurants")}
      />
      <div className="flex flex-col gap-2.5">
        {list.map((r) => (
          <RestaurantCard key={r.id} r={r} />
        ))}
      </div>
    </div>
  );
};

// ─── Offers section ──────────────────────────────────────────────────────────
const FALLBACK_OFFERS = [
  { id: "fo1", title: "خصم 20% على أول طلب", description: "لعملاء وصل الجدد", discount_value: 20, discount_type: "percentage", promo_code: "WASAL20", restaurant_id: null },
  { id: "fo2", title: "توصيل مجاني", description: "عند الطلب فوق 2000 ر.ي", discount_value: null, discount_type: null, promo_code: null, restaurant_id: null },
  { id: "fo3", title: "وجبتك بنصف السعر", description: "على الطلب الثاني في اليوم", discount_value: 50, discount_type: "percentage", promo_code: null, restaurant_id: null },
];

const palette = [
  "from-emerald-500 to-teal-600",
  "from-orange-500 to-rose-500",
  "from-violet-500 to-fuchsia-600",
  "from-blue-500 to-cyan-500",
  "from-amber-500 to-orange-500",
  "from-pink-500 to-rose-500",
];

// ─── COMPONENT 1: Hero Offers Banner (Index page — promotions table) ─────────
const HERO_FALLBACK_IMGS = [
  "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=700&q=80&fit=crop",
  "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=700&q=80&fit=crop",
  "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=700&q=80&fit=crop",
  "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=700&q=80&fit=crop",
];

const OffersSection = () => {
  const navigate = useNavigate();
  const [offers, setOffers] = useState<any[] | null>(null);

  useEffect(() => {
    getCustomerActiveOffers()
      .then((data) => {
        if (data && data.length > 0) {
          setOffers(data);
        } else {
          setOffers(FALLBACK_OFFERS);
        }
      })
      .catch(() => setOffers(FALLBACK_OFFERS));
  }, []);

  const list = offers ?? [];
  if (list.length === 0) return null;

  const getBadge = (o: any): { text: string; color: string } => {
    if (o.badge_text) return { text: o.badge_text, color: "#1B4332" };
    if (o.offer_type === "free_delivery")        return { text: "مجاني", color: "#1B9E6E" };
    if (o.offer_type === "percent_off_delivery") return { text: `خصم ${o.discount_percent}%`, color: "#E53935" };
    if (o.offer_type === "fixed_off_delivery")   return { text: "خصم توصيل", color: "#E53935" };
    if (o.offer_type === "percent_off_order")    return { text: `خصم ${o.discount_percent}%`, color: "#E53935" };
    if (o.offer_type === "fixed_off_order")      return { text: "خصم", color: "#E53935" };
    if (o.offer_type === "buy_x_get_y")          return { text: "كومبو", color: "#7C3AED" };
    // Legacy promotions table fallback
    if (o.discount_type === "percentage" && o.discount_value) return { text: "تخفيض", color: "#E53935" };
    if (!o.discount_value && !o.promo_code)      return { text: "مجاني", color: "#1B9E6E" };
    return { text: "عرض خاص", color: "#1B4332" };
  };

  return (
    <div className="mb-6">
      <SectionHeader title="عروض وخصومات" icon={Tag} onMore={() => navigate("/restaurants")} />
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
        {list.map((o, i) => {
          const imgSrc = o.image_url || HERO_FALLBACK_IMGS[i % HERO_FALLBACK_IMGS.length];
          const badge = getBadge(o);
          const titleText = o.discount_value && o.discount_type === "percentage"
            ? `خصم ${o.discount_value}% ${o.title || ""}`
            : o.title || "";

          return (
            <button
              key={o.id}
              onClick={() => o.restaurant_id ? navigate(`/restaurants/${o.restaurant_id}`) : navigate("/restaurants")}
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
                onError={(e) => { e.currentTarget.style.filter = "brightness(0)"; }}
              />

              {/* Badge — top right */}
              <span
                className="absolute top-2.5 right-2.5 z-10 text-white font-black text-[10px] px-2.5 py-1 shadow-md"
                style={{ backgroundColor: badge.color, borderRadius: 99 }}
              >
                {badge.text}
              </span>

              {/* Text — bottom */}
              <div className="absolute bottom-0 right-0 left-0 px-2.5 pb-2.5 pt-6 z-10"
                style={{ background: "linear-gradient(to top, rgba(0,0,0,0.65) 60%, transparent)" }}
              >
                {titleText && (
                  <p className="text-white font-black leading-tight line-clamp-2" style={{ fontSize: 12 }}>
                    {titleText}
                  </p>
                )}
                {o.description && (
                  <p className="text-white/80 leading-tight line-clamp-1 mt-0.5" style={{ fontSize: 10 }}>
                    {o.description}
                  </p>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

// ─── Recent Trips ────────────────────────────────────────────────────────────
const RecentTrips = () => {
  const navigate = useNavigate();
  const [trips, setTrips] = useState<any[]>([]);

  useEffect(() => {
    supabase
      .from("trips")
      .select(
        "id, from_city, to_city, departure_time, price, available_seats",
      )
      .eq("status", "active")
      .gt("available_seats", 0)
      .order("departure_time", { ascending: true })
      .limit(4)
      .then(({ data }) => setTrips(data || []));
  }, []);

  if (trips.length === 0) return null;

  return (
    <div className="mb-6">
      <SectionHeader
        title="رحلات قادمة"
        onMore={() => navigate("/trips")}
      />
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
        {trips.map((trip) => (
          <button
            key={trip.id}
            onClick={() => navigate(`/trips/${trip.id}`)}
            className="min-w-[180px] bg-card rounded-2xl border border-border/40 p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all text-right shrink-0"
          >
            <div className="flex items-center gap-1.5 mb-2">
              <span className="text-lg">🚌</span>
              <span className="text-xs text-muted-foreground font-medium">
                {new Date(trip.departure_time).toLocaleDateString("ar-YE", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                })}
              </span>
            </div>
            <p className="font-bold text-sm text-foreground mb-1">
              {trip.from_city} ← {trip.to_city}
            </p>
            <div className="flex items-center justify-between">
              <span className="text-primary font-black text-sm">
                {trip.price} ر.ي
              </span>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                {trip.available_seats} مقعد
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

// ─── Main Home Component ─────────────────────────────────────────────────────
const Index = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();

  return (
    <div className="min-h-screen bg-[#F9FAFB] dark:bg-background" dir="rtl">
      <div className="max-w-2xl mx-auto px-4 py-5">
        <PageIntro />
        <BannerCarousel />

        {/* Service Grid */}
        <div className="mb-6">
          <SectionHeader title="خدماتنا" />
          <div className="grid grid-cols-2 gap-4">
            {SERVICES.map((svc) => (
              <button
                key={svc.id}
                data-testid={`service-card-${svc.id}`}
                onClick={() => navigate(svc.route)}
                className={`relative rounded-2xl overflow-hidden shadow-lg ${svc.shadow} hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group text-right`}
                style={{ minHeight: 170 }}
              >
                <img
                  src={svc.img}
                  alt={svc.label}
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />
                {svc.isNew && (
                  <div className="absolute top-3 left-3 z-10">
                    <Badge className="bg-primary text-primary-foreground text-[10px] font-bold border-0 shadow-lg">
                      جديد 🔥
                    </Badge>
                  </div>
                )}
                <div className="absolute bottom-0 right-0 left-0 p-4 z-10">
                  <p className="font-black text-sm text-white leading-tight drop-shadow-md">
                    {svc.label}
                  </p>
                  <p className="text-xs text-white/80 mt-0.5 drop-shadow-sm">
                    {svc.desc}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>

        <NearbyRestaurants city={profile?.city || ""} />
        <OffersSection />

        <RecentTrips />
      </div>
    </div>
  );
};

export default Index;
