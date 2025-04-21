'use client'

import { ReactNode, Suspense } from 'react'
import { PopupProvider } from '@/components/ui/PopupManager'
import { SalesProvider } from '@/contexts/SalesContext'

function LoadingFallback() {
  return (
    <div className="flex h-screen w-screen items-center justify-center">
      <div className="animate-pulse text-white text-xl">Memuat...</div>
    </div>
  )
}

export default function AppProviders({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <PopupProvider>
        <SalesProvider>
          {children}
        </SalesProvider>
      </PopupProvider>
    </Suspense>
  )
} 

/*
INFORMASI PENTING:
------------------
File: AppProviders.tsx
Fungsi: Menyediakan context providers untuk seluruh aplikasi

Fitur Penting:
1. Menggabungkan semua context providers
2. Menyediakan loading fallback
3. Mengatur Suspense boundary
4. Mengintegrasikan ServiceWorkerRegistration

Catatan Update:
- Jangan hapus struktur provider nesting
- Selalu tambahkan provider baru di sini
- Pertahankan loading fallback untuk UX yang baik
- Jangan hapus ServiceWorkerRegistration

KETERKAITAN ANTAR FILE:
----------------------
1. src/app/layout.tsx
   - Layout.tsx menggunakan AppProviders untuk membungkus aplikasi
   - AppProviders menyediakan context untuk seluruh aplikasi
   - Terkait dengan struktur dasar aplikasi

2. src/components/ServiceWorkerRegistration.tsx
   - ServiceWorkerRegistration diimpor dan digunakan di AppProviders
   - Menangani registrasi service worker dan update PWA
   - Terkait dengan fitur PWA dan update

3. src/contexts/SalesContext.tsx
   - SalesProvider diimpor dan digunakan di AppProviders
   - Menyediakan context untuk data penjualan
   - Terkait dengan fitur manajemen penjualan

4. src/components/ui/PopupManager.tsx
   - PopupProvider diimpor dan digunakan di AppProviders
   - Menyediakan context untuk popup dan notifikasi
   - Terkait dengan UX dan feedback pengguna

5. src/components/AppLayout.tsx
   - AppLayout digunakan bersama dengan AppProviders
   - AppProviders menyediakan context, AppLayout menyediakan struktur */