const CACHE_NAME = 'restopos-v1'
const OFFLINE_URL = '/offline'

// Assets to cache immediately on install
const PRECACHE = [
  '/',
  '/dashboard',
  '/login',
  '/offline',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE).catch(() => {
        // Ignore cache errors during install
      })
    })
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET and API requests - always go to network
  if (request.method !== 'GET') return
  if (url.pathname.startsWith('/api/')) return
  if (url.pathname.startsWith('/_next/')) {
    // Cache Next.js static assets
    event.respondWith(
      caches.match(request).then(cached => cached || fetch(request).then(response => {
        if (response.ok) {
          const clone = response.clone()
          caches.open(CACHE_NAME).then(c => c.put(request, clone))
        }
        return response
      }).catch(() => new Response('', { status: 503 })))
    )
    return
  }

  // For navigation requests: network first, fall back to cache, then offline page
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response.ok) {
            const clone = response.clone()
            caches.open(CACHE_NAME).then(c => c.put(request, clone))
          }
          return response
        })
        .catch(() =>
          caches.match(request).then(cached =>
            cached || caches.match(OFFLINE_URL) || new Response(
              '<html><body style="background:#09090b;color:#fafafa;display:flex;align-items:center;justify-content:center;height:100vh;font-family:system-ui;flex-direction:column;gap:16px"><div style="font-size:48px">🍽️</div><h1>RestoPOS</h1><p style="color:#71717a">No internet connection</p><button onclick="location.reload()" style="padding:10px 24px;background:#f97316;color:white;border:none;border-radius:8px;cursor:pointer;font-size:16px">Try Again</button></body></html>',
              { headers: { 'Content-Type': 'text/html' } }
            )
          )
        )
    )
    return
  }
})

// Background sync for offline orders (future feature placeholder)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-orders') {
    console.log('Background sync: orders')
  }
})
