import React from 'react'
import '@/styles/globals.css'
import '@/styles/chart.css'
import AppProviders from '@/components/AppProviders'
import AppLayout from '@/components/AppLayout'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="id">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
        <meta name="theme-color" content="#FFFFFF" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="RotiBarok" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icon-192x192.png" />
        <script dangerouslySetInnerHTML={{
          __html: `
            // Check for service worker
            if ('serviceWorker' in navigator) {
              window.addEventListener('load', function() {
                navigator.serviceWorker.register('/sw.js').then(function(registration) {
                  console.log('ServiceWorker registration successful');
                  
                  // Listen for updates
                  registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    newWorker.addEventListener('statechange', () => {
                      if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        // New update available
                        if (confirm('Update aplikasi tersedia. Muat ulang sekarang?')) {
                          window.location.reload();
                        }
                      }
                    });
                  });
                  
                }).catch(function(err) {
                  console.log('ServiceWorker registration failed: ', err);
                });

                // Listen for messages from service worker
                navigator.serviceWorker.addEventListener('message', (event) => {
                  if (event.data && event.data.type === 'APP_UPDATE') {
                    console.log('New version available:', event.data.version);
                    // Show update notification to user
                    if (confirm('Versi baru tersedia. Perbarui sekarang?')) {
                      window.location.reload();
                    }
                  }
                });
              });
            }
          `
        }} />
        <title>ROTI BAKAR BY KYZ</title>
      </head>
      <body className="bg-black">
        <AppProviders>
          <AppLayout>
            {children}
          </AppLayout>
        </AppProviders>
      </body>
    </html>
  )
}
