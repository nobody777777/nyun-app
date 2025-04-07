'use client'

import { ReactNode, Suspense } from 'react'
import Layout from '@/components/Layout'
import Sidebar from '@/components/Sidebar'
import ServiceWorkerRegistration from '@/components/ServiceWorkerRegistration'
import AppLoaded from '@/components/AppLoaded'

function LoadingFallback() {
  return (
    <div className="flex h-screen w-screen items-center justify-center">
      <div className="animate-pulse text-white text-xl">Memuat...</div>
    </div>
  )
}

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <AppLoaded />
      <ServiceWorkerRegistration />
      <div className="flex min-h-screen">
        <Sidebar />
        <Layout>
          <Suspense fallback={<LoadingFallback />}>
            {children}
          </Suspense>
        </Layout>
      </div>
    </Suspense>
  )
} 