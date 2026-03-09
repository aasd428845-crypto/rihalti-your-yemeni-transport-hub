import { useEffect, useState } from "react";
import { Users, Bus, Package, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const Stats = () => {
  const [stats, setStats] = useState({ users: 0, trips: 0, shipments: 0, rating: "4.8" });

  useEffect(() => {
    const fetchStats = async () => {
      const [usersRes, tripsRes, shipmentsRes] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("trips").select("*", { count: "exact", head: true }),
        supabase.from("shipment_requests").select("*", { count: "exact", head: true }),
      ]);
      setStats({
        users: usersRes.count || 0,
        trips: tripsRes.count || 0,
        shipments: shipmentsRes.count || 0,
        rating: "4.8",
      });
    };
    fetchStats();
  }, []);

  const items = [
    { icon: Users, label: "عميل نشط", value: `${stats.users.toLocaleString()}+` },
    { icon: Bus, label: "رحلة منجزة", value: `${stats.trips.toLocaleString()}+` },
    { icon: Package, label: "طرد تم توصيله", value: `${stats.shipments.toLocaleString()}+` },
    { icon: Star, label: "تقييم العملاء", value: `${stats.rating}/5` },
  ];

  return (
    <section className="py-16 bg-primary text-primary-foreground">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {items.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div key={idx} className="text-center">
                <div className="inline-flex bg-white/15 p-4 rounded-2xl mb-4">
                  <Icon className="w-8 h-8" />
                </div>
                <div className="text-3xl md:text-4xl font-bold mb-2">{item.value}</div>
                <div className="text-base opacity-80">{item.label}</div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Stats;
