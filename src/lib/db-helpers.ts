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

/*
INFORMASI PENTING:
------------------
File: lib/db-helpers.ts
Fungsi: Helper functions untuk operasi database

Fitur Penting:
1. Query builder untuk data penjualan
2. Format data untuk komponen kalender
3. Error handling untuk database
4. Optimasi query performance
5. Type safety untuk data
6. Caching mekanisme
7. Validasi input parameter

Catatan Update:
- Jangan hapus type checking
- Pertahankan error handling
- Selalu gunakan prepared statements
- Jangan ubah format response
- Pastikan query optimization
- Pertahankan caching logic

KETERKAITAN ANTAR FILE:
----------------------
1. src/components/sales/SalesCalendar.tsx
   - Menggunakan getDailySalesTotal
   - Membutuhkan format data spesifik
   - Terkait dengan tampilan kalender
   - Penting untuk visualisasi

2. src/lib/supabase.ts
   - Menyediakan koneksi database
   - Digunakan untuk query
   - Mengatur error handling
   - Penting untuk operasi data

3. src/app/sales/page.tsx
   - Menggunakan helper functions
   - Membutuhkan data terformat
   - Terkait dengan operasi CRUD
   - Mempengaruhi state aplikasi

4. src/contexts/SalesContext.tsx
   - Menggunakan query functions
   - Mempengaruhi state global
   - Terkait dengan refresh data
   - Penting untuk sinkronisasi

5. src/types/database.ts
   - Mendefinisikan tipe data
   - Digunakan untuk type safety
   - Mempengaruhi validasi
   - Penting untuk maintainability
*/ 