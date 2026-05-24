import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Award, ChevronLeft, Star, Clock, Truck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import FavoriteHeart from "./FavoriteHeart";
import { getOpenStatus } from "@/lib/restaurantHours";

// ─── بطاقة المطعم الرأسية ─────────────────────────────────────────────────────
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
      className="relative w-[158px] shrink-0 rounded-2xl overflow-hidden bg-card border border-border/30 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer"
    >
      {/* ── صورة ── */}
      <div className="relative w-full h-[125px] bg-muted overflow-hidden">
        {imgSrc ? (
          <img
            src={imgSrc}
            alt={r.name_ar}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl bg-muted">🏪</div>
        )}

        {/* تعتيم تدريجي للنص أسفل الصورة */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

        {/* قلب المفضلة */}
        <div className="absolute top-2 right-2 z-10">
          <FavoriteHeart entityType="restaurant" entityId={r.id} size="sm" />
        </div>

        {/* شارة خصم */}
        {hasDiscount && (
          <span className="absolute top-2 left-2 bg-emerald-600 text-white text-[9px] font-black rounded-md px-1.5 py-0.5 shadow z-10">
            خصم {r.discount_percent}%
          </span>
        )}

        {/* وقت التوصيل — أسفل يمين الصورة */}
        {deliveryTime && (
          <span className="absolute bottom-2 right-2 inline-flex items-center gap-0.5 bg-black/65 backdrop-blur-sm text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md">
            <Clock className="w-2.5 h-2.5" />{deliveryTime} د
          </span>
        )}

        {/* التقييم — أسفل يسار الصورة */}
        <span className="absolute bottom-2 left-2 inline-flex items-center gap-0.5 bg-black/65 backdrop-blur-sm text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md">
          <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
          {ratingNum > 0 ? ratingNum.toFixed(1) : "جديد"}
        </span>
      </div>

      {/* ── معلومات ── */}
      <div className="p-2.5 space-y-0.5">
        <p className="font-black text-[13px] text-foreground leading-tight line-clamp-1">{r.name_ar}</p>
        {Array.isArray(r.cuisine_type) && r.cuisine_type.length > 0 && (
          <p className="text-[10px] text-muted-foreground line-clamp-1">
            {r.cuisine_type.slice(0, 3).join(" • ")}
          </p>
        )}
        <p className="text-[10px] text-muted-foreground flex items-center gap-0.5">
          <Truck className="w-2.5 h-2.5 shrink-0" />
          {deliveryFee === 0
            ? <span className="text-emerald-600 font-semibold">توصيل مجاني</span>
            : `${deliveryFee} ريال توصيل`}
        </p>
      </div>

      {/* شارة مغلق */}
      {!isOpen && (
        <div className="absolute inset-0 rounded-2xl bg-black/40 flex items-start justify-center pt-10">
          <span className="bg-black/80 text-white text-xs font-bold px-3 py-1 rounded-full">مغلق</span>
        </div>
      )}
    </div>
  );
};

// ─── القسم الرئيسي ─────────────────────────────────────────────────────────────
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
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-[15px] font-black text-foreground flex items-center gap-1.5">
          <Award className="w-4 h-4 text-primary" />
          مطاعم مميزة
        </h2>
        <button
          onClick={() => navigate("/food")}
          className="text-xs text-primary font-semibold flex items-center gap-0.5"
        >
          عرض الكل
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
        {restaurants.map((r) => (
          <RestaurantVerticalCard key={r.id} r={r} />
        ))}
      </div>
    </section>
  );
};

export default FeaturedRestaurantsSection;
