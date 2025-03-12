'use client'
import { useEffect, useState } from 'react'
import { usePopup } from '@/components/ui/PopupManager'

export default function ServiceWorkerRegistration() {
  const { showPopup, closePopup } = usePopup()
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null)

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
                    // Tampilkan popup update
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
  }, [])

  // Fungsi tampilkan popup update
  const showUpdatePopup = (reg: ServiceWorkerRegistration) => {
    showPopup(
      'Pembaruan Tersedia', 
      <div>
        <p>Versi baru aplikasi telah tersedia. Ingin memperbarui sekarang?</p>
        <div className="flex justify-end gap-2 mt-4">
          <button 
            onClick={() => closePopup()}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            Nanti
          </button>
          <button 
            onClick={() => {
              // Kirim pesan update ke service worker
              if (reg.waiting) {
                reg.waiting.postMessage('SKIP_WAITING')
                // Reload halaman
                window.location.reload()
              }
              closePopup()
            }}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Perbarui
          </button>
        </div>
      </div>, 
      'info'
    )
  }

  return null
} 