import { Link } from "react-router-dom";
import { Phone, Mail, MapPin, MessageCircle, Bus } from "lucide-react";

const links = {
  "خدماتنا": [
    { name: "رحلات بين المدن", path: "/trips" },
    { name: "شحنات آمنة", path: "/shipments" },
    { name: "توصيل محلي", path: "/deliveries" },
    { name: "تتبع الشحنات", path: "/tracking" },
    { name: "المطاعم", path: "/restaurants" },
  ],
  "للعملاء": [
    { name: "عن المنصة", path: "/about" },
    { name: "اتصل بنا", path: "/contact" },
  ],
  "للشركاء": [
    { name: "انضم كصاحب مكتب", path: "/register" },
    { name: "انضم كشركة توصيل", path: "/register" },
    { name: "انضم كسائق", path: "/register" },
  ],
  "الدعم": [
    { name: "اتصل بنا", path: "/contact" },
    { name: "الدعم عبر واتساب", path: "https://wa.me/967712345678" },
  ],
};

const cities = ["صنعاء", "عدن", "تعز", "الحديدة", "إب", "ذمار", "المكلا", "سيئون", "مأرب", "حجة", "صعدة", "عمران"];

const HomeFooter = () => {
  return (
    <footer className="bg-[hsl(213,54%,5%)] pt-20 pb-7 border-t border-primary/10">
      <div className="container mx-auto px-4 max-w-[1300px]">
        {/* Main Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-10 mb-14">
          {/* Brand */}
          <div className="lg:col-span-1">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-[38px] h-[38px] rounded-[10px] bg-primary-gradient flex items-center justify-center">
                <Bus className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-primary-glow font-extrabold text-lg">وصل</span>
            </div>
            <p className="text-muted-foreground text-sm leading-relaxed mb-5">
              المنصة الرائدة في خدمات النقل البري في اليمن، نربط المسافرين بشركات النقل الموثوقة.
            </p>
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center gap-2 text-muted-foreground text-xs">
                <Phone className="w-3.5 h-3.5 text-primary-glow" /> +967 1 234 567
              </div>
              <div className="flex items-center gap-2 text-muted-foreground text-xs">
                <MessageCircle className="w-3.5 h-3.5 text-primary-glow" /> +967 71 234 567
              </div>
              <div className="flex items-center gap-2 text-muted-foreground text-xs">
                <Mail className="w-3.5 h-3.5 text-primary-glow" /> support@wasl-ye.com
              </div>
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(links).map(([title, items]) => (
            <div key={title}>
              <h4 className="text-foreground font-bold text-sm mb-4">{title}</h4>
              <ul className="flex flex-col gap-2">
                {items.map((item) => (
                  <li key={item.name}>
                    {item.path.startsWith("http") ? (
                      <a href={item.path} target="_blank" rel="noopener noreferrer" className="text-muted-foreground text-sm hover:text-primary-glow transition-colors">
                        {item.name}
                      </a>
                    ) : (
                      <Link to={item.path} className="text-muted-foreground text-sm hover:text-primary-glow transition-colors">
                        {item.name}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Cities */}
        <div className="border-t border-border/10 pt-8 mb-8">
          <p className="text-muted-foreground text-xs tracking-[1px] uppercase text-center mb-3.5">نغطي جميع مدن اليمن</p>
          <div className="flex flex-wrap justify-center gap-2">
            {cities.map((city) => (
              <span
                key={city}
                className="bg-card/60 border border-border/10 text-muted-foreground px-3 py-1 rounded-full text-xs cursor-default transition-all hover:bg-primary/15 hover:text-primary-glow hover:border-primary/25"
              >
                {city}
              </span>
            ))}
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t border-border/10 pt-6 flex flex-wrap justify-between items-center gap-4">
          <span className="text-muted-foreground text-sm">© {new Date().getFullYear()} وصل. جميع الحقوق محفوظة. 🇾🇪</span>
          <div className="flex gap-4 flex-wrap">
            {["سياسة الخصوصية", "الشروط والأحكام"].map((item) => (
              <a key={item} href="#" className="text-muted-foreground text-xs hover:text-primary-glow transition-colors">{item}</a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default HomeFooter;
