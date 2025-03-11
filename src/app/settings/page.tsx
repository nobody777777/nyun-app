'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import LocationAutocomplete from '@/components/settings/LocationAutocomplete'

export default function Settings() {
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [currentLocation, setCurrentLocation] = useState('')
  const router = useRouter()

  useEffect(() => {
    loadCurrentLocation()
  }, [])

  async function loadCurrentLocation() {
    try {
      const { data, error } = await supabase
        .from('user_settings')
        .select('location')
        .single()

      if (error) throw error
      if (data) {
        setCurrentLocation(data.location)
      }
    } catch (error) {
      console.error('Error loading location:', error)
    }
  }

  async function saveLocation(location: string) {
    setSaving(true)
    setMessage('')

    try {
      const { error } = await supabase
        .from('user_settings')
        .upsert({
          id: '1',
          location: location,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'id'
        })

      if (error) {
        throw error
      }

      setMessage('Lokasi berhasil disimpan!')
      setCurrentLocation(location)
      router.refresh()
    } catch (error: any) {
      console.error('Error saving location:', error.message || error)
      setMessage('Gagal menyimpan lokasi: ' + (error.message || 'Unknown error'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Pengaturan</h1>
      <div className="max-w-md bg-white rounded-lg shadow p-6">
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2">
            Lokasi Cuaca
          </label>
          <LocationAutocomplete 
            onLocationSelect={saveLocation}
            initialValue={currentLocation}
          />
          {currentLocation && (
            <p className="mt-2 text-sm text-gray-600">
              Lokasi saat ini: {currentLocation}
            </p>
          )}
        </div>
        
        {saving && (
          <p className="text-blue-500 text-sm">Menyimpan lokasi...</p>
        )}
        {message && (
          <p className={`mt-2 text-sm ${
            message.includes('berhasil') ? 'text-green-500' : 'text-red-500'
          }`}>
            {message}
          </p>
        )}
      </div>
    </div>
  )
} 