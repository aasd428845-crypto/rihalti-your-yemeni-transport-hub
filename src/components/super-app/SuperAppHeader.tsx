import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { MapPin, ChevronDown, Search, Bell, ShoppingCart, X, ArrowRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import waslLogo from "@/assets/wasl-logo.png";

const DETAIL_PATHS = ["/restaurants/", "/trips/", "/checkout/", "/ride/", "/order/"];

const isDetailPage = (pathname: string) =>
  DETAIL_PATHS.some((p) => pathname.includes(p)) ||
  pathname === "/login" || pathname === "/register" ||
  pathname === "/forgot-password" || pathname === "/reset-password";

const SuperAppHeader = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [city, setCity] = useState("صنعاء");
  const [search, setSearch] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);
  const detail = isDetailPage(location.pathname);

  useEffect(() => {
    if (!user) return;

    // Load city from profile
    supabase
      .from("profiles")
      .select("city")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => { if (data?.city) setCity(data.city); });

    // Load initial unread count
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .is("read_at", null)
      .then(({ count }) => setUnreadCount(count || 0));

    // Realtime subscription for new notifications
    const channel = supabase
      .channel(`header-bell-${user.id}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${user.id}`,
      }, () => setUnreadCount(c => c + 1))
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim()) {
      navigate(`/restaurants?q=${encodeURIComponent(search.trim())}`);
      setSearch("");
    }
  };

  return (
    <header className="fixed top-0 right-0 left-0 z-50 bg-white dark:bg-background border-b border-border/30 shadow-[0_2px_16px_rgba(0,0,0,0.07)]" dir="rtl">
      <div className="px-4 pt-3 pb-2 max-w-2xl mx-auto">

        {detail ? (
          /* ── Detail Page: Back + Logo ──────────────── */
          <div className="flex items-center gap-3 h-12">
            <button
              data-testid="btn-back"
              onClick={() => navigate(-1)}
              className="p-2 rounded-xl bg-muted/60 hover:bg-muted transition-colors"
            >
              <ArrowRight className="w-5 h-5 text-foreground" />
            </button>
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-2"
            >
              <img src={waslLogo} alt="وصل" className="w-8 h-8 object-contain" />
              <span className="font-extrabold text-lg text-foreground">وصل</span>
            </button>
          </div>
        ) : (
          <>
            {/* ── Row 1: Logo + Location + Actions ──────── */}
            <div className="flex items-center gap-3 mb-2.5">

              {/* Wasl Logo */}
              <button onClick={() => navigate("/")} className="shrink-0">
                <img
                  src={waslLogo}
                  alt="وصل"
                  className="w-9 h-9 object-contain shadow-sm"
                />
              </button>

              {/* Location picker → navigates to /addresses */}
              <button
                data-testid="btn-location-picker"
                onClick={() => navigate("/addresses")}
                className="flex items-center gap-1.5 flex-1 group min-w-0"
              >
                <MapPin className="w-4 h-4 text-primary shrink-0" />
                <div className="text-right min-w-0">
                  <p className="text-[10px] text-muted-foreground leading-none mb-0.5">توصيل إلى</p>
                  <div className="flex items-center gap-0.5">
                    <span className="font-bold text-sm text-foreground truncate">{city}</span>
                    <ChevronDown className="w-3 h-3 text-muted-foreground shrink-0" />
                  </div>
                </div>
              </button>

              {/* Right actions */}
              <div className="flex items-center gap-0.5 shrink-0">
                {user ? (
                  <>
                    <button
                      data-testid="btn-cart-header"
                      onClick={() => navigate("/cart")}
                      className="relative p-2 rounded-xl hover:bg-muted/60 transition-colors"
                    >
                      <ShoppingCart className="w-5 h-5 text-foreground" />
                    </button>
                    <button
                      data-testid="btn-notifications-header"
                      onClick={() => { setUnreadCount(0); navigate("/notifications"); }}
                      className="relative p-2 rounded-xl hover:bg-muted/60 transition-colors"
                    >
                      <Bell className="w-5 h-5 text-foreground" />
                      {unreadCount > 0 && (
                        <span className="absolute top-1 right-1 min-w-[16px] h-4 px-0.5 bg-red-500 text-white text-[9px] rounded-full flex items-center justify-center font-bold animate-pulse">
                          {unreadCount > 9 ? "9+" : unreadCount}
                        </span>
                      )}
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => navigate("/login")}
                    className="text-xs font-bold text-primary px-3 py-1.5 rounded-xl bg-primary/10 hover:bg-primary/20 transition-colors"
                  >
                    دخول
                  </button>
                )}
              </div>
            </div>

            {/* ── Row 2: Search Bar ────────────────────── */}
            <form onSubmit={handleSearch} className="relative">
              <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <input
                data-testid="input-global-search"
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ابحث عن مطعم، متجر، وجهة..."
                className="w-full h-11 pr-10 pl-10 rounded-2xl bg-muted/50 border border-border/40 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all placeholder:text-muted-foreground"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </form>
          </>
        )}
      </div>
    </header>
  );
};

export default SuperAppHeader;
