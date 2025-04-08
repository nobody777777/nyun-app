'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Order } from '@/lib/types'

export default function OrderHistoryPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // Set tanggal default ke hari ini
  useEffect(() => {
    const today = new Date()
    const formattedDate = today.toISOString().split('T')[0]
    setStartDate(formattedDate)
    setEndDate(formattedDate)
  }, [])

  // Ambil riwayat pesanan
  useEffect(() => {
    if (startDate && endDate) {
      fetchOrderHistory()
    }
  }, [startDate, endDate])

  // Fungsi untuk mengambil riwayat pesanan
  const fetchOrderHistory = useCallback(async () => {
    try {
      setLoading(true)
      
      // Tambahkan waktu ke tanggal akhir untuk mencakup seluruh hari
      const endDateTime = new Date(endDate)
      endDateTime.setHours(23, 59, 59, 999)
      
      let query = supabase
        .from('orders')
        .select(`
          *,
          order_items:order_items(
            id,
            menu_item_id,
            menu_item_name,
            quantity,
            price,
            subtotal
          )
        `)
        .eq('status', 'completed')
        .gte('completed_at', `${startDate}T00:00:00`)
        .lte('completed_at', endDateTime.toISOString())
        .order('completed_at', { ascending: false })
      
      const { data, error } = await query
      
      if (error) throw error
      setOrders(data || [])
    } catch (error) {
      console.error('Error fetching order history:', error)
    } finally {
      setLoading(false)
    }
  }, [startDate, endDate])

  useEffect(() => {
    fetchOrderHistory()
  }, [fetchOrderHistory])

  // Format tanggal dan waktu
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('id-ID', { 
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit', 
      minute: '2-digit'
    })
  }

  // Format harga
  const formatPrice = (price: number) => {
    return `Rp${price.toLocaleString('id-ID')}`
  }

  // Toggle expanded order
  const toggleOrderExpand = (orderId: string) => {
    if (expandedOrderId === orderId) {
      setExpandedOrderId(null)
    } else {
      setExpandedOrderId(orderId)
    }
  }

  // Hitung total penjualan
  const totalSales = orders.reduce((sum, order) => sum + order.total_amount, 0)

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">Riwayat Pesanan</h1>
      
      {/* Filter Tanggal */}
      <div className="bg-white rounded-lg border p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Tanggal Mulai</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full border rounded-md p-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Tanggal Akhir</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full border rounded-md p-2"
            />
          </div>
        </div>
      </div>
      
      {/* Ringkasan */}
      <div className="bg-blue-50 rounded-lg border p-4 mb-6">
        <h2 className="font-semibold mb-2">Ringkasan</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600">Jumlah Pesanan</p>
            <p className="text-xl font-bold">{orders.length}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Total Penjualan</p>
            <p className="text-xl font-bold text-blue-600">{formatPrice(totalSales)}</p>
          </div>
        </div>
      </div>
      
      {/* Daftar Pesanan */}
      {loading ? (
        <div className="flex justify-center items-center h-40">
          <p>Memuat riwayat pesanan...</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-white rounded-lg border p-8 text-center">
          <p className="text-lg text-gray-600">Tidak ada pesanan dalam rentang tanggal ini</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order.id} className="bg-white rounded-lg border overflow-hidden shadow-sm">
              {/* Header Pesanan */}
              <div className="p-4 bg-gray-50 border-b">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold">{order.customer_name}</h3>
                  <span className="text-sm text-gray-600">{formatDateTime(order.completed_at || order.created_at)}</span>
                </div>
                <div className="mt-1 flex justify-between items-center">
                  <p className="text-blue-600 font-medium">{formatPrice(order.total_amount)}</p>
                  <button
                    onClick={() => toggleOrderExpand(order.id)}
                    className="text-sm text-blue-600"
                  >
                    {expandedOrderId === order.id ? 'Sembunyikan' : 'Lihat Detail'}
                  </button>
                </div>
              </div>
              
              {/* Detail Pesanan */}
              {expandedOrderId === order.id && (
                <div className="p-4 border-b">
                  <h4 className="font-medium mb-2">Detail Pesanan:</h4>
                  <ul className="space-y-2">
                    {order.order_items.map((item) => (
                      <li key={item.id} className="flex justify-between">
                        <div>
                          <span className="font-medium">{item.menu_item_name}</span>
                          <span className="text-sm text-gray-600 ml-2">x{item.quantity}</span>
                        </div>
                        <span>{formatPrice(item.subtotal)}</span>
                      </li>
                    ))}
                  </ul>
                  
                  <div className="mt-3 pt-3 border-t flex justify-between font-bold">
                    <span>Total:</span>
                    <span>{formatPrice(order.total_amount)}</span>
                  </div>
                  
                  {order.notes && (
                    <div className="mt-3 p-2 bg-yellow-50 rounded-md">
                      <p className="text-sm text-gray-700">
                        <span className="font-medium">Catatan:</span> {order.notes}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}