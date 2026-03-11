import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Star, Clock, Truck, MapPin, UtensilsCrossed, ChefHat, Pizza, Beef, Fish, IceCream, Coffee, Flame } from "lucide-react";
import BackButton from "@/components/common/BackButton";
import { getActiveRestaurants } from "@/lib/restaurantApi";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const cuisineFilters = [
  { key: "all", label: "الكل", icon: UtensilsCrossed },
  { key: "يمني", label: "يمني", icon: ChefHat },
  { key: "برجر", label: "برجر", icon: Beef },
  { key: "بيتزا", label: "بيتزا", icon: Pizza },
  { key: "مأكولات بحرية", label: "بحرية", icon: Fish },
  { key: "حلويات", label: "حلويات", icon: IceCream },
  { key: "مشروبات", label: "مشروبات", icon: Coffee },
];

const RestaurantsPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [cuisineFilter, setCuisineFilter] = useState("all");
  const [selectedCity, setSelectedCity] = useState<string>("");
  const [userCity, setUserCity] = useState<string>("");

  useEffect(() => {
    const loadUserCity = async () => {
      if (!user) return;
      const { data } = await supabase.from("profiles").select("city").eq("user_id", user.id).maybeSingle();
      if (data?.city) {
        setUserCity(data.city);
        setSelectedCity(data.city);
      }
    };
    loadUserCity();
  }, [user]);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getActiveRestaurants(selectedCity || undefined);
        setRestaurants(data || []);
      } catch (err: any) {
        toast({ title: "خطأ", description: err.message, variant: "destructive" });
      } finally { setLoading(false); }
    };
    load();
  }, [selectedCity]);

  const featured = restaurants.filter(r => r.is_featured);
  const filtered = restaurants.filter(r => {
    const matchSearch = r.name_ar?.includes(search) || r.name_en?.toLowerCase().includes(search.toLowerCase());
    const matchCuisine = cuisineFilter === "all" || (r.cuisine_type && r.cuisine_type.includes(cuisineFilter));
    return matchSearch && matchCuisine;
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30" dir="rtl">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <BackButton />

        {/* Hero Section */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-accent/10 text-accent px-4 py-1.5 rounded-full text-sm font-semibold mb-4">
            <Flame className="w-4 h-4" />
            اكتشف أشهى المأكولات
          </div>
          <h1 className="text-4xl font-black mb-3 bg-gradient-to-l from-primary to-accent bg-clip-text text-transparent">
            مطاعم وصل
          </h1>
          <p className="text-muted-foreground text-lg">اطلب من أفضل المطاعم وتوصيل سريع لباب بيتك</p>
        </div>

        {/* City filter + Search */}
        <div className="flex flex-col sm:flex-row gap-3 max-w-2xl mx-auto mb-8">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-3 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="ابحث عن مطعم أو طبق..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pr-10 h-12 text-base rounded-xl border-border/60 bg-card shadow-sm focus:shadow-md transition-shadow"
            />
          </div>
          <Select value={selectedCity} onValueChange={setSelectedCity}>
            <SelectTrigger className="h-12 w-full sm:w-44 rounded-xl border-border/60 bg-card shadow-sm">
              <MapPin className="w-4 h-4 ml-1 text-muted-foreground" />
              <SelectValue placeholder="كل المدن" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل المدن</SelectItem>
              <SelectItem value="صنعاء">صنعاء</SelectItem>
              <SelectItem value="عدن">عدن</SelectItem>
              <SelectItem value="تعز">تعز</SelectItem>
              <SelectItem value="المكلا">المكلا</SelectItem>
              <SelectItem value="إب">إب</SelectItem>
              <SelectItem value="الحديدة">الحديدة</SelectItem>
              <SelectItem value="ذمار">ذمار</SelectItem>
              <SelectItem value="سيئون">سيئون</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Cuisine Filters */}
        <div className="flex gap-2 overflow-x-auto pb-4 mb-8 scrollbar-hide justify-center flex-wrap">
          {cuisineFilters.map(cf => (
            <Button
              key={cf.key}
              variant={cuisineFilter === cf.key ? "default" : "outline"}
              size="sm"
              onClick={() => setCuisineFilter(cf.key)}
              className={`shrink-0 gap-1.5 rounded-full px-5 transition-all duration-200 ${
                cuisineFilter === cf.key
                  ? "shadow-md"
                  : "hover:bg-accent/10 hover:text-accent hover:border-accent/30"
              }`}
            >
              <cf.icon className="w-4 h-4" />{cf.label}
            </Button>
          ))}
        </div>

        {/* Featured */}
        {featured.length > 0 && cuisineFilter === "all" && !search && (
          <div className="mb-10">
            <div className="flex items-center gap-2 mb-5">
              <Star className="w-5 h-5 text-accent fill-accent" />
              <h2 className="text-xl font-bold">مطاعم مميزة</h2>
            </div>
            <div className="flex gap-5 overflow-x-auto pb-4 scrollbar-hide">
              {featured.map(r => (
                <Card
                  key={r.id}
                  className="min-w-[300px] cursor-pointer overflow-hidden rounded-2xl border-border/40 bg-card shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group"
                  onClick={() => navigate(`/restaurants/${r.id}`)}
                >
                  <div className="h-36 relative overflow-hidden">
                    {r.cover_image ? (
                      <img src={r.cover_image} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-primary/20 via-accent/10 to-primary/5 flex items-center justify-center">
                        <UtensilsCrossed className="w-14 h-14 text-primary/20" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                    <Badge className="absolute top-3 left-3 bg-accent text-accent-foreground border-0 shadow-lg font-bold">
                      ⭐ مميز
                    </Badge>
                    {r.logo_url && (
                      <div className="absolute bottom-3 right-3 w-12 h-12 rounded-xl bg-card shadow-lg overflow-hidden border-2 border-card">
                        <img src={r.logo_url} alt="" className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="absolute bottom-3 left-3 text-white">
                      <h3 className="font-bold text-lg drop-shadow-md">{r.name_ar}</h3>
                    </div>
                  </div>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1 bg-accent/10 text-accent px-2 py-0.5 rounded-full font-semibold">
                        <Star className="w-3.5 h-3.5 fill-accent" />{r.rating || '0'}
                      </span>
                      {r.estimated_delivery_time && (
                        <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{r.estimated_delivery_time} د</span>
                      )}
                      <span className="flex items-center gap-1"><Truck className="w-3.5 h-3.5" />{r.delivery_fee || 0} ر.ي</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* All Restaurants */}
        <div className="flex items-center gap-2 mb-5">
          <UtensilsCrossed className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-bold">جميع المطاعم</h2>
          <Badge variant="secondary" className="mr-auto">{filtered.length} مطعم</Badge>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        ) : filtered.length === 0 ? (
          <Card className="rounded-2xl border-border/40">
            <CardContent className="py-16 text-center">
              <UtensilsCrossed className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground text-lg">لا توجد مطاعم متاحة حالياً</p>
              <p className="text-muted-foreground text-sm mt-1">جرب تغيير المدينة أو البحث</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map(r => (
              <Card
                key={r.id}
                className="cursor-pointer overflow-hidden rounded-2xl border-border/40 bg-card shadow-sm hover:shadow-xl hover:-translate-y-1 hover:border-primary/20 transition-all duration-300 group"
                onClick={() => navigate(`/restaurants/${r.id}`)}
              >
                <div className="h-44 relative overflow-hidden">
                  {r.cover_image ? (
                    <img
                      src={r.cover_image}
                      alt={r.name_ar}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary/15 via-accent/10 to-muted flex items-center justify-center">
                      <UtensilsCrossed className="w-16 h-16 text-primary/15" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                  {r.logo_url && (
                    <div className="absolute bottom-3 right-3 w-14 h-14 rounded-xl bg-card shadow-lg overflow-hidden border-2 border-card group-hover:scale-105 transition-transform">
                      <img src={r.logo_url} alt="" className="w-full h-full object-cover" />
                    </div>
                  )}
                  {r.is_featured && (
                    <Badge className="absolute top-3 left-3 bg-accent text-accent-foreground border-0 shadow font-bold text-xs">
                      ⭐ مميز
                    </Badge>
                  )}
                </div>
                <CardContent className="p-4 space-y-3">
                  <h3 className="font-bold text-lg group-hover:text-primary transition-colors">{r.name_ar}</h3>

                  {r.cuisine_type && r.cuisine_type.length > 0 && (
                    <div className="flex gap-1.5 flex-wrap">
                      {r.cuisine_type.slice(0, 3).map((c: string) => (
                        <Badge
                          key={c}
                          variant="secondary"
                          className="text-xs bg-accent/10 text-accent border-accent/20 hover:bg-accent/20"
                        >
                          {c}
                        </Badge>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center gap-3 text-sm text-muted-foreground pt-1">
                    <span className="flex items-center gap-1 bg-accent/10 text-accent px-2 py-0.5 rounded-full font-semibold text-xs">
                      <Star className="w-3 h-3 fill-accent" />{r.rating || '0'}
                    </span>
                    {r.estimated_delivery_time && (
                      <span className="flex items-center gap-1 text-xs">
                        <Clock className="w-3.5 h-3.5" />{r.estimated_delivery_time} د
                      </span>
                    )}
                    <span className="flex items-center gap-1 text-xs mr-auto">
                      <Truck className="w-3.5 h-3.5" />{r.delivery_fee || 0} ر.ي
                    </span>
                  </div>

                  {r.min_order_amount > 0 && (
                    <p className="text-xs text-muted-foreground border-t border-border/50 pt-2">
                      الحد الأدنى للطلب: <span className="font-semibold text-foreground">{r.min_order_amount} ر.ي</span>
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default RestaurantsPage;
