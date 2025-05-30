'use client'
import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'

// Tambahkan interface untuk data penjualan
interface SalesRecord {
  id: string
  date: string
  total_bread: number
  total_sales: number
}

type SalesContextType = {
  refreshData: () => Promise<void>
  currentMonth: { month: number; year: number }
  setCurrentMonth: (value: { month: number; year: number }) => void
  isLoading: boolean
  salesData: SalesRecord[] // Tambahkan state untuk data penjualan
  setSalesData: (data: SalesRecord[]) => void // Tambahkan setter untuk data penjualan
}

const getCurrentMonth = () => {
  try {
    const now = new Date()
    return { month: now.getMonth() + 1, year: now.getFullYear() }
  } catch (error) {
    console.error('Error getting current month:', error)
    return { month: 1, year: 2024 }
  }
}

// Buat nilai default untuk context
const defaultContextValue: SalesContextType = {
  refreshData: async () => {},
  currentMonth: getCurrentMonth(),
  setCurrentMonth: () => {},
  isLoading: false,
  salesData: [],
  setSalesData: () => {}
}

// Inisialisasi context dengan nilai default
const SalesContext = createContext<SalesContextType>(defaultContextValue)

export function SalesProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(false)
  const [salesData, setSalesData] = useState<SalesRecord[]>([])
  const [currentMonth, setCurrentMonth] = useState(getCurrentMonth)

  const refreshData = async () => {
    if (!currentMonth) return

    try {
      setIsLoading(true)
      
      // Hitung tanggal awal dan akhir bulan
      const startDate = new Date(currentMonth.year, currentMonth.month - 1, 1)
      const endDate = new Date(currentMonth.year, currentMonth.month, 0)
      
      // Format tanggal untuk query
      const startDateStr = startDate.toISOString().split('T')[0]
      const endDateStr = endDate.toISOString().split('T')[0]

      // Ambil data dari Supabase
      const { data, error } = await supabase
        .from('daily_sales')
        .select('*')
        .gte('date', startDateStr)
        .lte('date', endDateStr)
        .order('date', { ascending: true })

      if (error) {
        throw error
      }

      // Update state dengan data baru
      setSalesData(data || [])
      
    } catch (error) {
      console.error('Error refreshing sales data:', error)
      setSalesData([])
    } finally {
      setIsLoading(false)
    }
  }

  // Refresh data setiap kali bulan berubah
  useEffect(() => {
    let mounted = true

    const loadData = async () => {
      if (!mounted) return
      try {
        await refreshData()
      } catch (error) {
        console.error('Error in useEffect:', error)
      }
    }

    loadData()

    return () => {
      mounted = false
    }
  }, [currentMonth.month, currentMonth.year])

  const value = {
    refreshData,
    currentMonth,
    setCurrentMonth,
    isLoading,
    salesData,
    setSalesData
  }

  return (
    <SalesContext.Provider value={value}>
      {children}
    </SalesContext.Provider>
  )
}

export function useSales() {
  const context = useContext(SalesContext)
  if (!context) {
    throw new Error('useSales must be used within a SalesProvider')
  }
  return context
}

/*
INFORMASI PENTING:
------------------
File: contexts/SalesContext.tsx
Fungsi: Context provider untuk manajemen state global penjualan

Fitur Penting:
1. State management untuk data penjualan
2. Auto-refresh data penjualan
3. Filter data berdasarkan bulan
4. Loading state management
5. Error handling global

Catatan Update:
- Jangan hapus fungsi refreshData
- Pertahankan struktur context
- Selalu gunakan error handling
- Jangan ubah format data

KETERKAITAN ANTAR FILE:
----------------------
1. src/app/sales/page.tsx
   - Menggunakan context untuk data
   - Terkait dengan input penjualan
   - Mempengaruhi state global

2. src/app/dashboard/page.tsx
   - Menggunakan context untuk ringkasan
   - Terkait dengan tampilan data
   - Mempengaruhi visualisasi

3. src/components/charts/SalesChart.tsx
   - Menggunakan data untuk grafik
   - Terkait dengan visualisasi
   - Mempengaruhi tampilan statistik

4. src/lib/supabase.ts
   - Digunakan untuk fetch data
   - Terkait dengan database
   - Mempengaruhi state global

5. src/app/calculator/page.tsx
   - Tidak langsung terkait
   - Mempengaruhi data penjualan
   - Terkait dengan perhitungan
*/