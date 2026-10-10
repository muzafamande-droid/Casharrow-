const CACHE_NAME = "aveilot-pwa-v1";
const APP_SHELL = ["/", "/offline.html", "/manifest.webmanifest", "/aveilot-icon.svg"];

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await Promise.all(APP_SHELL.map(async path => {
      try {
        const response = await fetch(path, { cache: "reload" });
        if (response.ok) await cache.put(path, response);
      } catch (_) {}
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith("aveilot-pwa-") && key !== CACHE_NAME).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Never cache API responses, authentication, account pages, admin pages, or transaction data.
  if (url.pathname.startsWith("/api/") || url.pathname === "/member.html" || url.pathname === "/admin.html") return;

  if (request.mode === "navigate") {
    if (url.pathname === "/") {
      event.respondWith((async () => {
        try {
          const response = await fetch(request);
          if (response.ok) {
            const cache = await caches.open(CACHE_NAME);
            await cache.put("/", response.clone());
          }
          return response;
        } catch (_) {
          return (await caches.match("/")) || (await caches.match("/offline.html"));
        }
      })());
    } else {
      event.respondWith((async () => {
        try {
          return await fetch(request);
        } catch (_) {
          return (await caches.match("/offline.html")) || Response.error();
        }
      })());
    }
    return;
  }

  // Cache only same-origin static assets; keep API and personal data network-only.
  if (/\.(?:js|css|svg|png|webmanifest|ico)$/i.test(url.pathname)) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(request);
      const network = fetch(request).then(response => {
        if (response.ok) cache.put(request, response.clone()).catch(() => {});
        return response;
      }).catch(() => null);
      return cached || (await network) || Response.error();
    })());
  }
});
