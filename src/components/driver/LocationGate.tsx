import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { MapPin, AlertTriangle } from "lucide-react";

interface LocationGateProps {
  children: React.ReactNode;
}

const LocationGate = ({ children }: LocationGateProps) => {
  const [status, setStatus] = useState<"loading" | "granted" | "denied" | "unsupported">("loading");

  useEffect(() => {
    if (!("geolocation" in navigator)) {
      setStatus("unsupported");
      return;
    }

    // Check permission state if available
    if (navigator.permissions) {
      navigator.permissions.query({ name: "geolocation" }).then((result) => {
        if (result.state === "granted") {
          setStatus("granted");
        } else if (result.state === "denied") {
          setStatus("denied");
        } else {
          // prompt - try requesting
          requestLocation();
        }
        result.onchange = () => {
          if (result.state === "granted") setStatus("granted");
          else if (result.state === "denied") setStatus("denied");
        };
      }).catch(() => {
        // Fallback: try requesting directly
        requestLocation();
      });
    } else {
      requestLocation();
    }
  }, []);

  const requestLocation = () => {
    navigator.geolocation.getCurrentPosition(
      () => setStatus("granted"),
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setStatus("denied");
        } else {
          // Other errors (timeout, etc.) - allow through
          setStatus("granted");
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background" dir="rtl">
        <div className="text-center space-y-4 p-8">
          <div className="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full mx-auto" />
          <p className="text-muted-foreground">جاري التحقق من إذن الموقع...</p>
        </div>
      </div>
    );
  }

  if (status === "denied" || status === "unsupported") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background" dir="rtl">
        <div className="text-center space-y-4 p-8 max-w-md">
          <div className="w-20 h-20 mx-auto rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="w-10 h-10 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">مطلوب إذن الموقع</h1>
          <p className="text-muted-foreground">
            {status === "unsupported"
              ? "المتصفح لا يدعم خدمات تحديد الموقع. يرجى استخدام متصفح حديث."
              : "تطبيق السائق يتطلب الوصول إلى موقعك لعرضك للعملاء القريبين. يرجى تفعيل إذن الموقع من إعدادات المتصفح."}
          </p>
          <div className="space-y-2">
            <Button onClick={requestLocation} className="w-full gap-2">
              <MapPin className="w-4 h-4" />
              السماح بالوصول للموقع
            </Button>
            <p className="text-xs text-muted-foreground">
              قم بتفعيل الموقع من إعدادات المتصفح ثم اضغط الزر أعلاه
            </p>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default LocationGate;
