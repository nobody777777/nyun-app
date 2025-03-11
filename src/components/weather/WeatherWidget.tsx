'use client'
import { useState } from 'react'

export default function WeatherWidget() {
  const [location, setLocation] = useState('Jakarta')

  return (
    <div className="border rounded-lg p-4">
      <h2 className="text-xl font-bold">Informasi Cuaca</h2>
      <input 
        type="text"
        value={location}
        onChange={(e) => setLocation(e.target.value)}
        placeholder="Masukkan lokasi..."
        className="border p-2 mt-2 w-full"
      />
    </div>
  )
} 