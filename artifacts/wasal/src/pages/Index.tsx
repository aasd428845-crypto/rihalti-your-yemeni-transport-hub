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

// ─── Banner Carousel (auto-scroll) ───────────────────────────────────────────
const BannerCarousel = () => {
  const navigate = useNavigate();
  const [current, setCurrent] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const banners = FALLBACK_BANNERS;

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setCurrent((p) => (p + 1) % banners.length);
    }, 4500);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [banners.length]);

  const go = (dir: "next" | "prev") => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setCurrent((p) =>
      dir === "next"
        ? (p + 1) % banners.length
        : (p - 1 + banners.length) % banners.length,
    );
    intervalRef.current = setInterval(() => {
      setCurrent((p) => (p + 1) % banners.length);
    }, 4500);
  };

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

// ─── Restaurant Card ─────────────────────────────────────────────────────────
const RestaurantCard = ({ r }: { r: any }) => {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(`/restaurants/${r.id}`)}
      className="bg-card rounded-2xl border border-border/40 overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all text-right w-full"
    >
      <div className="relative w-full h-[120px] bg-muted">
        {r.cover_image || r.logo_url ? (
          <img
            src={r.cover_image || r.logo_url}
            alt={r.name_ar}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl">
            🏪
          </div>
        )}
        {r.is_featured && (
          <Badge className="absolute top-2 left-2 bg-amber-500 hover:bg-amber-500 text-white text-[10px] font-bold border-0 shadow">
            ⭐ مميز
          </Badge>
        )}
      </div>
      <div className="p-3">
        <p className="font-bold text-sm text-foreground leading-tight line-clamp-1 mb-1">
          {r.name_ar}
        </p>
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
            {(r.rating ?? 0).toFixed(1)}
            {r.total_ratings ? ` (${r.total_ratings})` : ""}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {r.estimated_delivery_time || 30} د
          </span>
        </div>
        <div className="flex items-center justify-between mt-1.5">
          <span className="text-[11px] text-muted-foreground">
            توصيل: {r.delivery_fee ? `${Number(r.delivery_fee).toLocaleString("ar-YE")} ر.ي` : "مجاني"}
          </span>
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
      <div className="grid grid-cols-2 gap-3">
        {list.map((r) => (
          <RestaurantCard key={r.id} r={r} />
        ))}
      </div>
    </div>
  );
};

// ─── Offers section ──────────────────────────────────────────────────────────
const OffersSection = () => {
  const navigate = useNavigate();
  const [offers, setOffers] = useState<any[]>([]);

  useEffect(() => {
    const today = new Date().toISOString();
    supabase
      .from("promotions")
      .select(
        "id, title, description, discount_value, discount_type, promo_code, restaurant_id, end_date",
      )
      .eq("is_active", true)
      .or(`end_date.is.null,end_date.gte.${today}`)
      .order("created_at", { ascending: false })
      .limit(6)
      .then(({ data }) => setOffers(data || []));
  }, []);

  if (offers.length === 0) return null;

  const palette = [
    "from-emerald-500 to-emerald-600",
    "from-orange-500 to-rose-500",
    "from-violet-500 to-fuchsia-500",
    "from-blue-500 to-cyan-500",
    "from-amber-500 to-orange-500",
    "from-pink-500 to-rose-500",
  ];

  return (
    <div className="mb-6">
      <SectionHeader title="عروض وخصومات" icon={Tag} />
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
        {offers.map((o, i) => (
          <button
            key={o.id}
            onClick={() =>
              o.restaurant_id
                ? navigate(`/restaurants/${o.restaurant_id}`)
                : navigate("/restaurants")
            }
            className={`relative min-w-[260px] w-[260px] rounded-2xl overflow-hidden shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all text-right shrink-0 bg-gradient-to-br ${palette[i % palette.length]} text-white p-4`}
            style={{ minHeight: 110 }}
          >
            <div className="absolute -top-6 -left-6 w-24 h-24 rounded-full bg-white/15" />
            <div className="absolute -bottom-8 -right-2 w-20 h-20 rounded-full bg-white/10" />
            <Badge className="bg-white/25 text-white border-0 text-[10px] font-bold px-2 py-0.5 mb-2 backdrop-blur-sm">
              عرض خاص
            </Badge>
            <p className="font-black text-base leading-tight line-clamp-1 mb-1 drop-shadow">
              {o.title}
            </p>
            {o.description && (
              <p className="text-[11px] opacity-90 line-clamp-2 mb-2">
                {o.description}
              </p>
            )}
            {o.discount_value ? (
              <p className="text-xs font-bold">
                {o.discount_type === "percentage"
                  ? `خصم ${o.discount_value}%`
                  : `خصم ${Number(o.discount_value).toLocaleString("ar-YE")} ر.ي`}
                {o.promo_code ? ` • كود: ${o.promo_code}` : ""}
              </p>
            ) : null}
          </button>
        ))}
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
