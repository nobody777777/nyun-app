'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import '@/styles/chart.css'
import '@/styles/chart-mobile-fix.css'
import '@/styles/chart-mobile-override.css'
import '@/styles/chart-production-fix.css' // CSS khusus untuk fix di mode production

// Gunakan dynamic import dengan opsi yang lebih ketat untuk memastikan chart dimuat dengan benar di production
const SalesChart = dynamic(
  () => import('./SalesChart').then((mod) => {
    // Pastikan module dimuat dengan benar sebelum mengembalikannya
    console.log('[ChartWrapper] SalesChart module loaded successfully')
    return mod
  }),
  {
    ssr: false,
    loading: () => (
      <div className="animate-pulse h-[400px] sm:h-[500px] w-full bg-gray-200 rounded-xl flex items-center justify-center">
        <p className="text-gray-500">Memuat grafik...</p>
      </div>
    )
  }
)

export default function ChartWrapper() {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    // Tandai bahwa kita berada di lingkungan client
    setIsClient(true);
    
    // Pastikan chart diresize dengan benar setelah komponen dimuat
    // Gunakan interval untuk memastikan chart benar-benar dimuat di production
    const timer = setTimeout(() => {
      const chartCanvas = document.querySelector('.chart-canvas');
      if (chartCanvas) {
        console.log('[ChartWrapper] Chart canvas found, dispatching resize event');
        window.dispatchEvent(new Event('resize'));
      } else {
        console.log('[ChartWrapper] Chart canvas not found, will retry');
        // Jika canvas belum ditemukan, coba lagi beberapa kali
        let retryCount = 0;
        const maxRetries = 5;
        const retryInterval = setInterval(() => {
          const canvas = document.querySelector('.chart-canvas');
          if (canvas) {
            console.log('[ChartWrapper] Chart canvas found on retry, dispatching resize event');
            window.dispatchEvent(new Event('resize'));
            clearInterval(retryInterval);
          } else if (retryCount >= maxRetries) {
            console.log('[ChartWrapper] Max retries reached, giving up');
            clearInterval(retryInterval);
          }
          retryCount++;
        }, 500);
      }
    }, 500);
    
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="chart-container w-full h-[400px] sm:h-[500px]">
      {!isClient ? (
        <div className="animate-pulse h-full w-full bg-gray-200 rounded-xl flex items-center justify-center">
          <p className="text-gray-500">Memuat grafik...</p>
        </div>
      ) : (
        <SalesChart />
      )}
    </div>
  )
}