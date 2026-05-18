import BackButton from "@/components/common/BackButton";

const Section = ({ num, title, children }: { num: string; title: string; children: React.ReactNode }) => (
  <section className="space-y-3">
    <h2 className="text-lg font-bold text-foreground border-r-4 border-primary pr-3">{num}. {title}</h2>
    <div className="text-muted-foreground leading-7 space-y-2 pr-1">{children}</div>
  </section>
);

const TermsPage = () => (
  <div className="container mx-auto px-4 py-10 max-w-3xl" dir="rtl">
    <BackButton />
    <div className="mt-4 mb-8">
      <h1 className="text-3xl font-black text-foreground mb-2">الشروط والأحكام</h1>
      <p className="text-sm text-muted-foreground">آخر تحديث: مايو ٢٠٢٦ — تُطبَّق على عملاء منصة وصال</p>
    </div>

    <div className="space-y-8">
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-5 text-sm text-foreground leading-7">
        باستخدامك لتطبيق وصال أو التسجيل فيه، فإنك توافق على هذه الشروط. يُرجى قراءتها بعناية قبل المتابعة. إذا كنت لا توافق، يُرجى عدم استخدام الخدمة.
      </div>

      <Section num="١" title="تعريف الخدمة">
        <p>وصال منصة رقمية يمنية تُيسّر خدمات التوصيل والنقل، وتشمل:</p>
        <ul className="list-disc list-inside space-y-1.5 mr-2">
          <li>توصيل الطرود والشحنات داخل اليمن</li>
          <li>طلب سيارات الأجرة والنقل بين المناطق</li>
          <li>توصيل الطلبات من المطاعم والمحلات التجارية</li>
          <li>تتبع الطلبات في الوقت الفعلي</li>
        </ul>
        <p>وصال وسيطٌ بين العملاء ومزودي الخدمة (سائقون، شركات توصيل، مطاعم) وليست مسؤولةً مباشرةً عن تقديم الخدمة الميدانية.</p>
      </Section>

      <Section num="٢" title="الأهلية واستخدام الحساب">
        <ul className="list-disc list-inside space-y-1.5 mr-2">
          <li>يجب أن يكون عمرك ١٦ سنة فأكثر لاستخدام المنصة</li>
          <li>أنت مسؤول عن الحفاظ على سرية بيانات حسابك</li>
          <li>يُمنع استخدام الحساب من قِبل شخص آخر دون إذنك</li>
          <li>يجب أن تكون المعلومات التي تقدمها عند التسجيل صحيحة ومحدّثة</li>
          <li>تحتفظ وصال بحق تعليق الحسابات التي تنتهك هذه الشروط</li>
        </ul>
      </Section>

      <Section num="٣" title="إجراء الطلبات والأسعار">
        <ul className="list-disc list-inside space-y-1.5 mr-2">
          <li>الأسعار المعروضة عند الطلب هي الأسعار النهائية ما لم يُذكر خلاف ذلك</li>
          <li>قد تختلف الأسعار بحسب المسافة والوقت ومستوى الطلب</li>
          <li>تحتفظ المنصة بحق تعديل التعرفات مع إشعار مسبق لا يقل عن ٧ أيام</li>
          <li>في حالة الطرود: يُحسب السعر وفق الوزن والأبعاد والمسافة</li>
        </ul>
      </Section>

      <Section num="٤" title="الإلغاء والاسترداد">
        <ul className="list-disc list-inside space-y-1.5 mr-2">
          <li><strong>قبل قبول الطلب:</strong> يمكن الإلغاء مجاناً بالكامل</li>
          <li><strong>بعد قبول السائق:</strong> قد تُطبَّق رسوم إلغاء تتراوح بين ٥٠٠ و١٠٠٠ ريال يمني</li>
          <li><strong>الطلبات التالفة أو الناقصة:</strong> أبلغنا خلال ٢٤ ساعة من الاستلام للنظر في التعويض</li>
          <li><strong>حالات القوة القاهرة</strong> (حصار، كوارث طبيعية): لا تُطبَّق رسوم إلغاء</li>
        </ul>
      </Section>

      <Section num="٥" title="التزامات المستخدم">
        <p>بموجب هذه الشروط، تلتزم بما يلي:</p>
        <ul className="list-disc list-inside space-y-1.5 mr-2">
          <li>عدم استخدام المنصة لنقل مواد مخالفة للقانون أو محظورة شرعاً</li>
          <li>التواجد في عنوان الاستلام خلال الوقت المتفق عليه</li>
          <li>التعامل مع السائقين والموظفين بأسلوب محترم ولائق</li>
          <li>تقديم معلومات دقيقة عن محتوى الشحنات</li>
          <li>عدم محاولة خداع المنصة أو التلاعب بنظام التقييمات</li>
        </ul>
      </Section>

      <Section num="٦" title="المسؤولية والضمانات">
        <ul className="list-disc list-inside space-y-1.5 mr-2">
          <li>وصال مسؤولة عن ضمان إتاحة الخدمة وجودة الوساطة بين الأطراف</li>
          <li>مزودو الخدمة (السائقون والشركات) مسؤولون مباشرةً عن سلامة الشحنات خلال النقل</li>
          <li>لا تتحمل وصال مسؤولية التأخير الناتج عن ظروف خارج سيطرتها (حواجز، أعطال، طوارئ)</li>
          <li>الحد الأقصى للتعويض عن الطرود التالفة: قيمة الطرد المُعلنة أو ٥٠,٠٠٠ ريال أيهما أقل</li>
        </ul>
      </Section>

      <Section num="٧" title="الملكية الفكرية">
        <p>جميع محتويات المنصة من تصاميم وشعارات وكود برمجي هي ملكية خالصة لوصال. يُحظر نسخها أو استخدامها تجارياً دون إذن كتابي مسبق.</p>
      </Section>

      <Section num="٨" title="القانون المطبّق وحل النزاعات">
        <p>تخضع هذه الشروط للقانون اليمني. في حالة نشوء أي نزاع، يُفضَّل حله وُدّياً أولاً عبر فريق الدعم. إذا تعذّر ذلك، تختص المحاكم اليمنية بالفصل في النزاع.</p>
      </Section>

      <Section num="٩" title="تعديل الشروط">
        <p>يحق لوصال تعديل هذه الشروط في أي وقت. سيتم إشعارك بالتغييرات الجوهرية عبر إشعار داخل التطبيق قبل ٧ أيام من تطبيقها. استمرار استخدامك بعد سريانها يُعدّ موافقةً.</p>
      </Section>

      <div className="border-t border-border pt-6">
        <p className="text-sm text-muted-foreground text-center">
          هل أنت شركة توصيل؟{" "}
          <a href="/terms/company" className="text-primary font-semibold hover:underline">
            اطلع على شروط الشركاء
          </a>
        </p>
      </div>
    </div>
  </div>
);

export default TermsPage;
