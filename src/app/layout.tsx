import type { Metadata, Viewport } from 'next'
import Sidebar from '@/components/Sidebar'
import Layout from '@/components/Layout'
import { PopupProvider } from '@/components/ui/PopupManager'
import ServiceWorkerRegistration from '@/components/ServiceWorkerRegistration'
import './globals.css'
import { SalesProvider } from '@/contexts/SalesContext'
import '@/styles/chart.css';

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
  themeColor: '#000000',
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="id">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
        <meta name="theme-color" content="#000000" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black" />
        <meta name="apple-mobile-web-app-title" content="ROTI BAKAR BY KYZ" />
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        
        {/* Tambahkan meta tag untuk iOS splash screen */}
        <link rel="apple-touch-startup-image" href="/splash/apple-splash-2048-2732.png" media="(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" />
        <link rel="apple-touch-startup-image" href="/splash/apple-splash-1668-2388.png" media="(device-width: 834px) and (device-height: 1194px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" />
        <link rel="apple-touch-startup-image" href="/splash/apple-splash-1536-2048.png" media="(device-width: 768px) and (device-height: 1024px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" />
        <link rel="apple-touch-startup-image" href="/splash/apple-splash-1125-2436.png" media="(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" />
        <link rel="apple-touch-startup-image" href="/splash/apple-splash-1242-2688.png" media="(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" />
        <link rel="apple-touch-startup-image" href="/splash/apple-splash-828-1792.png" media="(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" />
        <link rel="apple-touch-startup-image" href="/splash/apple-splash-1242-2208.png" media="(device-width: 414px) and (device-height: 736px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" />
        <link rel="apple-touch-startup-image" href="/splash/apple-splash-750-1334.png" media="(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" />
        <link rel="apple-touch-startup-image" href="/splash/apple-splash-640-1136.png" media="(device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" />
        
        <script dangerouslySetInnerHTML={{
          __html: `
            // Menandai body sebagai loaded setelah aplikasi dimuat
            window.addEventListener('load', function() {
              // Tunggu sedikit untuk transisi yang halus
              setTimeout(function() {
                document.body.classList.add('app-loaded');
              }, 300);
            });
            
            // Mencegah pull-to-refresh
            document.addEventListener('touchmove', function(e) {
              if (e.touches.length > 1) {
                e.preventDefault();
              }
            }, { passive: false });
            
            // Mencegah pinch zoom
            document.addEventListener('gesturestart', function(e) {
              e.preventDefault();
            });
            
            if ('serviceWorker' in navigator) {
              navigator.serviceWorker.ready.then(registration => {
                registration.update();
              });
            }
          `
        }} />
      </head>
      <body style={{backgroundColor: "#000000"}}>
        <ServiceWorkerRegistration />
        <PopupProvider>
          <SalesProvider>
            <div className="flex">
              <Sidebar />
              <Layout>
                {children}
              </Layout>
            </div>
          </SalesProvider>
        </PopupProvider>
      </body>
    </html>
  )
}
