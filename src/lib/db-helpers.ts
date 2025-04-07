import { supabase } from './supabase'
import { Sale, SaleItem } from './types'
import { createClient } from '@supabase/supabase-js'

export async function createSale(sale: Omit<Sale, 'id' | 'created_at'>) {
  const { data, error } = await supabase
    .from('sales')
    .insert(sale)
    .select()
    .single()
  
  if (error) throw error
  return data
}

export async function getSalesByDateRange(startDate: string, endDate: string) {
  const { data, error } = await supabase
    .from('sales')
    .select('*')
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: false })
  
  if (error) throw error
  return data
}

export async function addSaleItems(items: Omit<SaleItem, 'id' | 'created_at'>[]) {
  const { data, error } = await supabase
    .from('sale_items')
    .insert(items)
    .select()
  
  if (error) throw error
  return data
}

export async function getDailySalesTotal(month: number, year: number) {
  const { data, error } = await supabase
    .from('daily_sales')
    .select('date, total_sales')
    .gte('date', `${year}-${month.toString().padStart(2, '0')}-01`)
    .lte('date', `${year}-${month.toString().padStart(2, '0')}-31`)
    .order('date', { ascending: true })
  
  if (error) throw error
  return data
}

export async function updateDailySales({ date, total_sales, total_bread }: { 
  date: string, 
  total_sales: number, 
  total_bread: number 
}) {
  try {
    console.log('Updating daily sales:', { date, total_sales, total_bread })
    
    // Cek apakah data untuk tanggal tersebut sudah ada
    const { data: existingData, error: fetchError } = await supabase
      .from('daily_sales')
      .select('*')
      .eq('date', date)
      .maybeSingle()
    
    if (fetchError) {
      console.error('Error fetching existing data:', fetchError)
      throw fetchError
    }
    
    if (existingData) {
      console.log('Data sudah ada, melakukan update:', existingData)
      // Update data yang sudah ada
      const { error } = await supabase
        .from('daily_sales')
        .update({
          total_sales: existingData.total_sales + total_sales,
          total_bread: existingData.total_bread + total_bread
        })
        .eq('date', date)
      
      if (error) {
        console.error('Error updating daily sales:', error)
        throw error
      }
    } else {
      console.log('Data belum ada, membuat data baru')
      // Buat data baru
      const { error } = await supabase
        .from('daily_sales')
        .insert({
          date,
          total_sales,
          total_bread
        })
      
      if (error) {
        console.error('Error inserting daily sales:', error)
        throw error
      }
    }
    
    console.log('Daily sales updated successfully')
    return true
  } catch (error) {
    console.error('Error updating daily sales:', error)
    throw error
  }
} 