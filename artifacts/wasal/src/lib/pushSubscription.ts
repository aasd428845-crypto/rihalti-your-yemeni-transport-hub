import { supabase } from "@/integrations/supabase/client";

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

async function saveSubscriptionToDb(
  userId: string,
  subscription: PushSubscription
): Promise<void> {
  const subJson = subscription.toJSON();
  const { error } = await (supabase.from as any)("push_subscriptions").upsert(
    {
      user_id: userId,
      endpoint: subscription.endpoint,
      keys: subJson.keys,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,endpoint" }
  );
  if (error) {
    console.warn("[Push] Failed to save subscription to DB:", error.message);
  }
}

export const subscribeToPush = async (userId: string): Promise<void> => {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    return;
  }

  if (!VAPID_PUBLIC_KEY) {
    console.warn("[Push] VITE_VAPID_PUBLIC_KEY not configured");
    return;
  }

  const storageKey = `wasal_push_${userId}`;
  const storedState = localStorage.getItem(storageKey);

  if (storedState === "denied") return;

  try {
    const registration = await navigator.serviceWorker.ready;

    const existing = await registration.pushManager.getSubscription();
    if (existing) {
      await saveSubscriptionToDb(userId, existing);
      localStorage.setItem(storageKey, "subscribed");
      return;
    }

    if (storedState === "subscribed") return;

    const permission = await Notification.requestPermission();

    if (permission === "denied") {
      localStorage.setItem(storageKey, "denied");
      return;
    }

    if (permission !== "granted") return;

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as unknown as ArrayBuffer,
    });

    await saveSubscriptionToDb(userId, subscription);
    localStorage.setItem(storageKey, "subscribed");
    console.log("[Push] Subscribed successfully");
  } catch (err) {
    console.warn("[Push] Subscription failed:", err);
  }
};

export const refreshPushSubscription = async (userId: string): Promise<void> => {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
  if (!VAPID_PUBLIC_KEY) throw new Error("VITE_VAPID_PUBLIC_KEY not configured");

  const registration = await navigator.serviceWorker.ready;
  const existing = await registration.pushManager.getSubscription();
  if (existing) {
    await existing.unsubscribe();
    await (supabase.from as any)("push_subscriptions")
      .delete()
      .eq("user_id", userId)
      .eq("endpoint", existing.endpoint);
  }

  localStorage.removeItem(`wasal_push_${userId}`);
  await subscribeToPush(userId);
};

export const getPushStatus = async (): Promise<{
  supported: boolean;
  permission: NotificationPermission | "unsupported";
  subscribed: boolean;
  endpoint?: string;
}> => {
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
    return { supported: false, permission: "unsupported", subscribed: false };
  }

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  return {
    supported: true,
    permission: Notification.permission,
    subscribed: Boolean(subscription),
    endpoint: subscription?.endpoint,
  };
};

export const unsubscribeFromPush = async (userId: string): Promise<void> => {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      const endpoint = subscription.endpoint;
      await subscription.unsubscribe();
      await (supabase.from as any)("push_subscriptions")
        .delete()
        .eq("user_id", userId)
        .eq("endpoint", endpoint);
    }

    localStorage.removeItem(`wasal_push_${userId}`);
  } catch (err) {
    console.warn("[Push] Unsubscribe failed:", err);
  }
};
