import { Link } from "react-router-dom";
import { MapPin, Package, Shield, Clock, Headphones, Bus, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";

const Hero = () => {
  return (
    <section className="relative bg-gradient-to-br from-primary to-secondary text-primary-foreground overflow-hidden min-h-[600px] flex items-center">
      {/* Decorative blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-accent/5 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 py-20 relative z-10">
        <div className="text-center max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full mb-6 text-sm font-medium">
            <span className="w-2 h-2 bg-accent rounded-full animate-pulse" />
            منصة وصل الذكية للنقل في اليمن
          </div>

          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black mb-6 leading-tight">
            للتنقل وإرسال الطرود
            <span className="block text-accent mt-2">في اليمن</span>
          </h1>

          <p className="text-lg md:text-xl text-primary-foreground/80 mb-10 max-w-2xl mx-auto leading-relaxed">
            أول منصة يمنية متكاملة تربطك بأصحاب المكاتب الموثوقين وسائقي الأجرة، مع إمكانية تتبع طلباتك لحظة بلحظة.
          </p>

          {/* Features pills */}
          <div className="flex flex-wrap justify-center gap-4 mb-10">
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-xl">
              <Shield className="w-5 h-5 text-accent" />
              <div className="text-right">
                <div className="text-sm font-bold">آمنة وموثوقة</div>
                <div className="text-xs text-primary-foreground/60">شركاء معتمدون</div>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-xl">
              <MapPin className="w-5 h-5 text-accent" />
              <div className="text-right">
                <div className="text-sm font-bold">تتبع مباشر</div>
                <div className="text-xs text-primary-foreground/60">لحظة بلحظة</div>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-xl">
              <Headphones className="w-5 h-5 text-accent" />
              <div className="text-right">
                <div className="text-sm font-bold">دعم متواصل</div>
                <div className="text-xs text-primary-foreground/60">24/7</div>
              </div>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/trips">
              <Button size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90 shadow-lg gap-2 text-base px-8">
                <Bus className="w-5 h-5" />
                احجز رحلة
              </Button>
            </Link>
            <Link to="/shipments">
              <Button size="lg" variant="outline" className="border-primary-foreground/30 text-primary-foreground hover:bg-white/10 gap-2 text-base px-8">
                <Package className="w-5 h-5" />
                أرسل طرداً
              </Button>
            </Link>
            <Link to="/deliveries">
              <Button size="lg" variant="outline" className="border-primary-foreground/30 text-primary-foreground hover:bg-white/10 gap-2 text-base px-8">
                <Truck className="w-5 h-5" />
                طلب توصيل
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
