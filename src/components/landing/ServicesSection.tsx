import { Bus, Package, Truck, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const services = [
  {
    icon: Bus,
    title: "رحلات بين المدن",
    description: "احجز مقعدك في أفضل الباصات مع شركات النقل الموثوقة بين جميع المدن اليمنية",
    stats: "1000+ رحلة يومياً",
    features: ["تذاكر إلكترونية", "تتبع مباشر", "تأمين على الأمتعة"],
    color: "primary" as const,
  },
  {
    icon: Package,
    title: "شحنات آمنة",
    description: "أرسل شحنتك بثقة مع نظام التتبع المتكامل والتأمين على البضائع",
    stats: "500+ شحنة يومياً",
    features: ["تتبع لحظي", "تأمين شامل", "أسعار تنافسية"],
    color: "secondary" as const,
  },
  {
    icon: Truck,
    title: "توصيل محلي",
    description: "اطلب من مطاعمك ومتاجرك المفضلة مع توصيل سريع لباب منزلك",
    stats: "2000+ توصيل يومياً",
    features: ["توصيل سريع", "تتبع المندوب", "دفع إلكتروني"],
    color: "success" as const,
  },
];

const colorMap = {
  primary: {
    bg: "bg-accent",
    icon: "text-primary",
    badge: "bg-primary/10 text-primary",
  },
  secondary: {
    bg: "bg-secondary/10",
    icon: "text-secondary",
    badge: "bg-secondary/10 text-secondary-foreground",
  },
  success: {
    bg: "bg-success/10",
    icon: "text-success",
    badge: "bg-success/10 text-success",
  },
};

const ServicesSection = () => {
  return (
    <section id="about" className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-14">
          <span className="inline-block px-4 py-1.5 rounded-full bg-accent text-accent-foreground text-sm font-semibold mb-4">
            خدماتنا المتكاملة
          </span>
          <h2 className="text-3xl md:text-4xl font-black text-foreground mb-4">
            نقدم مجموعة متكاملة من خدمات النقل
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            لتغطية جميع احتياجاتك في التنقل والشحن والتوصيل داخل اليمن
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {services.map((service, i) => {
            const colors = colorMap[service.color];
            return (
              <div
                key={service.title}
                className="group bg-card rounded-2xl border border-border p-6 hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
                style={{ animationDelay: `${i * 0.15}s` }}
              >
                <div className={`w-14 h-14 rounded-xl ${colors.bg} flex items-center justify-center mb-5`}>
                  <service.icon className={`w-7 h-7 ${colors.icon}`} />
                </div>

                <h3 className="text-xl font-bold text-foreground mb-2">{service.title}</h3>
                <p className="text-muted-foreground text-sm mb-4 leading-relaxed">{service.description}</p>

                <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full ${colors.badge} text-xs font-semibold mb-4`}>
                  📊 {service.stats}
                </div>

                <div className="flex flex-wrap gap-2 mb-5">
                  {service.features.map((f) => (
                    <span key={f} className="text-xs px-2.5 py-1 rounded-lg bg-muted text-muted-foreground">
                      {f}
                    </span>
                  ))}
                </div>

                <Button variant="outline" className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  ابدأ الآن
                  <ArrowLeft className="w-4 h-4 mr-2" />
                </Button>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default ServicesSection;
