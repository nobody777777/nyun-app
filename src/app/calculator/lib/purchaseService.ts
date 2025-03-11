import { createClient } from '@supabase/supabase-js'
import { ingredients } from '../data/ingredients'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export interface PurchaseItem {
  id: string
  name: string
  quantity: number
  price: number
  total: number
  category: string
}

export interface PurchaseRecord {
  id: string
  created_at: string
  items: PurchaseItem[]
  total_amount: number
}

// Fungsi untuk menyimpan pembelian
export const savePurchase = async (quantities: {[key: string]: number}) => {
  // Validasi input
  if (!quantities || Object.keys(quantities).length === 0) {
    throw new Error('Tidak ada item yang dipilih');
  }

  // Siapkan data
  const items = ingredients
    .filter(item => quantities[item.id] > 0)
    .map(item => ({
      id: item.id,
      name: item.name,
      quantity: quantities[item.id],
      price: item.price,
      total: item.price * quantities[item.id],
      category: item.category
    }));

  const total_amount = items.reduce((sum, item) => sum + item.total, 0);

  // Simpan ke Supabase
  const { data, error } = await supabase
    .from('purchase_records')
    .insert({
      items,
      total_amount
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Fungsi untuk mengambil history
export const getPurchaseHistory = async () => {
  const { data, error } = await supabase
    .from('purchase_records')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Supabase error:', error);
    throw new Error('Gagal mengambil data dari database');
  }

  return data || [];
}

// Fungsi helper untuk mengecek RLS
async function checkTableAccess() {
  const { error } = await supabase
    .from('purchase_records')
    .select('id')
    .limit(1)
  
  if (error) {
    console.error('RLS Check Error:', error)
    return false
  }
  return true
}

export async function deleteAllPurchases() {
  try {
    // Log awal proses
    console.log('Memulai proses penghapusan semua data...')

    // Cek akses terlebih dahulu
    const hasAccess = await checkTableAccess()
    if (!hasAccess) {
      throw new Error('Tidak memiliki akses untuk menghapus data')
    }

    // Lakukan penghapusan
    const { error: deleteError } = await supabase
      .from('purchase_records')
      .delete()
      .not('id', 'is', null)

    // Tangani error penghapusan
    if (deleteError) {
      console.error('Error saat menghapus:', deleteError)
      throw new Error(deleteError.message || 'Gagal menghapus data')
    }

    // Log sukses
    console.log('Berhasil menghapus semua data')
    return true

  } catch (err) {
    const error = err as Error
    console.error('Gagal menghapus data:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    })
    throw new Error(`Gagal menghapus data: ${error.message}`)
  }
}

export async function deletePurchase(id: string) {
  try {
    // Cek akses terlebih dahulu
    const hasAccess = await checkTableAccess()
    if (!hasAccess) {
      throw new Error('Tidak memiliki akses untuk menghapus data')
    }

    console.log('Mencoba menghapus data dengan ID:', id)

    const { error } = await supabase
      .from('purchase_records')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error saat menghapus:', error)
      throw new Error(error.message || 'Gagal menghapus data')
    }

    console.log('Berhasil menghapus data dengan ID:', id)
    return true
  } catch (error) {
    console.error('Error dalam deletePurchase:', error)
    throw error instanceof Error 
      ? error 
      : new Error('Gagal menghapus data')
  }
} 