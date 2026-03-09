const partners = ["البنك المركزي اليمني", "وزارة النقل", "غرفة صناعة وتجارة صنعاء", "هيئة الطرق والجسور", "اتحاد النقل البري", "الجمعية اليمنية للجودة"];

const Partners = () => {
  return (
    <section className="py-14 bg-background border-t border-border/10">
      <div className="container mx-auto px-4 max-w-[1100px] text-center">
        <p className="text-muted-foreground text-xs tracking-[2px] uppercase mb-6">موثوق من قبل</p>
        <div className="flex flex-wrap justify-center gap-4">
          {partners.map((p, i) => (
            <div
              key={i}
              className="px-5 py-2.5 rounded-[10px] bg-card/60 border border-border/10 text-muted-foreground text-sm font-medium transition-all hover:text-primary-glow hover:border-primary/25 cursor-default"
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
