'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js'
import '@/styles/chart.css'

// Registrasi komponen Chart.js yang diperlukan
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
)

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function SalesChart() {
  const [loading, setLoading] = useState(true)
  const [salesData, setSalesData] = useState<any[]>([])
  const [activeDataset, setActiveDataset] = useState<string[]>(['roti'])

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      // Ambil data 7 hari terakhir
      const endDate = new Date()
      const startDate = new Date()
      startDate.setDate(endDate.getDate() - 6) // 7 hari termasuk hari ini

      const { data, error } = await supabase
        .from('daily_sales')
        .select('*')
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', endDate.toISOString().split('T')[0])
        .order('date', { ascending: true })

      if (error) throw error

      setSalesData(data || [])
    } catch (error) {
      console.error('Error fetching sales data:', error)
      setSalesData([])
    } finally {
      setLoading(false)
    }
  }

  const toggleDataset = (dataset: string) => {
    if (activeDataset.includes(dataset)) {
      setActiveDataset(activeDataset.filter((d) => d !== dataset))
    } else {
      setActiveDataset([...activeDataset, dataset])
    }
  }

  if (loading) {
    return (
      <div className="chart-loading">
        <div className="loading-spinner"></div>
      </div>
    )
  }

  // Siapkan data untuk chart
  const labels = salesData.map(item => 
    new Date(item.date).toLocaleDateString('id-ID', { 
      weekday: 'short',
      day: 'numeric'
    })
  )

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Total Roti Terjual',
        data: salesData.map(item => item.total_bread),
        borderColor: 'rgb(59, 130, 246)', // blue-500
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
        fill: true
      },
      {
        label: 'Total Omset (dalam ribuan)',
        data: salesData.map(item => item.total_sales / 1000), // Dibagi 1000 untuk skala yang lebih baik
        borderColor: 'rgb(34, 197, 94)', // green-500
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        tension: 0.4,
        fill: true
      }
    ]
  }

  const options = {
    responsive: true,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Grafik Penjualan 7 Hari Terakhir'
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            let label = context.dataset.label || ''
            if (label) {
              label += ': '
              if (context.dataset.label.includes('Omset')) {
                label += 'Rp ' + (context.parsed.y * 1000).toLocaleString('id-ID')
              } else {
                label += context.parsed.y + ' biji'
              }
            }
            return label
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value: any) {
            return value.toLocaleString('id-ID')
          }
        }
      }
    }
  }

  return (
    <div className="chart-container bg-white rounded-xl shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Statistik Penjualan</h2>
          <p className="text-sm text-gray-500">7 hari terakhir</p>
        </div>

        {/* Custom Legend dengan Toggle */}
        <div className="flex gap-4">
          <button
            onClick={() => toggleDataset('roti')}
            className={`chart-toggle-button ${
              activeDataset.includes('roti') 
                ? 'active-roti' 
                : 'inactive'
            }`}
          >
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            Roti
          </button>
          <button
            onClick={() => toggleDataset('omset')}
            className={`chart-toggle-button ${
              activeDataset.includes('omset') 
                ? 'active-omset' 
                : 'inactive'
            }`}
          >
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            Omset
          </button>
        </div>
      </div>

      {loading ? (
        <div className="chart-loading">
          <div className="loading-spinner"></div>
        </div>
      ) : (
        <div className="relative">
          <Line data={chartData} options={options} />
        </div>
      )}

      {/* Ringkasan dengan Animasi */}
      <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t">
        <div 
          className={`summary-card roti ${
            activeDataset.includes('roti') ? 'opacity-100' : 'opacity-50'
          }`}
          onClick={() => toggleDataset('roti')}
        >
          <div className="text-sm text-gray-600">Total Roti Terjual</div>
          <div className="text-2xl font-bold text-blue-600">
            {salesData.reduce((sum, item) => sum + item.total_bread, 0)
              .toLocaleString('id-ID')} biji
          </div>
        </div>
        <div 
          className={`summary-card omset ${
            activeDataset.includes('omset') ? 'opacity-100' : 'opacity-50'
          }`}
          onClick={() => toggleDataset('omset')}
        >
          <div className="text-sm text-gray-600">Total Omset</div>
          <div className="text-2xl font-bold text-green-600">
            Rp {salesData.reduce((sum, item) => sum + item.total_sales, 0)
              .toLocaleString('id-ID')}
          </div>
        </div>
      </div>
    </div>
  )
} 