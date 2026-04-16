import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Tag, ChevronLeft, ChevronRight } from "lucide-react";
import { getRestaurantCuisines } from "@/lib/restaurantApi";
import { supabase } from "@/integrations/supabase/client";

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
    title: "عروض حصرية كل يوم",
    subtitle: "لا تفوّت أفضل الأسعار",
    image_url: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=1200&q=80&fit=crop",
    badge_text: "عرض محدود",
    link_url: "/food",
    banner_type: "carousel",
  },
  {
    id: "d3",
    title: "مطاعم يمنية أصيلة",
    subtitle: "أطباق شعبية بلمسة عصرية",
    image_url: "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=1200&q=80&fit=crop",
    badge_text: null,
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
    const dest = banner.link_url || (banner.link_tab === "more" ? "/shipment-request" : banner.link_tab ? `/food?tab=${banner.link_tab}` : null);
    if (dest) onNavigate(dest);
  };

  if (!banners.length) return null;

  return (
    <div className="relative w-full overflow-hidden rounded-2xl shadow-xl" style={{ aspectRatio: "16/7", minHeight: 150, maxHeight: 260 }}>
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

// ─── Offers / Deals Horizontal Scroll ─────────────────────────────────────────
const OffersSection = ({ offers, onNavigate }: { offers: any[]; onNavigate: (url: string) => void }) => {
  if (!offers.length) return null;
  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <div className="p-1.5 rounded-lg bg-red-500/10">
          <Tag className="w-4 h-4 text-red-500" />
        </div>
        <h2 className="text-lg font-black text-foreground">عروض وخصومات</h2>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
        {offers.map((offer) => (
          <button
            key={offer.id}
            onClick={() => { const dest = offer.link_url || "/food"; onNavigate(dest); }}
            className="relative shrink-0 rounded-2xl overflow-hidden shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group cursor-pointer"
            style={{ width: 180, height: 110 }}
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
        setCarouselBanners(carousel.length > 0 ? carousel : DEFAULT_BANNERS);
        setOfferBanners(offers.length > 0 ? offers : DEFAULT_OFFERS);
        setServiceTiles(tiles);
      })
      .catch(() => {
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
    else if (action === "more") navigate("/shipment-request");
    else if (tile.link_url) navigate(tile.link_url);
    else navigate("/food");
  };

  const displayTiles = serviceTiles.length > 0 ? serviceTiles : DEFAULT_SERVICE_TILES;

  return (
    <div className="min-h-screen bg-background pb-24" dir="rtl">
      <div className="container mx-auto px-4 max-w-5xl space-y-5 pt-3">

        {/* ── 1. Service Tiles (image only, no colored gradient) ── */}
        <div className="grid grid-cols-2 gap-3">
          {displayTiles.map((tile: any, idx: number) => {
            const imgSrc = tile.image_url || tile.img || "";
            const label = tile.title || tile.label || "";
            return (
              <button
                key={tile.id || tile.key || idx}
                onClick={() => handleTileClick(tile)}
                className="relative rounded-2xl overflow-hidden shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group h-28"
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

        {/* ── 2. Hero Banner Carousel ── */}
        <BannerCarousel banners={carouselBanners} onNavigate={navigate} />

        {/* ── 3. Offers / Deals Section ── */}
        <OffersSection offers={offerBanners} onNavigate={navigate} />

      </div>
    </div>
  );
};

export default DeliveryHubPage;
