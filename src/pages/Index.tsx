import Header from "@/components/landing/Header";
import HeroSection from "@/components/landing/HeroSection";
import FeaturedTrips from "@/components/landing/FeaturedTrips";
import ServicesSection from "@/components/landing/ServicesSection";
import HowItWorksSection from "@/components/landing/HowItWorksSection";
import StatsSection from "@/components/landing/StatsSection";
import TestimonialsSection from "@/components/landing/TestimonialsSection";
import AppDownloadSection from "@/components/landing/AppDownloadSection";
import CTASection from "@/components/landing/CTASection";
import Footer from "@/components/landing/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <HeroSection />
        <FeaturedTrips />
        <ServicesSection />
        <HowItWorksSection />
        <StatsSection />
        <TestimonialsSection />
        <AppDownloadSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
