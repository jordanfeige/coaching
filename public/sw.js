const CACHE_NAME = 'playvia-1779672133783'
const STATIC_ASSETS = ['/', '/analyze', '/login', '/manifest.json']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  )
  // Take over immediately - don't wait for old SW to die
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    // Delete ALL old caches
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    )
  )
  // Take control of all open tabs immediately
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return
  const url = event.request.url
  if (url.includes('/api/')) return
  if (url.includes('supabase')) return
  if (url.includes('googleapis')) return
  // App routes: never intercept — avoids stale shell + invalid undefined Response on cache miss
  if (url.includes('/player/') || url.includes('/dashboard/')) return

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
        }
        return response
      })
      .catch(async () => {
        const cached = await caches.match(event.request)
        return cached ?? Response.error()
      }),
  )
})

// Listen for skip waiting message from client
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') self.skipWaiting()
})
