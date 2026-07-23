---
name: Web Push VAPID keys
description: VAPID key pair and Web Push system setup for Wasal — where keys are stored, how the Edge Function sends notifications, and how to deploy it.
---

## Keys (generated 2026-07-12, P-256 ECDSA)
- `VITE_VAPID_PUBLIC_KEY` — stored in Replit shared env vars (frontend uses this as applicationServerKey)
- `VAPID_PUBLIC_KEY` — same value, also in Replit shared env vars; MUST also be set in Supabase Edge Function secrets
- `VAPID_PRIVATE_KEY` — **PKCS8 base64**, stored in Replit shared env vars; MUST also be set in Supabase Edge Function secrets

**Why:** Replit env vars are accessible to vite builds via `import.meta.env.VITE_*`. Supabase Edge Functions have their own secrets system and can only see secrets set via the Supabase dashboard under Project Settings > Edge Functions or the Management API.

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
- **Edge Function** (`supabase/functions/send-push-notification/index.ts`): Uses the standard `npm:web-push@3.6.7` library. It converts the PKCS8-formatted `VAPID_PRIVATE_KEY` to the raw 32-byte key web-push expects by importing via Web Crypto and exporting as JWK (`jwk.d`). Reads `VAPID_PRIVATE_KEY` and `VAPID_PUBLIC_KEY` from `Deno.env`. Auto-deletes expired subscriptions (HTTP 404/410 from web-push errors).

## Key compatibility note
`web-push` expects the private key to be 32 bytes when decoded as URL-safe base64. The stored `VAPID_PRIVATE_KEY` is PKCS8 (138 bytes decoded). The Edge Function extracts the raw key at runtime using `crypto.subtle.importKey('pkcs8', ...)` followed by `exportKey('jwk', ...)`. Do not pass the PKCS8 value directly to `webpush.setVapidDetails()`.

## Deployment
The Supabase CLI (up to 2.110.0-beta.37) rejects `sbp_v0_` access tokens. Deploy via the Management API instead:
```bash
curl -X POST \
  -H "Authorization: Bearer <SUPABASE_ACCESS_TOKEN>" \
  -F "file=@supabase/functions/send-push-notification/index.ts" \
  -F "file=@supabase/functions/send-push-notification/deno.json" \
  -F 'metadata={"entrypoint_path":"index.ts","import_map_path":"deno.json","verify_jwt":true,"name":"send-push-notification"};type=application/json' \
  "https://api.supabase.com/v1/projects/hhqhoqwpebnmfuhwhllw/functions/deploy?slug=send-push-notification"
```

## Supabase Edge Function secrets
Set these in the Supabase dashboard (Project Settings > Edge Functions > Secrets) or via the Management API:
- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
