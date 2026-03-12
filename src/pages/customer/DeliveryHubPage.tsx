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
import { getActiveRestaurants } from "@/lib/restaurantApi";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

// ─── Types ───────────────────────────────────────────────────────────────────
type Tab = "restaurants" | "grocery" | "pharmacy";

// ─── Config ──────────────────────────────────────────────────────────────────
const TABS = [
  {
    id: "restaurants" as Tab,
    label: "مطاعم",
    emoji: "🍽️",
    tagline: "اطلب من أشهى المطاعم",
    accentFrom: "from-orange-500",
    accentTo: "to-amber-400",
    accentBg: "bg-orange-500",
    accentLight: "bg-orange-50 dark:bg-orange-950/30",
    accentText: "text-orange-600 dark:text-orange-400",
    accentBorder: "border-orange-200 dark:border-orange-800",
    accentRing: "ring-orange-400",
    gradient: "from-orange-500/10 via-amber-400/5 to-transparent",
  },
  {
    id: "grocery" as Tab,
    label: "بقالة",
    emoji: "🛒",
    tagline: "احتياجاتك اليومية بنقرة واحدة",
    accentFrom: "from-emerald-500",
    accentTo: "to-green-400",
    accentBg: "bg-emerald-500",
    accentLight: "bg-emerald-50 dark:bg-emerald-950/30",
    accentText: "text-emerald-600 dark:text-emerald-400",
    accentBorder: "border-emerald-200 dark:border-emerald-800",
    accentRing: "ring-emerald-400",
    gradient: "from-emerald-500/10 via-green-400/5 to-transparent",
  },
  {
    id: "pharmacy" as Tab,
    label: "صيدلية",
    emoji: "💊",
    tagline: "دواؤك يصل لبابك",
    accentFrom: "from-blue-500",
    accentTo: "to-cyan-400",
    accentBg: "bg-blue-500",
    accentLight: "bg-blue-50 dark:bg-blue-950/30",
    accentText: "text-blue-600 dark:text-blue-400",
    accentBorder: "border-blue-200 dark:border-blue-800",
    accentRing: "ring-blue-400",
    gradient: "from-blue-500/10 via-cyan-400/5 to-transparent",
  },
];

const RESTAURANT_CATEGORIES = [
  { key: "all", label: "الكل", icon: UtensilsCrossed },
  { key: "يمني", label: "يمني", icon: ChefHat },
  { key: "برجر", label: "برجر", icon: Beef },
  { key: "بيتزا", label: "بيتزا", icon: Pizza },
  { key: "مأكولات بحرية", label: "بحرية", icon: Fish },
  { key: "حلويات", label: "حلويات", icon: IceCream },
  { key: "مشروبات", label: "مشروبات", icon: Coffee },
  { key: "شاورما", label: "شاورما", icon: Sandwich },
  { key: "مرق", label: "مرق", icon: Soup },
];

const GROCERY_CATEGORIES = [
  { key: "all", label: "الكل", icon: ShoppingCart },
  { key: "خضروات", label: "خضروات", icon: Leaf },
  { key: "فواكه", label: "فواكه", icon: Apple },
  { key: "ألبان", label: "ألبان", icon: Milk },
  { key: "مخبوزات", label: "مخبوزات", icon: Wheat },
  { key: "أطفال", label: "أطفال", icon: Baby },
];

const PHARMACY_CATEGORIES = [
  { key: "all", label: "الكل", icon: Pill },
  { key: "أدوية", label: "أدوية", icon: Heart },
  { key: "مكملات", label: "مكملات", icon: Sparkles },
  { key: "عناية", label: "عناية", icon: Leaf },
];

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
  return (
    <Card
      data-testid={`card-restaurant-${r.id}`}
      onClick={onClick}
      className={`cursor-pointer overflow-hidden rounded-2xl border-border/30 bg-card shadow-md hover:shadow-xl hover:-translate-y-1.5 hover:border-border/60 transition-all duration-300 group ${minW}`}
    >
      <div className={`${imgH} relative overflow-hidden`}>
        {r.cover_image ? (
          <img
            src={r.cover_image}
            alt={r.name_ar}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-orange-100 via-amber-50 to-orange-50 dark:from-orange-950/40 dark:to-amber-950/20 flex items-center justify-center">
            <UtensilsCrossed className="w-16 h-16 text-orange-200 dark:text-orange-800" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
        {r.is_featured && (
          <Badge className="absolute top-3 right-3 bg-amber-500 text-white border-0 shadow-lg text-xs font-bold gap-1">
            <Sparkles className="w-3 h-3" />مميز
          </Badge>
        )}
        {r.logo_url && (
          <div className="absolute bottom-3 left-3 w-12 h-12 rounded-xl bg-card shadow-lg overflow-hidden border-2 border-white/20 group-hover:scale-105 transition-transform">
            <img src={r.logo_url} alt="" className="w-full h-full object-cover" />
          </div>
        )}
        <div className="absolute bottom-3 right-3 text-white">
          <h3 className="font-bold text-base drop-shadow-lg leading-tight">{r.name_ar}</h3>
          {r.cuisine_type?.length > 0 && (
            <p className="text-xs text-white/80 mt-0.5 drop-shadow">{r.cuisine_type.slice(0, 2).join(" • ")}</p>
          )}
        </div>
      </div>
      <CardContent className="p-4">
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className={`flex items-center gap-1 px-2.5 py-1 rounded-full font-bold ${accentText} bg-orange-50 dark:bg-orange-950/30`}>
            <Star className="w-3.5 h-3.5 fill-current" />{r.rating || "0"}
          </span>
          {r.estimated_delivery_time && (
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />{r.estimated_delivery_time} د
            </span>
          )}
          <span className="flex items-center gap-1 mr-auto">
            <Truck className="w-3.5 h-3.5" />
            {r.delivery_fee === 0 ? <span className="text-emerald-600 font-semibold">مجاني</span> : `${r.delivery_fee} ر.ي`}
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
      <p className="text-foreground font-bold text-lg mb-1">{title}</p>
      <p className="text-muted-foreground text-sm">{desc}</p>
    </CardContent>
  </Card>
);

// ─── Grocery / Pharmacy Coming Soon ──────────────────────────────────────────
const ComingSoonSection = ({
  tab,
  accentText,
  accentBg,
  accentLight,
  accentBorder,
}: {
  tab: (typeof TABS)[number];
  accentText: string;
  accentBg: string;
  accentLight: string;
  accentBorder: string;
}) => {
  const items =
    tab.id === "grocery"
      ? [
          { name: "سوبرماركت الريف", desc: "منتجات طازجة يومياً", time: "25 د", fee: "500 ر.ي", rating: "4.8", emoji: "🥦" },
          { name: "بقالة الأمين", desc: "جميع احتياجاتك المنزلية", time: "30 د", fee: "300 ر.ي", rating: "4.6", emoji: "🛒" },
          { name: "ماركت فريش", desc: "خضروات وفواكه طازجة", time: "20 د", fee: "مجاني", rating: "4.9", emoji: "🍎" },
          { name: "البقالة الكبرى", desc: "منتجات متنوعة وأسعار منافسة", time: "35 د", fee: "400 ر.ي", rating: "4.5", emoji: "🥛" },
        ]
      : [
          { name: "صيدلية الشفاء", desc: "أدوية وفيتامينات ومستلزمات", time: "20 د", fee: "200 ر.ي", rating: "4.9", emoji: "💊" },
          { name: "صيدلية النور", desc: "عناية بالجلد ومكملات غذائية", time: "25 د", fee: "300 ر.ي", rating: "4.7", emoji: "🏥" },
          { name: "صيدلية الأمل", desc: "منتجات طبية ووصفات طبية", time: "30 د", fee: "مجاني", rating: "4.8", emoji: "🩺" },
          { name: "ميديكير فارم", desc: "أدوية أصلية بضمان الجودة", time: "15 د", fee: "150 ر.ي", rating: "4.6", emoji: "💉" },
        ];

  return (
    <div className="space-y-10">
      {/* Exclusive Offers */}
      <div>
        <SectionHeader icon={Tag} title="عروض حصرية" accentText={accentText} />
        <div className="flex gap-4 overflow-x-auto pb-3 scrollbar-hide">
          {items.slice(0, 3).map((item, i) => (
            <div
              key={i}
              className={`min-w-[240px] rounded-2xl border ${accentBorder} ${accentLight} p-5 cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group`}
            >
              <div className="text-4xl mb-3 group-hover:scale-110 transition-transform duration-300">{item.emoji}</div>
              <h3 className={`font-bold text-base ${accentText} mb-1`}>{item.name}</h3>
              <p className="text-sm text-muted-foreground mb-3">{item.desc}</p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className={`flex items-center gap-1 font-bold ${accentText}`}>
                  <Star className="w-3.5 h-3.5 fill-current" />{item.rating}
                </span>
                <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{item.time}</span>
                <span className={`mr-auto font-semibold ${item.fee === "مجاني" ? "text-emerald-600" : ""}`}>{item.fee}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Most Ordered */}
      <div>
        <SectionHeader icon={TrendingUp} title="الأكثر طلباً" accentText={accentText} />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {items.map((item, i) => (
            <Card
              key={i}
              className="cursor-pointer rounded-2xl border-border/30 shadow-md hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 group overflow-hidden"
            >
              <div className={`h-32 ${accentLight} flex items-center justify-center`}>
                <span className="text-6xl group-hover:scale-110 transition-transform duration-300">{item.emoji}</span>
              </div>
              <CardContent className="p-4">
                <h3 className={`font-bold text-sm ${accentText} mb-1`}>{item.name}</h3>
                <p className="text-xs text-muted-foreground mb-3">{item.desc}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground border-t border-border/40 pt-2">
                  <span className={`flex items-center gap-1 font-bold ${accentText}`}>
                    <Star className="w-3 h-3 fill-current" />{item.rating}
                  </span>
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{item.time}</span>
                  <span className={`mr-auto text-xs font-semibold ${item.fee === "مجاني" ? "text-emerald-600" : ""}`}>{item.fee}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Coming Soon Notice */}
      <div className={`rounded-2xl border ${accentBorder} ${accentLight} p-8 text-center`}>
        <div className="text-5xl mb-3">{tab.emoji}</div>
        <h3 className={`text-xl font-black ${accentText} mb-2`}>قريباً في وصل</h3>
        <p className="text-muted-foreground text-sm max-w-sm mx-auto">
          نعمل على تجهيز أفضل {tab.label === "بقالة" ? "متاجر البقالة" : "الصيدليات"} في مدينتك.
          كن أول من يعرف بالإطلاق الرسمي.
        </p>
        <Button className={`mt-5 ${accentBg} text-white hover:opacity-90 shadow-lg gap-2`}>
          <Zap className="w-4 h-4" />أبلغني عند الإطلاق
        </Button>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const DeliveryHubPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();

  const initialTab = (searchParams.get("tab") as Tab) || "restaurants";
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  const [search, setSearch] = useState("");
  const [cuisineFilter, setCuisineFilter] = useState("all");
  const [selectedCity, setSelectedCity] = useState("all");
  const [cityOpen, setCityOpen] = useState(false);
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const cityRef = useRef<HTMLDivElement>(null);

  const tab = TABS.find((t) => t.id === activeTab)!;

  // Sync tab with URL
  const switchTab = (t: Tab) => {
    setActiveTab(t);
    setSearch("");
    setCuisineFilter("all");
    setSearchParams({ tab: t });
  };

  // Load user city
  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("city")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.city) setSelectedCity(data.city);
      });
  }, [user]);

  // Load restaurants
  useEffect(() => {
    if (activeTab !== "restaurants") return;
    setLoading(true);
    getActiveRestaurants(selectedCity === "all" ? undefined : selectedCity)
      .then((data) => setRestaurants(data || []))
      .catch(() => setRestaurants([]))
      .finally(() => setLoading(false));
  }, [selectedCity, activeTab]);

  // Close city dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (cityRef.current && !cityRef.current.contains(e.target as Node)) {
        setCityOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Derived data
  const categories = activeTab === "restaurants"
    ? RESTAURANT_CATEGORIES
    : activeTab === "grocery"
    ? GROCERY_CATEGORIES
    : PHARMACY_CATEGORIES;

  const filtered = restaurants.filter((r) => {
    const matchSearch =
      !search ||
      r.name_ar?.includes(search) ||
      r.name_en?.toLowerCase().includes(search.toLowerCase());
    const matchCuisine =
      cuisineFilter === "all" ||
      (r.cuisine_type && r.cuisine_type.includes(cuisineFilter));
    return matchSearch && matchCuisine;
  });

  const featured = filtered.filter((r) => r.is_featured);
  const mostOrdered = filtered.slice(0, 8);
  const newest = [...filtered].sort((a, b) =>
    new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
  ).slice(0, 8);

  const showSections = !search && cuisineFilter === "all";

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* ── Hero / Top Banner ─────────────────────────────────── */}
      <div className={`relative overflow-hidden bg-gradient-to-bl ${tab.gradient} border-b border-border/40`}>
        <div className="absolute inset-0 opacity-30 pointer-events-none select-none">
          <div className={`absolute top-[-60px] right-[-60px] w-[300px] h-[300px] rounded-full bg-gradient-to-br ${tab.accentFrom} ${tab.accentTo} blur-3xl opacity-20`} />
          <div className={`absolute bottom-[-40px] left-[-40px] w-[200px] h-[200px] rounded-full bg-gradient-to-br ${tab.accentFrom} ${tab.accentTo} blur-2xl opacity-10`} />
        </div>
        <div className="container mx-auto px-4 pt-24 pb-8 max-w-6xl relative">

          {/* Tabs */}
          <div className="flex gap-3 mb-8 justify-center">
            {TABS.map((t) => {
              const isActive = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  data-testid={`tab-${t.id}`}
                  onClick={() => switchTab(t.id)}
                  className={`flex flex-col items-center gap-2 px-6 py-4 rounded-2xl transition-all duration-300 font-bold text-sm group ${
                    isActive
                      ? `${t.accentBg} text-white shadow-xl scale-105`
                      : "bg-card border border-border/50 text-muted-foreground hover:border-border hover:shadow-md hover:-translate-y-0.5"
                  }`}
                >
                  <span className={`text-3xl transition-transform duration-300 ${isActive ? "scale-110" : "group-hover:scale-110"}`}>
                    {t.emoji}
                  </span>
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>

          {/* Tagline */}
          <div className="text-center mb-7">
            <h1 className="text-3xl font-black text-foreground mb-1">{tab.tagline}</h1>
            <p className="text-muted-foreground text-sm">توصيل سريع لباب منزلك في أي مدينة</p>
          </div>

          {/* Search + City Picker */}
          <div className="flex gap-3 max-w-2xl mx-auto">
            {/* City Picker */}
            <div ref={cityRef} className="relative shrink-0">
              <button
                data-testid="btn-city-picker"
                onClick={() => setCityOpen(!cityOpen)}
                className={`flex items-center gap-2 h-14 px-4 rounded-2xl bg-card border ${tab.accentBorder} shadow-sm hover:shadow-md transition-all duration-200 font-semibold text-sm ${tab.accentText} whitespace-nowrap`}
              >
                <MapPin className="w-4 h-4" />
                <span>{selectedCity === "all" ? "كل المدن" : selectedCity}</span>
                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${cityOpen ? "rotate-180" : ""}`} />
              </button>
              {cityOpen && (
                <div className="absolute top-full right-0 mt-2 bg-card border border-border rounded-2xl shadow-xl z-50 py-2 min-w-[160px] animate-in slide-in-from-top-2 duration-200">
                  <button
                    className={`w-full text-right px-4 py-2.5 text-sm font-medium hover:bg-muted/60 transition-colors ${selectedCity === "all" ? tab.accentText + " font-bold" : ""}`}
                    onClick={() => { setSelectedCity("all"); setCityOpen(false); }}
                  >
                    كل المدن
                  </button>
                  {CITIES.map((city) => (
                    <button
                      key={city}
                      className={`w-full text-right px-4 py-2.5 text-sm hover:bg-muted/60 transition-colors ${selectedCity === city ? tab.accentText + " font-bold" : "text-foreground"}`}
                      onClick={() => { setSelectedCity(city); setCityOpen(false); }}
                    >
                      {city}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                data-testid="input-search"
                placeholder={
                  activeTab === "restaurants"
                    ? "ابحث عن مطعم أو طبق..."
                    : activeTab === "grocery"
                    ? "ابحث عن منتج أو متجر..."
                    : "ابحث عن دواء أو صيدلية..."
                }
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-14 pr-12 text-base rounded-2xl border-border/60 bg-card shadow-sm focus:shadow-md transition-all duration-200 focus:ring-2"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Content ───────────────────────────────────────────── */}
      <div className="container mx-auto px-4 py-8 max-w-6xl">

        {/* Category Pills */}
        <div className="flex gap-2.5 overflow-x-auto pb-3 mb-8 scrollbar-hide">
          {categories.map((cat) => {
            const isActive = cuisineFilter === cat.key;
            return (
              <button
                key={cat.key}
                data-testid={`btn-category-${cat.key}`}
                onClick={() => setCuisineFilter(cat.key)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold shrink-0 transition-all duration-200 ${
                  isActive
                    ? `${tab.accentBg} text-white shadow-md scale-105`
                    : `bg-card border border-border/50 text-muted-foreground hover:border-border hover:shadow-sm ${tab.accentText} hover:bg-muted/40`
                }`}
              >
                <cat.icon className="w-4 h-4" />
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* ── Order Anything Card ─────────────────────────────── */}
        <div
          className="mb-8 rounded-2xl overflow-hidden cursor-pointer group shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
          onClick={() => navigate("/shipments")}
          data-testid="card-order-anything"
        >
          <div className="bg-gradient-to-l from-violet-600 via-purple-500 to-indigo-500 p-5 flex items-center gap-4 relative overflow-hidden">
            <div className="absolute inset-0 opacity-10 pointer-events-none">
              <div className="absolute top-[-30px] right-[-30px] w-[140px] h-[140px] rounded-full bg-white blur-2xl" />
            </div>
            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300">
              <span className="text-3xl">🛍️</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-white font-black text-base leading-tight">اطلب أي شيء من أي مكان</h3>
                <span className="bg-white/20 text-white text-[10px] font-bold px-2 py-0.5 rounded-full border border-white/30">جديد</span>
              </div>
              <p className="text-white/80 text-sm leading-snug">محلات غير مسجلة، منازل، أي مكان في مدينتك</p>
            </div>
            <div className="shrink-0 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center group-hover:bg-white/30 transition-colors">
              <span className="text-white text-lg font-bold">←</span>
            </div>
          </div>
        </div>

        {/* ── Restaurants Tab ─────────────────────────────────── */}
        {activeTab === "restaurants" && (
          <div className="space-y-12">
            {loading ? (
              <div>
                <div className="flex items-center gap-2 mb-5">
                  <div className="w-32 h-6 bg-muted rounded animate-pulse" />
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                  {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
                </div>
              </div>
            ) : filtered.length === 0 ? (
              <EmptyState
                emoji="🔍"
                title="لا توجد نتائج"
                desc="جرب البحث بكلمة مختلفة أو تغيير المدينة"
              />
            ) : showSections ? (
              <>
                {/* Exclusive Offers (Featured Horizontal Scroll) */}
                {featured.length > 0 && (
                  <div>
                    <SectionHeader icon={Sparkles} title="عروض حصرية" accentText={tab.accentText} />
                    <div className="flex gap-5 overflow-x-auto pb-3 scrollbar-hide">
                      {featured.map((r) => (
                        <div key={r.id} className="min-w-[280px] max-w-[280px]">
                          <RestaurantCard
                            r={r}
                            onClick={() => navigate(`/restaurants/${r.id}`)}
                            size="featured"
                            accentText={tab.accentText}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Most Ordered */}
                <div>
                  <SectionHeader
                    icon={TrendingUp}
                    title="الأكثر طلباً"
                    count={mostOrdered.length}
                    accentText={tab.accentText}
                  />
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                    {mostOrdered.map((r) => (
                      <RestaurantCard
                        key={r.id}
                        r={r}
                        onClick={() => navigate(`/restaurants/${r.id}`)}
                        accentText={tab.accentText}
                      />
                    ))}
                  </div>
                </div>

                {/* Arrived Recently */}
                {newest.length > 0 && (
                  <div>
                    <SectionHeader icon={Flame} title="وصل حديثاً" accentText={tab.accentText} />
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                      {newest.slice(0, 4).map((r) => (
                        <RestaurantCard
                          key={r.id}
                          r={r}
                          onClick={() => navigate(`/restaurants/${r.id}`)}
                          accentText={tab.accentText}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* All Restaurants */}
                <div>
                  <SectionHeader
                    icon={UtensilsCrossed}
                    title="جميع المطاعم"
                    count={filtered.length}
                    accentText={tab.accentText}
                  />
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
                </div>
              </>
            ) : (
              // Filtered / search results
              <div>
                <SectionHeader
                  icon={Search}
                  title="نتائج البحث"
                  count={filtered.length}
                  accentText={tab.accentText}
                />
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
              </div>
            )}
          </div>
        )}

        {/* ── Grocery Tab ──────────────────────────────────────── */}
        {activeTab === "grocery" && (
          <ComingSoonSection
            tab={tab}
            accentText={tab.accentText}
            accentBg={tab.accentBg}
            accentLight={tab.accentLight}
            accentBorder={tab.accentBorder}
          />
        )}

        {/* ── Pharmacy Tab ─────────────────────────────────────── */}
        {activeTab === "pharmacy" && (
          <ComingSoonSection
            tab={tab}
            accentText={tab.accentText}
            accentBg={tab.accentBg}
            accentLight={tab.accentLight}
            accentBorder={tab.accentBorder}
          />
        )}
      </div>
    </div>
  );
};

export default DeliveryHubPage;
