import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Store,
  ShoppingBag,
  Users,
  DollarSign,
  Settings,
  Link2,
  BarChart3,
  CreditCard,
  MapPinned,
  ImageIcon,
  Tag,
  Calculator,
  Crown,
  Sparkles,
} from "lucide-react";

interface OnboardingStep {
  icon: typeof LayoutDashboard;
  title: string;
  description: string;
}

const steps: OnboardingStep[] = [
  {
    icon: Sparkles,
    title: "مرحباً بك في لوحة تحكم شركة التوصيل",
    description:
      "هذه جولة سريعة تشرح لك كل صفحة وتبويب في لوحة التحكم، حتى تتمكن من إدارة شركتك بسهولة منذ اللحظة الأولى. يمكنك إعادة فتح هذه الجولة في أي وقت من زر المساعدة أعلى الصفحة.",
  },
  {
    icon: LayoutDashboard,
    title: "لوحة القيادة",
    description:
      "الصفحة الرئيسية التي تعرض ملخصاً سريعاً عن أداء شركتك: عدد الطلبات، الإيرادات، المندوبين النشطين، وأهم الإحصائيات اليومية.",
  },
  {
    icon: Store,
    title: "المطاعم",
    description:
      "من هنا تضيف وتدير المطاعم أو المتاجر التابعة لشركتك، وتتحكم في قوائم الطعام والمنتجات الخاصة بكل مطعم.",
  },
  {
    icon: ShoppingBag,
    title: "الطلبات",
    description:
      "تتبع جميع الطلبات الواردة لحظة بلحظة، من استلام الطلب حتى التوصيل، ويمكنك إسناد كل طلب لمندوب مناسب.",
  },
  {
    icon: Users,
    title: "المندوبين",
    description:
      "إدارة فريق مندوبي التوصيل: إضافة مندوبين جدد، متابعة حالتهم (متاح / مشغول)، ومراجعة أدائهم.",
  },
  {
    icon: MapPinned,
    title: "مناطق التغطية",
    description:
      "حدد المناطق الجغرافية التي تقدم فيها خدمة التوصيل، لضمان وصول الطلبات فقط من داخل نطاق تغطيتك.",
  },
  {
    icon: Tag,
    title: "العروض",
    description:
      "أنشئ عروضاً وخصومات ترويجية لجذب المزيد من العملاء وزيادة عدد الطلبات.",
  },
  {
    icon: Calculator,
    title: "مركز التسعير",
    description:
      "تحكم في أسعار التوصيل حسب المسافة أو المنطقة، وضبط الرسوم الإضافية إن وجدت.",
  },
  {
    icon: ImageIcon,
    title: "البنرات الإعلانية",
    description:
      "أضف بنرات إعلانية تظهر للعملاء داخل التطبيق للترويج لمطاعمك أو عروضك الخاصة.",
  },
  {
    icon: DollarSign,
    title: "المالية",
    description:
      "راجع الإيرادات، العمولات، والمستحقات المالية لشركتك بشكل مفصّل وشفاف.",
  },
  {
    icon: BarChart3,
    title: "التقارير",
    description:
      "تقارير تحليلية تفصيلية عن أداء الطلبات والمندوبين والمبيعات عبر فترات زمنية مختلفة.",
  },
  {
    icon: Link2,
    title: "التكامل",
    description:
      "اربط أنظمتك الخارجية أو أدواتك المفضلة بمنصة وصال لتسهيل إدارة عملك.",
  },
  {
    icon: Settings,
    title: "الإعدادات",
    description:
      "قم بتحديث شعار الشركة، اسمها، سعر الكيلومتر، والحسابات البنكية الخاصة باستلام الأرباح.",
  },
  {
    icon: CreditCard,
    title: "المدفوعات وإعدادات الدفع",
    description:
      "تابع عمليات الدفع الواردة والصادرة، وتحكم في طرق الدفع المتاحة لعملائك.",
  },
  {
    icon: Crown,
    title: "الاشتراك",
    description:
      "راجع تفاصيل باقة اشتراكك الحالية في المنصة، وقم بترقيتها أو تجديدها عند الحاجة.",
  },
];

const STORAGE_KEY_PREFIX = "wasal_delivery_onboarding_seen_";

export const useDeliveryOnboardingKey = (userId?: string | null) =>
  `${STORAGE_KEY_PREFIX}${userId ?? "anon"}`;

interface DeliveryOnboardingProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const DeliveryOnboarding = ({ open: controlledOpen, onOpenChange }: DeliveryOnboardingProps) => {
  const { user } = useAuth();
  const [internalOpen, setInternalOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;

  useEffect(() => {
    if (isControlled) return;
    if (!user) return;
    const key = `${STORAGE_KEY_PREFIX}${user.id}`;
    const seen = localStorage.getItem(key);
    if (!seen) {
      setInternalOpen(true);
    }
  }, [user, isControlled]);

  const handleClose = () => {
    if (user) {
      localStorage.setItem(`${STORAGE_KEY_PREFIX}${user.id}`, "1");
    }
    setStepIndex(0);
    if (isControlled) {
      onOpenChange?.(false);
    } else {
      setInternalOpen(false);
    }
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      handleClose();
    } else if (isControlled) {
      onOpenChange?.(true);
    } else {
      setInternalOpen(true);
    }
  };

  const isLast = stepIndex === steps.length - 1;
  const current = steps[stepIndex];
  const Icon = current.icon;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md" dir="rtl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Icon className="w-5 h-5 text-primary" />
            </div>
            <DialogTitle className="text-right">{current.title}</DialogTitle>
          </div>
          <DialogDescription className="text-right pt-2 leading-relaxed">
            {current.description}
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-center gap-1.5 py-2">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === stepIndex ? "w-6 bg-primary" : "w-1.5 bg-muted"
              }`}
            />
          ))}
        </div>

        <DialogFooter className="flex-row-reverse sm:justify-between gap-2">
          <div className="flex gap-2">
            {stepIndex > 0 && (
              <Button variant="outline" onClick={() => setStepIndex((i) => i - 1)}>
                السابق
              </Button>
            )}
            <Button
              onClick={() => {
                if (isLast) {
                  handleClose();
                } else {
                  setStepIndex((i) => i + 1);
                }
              }}
            >
              {isLast ? "إنهاء الجولة" : "التالي"}
            </Button>
          </div>
          {!isLast && (
            <Button variant="ghost" onClick={handleClose} className="text-muted-foreground">
              تخطي
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DeliveryOnboarding;
