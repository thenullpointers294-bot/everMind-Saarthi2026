/* EverMind service worker — app-shell cache, background sync & push notifications */
const CACHE = "evermind-cache-v2";
const SHELL = ["./", "./index.html", "./manifest.webmanifest", "./icons/icon-512.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  // Never cache Firebase / live telemetry requests
  if (url.hostname.includes("googleapis.com") || url.hostname.includes("firebaseio.com")) return;

  // Cache-first for OSM tiles and same-origin shell
  e.respondWith(
    caches.match(e.request).then(
      (hit) =>
        hit ||
        fetch(e.request)
          .then((res) => {
            if (
              e.request.method === "GET" &&
              res.ok &&
              (url.origin === location.origin || url.hostname.endsWith("openstreetmap.org"))
            ) {
              const clone = res.clone();
              caches.open(CACHE).then((c) => c.put(e.request, clone));
            }
            return res;
          })
          .catch(() => hit)
    )
  );
});

// Web Push event listener — wake up browser even when app is CLOSED
self.addEventListener("push", (e) => {
  let data = {};
  if (e.data) {
    try {
      data = e.data.json();
    } catch {
      data = { title: "EverMind Alert", body: e.data.text() };
    }
  }

  const title = data.title || "🚨 EMERGENCY ALERT: Wearer";
  const options = {
    body: data.body || "SOS button pressed or fall registered! Tap to view.",
    icon: "./icons/icon-512.png",
    badge: "./icons/icon-512.png",
    vibrate: [500, 200, 500, 200, 800],
    tag: data.tag || "emergency-alert",
    requireInteraction: true,
    data: {
      url: data.url || "./#/caregiver/alerts",
    },
  };

  e.waitUntil(self.registration.showNotification(title, options));
});

// Handle notification click to open / focus EverMind Alerts
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const targetUrl = e.notification.data?.url || "./#/caregiver/alerts";

  e.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if ("focus" in client) {
          if (client.navigate) client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
