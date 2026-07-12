---
name: Web Push VAPID keys
description: VAPID key pair and Web Push system setup for Wasal — where keys are stored and what still needs manual deployment.
---

## Keys (generated 2026-07-12, P-256 ECDSA)
- `VITE_VAPID_PUBLIC_KEY` — stored in Replit shared env vars (frontend uses this as applicationServerKey)
- `VAPID_PUBLIC_KEY` — same value, also in Replit shared env vars
- `VAPID_PRIVATE_KEY` — PKCS8 base64, stored in Replit shared env vars; MUST also be set in Supabase Edge Function secrets

**Why:** Replit env vars are accessible to vite builds via `import.meta.env.VITE_*`. But Supabase Edge Functions have their own secrets system — they can only see secrets set via supabase CLI `supabase secrets set` or the Supabase dashboard under Project Settings > Edge Functions.

**How to apply:** When rebuilding or if keys need rotation, regenerate with:
```bash
node -e "
const {webcrypto}=require('crypto');const{subtle}=webcrypto;
(async()=>{
  const kp=await subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']);
  const pub=Buffer.from(await subtle.exportKey('raw',kp.publicKey)).toString('base64url');
  const priv=Buffer.from(await subtle.exportKey('pkcs8',kp.privateKey)).toString('base64');
  console.log('PUBLIC='+pub);console.log('PRIVATE='+priv);
})()"
```

## Architecture
- **Frontend** (`src/lib/pushSubscription.ts`): `subscribeToPush(userId)` requests permission once, subscribes via `pushManager.subscribe()`, upserts to `push_subscriptions` table.
- **AuthContext** (`src/contexts/AuthContext.tsx`): calls `subscribeToPush(user.id)` after login; calls `unsubscribeFromPush(user.id)` on sign-out.
- **Service Worker** (`src/sw.ts`): handles `push` events → `showNotification()`; handles `notificationclick` → `clients.openWindow(url)`. Uses `injectManifest` strategy (vite-plugin-pwa v1.x).
- **Edge Function** (`supabase/functions/send-push-notification/index.ts`): Full VAPID + AES-128-GCM (RFC 8291) implemented via Web Crypto API (no npm web-push). Reads `VAPID_PRIVATE_KEY` and `VAPID_PUBLIC_KEY` from Deno.env. Auto-deletes expired subscriptions (HTTP 410/404).

## Pending manual steps (user must do)
1. **Run migration** in Supabase dashboard SQL editor:
   - File: `artifacts/wasal/supabase/migrations/031_push_subscriptions.sql`
2. **Deploy Edge Function**:
   ```bash
   supabase functions deploy send-push-notification --project-ref hhqhoqwpebnmfuhwhllw
   ```
3. **Set Supabase Edge Function secrets**:
   ```bash
   supabase secrets set VAPID_PRIVATE_KEY="<value from Replit env>" VAPID_PUBLIC_KEY="<value from Replit env>" --project-ref hhqhoqwpebnmfuhwhllw
   ```
