/**
 * ChartFix.ts - Memastikan Chart.js terinisialisasi dengan benar
 * File ini berisi utility untuk membantu inisialisasi Chart.js dan menangani error umum
 */

import { useState, useEffect } from 'react';
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
  TimeScale
} from 'chart.js';

// Memastikan komponen Chart.js sudah teregistrasi dengan benar
// Ini untuk menangani error "linear is not a registered scale"
if (typeof window !== 'undefined') {
  // Register ulang hanya jika di client side
  ChartJS.register(
    CategoryScale,
    LinearScale, // Penting untuk scale sumbu Y
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler,
    TimeScale
  );
}

/**
 * Hook untuk memastikan Chart.js terinisialisasi dengan benar
 * @returns {boolean} - flag yang menunjukkan chart sudah siap digunakan
 */
export function useChartJSInit(): boolean {
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
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
        TimeScale
      );
      setInitialized(true);
    }
  }, []);

  return initialized;
}

/**
 * Fungsi untuk memastikan chart sudah dirender dengan benar
 * @param chartRef - Reference ke chart yang akan dirender
 * @param data - Data chart yang akan dirender (opsional - jika tidak diberikan, hanya memeriksa chartRef)
 * @param maxRetries - Jumlah maksimal percobaan untuk me-render chart (opsional - default 3)
 * @returns {Promise<void>}
 */
export async function ensureChartRendered(chartRef: any, data?: any, maxRetries: number = 3): Promise<void> {
  let retries = 0;
  console.log('[ChartFix] ensureChartRendered dipanggil:', { hasChartRef: !!chartRef, hasData: !!data, maxRetries });
  
  // Rekursif dengan retries
  const tryRender = () => {
    if (!chartRef?.current?.chart && retries < maxRetries) {
      retries++;
      console.log(`[ChartFix] Mencoba render chart, percobaan ke-${retries}`);
      setTimeout(tryRender, 500);
    } else if (retries >= maxRetries) {
      console.log('[ChartFix] Max retries reached, giving up');
    } else if (chartRef?.current?.chart) {
      console.log('[ChartFix] Chart berhasil dirender');
      
      // Pastikan chart diresize dengan benar
      setTimeout(() => {
        if (chartRef?.current?.chart) {
          try {
            chartRef.current.chart.resize();
            chartRef.current.chart.update('none');
            console.log('[ChartFix] Chart berhasil diupdate');
          } catch (err) {
            console.error('[ChartFix] Error saat update chart:', err);
          }
        }
      }, 100);
    }
  };

  // Mulai mencoba render dengan lebih fleksibel - data menjadi opsional
  // Jika data tidak diberikan atau tidak valid, tetap coba render berdasarkan chartRef saja
  if (chartRef) {
    tryRender();
  } else {
    console.warn('[ChartFix] chartRef tidak valid, tidak dapat merender');
  }
}

// Fungsi untuk menangani masalah koneksi Supabase
export function handleSupabaseError(error: any): string {
  if (error?.message?.includes('timeout') || error?.message?.includes('network')) {
    return 'Koneksi ke database timeout. Periksa koneksi internet Anda dan coba lagi.';
  }
  
  if (error?.code === 'ECONNREFUSED' || error?.code === 'ENOTFOUND') {
    return 'Tidak dapat terhubung ke database. Periksa koneksi internet Anda dan coba lagi.';
  }
  
  return error?.message || 'Terjadi kesalahan saat memuat data.';
}
