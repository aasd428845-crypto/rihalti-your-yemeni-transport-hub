import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, ShieldCheck, Clock, Users, Award, ArrowLeft, MapPin, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import heroBg from "@/assets/hero-bg.jpg";

const HeroSection = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();

  const handleSearch = () => {
    if (searchQuery.trim()) {
      navigate(`/trips?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      navigate("/trips");
    }
  };

  return (
    <section className="relative min-h-[90vh] flex items-center pt-16 overflow-hidden">
      <div className="absolute inset-0">
        <img src={heroBg} alt="النقل البري في اليمن" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-l from-[hsl(195,75%,15%,0.92)] via-[hsl(195,75%,18%,0.88)] to-[hsl(195,75%,22%,0.82)]" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="text-primary-foreground space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-dark text-sm">
              <span className="w-2 h-2 rounded-full bg-secondary animate-pulse-gold" />
              <span>أول منصة يمنية متكاملة للنقل</span>
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black leading-tight">
              النقل البري في اليمن
              <br />
              <span className="text-gradient-gold inline-block">أسهل وأسرع</span> مع وصل
            </h1>

            <p className="text-lg text-primary-foreground/80 max-w-lg leading-relaxed">
              منصة متكاملة تربط العملاء بشركات النقل الموثوقة وتوفر خدمات طرود وتوصيل آمنة بين المدن اليمنية.
            </p>

            {/* Search Bar */}
            <div className="glass-dark rounded-2xl p-2 flex flex-col sm:flex-row gap-2 max-w-xl">
              <div className="flex-1 flex items-center gap-2 px-4 py-3 rounded-xl bg-white/10">
                <Search className="w-5 h-5 text-primary-foreground/60 shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  placeholder="ابحث عن رحلة، وجهة..."
                  className="bg-transparent text-primary-foreground placeholder:text-primary-foreground/40 outline-none w-full text-sm"
                />
              </div>
              <Button onClick={handleSearch} className="bg-gold-gradient text-secondary-foreground font-bold hover:opacity-90 shadow-gold px-6 shrink-0">
                بحث
              </Button>
            </div>

            {/* Trust Badges */}
            <div className="flex flex-wrap gap-4 text-sm text-primary-foreground/70">
              {[
                { icon: ShieldCheck, label: "آمنة وموثوقة" },
                { icon: Clock, label: "توقيتات دقيقة" },
                { icon: Users, label: "مجتمع موثوق" },
                { icon: Award, label: "جودة مضمونة" },
              ].map((badge) => (
                <div key={badge.label} className="flex items-center gap-1.5">
                  <badge.icon className="w-4 h-4 text-secondary" />
                  <span>{badge.label}</span>
                </div>
              ))}
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-wrap gap-3">
              <Button size="lg" className="bg-gold-gradient text-secondary-foreground font-bold hover:opacity-90 shadow-gold" onClick={() => navigate("/trips")}>
                احجز رحلة الآن
                <ArrowLeft className="w-4 h-4 mr-2" />
              </Button>
              <Button size="lg" variant="outline" className="border-primary-foreground/30 text-primary-foreground hover:bg-white/10" onClick={() => navigate("/shipments")}>
                أرسل طرد
              </Button>
              <Button size="lg" variant="outline" className="border-primary-foreground/30 text-primary-foreground hover:bg-white/10" onClick={() => navigate("/deliveries")}>
                اطلب توصيل
              </Button>
              <Button size="lg" variant="outline" className="border-primary-foreground/30 text-primary-foreground hover:bg-white/10 gap-2" onClick={() => navigate("/ride/request")}>
                🚕 اطلب أجرة
              </Button>
            </div>
          </div>

          {/* Quick Cards */}
          <div className="hidden lg:flex flex-col gap-4">
            <div className="glass-dark rounded-2xl p-5 animate-fade-in cursor-pointer hover:bg-white/10 transition-colors" onClick={() => navigate("/trips?from=صنعاء&to=عدن")} style={{ animationDelay: "0.2s" }}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-secondary" />
                  <span className="font-bold text-primary-foreground">صنعاء ← عدن</span>
                </div>
                <span className="text-xs text-primary-foreground/60">رحلة يومية</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-secondary font-bold text-xl">5,000 ريال</span>
                <span className="text-sm text-primary-foreground/70">مقاعد متاحة</span>
              </div>
            </div>

            <div className="glass-dark rounded-2xl p-5 animate-fade-in cursor-pointer hover:bg-white/10 transition-colors" onClick={() => navigate("/shipments")} style={{ animationDelay: "0.4s" }}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-secondary" />
                  <span className="font-bold text-primary-foreground">طرد تجاري</span>
                </div>
                <span className="text-xs text-primary-foreground/60">تعز ← المكلا</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-secondary font-bold text-xl">شحن آمن</span>
                <span className="text-sm text-primary-foreground/70">توصيل سريع</span>
              </div>
            </div>

            <div className="glass-dark rounded-2xl p-5 animate-fade-in border border-secondary/30 cursor-pointer hover:bg-white/10 transition-colors" onClick={() => navigate("/deliveries")} style={{ animationDelay: "0.6s" }}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-secondary text-lg">🛵</span>
                <span className="font-bold text-primary-foreground">خدمة التوصيل المحلي</span>
              </div>
              <p className="text-sm text-primary-foreground/70 mb-3">
                توصيل طلبات المطاعم والمتاجر خلال ساعات
              </p>
              <Button size="sm" className="bg-gold-gradient text-secondary-foreground font-semibold hover:opacity-90 w-full" onClick={(e) => { e.stopPropagation(); navigate("/deliveries"); }}>
                اطلب الآن
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
