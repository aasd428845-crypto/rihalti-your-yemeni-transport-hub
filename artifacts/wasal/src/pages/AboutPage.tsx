import BackButton from "@/components/common/BackButton";
import { Truck, Package, MapPin, Clock, Shield, Users } from "lucide-react";

const AboutPage = () => (
  <div className="container mx-auto px-4 py-10 max-w-3xl" dir="rtl">
    <BackButton />

    {/* Hero */}
    <div className="mt-4 mb-10 text-center">
      <div className="w-20 h-20 rounded-3xl bg-hero-gradient flex items-center justify-center mx-auto mb-4 shadow-lg">
        <span className="text-4xl font-black text-white">و</span>
      </div>
      <h1 className="text-3xl font-black text-foreground mb-2">عن وصال</h1>
      <p className="text-muted-foreground text-base leading-7 max-w-lg mx-auto">
        منصة التوصيل الذكي — أول منصة يمنية متكاملة تجمع خدمات النقل والطرود وتوصيل الطلبات في مكان واحد
      </p>
    </div>

    {/* Mission */}
    <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6 mb-10">
      <h2 className="text-xl font-bold text-foreground mb-3">مهمتنا</h2>
      <p className="text-muted-foreground leading-7">
        نؤمن بأن كل يمني يستحق خدمة توصيل موثوقة وسريعة وبأسعار عادلة. وصال ليست مجرد تطبيق — إنها شبكة تربط المجتمعات اليمنية وتُسهّل حياتهم اليومية، من توصيل وجبة دافئة إلى شحن بضاعة عبر المدن.
      </p>
    </div>

    {/* Services */}
    <div className="mb-10">
      <h2 className="text-xl font-bold text-foreground mb-5">خدماتنا</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[
          { icon: Package, title: "توصيل الطرود", desc: "شحن آمن وسريع بين جميع المدن اليمنية مع تتبع فوري" },
          { icon: Truck, title: "النقل بين المدن", desc: "حجز رحلات آمنة ومريحة مع سائقين معتمدين" },
          { icon: MapPin, title: "توصيل الطلبات", desc: "طلباتك من مطاعمك ومتاجرك المفضلة تصلك لبابك" },
          { icon: Clock, title: "تتبع لحظي", desc: "اعرف أين طلبك في كل لحظة برقم التتبع الحي" },
        ].map(({ icon: Icon, title, desc }) => (
          <div key={title} className="bg-card border border-border rounded-xl p-5 flex gap-4">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Icon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-bold text-foreground mb-1">{title}</h3>
              <p className="text-sm text-muted-foreground leading-6">{desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>

    {/* Values */}
    <div className="mb-10">
      <h2 className="text-xl font-bold text-foreground mb-5">قيمنا</h2>
      <div className="space-y-4">
        {[
          { icon: Shield, title: "الأمان أولاً", desc: "نتحقق من جميع السائقين والشركاء قبل قبولهم. سلامة بضاعتك وأنت أولويتنا." },
          { icon: Clock, title: "الالتزام بالوقت", desc: "نُقدّر وقتك. نلتزم بمواعيد التسليم ونُخبرك فوراً إذا حدث أي تأخير." },
          { icon: Users, title: "دعم المجتمع", desc: "نوفر فرص عمل لآلاف السائقين اليمنيين ونساعد المحلات التجارية على التوسع." },
        ].map(({ icon: Icon, title, desc }) => (
          <div key={title} className="flex gap-4 p-4 rounded-xl border border-border bg-card">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Icon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-bold text-foreground mb-1">{title}</h3>
              <p className="text-sm text-muted-foreground leading-6">{desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>

    {/* Stats */}
    <div className="bg-hero-gradient rounded-2xl p-6 text-white mb-10">
      <h2 className="text-xl font-bold mb-5 text-center">وصال بالأرقام</h2>
      <div className="grid grid-cols-3 gap-4 text-center">
        {[
          { val: "+١٠٠", label: "شركة شريكة" },
          { val: "+٥٠٠", label: "سائق نشط" },
          { val: "+١٥", label: "مدينة يمنية" },
        ].map(({ val, label }) => (
          <div key={label}>
            <div className="text-2xl font-black mb-1">{val}</div>
            <div className="text-xs text-white/80">{label}</div>
          </div>
        ))}
      </div>
    </div>

    {/* CTA */}
    <div className="text-center space-y-3">
      <p className="text-muted-foreground">هل أنت شركة توصيل وتريد الانضمام؟</p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <a
          href="/terms/company"
          className="inline-flex items-center justify-center gap-2 bg-primary text-white rounded-xl px-6 h-11 font-semibold hover:bg-primary/90 transition-colors text-sm"
        >
          شروط الشركاء
        </a>
        <a
          href="/contact"
          className="inline-flex items-center justify-center gap-2 bg-card border border-border text-foreground rounded-xl px-6 h-11 font-semibold hover:bg-muted transition-colors text-sm"
        >
          تواصل معنا
        </a>
      </div>
    </div>
  </div>
);

export default AboutPage;
