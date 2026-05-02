import { useEffect, useState } from "react";
import { Users, Map, Building2, Star, TrendingUp } from "lucide-react";
import { fetchHomeStats } from "@/lib/customerApi";

const StatsSection = () => {
  const [stats, setStats] = useState({ tripsCount: 0, suppliersCount: 0, deliveryCount: 0 });

  useEffect(() => {
    fetchHomeStats().then(setStats).catch(() => {});
  }, []);

  const items = [
    { icon: Users, value: stats.suppliersCount + stats.deliveryCount || "—", label: "شريك نشط", desc: "شركات نقل وتوصيل موثوقة" },
    { icon: Map, value: stats.tripsCount || "—", label: "رحلة متاحة", desc: "رحلات نشطة ومعتمدة" },
    { icon: Building2, value: stats.suppliersCount || "—", label: "شركة نقل", desc: "شركاؤنا في خدمات النقل" },
    { icon: Star, value: "4.8/5", label: "تقييم العملاء", desc: "متوسط تقييم المستخدمين" },
  ];

  const cities = ["صنعاء", "عدن", "تعز", "الحديدة", "إب", "ذمار", "المكلا", "سيئون", "مأرب", "حجة", "صعدة", "عمران"];

  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent text-accent-foreground text-sm font-semibold mb-4">
            <TrendingUp className="w-4 h-4" />
            <span>بيانات حقيقية من المنصة</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-black text-foreground mb-4">أرقام تتحدث عن نجاحنا</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">نحن نفتخر بأننا المنصة الرائدة في خدمات النقل البري في اليمن</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {items.map((stat) => (
            <div key={stat.label} className="bg-card rounded-2xl border border-border p-6 text-center hover:shadow-lg transition-all duration-300 group">
              <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <stat.icon className="w-6 h-6 text-primary" />
              </div>
              <div className="text-3xl font-black text-primary mb-1">{stat.value}</div>
              <div className="font-bold text-foreground mb-1">{stat.label}</div>
              <p className="text-xs text-muted-foreground">{stat.desc}</p>
            </div>
          ))}
        </div>

        <div className="bg-card rounded-2xl border border-border p-8">
          <h3 className="text-lg font-bold text-foreground mb-4 text-center">🇾🇪 نغطي جميع مدن اليمن</h3>
          <div className="flex flex-wrap justify-center gap-3">
            {cities.map((city) => (
              <span key={city} className="px-4 py-2 rounded-xl bg-muted text-foreground text-sm font-medium hover:bg-primary hover:text-primary-foreground transition-colors cursor-default">
                {city}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default StatsSection;
