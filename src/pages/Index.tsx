import Header from "@/components/landing/Header";
import Hero from "@/components/home/Hero";
import Services from "@/components/home/Services";
import Stats from "@/components/home/Stats";
import HowItWorks from "@/components/home/HowItWorks";
import Numbers from "@/components/home/Numbers";
import Partners from "@/components/home/Partners";
import Testimonials from "@/components/home/Testimonials";
import AppDownload from "@/components/home/AppDownload";
import Newsletter from "@/components/home/Newsletter";
import HomeFooter from "@/components/home/HomeFooter";

const Index = () => {
  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <Header />
      <main>
        <Hero />
        <Services />
        <Stats />
        <HowItWorks />
        <Numbers />
        <Partners />
        <Testimonials />
        <AppDownload />
        <Newsletter />
      </main>
      <HomeFooter />
    </div>
  );
};

export default Index;
