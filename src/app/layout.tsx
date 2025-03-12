'use client'

import type { Metadata, Viewport } from 'next'
import Sidebar from '@/components/Sidebar'
import Layout from '@/components/Layout'
import { PopupProvider } from '@/components/ui/PopupManager'
import ServiceWorkerRegistration from '@/components/ServiceWorkerRegistration'
import './globals.css'

export const viewport: Viewport = {
  themeColor: '#000000',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
}

export const metadata: Metadata = {
  title: 'Sistem pesugihan',
  description: 'Sistem pencatatan penjualan roti',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Sistem Pesugihan'
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/icon-192x192.png',
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="id">
      <body className="touch-manipulation">
        <ServiceWorkerRegistration />
        <PopupProvider>
          <div className="flex">
            <Sidebar />
            <Layout>
              {children}
            </Layout>
          </div>
        </PopupProvider>
      </body>
    </html>
  )
}
