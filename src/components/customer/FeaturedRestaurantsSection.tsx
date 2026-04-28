import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Award, ChevronLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import RatingStars from "./RatingStars";
import FavoriteHeart from "./FavoriteHeart";

const FeaturedRestaurantsSection = () => {
  const navigate = useNavigate();
  const [restaurants, setRestaurants] = useState<any[]>([]);

  useEffect(() => {
    supabase
      .from("restaurants")
      .select("id, name_ar, cover_image, logo_url, rating, total_ratings, cuisine_type, estimated_delivery_time, min_order_amount")
      .eq("is_active", true)
      .eq("is_featured", true)
      .order("rating", { ascending: false })
      .limit(10)
      .then(({ data }) => setRestaurants(data || []));
  }, []);

  if (restaurants.length === 0) return null;

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-black text-foreground flex items-center gap-2">
          <Award className="w-5 h-5 text-primary" />
          مطاعم مميزة الأكثر تقييماً
        </h2>
        <button
          onClick={() => navigate("/food?tab=restaurants")}
          className="text-sm text-primary font-semibold flex items-center gap-1"
        >
          عرض الكل
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
        {restaurants.map((r) => (
          <div
            key={r.id}
            role="button"
            tabIndex={0}
            onClick={() => navigate(`/restaurants/${r.id}`)}
            onKeyDown={(e) => { if (e.key === "Enter") navigate(`/restaurants/${r.id}`); }}
            className="min-w-[180px] w-[180px] bg-card rounded-2xl border border-border/40 overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all text-right shrink-0 cursor-pointer"
          >
            <div className="relative w-full h-[110px] bg-muted">
              {r.cover_image || r.logo_url ? (
                <img
                  src={r.cover_image || r.logo_url}
                  alt={r.name_ar}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl">🏪</div>
              )}
              {/* Rating badge top-left */}
              {Number(r.rating) > 0 && (
                <div className="absolute top-2 left-2">
                  <RatingStars rating={r.rating} size="xs" />
                </div>
              )}
              {/* Favorite heart top-right */}
              <div className="absolute top-2 right-2">
                <FavoriteHeart entityType="restaurant" entityId={r.id} size="sm" />
              </div>
            </div>
            <div className="p-2.5">
              <p className="font-bold text-sm text-foreground leading-tight line-clamp-1 mb-1">
                {r.name_ar}
              </p>
              {Array.isArray(r.cuisine_type) && r.cuisine_type.length > 0 && (
                <p className="text-[11px] text-muted-foreground line-clamp-1 mb-1">
                  {r.cuisine_type.join(" • ")}
                </p>
              )}
              <div className="flex items-center justify-between text-[11px]">
                {r.estimated_delivery_time && (
                  <span className="text-muted-foreground">⏱ {r.estimated_delivery_time} د</span>
                )}
                {r.min_order_amount > 0 && (
                  <span className="text-primary font-semibold">
                    من {Number(r.min_order_amount).toLocaleString("ar-YE")} ر.ي
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default FeaturedRestaurantsSection;
