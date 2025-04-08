'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@supabase/supabase-js'
import dynamic from 'next/dynamic'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js'
import '@/styles/chart.css'
import { useSales } from '@/contexts/SalesContext'
import { supabase } from '@/lib/supabase'

// Dynamic import untuk Line component
const Line = dynamic(
  () => import('react-chartjs-2').then(mod => mod.Line),
  { ssr: false }
)

// Registrasi komponen Chart.js yang diperlukan
if (typeof window !== 'undefined') {
  ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
  )
}

const _supabaseClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Definisikan tipe untuk rentang waktu
type TimeRange = '7d' | '14d' | '30d' | '60d'

// Definisikan label untuk rentang waktu (tidak digunakan untuk saat ini)
const _timeRangeLabels: Record<TimeRange, string> = {
  '7d': '7 hari terakhir',
  '14d': '14 hari terakhir',
  '30d': '1 bulan terakhir',
  '60d': '2 bulan terakhir'
}

export default function SalesChart() {
  const { currentMonth, setCurrentMonth, _isLoading, _refreshData, _contextSalesData } = useSales()
  const [loading, setLoading] = useState(true)
  const [chartData, setChartData] = useState<any>({ dailyData: [], stats: null })
  const [activeDataset, setActiveDataset] = useState<string[]>(['roti'])
  const chartRef = useRef(null)
  const [_timeRange] = useState<TimeRange>('7d')
  const [dataIncomplete, setDataIncomplete] = useState(false)
  const [displayMode, setDisplayMode] = useState<'daily' | 'cumulative'>('daily')
  const [isFullscreen, setIsFullscreen] = useState(false)
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const [activeTooltip, setActiveTooltip] = useState(false)
  const [_tooltipVisible, setTooltipVisible] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  const fetchChartData = useCallback(async () => {
    try {
      setLoading(true)
      
      // Ambil semua data yang tersedia
      const { data, error } = await supabase
        .from('daily_sales')
        .select('*')
        .order('date', { ascending: true })

      if (error) throw error

      console.log('Raw data from DB:', data)
      
      // Jika tidak ada data, kembalikan array kosong
      if (!data || data.length === 0) {
        setChartData({ dailyData: [], stats: null })
        setLoading(false)
        return
      }
      
      // Log semua tanggal yang ada di database untuk debugging
      console.log('Tanggal di database:', data.map(item => item.date))
      
      // Tentukan tanggal awal dan akhir berdasarkan data yang ada
      // Gunakan tanggal terlama dan terbaru dari data
      const dates = data.map(item => new Date(item.date))
      const oldestDate = new Date(Math.min(...dates.map(date => date.getTime())))
      const newestDate = new Date(Math.max(...dates.map(date => date.getTime())))
      
      // Tambahkan satu hari untuk penyesuaian tampilan
      oldestDate.setDate(oldestDate.getDate() + 1)
      newestDate.setDate(newestDate.getDate() + 1)
      
      console.log('Tanggal terlama:', oldestDate.toISOString().split('T')[0])
      console.log('Tanggal terbaru:', newestDate.toISOString().split('T')[0])
      
      // Buat array dengan semua tanggal dalam rentang
      const dateArray = []
      const currentDate = new Date(oldestDate)
      while (currentDate <= newestDate) {
        dateArray.push(currentDate.toISOString().split('T')[0])
        currentDate.setDate(currentDate.getDate() + 1)
      }
      
      console.log('Array tanggal yang akan ditampilkan:', dateArray)
      
      // Buat dataset lengkap dengan nilai 0 untuk tanggal yang tidak ada data
      const completeData = dateArray.map(date => {
        // Cari data yang sesuai dengan tanggal ini
        const existingData = data.find(item => {
          // Tambahkan satu hari ke tanggal dari database untuk mencocokkan dengan tampilan
          const displayDate = new Date(item.date)
          displayDate.setDate(displayDate.getDate() + 1)
          const adjustedDate = displayDate.toISOString().split('T')[0]
          return adjustedDate === date
        })
        
        return {
          date,
          total_bread: existingData?.total_bread || 0,
          total_sales: existingData?.total_sales || 0
        }
      })
      
      // Pastikan data diurutkan berdasarkan tanggal (kronologis)
      completeData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      
      console.log('Data yang akan ditampilkan:', completeData)
      
      // Tambahkan data kumulatif
      let cumulativeBread = 0
      let cumulativeSales = 0
      
      const completeDataWithCumulative = completeData.map(item => {
        cumulativeBread += item.total_bread
        cumulativeSales += item.total_sales
        
        return {
          ...item,
          cumulative_bread: cumulativeBread,
          cumulative_sales: cumulativeSales
        }
      })
      
      // Hitung statistik
      const totalBread = completeDataWithCumulative.reduce((sum, day) => sum + day.total_bread, 0)
      const totalSales = completeDataWithCumulative.reduce((sum, day) => sum + day.total_sales, 0)
      
      // Hitung rata-rata hanya untuk hari dengan data
      const daysWithBread = completeDataWithCumulative.filter(d => d.total_bread > 0).length || 1
      const daysWithSales = completeDataWithCumulative.filter(d => d.total_sales > 0).length || 1
      
      const avgBread = Math.round(totalBread / daysWithBread)
      const avgSales = Math.round(totalSales / daysWithSales)
      
      // Hitung garis tren
      const xValues = completeDataWithCumulative.map((_, i) => i)
      const breadValues = completeDataWithCumulative.map(d => d.total_bread)
      const salesValues = completeDataWithCumulative.map(d => d.total_sales)
      
      const breadTrendLine = calculateTrendLine(xValues, breadValues)
      const salesTrendLine = calculateTrendLine(xValues, salesValues)
      
      // Hitung persentase perubahan
      const breadPercentageChanges = completeDataWithCumulative.map((item, index) => {
        if (index === 0) return 0
        const prev = completeDataWithCumulative[index - 1].total_bread
        const current = item.total_bread
        if (prev === 0) return current > 0 ? 100 : 0
        return ((current - prev) / prev) * 100
      })
      
      const salesPercentageChanges = completeDataWithCumulative.map((item, index) => {
        if (index === 0) return 0
        const prev = completeDataWithCumulative[index - 1].total_sales
        const current = item.total_sales
        if (prev === 0) return current > 0 ? 100 : 0
        return ((current - prev) / prev) * 100
      })
      
      // Hitung tren keseluruhan
      const firstBread = completeDataWithCumulative[0].total_bread
      const lastBread = completeDataWithCumulative[completeDataWithCumulative.length - 1].total_bread
      const breadTrend = firstBread > 0 ? ((lastBread - firstBread) / firstBread) * 100 : 0
      
      const firstSales = completeDataWithCumulative[0].total_sales
      const lastSales = completeDataWithCumulative[completeDataWithCumulative.length - 1].total_sales
      const salesTrend = firstSales > 0 ? ((lastSales - firstSales) / firstSales) * 100 : 0
      
      const stats = {
        totalBread,
        totalSales,
        avgBread,
        avgSales,
        breadTrendLine,
        salesTrendLine,
        breadTrend,
        salesTrend
      }
      
      setChartData({
        dailyData: completeDataWithCumulative,
        stats,
        breadPercentageChanges,
        salesPercentageChanges
      })
      
      // Cek kelengkapan data
      const dataPoints = data.filter(item => {
        const itemDate = new Date(item.date)
        itemDate.setDate(itemDate.getDate() + 1)
        const adjustedDate = itemDate.toISOString().split('T')[0]
        return dateArray.includes(adjustedDate)
      }).length
      
      setDataIncomplete(dataPoints !== dateArray.length)
      
    } catch (error) {
      console.error('Error fetching chart data:', error)
      setDataIncomplete(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchChartData()
  }, [fetchChartData])

  // Fungsi untuk menghitung garis tren (regresi linear sederhana)
  const calculateTrendLine = (xValues: number[], yValues: number[]) => {
    const n = xValues.length
    if (n <= 1) return { slope: 0, intercept: yValues[0] || 0, values: yValues }
    
    // Hitung rata-rata x dan y
    const xMean = xValues.reduce((sum, val) => sum + val, 0) / n
    const yMean = yValues.reduce((sum, val) => sum + val, 0) / n
    
    // Hitung slope (m) dan intercept (b) untuk persamaan y = mx + b
    let numerator = 0
    let denominator = 0
    
    for (let i = 0; i < n; i++) {
      numerator += (xValues[i] - xMean) * (yValues[i] - yMean)
      denominator += Math.pow(xValues[i] - xMean, 2)
    }
    
    const slope = denominator !== 0 ? numerator / denominator : 0
    const intercept = yMean - slope * xMean
    
    // Hitung nilai tren untuk setiap titik
    const trendValues = xValues.map(x => slope * x + intercept)
    
    return { slope, intercept, values: trendValues }
  }

  // Fungsi untuk navigasi bulan
  const navigateMonth = (direction: 'prev' | 'next') => {
    // Dapatkan nilai bulan dan tahun saat ini
    const prevMonth = currentMonth.month;
    const prevYear = currentMonth.year;
    
    // Hitung bulan dan tahun baru
    let newMonth = prevMonth;
    let newYear = prevYear;
    
    if (direction === 'prev') {
      newMonth--;
      if (newMonth < 1) {
        newMonth = 12;
        newYear--;
      }
    } else {
      newMonth++;
      if (newMonth > 12) {
        newMonth = 1;
        newYear++;
      }
    }
    
    // Set nilai baru langsung sebagai objek
    setCurrentMonth({ month: newMonth, year: newYear });
  }

  // Fungsi yang tidak digunakan diberi prefix underscore
  const _calculatePercentageChange = (currentValue: number, previousValue: number) => {
    if (previousValue === 0) return 0
    return ((currentValue - previousValue) / previousValue) * 100
  }

  // Fungsi untuk mengubah rentang waktu (tidak digunakan untuk saat ini)
  const _handleTimeRangeChange = (range: TimeRange) => {
    console.log('Time range changed:', range)
  }

  // Tambahkan fungsi untuk memaksa refresh data
  const forceRefresh = () => {
    fetchChartData()
  }

  // Fungsi untuk toggle fullscreen
  const toggleFullscreen = useCallback(() => {
    if (!chartContainerRef.current) return
    
    if (!isFullscreen) {
      // Lock orientasi ke landscape untuk mobile
      if (window.screen && window.screen.orientation) {
        try {
          // Lock ke landscape menggunakan optional chaining
          window.screen.orientation?.lock?.('landscape')
            .catch(err => console.warn('Tidak dapat mengunci orientasi:', err))
        } catch (err) {
          console.warn('Browser tidak mendukung screen orientation lock:', err)
        }
      }

      // Masuk mode fullscreen
      if (chartContainerRef.current.requestFullscreen) {
        chartContainerRef.current.requestFullscreen()
          .then(() => {
            setIsFullscreen(true)
            // Sesuaikan ukuran chart setelah fullscreen
            if (chartRef.current?.chart) {
              setTimeout(() => {
                chartRef.current.chart.resize()
                chartRef.current.chart.update('none')
              }, 100)
            }
          })
          .catch(err => console.error('Error saat masuk mode fullscreen:', err))
      } else if ((chartContainerRef.current as any).webkitRequestFullscreen) {
        (chartContainerRef.current as any).webkitRequestFullscreen()
        setIsFullscreen(true)
        // Sesuaikan ukuran chart setelah fullscreen
        if (chartRef.current?.chart) {
          setTimeout(() => {
            chartRef.current.chart.resize()
            chartRef.current.chart.update('none')
          }, 100)
        }
      }
    } else {
      // Keluar dari mode fullscreen
      if (document.exitFullscreen) {
        document.exitFullscreen()
          .then(() => {
            setIsFullscreen(false)
            // Unlock orientasi
            if (window.screen && window.screen.orientation) {
              try {
                window.screen.orientation.unlock()
              } catch (err) {
                console.warn('Tidak dapat unlock orientasi:', err)
              }
            }
            // Sesuaikan ukuran chart setelah keluar fullscreen
            if (chartRef.current?.chart) {
              setTimeout(() => {
                chartRef.current.chart.resize()
                chartRef.current.chart.update('none')
              }, 100)
            }
          })
          .catch(err => console.error('Error saat keluar mode fullscreen:', err))
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen()
        setIsFullscreen(false)
        // Unlock orientasi
        if (window.screen && window.screen.orientation) {
          try {
            window.screen.orientation.unlock()
          } catch (err) {
            console.warn('Tidak dapat unlock orientasi:', err)
          }
        }
        // Sesuaikan ukuran chart setelah keluar fullscreen
        if (chartRef.current?.chart) {
          setTimeout(() => {
            chartRef.current.chart.resize()
            chartRef.current.chart.update('none')
          }, 100)
        }
      }
    }
  }, [isFullscreen])
  
  // Tambahkan useEffect untuk menangani perubahan orientasi
  useEffect(() => {
    const handleOrientationChange = () => {
      if (chartRef.current?.chart) {
        // Berikan waktu untuk layout selesai berubah
        setTimeout(() => {
          chartRef.current.chart.resize()
          chartRef.current.chart.update('none')
        }, 100)
      }
    }

    window.addEventListener('orientationchange', handleOrientationChange)
    
    return () => {
      window.removeEventListener('orientationchange', handleOrientationChange)
      // Pastikan unlock orientasi saat komponen unmount
      if (window.screen && window.screen.orientation) {
        try {
          window.screen.orientation.unlock()
        } catch (err) {
          console.warn('Tidak dapat unlock orientasi saat unmount:', err)
        }
      }
    }
  }, [])

  // Update CSS untuk fullscreen mode
  useEffect(() => {
    if (isFullscreen) {
      const updateFullscreenStyle = () => {
        if (chartRef.current?.chart) {
          // Sesuaikan opsi chart untuk mode fullscreen
          chartRef.current.chart.options.maintainAspectRatio = false
          chartRef.current.chart.options.layout.padding = {
            left: 20,
            right: 30,
            top: 30,
            bottom: 20
          }
          chartRef.current.chart.resize()
          chartRef.current.chart.update('none')
        }
      }

      updateFullscreenStyle()
      window.addEventListener('resize', updateFullscreenStyle)
      
      return () => {
        window.removeEventListener('resize', updateFullscreenStyle)
      }
    }
  }, [isFullscreen])

  // Tambahkan konfigurasi khusus untuk mobile
  useEffect(() => {
    const isMobile = window.innerWidth < 768
    
    if (isMobile && chartRef.current && chartRef.current.chart) {
      // Sesuaikan ukuran font dan padding untuk mobile
      chartRef.current.chart.options.scales.x.ticks.font.size = 8
      chartRef.current.chart.options.plugins.legend.labels.font = { size: 10 }
      chartRef.current.chart.options.plugins.tooltip.titleFont = { size: 12 }
      chartRef.current.chart.options.plugins.tooltip.bodyFont = { size: 11 }
      chartRef.current.chart.update()
    }
  }, [chartData])

  // Tambahkan useEffect untuk memastikan grafik dirender dengan benar di mobile
  useEffect(() => {
    // Fungsi untuk memastikan grafik dirender ulang saat ukuran layar berubah
    const handleResize = () => {
      if (chartRef.current && chartRef.current.chart) {
        // Paksa update chart
        chartRef.current.chart.resize();
        chartRef.current.chart.update();
      }
    };
    
    // Panggil fungsi resize saat komponen dimount
    setTimeout(handleResize, 100);
    
    // Tambahkan event listener untuk resize
    window.addEventListener('resize', handleResize);
    
    // Tambahkan event listener untuk orientasi layar
    window.addEventListener('orientationchange', () => {
      setTimeout(handleResize, 300);
    });
    
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, [chartData]);

  // Tambahkan event listener untuk menangani klik di luar grafik
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (activeTooltip && chartRef.current && !chartRef.current.canvas.contains(event.target as Node)) {
        if (chartRef.current.chart) {
          // Sembunyikan tooltip
          chartRef.current.chart.tooltip.setActiveElements([], { x: 0, y: 0 });
          chartRef.current.chart.update();
          setActiveTooltip(false);
        }
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [activeTooltip]);

  if (!isMounted) {
    return (
      <div className="chart-loading">
        <div className="loading-spinner"></div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="chart-loading">
        <div className="loading-spinner"></div>
      </div>
    )
  }

  // Siapkan data untuk chart
  const labels = chartData.dailyData.map(item => 
    new Date(item.date).toLocaleDateString('id-ID', { 
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    })
  )
  
  // Hitung data berdasarkan mode tampilan
  const breadData = displayMode === 'daily' 
    ? chartData.dailyData.map(item => item.total_bread)
    : chartData.dailyData.map(item => item.cumulative_bread)
    
  const salesChartData = displayMode === 'daily'
    ? chartData.dailyData.map(item => item.total_sales / 1000)
    : chartData.dailyData.map(item => item.cumulative_sales / 1000)
  
  // Siapkan data tren
  const breadTrendData = chartData.stats?.breadTrendLine?.values || []
  const salesTrendData = chartData.stats?.salesTrendLine?.values.map(val => val / 1000) || []

  // Gunakan persentase perubahan dari chartData
  const breadPercentageChanges = chartData.breadPercentageChanges || []
  const salesPercentageChanges = chartData.salesPercentageChanges || []

  // Gunakan tren dari chartData
  const _breadTrend = chartData.stats?.breadTrend || 0
  const _salesTrend = chartData.stats?.salesTrend || 0

  const chartDataForChartJS = {
    labels: labels,
    datasets: [
      {
        label: displayMode === 'daily' ? 'Total Roti Terjual' : 'Kumulatif Roti Terjual',
        data: breadData,
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: (context) => {
          const ctx = context.chart.ctx;
          const gradient = ctx.createLinearGradient(0, 0, 0, 300);
          gradient.addColorStop(0, 'rgba(59, 130, 246, 0.3)');
          gradient.addColorStop(1, 'rgba(59, 130, 246, 0.0)');
          return gradient;
        },
        tension: 0,
        fill: true,
        pointBackgroundColor: 'rgb(59, 130, 246)',
        pointRadius: 4,
        pointHoverRadius: 6,
        pointStyle: 'circle',
        pointBorderWidth: 2,
        pointBorderColor: 'white',
        order: 1
      },
      {
        label: displayMode === 'daily' ? 'Total Omset (dalam ribuan)' : 'Kumulatif Omset (dalam ribuan)',
        data: salesChartData,
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: (context) => {
          const ctx = context.chart.ctx;
          const gradient = ctx.createLinearGradient(0, 0, 0, 300);
          gradient.addColorStop(0, 'rgba(34, 197, 94, 0.3)');
          gradient.addColorStop(1, 'rgba(34, 197, 94, 0.0)');
          return gradient;
        },
        tension: 0,
        fill: true,
        pointBackgroundColor: 'rgb(34, 197, 94)',
        pointRadius: 4,
        pointHoverRadius: 6,
        pointStyle: 'circle',
        pointBorderWidth: 2,
        pointBorderColor: 'white',
        order: 2
      },
      {
        label: 'Tren Roti',
        data: breadTrendData,
        borderColor: 'rgba(59, 130, 246, 0.7)',
        borderWidth: 2,
        borderDash: [5, 5],
        tension: 0,
        pointRadius: 0,
        fill: false,
        order: 5,
        hidden: !activeDataset.includes('roti')
      },
      {
        label: 'Tren Omset',
        data: salesTrendData,
        borderColor: 'rgba(34, 197, 94, 0.7)',
        borderWidth: 2,
        borderDash: [5, 5],
        tension: 0,
        pointRadius: 0,
        fill: false,
        order: 6,
        hidden: !activeDataset.includes('omset')
      },
      {
        label: 'Perubahan Roti (%)',
        data: breadPercentageChanges,
        borderColor: 'rgba(99, 102, 241, 0.8)',
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        borderWidth: 1,
        borderDash: [3, 3],
        tension: 0,
        pointRadius: 3,
        pointBackgroundColor: (context) => {
          if (context.dataIndex === 0 || context.dataIndex === labels.length - 1) return 'rgba(99, 102, 241, 0.8)';
          const value = breadPercentageChanges[context.dataIndex];
          return value >= 0 ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)';
        },
        pointBorderColor: 'white',
        pointBorderWidth: 1,
        yAxisID: 'percentage',
        hidden: !activeDataset.includes('roti'),
        order: 3
      },
      {
        label: 'Perubahan Omset (%)',
        data: salesPercentageChanges,
        borderColor: 'rgba(236, 72, 153, 0.8)',
        backgroundColor: 'rgba(236, 72, 153, 0.1)',
        borderWidth: 1,
        borderDash: [3, 3],
        tension: 0,
        pointRadius: 3,
        pointBackgroundColor: (context) => {
          if (context.dataIndex === 0 || context.dataIndex === labels.length - 1) return 'rgba(236, 72, 153, 0.8)';
          const value = salesPercentageChanges[context.dataIndex];
          return value >= 0 ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)';
        },
        pointBorderColor: 'white',
        pointBorderWidth: 1,
        yAxisID: 'percentage',
        hidden: !activeDataset.includes('omset'),
        order: 4
      }
    ]
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    devicePixelRatio: window?.devicePixelRatio || 2,
    interaction: {
      mode: 'nearest' as const,
      axis: 'x',
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top' as const,
        align: 'start' as const,
        labels: {
          boxWidth: window?.innerWidth < 768 ? 10 : 12,
          padding: window?.innerWidth < 768 ? 10 : 20,
          font: {
            size: window?.innerWidth < 768 ? 11 : 12
          },
          usePointStyle: true,
          filter: (_item) => true
        },
        margin: {
          bottom: window?.innerWidth < 768 ? 20 : 30
        }
      },
      tooltip: {
        enabled: true,
        mode: 'index',
        intersect: false,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        titleColor: '#1f2937',
        bodyColor: '#4b5563',
        borderColor: '#e5e7eb',
        borderWidth: 1,
        padding: window?.innerWidth < 768 ? 10 : 12,
        bodyFont: {
          size: window?.innerWidth < 768 ? 11 : 12
        },
        titleFont: {
          size: window?.innerWidth < 768 ? 12 : 13
        },
        displayColors: true,
        callbacks: {
          label: function(context) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
              if (label.includes('Roti')) {
                if (label.includes('Perubahan')) {
                  label += context.parsed.y.toFixed(1) + '%';
                } else {
                  label += context.parsed.y + ' biji';
                }
              } else if (label.includes('Omset')) {
                if (label.includes('Perubahan')) {
                  label += context.parsed.y.toFixed(1) + '%';
                } else {
                  label += 'Rp ' + (context.parsed.y * 1000).toLocaleString('id-ID');
                }
              }
            }
            return label;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
          drawBorder: false
        },
        border: {
          display: false
        },
        ticks: {
          font: {
            size: window?.innerWidth < 768 ? 10 : 12
          },
          padding: window?.innerWidth < 768 ? 5 : 8,
          maxTicksLimit: window?.innerWidth < 768 ? 6 : 8,
          color: '#6b7280'
        }
      },
      percentage: {
        position: 'right' as const,
        beginAtZero: true,
        grid: {
          display: false
        },
        border: {
          display: false
        },
        ticks: {
          font: {
            size: window?.innerWidth < 768 ? 10 : 12
          },
          padding: window?.innerWidth < 768 ? 5 : 8,
          maxTicksLimit: window?.innerWidth < 768 ? 6 : 8,
          color: '#6b7280',
          callback: function(value) {
            return value + '%';
          }
        }
      },
      x: {
        grid: {
          display: false
        },
        border: {
          display: false
        },
        ticks: {
          font: {
            size: window?.innerWidth < 768 ? 10 : 11
          },
          maxRotation: window?.innerWidth < 768 ? 45 : 0,
          minRotation: window?.innerWidth < 768 ? 45 : 0,
          maxTicksLimit: window?.innerWidth < 768 ? 8 : 10,
          color: '#6b7280',
          padding: window?.innerWidth < 768 ? 5 : 8
        }
      }
    },
    layout: {
      padding: {
        left: window?.innerWidth < 768 ? 8 : 10,
        right: window?.innerWidth < 768 ? 15 : 20,
        top: window?.innerWidth < 768 ? 15 : 20,
        bottom: window?.innerWidth < 768 ? 8 : 10
      }
    },
    elements: {
      point: {
        radius: window?.innerWidth < 768 ? 3 : 4,
        hoverRadius: window?.innerWidth < 768 ? 5 : 6,
        hitRadius: window?.innerWidth < 768 ? 10 : 12
      },
      line: {
        tension: 0.3,
        borderWidth: window?.innerWidth < 768 ? 2 : 2.5
      }
    }
  } as any;

  // Fungsi yang tidak digunakan diberi prefix underscore
  const _togglePercentageDataset = (dataset: string) => {
    const chartInstance = chartRef.current;
    if (!chartInstance) return;
    
    // Periksa apakah chart instance memiliki properti chart
    if (!chartInstance.chart) {
      console.warn('Chart instance tidak memiliki properti chart');
      return;
    }
    
    const chart = chartInstance.chart;
    const datasetIndex = dataset === 'roti' ? 2 : 3; // Indeks dataset persentase
    
    // Periksa apakah indeks dataset valid
    if (datasetIndex >= chart.data.datasets.length) {
      console.warn(`Dataset dengan indeks ${datasetIndex} tidak ditemukan`);
      return;
    }
    
    try {
      const meta = chart.getDatasetMeta(datasetIndex);
      meta.hidden = !meta.hidden;
      chart.update();
    } catch (error) {
      console.error('Error saat toggle dataset persentase:', error);
    }
  }

  // Modifikasi fungsi toggle dataset
  const toggleDataset = (dataset: string) => {
    if (activeDataset.includes(dataset)) {
      setActiveDataset(activeDataset.filter((d) => d !== dataset));
    } else {
      setActiveDataset([...activeDataset, dataset]);
    }
    
    // Hanya panggil togglePercentageDataset jika chart sudah diinisialisasi
    if (chartRef.current && chartRef.current.chart) {
      _togglePercentageDataset(dataset);
    }
  }

  // Fungsi yang tidak digunakan diberi prefix underscore
  const _handleChartClick = () => {
    setTooltipVisible(true)
    if (chartRef.current?.chart) {
      chartRef.current.chart.update()
    }
  }

  return (
    <div className="chart-container">
      <div className="chart-header">
        <div className="chart-title-section">
          <h2 className="chart-title">Statistik Penjualan</h2>
          <div className="chart-actions">
            <button
              onClick={toggleFullscreen}
              className="chart-button secondary"
              title={isFullscreen ? "Keluar Fullscreen" : "Mode Fullscreen"}
            >
              {isFullscreen ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5M15 15l5.25 5.25" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
                </svg>
              )}
            </button>
            <button
              onClick={forceRefresh}
              className="chart-button secondary"
              title="Refresh Data"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>

        <div className="chart-controls">
          <div className="control-group">
            <button 
              onClick={() => navigateMonth('prev')}
              className="chart-button secondary"
            >
              ←
            </button>
            <span className="text-gray-600">
              {new Intl.DateTimeFormat('id-ID', { 
                month: 'long', 
                year: 'numeric' 
              }).format(new Date(currentMonth.year, currentMonth.month - 1, 1))}
            </span>
            <button 
              onClick={() => navigateMonth('next')}
              className="chart-button secondary"
            >
              →
            </button>
          </div>

          <div className="control-group">
            <button
              onClick={() => setDisplayMode('daily')}
              className={`chart-button ${displayMode === 'daily' ? 'primary' : 'secondary'}`}
            >
              Harian
            </button>
            <button
              onClick={() => setDisplayMode('cumulative')}
              className={`chart-button ${displayMode === 'cumulative' ? 'primary' : 'secondary'}`}
            >
              Kumulatif
            </button>
          </div>

          <div className="control-group">
            <button
              onClick={() => toggleDataset('roti')}
              className={`chart-button ${activeDataset.includes('roti') ? 'primary' : 'secondary'}`}
            >
              Data Roti
            </button>
            <button
              onClick={() => toggleDataset('omset')}
              className={`chart-button ${activeDataset.includes('omset') ? 'primary' : 'secondary'}`}
            >
              Data Omset
            </button>
          </div>
        </div>

        {dataIncomplete && (
          <div className="chart-warning">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>Data tidak lengkap, analisis mungkin tidak akurat</span>
          </div>
        )}
      </div>

      <div className={`chart-wrapper ${isFullscreen ? 'fullscreen-chart' : ''}`}>
        <div 
          className="chart-empty-area"
          onClick={() => {
            if (chartRef.current?.chart) {
              // Sembunyikan tooltip
              chartRef.current.chart.tooltip.setActiveElements([], { x: 0, y: 0 });
              chartRef.current.chart.update();
              setActiveTooltip(false);
            }
          }}
        />
        <Line ref={chartRef} data={chartDataForChartJS} options={options} />
      </div>

      {!isFullscreen && (
        <div className="stats-grid">
          <div className="stats-card">
            <div className="title">Total Roti</div>
            <div className="value">{chartData.stats?.totalBread.toLocaleString('id-ID')} biji</div>
          </div>
          <div className="stats-card">
            <div className="title">Total Omset</div>
            <div className="value">Rp {chartData.stats?.totalSales.toLocaleString('id-ID')}</div>
          </div>
          <div className="stats-card">
            <div className="title">Rata-rata/Hari</div>
            <div className="value">{chartData.stats?.avgBread.toLocaleString('id-ID')} biji</div>
          </div>
          <div className="stats-card">
            <div className="title">Rata-rata Omset</div>
            <div className="value">Rp {chartData.stats?.avgSales.toLocaleString('id-ID')}</div>
          </div>
        </div>
      )}
    </div>
  )
}