import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingUp, Percent } from "lucide-react";

const AdminFinance = () => {
  const [commissions, setCommissions] = useState({
    booking: "0",
    shipping: "0",
    delivery: "0",
  });

  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await supabase
        .from("admin_settings")
        .select("key, value")
        .in("key", ["booking_commission", "shipping_commission", "delivery_commission"]);

      if (data) {
        const map = new Map(data.map((d) => [d.key, d.value]));
        setCommissions({
          booking: map.get("booking_commission") || "0",
          shipping: map.get("shipping_commission") || "0",
          delivery: map.get("delivery_commission") || "0",
        });
      }
    };
    fetchSettings();
  }, []);

  const financeCards = [
    { title: "عمولة الحجوزات", value: `${commissions.booking}%`, icon: DollarSign, desc: "النسبة المقتطعة من كل حجز" },
    { title: "عمولة الشحنات", value: `${commissions.shipping}%`, icon: TrendingUp, desc: "النسبة المقتطعة من كل شحنة" },
    { title: "عمولة التوصيل", value: `${commissions.delivery}%`, icon: Percent, desc: "النسبة المقتطعة من كل توصيل" },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">الإدارة المالية</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {financeCards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
              <card.icon className="w-5 h-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">{card.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{card.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">ملخص مالي</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            سيتم عرض الإحصائيات المالية التفصيلية هنا عند بدء العمليات (إجمالي الإيرادات، العمولات المحصلة، المبالغ المعلقة).
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminFinance;
