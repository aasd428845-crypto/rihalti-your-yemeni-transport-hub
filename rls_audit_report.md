# تقرير تدقيق RLS — Wasal (Supabase)

التاريخ: 2026-07-09
المصدر: تدقيق مباشر على قاعدة بيانات Supabase الحية (schema `public`) عبر `information_schema`, `pg_class`, `pg_policies` — وليس فقط ملفات migrations.
الملف المطبّق: `artifacts/wasal/supabase/migrations/020_rls_audit_and_consolidation.sql` (تم تطبيقه فعليًا على القاعدة).

## ملخص النتائج

- عدد الجداول في `public`: 95
- جميع الجداول لديها RLS مفعّل (`relrowsecurity = true`) — لا يوجد جدول بدون RLS.
- عدد السياسات (policies) الكلي قبل التعديل: 325 سياسة، بعضها مكرر بأسماء مختلفة لنفس الغرض (بقايا من عدة migrations متراكبة عبر الزمن).
- لم يتم حذف أو تعديل أي ملف migration قديم. الإصلاحات كلها أُضيفت في ملف جديد واحد.

## 1. `financial_transactions` — تم قفله بالكامل على service_role فقط (كما طُلب)

كانت هناك 4 سياسات فعّالة تسمح بوصول عبر anon/authenticated:

| السياسة | النوع | الشرط |
|---|---|---|
| Admins full access financial_transactions | ALL | admin role |
| Admins manage financial_transactions (مكررة) | ALL | admin role |
| Partners view own financial_transactions | SELECT | `partner_id = auth.uid()` |
| Users view own financial_transactions | SELECT | `customer_id/partner_id = auth.uid()` |

**التغيير:** تم حذف السياسات الأربع، وتفعيل `FORCE ROW LEVEL SECURITY`، وسحب (`REVOKE`) كل الصلاحيات من `anon` و`authenticated` على الجدول. النتيجة: صفر سياسات = صفر وصول لأي مستخدم عادي أو أدمن من طرف العميل (client-side)، والوصول أصبح حصريًا عبر الباك-إند باستخدام مفتاح `service_role` الذي يتجاوز RLS بشكل افتراضي في Supabase.

**تنبيه مهم:** إذا كان الفرونت-إند الحالي (الذي لم يُلمس في هذه المهمة) يقرأ من `financial_transactions` مباشرة عبر Supabase client (anon/authenticated key)، فهذه الاستعلامات ستتوقف عن إرجاع أي صفوف بعد هذا التغيير. أي شاشة تعرض للمستخدم/الشريك سجلاته المالية يجب أن تمر عبر endpoint خلفي (API) يستخدم `service_role`. هذا تم تطبيقه بناءً على طلبك الصريح، لكنه قد يتطلب متابعة على مستوى الفرونت-إند لاحقًا إذا كانت هذه الشاشات موجودة فعليًا.

## 2. ثغرات إضافية حرجة تم إصلاحها في جداول حساسة أخرى

أثناء الفحص وُجدت سياسات "true" مفتوحة بالكامل على جداول تحتوي بيانات مالية/حساسة، أي أن أي مستخدم مسجّل (وأحيانًا حتى غير مسجّل) كان بإمكانه قراءة بيانات لا تخصه:

| الجدول | السياسة المحذوفة | الخطورة | لماذا خطيرة |
|---|---|---|---|
| `partner_bank_accounts` | Authenticated users can view partner bank accounts (`qual: true`) | حرجة | أي مستخدم مسجّل دخول يقدر يشوف الحسابات البنكية/الآيبان لكل الشركاء (مطاعم/موردين/شركات توصيل) |
| `platform_bank_accounts` | Authenticated view platform bank accounts (`qual: true`) | حرجة | أي مستخدم مسجّل يقدر يشوف حسابات المنصة البنكية الخاصة بالشركة نفسها |
| `admin_settings` | Authenticated users can read settings (`qual: true`) | متوسطة-عالية | أي مستخدم مسجّل يقدر يقرأ كامل إعدادات الإدارة الداخلية |
| `invitation_tokens` | anon_read_invite_tokens (`roles: anon, authenticated`, `qual: true`) | حرجة | أي شخص حتى بدون تسجيل دخول يقدر يقرأ كل توكنات الدعوة لكل الحسابات — يفتح الباب لتزوير عضويات |
| `invitation_tokens` | auth_update_invite_tokens (`qual: true`, `with_check: true`) | حرجة | أي مستخدم مسجّل يقدر يعدّل أي توكن دعوة يخص أي جهة أخرى (مثلاً يعلّمه كمستخدَم أو يغيّر بياناته) |

في كل الحالات أعلاه، تم حذف السياسة الخطيرة فقط والإبقاء على السياسات الآمنة الموجودة أصلاً (مثل: الشريك يدير حساباته البنكية الخاصة به فقط، الأدمن له وصول كامل، الشركة ترى دعواتها فقط، إلخ) — لم يتم تعطيل أي وظيفة شرعية.

## 3. ملاحظات لم يتم التعديل عليها (تحتاج قرار منتج)

- **`partner_settings`**: سياسة "Authenticated read partner settings" (`qual: true`) تسمح لأي مستخدم مسجّل بقراءة إعدادات كل الشركاء. لم يتم حذفها لأنها قد تكون مقصودة لعرض معلومات عامة عن الشريك (مثل ساعات العمل)، لكنها تستحق مراجعة: إذا كان الجدول يحتوي حقول حساسة (مثل نسب العمولة الخاصة)، يجب فصلها لجدول عام منفصل أو تقييد الأعمدة المعروضة عبر view.
- **`rider_earnings`**: RLS مفعّل لكن **لا توجد أي سياسة (policy) عليه إطلاقًا**. هذا آمن حاليًا افتراضيًا (RLS بدون سياسات = رفض كل شيء لغير service_role)، لكن يعني أيضًا أن السائقين لا يقدرون يشوفون أرباحهم مباشرة من التطبيق (إن كان هذا مطلوبًا، يحتاج سياسة SELECT مخصصة لهم أو endpoint خلفي).
- ملفات SQL متفرقة خارج مجلد migrations الرسمي (`database_updates.sql`, `wasal_rider_rls_fix.sql`, `supabase_migration.sql`, ملفات `attached_assets/wasl_schema_*.sql`) لم يتم لمسها أو تطبيقها — هذه ملفات تاريخية/مسودات، والقاعدة الحية لا تعكسها بالضرورة. يُنصح بأرشفتها أو حذفها لاحقًا لتقليل الالتباس، لكن هذا قرار منفصل عن هذه المهمة.
- وُجد تكرار في ترقيم الملفات (`010_missing_offers_schema.sql` و`010_rls_order_lockdown.sql`) — لم يُعدَّل لأن التعليمات كانت بعدم لمس الملفات القديمة.

## الخلاصة

- تم تطبيق ملف migration واحد جديد فقط: `020_rls_audit_and_consolidation.sql`.
- لم يُحذف أو يُعدَّل أي ملف migration قديم.
- لم يُلمس أي كود فرونت-إند.
- `financial_transactions` أصبح مقفول 100% على `service_role`.
- تم إغلاق 5 ثغرات إضافية حرجة/عالية الخطورة في جداول الحسابات البنكية، إعدادات الإدارة، وتوكنات الدعوة.
