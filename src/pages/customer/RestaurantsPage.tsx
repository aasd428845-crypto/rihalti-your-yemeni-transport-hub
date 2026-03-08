import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Search, Star, Clock, Truck, MapPin, UtensilsCrossed, ChefHat, Pizza, Beef, Fish, IceCream, Coffee } from "lucide-react";
import { getActiveRestaurants } from "@/lib/restaurantApi";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/landing/Header";
import Footer from "@/components/landing/Footer";

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
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [cuisineFilter, setCuisineFilter] = useState("all");

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getActiveRestaurants();
        setRestaurants(data || []);
      } catch (err: any) {
        toast({ title: "خطأ", description: err.message, variant: "destructive" });
      } finally { setLoading(false); }
    };
    load();
  }, []);

  const featured = restaurants.filter(r => r.is_featured);
  const filtered = restaurants.filter(r => {
    const matchSearch = r.name_ar?.includes(search) || r.name_en?.toLowerCase().includes(search.toLowerCase());
    const matchCuisine = cuisineFilter === "all" || (r.cuisine_type && r.cuisine_type.includes(cuisineFilter));
    return matchSearch && matchCuisine;
  });

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <Header />
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        {/* Hero */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">🍽️ اكتشف أشهى المأكولات</h1>
          <p className="text-muted-foreground">اطلب من أفضل المطاعم وتوصيل سريع لباب بيتك</p>
        </div>

        {/* Search */}
        <div className="relative max-w-md mx-auto mb-6">
          <Search className="absolute right-3 top-2.5 w-5 h-5 text-muted-foreground" />
          <Input placeholder="ابحث عن مطعم أو طبق..." value={search} onChange={e => setSearch(e.target.value)} className="pr-10 h-11 text-base" />
        </div>

        {/* Cuisine Filters */}
        <div className="flex gap-2 overflow-x-auto pb-3 mb-6 scrollbar-hide">
          {cuisineFilters.map(cf => (
            <Button key={cf.key} variant={cuisineFilter === cf.key ? "default" : "outline"} size="sm"
              onClick={() => setCuisineFilter(cf.key)} className="shrink-0 gap-1.5">
              <cf.icon className="w-4 h-4" />{cf.label}
            </Button>
          ))}
        </div>

        {/* Featured */}
        {featured.length > 0 && cuisineFilter === "all" && !search && (
          <div className="mb-8">
            <h2 className="text-xl font-bold mb-4">⭐ مطاعم مميزة</h2>
            <div className="flex gap-4 overflow-x-auto pb-3 scrollbar-hide">
              {featured.map(r => (
                <Card key={r.id} className="min-w-[280px] cursor-pointer hover:shadow-lg transition-shadow overflow-hidden"
                  onClick={() => navigate(`/restaurants/${r.id}`)}>
                  <div className="h-32 bg-gradient-to-bl from-primary/20 to-primary/5 relative">
                    {r.cover_image && <img src={r.cover_image} alt="" className="w-full h-full object-cover" />}
                    <Badge className="absolute top-2 left-2 bg-primary">مميز</Badge>
                  </div>
                  <CardContent className="p-3">
                    <h3 className="font-bold">{r.name_ar}</h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                      <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />{r.rating || '0'}
                      {r.estimated_delivery_time && <><Clock className="w-3.5 h-3.5 mr-2" />{r.estimated_delivery_time} د</>}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* All Restaurants */}
        <h2 className="text-xl font-bold mb-4">🏪 جميع المطاعم</h2>
        {loading ? (
          <div className="flex justify-center py-20"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>
        ) : filtered.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">لا توجد مطاعم متاحة حالياً</CardContent></Card>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(r => (
              <Card key={r.id} className="cursor-pointer hover:shadow-lg transition-all overflow-hidden group"
                onClick={() => navigate(`/restaurants/${r.id}`)}>
                <div className="h-40 bg-muted relative overflow-hidden">
                  {r.cover_image ? (
                    <img src={r.cover_image} alt={r.name_ar} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                      <UtensilsCrossed className="w-12 h-12 text-primary/30" />
                    </div>
                  )}
                  {r.logo_url && (
                    <div className="absolute bottom-2 right-2 w-12 h-12 rounded-lg bg-background shadow-md overflow-hidden border-2 border-background">
                      <img src={r.logo_url} alt="" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>
                <CardContent className="p-4 space-y-2">
                  <h3 className="font-bold text-lg">{r.name_ar}</h3>
                  {r.cuisine_type && r.cuisine_type.length > 0 && (
                    <div className="flex gap-1 flex-wrap">
                      {r.cuisine_type.slice(0, 3).map((c: string) => <Badge key={c} variant="secondary" className="text-xs">{c}</Badge>)}
                    </div>
                  )}
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1"><Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />{r.rating || '0'}</span>
                    {r.estimated_delivery_time && <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{r.estimated_delivery_time} د</span>}
                    <span className="flex items-center gap-1"><Truck className="w-3.5 h-3.5" />{r.delivery_fee || 0} ر.ي</span>
                  </div>
                  {r.min_order_amount > 0 && (
                    <p className="text-xs text-muted-foreground">الحد الأدنى: {r.min_order_amount} ر.ي</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default RestaurantsPage;
