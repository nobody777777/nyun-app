'use client'
import React, { useState, useEffect, useCallback } from 'react'
import { createClient } from '@supabase/supabase-js'
import { usePopup } from '@/components/ui/PopupManager'
import { useSales } from '@/contexts/SalesContext'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface SalesRecord {
  id: string
  date: string
  total_bread: number
  total_sales: number
}

interface CalendarDay {
  date: Date
  sales?: SalesRecord
  isCurrentMonth: boolean
}

export default function SalesPage() {
  const { showPopup, closePopup } = usePopup()
  const { currentMonth, setCurrentMonth, refreshData } = useSales()
  const [totalBread, setTotalBread] = useState('')
  const [totalSales, setTotalSales] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [saving, setSaving] = useState(false)
  const [salesData, setSalesData] = useState<SalesRecord[]>([])
  const [currentDate, setCurrentDate] = useState(() => {
    return new Date(currentMonth.year, currentMonth.month - 1)
  })
  const [loading, setLoading] = useState(true)
  const [editMode, setEditMode] = useState(false)
  const [currentEditId, setCurrentEditId] = useState<string | null>(null)
  const [_reloadTrigger, setReloadTrigger] = useState(0)

  useEffect(() => {
    setCurrentMonth({
      month: currentDate.getMonth() + 1,
      year: currentDate.getFullYear()
    })
  }, [currentDate, setCurrentMonth])

  // Tambahkan gaya CSS untuk komponen kalender
  useEffect(() => {
    // Tambahkan CSS untuk kalender
    const style = document.createElement('style')
    style.textContent = `
      @media (max-width: 640px) {
        .calendar-grid-container {
          font-size: 0.75rem;
        }
        .calendar-date {
          font-size: 0.7rem;
        }
      }
    `
    document.head.appendChild(style)
    return () => {
      document.head.removeChild(style)
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!totalBread || !totalSales || !date) {
      showPopup('Peringatan', 'Mohon isi semua data', 'warning')
      return
    }

    try {
      setSaving(true)

      // Kurangi satu hari dari tanggal yang diinput untuk penyimpanan
      const inputDate = new Date(date)
      inputDate.setDate(inputDate.getDate() - 1)
      const formattedDate = inputDate.toISOString().split('T')[0]

      if (editMode && currentEditId) {
        const { error } = await supabase
          .from('daily_sales')
          .update({
            date: formattedDate, // Disimpan di tanggal sebelumnya
            total_bread: parseInt(totalBread),
            total_sales: parseInt(totalSales)
          })
          .eq('id', currentEditId)

        if (error) throw error
        
        showPopup(
          'Sukses', 
          'Data penjualan berhasil diperbarui!', 
          'success',
          2000
        )
        setEditMode(false)
        setCurrentEditId(null)
        
        // Reset form dan reload data
        setTotalBread('')
        setTotalSales('')
        setDate(new Date().toISOString().split('T')[0])
        // Gunakan setReloadTrigger untuk memicu reload data
        setReloadTrigger(prev => prev + 1)
      } else {
        const { error } = await supabase
          .from('daily_sales')
          .insert({
            date: formattedDate, // Disimpan di tanggal sebelumnya
            total_bread: parseInt(totalBread),
            total_sales: parseInt(totalSales)
          })

        if (error) throw error
        
        showPopup(
          'Sukses', 
          'Data penjualan berhasil disimpan!', 
          'success',
          2000
        )
        
        // Reset form dan reload data
        setTotalBread('')
        setTotalSales('')
        setDate(new Date().toISOString().split('T')[0])
        // Gunakan setReloadTrigger untuk memicu reload data
        setReloadTrigger(prev => prev + 1)
      }
    } catch (error) {
      console.error('Error saving sales:', error)
      showPopup('Error', 'Gagal menyimpan data', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    showPopup(
      'Konfirmasi', 
      <div>
        <p>Yakin ingin membatalkan? Data yang sudah diisi akan hilang.</p>
        <div className="flex justify-end gap-2 mt-4">
          <button 
            onClick={() => closePopup()}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            Tidak
          </button>
          <button 
            onClick={() => {
              setTotalBread('')
              setTotalSales('')
              setDate(new Date().toISOString().split('T')[0])
              setEditMode(false)
              setCurrentEditId(null)
              closePopup()
            }}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Ya, Batalkan
          </button>
        </div>
      </div>, 
      'warning'
    )
  }

  const handleEdit = (sale: SalesRecord) => {
    // Saat mengedit data, tanggal perlu disesuaikan
    // Tanggal di database disimpan dengan -1 hari, jadi untuk tampilan di form perlu +1 hari
    const saleDate = new Date(sale.date);
    saleDate.setDate(saleDate.getDate() + 1);
    const formattedDate = saleDate.toISOString().split('T')[0];
    
    console.log('Edit data:', {
      original: sale.date,
      adjusted: formattedDate,
      bread: sale.total_bread,
      sales: sale.total_sales
    });
    
    setTotalBread(sale.total_bread.toString());
    setTotalSales(sale.total_sales.toString());
    setDate(formattedDate);
    setEditMode(true);
    setCurrentEditId(sale.id);
    
    // Scroll ke form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const handleDelete = useCallback(async (id: string) => {
    try {
                const { error } = await supabase
                  .from('daily_sales')
                  .delete()
                  .eq('id', id)
                
                if (error) throw error
                
      showPopup('Berhasil', 'Data penjualan berhasil dihapus', 'success')
      setReloadTrigger(prev => prev + 1)
              } catch (error) {
      console.error('Error deleting sale:', error)
      showPopup('Error', 'Gagal menghapus data penjualan', 'error')
    }
  }, [showPopup])

  const loadSalesData = useCallback(async () => {
    try {
      setLoading(true)
      
      const date = new Date(currentDate)
      const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1)
      const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0)

      console.log('Mengambil data untuk periode:', {
        start: startOfMonth.toISOString().split('T')[0],
        end: endOfMonth.toISOString().split('T')[0]
      })
      
      // Perbaiki format tanggal untuk database
      const startStr = startOfMonth.toISOString().split('T')[0];
      const endStr = endOfMonth.toISOString().split('T')[0];
      
      console.log('Query dengan range:', startStr, 'sampai', endStr);
      
      const { data, error } = await supabase
        .from('daily_sales')
        .select('*')
        .gte('date', startStr)
        .lte('date', endStr)
        .order('date', { ascending: true });

      if (error) {
        console.error('Error saat mengambil data:', error);
        throw error;
      }
      
      console.log('Data mentah dari database:', data);
      
      // Jika tidak ada data, tampilkan pesan yang lebih informatif
      if (!data || data.length === 0) {
        console.log('Tidak ada data penjualan untuk periode ini');
        setSalesData([]);
      } else {
        // Tampilkan data yang ditemukan
        console.log(`Ditemukan ${data.length} data penjualan:`, 
          data.map(d => ({id: d.id, date: d.date, total_bread: d.total_bread}))
        );
        
        // Pastikan semua data memiliki format yang benar
        const formattedData = data.map(record => ({
          ...record,
          // Pastikan semua properti memiliki tipe data yang benar
          total_bread: typeof record.total_bread === 'number' ? record.total_bread : parseInt(record.total_bread) || 0,
          total_sales: typeof record.total_sales === 'number' ? record.total_sales : parseInt(record.total_sales) || 0,
        }));
        
        setSalesData(formattedData);
      }
      
      // Refresh data global
      refreshData();
    } catch (error) {
      console.error('Error loading sales data:', error);
      setSalesData([]);
      showPopup('Error', 'Gagal memuat data penjualan. Silakan coba lagi.', 'error');
    } finally {
      setLoading(false);
    }
  }, [currentDate, showPopup]);

  useEffect(() => {
    loadSalesData();
  }, [loadSalesData, _reloadTrigger]);

  const getCalendarDays = (): CalendarDay[] => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    
    const firstDayOfMonth = new Date(year, month, 1)
    const lastDayOfMonth = new Date(year, month + 1, 0)
    
    const days: CalendarDay[] = []
    
    let firstDayWeekday = firstDayOfMonth.getDay()
    firstDayWeekday = firstDayWeekday === 0 ? 6 : firstDayWeekday - 1
    
    // Tambah hari dari bulan sebelumnya
    for (let i = firstDayWeekday - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month, -i),
        isCurrentMonth: false
      })
    }
    
    // Tambah hari bulan ini
    for (let date = 1; date <= lastDayOfMonth.getDate(); date++) {
      const calDate = new Date(year, month, date)
      
      // Mencari data penjualan berdasarkan tanggal tampilan
      const sales = salesData.find(sale => {
        // Ambil tanggal yang sudah diformat untuk tampilan (sama dengan di tabel)
        const displayDate = new Date(sale.date)
        displayDate.setDate(displayDate.getDate() + 1)
        
        // Format tanggal untuk perbandingan
        const saleDay = displayDate.getDate()
        const saleMonth = displayDate.getMonth()
        const saleYear = displayDate.getFullYear()
        
        // Bandingkan komponen tanggal (hari, bulan, tahun)
        return (
          date === saleDay && 
          month === saleMonth && 
          year === saleYear
        )
      })
      
      days.push({
        date: calDate,
        sales,
        isCurrentMonth: true
      })
    }
    
    return days
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const _formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="container mx-auto px-4">
        <div className="flex flex-col gap-4 mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">
            Pencatatan Penjualan
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-md p-6 space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-800">
              {editMode ? 'Edit Data Penjualan' : 'Tambah Data Penjualan'}
            </h2>
            {editMode && (
              <button
                type="button"
                onClick={() => {
                  setEditMode(false)
                  setCurrentEditId(null)
                  setTotalBread('')
                  setTotalSales('')
                  setDate(new Date().toISOString().split('T')[0])
                }}
                className="text-sm text-blue-500 hover:text-blue-700"
              >
                Batal Edit
              </button>
            )}
          </div>

          {/* Tanggal */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tanggal
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          {/* Total Roti */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Berapa Biji Roti?
            </label>
            <div className="relative">
              <input
                type="number"
                value={totalBread}
                onChange={(e) => setTotalBread(e.target.value)}
                min="0"
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="0"
                required
              />
              <span className="absolute right-4 top-2 text-gray-500">
                biji
              </span>
            </div>
          </div>

          {/* Total Omzet */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Total Omzet Hari Ini
            </label>
            <div className="relative">
              <span className="absolute left-4 top-2 text-gray-500">
                Rp
              </span>
              <input
                type="number"
                value={totalSales}
                onChange={(e) => setTotalSales(e.target.value)}
                min="0"
                className="w-full pl-12 pr-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="0"
                required
              />
            </div>
          </div>

          {/* Tombol */}
          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={handleCancel}
              className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className={`
                flex-1 px-4 py-2 rounded-lg text-white
                ${saving 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-blue-500 hover:bg-blue-600'}
                transition-colors
              `}
            >
              {saving ? 'Menyimpan...' : editMode ? 'Perbarui' : 'Simpan'}
            </button>
          </div>
        </form>

        {/* Kalender */}
        <div className="mt-12 bg-white rounded-xl shadow-md p-2 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2 sm:mb-4 px-2 sm:px-0">
            <h2 className="text-xl font-bold text-gray-800">
              Kalender Penjualan
            </h2>
          </div>
          
          {/* Navigasi Bulan */}
          <div className="bg-white rounded-lg mb-4 px-2 sm:px-0">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => {
                  const newDate = new Date(currentDate)
                  newDate.setMonth(currentDate.getMonth() - 1)
                  setCurrentDate(newDate)
                }}
                className="px-2 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
              >
                ←
              </button>
              <select
                value={`${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`}
                onChange={(e) => {
                  const [year, month] = e.target.value.split('-').map(Number)
                  const newDate = new Date(year, month - 1)
                  setCurrentDate(newDate)
                }}
                className="px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {Array.from({ length: 12 }, (_, i) => {
                  const date = new Date()
                  date.setMonth(date.getMonth() - i)
                  return {
                    value: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
                    label: new Intl.DateTimeFormat('id-ID', { 
                      year: 'numeric',
                      month: 'long'
                    }).format(date)
                  }
                }).map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <button
                onClick={() => {
                  const today = new Date()
                  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
                  setCurrentDate(firstDayOfMonth)
                }}
                className="px-2 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors whitespace-nowrap"
              >
                Bulan Ini
              </button>
            </div>
          </div>
          
          <div className="calendar-wrapper bg-gray-50/80 p-2 rounded-lg">
            {/* Header Hari */}
            <div className="grid grid-cols-7 gap-1 mb-1 text-center">
              {['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'].map(day => (
                <div key={day} className="text-xs font-medium text-gray-600 py-1">
                  {day}
                </div>
              ))}
            </div>

            {/* Kalender Grid */}
            <div className="grid grid-cols-7 gap-1">
              {getCalendarDays().map((day, index) => {
                // Tambahkan satu hari untuk menampilkan tanggal yang sama dengan tabel
                const displayDate = new Date(day.date)
                
                return (
                <div
                  key={index}
                  className={`
                      p-1 min-h-[60px] relative rounded border text-xs overflow-hidden
                      ${day.isCurrentMonth ? 'bg-white/90' : 'bg-gray-50/50'}
                      ${day.sales ? 'border-blue-200' : 'border-gray-100'}
                      flex flex-col
                    `}
                  >
                    <div className="text-gray-500 text-xs font-medium mb-0.5 pl-0.5">
                      {displayDate.getDate()}
                  </div>
                  {day.sales ? (
                    <>
                        <div className="text-green-600 text-xs font-medium mx-auto my-0.5">
                          {day.sales.total_bread}
                      </div>
                        <div className="font-medium text-blue-600 text-xs truncate w-full text-left pl-0.5 text-[10px] sm:text-xs">
                          {formatCurrency(day.sales.total_sales).replace('Rp', '')}
                      </div>
                    </>
                  ) : day.isCurrentMonth ? (
                      <div className="text-gray-400 text-xs mx-auto my-0.5">
                        -
                    </div>
                  ) : null}
                </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Total Bulanan */}
        <div className="mt-6 pt-6 border-t">
          <div className="flex justify-between items-center">
            <div>
              <div className="text-sm text-gray-600">Total Penjualan Bulan Ini</div>
              <div className="text-xl font-bold text-blue-600">
                {formatCurrency(salesData.reduce((sum, sale) => sum + sale.total_sales, 0))}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Total Roti Terjual</div>
              <div className="text-xl font-bold text-green-600">
                {salesData.reduce((sum, sale) => sum + sale.total_bread, 0)} biji
              </div>
            </div>
          </div>
        </div>

        {/* Tabel Data Penjualan */}
        <div className="mt-12 bg-white rounded-xl shadow-md p-2 sm:p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-2 sm:mb-4 px-2 sm:px-0">
            Daftar Penjualan Bulan Ini
          </h2>
          
          {loading ? (
            <p className="text-center py-2 sm:py-4">Memuat data...</p>
          ) : salesData.length === 0 ? (
            <p className="text-center py-2 sm:py-4 text-gray-500">Belum ada data penjualan untuk bulan ini</p>
          ) : (
            <div className="overflow-x-auto -mx-2 sm:mx-0">
              <table className="w-full border-collapse text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-1.5 sm:px-3 py-1.5 sm:py-2 text-left text-xs font-medium text-gray-600">Tanggal</th>
                    <th className="px-1.5 sm:px-3 py-1.5 sm:py-2 text-left text-xs font-medium text-gray-600">Roti</th>
                    <th className="px-1.5 sm:px-3 py-1.5 sm:py-2 text-left text-xs font-medium text-gray-600">Omzet</th>
                    <th className="px-1.5 sm:px-3 py-1.5 sm:py-2 text-right text-xs font-medium text-gray-600">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {salesData.map((sale) => {
                    // Tambahkan satu hari ke tanggal untuk menampilkan
                    const displayDate = new Date(sale.date)
                    displayDate.setDate(displayDate.getDate() + 1)
                    
                    return (
                      <tr key={sale.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-1.5 sm:px-3 py-1.5 sm:py-2 text-xs text-gray-700">
                          {displayDate.toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </td>
                        <td className="px-1.5 sm:px-3 py-1.5 sm:py-2 text-xs text-gray-700">{sale.total_bread}</td>
                        <td className="px-1.5 sm:px-3 py-1.5 sm:py-2 text-xs font-medium text-blue-600">
                          {formatCurrency(sale.total_sales)}
                        </td>
                        <td className="px-1.5 sm:px-3 py-1.5 sm:py-2 text-right">
                          <div className="flex justify-end gap-1 sm:gap-2">
                            <button
                              onClick={() => handleEdit(sale)}
                              className="px-2 py-1 text-xs text-white bg-blue-500 hover:bg-blue-600 rounded-md transition-colors"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(sale.id)}
                              className="px-2 py-1 text-xs text-white bg-red-500 hover:bg-red-600 rounded-md transition-colors"
                            >
                              Hapus
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 

/*
INFORMASI PENTING:
------------------
File: sales/page.tsx
Fungsi: Halaman utama untuk pencatatan dan manajemen data penjualan harian

Fitur Penting:
1. Form input data penjualan (jumlah roti dan omset)
2. Kalender interaktif dengan data penjualan
3. CRUD operasi untuk data penjualan
4. Filter dan navigasi data per bulan
5. Perhitungan total dan ringkasan penjualan
6. Validasi input dan feedback pengguna
7. Tabel detail penjualan dengan aksi

Catatan Update:
- Jangan hapus state currentMonth dan salesData
- Pertahankan logika penyimpanan tanggal (H-1)
- Selalu gunakan showPopup untuk feedback
- Jangan ubah struktur komponen kalender
- Pastikan validasi input tetap berjalan
- Pertahankan format currency Indonesia

KETERKAITAN ANTAR FILE:
----------------------
1. src/contexts/SalesContext.tsx
   - Menyediakan state global untuk data penjualan
   - Digunakan untuk refresh data otomatis
   - Mengatur state bulan aktif
   - Mempengaruhi tampilan dashboard

2. src/components/ui/PopupManager.tsx
   - Digunakan untuk notifikasi sukses/error
   - Menangani konfirmasi hapus/batal
   - Memberikan feedback ke pengguna
   - Penting untuk UX aplikasi

3. src/lib/supabase.ts
   - Menangani operasi database
   - Menyimpan dan mengambil data penjualan
   - Mengatur koneksi ke Supabase
   - Penting untuk persistensi data

4. src/app/dashboard/page.tsx
   - Menggunakan data untuk ringkasan
   - Menampilkan statistik penjualan
   - Terkait dengan visualisasi data
   - Mempengaruhi tampilan utama

5. src/components/charts/SalesChart.tsx
   - Menggunakan data untuk grafik
   - Menampilkan trend penjualan
   - Terkait dengan visualisasi data
   - Mempengaruhi analisis penjualan
*/ 