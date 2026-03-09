import BackButton from "@/components/common/BackButton";

const TermsPage = () => {
  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl">
      <BackButton />
      <h1 className="text-3xl font-extrabold text-foreground mb-6 mt-4">الشروط والأحكام</h1>
      
      <div className="prose prose-sm text-muted-foreground space-y-6">
        <section>
          <h2 className="text-xl font-bold text-foreground mb-3">١. مقدمة</h2>
          <p>مرحبًا بك في منصة وصل (WASL). باستخدامك للمنصة فإنك توافق على الالتزام بهذه الشروط والأحكام. يرجى قراءتها بعناية قبل استخدام خدماتنا.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-foreground mb-3">٢. الخدمات المقدمة</h2>
          <p>توفر منصة وصل الخدمات التالية:</p>
          <ul className="list-disc list-inside space-y-1 mr-4">
            <li>حجز رحلات النقل البري بين المدن اليمنية</li>
            <li>إرسال وتتبع الطرود والشحنات</li>
            <li>خدمة التوصيل المحلي من المطاعم والمتاجر</li>
            <li>خدمة طلب سيارات الأجرة</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-foreground mb-3">٣. حسابات المستخدمين</h2>
          <p>يتحمل المستخدم مسؤولية الحفاظ على سرية بيانات حسابه. يجب أن تكون المعلومات المقدمة عند التسجيل صحيحة ودقيقة.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-foreground mb-3">٤. الدفع والأسعار</h2>
          <p>تُحدد أسعار الخدمات من قبل مقدمي الخدمة (شركات النقل، السائقين، شركات التوصيل). تحتفظ المنصة بعمولة محددة من كل معاملة.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-foreground mb-3">٥. سياسة الإلغاء</h2>
          <p>يمكن إلغاء الحجوزات وفقًا لسياسة الإلغاء المحددة لكل خدمة. قد تُطبق رسوم إلغاء في بعض الحالات.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-foreground mb-3">٦. المسؤولية</h2>
          <p>تعمل منصة وصل كوسيط بين العملاء ومقدمي الخدمات. لا تتحمل المنصة المسؤولية المباشرة عن جودة الخدمة المقدمة من الشركاء، ولكنها تسعى لضمان أعلى معايير الجودة.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-foreground mb-3">٧. التعديلات</h2>
          <p>تحتفظ منصة وصل بالحق في تعديل هذه الشروط والأحكام في أي وقت. سيتم إخطار المستخدمين بأي تغييرات جوهرية.</p>
        </section>

        <p className="text-xs text-muted-foreground pt-4 border-t border-border">آخر تحديث: مارس ٢٠٢٦</p>
      </div>
    </div>
  );
};

export default TermsPage;
