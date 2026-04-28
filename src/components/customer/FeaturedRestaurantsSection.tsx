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
            className="min-w-[170px] w-[170px] bg-card rounded-2xl border border-border/40 overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all text-right shrink-0 cursor-pointer"
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
                <div className="w-full h-full flex items-center justify-center text-3xl">🏪</div>
              )}
              {Number(r.rating) > 0 && (
                <div className="absolute top-2 left-2">
                  <RatingStars rating={r.rating} size="xs" />
                </div>
              )}
              <div className="absolute top-2 right-2">
                <FavoriteHeart entityType="restaurant" entityId={r.id} size="sm" />
              </div>
              {r.estimated_delivery_time && (
                <div className="absolute bottom-2 right-2 bg-emerald-600 text-white text-[10px] font-bold rounded-md px-1.5 py-0.5 shadow">
                  {r.estimated_delivery_time} دقيقة
                </div>
              )}
            </div>
            <div className="p-2.5">
              <p className="font-bold text-sm text-foreground leading-tight line-clamp-1 mb-0.5">
                {r.name_ar}
              </p>
              {Array.isArray(r.cuisine_type) && r.cuisine_type.length > 0 && (
                <p className="text-[11px] text-muted-foreground line-clamp-1 mb-1.5">
                  {r.cuisine_type.join(" • ")}
                </p>
              )}
              <div className="flex items-center justify-between">
                {r.min_order_amount > 0 ? (
                  <span className="text-primary font-black text-sm">
                    من {Number(r.min_order_amount).toLocaleString("ar-YE")} ر.ي
                  </span>
                ) : (
                  <span className="text-primary font-black text-sm">توصيل سريع</span>
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
