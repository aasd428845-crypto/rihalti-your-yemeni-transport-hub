import { Outlet } from "react-router-dom";
import Header from "@/components/landing/Header";
import HomeFooter from "@/components/home/HomeFooter";

const MainLayout = () => {
  return (
    <div className="min-h-screen bg-background overflow-x-hidden" dir="rtl">
      <Header />
      <main className="pt-[72px]">
        <Outlet />
      </main>
      <HomeFooter />
    </div>
  );
};

export default MainLayout;
