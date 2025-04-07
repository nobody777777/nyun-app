'use client'

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Category, MenuItem } from '@/lib/types';

export default function OrderInputPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [orderItems, setOrderItems] = useState<Array<{
    menu_item_id: string;
    menu_item_name: string;
    quantity: number;
    price: number;
    subtotal: number;
  }>>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Ambil kategori saat komponen dimuat
  useEffect(() => {
    async function fetchCategories() {
      try {
        const { data, error } = await supabase
          .from('categories')
          .select('*')
          .order('name');
          
        if (error) throw error;
        setCategories(data || []);
      } catch (error) {
        console.error('Error fetching categories:', error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchCategories();
  }, []);

  // Ambil menu berdasarkan kategori yang dipilih
  useEffect(() => {
    if (!selectedCategory) return;
    
    async function fetchMenuItems() {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('menu_items')
          .select('*')
          .eq('category_id', selectedCategory)
          .order('name');
          
        if (error) throw error;
        setMenuItems(data || []);
      } catch (error) {
        console.error('Error fetching menu items:', error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchMenuItems();
  }, [selectedCategory]);

  // Format harga dalam Rupiah
  const formatPrice = (price: number) => {
    return `Rp${price.toLocaleString('id-ID')}`;
  };

  // Tambahkan item ke pesanan dengan satu klik
  const addToOrder = (item: MenuItem) => {
    // Cek apakah item sudah ada di pesanan
    const existingItemIndex = orderItems.findIndex(
      orderItem => orderItem.menu_item_id === item.id
    );
    
    if (existingItemIndex >= 0) {
      // Jika sudah ada, tambah jumlahnya
      const updatedItems = [...orderItems];
      updatedItems[existingItemIndex].quantity += 1;
      updatedItems[existingItemIndex].subtotal = 
        updatedItems[existingItemIndex].price * updatedItems[existingItemIndex].quantity;
      setOrderItems(updatedItems);
    } else {
      // Jika belum ada, tambahkan item baru
      setOrderItems([...orderItems, {
        menu_item_id: item.id,
        menu_item_name: item.name,
        quantity: 1,
        price: item.price,
        subtotal: item.price
      }]);
    }
  };

  // Update jumlah item pesanan
  const updateQuantity = (index: number, newQuantity: number) => {
    if (newQuantity < 1) return;
    
    const updatedItems = [...orderItems];
    updatedItems[index].quantity = newQuantity;
    updatedItems[index].subtotal = updatedItems[index].price * newQuantity;
    setOrderItems(updatedItems);
  };

  // Hapus item dari pesanan
  const removeOrderItem = (index: number) => {
    setOrderItems(orderItems.filter((_, i) => i !== index));
  };

  // Simpan pesanan
  const saveOrder = async () => {
    if (orderItems.length === 0) return;
    
    try {
      setIsSubmitting(true);
      
      // Hitung total pesanan
      const totalAmount = orderItems.reduce((sum, item) => sum + item.subtotal, 0);
      
      // Simpan pesanan ke database
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          customer_name: 'Pelanggan', // Nama default
          total_amount: totalAmount,
          status: 'pending',
          notes: '' // Catatan kosong
        })
        .select()
        .single();
      
      if (orderError) throw orderError;
      
      // Simpan item pesanan
      const orderItemsToInsert = orderItems.map(item => ({
        order_id: order.id,
        menu_item_id: item.menu_item_id,
        menu_item_name: item.menu_item_name,
        quantity: item.quantity,
        price: item.price,
        subtotal: item.subtotal
      }));
      
      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItemsToInsert);
      
      if (itemsError) throw itemsError;
      
      // Reset form
      setOrderItems([]);
      setSuccessMessage('Pesanan berhasil disimpan!');
      
      // Hilangkan pesan sukses setelah 3 detik
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
      
    } catch (error) {
      console.error('Error saving order:', error);
      alert('Terjadi kesalahan saat menyimpan pesanan');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-4 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Input Pesanan</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Kategori dan Menu (Kolom Kiri) */}
        <div className="md:col-span-2">
          {/* Daftar Kategori (Vertikal) */}
          <div className="mb-6">
            <h2 className="text-lg font-medium mb-3">Kategori</h2>
            <div className="space-y-2">
              {categories.map(category => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`w-full text-left px-4 py-3 rounded-lg border ${
                    selectedCategory === category.id
                      ? 'bg-blue-50 border-blue-300 text-blue-700'
                      : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {category.name}
                </button>
              ))}
            </div>
          </div>
          
          {/* Daftar Menu */}
          <div>
            <h2 className="text-lg font-medium mb-3">Menu</h2>
            {loading ? (
              <div className="text-center py-8">Memuat menu...</div>
            ) : !selectedCategory ? (
              <div className="text-center py-8 text-gray-500">
                Pilih kategori untuk melihat menu
              </div>
            ) : menuItems.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                Tidak ada menu dalam kategori ini
              </div>
            ) : (
              <div className="space-y-2">
                {menuItems.map(item => (
                  <button
                    key={item.id}
                    onClick={() => addToOrder(item)}
                    className="w-full flex justify-between items-center p-4 border rounded-lg bg-white hover:bg-gray-50"
                  >
                    <span className="font-medium">{item.name}</span>
                    <span className="text-blue-600">{formatPrice(item.price)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        
        {/* Ringkasan Pesanan (Kolom Kanan) */}
        <div>
          <div className="bg-white p-4 border rounded-lg shadow-sm">
            <h2 className="text-lg font-medium mb-4">Ringkasan Pesanan</h2>
            
            {/* Daftar Item Pesanan */}
            <div className="mb-4">
              {orderItems.length === 0 ? (
                <div className="border rounded-lg p-4 text-center text-gray-500">
                  Belum ada item yang ditambahkan
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  {orderItems.map((item, index) => (
                    <div key={index} className="p-3 border-b flex justify-between items-center">
                      <div>
                        <div className="font-medium">{item.menu_item_name}</div>
                        <div className="flex items-center mt-1">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              updateQuantity(index, item.quantity - 1);
                            }}
                            className="px-2 border rounded"
                          >
                            -
                          </button>
                          <span className="mx-2">{item.quantity}</span>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              updateQuantity(index, item.quantity + 1);
                            }}
                            className="px-2 border rounded"
                          >
                            +
                          </button>
                          <span className="ml-2 text-gray-600">
                            {formatPrice(item.price)}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <div className="font-medium mr-3">
                          {formatPrice(item.subtotal)}
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeOrderItem(index);
                          }}
                          className="text-red-500 hover:text-red-700"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                  
                  <div className="p-3 bg-gray-50 flex justify-between font-bold">
                    <div>Total</div>
                    <div>{formatPrice(orderItems.reduce((sum, item) => sum + item.subtotal, 0))}</div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Tombol Simpan */}
            <button
              onClick={saveOrder}
              disabled={isSubmitting || orderItems.length === 0}
              className={`w-full py-3 rounded-lg font-medium ${
                isSubmitting || orderItems.length === 0
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {isSubmitting ? 'Menyimpan...' : 'Simpan Pesanan'}
            </button>
            
            {/* Pesan Sukses */}
            {successMessage && (
              <div className="mt-4 p-3 bg-green-100 text-green-700 rounded-lg">
                {successMessage}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}