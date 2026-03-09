import { Link } from "react-router-dom";
import { Phone, Mail, MapPin } from "lucide-react";
import waslLogo from "@/assets/wasl-logo.png";

const footerLinks = {
  "خدماتنا": [
    { name: "رحلات بين المدن", path: "/trips" },
    { name: "إرسال الطرود", path: "/shipments" },
    { name: "توصيل محلي", path: "/deliveries" },
    { name: "سيارة أجرة", path: "/ride/request" },
    { name: "تتبع", path: "/tracking" },
  ],
  "للمسافرين": [
    { name: "عن المنصة", path: "/about" },
    { name: "اتصل بنا", path: "/contact" },
  ],
  "للشركاء": [
    { name: "انضم كصاحب مكتب", path: "/register" },
    { name: "انضم كشركة توصيل", path: "/register" },
    { name: "انضم كسائق", path: "/register" },
  ],
};

const HomeFooter = () => {
  return (
    <footer className="bg-primary text-primary-foreground pt-16 pb-8">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          {/* About */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <img src={waslLogo} alt="وصل" className="w-10 h-10 rounded-xl bg-white/10 p-1 object-cover" />
              <span className="text-2xl font-bold">وصل</span>
            </div>
            <p className="text-primary-foreground/70 mb-4 leading-relaxed text-sm">
              منصة يمنية ذكية تربط المسافرين وأصحاب المكاتب وشركات التوصيل، لتوفير خدمات نقل آمنة وموثوقة.
            </p>
            <div className="space-y-2 text-sm text-primary-foreground/70">
              <div className="flex items-center gap-2"><Phone className="w-4 h-4" /> +967 1 234 567</div>
              <div className="flex items-center gap-2"><Mail className="w-4 h-4" /> support@wasl-ye.com</div>
              <div className="flex items-center gap-2"><MapPin className="w-4 h-4" /> صنعاء، اليمن</div>
            </div>
          </div>

          {/* Links */}
          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h3 className="font-bold text-lg mb-4">{title}</h3>
              <ul className="space-y-2">
                {links.map((link) => (
                  <li key={link.name}>
                    <Link to={link.path} className="text-primary-foreground/70 hover:text-primary-foreground transition text-sm">
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-white/20 pt-8 text-center text-primary-foreground/60 text-sm">
          <p>© {new Date().getFullYear()} وصل - جميع الحقوق محفوظة. صنعاء، اليمن 🇾🇪</p>
        </div>
      </div>
    </footer>
  );
};

export default HomeFooter;
