import { useState, useEffect } from "react";
import { Star, UserPlus } from "lucide-react";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const cats = ["الكل", "الرحلات", "الطرود", "التوصيل"];

// Fallback testimonials shown when no real reviews exist
const fallbackTestimonials = [
  { name: "أحمد العمراني", role: "رجل أعمال — صنعاء", content: "استخدمت المنصة لإرسال طرود تجارية إلى عدن وتعز. الخدمة سريعة وآمنة، ونظام التتبع ممتاز.", rating: 5, cat: "الطرود", avatar: "أح" },
  { name: "فاطمة محمد", role: "طالبة جامعية — تعز", content: "سافرت أكثر من ٥ مرات عبر المنصة. الأسعار مناسبة والمقاعد مريحة — أفضل من محطات الباص التقليدية.", rating: 5, cat: "الرحلات", avatar: "فا" },
  { name: "خالد الحكيمي", role: "مدير مطعم — عدن", content: "خدمة التوصيل المحلي ساعدتني في زيادة مبيعات المطعم. المندوبون محترفون والطلبات تصل سريعة.", rating: 5, cat: "التوصيل", avatar: "خا" },
];

interface ReviewData {
  name: string;
  role: string;
  content: string;
  rating: number;
  cat: string;
  avatar: string;
}

const Testimonials = () => {
  const [cat, setCat] = useState("الكل");
  const [reviews, setReviews] = useState<ReviewData[]>(fallbackTestimonials);

  useEffect(() => {
    const fetchReviews = async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select("rating, comment, entity_type, created_at, reviewer_id")
        .order("created_at", { ascending: false })
        .limit(6);

      if (!error && data && data.length > 0) {
        // Fetch reviewer names
        const reviewerIds = [...new Set(data.map(r => r.reviewer_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", reviewerIds);

        const profileMap = new Map((profiles || []).map(p => [p.user_id, p.full_name]));

        const mapped: ReviewData[] = data.map(r => {
          const name = profileMap.get(r.reviewer_id) || "عميل";
          const catMap: Record<string, string> = { supplier: "الرحلات", delivery: "التوصيل", driver: "الرحلات" };
          return {
            name,
            role: "عميل في وصل",
            content: r.comment || "تجربة ممتازة مع المنصة",
            rating: r.rating,
            cat: catMap[r.entity_type] || "الرحلات",
            avatar: name.slice(0, 2),
          };
        });
        setReviews(mapped);
      }
    };
    fetchReviews();
  }, []);

  const filtered = cat === "الكل" ? reviews : reviews.filter((t) => t.cat === cat);

  const { ref, isVisible } = useScrollAnimation();

  return (
    <section className="py-24 bg-secondary" ref={ref}>
      <div className="container mx-auto px-4 max-w-[1100px]">
        <div className="text-center mb-12" style={{ opacity: isVisible ? 1 : 0, transform: isVisible ? 'translateY(0)' : 'translateY(24px)', transition: 'all 0.7s ease-out' }}>
          <span className="glow-badge mb-4 inline-flex">
            <Star className="w-3 h-3" />
            آراء العملاء
          </span>
          <h2 className="text-3xl md:text-4xl font-extrabold text-foreground mt-4 mb-3">
            ماذا يقول عملاؤنا؟
          </h2>
        </div>

        <div className="flex justify-center gap-2.5 mb-10 flex-wrap">
          {cats.map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${
                cat === c
                  ? "bg-primary text-primary-foreground shadow-primary"
                  : "bg-card/80 text-muted-foreground hover:text-foreground"
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {filtered.map((t, i) => (
            <div
              key={i}
              className="bg-background/80 rounded-[18px] border border-border/10 p-7 transition-all hover:border-primary/20 hover:-translate-y-1"
            >
              <div className="flex gap-3 mb-4 items-center">
                <div className="w-[46px] h-[46px] rounded-xl shrink-0 bg-primary-gradient flex items-center justify-center text-primary-foreground font-bold text-sm">
                  {t.avatar}
                </div>
                <div>
                  <div className="text-foreground font-bold text-sm">{t.name}</div>
                  <div className="text-muted-foreground text-xs">{t.role}</div>
                </div>
              </div>
              <div className="flex gap-1 mb-3.5">
                {Array(t.rating).fill(0).map((_, j) => (
                  <Star key={j} className="w-3.5 h-3.5 text-accent fill-accent" />
                ))}
              </div>
              <p className="text-muted-foreground text-sm leading-relaxed mb-4">{t.content}</p>
              <span className="bg-primary/10 text-primary-glow px-2.5 py-0.5 rounded-md text-[11px] font-semibold">{t.cat}</span>
            </div>
          ))}
        </div>

        <div className="text-center mt-14">
          <div className="inline-block bg-primary/5 rounded-[20px] border border-primary/10 px-12 py-10 md:px-16">
            <h3 className="text-foreground text-2xl font-bold mb-2">انضم إلى عملاء وصل</h3>
            <p className="text-muted-foreground mb-6 text-sm">سجل الآن وابدأ باستخدام خدمات النقل المتكاملة</p>
            <Link to="/register">
              <Button size="lg" className="bg-primary-gradient text-primary-foreground shadow-primary gap-2">
                <UserPlus className="w-4 h-4" />
                ابدأ مجاناً
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
