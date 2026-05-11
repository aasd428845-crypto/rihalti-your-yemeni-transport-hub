import BackButton from "@/components/common/BackButton";

const PrivacyPage = () => {
  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl">
      <BackButton />
      <h1 className="text-3xl font-extrabold text-foreground mb-6 mt-4">سياسة الخصوصية</h1>

      <div className="prose prose-sm text-muted-foreground space-y-6">
        <section>
          <h2 className="text-xl font-bold text-foreground mb-3">١. المعلومات التي نجمعها</h2>
          <p>نجمع المعلومات التالية عند استخدامك لمنصة وصل:</p>
          <ul className="list-disc list-inside space-y-1 mr-4">
            <li>الاسم الكامل ورقم الهاتف والبريد الإلكتروني</li>
            <li>بيانات الموقع الجغرافي (عند استخدام خدمة الأجرة أو التوصيل)</li>
            <li>سجل الحجوزات والمعاملات</li>
            <li>معلومات الجهاز والمتصفح</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-foreground mb-3">٢. كيف نستخدم معلوماتك</h2>
          <p>نستخدم المعلومات المجمعة لتقديم خدماتنا وتحسينها، بما في ذلك:</p>
          <ul className="list-disc list-inside space-y-1 mr-4">
            <li>معالجة الحجوزات والطلبات</li>
            <li>التواصل معك بشأن حجوزاتك</li>
            <li>تحسين تجربة المستخدم</li>
            <li>إرسال إشعارات مهمة حول خدماتنا</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-foreground mb-3">٣. حماية البيانات</h2>
          <p>نتخذ إجراءات أمنية مناسبة لحماية معلوماتك الشخصية من الوصول غير المصرح به أو التعديل أو الإفصاح.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-foreground mb-3">٤. مشاركة المعلومات</h2>
          <p>لا نبيع معلوماتك الشخصية لأطراف ثالثة. قد نشارك بعض المعلومات مع مقدمي الخدمات (مثل اسمك ورقم هاتفك) لتسهيل تقديم الخدمة المطلوبة.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-foreground mb-3">٥. حقوقك</h2>
          <p>يحق لك طلب الوصول إلى بياناتك الشخصية أو تعديلها أو حذفها. تواصل معنا عبر صفحة الاتصال لأي استفسارات.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-foreground mb-3">٦. ملفات تعريف الارتباط (Cookies)</h2>
          <p>نستخدم ملفات تعريف الارتباط لتحسين تجربتك وتذكر تفضيلاتك. يمكنك التحكم في إعدادات ملفات تعريف الارتباط من خلال متصفحك.</p>
        </section>

        <p className="text-xs text-muted-foreground pt-4 border-t border-border">آخر تحديث: مارس ٢٠٢٦</p>
      </div>
    </div>
  );
};

export default PrivacyPage;
