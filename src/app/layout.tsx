import type { Metadata } from 'next'
import Sidebar from '@/components/Sidebar'
import Layout from '@/components/Layout'
import { PopupProvider } from '@/components/ui/PopupManager'
import './globals.css'

export const metadata: Metadata = {
  title: 'Sistem pesugihan',
  description: 'Sistem pencatatan penjualan roti',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="id">
      <body>
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
