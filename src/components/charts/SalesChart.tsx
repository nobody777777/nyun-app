'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  TimeScale,
  ChartOptions,
  ScriptableContext
} from 'chart.js'
import { Line } from 'react-chartjs-2'
import 'chartjs-adapter-date-fns'
import '@/styles/chart.css'
import { useSales } from '@/contexts/SalesContext'
import { supabase } from '@/lib/supabase'
import { ChartControls } from './ChartControls'
import { RSIChart } from './RSIChart'
import { useSMA, useEMA } from '@/hooks/useIndicators'
import { useRSI } from '@/hooks/useRSI'
import { usePrediction, createHuggingFaceConfig } from '@/hooks/usePrediction'
import type { HuggingFaceConfig, PredictionResult } from '@/hooks/usePrediction'
import { debounce } from 'lodash'
import { toast } from "react-hot-toast"

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  TimeScale,
)


type TimeRange = '7d' | '14d' | '30d' | '60d'

// Tambahkan type untuk font weight
type FontWeight = 'normal' | 'bold' | 'bolder' | 'lighter' | number;

// Format tanggal lebih detail dengan nama hari dan bulan Indonesia
const formatTanggal = (tanggal: string) => {
  // Konversi ke zona waktu Jakarta/Indonesia (UTC+7)
  const dateStr = tanggal.includes('T') ? tanggal : `${tanggal}T00:00:00+07:00`;
  const date = new Date(dateStr);
  const hari = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
  const bulan = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'];
  
  return `${hari[date.getDay()]}, ${date.getDate()} ${bulan[date.getMonth()]} ${date.getFullYear()}`;
};

export default function SalesChart() {
  const { currentMonth, setCurrentMonth, refreshData, salesData } = useSales()
  const [loading, setLoading] = useState(true)
  const [chartData, setChartData] = useState<any>({ dailyData: [], stats: null })
  const [activeDataset, setActiveDataset] = useState<string[]>(['roti'])
  const chartRef = useRef<any>(null)
  const [_timeRange] = useState<TimeRange>('7d')
  const [dataIncomplete, setDataIncomplete] = useState(false)
  const [displayMode, setDisplayMode] = useState<'daily' | 'cumulative'>('daily')
  const [isFullscreen, setIsFullscreen] = useState(false)
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const [isMounted, setIsMounted] = useState(false)
  const [showSMA, setShowSMA] = useState(false)
  const [showEMA, setShowEMA] = useState(false)
  const [showRSI, setShowRSI] = useState(false)
  const [showPrediction, setShowPrediction] = useState(false)
  const [smaPeriod] = useState(7)
  const [emaPeriod] = useState(14)
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [predictionLoading, setPredictionLoading] = useState(false);
  const [predictionError, setPredictionError] = useState<string | null>(null);
  const huggingFaceConfig: HuggingFaceConfig = createHuggingFaceConfig(
    process.env.NEXT_PUBLIC_HUGGINGFACE_API_KEY || process.env.NEXT_PUBLIC_HF_API_KEY || '',
    'facebook/bart-large-cnn'
  );

  useEffect(() => {
    console.log('[SalesChart] HuggingFace API Key:', huggingFaceConfig.apiKey);
  }, [huggingFaceConfig.apiKey]);

  // Fungsi untuk menyimpan hasil prediksi ke Supabase (mengikuti pola page.tsx)
  async function savePredictionToDB(result: PredictionResult, lastDate: string) {
    try {
      const { error } = await supabase
        .from('sales_predictions')
        .upsert({
          date: lastDate, // Format YYYY-MM-DD
          prediction_value: result.predictionValue,
          confidence: result.confidence,
          trend_direction: result.trendDirection,
          reasoning: result.reasoning.join('; '),
          percent_change: result.percentChange,
          created_at: new Date().toISOString()
        } as any, { onConflict: 'date' });
      if (error) throw error;
      toast.success('Prediksi berhasil disimpan ke database!');
    } catch (err) {
      toast.error('Gagal menyimpan prediksi ke database');
      console.error(err);
    }
  }

  // Handler tombol prediksi
  const handlePredictionClick = async () => {
    if (!huggingFaceConfig?.apiKey || !chartData.dailyData.length) {
      toast.error('API key atau data tidak valid');
      return;
    }

    setPredictionLoading(true);
    try {
      const lastDate = chartData.dailyData[chartData.dailyData.length - 1].date;
      const result = await usePrediction(
        activeDataset.includes('roti')
          ? chartData.dailyData.map(item => item.total_bread)
          : chartData.dailyData.map(item => item.total_sales / 1000),
        { ema: emaPeriod, sma: smaPeriod, rsi: 14 },
        lastDate,
        huggingFaceConfig
      );
      setPrediction(result);
      await savePredictionToDB(result, lastDate);
    } catch (error: any) {
      toast.error(`Gagal membuat prediksi: ${error.message}`);
      setPredictionError(error.message);
      setPrediction(null);
    } finally {
      setPredictionLoading(false);
    }
  };

  const [maxBreadValue, setMaxBreadValue] = useState(50)
  const [activeTooltipIndex, setActiveTooltipIndex] = useState<number | null>(null);
  const [activeTooltip, setActiveTooltip] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [dailyPredictions, setDailyPredictions] = useState<Record<string, PredictionResult>>({});

  // Debounce untuk update layout chart
  const debouncedUpdateLayout = useCallback(
    debounce(() => {
      if (chartRef.current?.chart) {
        chartRef.current.chart.resize();
        chartRef.current.chart.update('none');
      }
    }, 200),
    []
  );

  // Tambahkan event listener untuk window resize dengan debounce
  useEffect(() => {
    window.addEventListener('resize', debouncedUpdateLayout);
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', debouncedUpdateLayout);
    }
  }, [debouncedUpdateLayout]);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Menggunakan custom hooks untuk indikator
  const smaData = useSMA(
    activeDataset.includes('roti')
      ? chartData.dailyData.map((item: any) => item.total_bread)
      : chartData.dailyData.map((item: any) => item.total_sales / 1000),
    smaPeriod
  )

  const emaData = useEMA(
    activeDataset.includes('roti')
      ? chartData.dailyData.map((item: any) => item.total_bread)
      : chartData.dailyData.map((item: any) => item.total_sales / 1000),
    emaPeriod
  )

  // Hitung RSI di luar dataset untuk mencegah re-render yang tidak perlu
  const rsiData = useRSI(
    activeDataset.includes('roti')
      ? chartData.dailyData.map((item: any) => item.total_bread)
      : chartData.dailyData.map((item: any) => item.total_sales / 1000),
    14
  )

  useEffect(() => {
    if (!showPrediction || !huggingFaceConfig?.apiKey) return;

    const lastDate = chartData.dailyData.length > 0 
      ? chartData.dailyData[chartData.dailyData.length - 1].date 
      : undefined;

    if (!lastDate || dailyPredictions[lastDate]) {
      setPrediction(dailyPredictions[lastDate] || null);
      return;
    }

    setPredictionLoading(true);
    usePrediction(
      activeDataset.includes('roti')
        ? chartData.dailyData.map((item: any) => item.total_bread || 0)
        : chartData.dailyData.map((item: any) => (item.total_sales || 0) / 1000),
      { ema: emaPeriod, sma: smaPeriod, rsi: 14 },
      lastDate,
      huggingFaceConfig
    )
    .then(result => {
      setDailyPredictions(prev => ({
        ...prev,
        [lastDate]: result
      }));
      setPrediction(result);
      setPredictionLoading(false);
    })
    .catch(error => {
      console.error('Prediksi error:', error);
      setPrediction(null);
      setPredictionLoading(false);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showPrediction, chartData.dailyData, huggingFaceConfig, emaPeriod, smaPeriod, dailyPredictions]);

  useEffect(() => {
    setIsMounted(true)

    // Tambahkan event listener untuk fullscreenchange
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && isFullscreen) {
        setIsFullscreen(false)
        document.body.classList.remove('chart-fullscreen-active')
        
        // Reset chart layout setelah keluar dari fullscreen
        setTimeout(() => {
          if (chartRef.current?.chart) {
            chartRef.current.chart.resize()
          }
        }, 300)
      }
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    
    // Cleanup
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  }, [isFullscreen])

  useEffect(() => {
    setDailyPredictions({});
  }, [currentMonth]);

  const fetchChartData = useCallback(async () => {
    try {
      setLoading(true)
      
      const { data, error } = await supabase
        .from('daily_sales')
        .select('*')
        .order('date', { ascending: true })

      if (error) throw error
      
      if (!data || data.length === 0) {
        setChartData({ dailyData: [], stats: null })
        setLoading(false)
        return
      }
      
      const processedData = data.map(item => ({
        date: item.date,
        total_bread: item.total_bread || 0,
        total_sales: item.total_sales || 0
      }))

      setChartData({
        dailyData: processedData,
        stats: {
          totalBread: processedData.reduce((sum, item) => sum + item.total_bread, 0),
          totalSales: processedData.reduce((sum, item) => sum + item.total_sales, 0)
        }
      })

      setLoading(false)
    } catch (error) {
      console.error('Error fetching data:', error)
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isMounted) {
      fetchChartData()
    }
  }, [fetchChartData, isMounted])

  useEffect(() => {
    if (chartData.dailyData && chartData.dailyData.length > 0) {
      const maxRoti = Math.max(
        ...chartData.dailyData.map((item: any) => item.total_bread || 0),
        1
      )
      setMaxBreadValue(Math.ceil(maxRoti / 10) * 10)
    }
  }, [chartData.dailyData])

  // Tambahkan event listener untuk window resize
  useEffect(() => {
    const handleResize = () => {
      if (chartRef.current?.chart) {
        chartRef.current.chart.resize()
      }
    }

    window.addEventListener('resize', handleResize)
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  const toggleFullscreen = async () => {
    try {
      if (!isFullscreen) {
        if (chartContainerRef.current) {
          if (chartContainerRef.current.requestFullscreen) {
            await chartContainerRef.current.requestFullscreen()
          }
          
          // Cek apakah device mendukung screen orientation
          if ('orientation' in screen && 'lock' in screen.orientation) {
            try {
              await (screen.orientation as any).lock('landscape')
            } catch (err) {
              console.log('Orientasi tidak dapat dikunci:', err)
            }
          }
          
          // Tambahkan class untuk styling scrollable fullscreen
          chartContainerRef.current.classList.add('fullscreen-scrollable')
          
          // Tidak perlu menambahkan spacer lagi karena kita hanya ingin scroll sampai tanggal saja
        }
        setIsFullscreen(true)
        document.body.classList.add('chart-fullscreen-active')
      } else {
        if (document.fullscreenElement) {
          await document.exitFullscreen()
        }
        
        // Unlock orientasi layar
        if ('orientation' in screen && 'unlock' in screen.orientation) {
          try {
            await screen.orientation.unlock()
          } catch (err) {
            console.log('Orientasi tidak dapat di-unlock:', err)
          }
        }
        
        // Hapus class untuk styling scrollable fullscreen
        if (chartContainerRef.current) {
          chartContainerRef.current.classList.remove('fullscreen-scrollable')
          
          // Hapus spacer saat keluar dari fullscreen
          const spacer = chartContainerRef.current.querySelector('.chart-fullscreen-spacer')
          if (spacer) {
            spacer.remove()
          }
        }
        
        setIsFullscreen(false)
        document.body.classList.remove('chart-fullscreen-active')
      }
      
      // Pastikan chart diresize dengan benar setelah perubahan mode
      setTimeout(() => {
        if (chartRef.current?.chart) {
          chartRef.current.chart.resize()
        }
      }, 300)
    } catch (error) {
      console.error('Error toggling fullscreen:', error)
    }
  }

  const closeTooltip = useCallback(() => {
    setActiveTooltipIndex(null);
    setActiveTooltip(false);
    if (chartRef.current?.chart) {
      chartRef.current.chart.setActiveElements([]);
      chartRef.current.chart.tooltip.setActiveElements([], { x: 0, y: 0 });
      chartRef.current.chart.update('none');
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (chartContainerRef.current && !chartContainerRef.current.contains(event.target as Node)) {
        closeTooltip();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [closeTooltip]);

  const mainChartData = {
    labels: chartData.dailyData.map((item: any) => {
      // Konversi ke zona waktu Jakarta/Indonesia (UTC+7)
      const dateStr = item.date.includes('T') ? item.date : `${item.date}T00:00:00+07:00`;
      
      // PENTING: Tambahkan 1 hari ke tanggal untuk menyesuaikan dengan tampilan di halaman penjualan
      // Karena di halaman penjualan, tanggal disimpan sebagai H-1 dan ditampilkan dengan +1 hari
      const date = new Date(dateStr);
      date.setDate(date.getDate() + 1); // Tambahkan 1 hari
      
      const bulan = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'];
      // Gunakan 2 digit terakhir untuk tahun (contoh: 2025 -> 25)
      const tahun = date.getFullYear().toString().slice(-2);
      
      // Format yang lebih ringkas: "15-Apr'24" (tanggal sesuai dengan halaman penjualan)
      return `${date.getDate()}-${bulan[date.getMonth()]} '${tahun}`;
    }),
    datasets: [
      {
        label: 'Roti Terjual',
        data: chartData.dailyData.map((item: any) => item.total_bread),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.15)',
        borderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 12,
        pointHitRadius: 16,
        pointBackgroundColor: 'white',
        pointBorderWidth: 1.5,
        yAxisID: 'y-roti',
        tension: 0.3,
        fill: true,
        hidden: !activeDataset.includes('roti')
      },
      {
        label: 'Omset',
        data: chartData.dailyData.map((item: any) => item.total_sales / 1000),
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.15)',
        borderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 12,
        pointHitRadius: 16,
        pointBackgroundColor: 'white',
        pointBorderWidth: 1.5,
        yAxisID: 'y-omset',
        tension: 0.3,
        fill: true,
        hidden: !activeDataset.includes('omset')
      },
      ...(showSMA ? [{
        label: `SMA-${smaPeriod}`,
        data: smaData,
        borderColor: 'rgb(249, 115, 22)',
        borderWidth: 1.5,
        pointRadius: 0,
        tension: 0.4,
        borderDash: [5, 5],
        fill: false,
        yAxisID: activeDataset.includes('roti') ? 'y-roti' : 'y-omset'
      }] : []),
      ...(showEMA ? [{
        label: `EMA-${emaPeriod}`,
        data: emaData,
        borderColor: 'rgb(168, 85, 247)',
        borderWidth: 1.5,
        pointRadius: 0,
        tension: 0.4,
        borderDash: [5, 5],
        fill: false,
        yAxisID: activeDataset.includes('roti') ? 'y-roti' : 'y-omset'
      }] : []),
      ...(showRSI ? [{
        label: 'RSI-14',
        data: rsiData,
        borderColor: 'rgb(236, 72, 153)',
        backgroundColor: 'rgba(236, 72, 153, 0.1)',
        borderWidth: 2,
        tension: 0.1,
        yAxisID: 'y-rsi'
      }] : []),
      ...(showPrediction && prediction ? [{
        label: 'Prediksi',
        data: preparePredictionData(),
        borderColor: prediction.trendDirection === 'up' ? '#22c55e' : '#ef4444',
        backgroundColor: prediction.trendDirection === 'up' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
        borderWidth: 2,
        pointRadius: 5
      }] : [])
    ]
  }

  function preparePredictionData() {
    if (!chartData.dailyData.length || !showPrediction) return [];
    const result = Array(chartData.dailyData.length).fill(null);
    const lastIdx = chartData.dailyData.length - 1;
    if (lastIdx >= 0) {
      const lastValue = activeDataset.includes('roti')
        ? chartData.dailyData[lastIdx].total_bread
        : chartData.dailyData[lastIdx].total_sales / 1000;
      result[lastIdx] = lastValue;
    }
    result.push(prediction?.predictionValue);
    return result;
  }

  const mainChartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 250
    },

    interaction: {
      mode: 'nearest', // lebih responsif, tidak harus tepat di titik
      intersect: false, // klik di sekitar titik tetap terdeteksi
      events: ['click']
    } as any,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        enabled: true,
        intersect: false,
        position: 'nearest',
        mode: 'index',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        titleColor: '#374151',
        bodyColor: '#4b5563',
        borderColor: '#e5e7eb',
        borderWidth: 1,
        padding: 10,
        cornerRadius: 6,
        boxPadding: 4,
        usePointStyle: true,
        titleFont: {
          size: 12,
          weight: 'bold'
        },
        bodyFont: {
          size: 11
        },
        bodySpacing: 6,
        caretSize: 6,
        displayColors: true,
        filter: (tooltipItem) => true
      },
    },
    onClick: (event, elements) => {
      // Jika sudah ada tooltip aktif, tutup saja
      if (activeTooltip) {
        closeTooltip();
        return;
      }
      
      // Jika tidak ada elemen yang diklik, tutup tooltip
      if (elements.length === 0) {
        closeTooltip();
      } else {
        // Jika ada elemen yang diklik, tampilkan tooltip
        const idx = elements[0].index;
        setActiveTooltipIndex(idx);
      }
    },
    scales: {
      'y-roti': {
        type: 'linear',
        display: activeDataset.includes('roti'),
        position: 'left',
        title: {
          display: true,
          text: 'Roti Terjual (pcs)',
          color: 'rgb(59, 130, 246)',
          font: {
            size: 11,
            weight: 500
          }
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
          border: {
            display: false
          }
        } as any,
        ticks: {
          font: {
            size: 10
          },
          color: '#6b7280',
          padding: 5,
          callback: (value) => value.toLocaleString('id-ID')
        }
      },
      'y-omset': {
        type: 'linear',
        display: activeDataset.includes('omset'),
        position: 'right',
        title: {
          display: true,
          text: 'Omset (Ribu Rupiah)',
          color: 'rgb(34, 197, 94)',
          font: {
            size: 11,
            weight: 500
          }
        },
        grid: {
          display: false
        },
        ticks: {
          font: {
            size: 10
          },
          color: '#6b7280',
          padding: 5,
          callback: (value) => `Rp ${value.toLocaleString('id-ID')}K`
        }
      },
      'y-rsi': {
        type: 'linear',
        display: showRSI,
        position: 'right',
        min: 0,
        max: activeDataset.includes('roti') ? maxBreadValue : 100,
        title: {
          display: true,
          text: 'RSI (Momentum)',
          color: 'rgb(236, 72, 153)',
          font: {
            size: 11,
            weight: 500
          }
        },
        grid: {
          display: true,
          color: (context) => {
            const overboughtLevel = activeDataset.includes('roti') ? maxBreadValue * 0.8 : 80;
            const oversoldLevel = activeDataset.includes('roti') ? maxBreadValue * 0.2 : 20;
            const neutralLevel = activeDataset.includes('roti') ? maxBreadValue * 0.5 : 50;
            const neutralLowerLevel = activeDataset.includes('roti') ? maxBreadValue * 0.4 : 40;
            const neutralUpperLevel = activeDataset.includes('roti') ? maxBreadValue * 0.6 : 60;

            if (context.tick.value === overboughtLevel) return 'rgba(239, 68, 68, 0.2)';      // Merah untuk overbought
            if (context.tick.value === oversoldLevel) return 'rgba(34, 197, 94, 0.2)';      // Hijau untuk oversold
            if (context.tick.value === neutralLevel) return 'rgba(236, 72, 153, 0.2)';     // Pink untuk netral
            if (context.tick.value === neutralLowerLevel) return 'rgba(236, 72, 153, 0.15)';    // Pink untuk netral bawah
            if (context.tick.value === neutralUpperLevel) return 'rgba(236, 72, 153, 0.15)';    // Pink untuk netral atas
            return 'rgba(0, 0, 0, 0.05)';
          }
        },
        ticks: {
          font: {
            size: 10
          },
          color: (context) => {
            const overboughtLevel = activeDataset.includes('roti') ? maxBreadValue * 0.8 : 80;
            const oversoldLevel = activeDataset.includes('roti') ? maxBreadValue * 0.2 : 20;
            const neutralLevel = activeDataset.includes('roti') ? maxBreadValue * 0.5 : 50;
            const neutralLowerLevel = activeDataset.includes('roti') ? maxBreadValue * 0.4 : 40;
            const neutralUpperLevel = activeDataset.includes('roti') ? maxBreadValue * 0.6 : 60;

            if (context.tick.value === overboughtLevel) return 'rgb(239, 68, 68)';      // Merah
            if (context.tick.value === oversoldLevel) return 'rgb(34, 197, 94)';      // Hijau
            if (context.tick.value === neutralLevel) return 'rgb(236, 72, 153)';     // Pink
            if (context.tick.value === neutralLowerLevel) return 'rgb(236, 72, 153)';     // Pink
            if (context.tick.value === neutralUpperLevel) return 'rgb(236, 72, 153)';     // Pink
            return '#6b7280';
          },
          stepSize: activeDataset.includes('roti') ? maxBreadValue * 0.1 : 10,
          callback: (value) => {
            const overboughtLevel = activeDataset.includes('roti') ? maxBreadValue * 0.8 : 80;
            const oversoldLevel = activeDataset.includes('roti') ? maxBreadValue * 0.2 : 20;
            const neutralLevel = activeDataset.includes('roti') ? maxBreadValue * 0.5 : 50;
            const neutralLowerLevel = activeDataset.includes('roti') ? maxBreadValue * 0.4 : 40;
            const neutralUpperLevel = activeDataset.includes('roti') ? maxBreadValue * 0.6 : 60;

            if (value === overboughtLevel) return `J.Beli (${Math.round(overboughtLevel)})`;
            if (value === oversoldLevel) return `J.Jual (${Math.round(oversoldLevel)})`;
            if (value === neutralUpperLevel) return `N.Atas (${Math.round(neutralUpperLevel)})`;
            if (value === neutralLevel) return `Netral (${Math.round(neutralLevel)})`;
            if (value === neutralLowerLevel) return `N.Bawah (${Math.round(neutralLowerLevel)})`;
            return value.toString();
          }
        }
      },
      x: {
        grid: {
          display: true,
          color: 'rgba(0, 0, 0, 0.05)'
        },
        ticks: {
          font: {
            size: 9,
            weight: 'bold' as FontWeight
          },
          color: (context) => {
            // Cek apakah data penjualan kosong/nol
            const datasetIndex = activeDataset.includes('roti') ? 0 : 1; // Pilih dataset yang aktif
            const dataIndex = context.index;
            
            if (dataIndex < chartData.dailyData.length) {
              const value = activeDataset.includes('roti') 
                ? chartData.dailyData[dataIndex].total_bread 
                : chartData.dailyData[dataIndex].total_sales;
              
              // Jika nilai 0 atau tidak ada, warna merah
              return (value === 0 || value === null || value === undefined) 
                ? '#ef4444' // merah
                : '#4b5563'; // warna normal
            }
            
            return '#4b5563'; // default color
          },
          padding: 10, // Tambah padding untuk label
          maxRotation: 45,
          minRotation: 45,
          autoSkip: false,
          includeBounds: true,
          // Pastikan label tanggal tidak terpotong dengan memberikan margin yang cukup
          z: 10 // Pastikan label tanggal tampil di atas elemen lain
        }
      }
    }
  }

  return (
    <div
      ref={chartContainerRef}
      className={`sales-chart${isFullscreen ? ' fullscreen-scrollable' : ''}`}
    >
      <ChartControls
        activeDataset={activeDataset}
        setActiveDataset={setActiveDataset}
        showSMA={showSMA}
        setShowSMA={setShowSMA}
        showEMA={showEMA}
        setShowEMA={setShowEMA}
        showRSI={showRSI}
        setShowRSI={setShowRSI}
        showPrediction={showPrediction}
        setShowPrediction={setShowPrediction}
        displayMode={displayMode}
        setDisplayMode={setDisplayMode}
        isFullscreen={isFullscreen}
        toggleFullscreen={toggleFullscreen}
      />
      {/* Tombol prediksi LLM */}
      <button
        onClick={handlePredictionClick}
        className={`mt-2 px-4 py-2 rounded bg-blue-600 text-white flex items-center gap-2 ${predictionLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
        disabled={predictionLoading}
      >
        {predictionLoading ? (
          <span className="animate-spin mr-2 h-5 w-5 border-b-2 border-white rounded-full inline-block"></span>
        ) : (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M12 20.5A8.5 8.5 0 103.5 12a8.5 8.5 0 008.5 8.5z" /></svg>
        )}
        Prediksi LLM
      </button>      
      {predictionError && (
        <p className="text-red-600 mt-2">Error: {predictionError}</p>
      )}
      
      <div className="relative flex-grow chart-main">
        {/* Spacer bawah hanya jika bukan fullscreen */}
        {!isFullscreen && <div style={{ height: 24 }} />}
        <div 
          className={`chart-wrapper w-full h-full relative${isFullscreen ? ' fullscreen-chart' : ''}`}
        >
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
            </div>
          ) : (
            isClient && (
              <Line
                ref={chartRef}
                data={mainChartData}
                options={mainChartOptions}
                className="chart-canvas"
              />
            )
          )}
        </div>
      </div>
    {/* Visualisasi hasil prediksi LLM */}
    {prediction && (
      <div className="prediction-result bg-blue-50 rounded-lg p-4 mt-4 shadow">
        <h4 className="font-bold text-blue-600 mb-2 flex items-center gap-2">
          <svg className="inline w-5 h-5 text-blue-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M12 20.5A8.5 8.5 0 103.5 12a8.5 8.5 0 008.5 8.5z" /></svg>
          Prediksi Penjualan Besok
        </h4>
        <ul className="space-y-1">
          <li><span className="font-semibold">Nilai Prediksi:</span> <span className="text-blue-700">{prediction.predictionValue}</span></li>
          <li><span className="font-semibold">Kepercayaan:</span> <span className="text-blue-700">{(prediction.confidence * 100).toFixed(1)}%</span></li>
          <li><span className="font-semibold">Trend:</span> <span className={`font-bold ${prediction.trendDirection === 'up' ? 'text-green-600' : prediction.trendDirection === 'down' ? 'text-red-600' : 'text-gray-600'}`}>
            {prediction.trendDirection === 'up' ? 'Naik' : prediction.trendDirection === 'down' ? 'Turun' : 'Stabil'}
          </span></li>
          <li><span className="font-semibold">Perubahan (%):</span> <span className="text-blue-700">{prediction.percentChange}</span></li>
          <li><span className="font-semibold">Alasan:</span> <span className="text-blue-700">{prediction.reasoning.join(', ')}</span></li>
        </ul>
      </div>
    )}
    </div>
  )
} 