'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'

interface Location {
  id: string
  city: string
  district: string
  province: string
}

interface Props {
  onLocationSelect: (location: string) => void;
  initialValue?: string;
}

export default function LocationAutocomplete({ _location, onLocationSelect, initialValue = '' }: Props) {
  const [query, setQuery] = useState(initialValue)
  const [suggestions, setSuggestions] = useState<Location[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (initialValue) {
      setQuery(initialValue)
    }
  }, [initialValue])

  useEffect(() => {
    const loadSuggestions = async () => {
      if (query.length < 2) {
        setSuggestions([])
        return
      }

      setIsLoading(true)
      try {
        const { data, error } = await supabase
          .from('indonesia_locations')
          .select('*')
          .ilike('district', `%${query}%`)
          .limit(10)

        if (error) throw error
        setSuggestions(data || [])
      } catch (error) {
        console.error('Error:', error)
      } finally {
        setIsLoading(false)
      }
    }

    const timeoutId = setTimeout(loadSuggestions, 300)
    return () => clearTimeout(timeoutId)
  }, [query])

  // Close suggestions when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setIsOpen(true)
          }}
          onFocus={() => setIsOpen(true)}
          className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Cari kota atau kecamatan..."
        />
        {isLoading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="animate-spin h-5 w-5 border-2 border-blue-500 rounded-full border-t-transparent"></div>
          </div>
        )}
      </div>
      
      {isOpen && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto">
          {suggestions.map((location) => (
            <button
              key={location.id}
              onClick={() => {
                const fullLocation = `${location.district}, ${location.city}, ${location.province}`
                setQuery(fullLocation)
                onLocationSelect(fullLocation)
                setIsOpen(false)
              }}
              className="w-full text-left px-4 py-2 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
            >
              <div className="font-medium">{location.district}</div>
              <div className="text-sm text-gray-600">
                {location.city}, {location.province}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
} 