import { Smartphone, Clock, Headphones, Download, Bus, Zap } from "lucide-react";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { toast } from "sonner";

const features = [
  { icon: Clock, label: "توفير الوقت", sub: "احجز في دقيقتين بدلاً من ساعات الانتظار", colorClass: "text-primary-glow bg-primary/15" },
  { icon: Smartphone, label: "سهولة الاستخدام", sub: "واجهة بسيطة تناسب جميع الأعمار", colorClass: "text-blue-400 bg-blue-400/15" },
  { icon: Headphones, label: "دعم فوري ٢٤/٧", sub: "خدمة عملاء متاحة دائماً عبر واتساب", colorClass: "text-accent bg-accent/15" },
];

const AppDownload = () => {
  const { ref, isVisible } = useScrollAnimation();
  const handleStoreClick = (store: string) => {
    toast.info(`تطبيق وصل على ${store} قيد التطوير وسيتوفر قريبًا!`);
  };

  return (
    <section className="py-24 bg-background" ref={ref}>
      <div className="container mx-auto px-4 max-w-[1100px]" style={{ opacity: isVisible ? 1 : 0, transform: isVisible ? 'translateY(0)' : 'translateY(24px)', transition: 'all 0.7s ease-out' }}>
        <div className="bg-gradient-to-br from-primary/10 to-blue-500/5 rounded-3xl border border-primary/15 p-10 md:p-14 grid grid-cols-1 md:grid-cols-2 gap-14 items-center">
          {/* Content */}
          <div>
            <span className="glow-badge mb-4 inline-flex">
              <Smartphone className="w-3 h-3" />
              التطبيق المحمول
            </span>
            <h2 className="text-3xl md:text-4xl font-extrabold text-foreground mt-4 mb-4">
              حمّل تطبيق وصل الآن
            </h2>
            <p className="text-muted-foreground text-[15px] leading-relaxed mb-8">
              جميع خدماتنا متاحة على هاتفك. احجز رحلتك، أرسل طردك، أو اطلب التوصيل في أي وقت ومن أي مكان.
            </p>

            <div className="flex flex-col gap-3.5 mb-8">
              {features.map((f, i) => {
                const Icon = f.icon;
                return (
                  <div key={i} className="flex gap-3.5 items-start">
                    <div className={`w-10 h-10 rounded-[10px] shrink-0 flex items-center justify-center ${f.colorClass}`}>
                      <Icon className="w-[18px] h-[18px]" />
                    </div>
                    <div>
                      <div className="text-foreground font-semibold text-sm">{f.label}</div>
                      <div className="text-muted-foreground text-sm">{f.sub}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-wrap gap-2.5">
              {["Google Play", "App Store", "AppGallery"].map((store) => (
                <button
                  key={store}
                  onClick={() => handleStoreClick(store)}
                  className="bg-card/80 border border-primary/20 text-foreground px-5 py-3 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all hover:bg-primary/15"
                >
                  <Download className="w-3.5 h-3.5 text-primary-glow" />
                  تحميل من {store}
                </button>
              ))}
            </div>
          </div>

          {/* Phone Mockup */}
          <div className="hidden md:flex justify-center">
            <div className="w-[260px] bg-background/90 rounded-[32px] border border-primary/20 p-5 shadow-2xl">
              <div className="bg-primary rounded-[14px] p-4 mb-3.5 text-center">
                <Bus className="w-7 h-7 text-primary-foreground mx-auto mb-1.5" />
                <div className="text-primary-foreground font-bold text-sm">وصل</div>
                <div className="text-primary-foreground/70 text-[11px]">منصة النقل الذكية</div>
              </div>
              {[
                { from: "صنعاء", to: "عدن", price: "٥,٠٠٠" },
                { from: "تعز", to: "إب", price: "٣,٠٠٠" },
              ].map((trip, i) => (
                <div key={i} className="bg-primary/5 rounded-[10px] p-3 mb-2 border border-primary/10">
                  <div className="text-foreground text-sm font-semibold">{trip.from} ← {trip.to}</div>
                  <div className="text-primary-glow text-sm font-extrabold mt-1">{trip.price} ريال</div>
                </div>
              ))}
              <div className="bg-primary-gradient rounded-[10px] p-3 text-center text-primary-foreground font-bold text-sm">
                احجز الآن
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AppDownload;
