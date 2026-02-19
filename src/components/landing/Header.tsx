import { useState } from "react";
import { Menu, X, Bus, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

const navLinks = [
  { label: "الرحلات", href: "#trips" },
  { label: "الشحنات", href: "#shipping" },
  { label: "التوصيل", href: "#delivery" },
  { label: "تتبع الشحنة", href: "#tracking" },
  { label: "عن المنصة", href: "#about" },
];

const Header = () => {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="fixed top-0 right-0 left-0 z-50 glass border-b border-border/50">
      <div className="container mx-auto px-4 flex items-center justify-between h-16">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-hero-gradient flex items-center justify-center">
            <Bus className="w-5 h-5 text-primary-foreground" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold text-foreground leading-tight">رحلاتي</span>
            <span className="text-[10px] text-muted-foreground leading-tight">المنصة اليمنية للنقل</span>
          </div>
        </div>

        {/* Desktop Nav */}
        <nav className="hidden lg:flex items-center gap-1">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors rounded-lg hover:bg-accent"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Actions */}
        <div className="hidden lg:flex items-center gap-2">
          <Button variant="ghost" size="sm" className="text-muted-foreground">
            تسجيل الدخول
          </Button>
          <Button size="sm" className="bg-hero-gradient text-primary-foreground hover:opacity-90 shadow-primary">
            إنشاء حساب
          </Button>
          <a href="#admin" className="p-2 rounded-lg hover:bg-accent transition-colors" title="لوحة التحكم">
            <Shield className="w-4 h-4 text-muted-foreground" />
          </a>
        </div>

        {/* Mobile toggle */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="lg:hidden p-2 rounded-lg hover:bg-accent transition-colors"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="lg:hidden glass border-t border-border/50 animate-fade-in">
          <nav className="container mx-auto px-4 py-4 flex flex-col gap-1">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="px-4 py-3 text-sm font-medium text-foreground hover:bg-accent rounded-lg transition-colors"
              >
                {link.label}
              </a>
            ))}
            <div className="border-t border-border mt-2 pt-3 flex flex-col gap-2">
              <Button variant="outline" size="sm" className="w-full">تسجيل الدخول</Button>
              <Button size="sm" className="w-full bg-hero-gradient text-primary-foreground">إنشاء حساب</Button>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
};

export default Header;
