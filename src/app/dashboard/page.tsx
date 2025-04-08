'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import SalesChart from '@/components/charts/SalesChart'
import '@/styles/dashboard.css'
import { useSales } from '@/contexts/SalesContext'
import { supabase } from '@/lib/supabase'

export default function DashboardPage() {
  const [currentTime, setCurrentTime] = useState(new Date())
  const { salesData, _refreshData } = useSales()
  const [todayStats, setTodayStats] = useState({
    totalBread: 0,
    totalSales: 0,
    averageBread: 0
  })

  // Timer untuk waktu
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  // Mengambil data hari ini dan rata-rata
  useEffect(() => {
    const fetchTodayData = async () => {
      try {
        // Ambil data hari ini
        const today = new Date().toISOString().split('T')[0]
        const { data: todayData } = await supabase
          .from('daily_sales')
          .select('*')
          .eq('date', today)
          .single()

        // Hitung rata-rata dari salesData
        const totalDays = salesData.length || 1
        const averageBread = Math.round(
          salesData.reduce((sum, sale) => sum + sale.total_bread, 0) / totalDays
        )

        setTodayStats({
          totalBread: todayData?.total_bread || 0,
          totalSales: todayData?.total_sales || 0,
          averageBread: averageBread
        })

      } catch (error) {
        console.error('Error fetching today stats:', error)
      }
    }

    fetchTodayData()
  }, [salesData])

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-content">
        {/* Header */}
        <div className="dashboard-header">
          <div>
            <h1 className="welcome-text">
              Dashboard RotiBarok
            </h1>
            <p className="date-display">
              {currentTime.toLocaleDateString('id-ID', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          </div>
          <div className="text-2xl">
            🍞
          </div>
        </div>

        {/* Ringkasan */}
        <div className="summary-grid">
          <div className="summary-card sales">
            <div className="card-title">
              <span>📊</span>
              <span>Total Penjualan Hari Ini</span>
            </div>
            <div className="card-value sales">
              {todayStats.totalBread} Roti
            </div>
          </div>

          <div className="summary-card revenue">
            <div className="card-title">
              <span>💰</span>
              <span>Total Omset Hari Ini</span>
            </div>
            <div className="card-value revenue">
              {formatCurrency(todayStats.totalSales)}
            </div>
          </div>

          <div className="summary-card average">
            <div className="card-title">
              <span>📈</span>
              <span>Rata-rata Penjualan</span>
            </div>
            <div className="card-value average">
              {todayStats.averageBread} Roti/Hari
            </div>
          </div>
        </div>

        {/* Grafik */}
        <div className="chart-section">
          <SalesChart />
        </div>

        {/* Quick Actions */}
        <div className="quick-actions">
          <Link href="/sales" className="action-button sales">
            <span className="action-icon">📝</span>
            <span className="action-text">Catat Penjualan</span>
          </Link>

          <Link href="/calculator" className="action-button calculator">
            <span className="action-icon">🧮</span>
            <span className="action-text">Kalkulator</span>
          </Link>

          <Link href="/inventory" className="action-button inventory">
            <span className="action-icon">📦</span>
            <span className="action-text">Stok Bahan</span>
          </Link>

          <Link href="/settings" className="action-button settings">
            <span className="action-icon">⚙️</span>
            <span className="action-text">Pengaturan</span>
          </Link>
        </div>
      </div>
    </div>
  )
} 