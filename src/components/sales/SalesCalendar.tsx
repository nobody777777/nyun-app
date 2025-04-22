'use client'
import { useState, useEffect } from 'react'
import { getDailySalesTotal } from '@/lib/db-helpers'

interface DailySales {
  date: string
  total_amount: number
}

export default function SalesCalendar() {
  const [currentMonth, setCurrentMonth] = useState(() => new Date())
  const [salesData, setSalesData] = useState<DailySales[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState<string>('current') // 'current' atau 'YYYY-MM'

  const getMonthName = (month: number) => {
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ]
    return months[month]
  }

  // Fungsi untuk mendapatkan daftar bulan yang bisa dipilih (bulan saat ini dan sebelumnya)
  const getAvailableMonths = () => {
    const months: { value: string; label: string }[] = []
    const today = new Date()
    const currentYear = today.getFullYear()
    const currentMonth = today.getMonth()

    // Tambahkan 12 bulan ke belakang
    for (let i = 0; i <= 11; i++) {
      let monthIndex = currentMonth - i
      let year = currentYear

      if (monthIndex < 0) {
        monthIndex = 12 + monthIndex
        year = currentYear - 1
      }

      months.push({
        value: `${year}-${String(monthIndex + 1).padStart(2, '0')}`,
        label: `${getMonthName(monthIndex)} ${year}`
      })
    }

    return months
  }

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay()
  }

  const loadSalesData = async () => {
    try {
      setLoading(true)
      const data = await getDailySalesTotal(
        currentMonth.getMonth() + 1,
        currentMonth.getFullYear()
      )
      const transformedData = data.map((item: any) => ({
        date: item.date,
        total_amount: item.total_sales
      }))
      setSalesData(transformedData)
    } catch (error) {
      console.error('Error loading sales data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (selectedMonth !== 'current') {
      const [year, month] = selectedMonth.split('-').map(Number)
      setCurrentMonth(new Date(year, month - 1, 1))
    } else {
      setCurrentMonth(new Date())
    }
  }, [selectedMonth])

  useEffect(() => {
    loadSalesData()
  }, [currentMonth])

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(prevDate => {
      const newDate = new Date(prevDate)
      if (direction === 'prev') {
        newDate.setMonth(prevDate.getMonth() - 1)
      } else {
        newDate.setMonth(prevDate.getMonth() + 1)
      }
      return newDate
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentMonth.getFullYear(), currentMonth.getMonth())
    const firstDay = getFirstDayOfMonth(currentMonth.getFullYear(), currentMonth.getMonth())
    const days: JSX.Element[] = []

    // Tambahkan sel kosong untuk hari-hari sebelum hari pertama bulan
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="p-2"></div>)
    }

    // Tambahkan sel untuk setiap hari dalam bulan
    for (let day = 1; day <= daysInMonth; day++) {
      const date = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      const dayData = salesData.find(sale => sale.date === date)

      days.push(
        <div key={day} className="p-2 border rounded-lg hover:bg-gray-50">
          <div className="font-medium">{day}</div>
          {dayData && (
            <div className="text-xs text-gray-600 mt-1">
              {formatCurrency(dayData.total_amount)}
            </div>
          )}
        </div>
      )
    }

    return days
  }

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Kalender Penjualan</h2>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="p-2 border rounded-lg text-sm"
            >
              <option value="current">Bulan Ini</option>
              {getAvailableMonths().map(month => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={() => navigateMonth('prev')}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            ←
          </button>
          <span className="font-medium">
            {getMonthName(currentMonth.getMonth())} {currentMonth.getFullYear()}
          </span>
          <button
            onClick={() => navigateMonth('next')}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            →
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2 mb-2">
        {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map(day => (
          <div key={day} className="text-center font-medium text-gray-600">
            {day}
          </div>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-7 gap-2">
          {[...Array(35)].map((_, i) => (
            <div key={i} className="aspect-square animate-pulse bg-gray-100 rounded-lg"></div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-7 gap-2">
          {renderCalendar()}
        </div>
      )}
    </div>
  )
} 

/*
INFORMASI PENTING:
------------------
File: components/sales/SalesCalendar.tsx
Fungsi: Komponen kalender untuk visualisasi data penjualan harian

Fitur Penting:
1. Navigasi dan pemilihan bulan
2. Tampilan kalender dengan data penjualan
3. Format currency Indonesia
4. Loading state dan animasi
5. Perhitungan hari dalam kalender
6. Responsif untuk berbagai ukuran layar
7. Optimasi performa dengan useCallback

Catatan Update:
- Jangan hapus fungsi getMonthName untuk lokalisasi
- Pertahankan logika perhitungan kalender
- Selalu gunakan formatCurrency untuk konsistensi
- Jangan ubah struktur grid kalender
- Pastikan loading state berfungsi
- Pertahankan animasi loading

KETERKAITAN ANTAR FILE:
----------------------
1. src/lib/db-helpers.ts
   - Menyediakan fungsi getDailySalesTotal
   - Mengatur query ke database
   - Memformat data untuk kalender
   - Penting untuk data penjualan

2. src/app/sales/page.tsx
   - Menggunakan komponen SalesCalendar
   - Menyediakan context data
   - Mengatur state global
   - Mempengaruhi tampilan utama

3. src/contexts/SalesContext.tsx
   - Menyediakan data penjualan
   - Mengatur state bulan aktif
   - Mempengaruhi refresh data
   - Terkait dengan navigasi bulan

4. src/lib/supabase.ts
   - Digunakan oleh db-helpers
   - Mengatur koneksi database
   - Mempengaruhi performa query
   - Penting untuk data realtime

5. src/styles/calendar.css
   - Styling untuk grid kalender
   - Mengatur tampilan responsif
   - Animasi loading state
   - Mempengaruhi UX komponen

CATATAN TAMBAHAN:
----------------
1. Optimasi:
   - Gunakan useMemo untuk perhitungan kalender
   - Implementasi virtualisasi untuk performa
   - Cache data bulan sebelumnya
   - Batasi re-render komponen

2. Aksesibilitas:
   - Tambahkan aria-label untuk navigasi
   - Pastikan kontras warna mencukupi
   - Dukung navigasi keyboard
   - Tambahkan screen reader text

3. Internationalization:
   - Gunakan format tanggal lokal
   - Dukung multiple bahasa
   - Format angka sesuai locale
   - Terjemahkan teks UI
*/ 