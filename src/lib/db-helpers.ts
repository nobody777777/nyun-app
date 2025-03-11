import { supabase } from './supabase'
import { Sale, SaleItem } from './types'

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
    .from('sales')
    .select('date, total_amount')
    .gte('date', `${year}-${month.toString().padStart(2, '0')}-01`)
    .lte('date', `${year}-${month.toString().padStart(2, '0')}-31`)
  
  if (error) throw error
  return data
} 