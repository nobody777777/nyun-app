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