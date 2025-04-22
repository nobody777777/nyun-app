import { useMemo } from 'react'

/**
 * Custom hook untuk menghitung Relative Strength Index (RSI) 
 * dengan skala yang disesuaikan berdasarkan data maksimum
 * @param data - Array berisi nilai data (misalnya jumlah roti)
 * @param period - Periode perhitungan RSI (default: 14)
 * @param maxScale - Nilai maksimum skala yang diinginkan (default: 50)
 * @returns Array berisi nilai RSI yang sudah disesuaikan
 */
export const useRSI = (data: number[], period: number = 14, maxScale: number = 50) => {
  return useMemo(() => {
    if (data.length < period + 1) {
      return Array(data.length).fill(null)
    }

    // Hitung perubahan harga
    const changes = data.slice(1).map((value, index) => value - data[index])
    const gains = changes.map(change => change > 0 ? change : 0)
    const losses = changes.map(change => change < 0 ? -change : 0)

    // Hitung rata-rata awal
    let avgGain = gains.slice(0, period).reduce((sum, gain) => sum + gain, 0) / period
    let avgLoss = losses.slice(0, period).reduce((sum, loss) => sum + loss, 0) / period

    const rsi: (number | null)[] = []
    // Tambahkan null untuk data sebelum periode pertama
    for (let i = 0; i < period; i++) {
      rsi.push(null)
    }

    // Hitung RSI standar (0-100)
    let rs = avgGain / avgLoss
    let standardRsi = 100 - (100 / (1 + rs))
    // Sesuaikan skala RSI ke maxScale
    let scaledRsi = standardRsi * (maxScale / 100)
    rsi.push(scaledRsi)

    // Hitung RSI selanjutnya menggunakan smoothing
    for (let i = period + 1; i < data.length; i++) {
      const gain = gains[i - 1]
      const loss = losses[i - 1]

      avgGain = ((avgGain * (period - 1)) + gain) / period
      avgLoss = ((avgLoss * (period - 1)) + loss) / period

      rs = avgGain / avgLoss
      standardRsi = 100 - (100 / (1 + rs))
      // Sesuaikan skala RSI ke maxScale
      scaledRsi = standardRsi * (maxScale / 100)
      rsi.push(scaledRsi)
    }

    return rsi
  }, [data, period, maxScale])
} 