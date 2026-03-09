import Hero from "@/components/home/Hero";
import Services from "@/components/home/Services";
import Stats from "@/components/home/Stats";
import HowItWorks from "@/components/home/HowItWorks";
import Numbers from "@/components/home/Numbers";
import Partners from "@/components/home/Partners";
import Testimonials from "@/components/home/Testimonials";
import AppDownload from "@/components/home/AppDownload";
import Newsletter from "@/components/home/Newsletter";

const Index = () => {
  return (
    <>
      <Hero />
      <Services />
      <Stats />
      <HowItWorks />
      <Numbers />
      <Partners />
      <Testimonials />
      <AppDownload />
      <Newsletter />
    </>
  );
};

export default Index;
