import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Award, ChevronLeft, Star, Clock, Truck, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import FavoriteHeart from "./FavoriteHeart";
import { getOpenStatus } from "@/lib/restaurantHours";

// This project uses Supabase for data — preserve all supabase.from().select() calls exactly as they are

// ─── Design tokens ─────────────────────────────────────────────────────────────
const PRIMARY = "#1B4332";
const LIGHT_GREEN = "#52B788";
const DANGER = "#E53935";
const TEXT_PRIMARY = "#1A1A1A";
const TEXT_SECONDARY = "#888888";

// ─── COMPONENT 2: Restaurant Vertical Card (Talabat style, 160px wide) ────────
const RestaurantVerticalCard = ({ r }: { r: any }) => {
  const navigate = useNavigate();
  const ratingNum = Number(r.rating || 0);
  const status = getOpenStatus(r);
  const isOpen = r.is_active !== false && status.isOpen;
  const imgSrc = r.cover_image || r.logo_url;
  const deliveryFee = r.delivery_fee ?? 0;
  const deliveryTime = r.estimated_delivery_time;
  const hasDiscount = r.discount_percent > 0;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => navigate(`/restaurants/${r.id}`)}
      onKeyDown={(e) => { if (e.key === "Enter") navigate(`/restaurants/${r.id}`); }}
      className="shrink-0 cursor-pointer hover:-translate-y-1 transition-all duration-200"
      style={{
        width: 160,
        borderRadius: 16,
        backgroundColor: "#fff",
        boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* ── Restaurant cover image ── */}
      <div className="relative w-full overflow-hidden" style={{ height: 140, backgroundColor: "#f0f0f0" }}>
        <div className="absolute inset-0 flex items-center justify-center text-5xl select-none" style={{ zIndex: 0 }}>🏪</div>
        {imgSrc && (
          <img
            src={imgSrc}
            alt={r.name_ar}
            className="absolute inset-0 w-full h-full object-cover object-center"
            style={{ zIndex: 1 }}
            loading="lazy"
            onError={(e) => { e.currentTarget.style.display = "none"; }}
          />
        )}

        {/* Gradient overlay bottom */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />

        {/* Heart/favorite — top right (white circle) */}
        <div
          className="absolute top-2 right-2 z-10 flex items-center justify-center rounded-full bg-white shadow-md"
          style={{ width: 28, height: 28 }}
          onClick={(e) => e.stopPropagation()}
        >
          <FavoriteHeart entityType="restaurant" entityId={r.id} size="sm" />
        </div>

        {/* Discount badge — top left (red pill) */}
        {hasDiscount && (
          <span
            className="absolute top-2 left-2 z-10 text-white font-black text-[9px] px-1.5 py-0.5 rounded-full shadow"
            style={{ backgroundColor: DANGER }}
          >
            -{r.discount_percent}%
          </span>
        )}

        {/* Delivery time pill — bottom left (primary green pill) */}
        {deliveryTime && (
          <span
            className="absolute bottom-2 right-2 z-10 inline-flex items-center gap-0.5 text-white font-bold text-[9px] px-2 py-0.5 rounded-full"
            style={{ backgroundColor: PRIMARY }}
          >
            <Clock className="w-2.5 h-2.5" />
            {deliveryTime} دقيقة
          </span>
        )}

        {/* Rating pill — bottom right */}
        <span
          className="absolute bottom-2 left-2 z-10 inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full"
          style={{ backgroundColor: "rgba(0,0,0,0.55)", color: "#FFC107" }}
        >
          <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
          {ratingNum > 0 ? ratingNum.toFixed(1) : "جديد"}
        </span>
      </div>

      {/* ── Info section ── */}
      <div className="p-2.5 space-y-1">
        {/* Restaurant name */}
        <p className="font-black text-[13px] leading-tight line-clamp-1" style={{ color: TEXT_PRIMARY }}>
          {r.name_ar}
        </p>

        {/* Cuisine tags */}
        {Array.isArray(r.cuisine_type) && r.cuisine_type.length > 0 && (
          <p className="text-[10px] line-clamp-1" style={{ color: TEXT_SECONDARY }}>
            {r.cuisine_type.slice(0, 3).join(" • ")}
          </p>
        )}

        {/* Delivery fee row */}
        <p className="text-[10px] inline-flex items-center gap-0.5" style={{ color: TEXT_SECONDARY }}>
          <Truck className="w-2.5 h-2.5 shrink-0" />
          {deliveryFee === 0 ? (
            <span className="font-semibold" style={{ color: LIGHT_GREEN }}>توصيل مجاني</span>
          ) : (
            `${deliveryFee} ريال توصيل`
          )}
        </p>
      </div>

      {/* Closed overlay */}
      {!isOpen && (
        <div
          className="absolute inset-0 flex items-start justify-center pt-10"
          style={{ backgroundColor: "rgba(0,0,0,0.38)", borderRadius: 16 }}
        >
          <span className="text-white text-xs font-bold px-3 py-1 rounded-full" style={{ backgroundColor: "rgba(0,0,0,0.75)" }}>
            مغلق
          </span>
        </div>
      )}
    </div>
  );
};

// ─── Section ────────────────────────────────────────────────────────────────────
const FeaturedRestaurantsSection = () => {
  const navigate = useNavigate();
  const [restaurants, setRestaurants] = useState<any[]>([]);

  useEffect(() => {
    supabase
      .from("restaurants")
      .select("id, name_ar, cover_image, logo_url, rating, total_ratings, cuisine_type, opening_hours, min_order_amount, delivery_fee, estimated_delivery_time, is_featured, discount_percent, is_active")
      .eq("is_active", true)
      .eq("is_featured", true)
      .order("rating", { ascending: false })
      .limit(10)
      .then(({ data }) => {
        if (data && data.length > 0) {
          setRestaurants(data);
        } else {
          supabase
            .from("restaurants")
            .select("id, name_ar, cover_image, logo_url, rating, total_ratings, cuisine_type, opening_hours, min_order_amount, delivery_fee, estimated_delivery_time, is_featured, discount_percent, is_active")
            .eq("is_active", true)
            .order("rating", { ascending: false })
            .limit(10)
            .then(({ data: fallback }) => setRestaurants(fallback || []));
        }
      });
  }, []);

  if (restaurants.length === 0) return null;

  return (
    <section>
      {/* Section header */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[15px] font-black flex items-center gap-1.5" style={{ color: TEXT_PRIMARY }}>
          <Award className="w-4 h-4" style={{ color: LIGHT_GREEN }} />
          مطاعم مميزة
        </h2>
        <button
          onClick={() => navigate("/food")}
          className="text-[12px] font-bold flex items-center gap-0.5"
          style={{ color: LIGHT_GREEN }}
        >
          عرض الكل
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Horizontal scroll */}
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
        {restaurants.map((r) => (
          <RestaurantVerticalCard key={r.id} r={r} />
        ))}
      </div>
    </section>
  );
};

export default FeaturedRestaurantsSection;
