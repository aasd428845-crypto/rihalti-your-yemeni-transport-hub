import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { MapPin, ChevronDown, Search, Bell, ShoppingCart, X, ArrowRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import waslLogo from "@/assets/wasl-logo.png";

const CITIES = ["صنعاء", "عدن", "تعز", "المكلا", "إب", "الحديدة", "ذمار", "سيئون", "مأرب", "حجة"];

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
  const [cityOpen, setCityOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);
  const cityRef = useRef<HTMLDivElement>(null);
  const detail = isDetailPage(location.pathname);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("city")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => { if (data?.city) setCity(data.city); });
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .is("read_at", null)
      .then(({ count }) => setUnreadCount(count || 0));
  }, [user]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (cityRef.current && !cityRef.current.contains(e.target as Node)) setCityOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim()) {
      navigate(`/restaurants?q=${encodeURIComponent(search.trim())}`);
      setSearch("");
    }
  };

  return (
    <header className="fixed top-0 right-0 left-0 z-50 bg-background/97 backdrop-blur-xl border-b border-border/40 shadow-sm" dir="rtl">
      <div className="px-4 pt-3 pb-2 max-w-2xl mx-auto">

        {detail ? (
          /* ── Detail Page: Back + Title ─────────────── */
          <div className="flex items-center gap-3 h-12">
            <button
              data-testid="btn-back"
              onClick={() => navigate(-1)}
              className="p-2 rounded-xl bg-muted/60 hover:bg-muted transition-colors"
            >
              <ArrowRight className="w-5 h-5 text-foreground" />
            </button>
            <a
              href="/"
              onClick={(e) => { e.preventDefault(); navigate("/"); }}
              className="flex items-center gap-2"
            >
              <img src={waslLogo} alt="وصل" className="w-8 h-8 rounded-lg object-cover" />
              <span className="font-extrabold text-lg text-foreground">وصل</span>
            </a>
          </div>
        ) : (
          <>
            {/* ── Row 1: Location + Actions ──────────────── */}
            <div className="flex items-center justify-between mb-2.5">
              {/* Location picker */}
              <div ref={cityRef} className="relative">
                <button
                  data-testid="btn-location-picker"
                  onClick={() => setCityOpen(!cityOpen)}
                  className="flex items-center gap-1.5 group"
                >
                  <MapPin className="w-4 h-4 text-primary" />
                  <div className="text-right">
                    <p className="text-[10px] text-muted-foreground leading-none mb-0.5">توصيل إلى</p>
                    <div className="flex items-center gap-1">
                      <span className="font-bold text-sm text-foreground">{city}</span>
                      <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform duration-200 ${cityOpen ? "rotate-180" : ""}`} />
                    </div>
                  </div>
                </button>
                {cityOpen && (
                  <div className="absolute top-full right-0 mt-2 bg-card border border-border rounded-2xl shadow-xl z-50 py-2 min-w-[160px]">
                    {CITIES.map((c) => (
                      <button
                        key={c}
                        className={`w-full text-right px-4 py-2.5 text-sm hover:bg-muted/60 transition-colors ${city === c ? "font-bold text-primary" : "text-foreground"}`}
                        onClick={() => { setCity(c); setCityOpen(false); }}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Right actions */}
              <div className="flex items-center gap-1">
                <a
                  href="/"
                  onClick={(e) => { e.preventDefault(); navigate("/"); }}
                  className="w-9 h-9 flex items-center justify-center"
                >
                  <img src={waslLogo} alt="وصل" className="w-8 h-8 rounded-xl object-cover shadow-sm" />
                </a>
                {user && (
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
                      onClick={() => navigate("/notifications")}
                      className="relative p-2 rounded-xl hover:bg-muted/60 transition-colors"
                    >
                      <Bell className="w-5 h-5 text-foreground" />
                      {unreadCount > 0 && (
                        <span className="absolute top-1 right-1 w-4 h-4 bg-destructive text-destructive-foreground text-[9px] rounded-full flex items-center justify-center font-bold">
                          {unreadCount > 9 ? "9+" : unreadCount}
                        </span>
                      )}
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* ── Row 2: Search Bar ──────────────────────── */}
            <form onSubmit={handleSearch} className="relative">
              <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-muted-foreground pointer-events-none" />
              <input
                data-testid="input-global-search"
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ابحث عن مطعم، متجر، وجهة..."
                className="w-full h-11 pr-10 pl-10 rounded-2xl bg-muted/60 border border-border/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all placeholder:text-muted-foreground"
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
