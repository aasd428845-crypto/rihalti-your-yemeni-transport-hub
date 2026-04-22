import { Outlet, useLocation, matchPath } from "react-router-dom";
import SuperAppHeader from "@/components/super-app/SuperAppHeader";
import BottomNav from "@/components/super-app/BottomNav";

// Pages that should render full-bleed (no app header, no top padding)
const FULL_BLEED_ROUTES = ["/restaurants/:id"];

const SuperAppLayout = () => {
  const location = useLocation();
  const fullBleed = FULL_BLEED_ROUTES.some(p => matchPath({ path: p, end: true }, location.pathname));

  return (
    <div className="min-h-screen bg-background overflow-x-hidden" dir="rtl">
      {!fullBleed && <SuperAppHeader />}
      <main className={`min-h-screen pb-24 ${fullBleed ? "pt-0" : "pt-[88px]"}`}>
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
};

export default SuperAppLayout;
