import { useMemo } from 'react'

// Fungsi untuk menghitung SMA (Simple Moving Average)
export function useSMA(data: number[], period: number): number[] {
  return useMemo(() => {
    if (!data || data.length === 0) return []
    
    const sma: number[] = []
    let sum = 0
    
    // Inisialisasi sum untuk periode pertama
    for (let i = 0; i < period && i < data.length; i++) {
      sum += data[i]
    }
    
    // Hitung SMA untuk setiap titik data
    for (let i = 0; i < data.length; i++) {
      if (i >= period) {
        sum = sum - data[i - period] + data[i]
        sma.push(sum / period)
      } else if (i === period - 1) {
        sma.push(sum / period)
      } else {
        sma.push(NaN) // Tidak ada cukup data untuk periode ini
      }
    }
    
    return sma
  }, [data, period])
}

// Fungsi untuk menghitung EMA (Exponential Moving Average)
export function useEMA(data: number[], period: number): number[] {
  return useMemo(() => {
    if (!data || data.length === 0) return []
    
    const ema: number[] = []
    const multiplier = 2 / (period + 1)
    
    // Gunakan SMA sebagai nilai awal EMA
    let sum = 0
    for (let i = 0; i < period && i < data.length; i++) {
      sum += data[i]
    }
    
    const firstEMA = sum / period
    
    // Hitung EMA untuk setiap titik data
    for (let i = 0; i < data.length; i++) {
      if (i >= period) {
        const currentEMA = (data[i] - ema[i - 1]) * multiplier + ema[i - 1]
        ema.push(currentEMA)
      } else if (i === period - 1) {
        ema.push(firstEMA)
      } else {
        ema.push(NaN) // Tidak ada cukup data untuk periode ini
      }
    }
    
    return ema
  }, [data, period])
}

// Fungsi untuk menghitung RSI (Relative Strength Index)
export function useRSI(data: number[], period: number = 14): number[] {
  return useMemo(() => {
    if (!data || data.length === 0) return []

    const rsi: number[] = []
    const gains: number[] = []
    const losses: number[] = []

    // Hitung rata-rata dan standar deviasi untuk normalisasi
    const avgSales = data.reduce((sum, val) => sum + val, 0) / data.length
    const stdDev = Math.sqrt(
      data.reduce((sum, val) => sum + Math.pow(val - avgSales, 2), 0) / data.length
    )

    // Hitung perubahan harian
    for (let i = 1; i < data.length; i++) {
      const difference = data[i] - data[i - 1]
      
      // Normalisasi perubahan menggunakan z-score dan skala yang lebih sesuai
      const normalizedChange = (difference / (stdDev || 1)) * 10
      
      gains.push(normalizedChange > 0 ? normalizedChange : 0)
      losses.push(normalizedChange < 0 ? Math.abs(normalizedChange) : 0)
    }

    // Hitung average gains dan losses untuk periode pertama
    const firstGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period
    const firstLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period
    
    let avgGain = firstGain
    let avgLoss = firstLoss
    
    // Inisialisasi periode awal dengan null
    for (let i = 0; i < period; i++) {
      rsi.push(null)
    }
    
    // Hitung RSI
    for (let i = period; i < data.length; i++) {
      if (i > period) {
        // Update average gain dan loss menggunakan Wilder's smoothing
        avgGain = ((avgGain * (period - 1)) + gains[i - 1]) / period
        avgLoss = ((avgLoss * (period - 1)) + losses[i - 1]) / period
      }

      // Hitung RS dengan penanganan kasus khusus
      let rs = 0
      if (avgLoss === 0 && avgGain === 0) {
        rs = 1 // Tidak ada perubahan
      } else if (avgLoss === 0) {
        rs = avgGain > 0 ? 4 : 1 // Batasi maksimum RS untuk menghindari RSI ekstrim
      } else {
        rs = Math.min(4, avgGain / avgLoss) // Batasi RS maksimum
      }
      
      // Hitung RSI dengan batasan yang lebih ketat
      const baseRSI = 100 - (100 / (1 + rs))
      
      // Terapkan transformasi tambahan untuk membuat RSI lebih proporsional
      const scaledRSI = Math.min(80, Math.max(20, baseRSI))
      rsi.push(scaledRSI)
    }

    return rsi
  }, [data, period])
} 