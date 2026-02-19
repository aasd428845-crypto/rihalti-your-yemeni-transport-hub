import { useState } from "react";
import { Star } from "lucide-react";

const categories = ["الكل", "الرحلات", "الشحنات", "التوصيل"];

const testimonials = [
  {
    name: "أحمد العمراني",
    role: "رجل أعمال - صنعاء",
    rating: 5,
    text: "استخدمت المنصة لإرسال شحنات تجارية إلى عدن وتعز، الخدمة كانت سريعة وآمنة. نظام التتبع ممتاز والدعم الفني متواجد دائماً.",
    category: "الشحنات",
    time: "منذ أسبوعين",
    initial: "أ",
  },
  {
    name: "فاطمة محمد",
    role: "طالبة جامعية - تعز",
    rating: 5,
    text: "سافرت أكثر من 5 مرات عبر المنصة، الأسعار مناسبة والمقاعد مريحة. أفضل من الانتظار في محطات الباص التقليدية.",
    category: "الرحلات",
    time: "منذ شهر",
    initial: "ف",
  },
  {
    name: "خالد الحكيمي",
    role: "مدير مطعم - عدن",
    rating: 4,
    text: "خدمة التوصيل المحلي ساعدتني في زيادة مبيعات المطعم بنسبة 40%. المندوبين محترفين والطلبات تصل سريعة.",
    category: "التوصيل",
    time: "منذ 3 أيام",
    initial: "خ",
  },
];

const TestimonialsSection = () => {
  const [filter, setFilter] = useState("الكل");
  const filtered = filter === "الكل" ? testimonials : testimonials.filter((t) => t.category === filter);

  return (
    <section className="py-20 bg-muted/50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10">
          <span className="inline-block px-4 py-1.5 rounded-full bg-secondary/20 text-secondary-foreground text-sm font-semibold mb-4">
            آراء عملائنا
          </span>
          <h2 className="text-3xl md:text-4xl font-black text-foreground mb-4">
            اكتشف تجارب المستخدمين
          </h2>
        </div>

        {/* Filter */}
        <div className="flex justify-center gap-2 mb-10">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                filter === cat
                  ? "bg-primary text-primary-foreground"
                  : "bg-card text-muted-foreground border border-border hover:bg-accent"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-10">
          {filtered.map((t) => (
            <div key={t.name} className="bg-card rounded-2xl border border-border p-6 hover:shadow-lg transition-all">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-hero-gradient flex items-center justify-center text-primary-foreground font-bold text-lg">
                  {t.initial}
                </div>
                <div>
                  <div className="font-bold text-foreground">{t.name}</div>
                  <div className="text-xs text-muted-foreground">{t.role}</div>
                </div>
              </div>

              <div className="flex gap-0.5 mb-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`w-4 h-4 ${i < t.rating ? "text-secondary fill-secondary" : "text-muted"}`}
                  />
                ))}
              </div>

              <p className="text-sm text-muted-foreground leading-relaxed mb-3">{t.text}</p>

              <div className="flex items-center justify-between">
                <span className="text-xs px-2.5 py-1 rounded-lg bg-muted text-muted-foreground">{t.category}</span>
                <span className="text-xs text-muted-foreground">{t.time}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-4 max-w-2xl mx-auto">
          {[
            { value: "98%", label: "رضا العملاء" },
            { value: "95%", label: "التزام بالمواعيد" },
            { value: "99%", label: "توصيل ناجح" },
          ].map((s) => (
            <div key={s.label} className="text-center bg-card rounded-xl border border-border p-4">
              <div className="text-2xl font-black text-primary">{s.value}</div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
