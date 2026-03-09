import { TrendingUp, Users, Bus, Building2, Award, Star, BarChart3 } from "lucide-react";

const numbers = [
  { val: "+٣٥٪", label: "نمو خلال ٦ أشهر", sub: "نمو مستمر ومتسارع", icon: TrendingUp },
  { val: "+١٠,٠٠٠", label: "عميل راضي", sub: "من جميع أنحاء اليمن", icon: Users },
  { val: "+١,٠٠٠", label: "رحلة يومياً", sub: "بين جميع المحافظات", icon: Bus },
  { val: "+٢٥", label: "شركة نقل", sub: "شركاء موثوقون ومرخصون", icon: Building2 },
  { val: "٩٩٪", label: "توصيل ناجح", sub: "التزام بالجودة والدقة", icon: Award },
  { val: "٤.٨★", label: "تقييم المستخدمين", sub: "من آلاف التقييمات", icon: Star },
];

const Numbers = () => {
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
            أرقام تتحدث عن نجاحنا
          </h2>
          <p className="text-muted-foreground text-base max-w-[600px] mx-auto">
            نفتخر بكوننا المنصة الرائدة في خدمات النقل البري في اليمن
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
