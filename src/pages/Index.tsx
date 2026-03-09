import Header from "@/components/landing/Header";
import Hero from "@/components/home/Hero";
import Services from "@/components/home/Services";
import Stats from "@/components/home/Stats";
import HowItWorks from "@/components/home/HowItWorks";
import Testimonials from "@/components/home/Testimonials";
import AppDownload from "@/components/home/AppDownload";
import Newsletter from "@/components/home/Newsletter";
import HomeFooter from "@/components/home/HomeFooter";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-16">
        <Hero />
        <Services />
        <Stats />
        <HowItWorks />
        <Testimonials />
        <AppDownload />
        <Newsletter />
      </main>
      <HomeFooter />
    </div>
  );
};

export default Index;
