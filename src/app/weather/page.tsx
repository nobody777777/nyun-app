'use client'

import { useState, useEffect } from 'react'
import ClientLayout from '@/components/ClientLayout'

interface WeatherData {
  temperature: number
  humidity: number
  windSpeed: number
  description: string
  icon: string
}

export default function WeatherPage() {
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        setLoading(true)
        setError(null)

        // Ganti dengan API key Anda
        const API_KEY = process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY
        const city = 'Indramayu'
        const country = 'ID'

        const response = await fetch(
          `https://api.openweathermap.org/data/2.5/weather?q=${city},${country}&appid=${API_KEY}&units=metric&lang=id`
        )

        if (!response.ok) {
          throw new Error('Gagal mengambil data cuaca')
        }

        const data = await response.json()

        setWeather({
          temperature: Math.round(data.main.temp),
          humidity: data.main.humidity,
          windSpeed: data.wind.speed,
          description: data.weather[0].description,
          icon: data.weather[0].icon
        })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Terjadi kesalahan')
      } finally {
        setLoading(false)
      }
    }

    fetchWeather()

    // Refresh setiap 5 menit
    const interval = setInterval(fetchWeather, 5 * 60 * 1000)

    return () => clearInterval(interval)
  }, [])

  return (
    <ClientLayout>
      <div className="min-h-screen bg-gray-50 py-6">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <h1 className="text-3xl font-bold text-gray-800 mb-8">
              Informasi Cuaca
            </h1>

            <div className="bg-white rounded-xl shadow-md p-6">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
                </div>
              ) : error ? (
                <div className="text-center py-12">
                  <div className="text-red-500 text-6xl mb-4">⚠️</div>
                  <p className="text-gray-600">{error}</p>
                </div>
              ) : weather ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Info Utama */}
                  <div className="text-center">
                    <img
                      src={`https://openweathermap.org/img/wn/${weather.icon}@4x.png`}
                      alt={weather.description}
                      className="mx-auto w-32 h-32"
                    />
                    <div className="text-5xl font-bold text-gray-800 mt-4">
                      {weather.temperature}°C
                    </div>
                    <div className="text-gray-600 mt-2 capitalize">
                      {weather.description}
                    </div>
                  </div>

                  {/* Detail */}
                  <div className="space-y-6">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Kelembaban</span>
                      <span className="font-medium">{weather.humidity}%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Kecepatan Angin</span>
                      <span className="font-medium">{weather.windSpeed} m/s</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Lokasi</span>
                      <span className="font-medium">Indramayu, Indonesia</span>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </ClientLayout>
  )
} 