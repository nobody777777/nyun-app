'use client'
import { useEffect, useState, useCallback } from 'react'
import { usePopup } from '@/components/ui/PopupManager'

export default function ServiceWorkerRegistration() {
  const { showPopup, closePopup } = usePopup()
  const [_registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null)
  const [updateShown, setUpdateShown] = useState(false)

  const showUpdatePopup = useCallback((reg: ServiceWorkerRegistration) => {
    if (updateShown) return; // Jangan tampilkan jika sudah pernah ditampilkan
    
    showPopup(
      'Pembaruan Tersedia', 
      <div>
        <p>Versi baru aplikasi telah tersedia. Ingin memperbarui sekarang?</p>
        <div className="flex justify-end gap-2 mt-4">
          <button 
            onClick={() => {
              closePopup();
              setUpdateShown(true); // Set flag bahwa update sudah ditampilkan
            }}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            Nanti
          </button>
          <button 
            onClick={() => {
              if (reg.waiting) {
                reg.waiting.postMessage('SKIP_WAITING')
                window.location.reload()
              }
              closePopup()
              setUpdateShown(true); // Set flag bahwa update sudah ditampilkan
            }}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Perbarui
          </button>
        </div>
      </div>, 
      'info'
    )
  }, [showPopup, closePopup, updateShown])

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').then(
        function (reg) {
          console.log('Service Worker registration successful with scope: ', reg.scope)
          setRegistration(reg)

          // Cek update berkala
          setInterval(() => {
            reg.update()
          }, 60 * 60 * 1000) // Setiap jam

          // Listener update tersedia
          reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing

            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed') {
                  if (navigator.serviceWorker.controller) {
                    showUpdatePopup(reg)
                  }
                }
              })
            }
          })
        },
        function (err) {
          console.log('Service Worker registration failed: ', err)
        }
      )
    }
  }, [showUpdatePopup])

  return null
} 

/*
INFORMASI PENTING:
------------------
File: ServiceWorkerRegistration.tsx
Fungsi: Menangani registrasi service worker dan notifikasi update PWA

Fitur Penting:
1. Registrasi service worker untuk PWA
2. Pengecekan update berkala (setiap 1 jam)
3. Notifikasi update yang hanya muncul sekali
4. Manajemen state updateShown untuk mencegah notifikasi berulang

Catatan Update:
- Jangan hapus state updateShown karena ini mencegah notifikasi berulang
- Jangan ubah interval pengecekan update (60 * 60 * 1000) tanpa pertimbangan matang
- Selalu gunakan showUpdatePopup untuk menampilkan notifikasi update

KETERKAITAN ANTAR FILE:
----------------------
1. src/app/layout.tsx
   - Layout.tsx juga mendaftarkan service worker sebagai backup
   - ServiceWorkerRegistration.tsx adalah implementasi utama
   - Kedua file ini saling melengkapi untuk keandalan PWA

2. public/sw.js
   - Service worker yang didaftarkan oleh komponen ini
   - Menangani caching dan update detection
   - Mengirim pesan ke client saat ada update baru

3. src/components/ui/PopupManager.tsx
   - Digunakan untuk menampilkan notifikasi update
   - Menggunakan usePopup hook untuk menampilkan popup
   - PopupManager menyediakan context untuk seluruh aplikasi

4. src/components/AppProviders.tsx
   - ServiceWorkerRegistration diimpor dan digunakan di sini
   - AppProviders membungkus seluruh aplikasi dengan provider yang diperlukan

5. src/app/manifest.json
   - Terkait dengan PWA dan service worker
   - Mendefinisikan metadata aplikasi untuk instalasi
*/ 