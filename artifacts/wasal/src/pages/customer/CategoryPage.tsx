import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowRight, Star, Clock, Search, ShoppingCart, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getCategoryFallbackImage } from "@/components/customer/CategoryScroller";

// ─── Design tokens (matches app palette) ──────────────────────────────────────
const PRIMARY    = "#1B4332";
const ACCENT     = "#52B788";
const TEXT_MAIN  = "#1A1A1A";
const TEXT_DIM   = "#888";
const CARD_BG    = "#FFFFFF";

// ─── Types ─────────────────────────────────────────────────────────────────────
interface MenuItem {
  id: string;
  name_ar: string;
  description?: string;
  price: number;
  original_price?: number;
  image_url?: string;
  is_available?: boolean;
  is_featured?: boolean;
  category_id: string;
}

interface Restaurant {
  id: string;
  name_ar: string;
  cover_image?: string;
  logo_url?: string;
  rating?: number;
  estimated_delivery_time?: number;
  delivery_fee?: number;
  is_active?: boolean;
}

interface GroupedResult {
  restaurant: Restaurant;
  items: MenuItem[];
}

// ─── Menu item card ─────────────────────────────────────────────────────────────
const MenuItemCard = ({
  item,
  restaurant,
  onNavigate,
}: {
  item: MenuItem;
  restaurant: Restaurant;
  onNavigate: () => void;
}) => {
  const hasDiscount = item.original_price && item.original_price > item.price;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onNavigate}
      onKeyDown={(e) => e.key === "Enter" && onNavigate()}
      className="flex gap-3 p-3 rounded-2xl cursor-pointer hover:shadow-md transition-all active:scale-[0.98]"
      style={{ backgroundColor: CARD_BG, boxShadow: "0 2px 10px rgba(0,0,0,0.06)" }}
    >
      {/* Item image */}
      <div
        className="relative shrink-0 rounded-xl overflow-hidden bg-gray-100"
        style={{ width: 90, height: 90 }}
      >
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.name_ar}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={(e) => { e.currentTarget.style.display = "none"; }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-3xl">🍽️</div>
        )}
        {item.is_featured && (
          <div
            className="absolute top-1 right-1 text-[9px] font-black px-1.5 py-0.5 rounded-full text-white"
            style={{ backgroundColor: "#F59E0B" }}
          >
            ⭐ شائع
          </div>
        )}
      </div>

      {/* Item info */}
      <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
        <div>
          <p className="font-black text-sm leading-tight line-clamp-1" style={{ color: TEXT_MAIN }}>
            {item.name_ar}
          </p>
          {item.description && (
            <p className="text-[11px] mt-0.5 line-clamp-2" style={{ color: TEXT_DIM }}>
              {item.description}
            </p>
          )}
        </div>
        <div className="flex items-center justify-between mt-2">
          <div className="flex flex-col">
            <span className="font-black text-sm" style={{ color: PRIMARY }}>
              {item.price.toLocaleString("ar-YE")} ر.ي
            </span>
            {hasDiscount && (
              <span className="text-[10px] line-through" style={{ color: TEXT_DIM }}>
                {item.original_price!.toLocaleString("ar-YE")} ر.ي
              </span>
            )}
          </div>
          <div
            className="flex items-center justify-center rounded-full text-white"
            style={{ width: 30, height: 30, backgroundColor: PRIMARY }}
          >
            <ShoppingCart className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Restaurant group header ───────────────────────────────────────────────────
const RestaurantGroup = ({
  group,
  onViewMenu,
}: {
  group: GroupedResult;
  onViewMenu: () => void;
}) => {
  const { restaurant, items } = group;
  const rating = Number(restaurant.rating || 0);

  return (
    <div className="space-y-3">
      {/* Restaurant header */}
      <div
        role="button"
        tabIndex={0}
        onClick={onViewMenu}
        onKeyDown={(e) => e.key === "Enter" && onViewMenu()}
        className="flex items-center gap-3 p-3 rounded-2xl cursor-pointer hover:shadow-md transition-all"
        style={{ backgroundColor: CARD_BG, boxShadow: "0 2px 10px rgba(0,0,0,0.06)" }}
      >
        {/* Logo */}
        <div
          className="shrink-0 rounded-xl overflow-hidden bg-gray-100 border border-gray-100"
          style={{ width: 48, height: 48 }}
        >
          {restaurant.logo_url || restaurant.cover_image ? (
            <img
              src={restaurant.logo_url || restaurant.cover_image}
              alt={restaurant.name_ar}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-xl">🏪</div>
          )}
        </div>

        {/* Name + stats */}
        <div className="flex-1 min-w-0">
          <p className="font-black text-sm line-clamp-1" style={{ color: TEXT_MAIN }}>
            {restaurant.name_ar}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            {rating > 0 && (
              <span className="flex items-center gap-0.5 text-[11px]" style={{ color: TEXT_DIM }}>
                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                {rating.toFixed(1)}
              </span>
            )}
            {restaurant.estimated_delivery_time && (
              <span className="flex items-center gap-0.5 text-[11px]" style={{ color: TEXT_DIM }}>
                <Clock className="w-3 h-3" />
                {restaurant.estimated_delivery_time} د
              </span>
            )}
            <span className="text-[11px]" style={{ color: ACCENT }}>
              {items.length} {items.length === 1 ? "صنف" : "أصناف"}
            </span>
          </div>
        </div>

        {/* Arrow */}
        <div className="shrink-0 flex items-center gap-1 text-xs font-bold" style={{ color: PRIMARY }}>
          عرض المنيو
          <ChevronRight className="w-3.5 h-3.5" />
        </div>
      </div>

      {/* Items */}
      <div className="space-y-2.5 pr-2">
        {items.map((item) => (
          <MenuItemCard
            key={item.id}
            item={item}
            restaurant={restaurant}
            onNavigate={onViewMenu}
          />
        ))}
      </div>
    </div>
  );
};

// ─── Main page ─────────────────────────────────────────────────────────────────
const CategoryPage = () => {
  const { name } = useParams<{ name: string }>();
  const navigate = useNavigate();
  const categoryName = decodeURIComponent(name || "");

  const [groups, setGroups] = useState<GroupedResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!categoryName) return;
    setLoading(true);

    const load = async () => {
      try {
        // 1. Find all menu_categories matching this name (across all restaurants)
        const { data: cats } = await supabase
          .from("menu_categories")
          .select("id, restaurant_id")
          .eq("name_ar", categoryName)
          .eq("is_active", true);

        if (!cats || cats.length === 0) { setGroups([]); setLoading(false); return; }

        const catIds = cats.map((c: any) => c.id);
        const restaurantIds = [...new Set(cats.map((c: any) => c.restaurant_id).filter(Boolean))];

        // 2. Fetch menu items for these categories
        const { data: items } = await supabase
          .from("menu_items")
          .select("id, name_ar, description, price, original_price, image_url, is_available, is_featured, category_id")
          .in("category_id", catIds)
          .neq("is_available", false)
          .order("sort_order", { ascending: true });

        if (!items || items.length === 0) { setGroups([]); setLoading(false); return; }

        // 3. Fetch restaurants
        const { data: restaurants } = await supabase
          .from("restaurants")
          .select("id, name_ar, cover_image, logo_url, rating, estimated_delivery_time, delivery_fee, is_active")
          .in("id", restaurantIds)
          .neq("is_active", false);

        if (!restaurants) { setGroups([]); setLoading(false); return; }

        // 4. Build category_id → restaurant_id map
        const catToRestaurant: Record<string, string> = {};
        cats.forEach((c: any) => { catToRestaurant[c.id] = c.restaurant_id; });

        // 5. Group items by restaurant
        const grouped: Record<string, MenuItem[]> = {};
        items.forEach((item: any) => {
          const rId = catToRestaurant[item.category_id];
          if (!rId) return;
          if (!grouped[rId]) grouped[rId] = [];
          grouped[rId].push(item);
        });

        const result: GroupedResult[] = restaurants
          .filter((r: any) => grouped[r.id]?.length > 0)
          .map((r: any) => ({ restaurant: r, items: grouped[r.id] || [] }))
          .sort((a, b) => (b.restaurant.rating || 0) - (a.restaurant.rating || 0));

        setGroups(result);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [categoryName]);

  const filtered = useMemo(() => {
    if (!search.trim()) return groups;
    const q = search.trim();
    return groups
      .map((g) => ({
        ...g,
        items: g.items.filter(
          (i) =>
            i.name_ar.includes(q) ||
            (i.description || "").includes(q)
        ),
      }))
      .filter((g) => g.items.length > 0);
  }, [groups, search]);

  const totalItems = filtered.reduce((sum, g) => sum + g.items.length, 0);
  const coverImg = getCategoryFallbackImage(categoryName);

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#FFFFFF" }} dir="rtl">

      {/* ── Hero header ── */}
      <div className="relative h-40 overflow-hidden" style={{ backgroundColor: PRIMARY }}>
        {/* Background category image */}
        <img
          src={coverImg}
          alt={categoryName}
          className="absolute inset-0 w-full h-full object-cover opacity-30"
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60" />

        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="absolute top-4 right-4 z-10 flex items-center justify-center rounded-full bg-white/20 backdrop-blur-sm border border-white/30 text-white"
          style={{ width: 36, height: 36 }}
        >
          <ArrowRight className="w-4 h-4" />
        </button>

        {/* Title */}
        <div className="absolute bottom-4 right-4 left-4 z-10">
          <p className="text-white/70 text-xs font-medium mb-0.5">تصفح الأصناف</p>
          <h1 className="text-white font-black text-2xl leading-tight">{categoryName}</h1>
          {!loading && (
            <p className="text-white/80 text-xs mt-0.5">
              {totalItems} صنف في {filtered.length} {filtered.length === 1 ? "مطعم" : "مطاعم"}
            </p>
          )}
        </div>
      </div>

      {/* ── Search bar ── */}
      <div className="px-4 -mt-5 relative z-10">
        <div
          className="flex items-center gap-2 px-3 py-2.5 rounded-2xl"
          style={{ backgroundColor: CARD_BG, boxShadow: "0 4px 20px rgba(0,0,0,0.10)" }}
        >
          <Search className="w-4 h-4 shrink-0" style={{ color: TEXT_DIM }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`ابحث في أصناف ${categoryName}...`}
            className="flex-1 bg-transparent outline-none text-sm"
            style={{ color: TEXT_MAIN }}
          />
        </div>
      </div>

      {/* ── Content ── */}
      <div className="px-4 pt-5 pb-24 space-y-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div
              className="w-10 h-10 rounded-full border-4 border-t-transparent animate-spin"
              style={{ borderColor: `${PRIMARY}40`, borderTopColor: PRIMARY }}
            />
            <p className="text-sm" style={{ color: TEXT_DIM }}>جارٍ التحميل…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
            <div className="text-6xl">🍽️</div>
            <div>
              <p className="font-black text-lg" style={{ color: TEXT_MAIN }}>
                {search ? "لا نتائج مطابقة" : "لا توجد أصناف حالياً"}
              </p>
              <p className="text-sm mt-1" style={{ color: TEXT_DIM }}>
                {search
                  ? "جرّب كلمة بحث مختلفة"
                  : "لم يتم إضافة أصناف لهذه الفئة بعد"}
              </p>
            </div>
            {search && (
              <button
                onClick={() => setSearch("")}
                className="text-sm font-bold px-4 py-2 rounded-xl text-white"
                style={{ backgroundColor: PRIMARY }}
              >
                مسح البحث
              </button>
            )}
          </div>
        ) : (
          filtered.map((group) => (
            <RestaurantGroup
              key={group.restaurant.id}
              group={group}
              onViewMenu={() => navigate(`/restaurants/${group.restaurant.id}`)}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default CategoryPage;
