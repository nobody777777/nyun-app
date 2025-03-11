'use client'
import { useState } from 'react'
import { createSale, addSaleItems } from '@/lib/db-helpers'

export default function SalesForm() {
  const [items, setItems] = useState([{ name: '', quantity: 1, price: 0 }])
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [notes, setNotes] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const totalAmount = items.reduce((sum, item) => sum + (item.quantity * item.price), 0)

    try {
      const sale = await createSale({
        date,
        total_amount: totalAmount,
        notes
      })

      const saleItems = items.map(item => ({
        sale_id: sale.id,
        item_name: item.name,
        quantity: item.quantity,
        price: item.price
      }))

      await addSaleItems(saleItems)
      // Reset form
      setItems([{ name: '', quantity: 1, price: 0 }])
      setNotes('')
    } catch (error) {
      console.error('Error saving sale:', error)
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

      <button type="submit" className="w-full p-2 bg-blue-500 text-white rounded">
        Simpan Penjualan
      </button>
    </form>
  )
} 