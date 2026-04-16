import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Search, X, ArrowRight } from "lucide-react";
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
  const [search, setSearch] = useState("");
  const [firstName, setFirstName] = useState<string>("");
  const detail = isDetailPage(location.pathname);

  // Load user's first name for greeting
  useEffect(() => {
    if (!user) { setFirstName(""); return; }
    supabase
      .from("profiles")
      .select("full_name")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.full_name) {
          setFirstName(data.full_name.split(" ")[0]);
        }
      });
  }, [user?.id]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim()) {
      navigate(`/food?q=${encodeURIComponent(search.trim())}`);
      setSearch("");
    }
  };

  return (
    <header className="fixed top-0 right-0 left-0 z-50 bg-white dark:bg-background border-b border-border/30 shadow-[0_2px_16px_rgba(0,0,0,0.07)]" dir="rtl">
      <div className="px-4 pt-2.5 pb-2.5 max-w-2xl mx-auto">

        {detail ? (
          /* ── Detail Page: Back + Logo ── */
          <div className="flex items-center gap-3 h-12">
            <button
              data-testid="btn-back"
              onClick={() => navigate(-1)}
              className="p-2 rounded-xl bg-muted/60 hover:bg-muted transition-colors"
            >
              <ArrowRight className="w-5 h-5 text-foreground" />
            </button>
            <button onClick={() => navigate("/")} className="flex items-center gap-2">
              <img src={waslLogo} alt="وصل" className="w-8 h-8 object-contain" />
              <span className="font-extrabold text-lg text-foreground">وصل</span>
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {/* ── Greeting row (only for logged-in users) ── */}
            {user && firstName && (
              <p className="text-sm font-semibold text-foreground">
                مرحباً، <span className="text-primary">{firstName}</span> 👋
              </p>
            )}
            {user && !firstName && (
              <p className="text-sm font-semibold text-foreground">
                مرحباً 👋
              </p>
            )}

            {/* ── Search Bar ── */}
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
          </div>
        )}
      </div>
    </header>
  );
};

export default SuperAppHeader;
