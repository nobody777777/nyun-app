'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
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
  Legend,
  Filler
} from 'chart.js'
import '@/styles/chart.css'
import { useSales } from '@/contexts/SalesContext'
import { supabase } from '@/lib/supabase'

// Registrasi komponen Chart.js yang diperlukan
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

const supabaseClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Definisikan tipe untuk rentang waktu
type TimeRange = '7d' | '14d' | '30d' | '60d'

// Definisikan label untuk rentang waktu
const timeRangeLabels: Record<TimeRange, string> = {
  '7d': '7 hari terakhir',
  '14d': '14 hari terakhir',
  '30d': '1 bulan terakhir',
  '60d': '2 bulan terakhir'
}

export default function SalesChart() {
  const { currentMonth, setCurrentMonth, isLoading, refreshData, salesData: contextSalesData } = useSales()
  const [loading, setLoading] = useState(true)
  const [chartData, setChartData] = useState<any>({ dailyData: [], stats: null })
  const [activeDataset, setActiveDataset] = useState<string[]>(['roti'])
  const chartRef = useRef(null)
  const [timeRange, setTimeRange] = useState<TimeRange>('7d')
  const [dataIncomplete, setDataIncomplete] = useState(false)
  const [displayMode, setDisplayMode] = useState<'daily' | 'cumulative'>('daily')
  const [isFullscreen, setIsFullscreen] = useState(false)
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const [activeTooltip, setActiveTooltip] = useState(false)
  const [tooltipVisible, setTooltipVisible] = useState(false)

  useEffect(() => {
    fetchChartData()
  }, [timeRange, currentMonth, contextSalesData, refreshData])

  const fetchChartData = async () => {
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
  }

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

  // Fungsi untuk menghitung persentase perubahan
  const calculatePercentageChange = (currentValue: number, previousValue: number) => {
    if (previousValue === 0) return 0;
    return ((currentValue - previousValue) / previousValue) * 100;
  }

  // Fungsi untuk mengubah rentang waktu
  const handleTimeRangeChange = (range: TimeRange) => {
    setTimeRange(range)
  }

  // Tambahkan fungsi untuk memaksa refresh data
  const forceRefresh = () => {
    fetchChartData()
  }

  // Fungsi untuk toggle fullscreen
  const toggleFullscreen = useCallback(() => {
    if (!chartContainerRef.current) return
    
    if (!isFullscreen) {
      if (chartContainerRef.current.requestFullscreen) {
        chartContainerRef.current.requestFullscreen()
          .then(() => setIsFullscreen(true))
          .catch(err => console.error('Error saat masuk mode fullscreen:', err))
      } else if ((chartContainerRef.current as any).webkitRequestFullscreen) {
        (chartContainerRef.current as any).webkitRequestFullscreen()
        setIsFullscreen(true)
      } else if ((chartContainerRef.current as any).msRequestFullscreen) {
        (chartContainerRef.current as any).msRequestFullscreen()
        setIsFullscreen(true)
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen()
          .then(() => setIsFullscreen(false))
          .catch(err => console.error('Error saat keluar mode fullscreen:', err))
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen()
        setIsFullscreen(false)
      } else if ((document as any).msExitFullscreen) {
        (document as any).msExitFullscreen()
        setIsFullscreen(false)
      }
    }
  }, [isFullscreen])
  
  // Deteksi perubahan fullscreen dari browser
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange)
    document.addEventListener('mozfullscreenchange', handleFullscreenChange)
    document.addEventListener('MSFullscreenChange', handleFullscreenChange)
    
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange)
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange)
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange)
    }
  }, [])
  
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
  const breadTrend = chartData.stats?.breadTrend || 0
  const salesTrend = chartData.stats?.salesTrend || 0

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
    devicePixelRatio: 2, // Meningkatkan ketajaman pada layar retina
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top' as const,
        align: 'end' as const,
        labels: {
          generateLabels: (chart: any) => {
            const originalLabels = ChartJS.defaults.plugins.legend.labels.generateLabels(chart);
            return originalLabels.map(label => ({
              ...label,
              onClick: () => {
                setTooltipVisible(false);
                if (chartRef.current?.chart) {
                  chartRef.current.chart.update();
                }
              }
            }));
          },
          usePointStyle: true,
          padding: 20,
          color: '#666',
          font: {
            size: window.innerWidth < 768 ? 10 : 12
          }
        },
        display: true // Selalu tampilkan legend
      },
      title: {
        display: false,
        text: 'Grafik Penjualan',
        font: {
          size: 16,
          weight: 'bold' as const
        } as any,
      },
      tooltip: {
        enabled: tooltipVisible,
        mode: 'index',
        intersect: false,
        events: ['mousemove', 'touchstart', 'touchmove'],
        position: 'nearest',
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        titleColor: '#333',
        bodyColor: '#666',
        borderColor: '#ddd',
        borderWidth: 1,
        padding: 10,
        displayColors: true,
        titleFont: {
          size: window.innerWidth < 768 ? 12 : 14
        },
        bodyFont: {
          size: window.innerWidth < 768 ? 11 : 13
        },
        external: function(context: any) {
          setActiveTooltip(context.tooltip.opacity !== 0);
        },
        callbacks: {
          label: function(context: any) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
              if (label.includes('Perubahan')) {
                const value = context.parsed.y;
                const sign = value >= 0 ? '+' : '';
                label += sign + value.toFixed(2) + '%';
              } else if (label.includes('Omset')) {
                label += 'Rp ' + (context.parsed.y * 1000).toLocaleString('id-ID');
              } else {
                label += context.parsed.y + ' biji';
              }
            }
            return label;
          },
          title: function(context: any) {
            return context[0].label;
          },
          afterBody: function(context: any) {
            const dayData = chartData.dailyData[context[0].dataIndex];
            const dayIndex = context[0].dataIndex;
            
            let result = [
              '',
              `Roti terjual: ${dayData.total_bread.toLocaleString('id-ID')} biji`,
              `Omset: Rp ${dayData.total_sales.toLocaleString('id-ID')}`
            ];
            
            if (displayMode === 'cumulative') {
              result.push(
                '',
                `Kumulatif roti: ${dayData.cumulative_bread.toLocaleString('id-ID')} biji`,
                `Kumulatif omset: Rp ${dayData.cumulative_sales.toLocaleString('id-ID')}`
              );
            }
            
            if (dayIndex > 0) {
              const breadChange = breadPercentageChanges[dayIndex];
              const salesChange = salesPercentageChanges[dayIndex];
              const breadSign = breadChange >= 0 ? '▲' : '▼';
              const salesSign = salesChange >= 0 ? '▲' : '▼';
              
              result.push(
                '',
                `Perubahan Roti: ${breadSign} ${Math.abs(breadChange).toFixed(2)}%`,
                `Perubahan Omset: ${salesSign} ${Math.abs(salesChange).toFixed(2)}%`
              );
            }
            
            return result;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: displayMode === 'daily',
        title: {
          display: true,
          text: displayMode === 'daily' ? 'Jumlah / Nilai Harian' : 'Jumlah / Nilai Kumulatif'
        },
        ticks: {
          font: {
            size: window.innerWidth < 768 ? 10 : 12
          },
          color: 'rgb(55, 65, 81)',
          padding: window.innerWidth < 768 ? 5 : 8
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.05)'
        },
        // Aktifkan adaptasi skala otomatis untuk perubahan kecil
        adapters: {
          autoSkip: false
        }
      },
      percentage: {
        position: 'right' as const,
        beginAtZero: false,
        title: {
          display: true,
          text: 'Perubahan (%)'
        },
        ticks: {
          font: {
            size: window.innerWidth < 768 ? 10 : 12
          }
        },
        grid: {
          drawOnChartArea: false
        }
      },
      x: {
        ticks: {
          font: {
            weight: 'normal',
            size: window.innerWidth < 768 ? 9 : (timeRange === '60d' ? 9 : (timeRange === '30d' ? 10 : 11))
          },
          color: 'rgb(55, 65, 81)',
          maxRotation: window.innerWidth < 768 ? 45 : 0,
          minRotation: window.innerWidth < 768 ? 45 : 0,
          autoSkip: true,
          maxTicksLimit: window.innerWidth < 768 ? 7 : 15
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.05)'
        },
        offset: false,
        alignToPixels: true,
        bounds: 'ticks'
      }
    },
    animation: {
      duration: 500 // Kurangi durasi animasi untuk performa lebih baik di mobile
    },
    elements: {
      point: {
        radius: window.innerWidth < 768 ? 2 : 3,
        hoverRadius: window.innerWidth < 768 ? 4 : 6
      },
      line: {
        tension: 0.3,
        borderWidth: window.innerWidth < 768 ? 2 : 3
      }
    }
  } as any;

  // Fungsi untuk toggle dataset persentase
  const togglePercentageDataset = (dataset: string) => {
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
      togglePercentageDataset(dataset);
    }
  }

  // Tambahkan handler untuk interaksi chart
  const handleChartClick = () => {
    setTooltipVisible(true);
    if (chartRef.current?.chart) {
      chartRef.current.chart.update();
    }
  };

  return (
    <div className="chart-container bg-white rounded-xl shadow-md p-6 dark:bg-gray-800">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200">Statistik Penjualan</h2>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => navigateMonth('prev')}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              ←
            </button>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(
                new Date(currentMonth.year, currentMonth.month - 1, 1)
              )}
            </p>
            <button 
              onClick={() => navigateMonth('next')}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              →
            </button>
            <button
              onClick={forceRefresh}
              className="ml-2 text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
              title="Refresh Data"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
          
          {dataIncomplete && (
            <div className="mt-2 text-xs text-amber-600 dark:text-amber-400 flex items-center">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Data tidak lengkap, analisis mungkin tidak akurat
            </div>
          )}
        </div>

        <div className="flex rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setDisplayMode('daily')}
            className={`px-3 py-1 text-xs font-medium ${
              displayMode === 'daily'
                ? 'bg-blue-500 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
            }`}
          >
            Harian
          </button>
          <button
            onClick={() => setDisplayMode('cumulative')}
            className={`px-3 py-1 text-xs font-medium ${
              displayMode === 'cumulative'
                ? 'bg-blue-500 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
            }`}
          >
            Kumulatif
          </button>
        </div>

        <div className="flex gap-2">
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
        <div className="chart-loading flex justify-center items-center py-20">
          <div className="loading-spinner"></div>
        </div>
      ) : chartData.dailyData.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <svg className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">Tidak Ada Data</h3>
          <p className="text-gray-500 dark:text-gray-400 max-w-md">
            Tidak ada data penjualan untuk periode {timeRangeLabels[timeRange]}. Silakan pilih rentang waktu yang berbeda.
          </p>
        </div>
      ) : (
        <div className="relative chart-wrapper" ref={chartContainerRef} onClick={handleChartClick}>
          <div className="absolute top-2 right-2 z-10 flex gap-2">
            <button
              onClick={toggleFullscreen}
              className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600"
              title={isFullscreen ? "Keluar Fullscreen" : "Tampilan Fullscreen"}
            >
              {isFullscreen ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
                </svg>
              )}
            </button>
            <button
              onClick={() => {
                // Rotasi layar
                if (screen.orientation) {
                  if (screen.orientation.type.includes('portrait')) {
                    (screen.orientation as any).lock('landscape')
                      .catch(err => console.error('Error saat rotasi layar:', err))
                  } else {
                    (screen.orientation as any).lock('portrait')
                      .catch(err => console.error('Error saat rotasi layar:', err))
                  }
                }
              }}
              className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600"
              title="Rotasi Layar"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
          <div style={{ height: isFullscreen ? '100vh' : (window.innerWidth < 768 ? '300px' : '400px'), width: '100%' }}>
            <Line ref={chartRef} data={chartDataForChartJS} options={options} />
          </div>
          {tooltipVisible && (
            <div 
              className="absolute top-0 right-0 text-xs text-gray-500 cursor-pointer p-2"
              onClick={(e) => {
                e.stopPropagation();
                setTooltipVisible(false);
                if (chartRef.current?.chart) {
                  chartRef.current.chart.update();
                }
              }}
            >
              Tap untuk sembunyikan detail
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
        <div 
          className={`summary-card roti ${
            activeDataset.includes('roti') ? 'opacity-100' : 'opacity-50'
          }`}
          onClick={() => toggleDataset('roti')}
        >
          <div className="text-sm text-gray-600 dark:text-gray-400">Total Roti Terjual</div>
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {chartData.stats?.totalBread.toLocaleString('id-ID')} biji
          </div>
          {chartData.dailyData.length > 1 && (
            <div className={`text-xs mt-1 ${
              breadPercentageChanges[breadPercentageChanges.length - 1] >= 0 
                ? 'text-green-600 dark:text-green-400' 
                : 'text-red-600 dark:text-red-400'
            }`}>
              {breadPercentageChanges[breadPercentageChanges.length - 1] >= 0 ? '▲' : '▼'} 
              {Math.abs(breadPercentageChanges[breadPercentageChanges.length - 1]).toFixed(2)}% 
              dari hari sebelumnya
            </div>
          )}
        </div>
        <div 
          className={`summary-card omset ${
            activeDataset.includes('omset') ? 'opacity-100' : 'opacity-50'
          }`}
          onClick={() => toggleDataset('omset')}
        >
          <div className="text-sm text-gray-600 dark:text-gray-400">Total Omset</div>
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            Rp {chartData.stats?.totalSales.toLocaleString('id-ID')}
          </div>
          {chartData.dailyData.length > 1 && (
            <div className={`text-xs mt-1 ${
              salesPercentageChanges[salesPercentageChanges.length - 1] >= 0 
                ? 'text-green-600 dark:text-green-400' 
                : 'text-red-600 dark:text-red-400'
            }`}>
              {salesPercentageChanges[salesPercentageChanges.length - 1] >= 0 ? '▲' : '▼'} 
              {Math.abs(salesPercentageChanges[salesPercentageChanges.length - 1]).toFixed(2)}% 
              dari hari sebelumnya
            </div>
          )}
        </div>
        
        <div className="summary-card">
          <div className="text-sm text-gray-600 dark:text-gray-400">Rata-rata Roti/Hari</div>
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {chartData.stats?.avgBread.toLocaleString('id-ID')} biji
          </div>
          <div className={`text-xs mt-1 ${
            breadTrend >= 0 
              ? 'text-green-600 dark:text-green-400' 
              : 'text-red-600 dark:text-red-400'
          }`}>
            Tren: {breadTrend >= 0 ? '▲' : '▼'} {Math.abs(breadTrend).toFixed(2)}%
          </div>
        </div>
        
        <div className="summary-card">
          <div className="text-sm text-gray-600 dark:text-gray-400">Rata-rata Omset/Hari</div>
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            Rp {chartData.stats?.avgSales.toLocaleString('id-ID')}
          </div>
          <div className={`text-xs mt-1 ${
            salesTrend >= 0 
              ? 'text-green-600 dark:text-green-400' 
              : 'text-red-600 dark:text-red-400'
          }`}>
            Tren: {salesTrend >= 0 ? '▲' : '▼'} {Math.abs(salesTrend).toFixed(2)}%
          </div>
        </div>
      </div>
    </div>
  )
}