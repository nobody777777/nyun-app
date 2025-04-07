import type { Metadata, Viewport } from 'next'

export const viewport: Viewport = {
  themeColor: '#000000',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export const metadata: Metadata = {
  title: 'ROTI BAKAR BY KYZ',
  description: 'Aplikasi untuk melacak penjualan roti',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black',
    title: 'ROTI BAKAR BY KYZ'
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/icon-192x192.png',
  }
}