'use client'
import { useState, useEffect, ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface PopupProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: ReactNode
  type?: 'info' | 'success' | 'warning' | 'error'
}

export default function Popup({ isOpen, onClose, title, children, type = 'info' }: PopupProps) {
  const [isClosing, setIsClosing] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Pastikan komponen hanya dirender di client-side
  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'auto'
    }

    return () => {
      document.body.style.overflow = 'auto'
    }
  }, [isOpen])

  const handleClose = () => {
    setIsClosing(true)
    setTimeout(() => {
      setIsClosing(false)
      onClose()
    }, 300)
  }

  const getTypeStyles = () => {
    switch (type) {
      case 'success':
        return {
          bgColor: 'bg-green-50',
          borderColor: 'border-green-500',
          iconColor: 'text-green-500',
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          )
        }
      case 'warning':
        return {
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-500',
          iconColor: 'text-yellow-500',
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          )
        }
      case 'error':
        return {
          bgColor: 'bg-red-50',
          borderColor: 'border-red-500',
          iconColor: 'text-red-500',
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          )
        }
      default:
        return {
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-500',
          iconColor: 'text-blue-500',
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )
        }
    }
  }

  const { bgColor, borderColor, iconColor, icon } = getTypeStyles()

  if (!mounted || !isOpen) return null

  return createPortal(
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${
        isClosing ? 'animate-fadeOut' : 'animate-fadeIn'
      }`}
    >
      {/* Overlay */}
      <div 
        className={`absolute inset-0 bg-black ${
          isClosing ? 'opacity-0' : 'opacity-50'
        } transition-opacity duration-300`}
        onClick={handleClose}
      />
      
      {/* Popup Content */}
      <div 
        className={`relative w-full max-w-md ${bgColor} rounded-xl shadow-xl border-l-4 ${borderColor} overflow-hidden ${
          isClosing ? 'animate-scaleOut' : 'animate-scaleIn'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <span className={iconColor}>
              {icon}
            </span>
            <h3 className="text-lg font-medium text-gray-900">{title}</h3>
          </div>
          <button 
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-500 focus:outline-none"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Body */}
        <div className="p-4">
          {children}
        </div>
      </div>
    </div>,
    document.body
  )
} 