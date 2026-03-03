import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Menu, X, Bus, Shield, User, LogOut, LayoutDashboard, MapPin, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const navLinks = [
  { label: "الرحلات", href: "/trips" },
  { label: "الشحنات", href: "/shipments" },
  { label: "التوصيل", href: "/deliveries" },
  { label: "تتبع الشحنة", href: "/tracking" },
  { label: "عن المنصة", href: "/about" },
];

const Header = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const { user, role, profile, signOut, loading } = useAuth();
  const navigate = useNavigate();

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
    if (role === "supplier") return "لوحة تحكم المورد";
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
    <header className="fixed top-0 right-0 left-0 z-50 glass border-b border-border/50">
      <div className="container mx-auto px-4 flex items-center justify-between h-16">
        <a href="/" onClick={(e) => { e.preventDefault(); navigate("/"); }} className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-hero-gradient flex items-center justify-center">
            <Bus className="w-5 h-5 text-primary-foreground" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold text-foreground leading-tight">رحلاتي</span>
            <span className="text-[10px] text-muted-foreground leading-tight">المنصة اليمنية للنقل</span>
          </div>
        </a>

        <nav className="hidden lg:flex items-center gap-1">
          {navLinks.map((link) => (
            <button key={link.href} onClick={() => handleNavClick(link.href)} className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors rounded-lg hover:bg-accent">
              {link.label}
            </button>
          ))}
          {user && (
            <>
              <button onClick={() => navigate("/history")} className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors rounded-lg hover:bg-accent">السجل</button>
              <button onClick={() => navigate("/addresses")} className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors rounded-lg hover:bg-accent">
                <MapPin className="w-4 h-4 inline ml-1" />عناويني
              </button>
            </>
          )}
        </nav>

        <div className="hidden lg:flex items-center gap-2">
          {loading ? (
            <div className="w-20 h-9 rounded-lg bg-muted animate-pulse" />
          ) : user ? (
            <>
              {/* Notifications */}
              <button onClick={() => navigate("/history")} className="relative p-2 rounded-lg hover:bg-accent transition-colors" title="الإشعارات">
                <Bell className="w-5 h-5 text-muted-foreground" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-destructive text-destructive-foreground text-[10px] rounded-full flex items-center justify-center font-bold">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>

              {dashboardLabel && dashboardPath && (
                <Button variant="outline" size="sm" onClick={() => navigate(dashboardPath)} className="gap-1">
                  <LayoutDashboard className="w-4 h-4" />{dashboardLabel}
                </Button>
              )}
              <button onClick={() => navigate("/account")} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-accent hover:bg-accent/80 transition-colors">
                <User className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-foreground">{profile?.full_name || user.email}</span>
              </button>
              <Button variant="ghost" size="sm" onClick={handleSignOut} className="text-muted-foreground gap-1">
                <LogOut className="w-4 h-4" />خروج
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => navigate("/login")}>تسجيل الدخول</Button>
              <Button size="sm" className="bg-hero-gradient text-primary-foreground hover:opacity-90 shadow-primary" onClick={() => navigate("/register")}>إنشاء حساب</Button>
            </>
          )}
          <button onClick={() => navigate("/login")} className="p-2 rounded-lg hover:bg-accent transition-colors" title="لوحة تحكم المشرف">
            <Shield className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <button onClick={() => setMobileOpen(!mobileOpen)} className="lg:hidden p-2 rounded-lg hover:bg-accent transition-colors">
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="lg:hidden glass border-t border-border/50 animate-fade-in">
          <nav className="container mx-auto px-4 py-4 flex flex-col gap-1">
            <div className="flex justify-end mb-2">
              <button onClick={() => setMobileOpen(false)} className="p-2 rounded-lg hover:bg-accent transition-colors">
                <X className="w-5 h-5 text-foreground" />
              </button>
            </div>
            {navLinks.map((link) => (
              <button key={link.href} onClick={() => handleNavClick(link.href)} className="px-4 py-3 text-sm font-medium text-foreground hover:bg-accent rounded-lg transition-colors text-right">{link.label}</button>
            ))}
            {user && (
              <>
                <button onClick={() => handleNavClick("/history")} className="px-4 py-3 text-sm font-medium text-foreground hover:bg-accent rounded-lg transition-colors text-right">السجل</button>
                <button onClick={() => handleNavClick("/addresses")} className="px-4 py-3 text-sm font-medium text-foreground hover:bg-accent rounded-lg transition-colors text-right">عناويني</button>
                <button onClick={() => handleNavClick("/account")} className="px-4 py-3 text-sm font-medium text-foreground hover:bg-accent rounded-lg transition-colors text-right">حسابي</button>
                <button onClick={() => handleNavClick("/contact")} className="px-4 py-3 text-sm font-medium text-foreground hover:bg-accent rounded-lg transition-colors text-right">تواصل معنا</button>
              </>
            )}
            {user && dashboardLabel && dashboardPath && (
              <button onClick={() => handleNavClick(dashboardPath)} className="px-4 py-3 text-sm font-medium text-primary hover:bg-accent rounded-lg transition-colors text-right flex items-center gap-2">
                <LayoutDashboard className="w-4 h-4" />{dashboardLabel}
              </button>
            )}
            <div className="border-t border-border mt-2 pt-3 flex flex-col gap-2">
              {user ? (
                <>
                  <div className="px-4 py-2 text-sm text-muted-foreground">{profile?.full_name || user.email}</div>
                  <Button variant="outline" size="sm" className="w-full" onClick={() => { handleSignOut(); setMobileOpen(false); }}>تسجيل الخروج</Button>
                </>
              ) : (
                <>
                  <Button variant="outline" size="sm" className="w-full" onClick={() => handleNavClick("/login")}>تسجيل الدخول</Button>
                  <Button size="sm" className="w-full bg-hero-gradient text-primary-foreground" onClick={() => handleNavClick("/register")}>إنشاء حساب</Button>
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
