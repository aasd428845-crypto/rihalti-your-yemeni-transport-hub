import { useNavigate } from "react-router-dom";
import {
  MessageCircle, Settings, FileText, Shield, Info, LogOut, LogIn,
  UserPlus, ChevronLeft, Phone, Star, MapPin, Package, Bell
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import SupportChatWidget from "@/components/support/SupportChatWidget";

const MorePage = () => {
  const navigate = useNavigate();
  const { user, profile, role, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const getDashboardPath = () => {
    if (role === "supplier") return "/supplier";
    if (role === "delivery_company") return "/delivery";
    if (role === "admin") return "/admin";
    if (role === "driver") return "/driver";
    if (role === "delivery_driver") return "/delivery-driver";
    return null;
  };

  const dashboardPath = getDashboardPath();

  const menuSections = [
    {
      title: "حسابي",
      items: [
        { icon: MapPin, label: "عناويني", desc: "عناوين التوصيل المحفوظة", action: () => navigate("/addresses"), color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-950/30" },
        { icon: Package, label: "سجل الطلبات", desc: "جميع طلباتك ورحلاتك", action: () => navigate("/history"), color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-50 dark:bg-purple-950/30" },
        { icon: Bell, label: "الإشعارات", desc: "إدارة إشعاراتك", action: () => navigate("/notifications"), color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-950/30" },
        { icon: Settings, label: "الإعدادات", desc: "إعدادات الحساب", action: () => navigate("/account"), color: "text-gray-600 dark:text-gray-400", bg: "bg-gray-100 dark:bg-gray-800/50" },
      ],
    },
    {
      title: "قانوني",
      items: [
        { icon: FileText, label: "الشروط والأحكام", desc: "شروط استخدام وصل", action: () => navigate("/terms"), color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-50 dark:bg-orange-950/30" },
        { icon: Shield, label: "سياسة الخصوصية", desc: "كيف نحمي بياناتك", action: () => navigate("/privacy"), color: "text-teal-600 dark:text-teal-400", bg: "bg-teal-50 dark:bg-teal-950/30" },
        { icon: Info, label: "عن وصل", desc: "تعرف على منصة وصل", action: () => navigate("/about"), color: "text-primary", bg: "bg-primary/10" },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">

        {/* ── Profile Card ───────────────────────────────────── */}
        {user ? (
          <div className="rounded-3xl bg-gradient-to-bl from-primary via-primary/90 to-primary/70 p-6 text-white shadow-xl relative overflow-hidden">
            <div className="absolute top-[-40px] left-[-40px] w-[160px] h-[160px] rounded-full bg-white/10 blur-2xl pointer-events-none" />
            <div className="flex items-center gap-4 relative">
              <Avatar className="w-20 h-20 border-4 border-white/30 shadow-lg">
                <AvatarImage src={profile?.avatar_url || ""} />
                <AvatarFallback className="bg-white/20 text-white font-black text-2xl">
                  {profile?.full_name?.[0] || user.email?.[0]?.toUpperCase() || "؟"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <h2 className="font-black text-xl truncate">{profile?.full_name || "مستخدم وصل"}</h2>
                <p className="text-white/70 text-sm truncate mt-0.5">{user.email}</p>
                {role && (
                  <Badge className="mt-2 bg-white/20 text-white border-white/30 backdrop-blur-sm text-xs font-bold">
                    {role === "customer" ? "عميل" : role === "admin" ? "مشرف" : role === "supplier" ? "شريك نقل" : role === "delivery_company" ? "شركة توصيل" : role === "driver" ? "سائق" : "سائق توصيل"}
                  </Badge>
                )}
              </div>
              <button
                onClick={() => navigate("/account")}
                className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
              >
                <Settings className="w-5 h-5 text-white" />
              </button>
            </div>

            {/* Dashboard shortcut */}
            {dashboardPath && (
              <button
                onClick={() => navigate(dashboardPath)}
                className="mt-4 w-full flex items-center gap-2 bg-white/15 hover:bg-white/25 transition-colors rounded-2xl px-4 py-3 border border-white/20"
              >
                <Star className="w-5 h-5" />
                <span className="font-semibold text-sm flex-1 text-right">لوحة تحكم الشريك</span>
                <ChevronLeft className="w-4 h-4 opacity-70" />
              </button>
            )}
          </div>
        ) : (
          /* Guest state */
          <div className="rounded-3xl bg-gradient-to-bl from-primary/10 to-primary/5 border border-primary/20 p-6">
            <h2 className="font-black text-xl text-foreground mb-1">أهلاً بك في وصل</h2>
            <p className="text-muted-foreground text-sm mb-4">سجّل دخولك للوصول إلى حسابك وطلباتك</p>
            <div className="flex gap-3">
              <Button className="flex-1 gap-2 bg-primary text-primary-foreground hover:opacity-90" onClick={() => navigate("/login")}>
                <LogIn className="w-4 h-4" />تسجيل الدخول
              </Button>
              <Button variant="outline" className="flex-1 gap-2 border-primary/40 text-primary" onClick={() => navigate("/register")}>
                <UserPlus className="w-4 h-4" />إنشاء حساب
              </Button>
            </div>
          </div>
        )}

        {/* ── Customer Service (Live Chat) ────────────────────── */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-xl bg-green-500/10 flex items-center justify-center">
              <MessageCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="font-black text-base text-foreground">خدمة العملاء</h3>
          </div>
          <SupportChatWidget inline />
        </div>

        {/* ── WhatsApp ───────────────────────────────────────── */}
        <a
          href="https://wa.me/967712345678"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-4 p-4 rounded-2xl bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-950/50 transition-colors"
        >
          <div className="w-12 h-12 rounded-2xl bg-green-500 flex items-center justify-center shadow-md">
            <Phone className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1 text-right">
            <p className="font-bold text-green-700 dark:text-green-400">واتساب الدعم</p>
            <p className="text-sm text-muted-foreground">+967 712 345 678</p>
          </div>
          <ChevronLeft className="w-4 h-4 text-muted-foreground" />
        </a>

        {/* ── Menu Sections ──────────────────────────────────── */}
        {menuSections.map((section) => (
          <div key={section.title}>
            <h3 className="font-black text-sm text-muted-foreground uppercase tracking-wider mb-3 px-1">{section.title}</h3>
            <div className="bg-card rounded-2xl border border-border/40 shadow-sm overflow-hidden divide-y divide-border/30">
              {section.items.map((item) => (
                <button
                  key={item.label}
                  data-testid={`more-page-item-${item.label}`}
                  onClick={item.action}
                  className="w-full flex items-center gap-4 px-4 py-4 hover:bg-muted/40 transition-colors group text-right"
                >
                  <div className={`w-10 h-10 rounded-xl ${item.bg} flex items-center justify-center shrink-0`}>
                    <item.icon className={`w-5 h-5 ${item.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-foreground">{item.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                  </div>
                  <ChevronLeft className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
                </button>
              ))}
            </div>
          </div>
        ))}

        {/* ── Sign Out ───────────────────────────────────────── */}
        {user && (
          <button
            data-testid="btn-signout-more"
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 p-4 rounded-2xl text-destructive hover:bg-destructive/10 transition-colors font-bold text-sm border border-destructive/20"
          >
            <LogOut className="w-4 h-4" />تسجيل الخروج
          </button>
        )}

        <p className="text-center text-xs text-muted-foreground/40 pb-2">وصل v2.0 • منصة النقل الذكية 🇾🇪</p>
      </div>
    </div>
  );
};

export default MorePage;
