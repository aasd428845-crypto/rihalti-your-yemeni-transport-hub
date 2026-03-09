import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Download, Smartphone, CheckCircle, Share2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const InstallPage = () => {
  const navigate = useNavigate();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);

    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    // Check iOS
    const ua = navigator.userAgent;
    setIsIOS(/iPad|iPhone|iPod/.test(ua));

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4" dir="rtl">
      <Card className="max-w-md w-full">
        <CardContent className="p-8 text-center space-y-6">
          <div className="w-20 h-20 mx-auto rounded-2xl overflow-hidden shadow-lg">
            <img src="/icons/icon-192x192.png" alt="وصل" className="w-full h-full object-cover" />
          </div>

          <div>
            <h1 className="text-2xl font-bold text-foreground font-cairo">تثبيت تطبيق وصل</h1>
            <p className="text-muted-foreground mt-2 text-sm">
              ثبّت التطبيق على جهازك للوصول السريع وتجربة أفضل
            </p>
          </div>

          {isInstalled ? (
            <div className="space-y-3">
              <div className="flex items-center justify-center gap-2 text-success">
                <CheckCircle className="w-6 h-6" />
                <span className="font-bold">التطبيق مثبت بالفعل!</span>
              </div>
              <Button onClick={() => navigate("/")} className="w-full">
                فتح التطبيق
              </Button>
            </div>
          ) : isIOS ? (
            <div className="space-y-4 text-right">
              <p className="text-sm font-bold text-foreground">لتثبيت التطبيق على iPhone:</p>
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Share2 className="w-4 h-4 text-primary" />
                  </div>
                  <span>اضغط على زر المشاركة <strong>(Share)</strong> في المتصفح</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Download className="w-4 h-4 text-primary" />
                  </div>
                  <span>اختر <strong>"إضافة إلى الشاشة الرئيسية"</strong></span>
                </div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <CheckCircle className="w-4 h-4 text-primary" />
                  </div>
                  <span>اضغط <strong>"إضافة"</strong> للتأكيد</span>
                </div>
              </div>
            </div>
          ) : deferredPrompt ? (
            <Button onClick={handleInstall} size="lg" className="w-full gap-2">
              <Download className="w-5 h-5" />
              تثبيت التطبيق
            </Button>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                افتح هذه الصفحة في متصفح Chrome أو Edge لتثبيت التطبيق
              </p>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <Smartphone className="w-5 h-5 text-primary" />
                <span>أو اختر "إضافة إلى الشاشة الرئيسية" من قائمة المتصفح</span>
              </div>
            </div>
          )}

          <div className="border-t pt-4 space-y-2">
            <h3 className="text-sm font-bold text-foreground">مميزات التطبيق:</h3>
            <ul className="text-xs text-muted-foreground space-y-1 text-right">
              <li>✅ يعمل بدون إنترنت</li>
              <li>✅ وصول سريع من الشاشة الرئيسية</li>
              <li>✅ تجربة تشبه التطبيقات الأصلية</li>
              <li>✅ تحديثات تلقائية</li>
            </ul>
          </div>

          <Button variant="ghost" onClick={() => navigate("/")} className="text-sm">
            العودة للصفحة الرئيسية
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default InstallPage;
