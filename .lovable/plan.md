

## خطة إصلاح الربط والمسارات (System Integration Fix)

### المشكلات المحددة والحلول

---

### 1. نظام الموافقات المالية (Payment Approval in Delivery Finance)

**المشكلة:** صفحة `DeliveryFinance` تعرض فقط الطلبات المكتملة (`delivered`) ولا تعرض المعاملات المالية الفعلية من جدول `financial_transactions` أو `payment_transactions`.

**الحل:**
- تعديل `src/pages/delivery/DeliveryFinance.tsx`:
  - إضافة fetch لـ `financial_transactions` حيث `partner_id = user.id`
  - عرض جدول "أحدث المعاملات" مع بيانات الدفع الفعلية (نوع الدفع، حالة التأكيد، صورة الإيصال)
  - إضافة زر **"موافقة على المعاملة"** لكل معاملة حالتها `pending`
  - عند الضغط: تحديث `payment_status` إلى `confirmed` في `financial_transactions` و `payment_transactions`
  - إرسال إشعار لحظي للعميل عبر `sendPushNotification` بعنوان "تمت الموافقة على دفعتك ✅"
- إضافة listener في `RealtimeToastListener` لإشعار الشركة عند وصول معاملة جديدة (مراقبة `INSERT` على `financial_transactions`)

---

### 2. إصلاح روابط دعوة المندوبين (Invite Links)

**المشكلة الجذرية:** كود `DeliveryRiders.tsx` يولد الدعوة بدور `delivery_driver`، لكن `InvitePage.tsx` لا يتعرف على هذا الدور — `roleLabels` يحتوي فقط على `supplier`, `delivery_company`, `driver`.

**الحل:**
- تعديل `src/pages/InvitePage.tsx`:
  - إضافة `delivery_driver` إلى `roleLabels`: `"delivery_driver": "مندوب توصيل"`
  - إضافة `delivery_driver` إلى `roleIcons`: أيقونة `Bike`
  - معاملة `delivery_driver` مثل `driver` في نموذج التسجيل (عرض حقول الهوية والمركبة)
  - بعد إنشاء الحساب: ربط المندوب بالشركة عبر إدخال سجل في جدول `riders` باستخدام `created_by` من `invitation_tokens` كـ `delivery_company_id`
- تعديل `DeliveryRiders.tsx`:
  - استخدام `window.location.origin` بدلاً من رابط lovable الداخلي (هذا موجود فعلاً ✅)

---

### 3. فلترة المحتوى بالمدينة (City Filter)

**المشكلة:** جدول `restaurants` لا يحتوي على عمود `city`. لا يوجد أي ربط بالمدينة.

**الحل:**
- **Migration:** إضافة عمود `city TEXT` لجدول `restaurants`
- تعديل `src/lib/restaurantApi.ts` > `getActiveRestaurants`:
  - إضافة parameter اختياري `city?: string`
  - إذا تم تمرير المدينة، إضافة `.eq("city", city)` للاستعلام
- تعديل `src/pages/customer/RestaurantsPage.tsx`:
  - جلب مدينة العميل من `profiles` عبر `useAuth`
  - تمرير المدينة لـ `getActiveRestaurants(city)`
  - إضافة مرشح مدينة في الواجهة إذا أراد العميل تغيير المدينة

---

### 4. تحسين واجهة المطاعم (UI Enhancement)

**الحل:** تعديل `src/pages/customer/RestaurantsPage.tsx`:
- تطبيق **تدرج لوني** خفيف للخلفية (من ذهبي شفاف لأسود راقي)
- بطاقات بـ **ظلال ناعمة** (`shadow-lg`) و **حواف مستديرة** (`rounded-2xl`)
- تأثير `hover`: رفع البطاقة (`hover:-translate-y-1`) مع تغيير لون الحدود (`hover:border-primary/30`)
- إضافة تأثير **glassmorphism** خفيف للبطاقات المميزة
- تحسين عرض الصور مع overlay gradient للنص
- استخدام ألوان محفزة للشهية (أحمر/برتقالي خفيف) في badges المطبخ

---

### ملخص الملفات المتأثرة

| الملف | التغيير |
|-------|---------|
| `src/pages/delivery/DeliveryFinance.tsx` | إضافة جدول المعاملات المالية + زر الموافقة |
| `src/pages/InvitePage.tsx` | دعم دور `delivery_driver` + ربط بالشركة |
| `src/pages/customer/RestaurantsPage.tsx` | فلترة المدينة + تحسين UI |
| `src/lib/restaurantApi.ts` | إضافة فلتر المدينة |
| `src/components/notifications/RealtimeToastListener.tsx` | إشعار الشركة بمعاملة جديدة |
| **Migration** | إضافة `city` لجدول `restaurants` |

