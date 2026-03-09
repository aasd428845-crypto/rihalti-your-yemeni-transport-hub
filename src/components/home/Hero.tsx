import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Bus, Package, Truck, Search, CheckCircle, Clock, Users, Zap, ArrowLeft, TrendingUp, Car, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

const tabs = [
  { label: "🚌 رحلة", placeholder: "من أين إلى أين؟ ابحث عن رحلتك..." },
  { label: "📦 طرد", placeholder: "أرسل طردك... اختر المدينة" },
  { label: "🛵 توصيل", placeholder: "اطلب التوصيل من مطاعمك المفضلة..." },
];

interface TripData {
  id: string;
  from_city: string;
  to_city: string;
  departure_time: string;
  price: number;
  available_seats: number;
}

const Hero = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [trips, setTrips] = useState<TripData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTrips = async () => {
      try {
        const { data } = await supabase
          .from("trips")
          .select("id, from_city, to_city, departure_time, price, available_seats")
          .eq("status", "active")
          .gt("available_seats", 0)
          .order("created_at", { ascending: false })
          .limit(3);
        setTrips(data || []);
      } catch {} finally {
        setLoading(false);
      }
    };
    fetchTrips();
  }, []);

  const formatTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleTimeString("ar-YE", { hour: "2-digit", minute: "2-digit" });
    } catch { return ""; }
  };

  const getBadge = (seats: number) => {
    if (seats <= 3) return { text: "آخر مقاعد", urgent: true };
    return { text: "متاح", urgent: false };
  };

  // Fallback data when no real trips
  const fallbackTrips = [
    { id: "1", from_city: "صنعاء", to_city: "عدن", departure_time: "", price: 5000, available_seats: 12 },
    { id: "2", from_city: "تعز", to_city: "المكلا", departure_time: "", price: 7000, available_seats: 5 },
    { id: "3", from_city: "صنعاء", to_city: "إب", departure_time: "", price: 3000, available_seats: 18 },
  ];

  const displayTrips = trips.length > 0 ? trips : fallbackTrips;

  return (
    <section className="min-h-screen bg-background flex items-center relative overflow-hidden pt-[72px]">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -right-[10%] w-[700px] h-[700px] rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-[10%] -left-[5%] w-[500px] h-[500px] rounded-full bg-accent/5 blur-3xl" />
        <div className="absolute inset-0 grid-pattern" />
      </div>

      <div className="container mx-auto px-4 py-16 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-20 items-center">
          {/* Left Content */}
          <div>
            <span className="glow-badge mb-5 inline-flex">
              <Zap className="w-3 h-3" />
              أول منصة نقل يمنية متكاملة
            </span>

            <h1 className="text-4xl md:text-5xl lg:text-[58px] font-black text-foreground leading-tight mb-5 tracking-tight">
              سافر، أشحن، وصّل
              <span className="block text-gradient-primary">مع وصل</span>
            </h1>

            <p className="text-muted-foreground text-lg leading-relaxed mb-8 max-w-[520px]">
              المنصة اليمنية الأولى التي تربطك بشركات النقل الموثوقة، توفر شحنًا آمنًا وتوصيلًا سريعًا بين جميع مدن اليمن.
            </p>

            {/* Search Box */}
            <div className="bg-card/95 rounded-2xl border border-border overflow-hidden shadow-xl mb-7">
              <div className="flex border-b border-border">
                {tabs.map((tab, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveTab(i)}
                    className={`flex-1 py-3.5 px-2 text-sm font-semibold transition-all border-b-2 ${
                      activeTab === i
                        ? "bg-primary/15 text-primary-glow border-primary-glow"
                        : "text-muted-foreground border-transparent hover:text-foreground"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center p-3 gap-3">
                <Search className="w-5 h-5 text-primary-glow shrink-0" />
                <input
                  placeholder={tabs[activeTab].placeholder}
                  className="flex-1 bg-transparent border-none outline-none text-foreground text-sm text-right placeholder:text-muted-foreground"
                />
                <Button size="sm" className="bg-primary-gradient text-primary-foreground shadow-primary gap-1">
                  <Search className="w-4 h-4" />
                  بحث
                </Button>
              </div>
            </div>

            {/* Quick Stats Row */}
            <div className="flex gap-6 flex-wrap">
              {[
                { icon: CheckCircle, label: "آمنة وموثوقة", color: "text-primary-glow" },
                { icon: Clock, label: "مواعيد دقيقة", color: "text-accent" },
                { icon: Users, label: "+١٠,٠٠٠ عميل", color: "text-blue-400" },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <item.icon className={`w-4 h-4 ${item.color}`} />
                  <span className="text-muted-foreground text-sm">{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right — Trip Cards */}
          <div className="flex flex-col gap-3.5">
            <div className="flex justify-between items-center mb-1">
              <span className="text-muted-foreground text-sm">أحدث الرحلات المتاحة</span>
              <span className="glow-badge-gold text-xs">
                <TrendingUp className="w-3 h-3" />
                مباشر
              </span>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : (
              displayTrips.map((trip, i) => {
                const badge = getBadge(trip.available_seats);
                const linkTo = trips.length > 0 ? `/trips/${trip.id}` : "/trips";
                return (
                  <Link
                    to={linkTo}
                    key={trip.id || i}
                    className="bg-card/90 rounded-[14px] border border-border p-5 flex items-center justify-between transition-all hover:border-primary/35 hover:-translate-x-1 cursor-pointer shadow-lg group"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-[42px] h-[42px] rounded-[10px] bg-primary/15 flex items-center justify-center">
                        <Bus className="w-5 h-5 text-primary-glow" />
                      </div>
                      <div>
                        <div className="text-foreground font-bold text-[15px]">
                          {trip.from_city} <ArrowLeft className="w-3.5 h-3.5 inline text-primary-glow align-middle mx-1" /> {trip.to_city}
                        </div>
                        <div className="text-muted-foreground text-xs mt-0.5">
                          {trip.departure_time ? formatTime(trip.departure_time) + " • " : ""}{trip.available_seats} مقعد متاح
                        </div>
                      </div>
                    </div>
                    <div className="text-left">
                      <div className="text-primary-glow font-extrabold text-lg">{Number(trip.price).toLocaleString("ar")}</div>
                      <div className="text-muted-foreground text-[10px]">ريال</div>
                      <span
                        className={`inline-block mt-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border ${
                          badge.urgent
                            ? "bg-accent/15 text-accent border-accent/30"
                            : "bg-primary/15 text-primary-glow border-primary/30"
                        }`}
                      >
                        {badge.text}
                      </span>
                    </div>
                  </Link>
                );
              })
            )}

            <div className="flex gap-2.5 mt-2 flex-wrap">
              <Link to="/trips" className="flex-1 min-w-[120px]">
                <Button variant="outline" size="sm" className="w-full border-primary/30 text-primary-glow hover:bg-primary/10 gap-1">
                  <Bus className="w-3.5 h-3.5" />احجز رحلة
                </Button>
              </Link>
              <Link to="/shipments" className="flex-1 min-w-[120px]">
                <Button variant="outline" size="sm" className="w-full border-primary/30 text-primary-glow hover:bg-primary/10 gap-1">
                  <Package className="w-3.5 h-3.5" />أرسل طرد
                </Button>
              </Link>
              <Link to="/deliveries" className="flex-1 min-w-[120px]">
                <Button variant="outline" size="sm" className="w-full border-primary/30 text-primary-glow hover:bg-primary/10 gap-1">
                  <Truck className="w-3.5 h-3.5" />اطلب توصيل
                </Button>
              </Link>
              <Link to="/ride/request" className="flex-1 min-w-[120px]">
                <Button variant="outline" size="sm" className="w-full border-accent/30 text-accent hover:bg-accent/10 gap-1">
                  <Car className="w-3.5 h-3.5" />اطلب أجرة
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
