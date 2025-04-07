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