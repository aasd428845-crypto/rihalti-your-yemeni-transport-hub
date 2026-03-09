import { useEffect, useState } from "react";
import { TrendingUp, Users, Bus, Building2, Award, Star, BarChart3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const Numbers = () => {
  const [data, setData] = useState({ users: 0, trips: 0, partners: 0, shipments: 0, deliveries: 0, avgRating: 0 });

  useEffect(() => {
    const fetch = async () => {
      const [u, t, p, s, d, r] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("trips").select("*", { count: "exact", head: true }),
        supabase.from("user_roles").select("*", { count: "exact", head: true }).in("role", ["supplier", "delivery_company"]),
        supabase.from("shipment_requests").select("*", { count: "exact", head: true }),
        supabase.from("deliveries").select("*", { count: "exact", head: true }),
        supabase.from("reviews").select("rating"),
      ]);
      const ratings = r.data || [];
      const avg = ratings.length > 0 ? (ratings.reduce((sum, rev) => sum + (rev.rating || 0), 0) / ratings.length).toFixed(1) : "0";
      setData({
        users: u.count || 0,
        trips: t.count || 0,
        partners: p.count || 0,
        shipments: s.count || 0,
        deliveries: d.count || 0,
        avgRating: parseFloat(avg),
      });
    };
    fetch();
  }, []);

  const numbers = [
    { val: `+${data.users.toLocaleString("ar")}`, label: "مستخدم مسجل", sub: "من جميع أنحاء اليمن", icon: Users },
    { val: `+${data.trips.toLocaleString("ar")}`, label: "رحلة", sub: "بين جميع المحافظات", icon: Bus },
    { val: `+${data.partners.toLocaleString("ar")}`, label: "شريك نقل وتوصيل", sub: "شركاء موثوقون ومعتمدون", icon: Building2 },
    { val: `+${data.shipments.toLocaleString("ar")}`, label: "طرد", sub: "تم شحنه بنجاح", icon: Award },
    { val: `+${data.deliveries.toLocaleString("ar")}`, label: "توصيل", sub: "طلبات تم توصيلها", icon: TrendingUp },
    { val: data.avgRating > 0 ? `${data.avgRating}★` : "—", label: "تقييم المستخدمين", sub: "متوسط التقييمات", icon: Star },
  ];

  return (
    <section className="py-24 bg-gradient-to-br from-background via-primary/5 to-background relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-primary/5 blur-3xl pointer-events-none" />
      <div className="container mx-auto px-4 max-w-[1100px] relative z-10">
        <div className="text-center mb-16">
          <span className="glow-badge mb-4 inline-flex">
            <BarChart3 className="w-3 h-3" />
            أرقام النجاح
          </span>
          <h2 className="text-3xl md:text-4xl font-extrabold text-foreground mt-4 mb-3">
            أرقام حقيقية من المنصة
          </h2>
          <p className="text-muted-foreground text-base max-w-[600px] mx-auto">
            بيانات محدثة تعكس نمو منصة وصل في خدمات النقل البري في اليمن
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {numbers.map((item, i) => {
            const Icon = item.icon;
            return (
              <div
                key={i}
                className="bg-primary/5 rounded-[18px] border border-primary/10 p-8 text-center transition-all hover:bg-primary/10 hover:border-primary/25"
              >
                <Icon className="w-6 h-6 text-primary-glow mx-auto mb-3" />
                <div className="text-primary-glow text-4xl font-black mb-2 tabular-nums">{item.val}</div>
                <div className="text-foreground text-[15px] font-bold mb-1.5">{item.label}</div>
                <div className="text-muted-foreground text-xs">{item.sub}</div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Numbers;
