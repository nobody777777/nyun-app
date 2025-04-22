// Nama cache
const CACHE_NAME = 'roti-barok-v1.2.0';
const APP_VERSION = '1.2.0';

// File yang akan di-cache
const urlsToCache = [
  '/',
  '/dashboard',
  '/sales',
  '/calculator',
  '/settings',
  '/manifest.json',
  '/icon-192x192.png',
  '/icon-512x512.png',
  '/favicon.ico'
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
  // Force aktivasi service worker baru
  self.skipWaiting();
});

// Aktivasi service worker
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      // Update cache
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('Menghapus cache lama:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Ambil kontrol langsung
      self.clients.claim(),
      // Kirim pesan ke client bahwa ada update
      self.clients.matchAll().then((clients) => {
        clients.forEach(client => {
          client.postMessage({
            type: 'APP_UPDATE',
            version: APP_VERSION
          });
        });
      })
    ])
  );
});

// Strategi cache: Network first untuk data dinamis, Cache first untuk aset statis
self.addEventListener('fetch', (event) => {
  // Hindari request non-GET
  if (event.request.method !== 'GET') {
    return;
  }

  const url = new URL(event.request.url);

  // Jika request ke Supabase, jangan intercept/caching, biarkan browser handle default
  if (url.hostname.endsWith('supabase.co')) {
    return;
  }

  // Jika request ke manifest.json, jangan intercept/caching, biarkan browser handle default
  if (url.pathname.endsWith('/manifest.json')) {
    return;
  }

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

/*
INFORMASI PENTING:
------------------
File: sw.js (Service Worker)
Fungsi: Menangani caching dan update PWA

Fitur Penting:
1. Cache management untuk assets statis
2. Strategi cache-first untuk performa
3. Auto-update detection
4. Version control untuk PWA

Catatan Update:
- Jangan hapus CACHE_NAME karena digunakan untuk versioning
- Selalu update APP_VERSION saat deploy versi baru
- Cache strategy harus dipertahankan untuk performa
- Jangan hapus event listener 'activate' karena penting untuk update

KETERKAITAN ANTAR FILE:
----------------------
1. src/components/ServiceWorkerRegistration.tsx
   - Service worker ini didaftarkan oleh ServiceWorkerRegistration.tsx
   - ServiceWorkerRegistration.tsx menangani notifikasi update
   - Kedua file ini bekerja sama untuk update PWA

2. src/app/layout.tsx
   - Layout.tsx juga mendaftarkan service worker ini sebagai backup
   - Terhubung melalui script tag di layout.tsx
   - Memastikan service worker terdaftar bahkan jika ServiceWorkerRegistration gagal

3. public/manifest.json
   - Service worker dan manifest.json bekerja sama untuk PWA
   - Manifest.json mendefinisikan metadata PWA
   - Service worker menangani caching dan update

4. src/app/next.config.js
   - Konfigurasi Next.js untuk PWA
   - Mengatur workbox dan service worker
   - Terkait dengan cara service worker di-generate

5. public/icon-*.png
   - Icon-icon yang di-cache oleh service worker
   - Digunakan untuk PWA dan instalasi
   - Terkait dengan manifest.json dan PWA functionality
*/