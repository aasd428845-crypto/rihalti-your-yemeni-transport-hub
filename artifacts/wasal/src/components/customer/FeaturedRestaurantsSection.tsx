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
    supabase
      .from("restaurants")
      .select("id, name_ar, cover_image, logo_url, rating, total_ratings, cuisine_type, opening_hours, min_order_amount")
      .eq("is_active", true)
      .eq("is_featured", true)
      .order("rating", { ascending: false })
      .limit(10)
      .then(({ data }) => setRestaurants(data || []));
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
          const status = getOpenStatus(r.opening_hours);
          return (
            <div
              key={r.id}
              role="button"
              tabIndex={0}
              onClick={() => navigate(`/restaurants/${r.id}`)}
              onKeyDown={(e) => { if (e.key === "Enter") navigate(`/restaurants/${r.id}`); }}
              className="min-w-[140px] w-[140px] bg-card rounded-xl border border-border/40 overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all text-right shrink-0 cursor-pointer"
            >
              <div className="relative w-full h-[90px] bg-muted">
                {r.cover_image || r.logo_url ? (
                  <img
                    src={r.cover_image || r.logo_url}
                    alt={r.name_ar}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl">🏪</div>
                )}
                {/* Favorite heart top-right */}
                <div className="absolute top-1.5 right-1.5">
                  <FavoriteHeart entityType="restaurant" entityId={r.id} size="sm" />
                </div>
                {/* Rating bottom-left pill — always shown */}
                <div className="absolute bottom-1.5 left-1.5 bg-amber-500 text-white text-[10px] font-bold rounded-md px-1.5 py-0.5 shadow inline-flex items-center gap-0.5">
                  <Star className="w-2.5 h-2.5 fill-white text-white" />
                  {ratingNum > 0 ? ratingNum.toFixed(1) : "جديد"}
                </div>
                {/* Open/closed status bottom-right (replaces time pill) */}
                <div
                  className={`absolute bottom-1.5 right-1.5 text-white text-[10px] font-bold rounded-md px-1.5 py-0.5 shadow ${
                    status.isOpen ? "bg-emerald-600" : "bg-red-500"
                  }`}
                >
                  {status.isOpen ? "مفتوح" : "مغلق"}
                </div>
              </div>
              <div className="p-2">
                <p className="font-bold text-[12px] text-foreground leading-tight line-clamp-1">
                  {r.name_ar}
                </p>
                {Array.isArray(r.cuisine_type) && r.cuisine_type.length > 0 && (
                  <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">
                    {r.cuisine_type.join(" • ")}
                  </p>
                )}
                <div className="flex items-center justify-between mt-1">
                  {r.min_order_amount > 0 ? (
                    <span className="text-primary font-black text-[12px]">
                      من {Number(r.min_order_amount).toLocaleString("ar-YE")} ر.ي
                    </span>
                  ) : (
                    <span className="text-primary font-black text-[12px]">توصيل سريع</span>
                  )}
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
