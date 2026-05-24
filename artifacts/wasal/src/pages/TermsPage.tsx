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
      <p className="text-sm text-muted-foreground">آخر تحديث: مايو ٢٠٢٦ — تُطبَّق على عملاء منصة وصل</p>
    </div>

    <div className="space-y-8">
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-5 text-sm text-foreground leading-7">
        باستخدامك لتطبيق وصل أو التسجيل فيه، فإنك توافق على هذه الشروط. يُرجى قراءتها بعناية قبل المتابعة. إذا كنت لا توافق، يُرجى عدم استخدام الخدمة.
      </div>

      <Section num="١" title="تعريف الخدمة">
        <p>وصل منصة رقمية يمنية تُيسّر خدمات التوصيل، وتشمل:</p>
        <ul className="list-disc list-inside space-y-1.5 mr-2">
          <li>توصيل الطلبات من المطاعم والمحلات التجارية</li>
          <li>تتبع الطلبات في الوقت الفعلي</li>
          <li>دعم العملاء والمتابعة الفورية</li>
        </ul>
        <p>وصل وسيطٌ بين العملاء ومزودي الخدمة (شركات التوصيل، المطاعم) وليست مسؤولةً مباشرةً عن تقديم الخدمة الميدانية.</p>
      </Section>

      <Section num="٢" title="الأهلية واستخدام الحساب">
        <ul className="list-disc list-inside space-y-1.5 mr-2">
          <li>يجب أن يكون عمرك ١٦ سنة فأكثر لاستخدام المنصة</li>
          <li>أنت مسؤول عن الحفاظ على سرية بيانات حسابك</li>
          <li>يُمنع استخدام الحساب من قِبل شخص آخر دون إذنك</li>
          <li>يجب أن تكون المعلومات التي تقدمها عند التسجيل صحيحة ومحدّثة</li>
          <li>تحتفظ وصل بحق تعليق الحسابات التي تنتهك هذه الشروط</li>
        </ul>
      </Section>

      <Section num="٣" title="إجراء الطلبات والأسعار">
        <ul className="list-disc list-inside space-y-1.5 mr-2">
          <li>الأسعار المعروضة عند الطلب هي الأسعار النهائية ما لم يُذكر خلاف ذلك</li>
          <li>قد تختلف رسوم التوصيل بحسب المسافة والوقت ومستوى الطلب</li>
          <li>تحتفظ المنصة بحق تعديل التعرفات مع إشعار مسبق لا يقل عن ٧ أيام</li>
        </ul>
      </Section>

      <Section num="٤" title="الإلغاء والاسترداد">
        <ul className="list-disc list-inside space-y-1.5 mr-2">
          <li><strong>قبل قبول الطلب:</strong> يمكن الإلغاء مجاناً بالكامل</li>
          <li><strong>بعد قبول المطعم للطلب:</strong> قد تُطبَّق رسوم إلغاء تتراوح بين ٥٠٠ و١٠٠٠ ريال يمني</li>
          <li><strong>الطلبات الناقصة أو التالفة:</strong> أبلغنا خلال ٢٤ ساعة من الاستلام للنظر في التعويض</li>
          <li><strong>حالات القوة القاهرة</strong> (كوارث طبيعية، ظروف طارئة): لا تُطبَّق رسوم إلغاء</li>
        </ul>
      </Section>

      <Section num="٥" title="التزامات المستخدم">
        <p>بموجب هذه الشروط، تلتزم بما يلي:</p>
        <ul className="list-disc list-inside space-y-1.5 mr-2">
          <li>عدم استخدام المنصة لطلب مواد مخالفة للقانون أو محظورة شرعاً</li>
          <li>التواجد في عنوان الاستلام خلال الوقت المتفق عليه</li>
          <li>التعامل مع مندوبي التوصيل والموظفين بأسلوب محترم ولائق</li>
          <li>عدم محاولة خداع المنصة أو التلاعب بنظام التقييمات</li>
        </ul>
      </Section>

      <Section num="٦" title="المسؤولية والضمانات">
        <ul className="list-disc list-inside space-y-1.5 mr-2">
          <li>وصل مسؤولة عن ضمان إتاحة الخدمة وجودة الوساطة بين الأطراف</li>
          <li>شركات التوصيل مسؤولة مباشرةً عن سلامة الطلبات خلال التوصيل</li>
          <li>لا تتحمل وصل مسؤولية التأخير الناتج عن ظروف خارج سيطرتها (حواجز، أعطال، طوارئ)</li>
        </ul>
      </Section>

      <Section num="٧" title="الملكية الفكرية">
        <p>جميع محتويات المنصة من تصاميم وشعارات وكود برمجي هي ملكية خالصة لوصل. يُحظر نسخها أو استخدامها تجارياً دون إذن كتابي مسبق.</p>
      </Section>

      <Section num="٨" title="القانون المطبّق وحل النزاعات">
        <p>تخضع هذه الشروط للقانون اليمني. في حالة نشوء أي نزاع، يُفضَّل حله وُدّياً أولاً عبر فريق الدعم. إذا تعذّر ذلك، تختص المحاكم اليمنية بالفصل في النزاع.</p>
      </Section>

      <Section num="٩" title="تعديل الشروط">
        <p>يحق لوصل تعديل هذه الشروط في أي وقت. سيتم إشعارك بالتغييرات الجوهرية عبر إشعار داخل التطبيق قبل ٧ أيام من تطبيقها. استمرار استخدامك بعد سريانها يُعدّ موافقةً.</p>
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
