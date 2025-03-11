'use client'
import { useEffect, useState } from 'react'
import { getWeather } from '@/lib/weather-api'
import { supabase } from '@/lib/supabase'

// Definisikan tipe untuk payload
interface UserSettings {
  location: string;
  [key: string]: any;
}

export default function WeatherDisplay() {
  const [weather, setWeather] = useState<any>(null)
  const [location, setLocation] = useState('Indramayu')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadWeather() {
      try {
        setLoading(true)
        setError('')

        // Load saved location
        const { data: settings } = await supabase
          .from('user_settings')
          .select('location')
          .single()

        const userLocation = settings?.location || 'Indramayu'
        setLocation(userLocation)

        // Get weather data
        const weatherData = await getWeather(userLocation)
        setWeather(weatherData)
      } catch (err) {
        console.error('Error:', err)
        setError('Gagal memuat data cuaca')
      } finally {
        setLoading(false)
      }
    }

    loadWeather()

    // Subscribe to location changes
    const subscription = supabase
      .channel('user_settings_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'user_settings' },
        async (payload) => {
          // Gunakan type assertion untuk payload.new
          const newSettings = payload.new as UserSettings | null;
          if (newSettings?.location) {
            setLocation(newSettings.location)
            const weatherData = await getWeather(newSettings.location)
            setWeather(weatherData)
          }
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  if (loading) {
    return (
      <div className="bg-white rounded-lg p-6 shadow-lg">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-3/4 mx-auto"></div>
          <div className="h-12 bg-gray-200 rounded w-1/2 mx-auto"></div>
          <div className="grid grid-cols-3 gap-4">
            <div className="h-20 bg-gray-200 rounded"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg p-6 shadow-lg">
        <div className="text-center">
          <p className="text-red-500 mb-2">Gagal memuat data cuaca</p>
          <p className="text-sm text-gray-500">
            Silakan coba beberapa saat lagi
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg p-6 shadow-lg">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-gray-800 mb-1">Cuaca di</h2>
        <p className="text-gray-600 mb-4">{location}</p>
        
        {weather && (
          <>
            <div className="text-5xl font-bold text-gray-800 mb-4">
              {weather.temperature}°C
            </div>
            <p className="text-xl text-gray-600 capitalize mb-6">
              {weather.condition}
            </p>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm text-gray-500">Curah Hujan</p>
                <p className="text-xl font-semibold">{weather.rainfall}%</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm text-gray-500">Kelembaban</p>
                <p className="text-xl font-semibold">{weather.humidity}%</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm text-gray-500">Angin</p>
                <p className="text-xl font-semibold">{weather.windSpeed} km/h</p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
} 