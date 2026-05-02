import BackButton from "@/components/common/BackButton";
import { Bus, Shield, Users, MapPin, Star, Clock } from "lucide-react";

const AboutPage = () => {
  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <main className="container mx-auto px-4 py-8">
        <BackButton />
        <div className="max-w-3xl mx-auto">
           <h1 className="text-3xl font-bold text-foreground mb-4">عن منصة وصل</h1>
          <p className="text-muted-foreground mb-8 leading-relaxed">
            وصل هي أول منصة يمنية متكاملة لخدمات النقل، تربط العملاء بشركات النقل الموثوقة وتوفر خدمات الطرود والتوصيل بين المدن اليمنية والوجهات الدولية.
          </p>

          <div className="grid sm:grid-cols-2 gap-6 mb-12">
            {[
              { icon: Bus, title: "رحلات آمنة", desc: "شركات نقل موثوقة ومرخصة بين جميع المدن" },
              { icon: Shield, title: "أمان وثقة", desc: "نظام حماية متكامل وتأمين على الأمتعة" },
              { icon: Users, title: "مجتمع كبير", desc: "آلاف العملاء والشركاء عبر اليمن" },
              { icon: MapPin, title: "تغطية شاملة", desc: "تغطية لجميع المحافظات والمدن اليمنية" },
              { icon: Star, title: "جودة عالية", desc: "تقييمات ومراجعات حقيقية من العملاء" },
              { icon: Clock, title: "خدمة مستمرة", desc: "دعم فني على مدار الساعة" },
            ].map((item) => (
              <div key={item.title} className="bg-card rounded-xl border border-border p-5">
                <item.icon className="w-8 h-8 text-primary mb-3" />
                <h3 className="font-bold text-foreground mb-1">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>

          <div className="bg-accent rounded-2xl p-8 text-center">
            <h2 className="text-xl font-bold text-foreground mb-2">رؤيتنا</h2>
            <p className="text-muted-foreground">
              أن نكون المنصة الرائدة في خدمات النقل البري في اليمن والمنطقة، ونوفر تجربة نقل حديثة وموثوقة لجميع المستخدمين.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AboutPage;
