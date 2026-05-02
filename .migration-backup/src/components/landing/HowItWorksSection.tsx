import { Search, CreditCard, MapPin, CheckCircle } from "lucide-react";

const steps = [
  {
    icon: Search,
    step: "خطوة 1",
    title: "ابحث واختر",
    description: "ابحث عن رحلتك أو أرسل طردك أو اطلب توصيل من مطاعمك المفضلة",
    tags: ["رحلات", "طرود", "توصيل"],
  },
  {
    icon: CreditCard,
    step: "خطوة 2",
    title: "احجز وادفع",
    description: "اختر الخدمة المناسبة وادفع بطريقة آمنة وسهلة عبر التحويل البنكي",
  },
  {
    icon: MapPin,
    step: "خطوة 3",
    title: "تتبع مباشر",
    description: "تابع رحلتك أو طردك لحظة بلحظة على الخريطة",
  },
  {
    icon: CheckCircle,
    step: "خطوة 4",
    title: "تأكيد التسليم",
    description: "تأكيد وصول الرحلة أو الطرد مع إيصال إلكتروني",
  },
];

const HowItWorksSection = () => {
  return (
    <section className="py-20 bg-muted/50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-14">
          <span className="inline-block px-4 py-1.5 rounded-full bg-secondary/20 text-secondary-foreground text-sm font-semibold mb-4">
            كيف تعمل المنصة؟
          </span>
          <h2 className="text-3xl md:text-4xl font-black text-foreground mb-4">
            أربع خطوات بسيطة
          </h2>
          <p className="text-muted-foreground">تفصلك عن خدمة النقل المثالية</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((s, i) => (
            <div key={s.step} className="relative group">
              {i < steps.length - 1 && (
                <div className="hidden lg:block absolute top-10 -left-3 w-6 h-0.5 bg-border" />
              )}

              <div className="bg-card rounded-2xl border border-border p-6 text-center hover:shadow-lg transition-all duration-300 hover:-translate-y-1 h-full">
                <div className="w-16 h-16 rounded-2xl bg-hero-gradient flex items-center justify-center mx-auto mb-4">
                  <s.icon className="w-7 h-7 text-primary-foreground" />
                </div>

                <span className="inline-block px-3 py-1 rounded-full bg-accent text-accent-foreground text-xs font-bold mb-3">
                  {s.step}
                </span>

                <h3 className="text-lg font-bold text-foreground mb-2">{s.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{s.description}</p>

                {s.tags && (
                  <div className="flex justify-center gap-2 mt-3">
                    {s.tags.map((tag) => (
                      <span key={tag} className="text-xs px-2 py-1 rounded-lg bg-muted text-muted-foreground">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;