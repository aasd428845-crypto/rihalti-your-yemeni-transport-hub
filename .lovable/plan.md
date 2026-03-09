

# خطة إصلاح وتفعيل نظام الدفع المتكامل

## المشكلة الرئيسية
1. مسار صفحة الدفع في `App.tsx` هو `/payment` بدون parameters، لكن `PaymentPage` يستخدم `useParams<{ entityType, entityId }>` — لذلك الصفحة لا تعمل أبداً
2. صفحات الحجز (TripDetailsPage, CheckoutPage) توجّه المستخدم إلى `/history` بعد الحجز بدلاً من صفحة الدفع
3. صفحة طلب المطعم (RestaurantCheckoutPage) لا توجّه إلى صفحة الدفع
4. لا يوجد ربط بين الحجز وصفحة الدفع في أي مكان

## التغييرات المطلوبة

### 1. إصلاح المسار في App.tsx
- تغيير `/payment` إلى `/payment/:entityType/:entityId`
- إبقاء `/payment-success` كما هو

### 2. تعديل TripDetailsPage
- بعد `createBooking` بنجاح، التوجيه إلى `/payment/booking/${booking.id}` بدلاً من `/history`
- إزالة اختيار طريقة الدفع من هذه الصفحة (سيكون في صفحة الدفع)

### 3. تعديل CheckoutPage
- بعد `createBooking` بنجاح، التوجيه إلى `/payment/booking/${booking.id}` بدلاً من `/history`
- إزالة اختيار طريقة الدفع (سيكون في صفحة الدفع الموحدة)

### 4. تعديل RestaurantCheckoutPage
- بعد إنشاء الطلب بنجاح، التوجيه إلى `/payment/delivery/${order.id}`

### 5. تحسين PaymentPage
- التأكد من دعم جميع أنواع الكيانات (booking, shipment, delivery, ride)
- عرض تفاصيل مناسبة لكل نوع خدمة (اسم الرحلة، المدينة، إلخ)
- دعم `entityType = 'delivery'` بشكل صحيح

### 6. لا تغييرات على قاعدة البيانات
- جداول `payment_transactions` و `payment_accounts` موجودة بالفعل
- `AdminPaymentReview` و `SupplierPayments` تعمل بشكل صحيح

## الملفات المتأثرة
- `src/App.tsx` — إصلاح المسار
- `src/pages/customer/TripDetailsPage.tsx` — توجيه إلى صفحة الدفع
- `src/pages/customer/CheckoutPage.tsx` — توجيه إلى صفحة الدفع
- `src/pages/customer/RestaurantCheckoutPage.tsx` — توجيه إلى صفحة الدفع
- `src/pages/customer/PaymentPage.tsx` — تحسين عرض التفاصيل حسب نوع الخدمة

## ما لن يتغير
- لوحة المشرف (AdminPaymentReview) — تعمل بالفعل
- لوحة الشريك (SupplierPayments) — تعمل بالفعل
- PaymentSuccessPage — تعمل بالفعل
- paymentApi.ts — يعمل بالفعل
- هيكل قاعدة البيانات — لا تغيير

