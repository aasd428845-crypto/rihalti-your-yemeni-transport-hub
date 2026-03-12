import { useNavigate, useLocation } from "react-router-dom";
import { Package, Tag, Wallet, User, MoreHorizontal } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import waslLogo from "@/assets/wasl-logo.png";

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile } = useAuth();

  const isActive = (paths: string[]) =>
    paths.some((p) => location.pathname === p || location.pathname.startsWith(p + "/"));

  const tabs = [
    {
      id: "home",
      label: "الرئيسية",
      icon: null,
      isLogo: true,
      paths: ["/"],
      action: () => navigate("/"),
    },
    {
      id: "orders",
      label: "طلباتي",
      icon: Package,
      paths: ["/history", "/deliveries", "/order"],
      action: () => navigate("/history"),
    },
    {
      id: "offers",
      label: "العروض",
      icon: Tag,
      paths: ["/restaurants"],
      action: () => navigate("/restaurants?tab=restaurants"),
    },
    {
      id: "wallet",
      label: "المحفظة",
      icon: Wallet,
      paths: ["/wallet"],
      action: () => navigate("/history"),
    },
    {
      id: "more",
      label: user ? (profile?.full_name?.split(" ")[0] || "حسابي") : "المزيد",
      icon: user ? User : MoreHorizontal,
      paths: ["/more", "/account", "/addresses", "/notifications"],
      action: () => navigate("/more"),
    },
  ];

  return (
    <nav
      className="fixed bottom-0 right-0 left-0 z-40 bg-background/97 backdrop-blur-xl border-t border-border/40 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]"
      dir="rtl"
    >
      <div className="flex items-center justify-around px-2 py-2 max-w-2xl mx-auto pb-[env(safe-area-inset-bottom,8px)]">
        {tabs.map((tab) => {
          const active =
            tab.id === "home"
              ? location.pathname === "/"
              : isActive(tab.paths);

          return (
            <button
              key={tab.id}
              data-testid={`bottom-nav-${tab.id}`}
              onClick={tab.action}
              className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-2xl transition-all duration-200 min-w-[56px] ${
                active ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.isLogo ? (
                <div className={`w-9 h-9 rounded-xl overflow-hidden shadow-sm transition-all duration-200 ${active ? "scale-110 shadow-primary/30" : ""}`}>
                  <img src={waslLogo} alt="وصل" className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className={`relative w-9 h-9 flex items-center justify-center rounded-2xl transition-all duration-200 ${active ? "bg-primary/10 scale-110" : ""}`}>
                  {tab.icon && (
                    <tab.icon className={`w-5 h-5 transition-colors duration-200 ${active ? "text-primary" : ""}`} />
                  )}
                  {active && (
                    <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-primary rounded-full" />
                  )}
                </div>
              )}
              <span className={`text-[10px] font-semibold leading-none transition-colors duration-200 ${active ? "text-primary" : ""} max-w-[52px] truncate`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
