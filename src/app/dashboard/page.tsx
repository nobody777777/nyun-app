'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import SalesChart from '@/components/charts/SalesChart'
import '@/styles/dashboard.css'

export default function DashboardPage() {
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

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
              150 Roti
            </div>
          </div>

          <div className="summary-card revenue">
            <div className="card-title">
              <span>💰</span>
              <span>Total Omset Hari Ini</span>
            </div>
            <div className="card-value revenue">
              Rp 750.000
            </div>
          </div>

          <div className="summary-card average">
            <div className="card-title">
              <span>📈</span>
              <span>Rata-rata Penjualan</span>
            </div>
            <div className="card-value average">
              125 Roti/Hari
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