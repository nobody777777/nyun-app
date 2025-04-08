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
        await loadSalesData()
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
        await loadSalesData()
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
    setTotalBread(sale.total_bread.toString())
    setTotalSales(sale.total_sales.toString())
    setDate(sale.date)
    setEditMode(true)
    setCurrentEditId(sale.id)
    
    // Scroll ke form
    window.scrollTo({ top: 0, behavior: 'smooth' })
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

      // Tambahkan parameter untuk menghindari cache
      const _timestamp = new Date().getTime()
      
      const { data, error } = await supabase
        .from('daily_sales')
        .select('*')
        .gte('date', startOfMonth.toISOString().split('T')[0])
        .lte('date', endOfMonth.toISOString().split('T')[0])
        .order('date', { ascending: true })
        .throwOnError() // Tambahkan ini untuk memastikan error ditangkap

      if (error) {
        console.error('Error saat mengambil data:', error)
        throw error
      }
      
      console.log('Data berhasil diambil:', data)
      setSalesData(data || [])
      
      await refreshData()
    } catch (error) {
      console.error('Error loading sales data:', error)
      showPopup('Error', 'Gagal memuat data penjualan', 'error')
    } finally {
      setLoading(false)
    }
  }, [currentDate, setReloadTrigger, refreshData])

  useEffect(() => {
    loadSalesData()
  }, [loadSalesData])

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
      const currentDate = new Date(year, month, date)
      const dateString = currentDate.toISOString().split('T')[0]
      
      const sales = salesData.find(sale => {
        const saleDateString = new Date(sale.date).toISOString().split('T')[0]
        return saleDateString === dateString
      })
      
      days.push({
        date: currentDate,
        sales: sales,
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

  const formatDate = (_timestamp: string) => {
    // ... rest of the code ...
  }

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="container mx-auto px-4">
        <div className="flex flex-col gap-4 mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">
            Pencatatan Penjualan
          </h1>
          
          {/* Navigasi Bulan */}
          <div className="bg-white rounded-lg shadow-sm p-3">
            <div className="flex flex-wrap items-center justify-center gap-2">
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
          <div className="calendar-wrapper">
            {/* Header Hari */}
            <div className="calendar-header">
              {['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'].map(day => (
                <div key={day} className="font-medium text-gray-600">
                  {day}
                </div>
              ))}
            </div>

            {/* Kalender Grid */}
            <div className="calendar-grid">
              {getCalendarDays().map((day, index) => (
                <div
                  key={index}
                  className={`
                    calendar-cell rounded-lg border
                    ${day.isCurrentMonth ? 'bg-white' : 'bg-gray-50'}
                    ${day.sales ? 'border-blue-200' : 'border-gray-200'}
                  `}
                >
                  <div className="text-gray-500">
                    {day.date.getDate()}
                  </div>
                  {day.sales ? (
                    <>
                      <div className="text-gray-600">
                        {day.sales.total_bread} roti
                      </div>
                      <div className="font-medium text-blue-600">
                        {formatCurrency(day.sales.total_sales)}
                      </div>
                      <div className="absolute bottom-0.5 right-0.5 flex gap-0.5">
                        <button 
                          onClick={() => handleEdit(day.sales!)}
                          className="text-blue-500 hover:text-blue-700"
                          title="Edit"
                        >
                          ✏️
                        </button>
                        <button 
                          onClick={() => handleDelete(day.sales!.id)}
                          className="text-red-500 hover:text-red-700"
                          title="Hapus"
                        >
                          🗑️
                        </button>
                      </div>
                    </>
                  ) : day.isCurrentMonth ? (
                    <div className="text-gray-400">
                      Tidak ada data
                    </div>
                  ) : null}
                </div>
              ))}
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
        <div className="mt-12 bg-white rounded-xl shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-6">
            Daftar Penjualan Bulan Ini
          </h2>
          
          {loading ? (
            <p className="text-center py-4">Memuat data...</p>
          ) : salesData.length === 0 ? (
            <p className="text-center py-4 text-gray-500">Belum ada data penjualan untuk bulan ini</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">Tanggal</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">Total Roti</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">Total Penjualan</th>
                    <th className="px-4 py-2 text-right text-sm font-medium text-gray-600">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {salesData.map((sale) => {
                    // Tambahkan satu hari ke tanggal untuk menampilkan
                    const displayDate = new Date(sale.date)
                    displayDate.setDate(displayDate.getDate() + 1)
                    
                    return (
                      <tr key={sale.id} className="border-t hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {displayDate.toLocaleDateString('id-ID', {
                            weekday: 'long',
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric'
                          })}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">{sale.total_bread} biji</td>
                        <td className="px-4 py-3 text-sm font-medium text-blue-600">
                          {formatCurrency(sale.total_sales)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleEdit(sale)}
                              className="px-2 py-1 text-xs text-blue-600 hover:text-blue-800"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(sale.id)}
                              className="px-2 py-1 text-xs text-red-600 hover:text-red-800"
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