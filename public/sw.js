const CACHE_VERSION = "v3"
const STATIC_CACHE = `demo-nail-salon-static-${CACHE_VERSION}`
const OFFLINE_CACHE = `demo-nail-salon-offline-${CACHE_VERSION}`
const OFFLINE_URL = "/offline.html"

const PRECACHE = [OFFLINE_URL, "/icons/icon-192.png"]

self.addEventListener("install", (event) => {
    event.waitUntil(
        caches
            .open(OFFLINE_CACHE)
            .then((cache) => cache.addAll(PRECACHE))
            .then(() => self.skipWaiting()),
    )
})

self.addEventListener("activate", (event) => {
    const current = new Set([STATIC_CACHE, OFFLINE_CACHE])
    event.waitUntil(
        caches
            .keys()
            .then((keys) =>
                Promise.all(
                    keys.filter((key) => !current.has(key)).map((key) => caches.delete(key)),
                ),
            )
            .then(() => self.clients.claim()),
    )
})

self.addEventListener("fetch", (event) => {
    const request = event.request
    if (request.method !== "GET") return

    const url = new URL(request.url)
    if (url.origin !== self.location.origin) return

    if (request.mode === "navigate") {
        event.respondWith(
            fetch(request).catch(async () => {
                const offline = await caches.match(OFFLINE_URL, { cacheName: OFFLINE_CACHE })
                return offline ?? Response.error()
            }),
        )
        return
    }

    if (PRECACHE.includes(url.pathname)) {
        event.respondWith(
            caches
                .match(request, { cacheName: OFFLINE_CACHE })
                .then((cached) => cached ?? fetch(request)),
        )
        return
    }

    if (url.pathname.startsWith("/_next/static/")) {
        event.respondWith(
            caches.open(STATIC_CACHE).then(async (cache) => {
                const cached = await cache.match(request)
                if (cached) return cached
                const response = await fetch(request)
                if (response.ok) cache.put(request, response.clone())
                return response
            }),
        )
        return
    }
})
