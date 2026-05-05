import { cleanupOutdatedCaches, precacheAndRoute } from "workbox-precaching";

self.skipWaiting();

precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

const DEFAULT_NOTIFICATION = {
  title: "Mia",
  body: "You have a new message.",
  icon: "/pwa-192x192.png",
  badge: "/pwa-192x192.png",
  url: "/",
};

function normalizeNotificationPayload(data = {}) {
  const title = data.title || DEFAULT_NOTIFICATION.title;
  const body = data.body || data.message || DEFAULT_NOTIFICATION.body;
  const url = data.url || data.data?.url || DEFAULT_NOTIFICATION.url;

  return {
    title,
    options: {
      body,
      icon: data.icon || DEFAULT_NOTIFICATION.icon,
      badge: data.badge || DEFAULT_NOTIFICATION.badge,
      tag: data.tag || "mia-message",
      data: {
        url,
        ...(data.data || {}),
      },
    },
  };
}

self.addEventListener("push", (event) => {
  let payload = {};

  if (event.data) {
    try {
      payload = event.data.json();
    } catch {
      payload = { body: event.data.text() };
    }
  }

  const notification = normalizeNotificationPayload(payload);
  event.waitUntil(
    self.registration.showNotification(notification.title, notification.options),
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type !== "SHOW_TEST_NOTIFICATION") {
    return;
  }

  const notification = normalizeNotificationPayload(event.data.payload);
  event.waitUntil(
    self.registration.showNotification(notification.title, notification.options),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = new URL(event.notification.data?.url || "/", self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const existingClient = clients.find((client) => client.url === targetUrl);

      if (existingClient) {
        return existingClient.focus();
      }

      return self.clients.openWindow(targetUrl);
    }),
  );
});
