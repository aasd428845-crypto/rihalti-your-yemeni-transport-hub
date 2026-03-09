import { Link } from "react-router-dom";
import { Bus, Package, Truck, Map } from "lucide-react";
import { Button } from "@/components/ui/button";

const services = [
  {
    icon: Bus,
    title: "رحلات بين المدن",
    description: "احجز مقعدك مع أفضل مكاتب النقل الموثوقة بين جميع المدن اليمنية",
    link: "/trips",
  },
  {
    icon: Package,
    title: "إرسال الطرود",
    description: "أرسل طردك بثقة مع نظام تتبع متكامل وتأمين على البضائع",
    link: "/shipments",
  },
  {
    icon: Truck,
    title: "توصيل محلي",
    description: "اطلب من مطاعمك ومتاجرك المفضلة مع توصيل سريع لباب منزلك",
    link: "/deliveries",
  },
  {
    icon: Map,
    title: "سيارة أجرة",
    description: "اطلب سيارة أجرة الآن واختر السائق المناسب لك",
    link: "/ride/request",
  },
];

const Services = () => {
  return (
    <section className="py-20 bg-card">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">خدماتنا المتكاملة</h2>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            نقدم مجموعة شاملة من خدمات النقل لتلبية جميع احتياجاتك اليومية
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {services.map((service, idx) => {
            const Icon = service.icon;
            return (
              <Link to={service.link} key={idx} className="group">
                <div className="bg-background border border-border rounded-2xl p-8 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-2 h-full flex flex-col">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <Icon className="w-8 h-8 text-primary group-hover:text-primary-foreground transition-colors" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-3">{service.title}</h3>
                  <p className="text-muted-foreground mb-6 leading-relaxed flex-1">{service.description}</p>
                  <Button variant="outline" className="w-full">ابدأ الآن</Button>
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
