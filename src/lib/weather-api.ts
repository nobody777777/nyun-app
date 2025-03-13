const API_KEY = process.env.NEXT_PUBLIC_WEATHER_API_KEY

interface WeatherData {
  temperature: number;
  condition: string;
  humidity: number;
  windSpeed: number;
  rainfall: number;
  icon: string;
}

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

// Fungsi untuk mendapatkan koordinat berdasarkan lokasi
function getCoordinates(location: string) {
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
  
  return searchCoord
}

// Fungsi untuk memproses data forecast dari API
function processForecastData(data: any): ForecastData[] {
  // Kelompokkan data berdasarkan tanggal
  const dailyData: { [key: string]: any[] } = {};
  
  // Kelompokkan data berdasarkan tanggal
  data.list.forEach((item: any) => {
    const date = item.dt_txt.split(' ')[0];
    if (!dailyData[date]) {
      dailyData[date] = [];
    }
    dailyData[date].push(item);
  });
  
  // Proses data harian
  const forecast: ForecastData[] = [];
  
  Object.keys(dailyData).forEach(date => {
    const dayData = dailyData[date];
    
    // Cari suhu min dan max
    let minTemp = 100;
    let maxTemp = -100;
    let totalHumidity = 0;
    let totalWindSpeed = 0;
    let mainCondition = '';
    let mainIcon = '';
    let conditionCounts: { [key: string]: number } = {};
    
    // Cari jam-jam hujan
    const rainHours: string[] = [];
    
    dayData.forEach(item => {
      // Suhu
      const temp = item.main.temp;
      if (temp < minTemp) minTemp = temp;
      if (temp > maxTemp) maxTemp = temp;
      
      // Kelembaban dan angin
      totalHumidity += item.main.humidity;
      totalWindSpeed += item.wind.speed;
      
      // Kondisi cuaca
      const condition = item.weather[0].description;
      const icon = item.weather[0].icon;
      
      if (!conditionCounts[condition]) {
        conditionCounts[condition] = 0;
      }
      conditionCounts[condition]++;
      
      // Cek apakah hujan atau kondisi buruk lainnya
      const hourTime = item.dt_txt.split(' ')[1].substring(0, 5);
      
      // Cek berbagai kondisi cuaca buruk
      const weatherId = item.weather[0].id;
      const isRain = item.rain && item.rain['3h'] > 0;
      const isThunder = weatherId >= 200 && weatherId < 300;
      const isRainCondition = weatherId >= 300 && weatherId < 600;
      const isStorm = weatherId >= 900 && weatherId < 1000;
      
      if (isRain || isThunder || isRainCondition || isStorm || 
          condition.includes('hujan') || condition.includes('petir') || 
          condition.includes('badai') || condition.includes('storm') || 
          condition.includes('rain') || condition.includes('thunder')) {
        rainHours.push(hourTime);
      }
    });
    
    // Tentukan kondisi yang paling sering muncul
    let maxCount = 0;
    Object.keys(conditionCounts).forEach(condition => {
      if (conditionCounts[condition] > maxCount) {
        maxCount = conditionCounts[condition];
        mainCondition = condition;
      }
    });
    
    // Tentukan icon berdasarkan kondisi utama
    dayData.forEach(item => {
      if (item.weather[0].description === mainCondition) {
        mainIcon = item.weather[0].icon;
      }
    });
    
    // Hitung kemungkinan hujan
    const rainfallProbability = (rainHours.length / dayData.length) * 100;
    
    forecast.push({
      date,
      condition: mainCondition,
      temperature: {
        min: Math.round(minTemp),
        max: Math.round(maxTemp)
      },
      rainfall: Math.round(rainfallProbability),
      rainHours,
      humidity: Math.round(totalHumidity / dayData.length),
      windSpeed: Math.round((totalWindSpeed / dayData.length) * 3.6), // Konversi ke km/h
      icon: `https://openweathermap.org/img/wn/${mainIcon}@2x.png`
    });
  });
  
  return forecast;
}

export async function getWeatherForecast(location: string, days: number = 3): Promise<ForecastData[]> {
  if (!API_KEY) {
    throw new Error('API key tidak tersedia')
  }

  try {
    // Dapatkan koordinat berdasarkan lokasi
    const searchCoord = getCoordinates(location);
    
    // Gunakan API 5-day forecast dari OpenWeatherMap
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/forecast?lat=${searchCoord.lat}&lon=${searchCoord.lon}&units=metric&appid=${API_KEY}&lang=id`
    );

    if (!response.ok) {
      throw new Error('Gagal mengambil data prediksi cuaca');
    }

    const data = await response.json();
    
    // Proses data forecast
    const processedData = processForecastData(data);
    
    // Batasi jumlah hari sesuai parameter
    return processedData.slice(0, days);
    
  } catch (error) {
    console.error('Error saat mengambil data prediksi cuaca:', error);
    throw error;
  }
}
