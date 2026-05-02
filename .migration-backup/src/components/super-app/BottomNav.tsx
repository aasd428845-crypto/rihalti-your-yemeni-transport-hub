import { useNavigate, useLocation } from "react-router-dom";
import { Package, Bell, User, MoreHorizontal, ShoppingCart } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import waslLogo from "@/assets/wasl-logo.png";

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  const isActive = (paths: string[]) =>
    paths.some((p) => location.pathname === p || location.pathname.startsWith(p + "/"));

  // Load unread notification count
  useEffect(() => {
    if (!user) return;

    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .is("read_at", null)
      .then(({ count }) => setUnreadCount(count || 0));

    const channel = supabase
      .channel(`bottom-nav-bell-${user.id}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${user.id}`,
      }, () => setUnreadCount(c => c + 1))
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

  const sideTabClass = (active: boolean) =>
    `flex flex-col items-center gap-1 px-2 py-1.5 rounded-2xl transition-all duration-200 min-w-[52px] ${
      active ? "text-primary" : "text-muted-foreground hover:text-foreground"
    }`;

  return (
    <nav
      className="fixed bottom-0 right-0 left-0 z-40"
      dir="rtl"
      style={{ filter: "drop-shadow(0 -2px 16px rgba(0,0,0,0.10))" }}
    >
      <div className="bg-white dark:bg-background border-t-2 border-border/30">
        <div className="flex items-center justify-around max-w-2xl mx-auto px-3 pb-[env(safe-area-inset-bottom,6px)]" style={{ height: 62 }}>

          {/* Cart (rightmost — was Home position) */}
          <button
            data-testid="bottom-nav-cart"
            onClick={() => navigate("/cart")}
            className={sideTabClass(isActive(["/cart"]))}
          >
            <div className={`w-8 h-8 flex items-center justify-center rounded-2xl transition-all ${isActive(["/cart"]) ? "bg-primary/10 scale-110" : ""}`}>
              <ShoppingCart className={`w-5 h-5 ${isActive(["/cart"]) ? "text-primary" : ""}`} />
            </div>
            <span className="text-[10px] font-semibold leading-none">السلة</span>
          </button>

          {/* Orders */}
          <button
            data-testid="bottom-nav-orders"
            onClick={() => navigate("/history")}
            className={sideTabClass(isActive(["/history", "/deliveries"]))}
          >
            <div className={`w-8 h-8 flex items-center justify-center rounded-2xl transition-all ${isActive(["/history", "/deliveries"]) ? "bg-primary/10 scale-110" : ""}`}>
              <Package className={`w-5 h-5 ${isActive(["/history", "/deliveries"]) ? "text-primary" : ""}`} />
            </div>
            <span className="text-[10px] font-semibold leading-none">طلباتي</span>
          </button>

          {/* CENTER: Home — floating raised button (was Offers position) */}
          <div className="flex flex-col items-center relative" style={{ marginTop: -24 }}>
            <button
              data-testid="bottom-nav-home"
              onClick={() => navigate("/")}
              className={`w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-all duration-200 active:scale-95 ${
                location.pathname === "/"
                  ? "bg-primary scale-105 shadow-primary/40"
                  : "bg-primary hover:bg-primary/90 shadow-primary/30"
              }`}
            >
              <img src={waslLogo} alt="وصل" className="w-8 h-8 object-contain" style={{ filter: "brightness(0) invert(1)" }} />
            </button>
            <span className={`text-[10px] font-bold mt-1 leading-none ${location.pathname === "/" ? "text-primary" : "text-muted-foreground"}`}>
              الرئيسية
            </span>
          </div>

          {/* Bell (was Wallet position) */}
          <button
            data-testid="bottom-nav-bell"
            onClick={() => { setUnreadCount(0); navigate("/notifications"); }}
            className={sideTabClass(isActive(["/notifications"]))}
          >
            <div className={`relative w-8 h-8 flex items-center justify-center rounded-2xl transition-all ${isActive(["/notifications"]) ? "bg-primary/10 scale-110" : ""}`}>
              <Bell className={`w-5 h-5 ${isActive(["/notifications"]) ? "text-primary" : ""}`} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-0.5 bg-red-500 text-white text-[9px] rounded-full flex items-center justify-center font-bold animate-pulse">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </div>
            <span className="text-[10px] font-semibold leading-none">الإشعارات</span>
          </button>

          {/* More / Account */}
          <button
            data-testid="bottom-nav-more"
            onClick={() => navigate("/more")}
            className={sideTabClass(isActive(["/more", "/account", "/addresses"]))}
          >
            <div className={`w-8 h-8 flex items-center justify-center rounded-2xl transition-all ${isActive(["/more", "/account"]) ? "bg-primary/10 scale-110" : ""}`}>
              {user
                ? <User className={`w-5 h-5 ${isActive(["/more", "/account"]) ? "text-primary" : ""}`} />
                : <MoreHorizontal className="w-5 h-5" />
              }
            </div>
            <span className={`text-[10px] font-semibold leading-none max-w-[48px] truncate ${isActive(["/more", "/account"]) ? "text-primary" : ""}`}>
              {user ? (profile?.full_name?.split(" ")[0] || "حسابي") : "المزيد"}
            </span>
          </button>

        </div>
      </div>
    </nav>
  );
};

export default BottomNav;
