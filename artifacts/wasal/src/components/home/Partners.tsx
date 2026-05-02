import { useScrollAnimation } from "@/hooks/useScrollAnimation";

const partners = ["البنك المركزي اليمني", "وزارة النقل", "غرفة صناعة وتجارة صنعاء", "هيئة الطرق والجسور", "اتحاد النقل البري", "الجمعية اليمنية للجودة"];

const Partners = () => {
  const { ref, isVisible } = useScrollAnimation();

  return (
    <section className="py-14 bg-background border-t border-border/10" ref={ref}>
      <div className="container mx-auto px-4 max-w-[1100px] text-center">
        <p
          className="text-muted-foreground text-xs tracking-[2px] uppercase mb-6"
          style={{
            opacity: isVisible ? 1 : 0,
            transition: 'opacity 0.5s ease-out',
          }}
        >
          موثوق من قبل
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          {partners.map((p, i) => (
            <div
              key={i}
              className="px-5 py-2.5 rounded-[10px] bg-card/60 border border-border/10 text-muted-foreground text-sm font-medium transition-all duration-300 hover:text-primary-glow hover:border-primary/25 hover:scale-105 hover:shadow-md cursor-default"
              style={{
                opacity: isVisible ? 1 : 0,
                transform: isVisible ? 'translateY(0)' : 'translateY(12px)',
                transition: `all 0.4s ease-out ${i * 0.08}s`,
              }}
            >
              {p}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Partners;
