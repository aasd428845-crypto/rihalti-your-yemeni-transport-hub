import { Link } from "react-router-dom";
import { Bus, Package, Truck, Globe, CheckCircle } from "lucide-react";

const services = [
  {
    icon: Bus,
    title: "رحلات بين المدن",
    desc: "احجز مقعدك في أفضل الباصات مع شركات النقل الموثوقة بين جميع المدن اليمنية",
    stats: ["١٠٠٠+ رحلة يومياً", "تذاكر إلكترونية", "تتبع مباشر", "تأمين الأمتعة"],
    link: "/trips",
    colorClass: "text-primary-glow",
    bgClass: "bg-primary/15 border-primary/30",
    glowClass: "hover:border-primary/40 hover:shadow-[0_24px_60px_hsl(153_74%_45%/0.15)]",
  },
  {
    icon: Package,
    title: "شحنات آمنة",
    desc: "أرسل شحنتك بثقة مع نظام التتبع المتكامل والتأمين الشامل على البضائع",
    stats: ["٥٠٠+ شحنة يومياً", "تتبع لحظي", "تأمين شامل", "أسعار تنافسية"],
    link: "/shipments",
    colorClass: "text-blue-400",
    bgClass: "bg-blue-500/15 border-blue-400/30",
    glowClass: "hover:border-blue-400/40 hover:shadow-[0_24px_60px_hsl(213_60%_50%/0.15)]",
  },
  {
    icon: Truck,
    title: "توصيل محلي سريع",
    desc: "اطلب من مطاعمك ومتاجرك المفضلة مع توصيل سريع لباب منزلك",
    stats: ["٢٠٠٠+ توصيل يومياً", "توصيل في ٣٠ دقيقة", "تتبع المندوب", "دفع إلكتروني"],
    link: "/deliveries",
    colorClass: "text-accent",
    bgClass: "bg-accent/15 border-accent/30",
    glowClass: "hover:border-accent/40 hover:shadow-[0_24px_60px_hsl(38_92%_50%/0.15)]",
  },
];

const Services = () => {
  return (
    <section className="py-24 bg-secondary">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <span className="glow-badge mb-4 inline-flex">
            <Globe className="w-3 h-3" />
            خدماتنا المتكاملة
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-[44px] font-extrabold text-foreground mt-4 mb-4">
            كل ما تحتاجه في مكان واحد
          </h2>
          <p className="text-muted-foreground text-lg max-w-[600px] mx-auto leading-relaxed">
            منصة وصل توفر لك ثلاث خدمات متكاملة تغطي جميع احتياجات التنقل والشحن في اليمن
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {services.map((service, i) => {
            const Icon = service.icon;
            return (
              <Link to={service.link} key={i} className="group">
                <div className={`bg-background/80 rounded-[20px] border border-border/10 p-9 transition-all duration-300 cursor-pointer relative overflow-hidden hover:-translate-y-2 ${service.glowClass}`}>
                  <div className={`w-[60px] h-[60px] rounded-[14px] ${service.bgClass} border flex items-center justify-center mb-5`}>
                    <Icon className={`w-7 h-7 ${service.colorClass}`} />
                  </div>
                  <h3 className="text-foreground text-xl font-bold mb-3">{service.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed mb-6">{service.desc}</p>
                  <div className="flex flex-col gap-2 mb-7">
                    {service.stats.map((stat, j) => (
                      <div key={j} className="flex items-center gap-2">
                        <CheckCircle className={`w-3.5 h-3.5 ${service.colorClass}`} />
                        <span className="text-muted-foreground text-sm">{stat}</span>
                      </div>
                    ))}
                  </div>
                  <button className={`w-full py-2.5 px-5 rounded-[10px] text-sm font-semibold border ${service.bgClass} ${service.colorClass} transition-all hover:opacity-80`}>
                    ابدأ الآن ←
                  </button>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Services;
