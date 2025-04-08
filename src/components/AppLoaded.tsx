'use client'

import { useEffect } from 'react'

export default function AppLoaded() {
  useEffect(() => {
    // Menandai body sebagai loaded setelah aplikasi dimuat
    const handleLoad = () => {
      // Tunggu sedikit untuk transisi yang halus
      setTimeout(() => {
        document.body.classList.add('app-loaded')
      }, 300)
    }

    // Mencegah pull-to-refresh
    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 1) {
        e.preventDefault()
      }
    }

    // Mencegah pinch zoom
    const handleGestureStart = (e: Event) => {
      e.preventDefault()
    }

    // Tambahkan event listeners
    window.addEventListener('load', handleLoad)
    document.addEventListener('touchmove', handleTouchMove, { passive: false })
    document.addEventListener('gesturestart', handleGestureStart)

    // Cleanup event listeners
    return () => {
      window.removeEventListener('load', handleLoad)
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('gesturestart', handleGestureStart)
    }
  }, [])

  return null
} 