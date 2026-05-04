# وصال - منصة النقل الذكية

## نظرة عامة

تطبيق ويب متكامل لمنصة نقل ذكية تشمل: توصيل الطلبات، حجز الرحلات، نقل البضائع، وإدارة المطاعم.

## هيكل المشروع

```
workspace/
├── artifacts/
│   ├── wasal/          # تطبيق الويب الرئيسي (React + Vite + Supabase)
│   ├── api-server/     # API Server (Express 5 + Node.js)
│   └── mockup-sandbox/ # بيئة تصميم المكونات
├── tsconfig.base.json
├── tsconfig.json
├── pnpm-workspace.yaml
└── package.json
```

## Stack

- **Monorepo**: pnpm workspaces
- **Frontend**: React 19 + Vite + TailwindCSS + shadcn/ui
- **Backend**: Express 5 + Node.js 24
- **Database**: Supabase (PostgreSQL) — project: `hhqhoqwpebnmfuhwhllw`
- **Auth**: Supabase Auth + Phone OTP via Traccar SMS Gateway
- **TypeScript**: 5.9 (strict mode)

## الأوامر الرئيسية

- `pnpm --filter @workspace/wasal run typecheck` — فحص أنواع الويب
- `pnpm --filter @workspace/api-server run typecheck` — فحص أنواع API
- `pnpm run typecheck` — فحص شامل

## Artifacts

### وصال - Web App
- **Path**: `artifacts/wasal`
- **Stack**: React + Vite + Supabase
- **Preview**: `/`
- **Features**: Customer portal, Driver dashboard, Delivery management, Restaurant ordering, Admin panel

### API Server
- **Path**: `artifacts/api-server`
- **Stack**: Express 5 + fetch API
- **Preview**: `/api`
- **Routes**: `/api/sms/send`, `/api/sms/verify` (Phone OTP via Traccar)

## متغيرات البيئة المطلوبة

- `SUPABASE_URL` — رابط مشروع Supabase
- `SUPABASE_SERVICE_ROLE_KEY` — مفتاح الخدمة
- `TRACCAR_TOKEN` — مفتاح بوابة الرسائل

## الجداول الجديدة في قاعدة البيانات

- `phone_otps` — رموز التحقق عبر الهاتف
- `delivery_company_offers` — عروض شركات التوصيل
