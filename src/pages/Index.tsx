import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Star, Clock, Zap, Shield, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";

// ─── Promo Banners ────────────────────────────────────────────────────────────
const BANNERS = [
  {
    id: 1,
    title: "خصم 30% على أول طلب",
    subtitle: "اطلب من مطاعمك المفضلة الآن",
    cta: "اطلب الآن",
    route: "/restaurants?tab=restaurants",
    overlay: "from-orange-900/80 via-orange-800/50 to-transparent",
    img: "https://images.unsplash.com/photo-1526367790999-0150786686a2?w=700&q=80",
    badge: "عرض محدود",
  },
  {
    id: 2,
    title: "رحلات مريحة بين المدن",
    subtitle: "احجز مقعدك مع أفضل شركات النقل",
    cta: "احجز الآن",
    route: "/trips",
    overlay: "from-emerald-900/80 via-emerald-800/50 to-transparent",
    img: "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=700&q=80",
    badge: "جديد",
  },
  {
    id: 3,
    title: "توصيل سريع في 30 دقيقة",
    subtitle: "بقالتك وصيدليتك تصل لبابك",
    cta: "اكتشف المتاجر",
    route: "/restaurants?tab=grocery",
    overlay: "from-violet-900/80 via-violet-800/50 to-transparent",
    img: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=700&q=80",
    badge: "حصري",
  },
];

// ─── Service Grid ──────────────────────────────────────────────────────────────
const SERVICES = [
  {
    id: "restaurants",
    img: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&q=80",
    label: "مطاعم وتوصيل",
    desc: "اطلب من مطاعمك المفضلة",
    route: "/restaurants?tab=restaurants",
    accentBg: "bg-orange-500",
    shadow: "shadow-orange-200 dark:shadow-orange-900/40",
    isNew: false,
  },
  {
    id: "trips",
    img: "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=400&q=80",
    label: "رحلات بين المدن",
    desc: "احجز مقعدك بسهولة",
    route: "/trips",
    accentBg: "bg-primary",
    shadow: "shadow-emerald-200 dark:shadow-emerald-900/40",
    isNew: false,
  },
  {
    id: "shipments",
    img: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=400&q=80",
    label: "طرود آمنة",
    desc: "أرسل طردك بثقة",
    route: "/shipments",
    accentBg: "bg-blue-500",
    shadow: "shadow-blue-200 dark:shadow-blue-900/40",
    isNew: false,
  },
  {
    id: "taxi",
    img: "https://images.unsplash.com/photo-1549924231-f129b911e442?w=400&q=80",
    label: "سيارة أجرة",
    desc: "احجز سيارتك فوراً",
    route: "/ride/request",
    accentBg: "bg-amber-500",
    shadow: "shadow-yellow-200 dark:shadow-yellow-900/40",
    isNew: true,
  },
];

// ─── Feature pills ────────────────────────────────────────────────────────────
const FEATURES = [
  { icon: Zap, label: "توصيل سريع", color: "text-amber-500" },
  { icon: Shield, label: "دفع آمن", color: "text-emerald-500" },
  { icon: Star, label: "تقييمات موثوقة", color: "text-orange-500" },
  { icon: TrendingUp, label: "أسعار تنافسية", color: "text-blue-500" },
];

// ─── Banner Carousel ──────────────────────────────────────────────────────────
const BannerCarousel = () => {
  const navigate = useNavigate();
  const [current, setCurrent] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout>();

  const startAuto = () => {
    intervalRef.current = setInterval(() => {
      setCurrent((prev) => (prev + 1) % BANNERS.length);
    }, 4000);
  };

  useEffect(() => {
    startAuto();
    return () => clearInterval(intervalRef.current);
  }, []);

  const go = (dir: "next" | "prev") => {
    clearInterval(intervalRef.current);
    setCurrent((prev) => dir === "next" ? (prev + 1) % BANNERS.length : (prev - 1 + BANNERS.length) % BANNERS.length);
    startAuto();
  };

  const banner = BANNERS[current];

  return (
    <div className="relative rounded-3xl overflow-hidden shadow-2xl mb-8" style={{ minHeight: 190 }}>
      {/* Real Photo Background */}
      <img
        key={banner.id}
        src={banner.img}
        alt={banner.title}
        className="absolute inset-0 w-full h-full object-cover transition-opacity duration-700"
        loading="eager"
      />

      {/* Dark gradient overlay (right-to-left for RTL) */}
      <div className={`absolute inset-0 bg-gradient-to-l ${banner.overlay}`} />

      {/* Content */}
      <div className="relative z-10 p-6 min-h-[190px] flex flex-col justify-between">
        {/* Top row: badge */}
        <div className="flex justify-start">
          <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-sm text-xs font-bold px-3 py-1">
            {banner.badge}
          </Badge>
        </div>

        {/* Bottom text + CTA */}
        <div>
          <h2 className="text-white font-black text-xl leading-tight mb-1 drop-shadow-lg">{banner.title}</h2>
          <p className="text-white/90 text-sm mb-4 drop-shadow-md">{banner.subtitle}</p>
          <button
            onClick={() => navigate(banner.route)}
            className="bg-white/25 backdrop-blur-sm text-white text-sm font-bold px-5 py-2.5 rounded-full border border-white/40 hover:bg-white/35 transition-colors shadow-lg"
          >
            {banner.cta} ←
          </button>
        </div>
      </div>

      {/* Nav arrows */}
      <button
        onClick={() => go("prev")}
        className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center hover:bg-black/50 transition-colors"
      >
        <ChevronLeft className="w-5 h-5 text-white" />
      </button>
      <button
        onClick={() => go("next")}
        className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center hover:bg-black/50 transition-colors"
      >
        <ChevronRight className="w-5 h-5 text-white" />
      </button>

      {/* Dots */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex gap-1.5">
        {BANNERS.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`rounded-full transition-all duration-300 ${i === current ? "w-6 h-2 bg-white" : "w-2 h-2 bg-white/50"}`}
          />
        ))}
      </div>
    </div>
  );
};

// ─── Recent Trips ─────────────────────────────────────────────────────────────
const RecentTrips = () => {
  const navigate = useNavigate();
  const [trips, setTrips] = useState<any[]>([]);

  useEffect(() => {
    supabase
      .from("trips")
      .select("id, from_city, to_city, departure_time, price, available_seats")
      .eq("status", "active")
      .gt("available_seats", 0)
      .order("departure_time", { ascending: true })
      .limit(4)
      .then(({ data }) => setTrips(data || []));
  }, []);

  if (trips.length === 0) return null;

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-black text-foreground">رحلات قادمة</h2>
        <button onClick={() => navigate("/trips")} className="text-sm text-primary font-semibold">
          عرض الكل ←
        </button>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {trips.map((trip) => (
          <button
            key={trip.id}
            onClick={() => navigate(`/trips/${trip.id}`)}
            className="min-w-[180px] bg-card rounded-2xl border border-border/40 p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all text-right shrink-0"
          >
            <div className="flex items-center gap-1.5 mb-2">
              <span className="text-lg">🚌</span>
              <span className="text-xs text-muted-foreground font-medium">
                {new Date(trip.departure_time).toLocaleDateString("ar-YE", { weekday: "short", month: "short", day: "numeric" })}
              </span>
            </div>
            <p className="font-bold text-sm text-foreground mb-1">
              {trip.from_city} ← {trip.to_city}
            </p>
            <div className="flex items-center justify-between">
              <span className="text-primary font-black text-sm">{trip.price} ر.ي</span>
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

// ─── Main Home Component ──────────────────────────────────────────────────────
const Index = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <div className="max-w-2xl mx-auto px-4 py-6">

        {/* Greeting */}
        <div className="mb-6">
          <p className="text-sm text-muted-foreground">
            {user ? `مرحباً، ${profile?.full_name?.split(" ")[0] || "بك"} 👋` : "أهلاً بك في وصل 👋"}
          </p>
          <h1 className="text-2xl font-black text-foreground leading-tight">
            ماذا تريد اليوم؟
          </h1>
        </div>

        {/* Promo Carousel */}
        <BannerCarousel />

        {/* Service Grid */}
        <div className="mb-8">
          <h2 className="text-lg font-black text-foreground mb-4">خدماتنا</h2>
          <div className="grid grid-cols-2 gap-4">
            {SERVICES.map((svc) => (
              <button
                key={svc.id}
                data-testid={`service-card-${svc.id}`}
                onClick={() => navigate(svc.route)}
                className={`relative rounded-2xl overflow-hidden shadow-lg ${svc.shadow} hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group text-right`}
                style={{ minHeight: 170 }}
              >
                {/* Real photo background */}
                <img
                  src={svc.img}
                  alt={svc.label}
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                />
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />

                {svc.isNew && (
                  <div className="absolute top-3 left-3 z-10">
                    <Badge className="bg-primary text-primary-foreground text-[10px] font-bold border-0 shadow-lg">
                      جديد 🔥
                    </Badge>
                  </div>
                )}

                {/* Text overlay at bottom */}
                <div className="absolute bottom-0 right-0 left-0 p-4 z-10">
                  <p className="font-black text-sm text-white leading-tight drop-shadow-md">{svc.label}</p>
                  <p className="text-xs text-white/80 mt-0.5 drop-shadow-sm">{svc.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Delivery Hub Big Banner */}
        <div className="mb-8">
          <button
            onClick={() => navigate("/shipment-request")}
            className="w-full relative rounded-3xl overflow-hidden shadow-xl hover:shadow-2xl hover:-translate-y-0.5 transition-all duration-300 group"
            style={{ minHeight: 120 }}
          >
            <img
              src="https://images.unsplash.com/photo-1605745341112-85968b19335b?w=700&q=80"
              alt="خدمات التوصيل"
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-l from-emerald-900/90 via-emerald-800/70 to-emerald-700/50" />
            <div className="relative z-10 p-5 flex items-center justify-between">
              <div className="text-right">
                <h2 className="text-white font-black text-xl leading-tight drop-shadow-lg">
                  خدمات توصيل
                </h2>
                <p className="text-white font-black text-lg leading-tight drop-shadow-lg">تسوق • انقل من أي مكان</p>
                <p className="text-white/80 text-sm mt-1 drop-shadow-md">اطلب توصيلك الآن بخطوات بسيطة</p>
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-2xl px-4 py-2.5 border border-white/30 flex-shrink-0 mr-2">
                <span className="text-white font-black text-sm">اطلب الآن ←</span>
              </div>
            </div>
          </button>
        </div>

        {/* Feature Pills */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide mb-8">
          {FEATURES.map((feat) => (
            <div
              key={feat.label}
              className="flex items-center gap-1.5 shrink-0 bg-card border border-border/40 rounded-full px-4 py-2 shadow-sm"
            >
              <feat.icon className={`w-3.5 h-3.5 ${feat.color}`} />
              <span className="text-xs font-semibold text-foreground whitespace-nowrap">{feat.label}</span>
            </div>
          ))}
        </div>

        {/* Recent Trips */}
        <RecentTrips />

        {/* Delivery Hub Quick Access */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-black text-foreground">التوصيل السريع</h2>
            <button onClick={() => navigate("/restaurants")} className="text-sm text-primary font-semibold">
              عرض الكل ←
            </button>
          </div>
          <div className="flex gap-3">
            {[
              { img: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=100&q=80", label: "مطاعم", tab: "restaurants", ring: "ring-orange-300 dark:ring-orange-700" },
              { img: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=100&q=80", label: "بقالة", tab: "grocery", ring: "ring-emerald-300 dark:ring-emerald-700" },
              { img: "https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=100&q=80", label: "صيدلية", tab: "pharmacy", ring: "ring-blue-300 dark:ring-blue-700" },
              { img: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=100&q=80", label: "طلب خاص", tab: "custom", ring: "ring-purple-300 dark:ring-purple-700" },
            ].map((item) => (
              <button
                key={item.tab}
                onClick={() => navigate(item.tab === "custom" ? "/shipments" : `/restaurants?tab=${item.tab}`)}
                className="flex-1 flex flex-col items-center gap-2 py-3 hover:opacity-80 transition-opacity duration-200"
              >
                <div className={`w-14 h-14 rounded-full overflow-hidden ring-2 ${item.ring} shadow-md`}>
                  <img src={item.img} alt={item.label} className="w-full h-full object-cover" loading="lazy" />
                </div>
                <span className="text-xs font-bold text-foreground">{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Platform stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { num: "+500", label: "مطعم" },
            { num: "+20", label: "مدينة" },
            { num: "4.9 ⭐", label: "تقييم" },
          ].map((stat) => (
            <div key={stat.label} className="bg-card border border-border/40 rounded-2xl p-4 text-center shadow-sm">
              <p className="font-black text-lg text-primary">{stat.num}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
};

export default Index;
