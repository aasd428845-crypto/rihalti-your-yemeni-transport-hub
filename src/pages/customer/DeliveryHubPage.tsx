import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Search, MapPin, Star, Clock, Truck, ChevronDown, UtensilsCrossed,
  ChefHat, Pizza, Beef, Fish, IceCream, Coffee, Flame, ShoppingCart,
  Pill, Apple, Milk, Wheat, Baby, Heart, Leaf, Sandwich, Soup,
  Tag, Zap, TrendingUp, Sparkles, X
} from "lucide-react";
import { getActiveRestaurants, getServiceTypes, getRestaurantCuisines } from "@/lib/restaurantApi";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

// ─── Types ───────────────────────────────────────────────────────────────────
type Tab = "restaurants" | "grocery" | "pharmacy";

// ─── Cuisine Fallback Images (Unsplash) ──────────────────────────────────────
const CUISINE_IMAGES: Record<string, string> = {
  "يمني":           "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=600&q=80&fit=crop",
  "برجر":           "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&q=80&fit=crop",
  "بيتزا":          "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&q=80&fit=crop",
  "مأكولات بحرية":  "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&q=80&fit=crop",
  "حلويات":         "https://images.unsplash.com/photo-1551024601-bec78aea704b?w=600&q=80&fit=crop",
  "مشروبات":        "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600&q=80&fit=crop",
  "شاورما":         "https://images.unsplash.com/photo-1561651823-34feb02250e4?w=600&q=80&fit=crop",
  "مرق":            "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=600&q=80&fit=crop",
  "default":        "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&q=80&fit=crop",
};

const CITIES = ["صنعاء", "عدن", "تعز", "المكلا", "إب", "الحديدة", "ذمار", "سيئون"];

// ─── Skeleton Card ────────────────────────────────────────────────────────────
const SkeletonCard = () => (
  <div className="rounded-2xl overflow-hidden bg-card border border-border/30 shadow-sm animate-pulse">
    <div className="h-44 bg-muted" />
    <div className="p-4 space-y-3">
      <div className="h-4 bg-muted rounded w-3/4" />
      <div className="h-3 bg-muted rounded w-1/2" />
      <div className="flex gap-3">
        <div className="h-3 bg-muted rounded w-12" />
        <div className="h-3 bg-muted rounded w-12" />
        <div className="h-3 bg-muted rounded w-16" />
      </div>
    </div>
  </div>
);

// ─── Restaurant Card ──────────────────────────────────────────────────────────
const RestaurantCard = ({
  r, onClick, size = "normal", accentText
}: {
  r: any; onClick: () => void; size?: "normal" | "featured"; accentText: string;
}) => {
  const imgH = size === "featured" ? "h-52" : "h-44";
  const minW = size === "featured" ? "min-w-[280px]" : "";

  // Pick the best available image
  const primaryCuisine = r.cuisine_type?.[0] || "";
  const fallbackImg = CUISINE_IMAGES[primaryCuisine] || CUISINE_IMAGES["default"];
  const heroSrc = r.cover_image || r.cover_image_url || fallbackImg;

  const isOpen = r.is_active !== false;

  return (
    <Card
      data-testid={`card-restaurant-${r.id}`}
      onClick={onClick}
      className={`cursor-pointer overflow-hidden rounded-2xl border border-border/20 bg-card shadow-md hover:shadow-2xl hover:-translate-y-2 hover:border-amber-400/40 transition-all duration-300 group ${minW}`}
    >
      <div className={`${imgH} relative overflow-hidden`}>
        <img
          src={heroSrc}
          alt={r.name_ar}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 ease-out"
          loading="lazy"
          onError={(e) => { (e.target as HTMLImageElement).src = CUISINE_IMAGES["default"]; }}
        />
        {/* Dark gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

        {/* Gold shimmer on hover */}
        <div className="absolute inset-0 bg-gradient-to-tr from-amber-400/0 via-amber-300/0 to-amber-400/0 group-hover:from-amber-400/10 group-hover:via-amber-300/5 group-hover:to-amber-400/10 transition-all duration-500" />

        {/* Featured badge */}
        {r.is_featured && (
          <Badge className="absolute top-3 right-3 bg-gradient-to-r from-amber-500 to-amber-600 text-white border-0 shadow-lg text-xs font-bold gap-1 px-2.5">
            <Sparkles className="w-3 h-3" />مميز
          </Badge>
        )}

        {/* Closed overlay */}
        {!isOpen && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="bg-black/70 text-white text-xs font-bold px-3 py-1.5 rounded-full backdrop-blur-sm">مغلق الآن</span>
          </div>
        )}

        {/* Logo thumbnail */}
        {r.logo_url && (
          <div className="absolute bottom-12 left-3 w-11 h-11 rounded-xl bg-white shadow-xl overflow-hidden border-2 border-white/30 group-hover:scale-110 transition-transform duration-300">
            <img src={r.logo_url} alt="" className="w-full h-full object-cover" />
          </div>
        )}

        {/* Name & cuisine at bottom */}
        <div className="absolute bottom-3 right-3 left-3 text-white">
          <h3 className="font-black text-base drop-shadow-lg leading-tight">{r.name_ar}</h3>
          {r.cuisine_type?.length > 0 && (
            <p className="text-xs text-white/75 mt-0.5 drop-shadow">{r.cuisine_type.slice(0, 2).join(" • ")}</p>
          )}
        </div>
      </div>

      <CardContent className="p-3.5">
        <div className="flex items-center gap-2.5 text-xs text-muted-foreground">
          <span className="flex items-center gap-1 px-2.5 py-1 rounded-full font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400">
            <Star className="w-3.5 h-3.5 fill-current" />{Number(r.rating || 0).toFixed(1)}
          </span>
          {r.estimated_delivery_time && (
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />{r.estimated_delivery_time} د
            </span>
          )}
          <span className="flex items-center gap-1 mr-auto">
            <Truck className="w-3.5 h-3.5" />
            {r.delivery_fee === 0
              ? <span className="text-emerald-600 dark:text-emerald-400 font-semibold">مجاني</span>
              : `${r.delivery_fee} ر.ي`}
          </span>
        </div>
        {r.min_order_amount > 0 && (
          <p className="text-xs text-muted-foreground mt-2 border-t border-border/40 pt-2 flex items-center gap-1">
            <ShoppingCart className="w-3 h-3" />
            الحد الأدنى: <span className="font-semibold text-foreground">{r.min_order_amount} ر.ي</span>
          </p>
        )}
      </CardContent>
    </Card>
  );
};

// ─── Section Header ───────────────────────────────────────────────────────────
const SectionHeader = ({ icon: Icon, title, count, accentText }: {
  icon: any; title: string; count?: number; accentText: string;
}) => (
  <div className="flex items-center gap-2.5 mb-5">
    <div className={`p-1.5 rounded-lg ${accentText} bg-current/10`}>
      <Icon className={`w-5 h-5 ${accentText}`} />
    </div>
    <h2 className="text-xl font-black text-foreground">{title}</h2>
    {count !== undefined && (
      <Badge variant="secondary" className="mr-auto text-xs font-semibold">{count}</Badge>
    )}
  </div>
);

// ─── Empty State ──────────────────────────────────────────────────────────────
const EmptyState = ({ emoji, title, desc }: { emoji: string; title: string; desc: string }) => (
  <Card className="rounded-2xl border-border/30">
    <CardContent className="py-20 text-center">
      <div className="text-6xl mb-4">{emoji}</div>
      <p className="text-foreground font-black text-lg mb-1">{title}</p>
      <p className="text-muted-foreground text-sm">{desc}</p>
    </CardContent>
  </Card>
);

// ─── Coming Soon Section ──────────────────────────────────────────────────────
const ComingSoonSection = ({ tab, accentText, accentBg, accentLight, accentBorder }: any) => (
  <div className="py-20 text-center space-y-6">
    <div className={`w-24 h-24 mx-auto rounded-full ${accentLight} flex items-center justify-center text-5xl shadow-inner border ${accentBorder}`}>
      {tab.emoji}
    </div>
    <div className="space-y-2">
      <h2 className="text-3xl font-black text-foreground">قريباً في {tab.label}</h2>
      <p className="text-muted-foreground max-w-md mx-auto">نحن نعمل بجد لتوفير أفضل تجربة تسوق في قسم {tab.label}. انتظرونا!</p>
    </div>
    <Button className={`${accentBg} text-white rounded-full px-8 py-6 h-auto text-lg font-bold shadow-lg hover:opacity-90 transition-all`}>
      أبلغني عند التوفر
    </Button>
  </div>
);

const DeliveryHubPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<Tab>("restaurants");
  const [selectedCity, setSelectedCity] = useState("صنعاء");
  const [cuisineFilter, setCuisineFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [serviceTypes, setServiceTypes] = useState<any[]>([]);
  const [cuisines, setCuisines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch initial data
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [servicesData, cuisinesData] = await Promise.all([
          getServiceTypes(),
          getRestaurantCuisines()
        ]);
        setServiceTypes(servicesData || []);
        setCuisines([{ id: 'all', name_ar: 'الكل', image_url: null }, ...(cuisinesData || [])]);
      } catch (err) {
        console.error("Error loading initial data:", err);
      }
    };
    loadInitialData();
  }, []);

  // Fetch restaurants based on city
  useEffect(() => {
    setLoading(true);
    getActiveRestaurants(selectedCity === "all" ? undefined : selectedCity)
      .then((data) => setRestaurants(data || []))
      .catch(() => setRestaurants([]))
      .finally(() => setLoading(false));
  }, [selectedCity]);

  // Handle URL params
  useEffect(() => {
    const t = searchParams.get("tab") as Tab;
    if (t && ["restaurants", "grocery", "pharmacy"].includes(t)) setActiveTab(t);
    const q = searchParams.get("q");
    if (q) setSearch(q);
  }, [searchParams]);

  const tab = serviceTypes.find(s => s.id === activeTab) || {
    name_ar: activeTab === "restaurants" ? "مطاعم" : activeTab === "grocery" ? "بقالة" : "صيدلية",
    accentBg: activeTab === "restaurants" ? "bg-orange-500" : activeTab === "grocery" ? "bg-emerald-500" : "bg-blue-500",
    accentText: activeTab === "restaurants" ? "text-orange-600" : activeTab === "grocery" ? "text-emerald-600" : "text-blue-600",
  };

  const filtered = restaurants.filter((r) => {
    const matchesCuisine = cuisineFilter === "all" || r.cuisine_type?.includes(cuisineFilter);
    const matchesSearch = !search || r.name_ar.toLowerCase().includes(search.toLowerCase());
    const matchesTab = activeTab === "restaurants"; // Placeholder for other tabs
    return matchesCuisine && matchesSearch && matchesTab;
  });

  const featured = filtered.filter((r) => r.is_featured);
  const mostOrdered = filtered.filter((r) => r.rating >= 4.5);
  const newest = filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  const showSections = !search && cuisineFilter === "all";

  return (
    <div className="min-h-screen bg-background pb-24" dir="rtl">
      {/* ── Header ────────────────────────────────────────────── */}
      <div className="bg-card border-b border-border/30 sticky top-0 z-30 shadow-sm">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="flex flex-col md:flex-row md:items-center gap-4 py-4">
            
            {/* Dynamic Tabs (Service Types) */}
            <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
              {serviceTypes.map((type) => {
                const isActive = activeTab === (type.name_ar === 'مطاعم' ? 'restaurants' : type.name_ar === 'بقالة' ? 'grocery' : 'pharmacy');
                const accentBg = type.name_ar === 'مطاعم' ? 'bg-orange-500' : type.name_ar === 'بقالة' ? 'bg-emerald-500' : 'bg-blue-500';
                
                return (
                  <button
                    key={type.id}
                    onClick={() => setActiveTab(type.name_ar === 'مطاعم' ? 'restaurants' : type.name_ar === 'بقالة' ? 'grocery' : 'pharmacy')}
                    className={`flex flex-col items-center gap-2 p-3 rounded-2xl min-w-[100px] transition-all duration-300 ${
                      isActive 
                        ? `${accentBg} text-white shadow-lg scale-105` 
                        : "bg-muted/50 text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-xl overflow-hidden shadow-inner ${isActive ? "bg-white/20" : "bg-white"}`}>
                      {type.image_url ? (
                        <img src={type.image_url} alt={type.name_ar} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-2xl">
                          {type.name_ar === 'مطاعم' ? '🍽️' : type.name_ar === 'بقالة' ? '🛒' : '💊'}
                        </div>
                      )}
                    </div>
                    <span className="text-xs font-black">{type.name_ar}</span>
                  </button>
                );
              })}
            </div>

            {/* City Picker */}
            <div className="flex items-center gap-2 px-4 py-2 bg-muted/40 rounded-2xl border border-border/40 shrink-0">
              <MapPin className="w-4 h-4 text-primary" />
              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                className="bg-transparent text-sm font-bold focus:outline-none cursor-pointer"
              >
                {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder={`ابحث في ${tab.name_ar}...`}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-14 pr-12 text-base rounded-2xl border-border/60 bg-card shadow-sm focus:shadow-md transition-all duration-200"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Content ───────────────────────────────────────────── */}
      <div className="container mx-auto px-4 py-8 max-w-6xl">

        {/* Dynamic Cuisine/Category Pills */}
        <div className="flex gap-3 overflow-x-auto pb-4 mb-8 scrollbar-hide">
          {cuisines.map((cat) => {
            const isActive = cuisineFilter === cat.name_ar || (cat.id === 'all' && cuisineFilter === 'all');
            return (
              <button
                key={cat.id}
                onClick={() => setCuisineFilter(cat.id === 'all' ? 'all' : cat.name_ar)}
                className={`flex flex-col items-center gap-2 shrink-0 transition-all duration-300 group`}
              >
                <div className={`w-16 h-16 rounded-2xl overflow-hidden border-2 transition-all ${
                  isActive 
                    ? "border-primary shadow-lg scale-110" 
                    : "border-transparent bg-card hover:border-primary/30"
                }`}>
                  {cat.image_url ? (
                    <img src={cat.image_url} alt={cat.name_ar} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary">
                      {cat.id === 'all' ? <UtensilsCrossed className="w-6 h-6" /> : <ChefHat className="w-6 h-6" />}
                    </div>
                  )}
                </div>
                <span className={`text-[11px] font-bold ${isActive ? "text-primary" : "text-muted-foreground"}`}>
                  {cat.name_ar}
                </span>
              </button>
            );
          })}
        </div>

        {/* ── Restaurants Content ─────────────────────────────────── */}
        {activeTab === "restaurants" && (
          <div className="space-y-12">
            {loading ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
              </div>
            ) : filtered.length === 0 ? (
              <EmptyState emoji="🔍" title="لا توجد نتائج" desc="جرب البحث بكلمة مختلفة" />
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {filtered.map((r) => (
                  <RestaurantCard
                    key={r.id}
                    r={r}
                    onClick={() => navigate(`/restaurants/${r.id}`)}
                    accentText={tab.accentText}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Grocery & Pharmacy Fallbacks */}
        {(activeTab === "grocery" || activeTab === "pharmacy") && (
          <ComingSoonSection tab={{ label: tab.name_ar, emoji: activeTab === "grocery" ? "🛒" : "💊" }} accentBg={tab.accentBg} />
        )}
      </div>
    </div>
  );
};

export default DeliveryHubPage;
