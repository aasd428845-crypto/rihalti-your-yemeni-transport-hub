

# إصلاح صفحة دفع الرحلات - تشخيص المشاكل الحقيقية

## المشاكل المكتشفة

### 1. العميل لا يستطيع رؤية حسابات الشريك البنكية (RLS)
جدول `partner_bank_accounts` محمي بـ RLS ولا يسمح للعملاء بقراءة الحسابات — فقط صاحب الحساب والمشرف. لذلك عند تحميل صفحة الدفع، تعود الحسابات البنكية فارغة ولا يظهر خيار "تحويل إلى حساب صاحب المكتب".

**الحل:** إضافة سياسة SELECT تسمح لأي مستخدم مسجل دخوله بقراءة حسابات الشركاء البنكية.

### 2. العميل لا يستطيع تحديث الحجز ببيانات الدفع (RLS)
جدول `bookings` يسمح للعميل بالإنشاء والقراءة فقط، لكن صفحة الدفع تحاول تحديث الحجز بـ `payment_method`, `payer_name`, `payment_receipt_url` إلخ. هذا يفشل بصمت.

**الحل:** إضافة سياسة UPDATE تسمح للعميل بتحديث حجوزاته الخاصة.

## التغييرات المطلوبة

### Migration SQL
```sql
-- السماح للعملاء بقراءة الحسابات البنكية للشركاء
CREATE POLICY "Authenticated users can view partner bank accounts"
ON public.partner_bank_accounts FOR SELECT
TO authenticated USING (true);

-- السماح للعملاء بتحديث حجوزاتهم
CREATE POLICY "Customers can update own bookings"
ON public.bookings FOR UPDATE
TO public USING (auth.uid() = customer_id)
WITH CHECK (auth.uid() = customer_id);
```

### لا تغييرات على الكود
الكود في `PaymentPage.tsx` و `paymentApi.ts` و `customerApi.ts` صحيح بالفعل. المشكلة كانت فقط في صلاحيات قاعدة البيانات.

