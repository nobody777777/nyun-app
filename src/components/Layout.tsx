'use client'
import { ReactNode } from 'react'

interface LayoutProps {
  children: ReactNode
}

export default function Layout({ children }: LayoutProps) {
  return (
    <main className="flex-1 min-h-screen bg-gray-50 p-2 sm:p-4 md:p-6 pt-16 overflow-x-hidden">
      {children}
    </main>
  )
} 