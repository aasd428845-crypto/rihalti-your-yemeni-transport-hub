import { useEffect, useState } from "react";
import { Users, Navigation, Building2, Star, CheckCircle, Car } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const Stats = () => {
  const [data, setData] = useState({ users: 0, trips: 0, shipments: 0, partners: 0, drivers: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      const [u, t, s, p, d] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("trips").select("*", { count: "exact", head: true }),
        supabase.from("shipment_requests").select("*", { count: "exact", head: true }),
        supabase.from("user_roles").select("*", { count: "exact", head: true }).in("role", ["supplier", "delivery_company"]),
        supabase.from("drivers").select("*", { count: "exact", head: true }),
      ]);
      setData({
        users: u.count || 0,
        trips: t.count || 0,
        shipments: s.count || 0,
        partners: p.count || 0,
        drivers: d.count || 0,
      });
    };
    fetchStats();
  }, []);

  const stats = [
    { value: `+${data.users.toLocaleString("ar")}`, label: "عميل مسجل", icon: Users, colorClass: "text-primary-glow bg-primary/15" },
    { value: `+${data.trips.toLocaleString("ar")}`, label: "رحلة", icon: Navigation, colorClass: "text-blue-400 bg-blue-500/15" },
    { value: `+${data.partners.toLocaleString("ar")}`, label: "شريك نقل", icon: Building2, colorClass: "text-accent bg-accent/15" },
    { value: `+${data.drivers.toLocaleString("ar")}`, label: "سائق أجرة", icon: Car, colorClass: "text-yellow-400 bg-yellow-400/15" },
    { value: "٩٩%", label: "توصيل ناجح", icon: CheckCircle, colorClass: "text-purple-400 bg-purple-400/15" },
  ];

  return (
    <section className="py-20 bg-background relative">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
          {stats.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <div key={i} className="text-center p-8 bg-card/50 rounded-2xl border border-border/10">
                <div className={`w-12 h-12 rounded-xl ${stat.colorClass} flex items-center justify-center mx-auto mb-4`}>
                  <Icon className="w-[22px] h-[22px]" />
                </div>
                <div className="text-foreground text-[28px] font-extrabold mb-1.5">{stat.value}</div>
                <div className="text-muted-foreground text-sm">{stat.label}</div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Stats;
