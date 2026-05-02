import { useState } from "react";
import { Bus, Mail, Phone, MessageCircle, Shield } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const footerLinks = {
  services: {
    title: "خدماتنا",
    links: [
      { label: "رحلات بين المدن", href: "/trips" },
      { label: "طرود آمنة", href: "/shipments" },
      { label: "توصيل محلي", href: "/deliveries" },
      { label: "تتبع الطرود", href: "/tracking" },
    ],
  },
  travelers: {
    title: "للعملاء",
    links: [
      { label: "عن المنصة", href: "/about" },
      { label: "تواصل معنا", href: "/contact" },
      { label: "سياسة الخصوصية", href: "/about" },
      { label: "سجلي", href: "/history" },
    ],
  },
  partners: {
    title: "للشركاء",
    links: [
      { label: "انضم كصاحب مكتب", href: "/contact" },
      { label: "انضم كشركة توصيل", href: "/contact" },
      { label: "لوحة تحكم صاحب المكتب", href: "/supplier" },
      { label: "لوحة تحكم التوصيل", href: "/delivery" },
    ],
  },
};

const Footer = () => {
  const [email, setEmail] = useState("");
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubscribe = () => {
    if (!email.trim() || !email.includes("@")) {
      toast({ title: "يرجى إدخال بريد إلكتروني صحيح", variant: "destructive" });
      return;
    }
    toast({ title: "تم الاشتراك بنجاح!", description: "شكراً لاشتراكك في نشرتنا البريدية" });
    setEmail("");
  };

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
                onKeyDown={(e) => e.key === "Enter" && handleSubscribe()}
                placeholder="بريدك الإلكتروني"
                className="flex-1 px-4 py-2.5 rounded-xl bg-primary-foreground/10 border border-primary-foreground/10 text-primary-foreground placeholder:text-primary-foreground/40 outline-none focus:border-secondary text-sm"
              />
              <Button className="bg-gold-gradient text-secondary-foreground font-bold hover:opacity-90 shrink-0" onClick={handleSubscribe}>
                اشترك
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Links */}
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-4 cursor-pointer" onClick={() => navigate("/")}>
              <div className="w-10 h-10 rounded-xl bg-gold-gradient flex items-center justify-center">
                <Bus className="w-5 h-5 text-secondary-foreground" />
              </div>
              <div>
                <div className="font-bold text-lg">وصل</div>
                <div className="text-[10px] text-primary-foreground/60">منصة النقل الذكية</div>
              </div>
            </div>
            <p className="text-sm text-primary-foreground/60 leading-relaxed mb-4">المنصة الرائدة في خدمات النقل والتوصيل في اليمن</p>
          </div>

          {Object.values(footerLinks).map((section) => (
            <div key={section.title}>
              <h4 className="font-bold text-sm mb-4">{section.title}</h4>
              <ul className="space-y-2">
                {section.links.map((link) => (
                  <li key={link.label}>
                    <Link to={link.href} className="text-xs text-primary-foreground/50 hover:text-secondary transition-colors">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Contact */}
        <div className="border-t border-primary-foreground/10 mt-10 pt-8">
          <div className="flex flex-wrap gap-6 justify-center text-sm text-primary-foreground/60 mb-6">
            <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-secondary" /><span>+967 1 234 567</span></div>
            <div className="flex items-center gap-2"><MessageCircle className="w-4 h-4 text-secondary" /><span>+967 71 234 567</span></div>
            <div className="flex items-center gap-2"><Mail className="w-4 h-4 text-secondary" /><span>support@wasl.com</span></div>
          </div>

          <div className="text-center text-xs text-primary-foreground/40">
            <div className="flex items-center justify-center gap-2">
              <p>© 2024 وصل. جميع الحقوق محفوظة. صنعاء، اليمن 🇾🇪</p>
              <Link to="/admin" className="opacity-20 hover:opacity-60 transition-opacity" title="لوحة التحكم">
                <Shield className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="flex justify-center gap-4 mt-2">
              <Link to="/about" className="hover:text-secondary transition-colors">سياسة الخصوصية</Link>
              <Link to="/about" className="hover:text-secondary transition-colors">الشروط والأحكام</Link>
              <Link to="/contact" className="hover:text-secondary transition-colors">تواصل معنا</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;