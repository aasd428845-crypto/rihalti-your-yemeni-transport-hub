import { useState, useEffect } from "react";
import { RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRegisterSW } from "virtual:pwa-register/react";

export const UpdateNotification = () => {
  const [dismissed, setDismissed] = useState(false);

  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      // Check for updates every 30 minutes
      if (r) {
        setInterval(() => r.update(), 30 * 60 * 1000);
      }
    },
  });

  if (!needRefresh || dismissed) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-card border shadow-lg rounded-xl p-4 max-w-xs flex items-start gap-3" dir="rtl">
      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
        <RefreshCw className="w-5 h-5 text-primary" />
      </div>
      <div className="flex-1 space-y-2">
        <p className="text-sm font-bold text-foreground">تحديث جديد متاح!</p>
        <p className="text-xs text-muted-foreground">تم إضافة ميزات جديدة للتطبيق</p>
        <div className="flex gap-2">
          <Button size="sm" className="text-xs h-7" onClick={() => updateServiceWorker(true)}>
            تحديث الآن
          </Button>
          <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => setDismissed(true)}>
            <X className="w-3 h-3" />
          </Button>
        </div>
      </div>
    </div>
  );
};
