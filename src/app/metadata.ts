import type { Metadata, Viewport } from 'next'

export const viewport: Viewport = {
  themeColor: '#000000',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
}

export const metadata: Metadata = {
  title: 'Sistem Pesugihan',
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