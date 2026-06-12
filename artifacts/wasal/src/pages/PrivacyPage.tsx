import BackButton from "@/components/common/BackButton";

const Section = ({ num, title, children }: { num: string; title: string; children: React.ReactNode }) => (
  <section className="space-y-3">
    <h2 className="text-lg font-bold text-foreground border-r-4 border-primary pr-3">{num}. {title}</h2>
    <div className="text-muted-foreground leading-7 space-y-2 pr-1">{children}</div>
  </section>
);

const PrivacyPage = () => (
  <div className="container mx-auto px-4 py-10 max-w-3xl" dir="rtl">
    <BackButton />
    <div className="mt-4 mb-8">
      <h1 className="text-3xl font-black text-foreground mb-2">سياسة الخصوصية</h1>
      <p className="text-sm text-muted-foreground">آخر تحديث: مايو ٢٠٢٦ — تطبّق على جميع مستخدمي منصة وصال</p>
    </div>

    <div className="space-y-8">
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-5 text-sm text-foreground leading-7">
        <strong>ملخص:</strong> وصال منصة يمنية لخدمات التوصيل. نجمع بياناتك لتقديم الخدمة فقط، ولا نبيعها لأي طرف ثالث. يمكنك طلب حذف بياناتك في أي وقت.
      </div>

      <Section num="١" title="من نحن">
        <p>وصال هي منصة يمنية متخصصة في خدمات التوصيل، تشمل توصيل الطلبات من المطاعم والمتاجر وإيصالها لباب العميل داخل اليمن. نتخذ من اليمن مقراً لنا ونلتزم بالقوانين اليمنية المعمول بها.</p>
      </Section>

      <Section num="٢" title="البيانات التي نجمعها">
        <p>نجمع البيانات التالية عند استخدامك للمنصة:</p>
        <ul className="list-disc list-inside space-y-1.5 mr-2">
          <li><strong>بيانات الحساب:</strong> رقم الهاتف أو بريد Google، والاسم الكامل</li>
          <li><strong>بيانات الموقع:</strong> موقعك عند طلب خدمة التوصيل (بإذنك فقط)</li>
          <li><strong>بيانات الطلبات:</strong> عناوين الاستلام والتسليم، محتوى الطلبات، تواريخ الطلبات</li>
          <li><strong>بيانات الدفع:</strong> نوع الدفع (نقدي أو إلكتروني) — لا نخزّن بيانات البطاقات البنكية مباشرةً</li>
          <li><strong>بيانات الجهاز:</strong> نوع المتصفح، نظام التشغيل، لأغراض أمنية وتحسين الأداء</li>
          <li><strong>سجل التواصل:</strong> رسائلك مع خدمة العملاء</li>
        </ul>
      </Section>

      <Section num="٣" title="كيف نستخدم بياناتك">
        <p>نستخدم بياناتك فقط للأغراض التالية:</p>
        <ul className="list-disc list-inside space-y-1.5 mr-2">
          <li>معالجة طلباتك وتوصيلها بدقة وفي الوقت المناسب</li>
          <li>التواصل معك بشأن حالة طلباتك عبر الإشعارات والرسائل</li>
          <li>حماية حسابك والتحقق من هويتك عند تسجيل الدخول</li>
          <li>تحسين جودة الخدمة وتطوير الميزات بناءً على أنماط الاستخدام</li>
          <li>الامتثال للمتطلبات القانونية والتنظيمية</li>
          <li>إرسال إشعارات العروض والتحديثات (يمكنك إيقافها من الإعدادات)</li>
        </ul>
      </Section>

      <Section num="٤" title="مشاركة البيانات مع الأطراف الثالثة">
        <p><strong>لا نبيع بياناتك لأي طرف ثالث.</strong> نشارك البيانات في الحالات التالية فقط:</p>
        <ul className="list-disc list-inside space-y-1.5 mr-2">
          <li><strong>السائقون وشركات التوصيل:</strong> لإتمام طلبك (الاسم ورقم الهاتف وعنوان التسليم)</li>
          <li><strong>المطاعم والمتاجر:</strong> تفاصيل طلبك لتحضيره وتسليمه</li>
          <li><strong>مزودو الخدمات التقنية:</strong> مثل Supabase لقواعد البيانات، OneSignal للإشعارات — بموجب اتفاقيات صارمة</li>
          <li><strong>الجهات القانونية:</strong> عند وجود أمر قضائي أو متطلب قانوني ملزم</li>
        </ul>
      </Section>

      <Section num="٥" title="حماية البيانات وأمنها">
        <ul className="list-disc list-inside space-y-1.5 mr-2">
          <li>تُشفَّر بياناتك أثناء النقل باستخدام بروتوكول HTTPS</li>
          <li>تُخزَّن البيانات على خوادم آمنة مع تحكم صارم في الوصول</li>
          <li>يُستخدم التحقق برمز SMS لتأمين تسجيل الدخول</li>
          <li>نراجع إجراءات الأمان بشكل دوري</li>
          <li>في حالة أي اختراق أمني، سنُخطرك خلال 72 ساعة</li>
        </ul>
      </Section>

      <Section num="٦" title="حقوقك">
        <p>لديك الحق في:</p>
        <ul className="list-disc list-inside space-y-1.5 mr-2">
          <li><strong>الاطلاع:</strong> معرفة البيانات التي نحتفظ بها عنك</li>
          <li><strong>التصحيح:</strong> تعديل أي بيانات غير دقيقة عبر إعدادات الحساب</li>
          <li><strong>الحذف:</strong> طلب حذف حسابك وجميع بياناتك</li>
          <li><strong>إيقاف الإشعارات التسويقية:</strong> من إعدادات الإشعارات في التطبيق</li>
          <li><strong>نقل البيانات:</strong> طلب نسخة من بياناتك بصيغة قابلة للقراءة</li>
        </ul>
        <p>لممارسة هذه الحقوق، تواصل معنا عبر صفحة <a href="/contact" className="text-primary hover:underline">الدعم</a>.</p>
      </Section>

      <Section num="٧" title="ملفات الارتباط (Cookies)">
        <p>نستخدم ملفات الارتباط لأغراض ضرورية فقط مثل الحفاظ على جلسة تسجيل الدخول وتذكر تفضيلاتك. يمكنك إدارة هذه الملفات عبر إعدادات متصفحك.</p>
      </Section>

      <Section num="٨" title="التغييرات على هذه السياسة">
        <p>قد نحدّث هذه السياسة من وقت لآخر. سنُخطرك بأي تغييرات جوهرية عبر إشعار داخل التطبيق قبل ٧ أيام من سريانها. استمرار استخدامك للمنصة بعد التغييرات يُعدّ موافقةً ضمنية.</p>
      </Section>

      <Section num="٩" title="التواصل معنا">
        <p>لأي استفسارات حول الخصوصية أو ممارسة حقوقك، تواصل معنا عبر:</p>
        <ul className="list-disc list-inside space-y-1.5 mr-2">
          <li>صفحة <a href="/contact" className="text-primary hover:underline">الدعم والتواصل</a> داخل التطبيق</li>
          <li>أو عبر قسم "الدعم الفني" في إعدادات حسابك</li>
        </ul>
      </Section>
    </div>
  </div>
);

export default PrivacyPage;
