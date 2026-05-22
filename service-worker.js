const OFFLINE_DATA_CACHE_NAME = "fiber-dissection-offline-data-v1";
const OFFLINE_SHELL_CACHE_NAME = "fiber-dissection-offline-shell-v1";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", event => {
  const request = event.request;

  // The atlas only stores and serves normal GET resources offline.
  if (request.method !== "GET") return;

  event.respondWith((async () => {
    const dataCache = await caches.open(OFFLINE_DATA_CACHE_NAME);
    const savedAtlasFile = await dataCache.match(request);

    if (savedAtlasFile) {
      return savedAtlasFile;
    }

    const shellCache = await caches.open(OFFLINE_SHELL_CACHE_NAME);
    const savedAppFile = await shellCache.match(request);

    if (savedAppFile) {
      return savedAppFile;
    }

    try {
      return await fetch(request);
    } catch (err) {
      // When offline navigation is requested, open the saved atlas webpage.
      if (request.mode === "navigate") {
        const savedIndex =
          await shellCache.match(new URL("./index.html", self.registration.scope).href) ||
          await shellCache.match(new URL("./", self.registration.scope).href);

        if (savedIndex) {
          return savedIndex;
        }
      }

      throw err;
    }
  })());
});
