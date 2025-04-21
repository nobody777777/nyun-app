'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'

const SalesChart = dynamic(() => import('./SalesChart'), {
  ssr: false
})

export default function ChartWrapper() {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  if (!isClient) {
    return (
      <div className="animate-pulse h-48 sm:h-64 bg-gray-200 rounded-xl" />
    )
  }

  return <SalesChart />
} 