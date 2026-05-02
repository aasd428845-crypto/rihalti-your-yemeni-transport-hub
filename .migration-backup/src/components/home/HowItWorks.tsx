import { useState } from "react";
import { Search, Wallet, Navigation, FileCheck, ChevronDown, Zap } from "lucide-react";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

const steps = [
  { icon: Search, title: "ابحث واختر", desc: "ابحث عن رحلتك أو أرسل طردك أو اطلب توصيل من مطاعمك المفضلة", colorClass: "text-primary-glow", bgActive: "bg-primary/20 border-primary/40", labelBg: "bg-primary/15 text-primary-glow" },
  { icon: Wallet, title: "احجز وادفع", desc: "اختر الخدمة المناسبة وادفع بطريقة آمنة وسهلة — نقداً أو تحويل بنكي", colorClass: "text-blue-400", bgActive: "bg-blue-400/20 border-blue-400/40", labelBg: "bg-blue-400/15 text-blue-400" },
  { icon: Navigation, title: "تتبع مباشر", desc: "تابع رحلتك أو طردك لحظة بلحظة على الخريطة", colorClass: "text-accent", bgActive: "bg-accent/20 border-accent/40", labelBg: "bg-accent/15 text-accent" },
  { icon: FileCheck, title: "تأكيد التسليم", desc: "تأكيد وصول الرحلة أو الطرد مع إيصال إلكتروني فوري", colorClass: "text-purple-400", bgActive: "bg-purple-400/20 border-purple-400/40", labelBg: "bg-purple-400/15 text-purple-400" },
];

const HowItWorks = () => {
  const [active, setActive] = useState(0);
  const { ref, isVisible } = useScrollAnimation();

  return (
    <section className="py-24 bg-secondary" ref={ref}>
      <div className="container mx-auto px-4 max-w-[1100px]">
        <div
          className="text-center mb-16"
          style={{
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? 'translateY(0)' : 'translateY(24px)',
            transition: 'all 0.7s ease-out',
          }}
        >
          <span className="glow-badge mb-4 inline-flex">
            <Zap className="w-3 h-3" />
            كيف تعمل المنصة؟
          </span>
          <h2 className="text-3xl md:text-4xl font-extrabold text-foreground mt-4 mb-3">
            أربع خطوات بسيطة
          </h2>
          <p className="text-muted-foreground text-base">تفصلك عن خدمة النقل المثالية</p>
        </div>

        <div className="flex flex-col gap-4">
          {steps.map((step, i) => {
            const Icon = step.icon;
            const isActive = active === i;
            return (
              <div
                key={i}
                onClick={() => setActive(isActive ? -1 : i)}
                className={`rounded-2xl p-6 flex items-start gap-5 cursor-pointer transition-all duration-300 border ${
                  isActive
                    ? `bg-card/90 ${step.bgActive}`
                    : "bg-card/40 border-border/10 hover:bg-card/60 hover:border-border/30"
                }`}
                style={{
                  opacity: isVisible ? 1 : 0,
                  transform: isVisible ? 'translateX(0)' : 'translateX(20px)',
                  transition: `all 0.5s ease-out ${i * 0.1}s`,
                }}
              >
                <div className={`w-[52px] h-[52px] rounded-xl shrink-0 flex items-center justify-center border transition-all duration-300 ${
                  isActive ? step.bgActive : "bg-muted/30 border-border/10"
                } ${isActive ? 'scale-110' : 'group-hover:scale-105'}`}>
                  <Icon className={`w-[22px] h-[22px] ${isActive ? step.colorClass : "text-muted-foreground"}`} />
                </div>
                <div className="flex-1">
                  <div className={`flex items-center gap-3 ${isActive ? "mb-2.5" : ""}`}>
                    <span className={`text-xs font-bold px-2.5 py-0.5 rounded-md ${step.labelBg}`}>خطوة {i + 1}</span>
                    <h3 className="text-foreground font-bold text-[17px]">{step.title}</h3>
                    <ChevronDown className={`w-[18px] h-[18px] text-muted-foreground mr-auto transition-transform duration-300 ${isActive ? "rotate-180" : ""}`} />
                  </div>
                  <div
                    className="overflow-hidden transition-all duration-300"
                    style={{
                      maxHeight: isActive ? '100px' : '0',
                      opacity: isActive ? 1 : 0,
                    }}
                  >
                    <p className="text-muted-foreground text-sm leading-relaxed">{step.desc}</p>
                  </div>
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
