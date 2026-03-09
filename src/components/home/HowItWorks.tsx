import { Search, CreditCard, MapPin, CheckCircle } from "lucide-react";

const steps = [
  { icon: Search, title: "ابحث عن الخدمة", description: "اختر الخدمة التي تريدها: رحلة، طرد، توصيل، أو سيارة أجرة." },
  { icon: CreditCard, title: "اختر الشريك المناسب", description: "استعرض قائمة الشركاء الموثوقين واختر الأنسب لك." },
  { icon: MapPin, title: "تتبع طلبك", description: "تابع طلبك لحظة بلحظة على الخريطة." },
  { icon: CheckCircle, title: "أكمل وقيّم", description: "بعد الانتهاء، قم بتقييم الخدمة لمساعدتنا على التحسن." },
];

const HowItWorks = () => {
  return (
    <section className="py-20 bg-card">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">كيف تعمل منصة وصل؟</h2>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">أربع خطوات بسيطة تفصلك عن الخدمة المثالية</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            return (
              <div key={idx} className="relative text-center">
                {idx < steps.length - 1 && (
                  <div className="hidden md:block absolute top-12 left-0 w-full h-0.5 bg-border -translate-x-1/2" />
                )}
                <div className="relative z-10 bg-background border-2 border-primary/20 rounded-2xl p-8 shadow-sm hover:shadow-lg transition-shadow">
                  <div className="w-14 h-14 bg-primary text-primary-foreground rounded-xl flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                    {idx + 1}
                  </div>
                  <h3 className="text-lg font-bold text-foreground mb-2">{step.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{step.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
