'use client'
import { useState } from 'react'

export default function Calculator() {
  const [items, setItems] = useState<Array<{name: string, price: number}>>([])
  
  return (
    <div className="border rounded-lg p-4">
      <h2 className="text-xl font-bold">Kalkulator Penjualan</h2>
      {/* Implementasi kalkulator akan ditambahkan */}
    </div>
  )
} 