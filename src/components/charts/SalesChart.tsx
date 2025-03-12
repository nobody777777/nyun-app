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
  const [windowWidth, setWindowWidth] = useState(0)

  useEffect(() => {
    // Update window width
    const handleResize = () => setWindowWidth(window.innerWidth)
    handleResize() // Initial call
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const fetchData = async () => {
    try {
      const endDate = new Date()
      const startDate = new Date()
      startDate.setDate(endDate.getDate() - 6)

      const { data, error } = await supabase
        .from('daily_sales')
        .select('*')
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', endDate.toISOString().split('T')[0])
        .order('date', { ascending: true })

      if (error) throw error

      console.log('Fetched Sales Data:', data)
      setSalesData(data || [])
    } catch (error) {
      console.error('Error fetching sales data:', error)
      setSalesData([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

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
        data: salesData.map(item => {
          const breadValue = Number(item.total_bread)
          return isNaN(breadValue) ? 0 : breadValue
        }),
        borderColor: 'rgb(59, 130, 246)', // blue-500
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
        fill: true,
        pointRadius: windowWidth < 640 ? 3 : 5,
        pointBackgroundColor: 'blue'
      },
      {
        label: 'Total Omset (dalam ribuan)',
        data: salesData.map(item => {
          const salesValue = Number(item.total_sales) / 1000
          return isNaN(salesValue) ? 0 : salesValue
        }),
        borderColor: 'rgb(34, 197, 94)', // green-500
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        tension: 0.4,
        fill: true,
        pointRadius: windowWidth < 640 ? 3 : 5,
        pointBackgroundColor: 'green'
      }
    ]
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    devicePixelRatio: window.devicePixelRatio || 1,
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          font: {
            size: windowWidth < 640 ? 10 : 12
          }
        }
      },
      title: {
        display: true,
        text: 'Grafik Penjualan 7 Hari Terakhir',
        font: {
          size: windowWidth < 640 ? 12 : 14
        }
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
      x: {
        ticks: {
          font: {
            size: windowWidth < 640 ? 8 : 10
          }
        }
      },
      y: {
        beginAtZero: true,
        min: 0,
        max: Math.max(...salesData.map(item => Number(item.total_bread) || 0)) * 1.2,
        ticks: {
          font: {
            size: windowWidth < 640 ? 8 : 10
          }
        }
      }
    }
  }

  return (
    <div 
      className="chart-container bg-white rounded-xl shadow-md p-6"
      style={{ 
        height: windowWidth < 640 ? '300px' : '400px', 
        width: '100%',
        position: 'relative'
      }}
    >
      {salesData.length === 0 ? (
        <div className="text-center text-gray-500">
          Tidak ada data untuk ditampilkan
        </div>
      ) : (
        <div style={{ 
          width: '100%', 
          height: '100%', 
          position: 'relative' 
        }}>
          <Line 
            data={chartData} 
            options={options}
            fallbackContent={
              <div className="text-red-500 text-center w-full">
                Gagal memuat grafik. Coba refresh halaman.
              </div>
            }
            redraw={true}
          />
        </div>
      )}

      <div className="flex justify-between items-center mt-6 pt-6 border-t">
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
            {salesData.reduce((sum, item) => sum + Number(item.total_bread), 0)
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
            Rp {salesData.reduce((sum, item) => sum + Number(item.total_sales), 0)
              .toLocaleString('id-ID')}
          </div>
        </div>
      </div>
    </div>
  )
} 