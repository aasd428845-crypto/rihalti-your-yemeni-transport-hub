import { useNavigate, useLocation } from "react-router-dom";
import { Package, Wallet, User, MoreHorizontal } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import waslLogo from "@/assets/wasl-logo.png";

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile } = useAuth();

  const isActive = (paths: string[]) =>
    paths.some((p) => location.pathname === p || location.pathname.startsWith(p + "/"));

  const offersActive = isActive(["/restaurants"]);

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
      {/* White bar */}
      <div className="bg-white dark:bg-background border-t-2 border-border/30">
        <div className="flex items-center justify-around max-w-2xl mx-auto px-3 pb-[env(safe-area-inset-bottom,6px)]" style={{ height: 62 }}>

          {/* Home (Wasl Logo) */}
          <button
            data-testid="bottom-nav-home"
            onClick={() => navigate("/")}
            className={sideTabClass(location.pathname === "/")}
          >
            <div className={`w-8 h-8 transition-all ${location.pathname === "/" ? "scale-110" : ""}`}>
              <img src={waslLogo} alt="وصل" className="w-full h-full object-contain" />
            </div>
            <span className={`text-[10px] font-semibold leading-none ${location.pathname === "/" ? "text-primary" : ""}`}>
              الرئيسية
            </span>
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

          {/* CENTER: Offers — floating raised button */}
          <div className="flex flex-col items-center relative" style={{ marginTop: -24 }}>
            <button
              data-testid="bottom-nav-offers"
              onClick={() => navigate("/restaurants")}
              className={`w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-all duration-200 active:scale-95 ${
                offersActive
                  ? "bg-primary scale-105 shadow-primary/40"
                  : "bg-primary hover:bg-primary/90 shadow-primary/30"
              }`}
            >
              {/* Delivery bag icon */}
              <svg viewBox="0 0 24 24" fill="none" className="w-7 h-7 text-white" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <path d="M16 10a4 4 0 0 1-8 0" />
              </svg>
            </button>
            <span className={`text-[10px] font-bold mt-1 leading-none ${offersActive ? "text-primary" : "text-muted-foreground"}`}>
              العروض
            </span>
          </div>

          {/* Wallet */}
          <button
            data-testid="bottom-nav-wallet"
            onClick={() => navigate("/history")}
            className={sideTabClass(isActive(["/wallet"]))}
          >
            <div className={`w-8 h-8 flex items-center justify-center rounded-2xl transition-all ${isActive(["/wallet"]) ? "bg-primary/10 scale-110" : ""}`}>
              <Wallet className={`w-5 h-5 ${isActive(["/wallet"]) ? "text-primary" : ""}`} />
            </div>
            <span className="text-[10px] font-semibold leading-none">المحفظة</span>
          </button>

          {/* More */}
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
