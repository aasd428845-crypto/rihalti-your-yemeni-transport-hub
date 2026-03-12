import { Outlet } from "react-router-dom";
import SuperAppHeader from "@/components/super-app/SuperAppHeader";
import BottomNav from "@/components/super-app/BottomNav";

const SuperAppLayout = () => {
  return (
    <div className="min-h-screen bg-background overflow-x-hidden" dir="rtl">
      <SuperAppHeader />
      <main className="pt-[116px] pb-24 min-h-screen">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
};

export default SuperAppLayout;
