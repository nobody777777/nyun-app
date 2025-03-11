const API_KEY = process.env.NEXT_PUBLIC_WEATHER_API_KEY

interface WeatherData {
  temperature: number;
  condition: string;
  humidity: number;
  windSpeed: number;
  rainfall: number;
  icon: string;
}

export async function getWeather(location: string): Promise<WeatherData> {
  if (!API_KEY) {
    throw new Error('API key tidak tersedia')
  }

  try {
    // Untuk Indramayu dan sekitarnya, gunakan koordinat yang tepat
    const coordinates = {
      'Indramayu': { lat: -6.3249, lon: 108.3208 },
      'Plumbon': { lat: -6.4046, lon: 108.2892 },
      'Sindang': { lat: -6.3249, lon: 108.3208 },
      'Karangampel': { lat: -6.4646, lon: 108.4493 }
    }

    // Tentukan koordinat berdasarkan lokasi
    let searchCoord = coordinates['Indramayu'] // default
    for (const [key, coord] of Object.entries(coordinates)) {
      if (location.toLowerCase().includes(key.toLowerCase())) {
        searchCoord = coord
        break
      }
    }

    // Gunakan koordinat untuk mendapatkan data cuaca yang lebih akurat
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${searchCoord.lat}&lon=${searchCoord.lon}&units=metric&appid=${API_KEY}&lang=id`
    )

    if (!response.ok) {
      throw new Error('Gagal mengambil data cuaca')
    }

    const data = await response.json()

    return {
      temperature: Math.round(data.main.temp),
      condition: data.weather[0].description,
      humidity: data.main.humidity,
      rainfall: data.rain ? data.rain['1h'] || 0 : 0,
      windSpeed: Math.round(data.wind.speed * 3.6),
      icon: `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`
    }

  } catch (error) {
    console.error('Error saat mengambil data cuaca:', error)
    throw error // Biarkan komponen handle error
  }
}

function processForecastData(data: any) {
  // Proses data forecast di sini
  // Return array of daily forecasts
}
