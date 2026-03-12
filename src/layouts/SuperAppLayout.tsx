import { useState } from "react";
import { Outlet } from "react-router-dom";
import SuperAppHeader from "@/components/super-app/SuperAppHeader";
import BottomNav from "@/components/super-app/BottomNav";
import MoreSheet from "@/components/super-app/MoreSheet";

const SuperAppLayout = () => {
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background overflow-x-hidden" dir="rtl">
      {/* Top Header */}
      <SuperAppHeader />

      {/* Main content — padded for header (top) and bottom nav */}
      <main className="pt-[116px] pb-24 min-h-screen">
        <Outlet />
      </main>

      {/* Bottom Navigation */}
      <BottomNav onMoreOpen={() => setMoreOpen(true)} />

      {/* More / Account Sheet */}
      <MoreSheet
        open={moreOpen}
        onClose={() => setMoreOpen(false)}
        onOpenChat={() => setMoreOpen(false)}
      />
    </div>
  );
};

export default SuperAppLayout;
