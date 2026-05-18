import BackButton from "@/components/common/BackButton";
import { Truck } from "lucide-react";

const Section = ({ num, title, children }: { num: string; title: string; children: React.ReactNode }) => (
  <section className="space-y-3">
    <h2 className="text-lg font-bold text-foreground border-r-4 border-primary pr-3">{num}. {title}</h2>
    <div className="text-muted-foreground leading-7 space-y-2 pr-1">{children}</div>
  </section>
);

const CompanyTermsPage = () => (
  <div className="container mx-auto px-4 py-10 max-w-3xl" dir="rtl">
    <BackButton />
    <div className="mt-4 mb-8">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Truck className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-black text-foreground">شروط الشركاء</h1>
          <p className="text-xs text-muted-foreground">شركات التوصيل والسائقون المستقلون</p>
        </div>
      </div>
      <p className="text-sm text-muted-foreground">آخر تحديث: مايو ٢٠٢٦</p>
    </div>

    <div className="space-y-8">
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 text-sm text-amber-900 leading-7">
        <strong>تنبيه مهم:</strong> هذه الشروط تختلف عن شروط العملاء العاديين. يُرجى قراءتها كاملاً قبل التسجيل كشريك. بانضمامك للمنصة تُقرّ بالموافقة على جميع البنود الواردة هنا.
      </div>

      <Section num="١" title="طبيعة العلاقة مع وصال">
        <p>أنت شريك مستقل وليس موظفاً في منصة وصال. لا تنشأ بموجب هذه الاتفاقية أي علاقة عمل أو توظيف أو وكالة قانونية بينك وبين المنصة.</p>
        <ul className="list-disc list-inside space-y-1.5 mr-2">
          <li>تتمتع بحرية قبول أو رفض الطلبات</li>
          <li>أنت مسؤول عن ضرائبك ومستحقاتك القانونية</li>
          <li>تعمل بأدواتك ومركباتك الخاصة</li>
          <li>لك الحرية في تحديد ساعات عملك</li>
        </ul>
      </Section>

      <Section num="٢" title="متطلبات الانضمام">
        <p>للانضمام كشريك يجب استيفاء الشروط التالية:</p>
        <ul className="list-disc list-inside space-y-1.5 mr-2">
          <li>تسجيل قانوني معتمد في الجمهورية اليمنية (للشركات)</li>
          <li>رخصة قيادة سارية (للسائقين المستقلين)</li>
          <li>مركبة بحالة جيدة لا يتجاوز عمرها ١٥ سنة</li>
          <li>التحقق من الهوية الشخصية بصورة صالحة</li>
          <li>قبول برنامج التدريب الأساسي للمنصة</li>
          <li>خلو السجل الجنائي من الجرائم الجسيمة</li>
        </ul>
      </Section>

      <Section num="٣" title="معايير الخدمة والجودة">
        <ul className="list-disc list-inside space-y-1.5 mr-2">
          <li>الالتزام بالمواعيد المحددة للاستلام والتسليم</li>
          <li>الحفاظ على سلامة الشحنات وعدم فتحها أو التلاعب بها</li>
          <li>التعامل مع العملاء باحترام ومهنية عالية في جميع الأوقات</li>
          <li>الرد على مكالمات وصال أو العملاء خلال دقيقتين</li>
          <li>الإبلاغ الفوري عن أي حادث أو تأخير أو مشكلة</li>
          <li>الحفاظ على تقييم لا يقل عن ٣.٥ من ٥ نجوم</li>
        </ul>
      </Section>

      <Section num="٤" title="الرسوم والمدفوعات">
        <ul className="list-disc list-inside space-y-1.5 mr-2">
          <li>تحتسب المنصة عمولة تتراوح بين <strong>١٠٪ و١٥٪</strong> من قيمة كل طلب</li>
          <li>يتم الدفع أسبوعياً أو شهرياً حسب ما تم الاتفاق عليه</li>
          <li>يُمنع تحصيل رسوم إضافية من العملاء خارج الأسعار المُقرَّة في المنصة</li>
          <li>في حالة النزاعات المالية، تحتفظ وصال بحق الاحتجاز المؤقت للمبالغ لحين الحل</li>
          <li>تحتسب غرامة ٥٠٠ ريال عن كل إلغاء مزدوج (تأكيد ثم رفض) دون مبرر مقبول</li>
        </ul>
      </Section>

      <Section num="٥" title="المسؤولية والتأمين">
        <ul className="list-disc list-inside space-y-1.5 mr-2">
          <li>أنت مسؤول مسؤولية كاملة عن أي ضرر يلحق بالشحنات أثناء تواجدها بحوزتك</li>
          <li>يجب تأمين مركبتك وفق ما يقتضيه القانون اليمني</li>
          <li>وصال غير مسؤولة عن أي حوادث مرورية أو إصابات جسدية أثناء العمل</li>
          <li>في حالة فقدان الشحنة أو تلفها، تُحسم قيمتها من مستحقاتك بعد التحقيق</li>
        </ul>
      </Section>

      <Section num="٦" title="حظر المنافسة وسرية المعلومات">
        <ul className="list-disc list-inside space-y-1.5 mr-2">
          <li>يُحظر تحويل عملاء وصال للتعامل مباشرةً معك خارج المنصة</li>
          <li>يُحظر الإفصاح عن أي معلومات سرية خاصة بالمنصة أو عملائها</li>
          <li>يُحظر استخدام بيانات العملاء المكتسبة عبر المنصة لأغراض تجارية أخرى</li>
        </ul>
      </Section>

      <Section num="٧" title="تعليق الحساب وإنهاء الشراكة">
        <p><strong>تُعلَّق الشراكة فوراً في حالة:</strong></p>
        <ul className="list-disc list-inside space-y-1.5 mr-2">
          <li>انتهاك أي من هذه الشروط</li>
          <li>التقييم المتكرر دون ٣ نجوم</li>
          <li>شكاوى موثّقة من العملاء بشأن السلوك</li>
          <li>ثبوت التلاعب أو الاحتيال</li>
        </ul>
        <p><strong>لإنهاء الشراكة طوعياً:</strong> يجب إشعار وصال كتابياً قبل ١٤ يوماً. تُسوَّى جميع المطالبات المالية المعلقة خلال ٣٠ يوماً من إنهاء الشراكة.</p>
      </Section>

      <Section num="٨" title="القانون المطبق والنزاعات">
        <p>تخضع هذه الاتفاقية للقانون اليمني. يُحال أي نزاع ابتداءً إلى لجنة التحكيم الداخلية في وصال، وإن لم يُحسم خلال ٣٠ يوماً تختص المحاكم اليمنية بالفصل فيه.</p>
      </Section>

      <div className="border-t border-border pt-6">
        <p className="text-sm text-muted-foreground text-center">
          هل أنت عميل؟{" "}
          <a href="/terms" className="text-primary font-semibold hover:underline">اطلع على شروط العملاء</a>
          {" · "}
          <a href="/privacy" className="text-primary font-semibold hover:underline">سياسة الخصوصية</a>
        </p>
      </div>
    </div>
  </div>
);

export default CompanyTermsPage;
