import { useNavigate } from "react-router-dom";
import {
  MessageCircle, Settings, FileText, Shield, Info, LogOut, LogIn,
  UserPlus, ChevronLeft, User, Phone, X, Star, MapPin, Package
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

interface MoreSheetProps {
  open: boolean;
  onClose: () => void;
  onOpenChat: () => void;
}

const menuItems = [
  { icon: MessageCircle, label: "خدمة العملاء والدعم", desc: "تواصل مع فريقنا مباشرة", action: "chat", color: "text-green-600 dark:text-green-400", bg: "bg-green-50 dark:bg-green-950/30" },
  { icon: MapPin, label: "عناويني", desc: "إدارة عناوين التوصيل", action: "addresses", color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-950/30" },
  { icon: Package, label: "سجل الطلبات", desc: "جميع طلباتك السابقة", action: "history", color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-50 dark:bg-purple-950/30" },
  { icon: Settings, label: "الإعدادات", desc: "إعدادات الحساب والتطبيق", action: "account", color: "text-gray-600 dark:text-gray-400", bg: "bg-gray-50 dark:bg-gray-900/50" },
  { icon: FileText, label: "الشروط والأحكام", desc: "اقرأ شروط استخدام المنصة", action: "terms", color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-50 dark:bg-orange-950/30" },
  { icon: Shield, label: "سياسة الخصوصية", desc: "كيف نحمي بياناتك", action: "privacy", color: "text-teal-600 dark:text-teal-400", bg: "bg-teal-50 dark:bg-teal-950/30" },
  { icon: Info, label: "عن وصل", desc: "تعرف على منصة وصل", action: "about", color: "text-primary", bg: "bg-primary/10" },
];

const MoreSheet = ({ open, onClose, onOpenChat }: MoreSheetProps) => {
  const navigate = useNavigate();
  const { user, profile, role, signOut } = useAuth();

  const handleAction = (action: string) => {
    onClose();
    switch (action) {
      case "chat": onOpenChat(); break;
      case "addresses": navigate("/addresses"); break;
      case "history": navigate("/history"); break;
      case "account": navigate("/account"); break;
      case "terms": navigate("/terms"); break;
      case "privacy": navigate("/privacy"); break;
      case "about": navigate("/about"); break;
    }
  };

  const handleSignOut = async () => {
    onClose();
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

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className="fixed bottom-0 right-0 left-0 z-50 bg-background rounded-t-3xl shadow-2xl border-t border-border/40 max-h-[90vh] overflow-y-auto"
        dir="rtl"
        style={{ animation: "slideUp 0.3s cubic-bezier(0.32, 0.72, 0, 1)" }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-border rounded-full" />
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 left-4 p-1.5 rounded-xl bg-muted/60 hover:bg-muted transition-colors"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>

        <div className="px-5 pb-8 pt-2">
          {/* Profile Section */}
          {user ? (
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-l from-primary/10 to-primary/5 border border-primary/20 mb-5">
              <Avatar className="w-14 h-14 border-2 border-primary/30">
                <AvatarImage src={profile?.avatar_url || ""} />
                <AvatarFallback className="bg-primary/20 text-primary font-bold text-lg">
                  {profile?.full_name?.[0] || user.email?.[0]?.toUpperCase() || "؟"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-base text-foreground truncate">
                  {profile?.full_name || "مستخدم وصل"}
                </h3>
                <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                {role && (
                  <Badge variant="secondary" className="mt-1 text-xs font-semibold">
                    {role === "customer" ? "عميل" : role === "admin" ? "مشرف" : role === "supplier" ? "شريك نقل" : role === "delivery_company" ? "شركة توصيل" : role === "driver" ? "سائق" : "سائق توصيل"}
                  </Badge>
                )}
              </div>
              <button
                onClick={() => { onClose(); navigate("/account"); }}
                className="p-2 rounded-xl bg-primary/10 hover:bg-primary/20 transition-colors shrink-0"
              >
                <ChevronLeft className="w-5 h-5 text-primary" />
              </button>
            </div>
          ) : (
            <div className="flex gap-3 mb-5">
              <Button
                className="flex-1 gap-2 bg-primary text-primary-foreground hover:opacity-90"
                onClick={() => { onClose(); navigate("/login"); }}
              >
                <LogIn className="w-4 h-4" />تسجيل الدخول
              </Button>
              <Button
                variant="outline"
                className="flex-1 gap-2 border-primary/40 text-primary"
                onClick={() => { onClose(); navigate("/register"); }}
              >
                <UserPlus className="w-4 h-4" />إنشاء حساب
              </Button>
            </div>
          )}

          {/* Dashboard Link */}
          {dashboardPath && (
            <button
              onClick={() => { onClose(); navigate(dashboardPath); }}
              className="w-full flex items-center gap-3 p-4 rounded-2xl bg-accent/10 border border-accent/20 hover:bg-accent/20 transition-colors mb-3"
            >
              <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center">
                <Star className="w-5 h-5 text-accent" />
              </div>
              <div className="text-right flex-1">
                <p className="font-semibold text-sm text-foreground">لوحة التحكم</p>
                <p className="text-xs text-muted-foreground">إدارة خدماتك وأعمالك</p>
              </div>
              <ChevronLeft className="w-4 h-4 text-muted-foreground" />
            </button>
          )}

          {/* Menu Items */}
          <div className="space-y-2">
            {menuItems.map((item) => (
              <button
                key={item.action}
                data-testid={`more-item-${item.action}`}
                onClick={() => handleAction(item.action)}
                className="w-full flex items-center gap-3 p-4 rounded-2xl hover:bg-muted/50 transition-colors group"
              >
                <div className={`w-10 h-10 rounded-xl ${item.bg} flex items-center justify-center shrink-0`}>
                  <item.icon className={`w-5 h-5 ${item.color}`} />
                </div>
                <div className="text-right flex-1 min-w-0">
                  <p className="font-semibold text-sm text-foreground">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
                <ChevronLeft className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
              </button>
            ))}
          </div>

          {/* WhatsApp support */}
          <a
            href="https://wa.me/967712345678"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-4 rounded-2xl bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-950/50 transition-colors mt-2 w-full"
          >
            <div className="w-10 h-10 rounded-xl bg-green-500 flex items-center justify-center shrink-0">
              <Phone className="w-5 h-5 text-white" />
            </div>
            <div className="text-right flex-1">
              <p className="font-semibold text-sm text-green-700 dark:text-green-400">واتساب الدعم</p>
              <p className="text-xs text-muted-foreground">967 712 345 678+</p>
            </div>
          </a>

          {/* Sign Out */}
          {user && (
            <button
              data-testid="btn-signout"
              onClick={handleSignOut}
              className="w-full flex items-center justify-center gap-2 p-4 rounded-2xl text-destructive hover:bg-destructive/10 transition-colors mt-3 font-semibold text-sm border border-destructive/20"
            >
              <LogOut className="w-4 h-4" />تسجيل الخروج
            </button>
          )}

          {/* Version */}
          <p className="text-center text-xs text-muted-foreground/50 mt-5">وصل v2.0 • منصة النقل الذكية</p>
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>
    </>
  );
};

export default MoreSheet;
