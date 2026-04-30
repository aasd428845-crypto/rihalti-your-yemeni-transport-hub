import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft as ArrowLeftIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const CATEGORY_IMAGES: Record<string, string> = {
  "يمني":          "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=200&q=80&fit=crop",
  "برجر":          "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=200&q=80&fit=crop",
  "بيتزا":         "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=200&q=80&fit=crop",
  "مأكولات بحرية": "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=200&q=80&fit=crop",
  "حلويات":        "https://images.unsplash.com/photo-1551024601-bec78aea704b?w=200&q=80&fit=crop",
  "مشروبات":       "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=200&q=80&fit=crop",
  "شاورما":        "https://images.unsplash.com/photo-1561651823-34feb02250e4?w=200&q=80&fit=crop",
  "مرق":           "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=200&q=80&fit=crop",
  "دجاج":          "https://images.unsplash.com/photo-1598103442097-8b74394b95c7?w=200&q=80&fit=crop",
  "دجاج مقلي":     "https://images.unsplash.com/photo-1626082929543-5bab6f2c9b6e?w=200&q=80&fit=crop",
  "كباب":          "https://images.unsplash.com/photo-1544025162-d76694265947?w=200&q=80&fit=crop",
  "سلطة":          "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=200&q=80&fit=crop",
  "مندي":          "https://images.unsplash.com/photo-1633237308525-cd587cf71926?w=200&q=80&fit=crop",
  "فطائر":         "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=200&q=80&fit=crop",
  "مكرونة":        "https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=200&q=80&fit=crop",
  "الأطباق الرئيسية": "https://images.unsplash.com/photo-1546833998-877b37c2e5c6?w=200&q=80&fit=crop",
  "بريك":          "https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=200&q=80&fit=crop",
  "بَرغر":         "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=200&q=80&fit=crop",
  "برغر":          "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=200&q=80&fit=crop",
  "برقر":          "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=200&q=80&fit=crop",
  "همبرجر":        "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=200&q=80&fit=crop",
  "ساندويش":       "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=200&q=80&fit=crop",
  "ساندوتش":       "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=200&q=80&fit=crop",
  "كبسة":          "https://images.unsplash.com/photo-1633237308525-cd587cf71926?w=200&q=80&fit=crop",
  "أرز":           "https://images.unsplash.com/photo-1596797038530-2c107229654b?w=200&q=80&fit=crop",
  "آيس كريم":      "https://images.unsplash.com/photo-1501443762994-82bd5dace89a?w=200&q=80&fit=crop",
  "كيك":           "https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=200&q=80&fit=crop",
  "عصير":          "https://images.unsplash.com/photo-1546173159-315724a31696?w=200&q=80&fit=crop",
  "قهوة":          "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=200&q=80&fit=crop",
  "فلافل":         "https://images.unsplash.com/photo-1600335895229-6e75511892c8?w=200&q=80&fit=crop",
  "default":       "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=200&q=80&fit=crop",
};

export const getCategoryFallbackImage = (name?: string) =>
  (name && CATEGORY_IMAGES[name]) || CATEGORY_IMAGES["default"];

export type CategoryItem = {
  id: string;
  name_ar: string;
  image_url?: string | null;
  restaurant_id?: string | null;
};

type Props = {
  /** If set, only loads categories for this restaurant. */
  restaurantId?: string;
  /** Currently-active category name_ar (shows as highlighted). */
  active?: string;
  /** Show "عرض الكل" link + section title above (default true). */
  showHeader?: boolean;
  /** Section title (default "التصنيفات"). */
  title?: string;
  /** Where the "عرض الكل" link points to. */
  seeAllHref?: string;
  /**
   * Click handler. When omitted, navigates to
   * /food?tab=restaurants&category=<name>.
   */
  onSelect?: (cat: CategoryItem) => void;
  /** Larger circular tiles (used on the home page). */
  size?: "sm" | "md";
};

const CategoryScroller = ({
  restaurantId,
  active,
  showHeader = true,
  title = "التصنيفات",
  seeAllHref = "/food?tab=restaurants",
  onSelect,
  size = "md",
}: Props) => {
  const navigate = useNavigate();
  const [cats, setCats] = useState<CategoryItem[]>([]);

  useEffect(() => {
    let q = supabase
      .from("menu_categories")
      .select("id, name_ar, image_url, restaurant_id")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });
    if (restaurantId) q = q.eq("restaurant_id", restaurantId);
    q.limit(50).then(({ data }) => setCats((data as CategoryItem[]) || []));
  }, [restaurantId]);

  if (cats.length === 0) return null;

  // Deduplicate by name_ar across restaurants — prefer rows with a real image.
  const byName = new Map<string, CategoryItem>();
  cats.forEach((c) => {
    const existing = byName.get(c.name_ar);
    if (!existing) byName.set(c.name_ar, c);
    else if (!existing.image_url && c.image_url) byName.set(c.name_ar, c);
  });
  const unique = Array.from(byName.values());

  const tile = size === "sm" ? "w-12 h-12" : "w-16 h-16";
  const label = size === "sm" ? "text-[10px] max-w-[56px]" : "text-[11px] max-w-[68px]";
  const minW = size === "sm" ? 56 : 68;

  const handleClick = (c: CategoryItem) => {
    if (onSelect) return onSelect(c);
    navigate(`/food?tab=restaurants&category=${encodeURIComponent(c.name_ar)}`);
  };

  return (
    <section>
      {showHeader && (
        <div className="flex items-center justify-between mb-1.5">
          <h2 className="text-[15px] font-black text-foreground">{title}</h2>
          <button
            onClick={() => navigate(seeAllHref)}
            className="text-xs text-primary font-semibold flex items-center gap-0.5"
          >
            عرض الكل
            <ArrowLeftIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
      <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-hide -mx-4 px-4">
        {unique.map((c) => {
          const isActive = active === c.name_ar;
          const src = c.image_url || getCategoryFallbackImage(c.name_ar);
          return (
            <button
              key={c.id}
              onClick={() => handleClick(c)}
              className="flex flex-col items-center gap-1 shrink-0 group"
              style={{ minWidth: minW }}
            >
              <div
                className={`${tile} rounded-full overflow-hidden bg-card border-2 shadow-sm group-hover:shadow-md group-hover:-translate-y-0.5 transition-all ${
                  isActive
                    ? "border-primary ring-2 ring-primary/30"
                    : "border-border/40"
                }`}
              >
                <img
                  src={src}
                  alt={c.name_ar}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src =
                      getCategoryFallbackImage("default");
                  }}
                />
              </div>
              <span
                className={`${label} font-bold text-foreground text-center leading-tight truncate`}
              >
                {c.name_ar}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
};

export default CategoryScroller;
