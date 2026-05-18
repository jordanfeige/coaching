const CACHE_NAME = 'playvia-1779063937703'
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
  if (event.request.url.includes('/api/')) return
  if (event.request.url.includes('supabase')) return
  if (event.request.url.includes('googleapis')) return

  event.respondWith(
    // Network first - always try to get fresh content
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
        }
        return response
      })
      .catch(() => caches.match(event.request))
  )
})

// Listen for skip waiting message from client
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') self.skipWaiting()
})
