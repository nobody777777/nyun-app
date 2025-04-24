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
import '@/styles/fullscreen.css'
import { useSales } from '@/contexts/SalesContext'
import { supabase } from '@/lib/supabase'
import { ChartControls } from './ChartControls'
import { useSMA, useEMA } from '@/hooks/useIndicators'
import { useRSI } from '@/hooks/useRSI'
import { usePrediction, createHuggingFaceConfig } from '@/hooks/usePrediction'
import type { HuggingFaceConfig, PredictionResult } from '@/hooks/usePrediction'
import { toast } from "react-hot-toast"
import { debounce } from 'lodash'
import { useChartJSInit, ensureChartRendered } from './ChartFix'

// Register ChartJS components - pastikan ini dilakukan sebelum komponen dirender
// PENTING: Registrasi ini harus di level modul dan bukan di dalam komponen
ChartJS.register(
  CategoryScale,
  LinearScale, // LinearScale wajib diregistrasi untuk sumbu Y
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  TimeScale,
)

type TimeRange = '30d' | '60d' | 'custom'

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

// Definisi fungsi-fungsi di luar komponen SalesChart untuk menghindari masalah reference

export default function SalesChart() {
  const { currentMonth, setCurrentMonth, refreshData, salesData } = useSales()
  const [loading, setLoading] = useState(true)
  const [chartData, setChartData] = useState<any>({ dailyData: [], stats: null })
  const [activeDataset, setActiveDataset] = useState<string[]>(['roti'])
  const chartRef = useRef<any>(null)
  const [timeRange, setTimeRange] = useState<TimeRange>('30d')
  const [customDateRange, setCustomDateRange] = useState<{start: string, end: string}>({start: '', end: ''})
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
  // Track tooltips melalui Chart.js API langsung tanpa state React
  const [dailyPredictions, setDailyPredictions] = useState<Record<string, PredictionResult>>({});
  const [isClient, setIsClient] = useState(false);
  const [maxBreadValue, setMaxBreadValue] = useState(50);
  // Tambahkan state untuk tooltip
  const [activeTooltipIndex, setActiveTooltipIndex] = useState<number | null>(null);
  const [activeTooltip, setActiveTooltip] = useState(false);
  const huggingFaceConfig: HuggingFaceConfig = createHuggingFaceConfig(
    process.env.NEXT_PUBLIC_HUGGINGFACE_API_KEY || process.env.NEXT_PUBLIC_HF_API_KEY || '',
    'facebook/bart-large-cnn'
  );

  // Effect untuk setup client-side rendering
  useEffect(() => {
    setIsClient(true);
    
    // Inisialisasi customDateRange dengan nilai default saat aplikasi dimuat
    if (!customDateRange.start || !customDateRange.end) {
      const today = new Date();
      const thirtyDaysAgo = new Date(today);
      thirtyDaysAgo.setDate(today.getDate() - 30);
      
      setCustomDateRange({
        start: thirtyDaysAgo.toISOString().split('T')[0],
        end: today.toISOString().split('T')[0]
      });
    }
    
    // Definisi fungsi handler untuk fullscreen dan resize
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && isFullscreen) {
        setIsFullscreen(false);
        document.body.classList.remove('chart-fullscreen-active');
        
        // Reset chart layout setelah keluar dari fullscreen
        setTimeout(() => {
          if (chartRef.current?.chart) {
            chartRef.current.chart.resize();
          }
        }, 300);
      }
    };

    const handleResize = () => {
      if (chartRef.current?.chart) {
        chartRef.current.chart.resize();
      }
    };
    
    // Setup event listener untuk fullscreen
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    window.addEventListener('resize', handleResize);
    
    // Panggil fetchChartData untuk load data awal
    fetchChartData();
    
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      window.removeEventListener('resize', handleResize);
    };
  }, [])

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

  // Menggunakan custom hooks untuk indikator - akan digunakan nanti dalam mainChartData

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

  // Inisialisasi Chart.js dengan benar di lingkungan production
  useChartJSInit()
  
  // Fungsi untuk menyiapkan data prediksi
  // Fungsi preparePredictionData dideklarasikan lebih bawah sebagai useCallback
  
  // Pastikan chart dirender dengan benar setelah chartData berubah
  useEffect(() => {
    console.log('Chart data berubah, mencoba render chart...');
    if (chartRef?.current && chartData?.dailyData?.length > 0) {
      console.log('Chart ref dan data tersedia, menyiapkan render');
      // Gunakan objek chartData lengkap bukan hanya dailyData
      const chartDataForRender = {
        labels: chartData.dailyData.map((item: any) => item.date),
        datasets: [{
          label: 'Data',
          data: chartData.dailyData.map((item: any) => item.total_bread)
        }]
      };
      
      // Tidak perlu memanggil ensureChartRendered dari dalam useEffect
      // karena dapat menyebabkan React error #321
      if (chartDataForRender && chartDataForRender.datasets && chartDataForRender.datasets.length > 0) {
        console.log('Data chart valid, siap untuk ditampilkan');
      } else {
        console.log('Data tidak valid untuk Chart.js');
      }
      
      // Force loading to false setelah data tersedia
      if (loading) {
        console.log('Force loading ke false karena data sudah tersedia');
        setLoading(false);
      }
    } else {
      console.log('Tidak dapat render chart: chartRef atau data tidak tersedia');
      // Jika masih loading tapi tidak ada data, paksa tampilkan dummy data
      if (loading && (!chartData?.dailyData || chartData.dailyData.length === 0)) {
        console.log('Data kosong tapi masih loading, jalankan useDummyData');
        // Set timeout agar tidak masuk infinite loop
        setTimeout(useDummyData, 500);
      }
    }
  // Pastikan dependency array benar (gunakan chartData dan loading)
  }, [chartRef, chartData, loading])
  
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

  // Reset prediksi saat rentang tanggal berubah dan panggil fetchChartData
  useEffect(() => {
    setDailyPredictions({});
    // Gunakan setTimeout untuk mencegah infinite loop
    const timer = setTimeout(() => {
      fetchChartData();
    }, 50);
    return () => clearTimeout(timer);
  }, [currentMonth, timeRange, customDateRange]);

  // Gunakan referensi untuk state yang akan digunakan dalam callback
  const timeRangeRef = useRef(timeRange);
  const customDateRangeRef = useRef(customDateRange);
  
  // Update refs saat state berubah
  useEffect(() => {
    timeRangeRef.current = timeRange;
    customDateRangeRef.current = customDateRange;
  }, [timeRange, customDateRange]);
  
  const fetchChartData = useCallback(async () => {
    // Siapkan variabel untuk cancel timeout
    let timeoutId: NodeJS.Timeout;
    
    // Gunakan nilai dari refs alih-alih state langsung
    const currentTimeRange = timeRangeRef.current;
    const currentCustomDateRange = customDateRangeRef.current;
    
    try {
      setLoading(true);
      console.log('Mulai fetch chart data...');
      
      // Tambahkan timeout dan retry untuk menangani masalah koneksi
      const fetchWithTimeout = async (retries = 1) => {
        try {
          // Buat promise untuk timeout
          const timeoutPromise = new Promise<{data: null, error: Error}>((_, reject) => {
            timeoutId = setTimeout(() => {
              console.log('Koneksi timeout setelah 5 detik');
              reject(new Error('Koneksi timeout'));
            }, 5000); // Kurangi timeout menjadi 5 detik
          });
          
          // Race antara request dan timeout
          // Tentukan rentang tanggal berdasarkan timeRange dari ref
          const today = new Date();
          let startDate = '';
          let endDate = today.toISOString().split('T')[0];
          
          if (currentTimeRange === '30d') {
            const thirtyDaysAgo = new Date(today);
            thirtyDaysAgo.setDate(today.getDate() - 30);
            startDate = thirtyDaysAgo.toISOString().split('T')[0];
          } else if (currentTimeRange === '60d') {
            const sixtyDaysAgo = new Date(today);
            sixtyDaysAgo.setDate(today.getDate() - 60);
            startDate = sixtyDaysAgo.toISOString().split('T')[0];
          } else if (currentTimeRange === 'custom' && currentCustomDateRange) {
            startDate = currentCustomDateRange.start;
            endDate = currentCustomDateRange.end;
          } else {
            // Default ke 30 hari jika tidak ada pilihan valid
            const thirtyDaysAgo = new Date(today);
            thirtyDaysAgo.setDate(today.getDate() - 30);
            startDate = thirtyDaysAgo.toISOString().split('T')[0];
          }
          
          console.log(`Mengambil data dari ${startDate} sampai ${endDate}`);
          
          const result = await Promise.race([
            supabase
              .from('daily_sales')
              .select('*')
              .gte('date', startDate)
              .lte('date', endDate)
              .order('date', { ascending: true }),
            timeoutPromise
          ]) as any;
          
          // Clear timeout jika request selesai
          clearTimeout(timeoutId);
          
          if (result.error) throw result.error;
          return { data: result.data, error: null };
        } catch (err) {
          clearTimeout(timeoutId); // Pastikan timeout dibersihkan
          console.log('Error saat fetch:', err);
          
          if (retries > 0) {
            console.log(`Mencoba menghubungkan ke Supabase kembali... (${retries} percobaan tersisa)`);
            return fetchWithTimeout(retries - 1);
          }
          return { data: null, error: err };
        }
      };

      console.log('Mencoba fetch dengan timeout...');
      const { data, error } = await fetchWithTimeout();
      console.log('Hasil fetch:', { dataExists: !!data, errorExists: !!error });
      
      if (error || !data) {
        // Tampilkan pesan error yang lebih jelas untuk pengguna
        toast.error('Gagal memuat data: Menggunakan data demo');
        console.error('Error fetching data:', error);
        // Gunakan data dummy jika tidak ada koneksi (penting: panggil useDummyData)
        console.log('Menggunakan data dummy karena error');
        useDummyData();
        return;
      }
      
      if (data.length === 0) {
        console.log('Data kosong, menggunakan data dummy');
        setChartData({ dailyData: [], stats: null });
        // Jika tidak ada data, gunakan data dummy juga
        useDummyData();
        return;
      }
      
      console.log('Data berhasil diambil, total:', data.length);
      const processedData = data.map((item: any) => ({
        date: item.date,
        total_bread: item.total_bread || 0,
        total_sales: item.total_sales || 0
      }));

      setChartData({
        dailyData: processedData,
        stats: {
          totalBread: processedData.reduce((sum, item) => sum + item.total_bread, 0),
          totalSales: processedData.reduce((sum, item) => sum + item.total_sales, 0)
        }
      });

      setLoading(false);
      console.log('Loading selesai, data siap ditampilkan');
    } catch (error) {
      console.error('Error di luar fetchWithTimeout:', error);
      // Tampilkan error yang lebih user-friendly
      toast.error('Terjadi kesalahan saat memuat data');
      // Gunakan data dummy jika terjadi error (penting: panggil useDummyData)
      console.log('Menggunakan data dummy karena error global');
      useDummyData();
    }
  }, [])
  
  // Fungsi untuk menggunakan data dummy jika Supabase tidak terhubung
  const useDummyData = () => {
    console.log('Memulai generasi data dummy');
    const today = new Date();
    // Gunakan tipe data eksplisit untuk menghindari error TypeScript
    const dummyData: Array<{date: string; total_bread: number; total_sales: number}> = [];
    
    // Buat data dummy untuk 30 hari terakhir
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      dummyData.push({
        date: dateStr,
        // Nilai acak untuk data dummy
        total_bread: Math.floor(Math.random() * 50) + 20,
        total_sales: (Math.floor(Math.random() * 50) + 20) * 8000
      });
    }
    
    console.log('Data dummy berhasil dibuat, jumlah data:', dummyData.length);
    
    // PENTING: Set loading ke false sebelum set chart data
    setLoading(false);
    
    // Tunda sedikit setelah loading false untuk memastikan UI memperbarui state
    setTimeout(() => {
      setChartData({
        dailyData: dummyData,
        stats: {
          totalBread: dummyData.reduce((sum, item) => sum + item.total_bread, 0),
          totalSales: dummyData.reduce((sum, item) => sum + item.total_sales, 0)
        }
      });
      console.log('Data dummy telah diset ke chartData');
      toast.success('Menggunakan data demo karena tidak ada koneksi internet');
    }, 100);
  }

  // Gunakan useChartJSInit untuk memastikan Chart.js terinisialisasi dengan benar
  const chartInitialized = useChartJSInit();
  
  useEffect(() => {
    if (isMounted && chartInitialized) {
      fetchChartData()
    }
  }, [fetchChartData, isMounted, chartInitialized])

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

  // Fungsi untuk mendeteksi jika perangkat adalah mobile
  const isMobileDevice = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
           (window.innerWidth <= 768);
  }

  // Fungsi utilitas untuk menangani API screen orientation yang berbeda di browser

  // Fungsi untuk me-lock orientasi ke landscape
  const lockLandscapeOrientation = async () => {
    try {
      // Pastikan screen API tersedia (kita di browser)
      if (typeof window === 'undefined' || !window.screen) return false;
      
      // Gunakan tipe any untuk menangani API yang berbeda tanpa masalah TypeScript
      const screenAny = window.screen as any;
      
      // Cek apakah API orientation tersedia dengan aman
      if (screenAny.orientation && typeof screenAny.orientation.lock === 'function') {
        await screenAny.orientation.lock('landscape');
        console.log('Orientasi terkunci ke landscape');
        return true;
      } else if (screenAny.msLockOrientation) { // IE/Edge
        screenAny.msLockOrientation('landscape');
        console.log('Orientasi terkunci ke landscape (IE/Edge)');
        return true;
      } else if (screenAny.mozLockOrientation) { // Firefox
        screenAny.mozLockOrientation('landscape');
        console.log('Orientasi terkunci ke landscape (Firefox)');
        return true;
      }
    } catch (error) {
      console.warn('Tidak dapat mengunci orientasi ke landscape:', error);
      // Tidak perlu menampilkan error ke user, cukup log di console
    }
    return false;
  }

  // Fungsi untuk melepas lock orientasi
  const unlockOrientation = async () => {
    try {
      // Pastikan screen API tersedia (kita di browser)
      if (typeof window === 'undefined' || !window.screen) return;
      
      // Gunakan tipe any untuk menghindari masalah TypeScript
      const screenAny = window.screen as any;
      
      // Cek apakah API unlock tersedia dengan aman
      if (screenAny.orientation && typeof screenAny.orientation.unlock === 'function') {
        screenAny.orientation.unlock();
        console.log('Orientasi di-unlock');
      } else if (screenAny.msUnlockOrientation) { // IE/Edge
        screenAny.msUnlockOrientation();
        console.log('Orientasi di-unlock (IE/Edge)');
      } else if (screenAny.mozUnlockOrientation) { // Firefox
        screenAny.mozUnlockOrientation();
        console.log('Orientasi di-unlock (Firefox)');
      }
    } catch (error) {
      console.warn('Tidak dapat melepas kunci orientasi:', error);
      // Hanya log warning, tidak perlu menampilkan error ke user
    }
  }

  const toggleFullscreen = async () => {
    try {
      if (!isFullscreen) {
        if (chartContainerRef.current) {
          // Request fullscreen
          if (chartContainerRef.current.requestFullscreen) {
            await chartContainerRef.current.requestFullscreen();
            
            // Coba lock ke landscape hanya jika di perangkat mobile
            if (isMobileDevice()) {
              // Gunakan setTimeout untuk memberikan waktu browser menerapkan fullscreen
              setTimeout(async () => {
                const orientationLocked = await lockLandscapeOrientation();
                if (!orientationLocked) {
                  // Jika tidak bisa lock orientasi, berikan petunjuk ke user
                  const mobileHint = document.createElement('div');
                  mobileHint.className = 'mobile-orientation-hint';
                  mobileHint.innerHTML = '<div class="p-2 bg-blue-50 text-blue-700 rounded-md text-sm">Untuk tampilan optimal, putar layar ke landscape</div>';
                  chartContainerRef.current?.appendChild(mobileHint);
                  
                  // Hilangkan hint setelah 5 detik
                  setTimeout(() => mobileHint.remove(), 5000);
                }
              }, 500);
            }
          }
          
          // Tambahkan class untuk styling scrollable fullscreen
          chartContainerRef.current.classList.add('fullscreen-scrollable');
          
          // Tambahkan spacer kecil agar bisa scroll sedikit untuk melihat tanggal
          const existingSpacerElem = chartContainerRef.current.querySelector('.chart-fullscreen-date-spacer')
          if (!existingSpacerElem) {
            const spacerElem = document.createElement('div')
            spacerElem.className = 'chart-fullscreen-date-spacer'
            spacerElem.style.height = '40px' // Hanya cukup untuk tanggal
            spacerElem.style.marginTop = '10px' // Tambahkan sedikit margin atas
            chartContainerRef.current.appendChild(spacerElem)
          }
        }
        setIsFullscreen(true);
        document.body.classList.add('chart-fullscreen-active');
      } else {
        // Lepaskan lock orientasi sebelum keluar dari fullscreen
        if (isMobileDevice()) {
          await unlockOrientation();
        }
        
        // Keluar dari mode fullscreen
        if (document.fullscreenElement) {
          await document.exitFullscreen();
        }
        
        // Hapus class untuk styling scrollable fullscreen
        if (chartContainerRef.current) {
          chartContainerRef.current.classList.remove('fullscreen-scrollable');
          
          // Hapus hint orientasi jika ada
          const orientationHint = chartContainerRef.current.querySelector('.mobile-orientation-hint');
          if (orientationHint) {
            orientationHint.remove();
          }
          
          // Hapus spacer saat keluar dari fullscreen
          const spacer = chartContainerRef.current.querySelector('.chart-fullscreen-date-spacer')
          if (spacer) {
            spacer.remove()
          }
        }
        
        setIsFullscreen(false);
        document.body.classList.remove('chart-fullscreen-active');
      }
      
      // Pastikan chart diresize dengan benar setelah perubahan mode
      setTimeout(() => {
        if (chartRef.current?.chart) {
          chartRef.current.chart.resize()
          // Gunakan update 'none' untuk menghindari animasi yang tidak perlu
          chartRef.current.chart.update('none')
        }
      }, 300)
    } catch (error) {
      console.error('Error toggling fullscreen:', error)
      toast.error('Gagal mengubah mode fullscreen')
    }
  }

  // Definisi fungsi closeTooltip untuk menutup tooltip chart
  const closeTooltip = useCallback(() => {
    setActiveTooltipIndex(null);
    setActiveTooltip(false);
    if (chartRef?.current?.chart) {
      chartRef.current.chart.setActiveElements([]);
      chartRef.current.chart.tooltip.setActiveElements([], { x: 0, y: 0 });
      chartRef.current.chart.update('none');
    }
  }, []);
  
  // Fungsi untuk menangani klik di luar area chart
  const handleClickOutside = useCallback((event: MouseEvent) => {
    if (chartContainerRef?.current && !chartContainerRef.current.contains(event.target as Node)) {
      closeTooltip();
    }
  }, [closeTooltip, chartContainerRef]);

  // Effect untuk tooltip handling dan click outside detection
  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [handleClickOutside]);
  
  // Fungsi untuk menyiapkan data prediksi
  const preparePredictionData = useCallback(() => {
    if (!chartData?.dailyData?.length || !showPrediction) return [];
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
  }, [chartData, showPrediction, activeDataset, prediction]);
  
  // Mempersiapkan data untuk indikator teknikal
  const smaData = useSMA(chartData?.dailyData?.map((item: any) => 
    activeDataset.includes('roti') ? item.total_bread : item.total_sales / 1000) || [], 
    smaPeriod
  );
  
  const emaData = useEMA(chartData?.dailyData?.map((item: any) => 
    activeDataset.includes('roti') ? item.total_bread : item.total_sales / 1000) || [], 
    emaPeriod
  );
  
  const rsiData = useRSI(chartData?.dailyData?.map((item: any) => 
    activeDataset.includes('roti') ? item.total_bread : item.total_sales / 1000) || [], 
    14, 100
  );
  
  // Definisi data utama untuk chart
  const mainChartData = {
    labels: chartData?.dailyData?.map((item: any) => {
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
    }) || [],
    datasets: [
      {
        label: 'Roti Terjual',
        data: chartData?.dailyData?.map((item: any) => item.total_bread) || [],
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
        data: chartData?.dailyData?.map((item: any) => item.total_sales / 1000) || [],
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
        yAxisID: activeDataset?.includes('roti') ? 'y-roti' : 'y-omset'
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
        yAxisID: activeDataset?.includes('roti') ? 'y-roti' : 'y-omset'
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
  };
  
  // Opsi utama untuk chart
  const mainChartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 250
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
          // @ts-ignore - borderColor property untuk chart.js grid
          borderColor: 'rgba(0, 0, 0, 0.1)',
          display: false
        },
        ticks: {
          font: {
            size: 11,
            weight: '500' as FontWeight
          },
          color: '#333'
        }
      },
      'y-rsi': {
        type: 'linear',
        display: showRSI,
        position: 'right',
        min: 0,
        max: 100,
        title: {
          display: true,
          text: 'RSI-14',
          color: 'rgb(236, 72, 153)',
          font: {
            size: 11,
            weight: 500
          }
        },
        grid: {
          display: false
        }
      },
      'y-roti': {
        type: 'linear',
        position: 'left',
        beginAtZero: true,
        title: {
          display: true, 
          text: 'Roti Terjual',
          color: 'rgb(59, 130, 246)'
        },
        ticks: {
          color: '#333'
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.05)'
        }
      },
      'y-omset': {
        type: 'linear',
        position: 'right',
        beginAtZero: true,
        title: {
          display: true,
          text: 'Omset (Ribu Rp)',
          color: 'rgb(34, 197, 94)'
        },
        ticks: {
          color: '#333'
        },
        grid: {
          display: false
        }
      }
    },
    interaction: {
      mode: 'nearest' as const,
      intersect: false,
      // @ts-ignore - events property untuk chart.js
      events: ['click']
    },
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
        displayColors: true
      }
    },
    onClick: (event, elements) => {
      // Jika tidak ada elemen yang diklik, tutup tooltip
      if (elements.length === 0) {
        if (chartRef?.current?.chart) {
          chartRef.current.chart.setActiveElements([]);
          chartRef.current.chart.tooltip.setActiveElements([], { x: 0, y: 0 });
          chartRef.current.chart.update('none');
        }
      } else {
        // Jika ada elemen yang diklik, tampilkan tooltip
        const idx = elements[0].index;
        // Perbarui tampilan tooltip melalui Chart.js API langsung
        if (chartRef?.current?.chart) {
          chartRef.current.chart.tooltip.setActiveElements([{datasetIndex: 0, index: idx}], {x: 0, y: 0});
          chartRef.current.chart.update('none');
        }
      }
    },
    elements: {
      line: {
        tension: 0 // Pastikan tidak ada bezier curve
      }
    }
  };
    // Perbaikan struktur return statement
  return (
    <div
      ref={chartContainerRef}
      className={`sales-chart w-full h-full${isFullscreen ? ' fullscreen-scrollable' : ''}`}
      style={isFullscreen ? { backgroundColor: '#ffffff', maxHeight: '100vh' } : undefined}
    >
      <div className="chart-controls-wrapper">
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
        
        {/* Tambahkan kontrol untuk rentang waktu */}
        <div className="time-range-controls mb-3 px-2">
          <div className="flex items-center space-x-2 flex-wrap">
            <div className="flex space-x-2">
              <button
                onClick={() => {
                  setTimeRange('30d');
                  setTimeout(fetchChartData, 50);
                }}
                className={`px-2 py-1 text-sm rounded ${timeRange === '30d' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}
              >
                30 Hari
              </button>
              <button
                onClick={() => {
                  setTimeRange('60d');
                  setTimeout(fetchChartData, 50);
                }}
                className={`px-2 py-1 text-sm rounded ${timeRange === '60d' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}
              >
                60 Hari
              </button>
              <button
                onClick={() => setTimeRange('custom')}
                className={`px-2 py-1 text-sm rounded ${timeRange === 'custom' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}
              >
                Kustom
              </button>
            </div>
            
            {timeRange === 'custom' && (
              <div className="flex flex-wrap items-center space-x-2 mt-2 md:mt-0">
                <div className="flex items-center space-x-1">
                  <span className="text-xs">Dari:</span>
                  <input
                    type="date"
                    value={customDateRange.start || ''}
                    onChange={(e) => setCustomDateRange({...customDateRange, start: e.target.value})}
                    className="p-1 text-xs border rounded"
                  />
                </div>
                <div className="flex items-center space-x-1 mt-1 md:mt-0">
                  <span className="text-xs">Sampai:</span>
                  <input
                    type="date"
                    value={customDateRange.end || ''}
                    onChange={(e) => setCustomDateRange({...customDateRange, end: e.target.value})}
                    className="p-1 text-xs border rounded"
                    max={new Date().toISOString().split('T')[0]}
                  />
                </div>
                <button
                  onClick={() => {
                    if (customDateRange.start && customDateRange.end) {
                      setTimeout(fetchChartData, 50);
                    } else {
                      toast.error('Pilih tanggal awal dan akhir');
                    }
                  }}
                  className="ml-2 px-2 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Terapkan
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
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
            isClient && mainChartData?.datasets?.length > 0 && (
              <Line
                ref={chartRef}
                data={{
                  ...mainChartData,
                  datasets: mainChartData.datasets.map(dataset => ({
                    ...dataset,
                    tension: 0, // Gunakan 0 untuk menghindari bezier curve yang membutuhkan cp1x
                    cubicInterpolationMode: 'monotone' // Mode interpolasi yang lebih stabil
                  }))
                }}
                options={mainChartOptions}
                className="chart-canvas"
                redraw={false}
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