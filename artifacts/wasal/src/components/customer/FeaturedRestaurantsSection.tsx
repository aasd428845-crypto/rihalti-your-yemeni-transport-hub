import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Award, ChevronLeft, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import FavoriteHeart from "./FavoriteHeart";
import { getOpenStatus } from "@/lib/restaurantHours";

const FeaturedRestaurantsSection = () => {
  const navigate = useNavigate();
  const [restaurants, setRestaurants] = useState<any[]>([]);

  useEffect(() => {
    // Try featured-only first; fall back to top-rated if none are marked featured
    supabase
      .from("restaurants")
      .select("id, name_ar, cover_image, logo_url, rating, total_ratings, cuisine_type, opening_hours, min_order_amount, is_featured")
      .eq("is_active", true)
      .eq("is_featured", true)
      .order("rating", { ascending: false })
      .limit(10)
      .then(({ data }) => {
        if (data && data.length > 0) {
          setRestaurants(data);
        } else {
          // No featured restaurants yet — show top-rated instead
          supabase
            .from("restaurants")
            .select("id, name_ar, cover_image, logo_url, rating, total_ratings, cuisine_type, opening_hours, min_order_amount, is_featured")
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
      <div className="flex items-center justify-between mb-1.5">
        <h2 className="text-[15px] font-black text-foreground flex items-center gap-1.5">
          <Award className="w-4 h-4 text-primary" />
          مطاعم مميزة الأكثر تقييماً
        </h2>
        <button
          onClick={() => navigate("/food?tab=restaurants")}
          className="text-xs text-primary font-semibold flex items-center gap-0.5"
        >
          عرض الكل
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-4 px-4">
        {restaurants.map((r) => {
          const ratingNum = Number(r.rating || 0);
          const status = getOpenStatus(r);
          return (
            <div
              key={r.id}
              role="button"
              tabIndex={0}
              onClick={() => navigate(`/restaurants/${r.id}`)}
              onKeyDown={(e) => { if (e.key === "Enter") navigate(`/restaurants/${r.id}`); }}
              className="relative min-w-[140px] w-[140px] rounded-xl overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all shrink-0 cursor-pointer"
              style={{ height: 160 }}
            >
              {/* Full image */}
              {r.cover_image || r.logo_url ? (
                <img src={r.cover_image || r.logo_url} alt={r.name_ar} className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
              ) : (
                <div className="absolute inset-0 bg-muted flex items-center justify-center text-4xl">🏪</div>
              )}
              {/* Gradient */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />

              {/* Favorite heart */}
              <div className="absolute top-1.5 right-1.5">
                <FavoriteHeart entityType="restaurant" entityId={r.id} size="sm" />
              </div>

              {/* Text overlay */}
              <div className="absolute bottom-0 right-0 left-0 p-2 text-right">
                <p className="font-bold text-[12px] text-white leading-tight line-clamp-1 drop-shadow">
                  {r.name_ar}
                </p>
                {Array.isArray(r.cuisine_type) && r.cuisine_type.length > 0 && (
                  <p className="text-[10px] text-white/75 line-clamp-1 mt-0.5">
                    {r.cuisine_type.join(" • ")}
                  </p>
                )}
                <div className="flex items-center justify-between mt-1">
                  <span className="inline-flex items-center gap-0.5 bg-amber-500/90 text-white text-[9px] font-bold rounded-md px-1.5 py-0.5">
                    <Star className="w-2 h-2 fill-white text-white" />
                    {ratingNum > 0 ? ratingNum.toFixed(1) : "جديد"}
                  </span>
                  <span className={`text-white text-[9px] font-bold rounded-md px-1.5 py-0.5 ${status.isOpen ? "bg-emerald-600/90" : "bg-red-500/90"}`}>
                    {status.isOpen ? "مفتوح" : "مغلق"}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default FeaturedRestaurantsSection;
