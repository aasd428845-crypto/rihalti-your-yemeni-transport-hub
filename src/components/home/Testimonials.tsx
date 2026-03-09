import { Star } from "lucide-react";

const testimonials = [
  { name: "أحمد العمري", role: "عميل", content: "خدمة رائعة، تمكنت من إرسال طرد إلى تعز بسهولة والتتبع كان دقيقاً.", rating: 5, avatar: "أ" },
  { name: "فاطمة محمد", role: "مسافرة", content: "حجزت رحلة من صنعاء إلى عدن، كل شيء كان منسقاً والسائق محترف.", rating: 5, avatar: "ف" },
  { name: "خالد الحكيمي", role: "صاحب مكتب", content: "منصة وصل ساعدتني في زيادة عدد زبائني بشكل كبير، شكراً لكم.", rating: 4, avatar: "خ" },
];

const Testimonials = () => {
  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">آراء عملائنا</h2>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">ماذا يقول المستخدمون عن تجربتهم مع وصل</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((item, idx) => (
            <div key={idx} className="bg-card p-6 rounded-2xl shadow-sm border border-border hover:shadow-lg transition-shadow">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center text-xl font-bold text-primary-foreground">
                  {item.avatar}
                </div>
                <div>
                  <div className="font-bold text-foreground">{item.name}</div>
                  <div className="text-sm text-muted-foreground">{item.role}</div>
                </div>
              </div>
              <div className="flex items-center gap-1 mb-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className={`w-4 h-4 ${i < item.rating ? "text-accent fill-accent" : "text-muted"}`} />
                ))}
              </div>
              <p className="text-muted-foreground leading-relaxed">"{item.content}"</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
