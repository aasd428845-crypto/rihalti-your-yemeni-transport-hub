import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Menu, X, Shield, User, LogOut, LayoutDashboard, MapPin, Bell, ShoppingCart, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "next-themes";
import waslLogo from "@/assets/wasl-logo.png";

const navLinks = [
  { label: "المطاعم", href: "/restaurants" },
  { label: "الرحلات", href: "/trips" },
  { label: "الطرود", href: "/shipments" },
  { label: "التوصيل", href: "/deliveries" },
  { label: "أجرة", href: "/ride/request" },
  { label: "تتبع الطرد", href: "/tracking" },
  { label: "عن المنصة", href: "/about" },
  { label: "اتصل بنا", href: "/contact" },
];

const Header = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const { user, role, profile, signOut, loading } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!user) return;
    const fetchUnread = async () => {
      const { count } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .is("read_at", null);
      setUnreadCount(count || 0);
    };
    fetchUnread();
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const getDashboardPath = () => {
    if (role === "supplier") return "/supplier";
    if (role === "delivery_company") return "/delivery";
    if (role === "admin") return "/admin";
    return null;
  };

  const getDashboardLabel = () => {
    if (role === "supplier") return "لوحة تحكم صاحب المكتب";
    if (role === "delivery_company") return "لوحة تحكم التوصيل";
    if (role === "admin") return "لوحة تحكم المشرف";
    return null;
  };

  const dashboardLabel = getDashboardLabel();
  const dashboardPath = getDashboardPath();

  const handleNavClick = (href: string) => {
    setMobileOpen(false);
    if (href.startsWith("/")) navigate(href);
    else if (href.startsWith("#")) {
      const el = document.querySelector(href);
      if (el) el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <header
      className={`fixed top-0 right-0 left-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-background/97 backdrop-blur-xl border-b border-primary/20"
          : "bg-background/70 backdrop-blur-xl border-b border-transparent"
      }`}
    >
      <div className="container mx-auto px-4 flex items-center justify-between h-[72px]">
        {/* Logo */}
        <a href="/" onClick={(e) => { e.preventDefault(); navigate("/"); }} className="flex items-center gap-2.5">
          <div className="w-[42px] h-[42px] rounded-[10px] bg-primary-gradient flex items-center justify-center shadow-primary">
            <img src={waslLogo} alt="وصل" className="w-8 h-8 rounded-lg object-cover" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-extrabold text-foreground leading-none">وصل</span>
            <span className="text-[10px] font-medium text-primary-glow leading-tight tracking-wider">منصة النقل الذكية</span>
          </div>
        </a>

        {/* Desktop Nav */}
        <nav className="hidden lg:flex items-center gap-1">
          {navLinks.map((link) => (
            <button
              key={link.href}
              onClick={() => handleNavClick(link.href)}
              className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-primary-glow transition-colors rounded-lg hover:bg-primary/10"
            >
              {link.label}
            </button>
          ))}
          {user && (
            <>
              <button onClick={() => navigate("/history")} className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-primary-glow transition-colors rounded-lg hover:bg-primary/10">السجل</button>
              <button onClick={() => navigate("/addresses")} className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-primary-glow transition-colors rounded-lg hover:bg-primary/10">
                <MapPin className="w-4 h-4 inline ml-1" />عناويني
              </button>
            </>
          )}
        </nav>

        {/* Auth & Actions */}
        <div className="hidden lg:flex items-center gap-2.5">
          {loading ? (
            <div className="w-20 h-9 rounded-lg bg-muted animate-pulse" />
          ) : user ? (
            <>
              <button onClick={() => navigate("/cart")} className="p-2 rounded-lg hover:bg-primary/10 transition-colors" title="السلة">
                <ShoppingCart className="w-5 h-5 text-muted-foreground" />
              </button>
              <button onClick={() => navigate("/notifications")} className="relative p-2 rounded-lg hover:bg-primary/10 transition-colors" title="الإشعارات">
                <Bell className="w-5 h-5 text-muted-foreground" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-destructive text-destructive-foreground text-[10px] rounded-full flex items-center justify-center font-bold">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>
              {dashboardLabel && dashboardPath && (
                <Button variant="outline" size="sm" onClick={() => navigate(dashboardPath)} className="gap-1 border-primary/30 text-primary-glow hover:bg-primary/10">
                  <LayoutDashboard className="w-4 h-4" />{dashboardLabel}
                </Button>
              )}
              <button onClick={() => navigate("/account")} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors border border-primary/20">
                <User className="w-4 h-4 text-primary-glow" />
                <span className="text-sm font-medium text-foreground">{profile?.full_name || user.email}</span>
              </button>
              <Button variant="ghost" size="sm" onClick={handleSignOut} className="text-muted-foreground gap-1 hover:text-destructive">
                <LogOut className="w-4 h-4" />خروج
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" size="sm" className="border-primary/40 text-primary-glow hover:bg-primary/10" onClick={() => navigate("/login")}>تسجيل الدخول</Button>
              <Button size="sm" className="bg-primary-gradient text-primary-foreground hover:opacity-90 shadow-primary" onClick={() => navigate("/register")}>إنشاء حساب</Button>
            </>
          )}
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="p-2 rounded-lg hover:bg-primary/10 transition-colors border border-primary/20"
            title={theme === "dark" ? "الوضع النهاري" : "الوضع الليلي"}
          >
            {theme === "dark" ? <Sun className="w-4 h-4 text-accent" /> : <Moon className="w-4 h-4 text-muted-foreground" />}
          </button>
          <button onClick={() => navigate("/login")} className="p-2 rounded-lg hover:bg-primary/10 transition-colors border border-primary/20" title="لوحة تحكم المشرف">
            <Shield className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Mobile Toggle */}
        <button onClick={() => setMobileOpen(!mobileOpen)} className="lg:hidden p-2 rounded-lg bg-primary/10 border border-primary/20 transition-colors text-primary-glow">
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="lg:hidden bg-background/95 backdrop-blur-xl border-t border-primary/10 animate-fade-in">
          <nav className="container mx-auto px-4 py-4 flex flex-col gap-1">
            <div className="flex justify-end mb-2">
              <button onClick={() => setMobileOpen(false)} className="p-2 rounded-lg hover:bg-primary/10 transition-colors">
                <X className="w-5 h-5 text-foreground" />
              </button>
            </div>
            {navLinks.map((link) => (
              <button key={link.href} onClick={() => handleNavClick(link.href)} className="px-4 py-3 text-sm font-medium text-foreground hover:bg-primary/10 hover:text-primary-glow rounded-lg transition-colors text-right">{link.label}</button>
            ))}
            {user && (
              <>
                <button onClick={() => handleNavClick("/history")} className="px-4 py-3 text-sm font-medium text-foreground hover:bg-primary/10 rounded-lg transition-colors text-right">السجل</button>
                <button onClick={() => handleNavClick("/addresses")} className="px-4 py-3 text-sm font-medium text-foreground hover:bg-primary/10 rounded-lg transition-colors text-right">عناويني</button>
                <button onClick={() => handleNavClick("/account")} className="px-4 py-3 text-sm font-medium text-foreground hover:bg-primary/10 rounded-lg transition-colors text-right">حسابي</button>
              </>
            )}
            {user && dashboardLabel && dashboardPath && (
              <button onClick={() => handleNavClick(dashboardPath)} className="px-4 py-3 text-sm font-medium text-primary-glow hover:bg-primary/10 rounded-lg transition-colors text-right flex items-center gap-2">
                <LayoutDashboard className="w-4 h-4" />{dashboardLabel}
              </button>
            )}
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="px-4 py-3 text-sm font-medium text-foreground hover:bg-primary/10 rounded-lg transition-colors text-right flex items-center gap-2"
            >
              {theme === "dark" ? <Sun className="w-4 h-4 text-accent" /> : <Moon className="w-4 h-4" />}
              {theme === "dark" ? "الوضع النهاري" : "الوضع الليلي"}
            </button>
            <div className="border-t border-border mt-2 pt-3 flex flex-col gap-2">
              {user ? (
                <>
                  <div className="px-4 py-2 text-sm text-muted-foreground">{profile?.full_name || user.email}</div>
                  <Button variant="outline" size="sm" className="w-full border-primary/30 text-primary-glow" onClick={() => { handleSignOut(); setMobileOpen(false); }}>تسجيل الخروج</Button>
                </>
              ) : (
                <>
                  <Button variant="outline" size="sm" className="w-full border-primary/40 text-primary-glow" onClick={() => handleNavClick("/login")}>تسجيل الدخول</Button>
                  <Button size="sm" className="w-full bg-primary-gradient text-primary-foreground" onClick={() => handleNavClick("/register")}>إنشاء حساب</Button>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
};

export default Header;
