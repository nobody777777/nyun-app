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

const SalesContext = createContext<SalesContextType | undefined>(undefined)

export function SalesProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(false)
  const [salesData, setSalesData] = useState<SalesRecord[]>([])
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date()
    return { month: now.getMonth() + 1, year: now.getFullYear() }
  })

  const refreshData = async () => {
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
      // Anda bisa menambahkan penanganan error di sini
    } finally {
      setIsLoading(false)
    }
  }

  // Refresh data setiap kali bulan berubah
  useEffect(() => {
    refreshData()
  }, [currentMonth.month, currentMonth.year])

  return (
    <SalesContext.Provider value={{ 
      refreshData, 
      currentMonth, 
      setCurrentMonth,
      isLoading,
      salesData,
      setSalesData
    }}>
      {children}
    </SalesContext.Provider>
  )
}

export function useSales() {
  const context = useContext(SalesContext)
  if (context === undefined) {
    throw new Error('useSales must be used within a SalesProvider')
  }
  return context
}