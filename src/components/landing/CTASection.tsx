import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const CTASection = () => {
  return (
    <section className="py-16 bg-muted/50">
      <div className="container mx-auto px-4">
        <div className="bg-card rounded-3xl border border-border p-8 md:p-12 text-center max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-black text-foreground mb-4">
            انضم إلى آلاف العملاء الراضين
          </h2>
          <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
            سجّل الآن واحصل على خصم 20% على أول استخدام للمنصة
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button size="lg" className="bg-gold-gradient text-secondary-foreground font-bold hover:opacity-90 shadow-gold">
              ابدأ مجاناً
              <ArrowLeft className="w-4 h-4 mr-2" />
            </Button>
            <Button size="lg" variant="outline">
              شاهد المزيد
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
