/* Memory Guardian service worker — app-shell cache for offline/installable PWA */
const CACHE = "memory-guardian-v1";
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
  // Never cache Firebase / live data requests
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
          .catch(() => caches.match("./index.html"))
    )
  );
});
