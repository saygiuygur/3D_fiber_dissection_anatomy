const FALLBACK_DATA_CACHE_NAME = "fiber-dissection-offline-data-v1";
const FALLBACK_SHELL_CACHE_NAME = "fiber-dissection-offline-shell-v1";

const OFFLINE_CONTROL_CACHE_NAME = "fiber-dissection-offline-control-v1";
const OFFLINE_CONTROL_KEY = new URL(
  "./__offline-active-config__.json",
  self.registration.scope
).href;

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(self.clients.claim());
});

async function getActiveOfflineCaches() {
  try {
    const controlCache = await caches.open(OFFLINE_CONTROL_CACHE_NAME);
    const configResponse = await controlCache.match(OFFLINE_CONTROL_KEY);

    if (configResponse) {
      const config = await configResponse.json();

      if (config?.dataCache && config?.shellCache) {
        return {
          dataCache: config.dataCache,
          shellCache: config.shellCache
        };
      }
    }
  } catch (_) {}

  return {
    dataCache: FALLBACK_DATA_CACHE_NAME,
    shellCache: FALLBACK_SHELL_CACHE_NAME
  };
}

self.addEventListener("fetch", event => {
  const request = event.request;

  if (request.method !== "GET") return;

  event.respondWith((async () => {
    const active = await getActiveOfflineCaches();

    const dataCache = await caches.open(active.dataCache);
    const savedAtlasFile = await dataCache.match(request);

    if (savedAtlasFile) {
      return savedAtlasFile;
    }

    const shellCache = await caches.open(active.shellCache);
    const savedAppFile = await shellCache.match(request);

    if (savedAppFile) {
      return savedAppFile;
    }

    try {
      return await fetch(request);
    } catch (err) {
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
