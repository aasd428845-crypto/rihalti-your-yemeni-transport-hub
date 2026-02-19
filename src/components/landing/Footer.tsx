import { useState } from "react";
import { Bus, Mail, Phone, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const footerLinks = {
  services: {
    title: "خدماتنا",
    links: ["رحلات بين المدن", "شحنات آمنة", "توصيل محلي", "تتبع الشحنات", "حجز مجموعات", "شحن تجاري"],
  },
  travelers: {
    title: "للعملاء",
    links: ["كيف تحجز رحلة", "أسئلة شائعة", "شروط الاستخدام", "سياسة الخصوصية", "سياسة الإلغاء", "دليل المدن"],
  },
  partners: {
    title: "للشركاء",
    links: ["انضم كمورد", "انضم كشركة توصيل", "منصة الشركاء", "شروط الشراكة", "نسبة العمولة", "تواصل مع المبيعات"],
  },
  support: {
    title: "الدعم",
    links: ["اتصل بنا", "مركز المساعدة", "الشكاوى والمقترحات", "الدعم عبر الواتساب", "الدعم الفني", "حالة النظام"],
  },
};

const Footer = () => {
  const [email, setEmail] = useState("");

  return (
    <footer className="bg-foreground text-primary-foreground">
      {/* Newsletter */}
      <div className="border-b border-primary-foreground/10">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-lg">ابقَ على اطلاع</h3>
              <p className="text-sm text-primary-foreground/60">اشترك في نشرتنا البريدية لتصلك آخر العروض والتحديثات</p>
            </div>
            <div className="flex gap-2 w-full max-w-md">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="بريدك الإلكتروني"
                className="flex-1 px-4 py-2.5 rounded-xl bg-primary-foreground/10 border border-primary-foreground/10 text-primary-foreground placeholder:text-primary-foreground/40 outline-none focus:border-secondary text-sm"
              />
              <Button className="bg-gold-gradient text-secondary-foreground font-bold hover:opacity-90 shrink-0">
                اشترك
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Links */}
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gold-gradient flex items-center justify-center">
                <Bus className="w-5 h-5 text-secondary-foreground" />
              </div>
              <div>
                <div className="font-bold text-lg">رحلاتي</div>
                <div className="text-[10px] text-primary-foreground/60">المنصة اليمنية للنقل</div>
              </div>
            </div>
            <p className="text-sm text-primary-foreground/60 leading-relaxed mb-4">
              المنصة الرائدة في خدمات النقل البري في اليمن منذ 2024
            </p>
            <div className="flex flex-wrap gap-2">
              {["آمنة 100%", "جودة معتمدة", "تغطية وطنية"].map((badge) => (
                <span key={badge} className="text-[10px] px-2 py-1 rounded-lg bg-primary-foreground/10 text-primary-foreground/70">
                  {badge}
                </span>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {Object.values(footerLinks).map((section) => (
            <div key={section.title}>
              <h4 className="font-bold text-sm mb-4">{section.title}</h4>
              <ul className="space-y-2">
                {section.links.map((link) => (
                  <li key={link}>
                    <a href="#" className="text-xs text-primary-foreground/50 hover:text-secondary transition-colors">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Contact */}
        <div className="border-t border-primary-foreground/10 mt-10 pt-8">
          <div className="flex flex-wrap gap-6 justify-center text-sm text-primary-foreground/60 mb-6">
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-secondary" />
              <span>+967 1 234 567</span>
            </div>
            <div className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-secondary" />
              <span>+967 71 234 567</span>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-secondary" />
              <span>support@rihlati.com</span>
            </div>
          </div>

          <div className="text-center text-xs text-primary-foreground/40">
            <p>© 2024 رحلاتي. جميع الحقوق محفوظة. صنعاء، اليمن 🇾🇪</p>
            <div className="flex justify-center gap-4 mt-2">
              {["سياسة الخصوصية", "الشروط والأحكام", "خريطة الموقع", "إمكانية الوصول"].map((l) => (
                <a key={l} href="#" className="hover:text-secondary transition-colors">{l}</a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
