import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const VAPID_SUBJECT = "mailto:support@wasl-ye.com";

/**
 * Convert a PKCS#8 ECDSA P-256 private key (standard base64) to the raw
 * 32-byte private key encoded as URL-safe base64, which is what web-push
 * expects in setVapidDetails(). The public key is already stored as the
 * raw 65-byte point in URL-safe base64, so it can be passed directly.
 */
async function extractRawPrivateKey(pkcs8Base64: string): Promise<string> {
  const pkcs8Bytes = Uint8Array.from(atob(pkcs8Base64), (c) => c.charCodeAt(0));
  const privateKey = await crypto.subtle.importKey(
    "pkcs8",
    pkcs8Bytes,
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["sign"],
  );
  const jwk = await crypto.subtle.exportKey("jwk", privateKey);
  if (!jwk.d) throw new Error("Could not extract raw private key from PKCS#8");
  return jwk.d;
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

    const rawPrivateKey = await extractRawPrivateKey(vapidPrivKeyB64);
    webpush.setVapidDetails(
      VAPID_SUBJECT,
      vapidPubKey,
      rawPrivateKey,
    );

    const reqBody = await req.json();
    const { userId, userIds, targetRole, title, body: msgBody, data: _data, url, image } = reqBody;

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

    const payload = JSON.stringify({ title, body: msgBody, url, image });
    let sent = 0;
    const expired: string[] = [];

    await Promise.allSettled(
      subscriptions.map(async (sub: { id: string; endpoint: string; keys: { p256dh: string; auth: string } }) => {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: sub.keys },
            payload,
          );
          sent++;
        } catch (err: any) {
          const statusCode = err?.statusCode ?? 0;
          if (statusCode === 410 || statusCode === 404) {
            expired.push(sub.id);
          } else {
            console.error("[send-push] Failed for sub", sub.id, err);
          }
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
