import { precacheAndRoute, cleanupOutdatedCaches } from "workbox-precaching";
import { registerRoute } from "workbox-routing";
import { CacheFirst } from "workbox-strategies";
import { ExpirationPlugin } from "workbox-expiration";
import { CacheableResponsePlugin } from "workbox-cacheable-response";

declare const self: ServiceWorkerGlobalScope;

precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

registerRoute(
  /^https:\/\/fonts\.googleapis\.com\/.*/i,
  new CacheFirst({
    cacheName: "google-fonts-cache",
    plugins: [
      new ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  })
);

registerRoute(
  /^https:\/\/fonts\.gstatic\.com\/.*/i,
  new CacheFirst({
    cacheName: "gstatic-fonts-cache",
    plugins: [
      new ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  })
);

self.addEventListener("push", (event: PushEvent) => {
  let payload: {
    title?: string;
    body?: string;
    url?: string;
    image?: string;
    data?: Record<string, unknown>;
  };

  if (!event.data) {
    payload = { title: "وصال", body: "لديك إشعار جديد" };
  } else {
    try {
      payload = event.data.json();
    } catch {
      payload = { title: "وصال", body: event.data.text() };
    }
  }

  const title = payload.title ?? "وصال";
  const options: NotificationOptions = {
    body: payload.body ?? "",
    icon: "/icons/icon-192x192.png",
    badge: "/icons/icon-192x192.png",
    ...(payload.image ? { image: payload.image } : {}),
    dir: "rtl",
    lang: "ar",
    vibrate: [200, 100, 200],
    tag: "wasal-push",
    renotify: true,
    data: {
      url: payload.url ?? "/",
      ...(payload.data ?? {}),
    },
  };

  event.waitUntil(
    self.registration.showNotification(title, options).catch((error) => {
      console.error("[Push] Failed to display notification:", error);
    })
  );
});

self.addEventListener("notificationclick", (event: NotificationClickEvent) => {
  event.notification.close();

  const targetUrl: string = (event.notification.data as { url?: string })?.url ?? "/";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          const wc = client as WindowClient;
          if (wc.url && "focus" in wc) {
            return wc.focus().then(() => wc.navigate(targetUrl));
          }
        }
        return self.clients.openWindow(targetUrl);
      })
  );
});
