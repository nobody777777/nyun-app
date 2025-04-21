import { supabase } from '@/lib/supabase'
import { ingredients } from '../data/ingredients'

export interface PurchaseItem {
  id: string
  name: string
  quantity: number
  price: number
  total: number
}

export interface PurchaseRecord {
  id: string
  created_at: string
  items: PurchaseItem[]
  total_amount: number
}

export const saveRecord = async (quantities: {[key: string]: number}) => {
  const items = ingredients
    .filter(item => quantities[item.id] > 0)
    .map(item => ({
      id: item.id,
      name: item.name,
      quantity: quantities[item.id],
      price: item.price,
      total: item.price * quantities[item.id]
    }));

  const totalAmount = items.reduce((sum, item) => sum + item.total, 0);

  const { data, error } = await supabase
    .from('purchase_records')
    .insert({
      items,
      total_amount: totalAmount
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const getRecords = async (): Promise<PurchaseRecord[]> => {
  const { data, error } = await supabase
    .from('purchase_records')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
};

export const deleteRecord = async (id: string) => {
  const { error } = await supabase
    .from('purchase_records')
    .delete()
    .eq('id', id);

  if (error) throw error;
};

export const deleteAllRecords = async () => {
  const { error } = await supabase
    .from('purchase_records')
    .delete()
    .neq('id', '');

  if (error) throw error;
}; 

/*
INFORMASI PENTING:
------------------
File: calculator/lib/db.ts
Fungsi: Layanan database dasar untuk operasi CRUD pembelian

Fitur Penting:
1. Interface untuk tipe data PurchaseItem dan PurchaseRecord
2. Fungsi saveRecord untuk menyimpan pembelian
3. Fungsi getRecords untuk mengambil riwayat
4. Fungsi deleteRecord untuk menghapus satu record
5. Fungsi deleteAllRecords untuk menghapus semua record

Catatan Update:
- Jangan hapus interface karena digunakan di banyak tempat
- Pertahankan struktur data untuk Supabase
- Selalu gunakan error handling
- Jangan ubah nama tabel 'purchase_records'

KETERKAITAN ANTAR FILE:
----------------------
1. src/app/calculator/lib/purchaseService.ts
   - Menggunakan interface yang sama
   - Terkait dengan operasi database
   - Mempengaruhi struktur data

2. src/app/calculator/components/PurchaseHistory.tsx
   - Menggunakan fungsi getRecords
   - Terkait dengan pengambilan data
   - Mempengaruhi tampilan riwayat

3. src/app/calculator/page.tsx
   - Menggunakan fungsi saveRecord
   - Terkait dengan penyimpanan data
   - Mempengaruhi fungsionalitas kalkulator

4. src/lib/supabase.ts
   - Menggunakan client Supabase
   - Terkait dengan koneksi database
   - Mempengaruhi operasi database

5. src/app/calculator/data/ingredients.ts
   - Data bahan digunakan untuk saveRecord
   - Terkait dengan struktur data
   - Mempengaruhi penyimpanan data
*/ 