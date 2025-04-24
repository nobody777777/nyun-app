'use client'

import { useEffect } from 'react'
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
} from 'chart.js'

// Fungsi untuk memastikan Chart.js teregistrasi dengan benar
export function useChartJSInit() {
  useEffect(() => {
    // Pastikan Chart.js hanya diregistrasi sekali
    ChartJS.register(
      CategoryScale,
      LinearScale, // INI WAJIB
      PointElement,
      LineElement,
      Title,
      Tooltip,
      Legend,
      Filler,
      TimeScale
    )
  }, [])
} // <-- TUTUP fungsi ini!

// Fungsi untuk memastikan chart dirender dengan benar di production
export function ensureChartRendered(chartRef: React.RefObject<any>) {
  useEffect(() => {
    if (chartRef.current?.chart) {
      // Pastikan chart diresize dengan benar
      setTimeout(() => {
        chartRef.current.chart.resize()
        chartRef.current.chart.update('none')
      }, 300)
    }
  }, [chartRef])
}
