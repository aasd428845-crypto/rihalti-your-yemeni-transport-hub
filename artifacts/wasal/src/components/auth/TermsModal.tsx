import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ShieldCheck } from "lucide-react";

interface TermsModalProps {
  onAccept: () => void;
  variant?: "customer" | "company";
}

const CUSTOMER_TERMS = `
شروط وأحكام منصة وصال

آخر تحديث: مايو ٢٠٢٦

١. القبول بالشروط
باستخدامك لتطبيق وصال، فإنك توافق على هذه الشروط والأحكام. إذا كنت لا توافق على هذه الشروط، يرجى عدم استخدام التطبيق.

٢. الخدمات المقدمة
تقدم منصة وصال الخدمات التالية:
• توصيل الطرود والشحنات داخل اليمن
• طلب سيارات الأجرة والتنقل بين المدن
• توصيل الطلبات من المطاعم والمتاجر
• تتبع الطلبات والشحنات في الوقت الفعلي

٣. الحساب والمعلومات الشخصية
• أنت مسؤول عن الحفاظ على أمان حسابك
• يجب أن تكون المعلومات التي تقدمها صحيحة ومحدّثة
• لا يُسمح بمشاركة بيانات الحساب مع الآخرين
• تحتفظ منصة وصال بحق تعليق الحسابات التي تنتهك الشروط

٤. الأسعار والدفع
• الأسعار محددة وفق الخدمة والمسافة
• يتم احتساب الرسوم وفق التعرفة المعتمدة
• يتم الدفع إما نقداً أو عبر الوسائل الإلكترونية المتاحة
• الأسعار قابلة للتغيير مع إشعار مسبق

٥. إلغاء الطلبات
• يمكن إلغاء الطلب قبل قبوله من قِبل السائق أو المتجر
• بعد القبول قد تُطبق رسوم إلغاء
• في حالات الطوارئ، تواصل مع الدعم مباشرةً

٦. المسؤولية
• وصال وسيط بين المستخدم ومزودي الخدمة
• لا تتحمل المنصة مسؤولية التأخير الناتج عن ظروف خارجة عن إرادتها
• في حالة وجود مشكلة في طلبك، تواصل مع الدعم خلال ٢٤ ساعة

٧. الخصوصية
نحن نحترم خصوصيتك. يُرجى مراجعة سياسة الخصوصية الكاملة لمعرفة كيفية معالجة بياناتك.

٨. التواصل
للدعم والاستفسارات، تواصل معنا عبر قنوات الدعم المتاحة في التطبيق.
`;

const COMPANY_TERMS = `
شروط وأحكام الشركاء — شركات التوصيل

آخر تحديث: مايو ٢٠٢٦

١. طبيعة الشراكة
بانضمامك لمنصة وصال كشركة توصيل، فإنك تُقرّ بقراءة هذه الشروط والموافقة عليها. العلاقة بينك وبين وصال هي علاقة شريك مستقل وليس موظفاً.

٢. متطلبات الانضمام
• تسجيل قانوني معتمد في اليمن
• توفر أسطول من السيارات أو الدراجات المناسبة
• التزام سائقيك بمعايير السلامة والمهنية
• التحقق من هوية جميع السائقين العاملين تحت حسابك

٣. معايير الخدمة
• الالتزام بأوقات الالتقاط والتسليم المتفق عليها
• التعامل مع العملاء باحترام ومهنية عالية
• الحفاظ على سلامة البضائع المُوكلة إليكم
• إبلاغ المنصة فوراً عن أي حوادث أو مشاكل

٤. الرسوم والعمولات
• تحتسب المنصة عمولة متفق عليها على كل طلب
• يتم الدفع وفق الجدول الزمني المحدد في اتفاقية الشراكة
• يُمنع تحصيل رسوم إضافية من العملاء دون موافقة المنصة

٥. المسؤولية والتعويضات
• أنتم مسؤولون عن أي ضرر يلحق بالبضائع خلال النقل
• يجب تأمين السيارات والسائقين وفق القانون اليمني
• وصال غير مسؤولة عن النزاعات بينكم وبين العملاء التي تنشأ عن تقصيركم

٦. إنهاء الشراكة
• يحق لوصال إنهاء الشراكة في حالة انتهاك الشروط
• يجب الإشعار المسبق بـ ١٤ يوماً عند الرغبة في إنهاء الشراكة من طرفكم
• تبقى المطالبات المعلقة سارية بعد إنهاء الشراكة

٧. الالتزامات الشرعية
• الالتزام بالقوانين اليمنية المعمول بها
• دفع الضرائب والرسوم الحكومية المستحقة
• عدم استخدام المنصة لأي أنشطة غير مشروعة
`;

export default function TermsModal({ onAccept, variant = "customer" }: TermsModalProps) {
  const [agreed, setAgreed] = useState(false);

  const isCompany = variant === "company";
  const title = isCompany ? "شروط وأحكام الشركاء" : "الشروط والأحكام";
  const content = isCompany ? COMPANY_TERMS : CUSTOMER_TERMS;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-card w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
        {/* Header */}
        <div className="bg-primary px-6 py-5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-black text-white">{title}</h2>
            <p className="text-xs text-white/80">يرجى القراءة والموافقة قبل المتابعة</p>
          </div>
        </div>

        {/* Terms content */}
        <ScrollArea className="h-64 sm:h-72">
          <div className="px-6 py-4 text-sm text-muted-foreground leading-7 whitespace-pre-line">
            {content}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="px-6 pb-6 pt-4 border-t border-border space-y-4">
          <label className="flex items-start gap-3 cursor-pointer group">
            <Checkbox
              checked={agreed}
              onCheckedChange={(v) => setAgreed(Boolean(v))}
              className="mt-0.5 shrink-0"
            />
            <span className="text-sm text-foreground leading-relaxed group-hover:text-primary transition-colors">
              أقرّ بأنني قرأت{" "}
              <a
                href={isCompany ? "/terms/company" : "/terms"}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary font-semibold underline"
                onClick={(e) => e.stopPropagation()}
              >
                الشروط والأحكام
              </a>{" "}
              و{" "}
              <a
                href="/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary font-semibold underline"
                onClick={(e) => e.stopPropagation()}
              >
                سياسة الخصوصية
              </a>{" "}
              وأوافق عليها
            </span>
          </label>

          <Button
            className="w-full h-12 font-bold text-base"
            disabled={!agreed}
            onClick={onAccept}
          >
            متابعة
          </Button>
        </div>
      </div>
    </div>
  );
}
