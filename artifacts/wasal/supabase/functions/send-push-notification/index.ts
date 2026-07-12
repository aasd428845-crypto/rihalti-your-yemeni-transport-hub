import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const VAPID_SUBJECT = "mailto:admin@wasal.app";

function base64urlToUint8Array(b64url: string): Uint8Array {
  const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/");
  const padded = b64.padEnd(b64.length + (4 - (b64.length % 4)) % 4, "=");
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
}

function uint8ArrayToBase64url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

function derToRaw(der: Uint8Array): Uint8Array {
  let i = 2;
  if (der[1] & 0x80) i += der[1] & 0x7f;
  i++;
  const rLen = der[i++];
  const r = der.slice(i, i + rLen);
  i += rLen;
  i++;
  const sLen = der[i++];
  const s = der.slice(i, i + sLen);

  const raw = new Uint8Array(64);
  const rTrimmed = r.length > 32 ? r.slice(r.length - 32) : r;
  raw.set(rTrimmed, 32 - rTrimmed.length);
  const sTrimmed = s.length > 32 ? s.slice(s.length - 32) : s;
  raw.set(sTrimmed, 64 - sTrimmed.length);
  return raw;
}

async function hkdf(
  salt: Uint8Array,
  ikm: Uint8Array,
  info: Uint8Array,
  length: number
): Promise<Uint8Array> {
  const keyMaterial = await crypto.subtle.importKey("raw", ikm, "HKDF", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt, info },
    keyMaterial,
    length * 8
  );
  return new Uint8Array(bits);
}

async function buildVapidJwt(
  endpoint: string,
  vapidPrivateKey: CryptoKey,
  vapidPublicKeyB64url: string
): Promise<string> {
  const url = new URL(endpoint);
  const audience = `${url.protocol}//${url.host}`;
  const exp = Math.floor(Date.now() / 1000) + 12 * 3600;

  const enc = new TextEncoder();
  const header = uint8ArrayToBase64url(enc.encode(JSON.stringify({ alg: "ES256", typ: "JWT" })));
  const payload = uint8ArrayToBase64url(
    enc.encode(JSON.stringify({ aud: audience, exp, sub: VAPID_SUBJECT }))
  );

  const toSign = `${header}.${payload}`;
  const sigDer = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    vapidPrivateKey,
    enc.encode(toSign)
  );

  const sigRaw = derToRaw(new Uint8Array(sigDer));
  return `${toSign}.${uint8ArrayToBase64url(sigRaw)}`;
}

async function encryptPushPayload(
  payload: string,
  keys: { p256dh: string; auth: string }
): Promise<Uint8Array> {
  const enc = new TextEncoder();
  const clientPubRaw = base64urlToUint8Array(keys.p256dh);
  const authSecret = base64urlToUint8Array(keys.auth);

  const clientPublicKey = await crypto.subtle.importKey(
    "raw",
    clientPubRaw,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    []
  );

  const serverKP = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"]
  );
  const serverPubRaw = new Uint8Array(await crypto.subtle.exportKey("raw", serverKP.publicKey));

  const sharedBits = await crypto.subtle.deriveBits(
    { name: "ECDH", public: clientPublicKey },
    serverKP.privateKey,
    256
  );
  const sharedSecret = new Uint8Array(sharedBits);

  const salt = crypto.getRandomValues(new Uint8Array(16));

  const infoPrk = new Uint8Array([
    ...enc.encode("WebPush: info\0"),
    ...clientPubRaw,
    ...serverPubRaw,
  ]);
  const prk = await hkdf(authSecret, sharedSecret, infoPrk, 32);

  const cek = await hkdf(salt, prk, enc.encode("Content-Encoding: aes128gcm\0"), 16);
  const nonce = await hkdf(salt, prk, enc.encode("Content-Encoding: nonce\0"), 12);

  const cekKey = await crypto.subtle.importKey("raw", cek, { name: "AES-GCM" }, false, ["encrypt"]);

  const plaintext = new Uint8Array([...enc.encode(payload), 0x02]);
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, cekKey, plaintext)
  );

  const rs = 4096;
  const header = new Uint8Array(16 + 4 + 1 + 65);
  header.set(salt, 0);
  header[16] = (rs >> 24) & 0xff;
  header[17] = (rs >> 16) & 0xff;
  header[18] = (rs >> 8) & 0xff;
  header[19] = rs & 0xff;
  header[20] = 65;
  header.set(serverPubRaw, 21);

  const body = new Uint8Array(header.length + ciphertext.length);
  body.set(header, 0);
  body.set(ciphertext, header.length);
  return body;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const vapidPrivKeyB64 = Deno.env.get("VAPID_PRIVATE_KEY");
    const vapidPubKey = Deno.env.get("VAPID_PUBLIC_KEY");

    if (!vapidPrivKeyB64 || !vapidPubKey) {
      console.error("[send-push] VAPID_PRIVATE_KEY or VAPID_PUBLIC_KEY not set in Edge Function secrets");
      return new Response(
        JSON.stringify({ error: "VAPID keys not configured in Edge Function secrets" }),
        { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    const pkcs8Bytes = Uint8Array.from(atob(vapidPrivKeyB64), (c) => c.charCodeAt(0));
    const vapidPrivateKey = await crypto.subtle.importKey(
      "pkcs8",
      pkcs8Bytes,
      { name: "ECDSA", namedCurve: "P-256" },
      false,
      ["sign"]
    );

    const reqBody = await req.json();
    const { userId, userIds, targetRole, title, body: msgBody, data, url, image } = reqBody;

    const client = createClient(supabaseUrl, supabaseKey);

    let subQuery = client.from("push_subscriptions").select("id, endpoint, keys");

    if (userId) {
      subQuery = subQuery.eq("user_id", userId);
    } else if (Array.isArray(userIds) && userIds.length > 0) {
      subQuery = subQuery.in("user_id", userIds);
    } else if (targetRole) {
      const { data: roleRows } = await client
        .from("user_roles")
        .select("user_id")
        .eq("role", targetRole);

      if (!roleRows || roleRows.length === 0) {
        return new Response(
          JSON.stringify({ sent: 0, message: "No users found for role" }),
          { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
        );
      }
      subQuery = subQuery.in("user_id", roleRows.map((r: { user_id: string }) => r.user_id));
    } else {
      return new Response(
        JSON.stringify({ error: "Provide userId, userIds, or targetRole" }),
        { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    const { data: subscriptions, error: subErr } = await subQuery;
    if (subErr) throw subErr;
    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ sent: 0, message: "No push subscriptions found" }),
        { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    const payloadStr = JSON.stringify({ title, body: msgBody, data, url, image });
    let sent = 0;
    const expired: string[] = [];

    await Promise.allSettled(
      subscriptions.map(async (sub: { id: string; endpoint: string; keys: { p256dh: string; auth: string } }) => {
        try {
          const encBody = await encryptPushPayload(payloadStr, sub.keys);
          const jwt = await buildVapidJwt(sub.endpoint, vapidPrivateKey, vapidPubKey);

          const res = await fetch(sub.endpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/octet-stream",
              "Content-Encoding": "aes128gcm",
              "Authorization": `vapid t=${jwt},k=${vapidPubKey}`,
              "TTL": "86400",
              "Urgency": "normal",
            },
            body: encBody,
          });

          if (res.status === 201 || res.ok) {
            sent++;
          } else if (res.status === 410 || res.status === 404) {
            expired.push(sub.id);
          } else {
            const txt = await res.text().catch(() => "");
            console.error(`[send-push] Endpoint ${res.status}: ${txt.slice(0, 200)}`);
          }
        } catch (err) {
          console.error("[send-push] Failed for sub", sub.id, err);
        }
      })
    );

    if (expired.length > 0) {
      await client.from("push_subscriptions").delete().in("id", expired);
    }

    return new Response(
      JSON.stringify({ sent, expired: expired.length, total: subscriptions.length }),
      { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[send-push] Unhandled error:", err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }
});
