import { Smartphone, Clock, Heart, Headphones } from "lucide-react";
import { Button } from "@/components/ui/button";

const features = [
  { icon: Clock, title: "توفير الوقت", desc: "احجز في دقيقتين بدلاً من ساعات الانتظار" },
  { icon: Heart, title: "سهولة الاستخدام", desc: "واجهة بسيطة تناسب جميع الأعمار" },
  { icon: Headphones, title: "دعم فوري", desc: "خدمة عملاء متاحة 24/7 عبر واتساب" },
];

const AppDownloadSection = () => {
  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="bg-hero-gradient rounded-3xl p-8 md:p-12 relative overflow-hidden">
          {/* Decorative elements */}
          <div className="absolute top-0 left-0 w-64 h-64 bg-white/5 rounded-full -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-48 h-48 bg-white/5 rounded-full translate-x-1/4 translate-y-1/4" />

          <div className="relative z-10 grid md:grid-cols-2 gap-10 items-center">
            <div className="text-primary-foreground">
              <div className="flex items-center gap-2 mb-4">
                <Smartphone className="w-6 h-6" />
                <span className="text-sm font-semibold text-primary-foreground/80">قريباً على الهاتف</span>
              </div>

              <h2 className="text-3xl md:text-4xl font-black mb-4">
                حمّل تطبيق وصل الآن
              </h2>
              <p className="text-primary-foreground/80 mb-8 leading-relaxed">
                جميع خدماتنا متاحة الآن على هاتفك الذكي. احجز رحلتك، أرسل طردك، أو اطلب التوصيل في أي وقت ومن أي مكان.
              </p>

              <div className="space-y-4 mb-8">
                {features.map((f) => (
                  <div key={f.title} className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                      <f.icon className="w-5 h-5 text-secondary" />
                    </div>
                    <div>
                      <div className="font-bold text-sm">{f.title}</div>
                      <div className="text-xs text-primary-foreground/70">{f.desc}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-3">
                <Button size="lg" className="bg-gold-gradient text-secondary-foreground font-bold hover:opacity-90 shadow-gold">
                  Google Play
                </Button>
                <Button size="lg" variant="outline" className="border-primary-foreground/30 text-primary-foreground hover:bg-white/10">
                  App Store
                </Button>
                <Button size="lg" variant="outline" className="border-primary-foreground/30 text-primary-foreground hover:bg-white/10">
                  AppGallery
                </Button>
              </div>
            </div>

            {/* App Preview */}
            <div className="hidden md:flex justify-center">
              <div className="w-64 h-[500px] bg-white/10 rounded-[2.5rem] border-4 border-white/20 flex flex-col items-center pt-8 px-4 relative overflow-hidden">
                <div className="w-20 h-5 bg-white/20 rounded-full mb-6" />
                <div className="text-center mb-4">
                  <div className="text-2xl font-black text-primary-foreground">رحلاتي</div>
                  <div className="text-xs text-primary-foreground/60">08:30</div>
                </div>

                <div className="w-full space-y-3">
                  <div className="bg-white/10 rounded-xl p-3">
                    <div className="text-xs text-primary-foreground/80 mb-1">من صنعاء إلى عدن</div>
                    <div className="text-xs text-primary-foreground/60">غداً 08:00 ص</div>
                  </div>
                  <div className="bg-white/10 rounded-xl p-3 flex justify-between items-center">
                    <span className="text-xs text-primary-foreground/80">08:00 ص</span>
                    <span className="text-xs text-secondary">5,000 ريال</span>
                  </div>
                  <div className="bg-white/10 rounded-xl p-3 flex justify-between items-center">
                    <span className="text-xs text-primary-foreground/80">10:00 ص</span>
                    <span className="text-xs text-secondary">6,000 ريال</span>
                  </div>
                  <div className="bg-white/10 rounded-xl p-3 flex justify-between items-center">
                    <span className="text-xs text-primary-foreground/80">02:00 م</span>
                    <span className="text-xs text-secondary">5,500 ريال</span>
                  </div>
                </div>

                <div className="absolute bottom-4 flex items-center gap-1 text-primary-foreground/70">
                  <Star className="w-4 h-4 text-secondary fill-secondary" />
                  <span className="text-xs font-bold">4.8</span>
                  <span className="text-xs">تقييم التطبيق</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

// Need Star for the rating
import { Star } from "lucide-react";

export default AppDownloadSection;
