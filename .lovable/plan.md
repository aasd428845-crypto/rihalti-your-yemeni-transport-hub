

# خطة تحسين صفحة دفع الرحلات (PaymentPage)

## الوضع الحالي
- المسار `/payment/:entityType/:entityId` يعمل ✅
- التوجيه من TripDetailsPage و CheckoutPage إلى `/payment/booking/${id}` يعمل ✅
- صفحة PaymentPage موجودة وتعمل مع كل أنواع الخدمات ✅
- الجداول المطلوبة موجودة: `payment_transactions`, `financial_transactions`, `payment_accounts`, `platform_bank_accounts`, `partner_settings`, `accounting_settings`, `admin_settings` ✅

## ما يحتاج تحسين

### 1. عرض تفاصيل الرحلة والحجز
- حالياً الصفحة تعرض فقط `seat_count` للحجوزات
- يجب جلب بيانات الرحلة (`trips`) والمورد (`profiles`) عند `entityType === "booking"` لعرض: المدينة من/إلى، تاريخ الانطلاق، اسم صاحب المكتب، شركة النقل

### 2. إنشاء financial_transactions بعد الدفع
- حالياً يتم إنشاء `payment_transactions` فقط
- يجب إنشاء `financial_transactions` مع حساب العمولة من جدول `accounting_settings` (حقل `global_commission_booking`)
- الدفع النقدي: `payment_status = 'pending'` (سيُحصّل لاحقاً)
- التحويل البنكي: `payment_status = 'pending'` (بانتظار المراجعة)

### 3. استخدام platform_bank_accounts بدلاً من payment_accounts
- يوجد جدول `platform_bank_accounts` مخصص لحسابات المنصة (يُستخدم في AdminSettings)
- يجب استخدامه كمصدر أساسي لعرض حسابات المنصة البنكية

### 4. جلب إعداد الدفع النقدي من admin_settings
- إضافة جلب `cash_on_delivery_enabled` من `admin_settings` كإعداد عام للنظام
- دمجه مع إعدادات الشريك (`partner_settings.cash_on_delivery_enabled`)

## الملفات المتأثرة
- `src/pages/customer/PaymentPage.tsx` — التعديل الوحيد

## التغييرات التفصيلية في PaymentPage.tsx

1. **إضافة states جديدة**: `tripDetails`, `supplierInfo`, `accountingSettings`, `platformBankAccounts`, `cashEnabled`
2. **تحسين دالة التحميل**: عند `entityType === "booking"`:
   - جلب الرحلة من `trips` باستخدام `entity.trip_id`
   - جلب بيانات المورد من `profiles` باستخدام `trip.supplier_id`
   - جلب حسابات المنصة من `platform_bank_accounts`
   - جلب إعداد النقدي من `admin_settings` (key: `cash_on_delivery_enabled`)
   - جلب نسبة العمولة من `accounting_settings`
3. **تحسين ملخص المعاملة**: عرض مدن الرحلة، التاريخ، عدد المقاعد، اسم صاحب المكتب
4. **تحسين خيارات الدفع**: إضافة "نقداً عند الصعود" مع تسمية مناسبة للرحلات
5. **إنشاء financial_transactions**: بعد إنشاء `payment_transactions`، إنشاء سجل مالي بالعمولة المحسوبة من `accounting_settings`
6. **عرض حسابات المنصة**: من `platform_bank_accounts` بدلاً من `payment_accounts`

## لا تغييرات على
- قاعدة البيانات (كل الجداول موجودة)
- باقي الصفحات (TripDetailsPage, CheckoutPage, Admin, Supplier)
- المسارات في App.tsx

