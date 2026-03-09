import { Loader2 } from "lucide-react";

const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[60vh]">
    <div className="text-center space-y-3">
      <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
      <p className="text-sm text-muted-foreground">جاري التحميل...</p>
    </div>
  </div>
);

export default PageLoader;
