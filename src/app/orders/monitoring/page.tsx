'use client'

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function OrderMonitoringPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Ambil pesanan yang belum selesai dan setup realtime subscription
  useEffect(() => {
    fetchPendingOrders();
    
    // Setup realtime subscription
    const subscription = supabase
      .channel('orders-channel')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'orders' }, 
        () => {
          fetchPendingOrders();
        }
      )
      .subscribe();
    
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Fungsi untuk mengambil pesanan yang belum selesai
  const fetchPendingOrders = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
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
        .eq('status', 'pending')
        .order('created_at');
      
      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Error fetching pending orders:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fungsi untuk menyelesaikan pesanan
  const completeOrder = async (orderId) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ 
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', orderId);
      
      if (error) throw error;
      
      // Refresh data
      fetchPendingOrders();
    } catch (error) {
      console.error('Error completing order:', error);
      alert('Terjadi kesalahan saat menyelesaikan pesanan');
    }
  };

  // Format waktu
  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('id-ID', { 
      hour: '2-digit', 
      minute: '2-digit'
    });
  };

  // Format harga
  const formatPrice = (price) => {
    return `Rp${price.toLocaleString('id-ID')}`;
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">Monitoring Pesanan</h1>
      
      {loading ? (
        <div className="flex justify-center items-center h-40">
          <p>Memuat pesanan...</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-white rounded-lg border p-8 text-center">
          <p className="text-lg text-gray-600">Tidak ada pesanan yang sedang diproses</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {orders.map((order) => (
            <div key={order.id} className="bg-white rounded-lg border overflow-hidden shadow-sm">
              {/* Header Pesanan */}
              <div className="p-4 bg-blue-50 border-b">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold">{order.customer_name}</h3>
                  <span className="text-sm text-gray-600">{formatTime(order.created_at)}</span>
                </div>
              </div>
              
              {/* Detail Pesanan */}
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
              
              {/* Tombol Aksi */}
              <div className="p-4">
                <button
                  onClick={() => completeOrder(order.id)}
                  className="w-full py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                >
                  Selesaikan Pesanan
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}