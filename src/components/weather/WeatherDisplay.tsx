'use client'
import { useEffect, useState } from 'react'
import { getWeather, getWeatherForecast } from '@/lib/weather-api'
import { supabase } from '@/lib/supabase'
import Image from 'next/image'

// Definisikan tipe untuk payload
interface UserSettings {
  location: string;
  [key: string]: any;
}

// Definisikan tipe untuk data cuaca
interface WeatherData {
  temperature: number;
  condition: string;
  rainfall: number;
  humidity: number;
  windSpeed: number;
  icon: string;
}

// Definisikan tipe untuk prediksi cuaca
interface ForecastData {
  date: string;
  condition: string;
  temperature: {
    min: number;
    max: number;
  };
  rainfall: number;
  rainHours: string[];
  humidity: number;
  windSpeed: number;
  icon: string;
}

export default function WeatherDisplay() {
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [forecast, setForecast] = useState<ForecastData[]>([])
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

        // Get current weather data
        const weatherData = await getWeather(userLocation)
        setWeather(weatherData)
        
        // Get forecast data for next 2 days
        const forecastData = await getWeatherForecast(userLocation, 3)
        setForecast(forecastData)
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
            
            // Update forecast data when location changes
            const forecastData = await getWeatherForecast(newSettings.location, 3)
            setForecast(forecastData)
          }
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [])
  
  // Fungsi untuk mendapatkan rekomendasi berdasarkan prediksi cuaca
  const getRecommendation = (forecast: ForecastData) => {
    // Jika ada data jam hujan
    if (forecast.rainHours && forecast.rainHours.length > 0) {
      // Urutkan jam hujan
      const sortedHours = [...forecast.rainHours].sort();
      
      // Format jam untuk tampilan yang lebih baik
      const formatTimeRange = (hours: string[]) => {
        if (hours.length === 0) return "";
        
        // Kelompokkan jam yang berurutan
        const ranges: string[] = [];
        let start = hours[0];
        let end = hours[0];
        
        for (let i = 1; i < hours.length; i++) {
          // Cek apakah jam berurutan (dengan asumsi format "HH:MM")
          const currentHour = parseInt(hours[i].split(':')[0]);
          const prevHour = parseInt(end.split(':')[0]);
          
          if (currentHour === prevHour + 1 || 
              (prevHour === 23 && currentHour === 0)) {
            end = hours[i];
          } else {
            ranges.push(start === end ? start : `${start}-${end}`);
            start = hours[i];
            end = hours[i];
          }
        }
        
        ranges.push(start === end ? start : `${start}-${end}`);
        return ranges.join(', ');
      };
      
      const timeRanges = formatTimeRange(sortedHours);
      
      // Berikan rekomendasi berdasarkan kondisi dan intensitas hujan
      if (forecast.condition.toLowerCase().includes('petir') || 
          forecast.condition.toLowerCase().includes('thunder')) {
        return `WASPADA! Hujan disertai petir pada jam ${timeRanges}. Hindari lokasi terbuka dan pastikan barang elektronik terlindungi. Siapkan terpal anti air dan pertimbangkan untuk tutup lebih awal.`;
      } 
      else if (forecast.condition.toLowerCase().includes('angin kencang') || 
               forecast.condition.toLowerCase().includes('puting beliung') ||
               forecast.condition.toLowerCase().includes('tornado') ||
               forecast.windSpeed > 40) {
        return `BAHAYA! Angin kencang/puting beliung diprediksi pada jam ${timeRanges}. Amankan tenda/terpal dengan sangat kuat, jangan gunakan payung, dan pertimbangkan untuk tidak berjualan hari ini.`;
      }
      else if (forecast.condition.toLowerCase().includes('longsor') || 
               (forecast.rainfall > 80 && forecast.rainHours.length > 8)) {
        return `WASPADA BANJIR/LONGSOR! Hujan sangat lebat dan berkepanjangan pada jam ${timeRanges}. Hindari berjualan di dekat tebing, sungai, atau daerah rawan banjir.`;
      }
      else if (forecast.rainfall > 70) {
        return `Siapkan tenda/terpal yang kuat. Hujan lebat diprediksi pada jam ${timeRanges}. Pastikan dagangan terlindungi dari cipratan air dan bawa plastik tambahan untuk pembeli.`;
      } 
      else if (forecast.rainfall > 30) {
        return `Bawa payung/terpal cadangan. Kemungkinan hujan ringan-sedang pada jam ${timeRanges}. Siapkan kantong plastik untuk melindungi roti dari kelembaban.`;
      }
    }
    
    // Kondisi selain hujan
    if (forecast.temperature.max > 32) {
      return "Cuaca panas hari ini! Jangan lupa bawa air minum yang cukup, topi, dan tabir surya. Pastikan roti terlindung dari panas berlebih yang bisa mempengaruhi kualitas.";
    } 
    else if (forecast.humidity > 85) {
      return "Kelembaban tinggi hari ini. Pastikan roti disimpan dengan baik dalam wadah tertutup agar tidak lembab. Jangan lupa bawa kipas kecil untuk kenyamanan.";
    } 
    else if (forecast.windSpeed > 20) {
      return "Angin cukup kencang hari ini. Amankan tenda/terpal dan pastikan produk tidak terbawa angin. Gunakan pemberat pada meja dan peralatan.";
    } 
    else {
      // Pesan motivasi untuk cuaca cerah
      const motivationalMessages = [
        "Cuaca cerah! Sempurna untuk berjualan. Jangan lupa cek kembali peralatan masak dan uang kembalian yang cukup.",
        "Hari yang indah untuk berjualan! Pastikan Anda membawa kartu harga dan daftar menu lengkap untuk menarik pelanggan.",
        "Cuaca bersahabat hari ini. Semangat berjualan! Jangan lupa bawa buku catatan penjualan untuk evaluasi nanti.",
        "Matahari bersinar cerah! Waktu yang tepat untuk promosi atau diskon kecil untuk menarik lebih banyak pelanggan.",
        "Cuaca mendukung untuk penjualan maksimal hari ini! Sudahkah Anda membawa tissue dan kantong tambahan untuk pembeli?",
        "Hari yang cerah untuk rezeki yang melimpah! Jangan lupa siapkan nomor kontak untuk pelanggan yang ingin pesan di lain waktu."
      ];
      
      // Pilih pesan motivasi secara acak
      const randomIndex = Math.floor(Math.random() * motivationalMessages.length);
      return motivationalMessages[randomIndex];
    }
  }

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

  // Mendapatkan hari dalam bahasa Indonesia
  const getDayName = (dateString: string) => {
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const date = new Date(dateString);
    return days[date.getDay()];
  }
  
  // Mendapatkan tanggal dalam format Indonesia
  const getFormattedDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long' });
  }

  return (
    <div className="bg-white rounded-lg p-6 shadow-lg">
      <div className="text-center mb-4">
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
          </>
        )}
      </div>
      
      {/* Prediksi Cuaca - Layout yang dioptimalkan untuk mobile */}
      <div className="grid grid-cols-2 gap-2 mb-6">
        {forecast.length > 0 && (
          <>
            {/* Hari Ini */}
            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-sm font-medium text-blue-800">Hari Ini</p>
              <div className="flex items-center justify-center my-2">
                {forecast[0]?.icon && (
                  <Image 
                    src={forecast[0].icon} 
                    alt={forecast[0].condition} 
                    width={40} 
                    height={40} 
                  />
                )}
              </div>
              <p className="text-xs text-blue-700">Hujan: {forecast[0]?.rainfall}%</p>
              <p className="text-xs text-blue-700">{forecast[0]?.temperature.min}°-{forecast[0]?.temperature.max}°C</p>
            </div>
            
            {/* Besok */}
            <div className="bg-indigo-50 p-3 rounded-lg">
              <p className="text-sm font-medium text-indigo-800">
                {forecast.length > 1 ? getDayName(forecast[1]?.date) : 'Besok'}
              </p>
              <div className="flex items-center justify-center my-2">
                {forecast.length > 1 && forecast[1]?.icon && (
                  <Image 
                    src={forecast[1].icon} 
                    alt={forecast[1].condition} 
                    width={40} 
                    height={40} 
                  />
                )}
              </div>
              <p className="text-xs text-indigo-700">Hujan: {forecast.length > 1 ? forecast[1]?.rainfall : 0}%</p>
              <p className="text-xs text-indigo-700">
                {forecast.length > 1 ? `${forecast[1]?.temperature.min}°-${forecast[1]?.temperature.max}°C` : ''}
              </p>
            </div>
          </>
        )}
      </div>
      
      {/* Rekomendasi - Sekarang horizontal di bawah prediksi */}
      {forecast.length > 0 && (
        <div className="bg-emerald-50 p-3 rounded-lg mb-6">
          <p className="text-sm font-medium text-emerald-800 mb-1">Rekomendasi</p>
          <p className="text-xs text-emerald-700">
            {getRecommendation(forecast[0])}
          </p>
        </div>
      )}
      
      {/* Detail cuaca saat ini */}
      {weather && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-sm text-gray-500">Curah Hujan Saat Ini</p>
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
      )}
    </div>
  )
} 