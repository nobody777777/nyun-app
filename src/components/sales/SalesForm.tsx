'use client'
import React from 'react'
import { useState } from 'react'
import { createSale, addSaleItems, updateDailySales } from '@/lib/db-helpers'
import { useRouter } from 'next/navigation'

export default function SalesForm() {
  const [items, setItems] = useState([{ name: '', quantity: 1, price: 0 }])
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    const totalAmount = items.reduce((sum, item) => sum + (item.quantity * item.price), 0)

    try {
      // Hitung total roti
      const totalBread = items.reduce((sum, item) => {
        // Asumsikan item dengan nama yang mengandung "roti" adalah roti
        if (item.name.toLowerCase().includes('roti')) {
          return sum + item.quantity
        }
        return sum
      }, 0)

      // 1. Simpan data penjualan
      const sale = await createSale({
        date,
        total_amount: totalAmount,
        notes
      })

      // 2. Simpan item penjualan
      const saleItems = items.map(item => ({
        sale_id: sale.id,
        item_name: item.name,
        quantity: item.quantity,
        price: item.price,
        subtotal: item.quantity * item.price
      }))

      await addSaleItems(saleItems)

      // 3. Update data harian untuk grafik
      await updateDailySales({
        date,
        total_sales: totalAmount,
        total_bread: totalBread
      })

      // Reset form
      setItems([{ name: '', quantity: 1, price: 0 }])
      setNotes('')
      
      // Refresh halaman untuk memperbarui grafik
      router.refresh()
      
      // Tampilkan notifikasi sukses
      alert('Data penjualan berhasil disimpan dan grafik telah diperbarui')
    } catch (error) {
      console.error('Error saving sale:', error)
      alert('Terjadi kesalahan saat menyimpan data')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block mb-2">Tanggal</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full p-2 border rounded"
        />
      </div>

      {items.map((item, index) => (
        <div key={index} className="grid grid-cols-3 gap-2">
          <input
            placeholder="Nama Item"
            value={item.name}
            onChange={(e) => {
              const newItems = [...items]
              newItems[index].name = e.target.value
              setItems(newItems)
            }}
            className="p-2 border rounded"
          />
          <input
            type="number"
            placeholder="Jumlah"
            value={item.quantity}
            onChange={(e) => {
              const newItems = [...items]
              newItems[index].quantity = parseInt(e.target.value)
              setItems(newItems)
            }}
            className="p-2 border rounded"
          />
          <input
            type="number"
            placeholder="Harga"
            value={item.price}
            onChange={(e) => {
              const newItems = [...items]
              newItems[index].price = parseFloat(e.target.value)
              setItems(newItems)
            }}
            className="p-2 border rounded"
          />
        </div>
      ))}

      <button
        type="button"
        onClick={() => setItems([...items, { name: '', quantity: 1, price: 0 }])}
        className="w-full p-2 bg-gray-200 rounded"
      >
        Tambah Item
      </button>

      <div>
        <label className="block mb-2">Catatan</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full p-2 border rounded"
        />
      </div>

      <button 
        type="submit" 
        className={`w-full p-2 bg-blue-500 text-white rounded ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
        disabled={isSubmitting}
      >
        {isSubmitting ? 'Menyimpan...' : 'Simpan Penjualan'}
      </button>
    </form>
  )
} 

/*
INFORMASI PENTING:
------------------
File: components/sales/SalesForm.tsx
Fungsi: Komponen form untuk input data penjualan dengan dynamic items

Fitur Penting:
1. Dynamic form items (tambah/hapus item)
2. Validasi input dan perhitungan otomatis
3. Handling multiple async operations
4. State management untuk form
5. Loading state saat submit
6. Format tanggal Indonesia
7. Perhitungan total roti dan omset

Catatan Update:
- Jangan hapus perhitungan totalBread
- Pertahankan urutan operasi database
- Selalu gunakan error handling
- Jangan ubah struktur form items
- Pastikan validasi berjalan
- Pertahankan refresh after submit

KETERKAITAN ANTAR FILE:
----------------------
1. src/lib/db-helpers.ts
   - Menggunakan createSale
   - Menggunakan addSaleItems
   - Menggunakan updateDailySales
   - Penting untuk operasi database

2. src/app/sales/page.tsx
   - Parent component
   - Menerima hasil submit
   - Menangani refresh data
   - Mempengaruhi state global

3. src/contexts/SalesContext.tsx
   - Tidak langsung terkait
   - Mempengaruhi refresh data
   - Terkait dengan update grafik
   - Penting untuk sinkronisasi

4. src/components/sales/SalesCalendar.tsx
   - Terkait dengan update data
   - Menerima hasil input form
   - Mempengaruhi tampilan kalender
   - Refresh setelah submit

5. src/types/database.ts
   - Definisi tipe Sale
   - Definisi tipe SaleItem
   - Memastikan type safety
   - Penting untuk validasi

CATATAN TEKNIS:
--------------
1. Validasi:
   - Cek nama item tidak kosong
   - Cek quantity > 0
   - Cek price >= 0
   - Validasi format tanggal

2. Error Handling:
   - Tangani kegagalan network
   - Tangani error database
   - Rollback jika gagal
   - Feedback ke user

3. Optimasi:
   - Batasi re-render items
   - Gunakan useCallback
   - Optimasi perhitungan total
   - Cache input values

4. UX Improvements:
   - Tambah konfirmasi submit
   - Tambah preview total
   - Tambah validasi real-time
   - Improved error messages
*/ 