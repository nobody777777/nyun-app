// Nama cache
const CACHE_NAME = 'roti-bakar-v1.0.2';

// File yang akan di-cache
const urlsToCache = [
  '/',
  '/dashboard',
  '/sales',
  '/calculator',
  '/settings',
  '/manifest.json',
  '/icon-192x192.png',
  '/icon-512x512.png'
];

// Tambahkan daftar URL yang berisi data dinamis
const dynamicCacheUrls = [
  '/api/sales',
  '/api/daily_sales'
];

// Instal service worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Cache dibuka');
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting();
});

// Aktivasi service worker
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// Strategi cache: Network first untuk data dinamis, Cache first untuk aset statis
self.addEventListener('fetch', (event) => {
  // Hindari request non-GET
  if (event.request.method !== 'GET') {
    return;
  }

  const url = new URL(event.request.url);
  
  // Cek apakah request adalah untuk data dinamis
  const isDynamicRequest = dynamicCacheUrls.some(dynamicUrl => 
    url.pathname.includes(dynamicUrl) || url.pathname.endsWith('/api/')
  );
  
  // Cek apakah request adalah untuk file statis
  const isStaticAsset = url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot)$/);
  
  if (isDynamicRequest) {
    // Strategi Network First untuk data dinamis
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Jika berhasil, clone response
          if (!response || response.status !== 200) {
            return response;
          }

          const responseToCache = response.clone();
          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseToCache);
            });

          return response;
        })
        .catch(() => {
          // Jika gagal, coba ambil dari cache
          return caches.match(event.request);
        })
    );
  } else if (isStaticAsset) {
    // Strategi Cache First untuk aset statis
    event.respondWith(
      caches.match(event.request)
        .then((response) => {
          // Kembalikan dari cache jika ada
          if (response) {
            return response;
          }
          
          // Jika tidak ada di cache, ambil dari network
          return fetch(event.request)
            .then((networkResponse) => {
              // Jika berhasil, clone response
              if (!networkResponse || networkResponse.status !== 200) {
                return networkResponse;
              }

              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME)
                .then((cache) => {
                  cache.put(event.request, responseToCache);
                });

              return networkResponse;
            });
        })
    );
  } else {
    // Strategi Network First untuk halaman dan request lainnya
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Jika berhasil, clone response
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          const responseToCache = response.clone();
          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseToCache);
            });

          return response;
        })
        .catch(() => {
          // Jika gagal, coba ambil dari cache
          return caches.match(event.request);
        })
    );
  }
});

// Tambahkan event listener untuk update
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

// Tambahkan event listener untuk sinkronisasi background
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-data') {
    event.waitUntil(syncData());
  }
});

// Fungsi untuk sinkronisasi data
async function syncData() {
  // Implementasi sinkronisasi data di sini
  console.log('Sinkronisasi data di background');
}