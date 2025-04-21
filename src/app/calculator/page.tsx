'use client'
import { useState } from 'react'
import { ingredients } from './data/ingredients'
import IngredientCard from './components/IngredientCard'
import Link from 'next/link'
import { savePurchase } from './lib/purchaseService'
import { usePopup } from '@/components/ui/PopupManager'

export default function CalculatorPage() {
  const { showPopup, closePopup } = usePopup()
  const [quantities, setQuantities] = useState<{[key: string]: number}>({})
  const [activeCategory, setActiveCategory] = useState<string>('semua')
  const [saving, setSaving] = useState(false)

  const handleIncrement = (id: string) => {
    setQuantities(prev => ({
      ...prev,
      [id]: (prev[id] || 0) + 1
    }))
  }

  const handleReset = (id: string) => {
    setQuantities(prev => ({
      ...prev,
      [id]: 0
    }))
  }

  const calculateTotal = () => {
    return ingredients.reduce((total, item) => {
      return total + (item.price * (quantities[item.id] || 0))
    }, 0)
  }

  const filteredIngredients = activeCategory === 'semua' 
    ? ingredients 
    : ingredients.filter(item => item.category === activeCategory)

  const handleSave = async () => {
    // Validasi
    const hasItems = Object.values(quantities).some(qty => qty > 0)
    if (!hasItems) {
      showPopup(
        'Peringatan',
        'Pilih minimal satu item untuk disimpan',
        'warning'
      )
      return
    }

    try {
      setSaving(true)
      
      // Tampilkan loading state
      showPopup('Memproses', 'Sedang menyimpan catatan...', 'info')
      
      await savePurchase(quantities)
      
      // Reset form
      setQuantities({})
      
      // Tutup popup loading
      closePopup()
      
      // Tampilkan pesan sukses
      showPopup(
        'Sukses', 
        'Catatan berhasil disimpan!', 
        'success',
        2000
      )
    } catch (error) {
      console.error('Save error:', error)
      showPopup(
        'Error',
        error instanceof Error ? error.message : 'Gagal menyimpan catatan',
        'error'
      )
    } finally {
      setSaving(false)
    }
  }

  const handleResetAll = () => {
    showPopup(
      'Konfirmasi Reset',
      <div>
        <p>Yakin ingin menghapus semua item dari keranjang?</p>
        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={() => closePopup()}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            Batal
          </button>
          <button
            onClick={() => {
              setQuantities({})
              closePopup()
              showPopup(
                'Sukses',
                'Keranjang berhasil dikosongkan',
                'success',
                1000
              )
            }}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
          >
            Ya, Reset Semua
          </button>
        </div>
      </div>,
      'warning'
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">
            Kalkulator Bahan
          </h1>
          <Link 
            href="/calculator/history"
            className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow"
          >
            <span className="text-xl">📋</span>
            <span className="font-medium text-gray-700">Lihat Riwayat</span>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Daftar Bahan */}
          <div className="lg:col-span-2 space-y-4">
            {/* Filter Kategori */}
            <div className="flex flex-wrap gap-2 mb-6">
              {['semua', 'baku', 'bumbu', 'kemasan'].map(category => (
                <button
                  key={category}
                  onClick={() => setActiveCategory(category)}
                  className={`
                    px-6 py-2 rounded-full font-medium transition-colors
                    ${activeCategory === category
                      ? 'bg-blue-500 text-white shadow-md'
                      : 'bg-white text-gray-600 hover:bg-blue-50'
                    }
                  `}
                >
                  {category === 'semua' && '📋'}
                  {category === 'baku' && '🍞'}
                  {category === 'bumbu' && '🧂'}
                  {category === 'kemasan' && '📦'}
                  <span className="ml-2">
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </span>
                </button>
              ))}
            </div>

            {/* Daftar Kartu Bahan */}
            <div className="space-y-4">
              {filteredIngredients.map(item => (
                <IngredientCard
                  key={item.id}
                  {...item}
                  quantity={quantities[item.id] || 0}
                  onIncrement={handleIncrement}
                  onReset={handleReset}
                />
              ))}
            </div>
          </div>

          {/* Panel Total */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-lg p-6 sticky top-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">
                Total Belanja
              </h2>
              
              {Object.keys(quantities).filter(id => quantities[id] > 0).length > 0 ? (
                <div className="space-y-4">
                  {ingredients
                    .filter(item => quantities[item.id] > 0)
                    .map(item => (
                      <div key={item.id} className="flex justify-between items-center py-2">
                        <div>
                          <span className="font-medium">{item.name}</span>
                          <span className="text-sm text-gray-500 ml-2">
                            x {quantities[item.id]}
                          </span>
                        </div>
                        <span className="font-semibold">
                          Rp {(item.price * quantities[item.id]).toLocaleString()}
                        </span>
                      </div>
                    ))
                  }
                  
                  <div className="border-t border-gray-200 pt-4 mt-4">
                    <div className="flex justify-between items-center text-lg">
                      <span className="font-bold text-gray-800">Total</span>
                      <span className="font-bold text-blue-600">
                        Rp {calculateTotal().toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3 mt-6">
                    <button
                      onClick={handleResetAll}
                      className="w-full py-3 bg-red-500 text-white rounded-lg font-medium
                        hover:bg-red-600 transition-colors duration-200
                        focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                    >
                      Reset Semua
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className={`
                        w-full py-3 rounded-lg font-medium
                        ${saving 
                          ? 'bg-gray-400 cursor-not-allowed' 
                          : 'bg-blue-500 hover:bg-blue-600'}
                        text-white transition-colors duration-200
                      `}
                    >
                      {saving ? 'Menyimpan...' : 'Simpan Catatan'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-gray-400 text-6xl mb-4">🛒</div>
                  <p className="text-gray-500">
                    Klik item untuk menambahkan ke keranjang
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 

/*
INFORMASI PENTING:
------------------
File: calculator/page.tsx
Fungsi: Halaman utama kalkulator bahan untuk menghitung total pembelian

Fitur Penting:
1. Menampilkan daftar bahan dengan filter kategori
2. Menghitung total pembelian secara real-time
3. Menyimpan catatan pembelian ke database
4. Reset dan reset semua item
5. Integrasi dengan popup untuk notifikasi

Catatan Update:
- Jangan hapus state quantities karena penting untuk tracking item
- Pertahankan fungsi calculateTotal untuk perhitungan real-time
- Selalu gunakan showPopup untuk feedback pengguna
- Jangan ubah struktur filter kategori

KETERKAITAN ANTAR FILE:
----------------------
1. src/app/calculator/components/IngredientCard.tsx
   - Digunakan untuk menampilkan setiap item bahan
   - Menerima props quantity, onIncrement, dan onReset
   - Terkait dengan UI dan interaksi pengguna

2. src/app/calculator/data/ingredients.ts
   - Menyediakan data bahan untuk kalkulator
   - Digunakan untuk filtering dan perhitungan
   - Terkait dengan data master aplikasi

3. src/app/calculator/lib/purchaseService.ts
   - Digunakan untuk menyimpan catatan pembelian
   - Menangani interaksi dengan database
   - Terkait dengan persistensi data

4. src/components/ui/PopupManager.tsx
   - Digunakan untuk menampilkan notifikasi
   - Menangani feedback untuk pengguna
   - Terkait dengan UX aplikasi

5. src/app/calculator/history/page.tsx
   - Halaman terpisah untuk melihat riwayat pembelian
   - Terhubung melalui tombol "Lihat Riwayat"
   - Terkait dengan fitur riwayat pembelian
*/ 