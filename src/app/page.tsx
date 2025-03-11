'use client'
import { Suspense, useEffect, useState } from 'react'
import WeatherDisplay from '@/components/weather/WeatherDisplay'
import SalesChart from '@/components/charts/SalesChart'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface DailyStats {
  totalBread: number
  totalSales: number
}

export default function HomePage() {
  const [todayStats, setTodayStats] = useState<DailyStats>({
    totalBread: 0,
    totalSales: 0
  })
  const [loading, setLoading] = useState(true)

  const loadTodayStats = async () => {
    try {
      setLoading(true)
      
      // Dapatkan tanggal hari ini dalam format YYYY-MM-DD
      const today = new Date().toISOString().split('T')[0]
      
      // Ambil data penjualan hari ini
      const { data, error } = await supabase
        .from('daily_sales')
        .select('total_bread, total_sales')
        .eq('date', today)
        .single()

      if (error && error.code !== 'PGRST116') { // PGRST116 adalah kode untuk "no rows returned"
        console.error('Error mengambil statistik:', error)
        return
      }

      // Update state dengan data dari database atau nilai default jika tidak ada data
      setTodayStats({
        totalBread: data?.total_bread || 0,
        totalSales: data?.total_sales || 0
      })

    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  // Load statistik saat komponen dimuat
  useEffect(() => {
    loadTodayStats()
    
    // Setup realtime subscription untuk update otomatis
    const channel = supabase
      .channel('daily_sales_changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all changes
          schema: 'public',
          table: 'daily_sales'
        },
        () => {
          // Reload stats when any change occurs
          loadTodayStats()
        }
      )
      .subscribe()

    // Cleanup subscription
    return () => {
      channel.unsubscribe()
    }
  }, [])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  return (
    <div className="p-2 sm:p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
          {/* Konten Utama */}
          <div className="lg:col-span-2 space-y-3 sm:space-y-4 md:space-y-6">
            {/* Header */}
            <div className="bg-white rounded-xl shadow-md p-3 sm:p-4 md:p-6">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-800 mb-1 sm:mb-2">
                Selamat Datang di Sistem Pencatatan
              </h1>
              <p className="text-sm sm:text-base text-gray-600">
                Sistem Pencatatan Penjualan & Kalkulator Bahan
              </p>
            </div>

            {/* Statistik */}
            <Suspense fallback={<div className="animate-pulse h-48 sm:h-64 bg-gray-200 rounded-xl" />}>
              <div className="bg-white rounded-xl shadow-md p-3 sm:p-4 md:p-6">
                <SalesChart />
              </div>
            </Suspense>
          </div>

          {/* Sidebar Content */}
          <div className="space-y-3 sm:space-y-4 md:space-y-6">
            {/* Weather Display */}
            <Suspense fallback={<div className="animate-pulse h-36 sm:h-48 bg-gray-200 rounded-xl" />}>
              <WeatherDisplay />
            </Suspense>

            {/* Quick Stats */}
            <div className="bg-white rounded-xl shadow-md p-3 sm:p-4 md:p-6">
              <h2 className="font-medium text-gray-800 mb-3 sm:mb-4">
                Statistik Hari Ini
              </h2>
              {loading ? (
                <div className="space-y-3 animate-pulse">
                  <div className="h-6 bg-gray-200 rounded"></div>
                  <div className="h-6 bg-gray-200 rounded"></div>
                </div>
              ) : (
                <div className="space-y-3 sm:space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm sm:text-base text-gray-600">
                      Total Penjualan
                    </span>
                    <span className="font-medium">
                      {todayStats.totalBread} Roti
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm sm:text-base text-gray-600">
                      Total Omset
                    </span>
                    <span className="font-medium">
                      {formatCurrency(todayStats.totalSales)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
