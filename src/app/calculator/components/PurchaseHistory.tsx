'use client'
import { useState, useEffect } from 'react'
import { getRecords } from '../lib/db' // atau '../lib/db' jika pakai Supabase
import type { PurchaseRecord } from '../lib/db';

export default function PurchaseHistory() {
  const [records, setRecords] = useState<PurchaseRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRecords();
  }, []);

  const loadRecords = async () => {
    try {
      const data = await getRecords();
      setRecords(data);
    } catch (error) {
      console.error('Error loading records:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Riwayat Pembelian</h2>
      {records.map(record => (
        <div key={record.id} className="bg-white rounded-lg shadow p-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-gray-600">
              {new Date(record.created_at).toLocaleDateString('id-ID', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </span>
            <span className="font-bold">
              Total: Rp {record.total_amount.toLocaleString()}
            </span>
          </div>
          <div className="space-y-2">
            {record.items.map(item => (
              <div key={item.id} className="flex justify-between text-sm">
                <span>{item.name} x {item.quantity}</span>
                <span>Rp {item.total.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
} 

/*
INFORMASI PENTING:
------------------
File: calculator/components/PurchaseHistory.tsx
Fungsi: Komponen untuk menampilkan riwayat pembelian

Fitur Penting:
1. Menampilkan daftar riwayat pembelian
2. Loading state handling
3. Format tanggal lokal Indonesia
4. Tampilan total per transaksi
5. Detail item per transaksi

Catatan Update:
- Jangan hapus format tanggal lokal
- Pertahankan struktur loading state
- Selalu gunakan error handling
- Jangan ubah struktur tampilan data

KETERKAITAN ANTAR FILE:
----------------------
1. src/app/calculator/lib/db.ts
   - Menggunakan fungsi getRecords
   - Terkait dengan pengambilan data
   - Mempengaruhi tampilan riwayat

2. src/app/calculator/lib/purchaseService.ts
   - Menggunakan interface PurchaseRecord
   - Terkait dengan struktur data
   - Mempengaruhi tipe data

3. src/app/calculator/history/page.tsx
   - Digunakan sebagai komponen child
   - Terkait dengan halaman riwayat
   - Mempengaruhi layout

4. src/styles/globals.css
   - Menggunakan styling global
   - Terkait dengan tampilan
   - Mempengaruhi UI

5. src/components/ui/PopupManager.tsx
   - Tidak langsung terkait
   - Parent menggunakan popup untuk error
   - Terkait dengan error handling
*/ 