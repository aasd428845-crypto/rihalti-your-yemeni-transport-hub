import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import scooterImg from "@/assets/wasl-logo.png";

const DEFAULT_BANNER = {
  title: "توصيل سريع",
  subtitle: "وصّل طلبك خلال 30 دقيقة أو أقل إلى باب منزلك",
  cta: "اطلب الآن",
  image_url: "",
};

const DeliveryRequestBanner = () => {
  const navigate = useNavigate();
  const [banner, setBanner] = useState<any>(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    supabase
      .from("delivery_banners" as any)
      .select("*")
      .eq("is_active", true)
      .eq("banner_type", "delivery_request")
      .order("sort_order")
      .limit(1)
      .then(({ data, error }) => {
        if (error) {
          // Show default if DB call fails
          setBanner(DEFAULT_BANNER);
          return;
        }
        // If admin has any banners but explicitly removed delivery_request,
        // hide this banner. Only fall back to default for brand-new installs.
        supabase
          .from("delivery_banners" as any)
          .select("id", { count: "exact", head: true })
          .then(({ count }) => {
            if (data && data[0]) {
              setBanner(data[0]);
            } else if ((count || 0) > 0) {
              setHidden(true);
            } else {
              setBanner(DEFAULT_BANNER);
            }
          });
      });
  }, []);

  if (hidden || !banner) return null;

  const title = banner.title || DEFAULT_BANNER.title;
  const subtitle = banner.subtitle || DEFAULT_BANNER.subtitle;
  const cta = banner.badge_text || DEFAULT_BANNER.cta;
  const img = banner.image_url || scooterImg;

  return (
    <button
      onClick={() => navigate(banner.link_url || "/delivery-request")}
      className="relative w-full bg-gradient-to-l from-emerald-50 via-emerald-50 to-green-100 dark:from-emerald-950/40 dark:to-green-900/40 border border-emerald-200/70 dark:border-emerald-800/40 rounded-xl p-2.5 flex items-center gap-2 text-right hover:shadow-md transition-all"
    >
      <div className="shrink-0 w-11 h-11 rounded-lg bg-white/70 dark:bg-background/30 flex items-center justify-center overflow-hidden">
        <img src={img} alt="" className="w-full h-full object-contain p-1" loading="lazy" />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-black text-[13px] text-emerald-900 dark:text-emerald-100 leading-tight">
          {title}
        </h3>
        <p className="text-[10px] text-emerald-700/80 dark:text-emerald-200/70 leading-tight line-clamp-2 mt-0.5">
          {subtitle}
        </p>
      </div>
      <span className="shrink-0 inline-flex items-center gap-0.5 bg-primary text-primary-foreground text-[11px] font-bold rounded-full px-2.5 py-1.5 shadow">
        {cta}
        <ChevronLeft className="w-3 h-3" />
      </span>
    </button>
  );
};

export default DeliveryRequestBanner;
