'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { getPurchaseHistory, deletePurchase, deleteAllPurchases } from '../lib/purchaseService'
import { usePopup } from '@/components/ui/PopupManager'

interface PurchaseRecord {
  id: string
  created_at: string
  items: {
    id: string
    name: string
    quantity: number
    price: number
    total: number
    category: string
  }[]
  total_amount: number
}

export default function HistoryPage() {
  const { showPopup, closePopup } = usePopup()
  const [records, setRecords] = useState<PurchaseRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState('list')

  useEffect(() => {
    loadRecords()
  }, [])

  const loadRecords = async () => {
    try {
      setLoading(true)
      const data = await getPurchaseHistory()
      setRecords(data)
    } catch (error) {
      console.error('Error loading records:', error)
      showPopup(
        'Error',
        'Gagal memuat data riwayat pembelian',
        'error'
      )
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    showPopup(
      'Konfirmasi Hapus',
      <div>
        <p>Yakin ingin menghapus catatan ini?</p>
        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={() => closePopup()}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            Batal
          </button>
          <button
            onClick={async () => {
              closePopup()
              try {
                showPopup('Memproses', 'Sedang menghapus catatan...', 'info')
                await deletePurchase(id)
                closePopup()
                await loadRecords()
                showPopup(
                  'Sukses',
                  'Catatan berhasil dihapus!',
                  'success',
                  1500
                )
              } catch (error) {
                console.error('Error deleting record:', error)
                showPopup(
                  'Error',
                  'Gagal menghapus catatan',
                  'error'
                )
              }
            }}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
          >
            Ya, Hapus
          </button>
        </div>
      </div>,
      'warning'
    )
  }

  const handleDeleteAll = async () => {
    showPopup(
      'Konfirmasi Hapus Semua',
      <div>
        <p>Yakin ingin menghapus semua catatan?</p>
        <p className="text-sm text-gray-500 mt-2">
          Tindakan ini tidak dapat dibatalkan.
        </p>
        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={() => closePopup()}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            Batal
          </button>
          <button
            onClick={async () => {
              closePopup()
              
              try {
                // Tampilkan loading
                showPopup('Memproses', 'Sedang menghapus semua catatan...', 'info')
                
                // Coba hapus data
                await deleteAllPurchases()
                
                // Update state lokal
                setRecords([])
                
                // Tutup loading popup
                closePopup()
                
                // Tampilkan sukses
                showPopup(
                  'Sukses',
                  'Semua catatan berhasil dihapus!',
                  'success',
                  1500
                )
              } catch (error) {
                // Tutup loading popup
                closePopup()
                
                // Tampilkan error
                showPopup(
                  'Error',
                  error instanceof Error 
                    ? error.message 
                    : 'Gagal menghapus data. Silakan coba lagi.',
                  'error',
                  3000
                )
              }
            }}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
          >
            Ya, Hapus Semua
          </button>
        </div>
      </div>,
      'warning'
    )
  }

  const groupByWeek = () => {
    const grouped: Record<string, { total: number; records: PurchaseRecord[] }> = {}
    
    records.forEach(record => {
      const date = new Date(record.created_at)
      const weekStart = new Date(date)
      weekStart.setDate(date.getDate() - date.getDay())
      const weekKey = weekStart.toISOString().split('T')[0]
      
      if (!grouped[weekKey]) {
        grouped[weekKey] = {
          total: 0,
          records: []
        }
      }
      grouped[weekKey].total += record.total_amount
      grouped[weekKey].records.push(record)
    })
    return grouped
  }

  const groupByMonth = () => {
    const grouped: Record<string, { total: number; records: PurchaseRecord[] }> = {}
    
    records.forEach(record => {
      const date = new Date(record.created_at)
      const monthKey = `${date.getFullYear()}-${date.getMonth() + 1}`
      
      if (!grouped[monthKey]) {
        grouped[monthKey] = {
          total: 0,
          records: []
        }
      }
      grouped[monthKey].total += record.total_amount
      grouped[monthKey].records.push(record)
    })
    return grouped
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">
            Riwayat Pembelian
          </h1>
          <div className="flex gap-4">
            <button
              onClick={handleDeleteAll}
              className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg 
                hover:bg-red-600 transition-colors duration-200"
            >
              <span className="text-xl">🗑️</span>
              <span>Hapus Semua</span>
            </button>
            <Link 
              href="/calculator"
              className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow-sm hover:shadow-md"
            >
              <span className="text-xl">🧮</span>
              <span>Kembali ke Kalkulator</span>
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex gap-4">
            {[
              { id: 'list', label: 'Detail', icon: '📋' },
              { id: 'weekly', label: 'Mingguan', icon: '📅' },
              { id: 'monthly', label: 'Bulanan', icon: '📆' }
            ].map(mode => (
              <button
                key={mode.id}
                onClick={() => setViewMode(mode.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                  viewMode === mode.id
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <span>{mode.icon}</span>
                <span>{mode.label}</span>
              </button>
            ))}
          </div>
        </div>

        {viewMode === 'list' && (
          <div className="space-y-4">
            {records.map(record => (
              <div key={record.id} className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex justify-between items-center mb-4">
                  <div className="text-gray-600">
                    {new Date(record.created_at).toLocaleDateString('id-ID', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-xl font-bold text-blue-600">
                      Rp {record.total_amount.toLocaleString()}
                    </span>
                    <button
                      onClick={() => handleDelete(record.id)}
                      className="text-red-500 hover:text-red-700 transition-colors duration-200"
                      title="Hapus catatan ini"
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                <div className="grid gap-2">
                  {record.items.map(item => (
                    <div key={item.id} className="flex justify-between items-center py-2 border-b last:border-0">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-800">{item.name}</span>
                        <span className="text-sm text-gray-500">x {item.quantity}</span>
                      </div>
                      <span className="font-medium">
                        Rp {item.total.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {viewMode === 'weekly' && (
          <div className="space-y-6">
            {Object.entries(groupByWeek()).map(([weekStart, data]) => (
              <div key={weekStart} className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex justify-between items-center mb-4">
                  <div className="font-bold text-lg">
                    Minggu {new Date(weekStart).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </div>
                  <div className="text-xl font-bold text-blue-600">
                    Rp {data.total.toLocaleString()}
                  </div>
                </div>
                <div className="text-sm text-gray-500">
                  {data.records.length} transaksi
                </div>
              </div>
            ))}
          </div>
        )}

        {viewMode === 'monthly' && (
          <div className="space-y-6">
            {Object.entries(groupByMonth()).map(([monthKey, data]) => {
              const [year, month] = monthKey.split('-')
              return (
                <div key={monthKey} className="bg-white rounded-lg shadow-sm p-6">
                  <div className="flex justify-between items-center mb-4">
                    <div className="font-bold text-lg">
                      {new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('id-ID', {
                        month: 'long',
                        year: 'numeric'
                      })}
                    </div>
                    <div className="text-xl font-bold text-blue-600">
                      Rp {data.total.toLocaleString()}
                    </div>
                  </div>
                  <div className="text-sm text-gray-500">
                    {data.records.length} transaksi
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
} 