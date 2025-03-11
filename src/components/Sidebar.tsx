'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'

export default function Sidebar() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  // Deteksi ukuran layar
  useEffect(() => {
    const checkScreenSize = () => {
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)
      
      // Otomatis sembunyikan sidebar di mobile, tampilkan di desktop
      setIsOpen(!mobile)
    }
    
    // Cek ukuran layar saat komponen dimuat
    checkScreenSize()
    
    // Tambahkan event listener untuk resize
    window.addEventListener('resize', checkScreenSize)
    
    // Cleanup event listener
    return () => window.removeEventListener('resize', checkScreenSize)
  }, [])

  const toggleSidebar = () => {
    setIsOpen(prev => !prev)
  }

  const menuItems = [
    {
      path: '/',
      icon: '📊',
      label: 'Dashboard'
    },
    {
      path: '/sales',
      icon: '📝',
      label: 'Penjualan'
    },
    {
      path: '/calculator',
      icon: '🧮',
      label: 'Kalkulator'
    },
    {
      path: '/settings',
      icon: '⚙️',
      label: 'Pengaturan'
    }
  ]

  return (
    <>
      {/* Tombol Menu - Hanya tampil saat sidebar tertutup atau di mobile */}
      <button 
        onClick={toggleSidebar}
        className={`fixed top-2 left-2 z-50 p-2 bg-blue-600 text-white rounded-md shadow-md transition-all duration-300 ${
          isOpen && !isMobile ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
        aria-label="Toggle Sidebar"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
        </svg>
      </button>

      {/* Sidebar */}
      <aside 
        className={`fixed left-0 top-0 h-screen bg-white shadow-lg transition-all duration-300 ease-in-out z-40 ${
          isOpen ? 'w-64 translate-x-0' : 'w-0 -translate-x-full md:translate-x-0 md:w-0'
        } overflow-hidden`}
      >
        <div className={`h-full w-64 ${isOpen ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}>
          {/* Tombol Tutup di dalam Sidebar */}
          <button 
            onClick={toggleSidebar}
            className="absolute top-2 right-2 p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100 md:hidden"
            aria-label="Close Sidebar"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
          
          {/* Konten Sidebar */}
          <div className="p-2 sm:p-4">
            {/* Logo */}
            <div className="flex items-center gap-2 px-2 mb-6 mt-8">
              <span className="text-2xl">🍞</span>
              <div>
                <h1 className="text-sm sm:text-lg font-bold text-gray-800">DI BUAT OLEH</h1>
                <h1 className="text-sm sm:text-lg font-bold text-gray-800">PROF.RIDWAN</h1>
                <h1 className="text-sm sm:text-lg font-bold text-gray-800">SPD.MPD.DRS</h1>
                <h1 className="text-sm sm:text-lg font-bold text-gray-800">SPBU.RI</h1>
              </div>
            </div>

            {/* Menu */}
            <nav className="space-y-1">
              {menuItems.map(item => (
                <Link
                  key={item.path}
                  href={item.path}
                  onClick={() => isMobile && setIsOpen(false)} // Tutup sidebar saat item menu diklik di mobile
                  className={`
                    flex items-center gap-3 px-3 py-2 rounded-lg
                    transition-all duration-200
                    ${pathname === item.path
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-gray-600 hover:bg-gray-50'
                    }
                  `}
                >
                  <span className="text-xl">{item.icon}</span>
                  <span className="font-medium">{item.label}</span>
                </Link>
              ))}
            </nav>

            {/* Info di bagian bawah */}
            <div className="absolute bottom-4 left-2 right-2 p-3 bg-gray-50 rounded-lg">
              <div className="text-xs sm:text-sm text-gray-600 space-y-2">
                <p className="flex items-center gap-2">
                  <span>📍</span>
                  <span>Desa Plumbon, Indramayu</span>
                </p>
                <p className="flex items-center gap-2">
                  <span>🕒</span>
                  <span>07:00 - 17:00</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </aside>
      
      {/* Overlay untuk menutup sidebar saat klik di luar (khusus mobile) */}
      {isOpen && isMobile && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-30 backdrop-blur-sm"
          onClick={toggleSidebar}
        />
      )}

      {/* Spacer untuk konten utama */}
      <div className={`transition-all duration-300 ${isOpen && !isMobile ? 'md:ml-64' : 'ml-0'}`} />
    </>
  )
} 