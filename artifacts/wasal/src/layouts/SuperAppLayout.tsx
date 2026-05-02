import { Outlet, useLocation, matchPath } from "react-router-dom";
import SuperAppHeader from "@/components/super-app/SuperAppHeader";
import BottomNav from "@/components/super-app/BottomNav";

// Pages that should render full-bleed (no app header, no top padding)
const FULL_BLEED_ROUTES = ["/restaurants/:id"];

// Detail pages render the header in compact "back + logo" mode (~70px tall).
// All other pages render the full header with greeting + search bar (~120px).
const DETAIL_PATHS = ["/restaurants/", "/trips/", "/checkout/", "/ride/", "/order/"];
const isDetailPage = (pathname: string) =>
  DETAIL_PATHS.some((p) => pathname.includes(p)) ||
  pathname === "/login" || pathname === "/register" ||
  pathname === "/forgot-password" || pathname === "/reset-password";

const SuperAppLayout = () => {
  const location = useLocation();
  const fullBleed = FULL_BLEED_ROUTES.some(p => matchPath({ path: p, end: true }, location.pathname));
  const detail = isDetailPage(location.pathname);

  const topPadding = fullBleed ? "pt-0" : detail ? "pt-[76px]" : "pt-[124px]";

  return (
    <div className="min-h-screen bg-background overflow-x-hidden" dir="rtl">
      {!fullBleed && <SuperAppHeader />}
      <main className={`min-h-screen pb-24 ${topPadding}`}>
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
};

export default SuperAppLayout;
