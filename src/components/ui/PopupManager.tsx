'use client'
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react'
import Popup from './Popup'

type PopupType = 'info' | 'success' | 'warning' | 'error'

interface PopupData {
  id: string
  title: string
  content: ReactNode
  type: PopupType
  autoClose?: number // Durasi dalam milidetik
}

interface _PopupContextType {
  showPopup: (title: string, content: ReactNode, type?: PopupType, autoClose?: number) => void
  closePopup: () => void
}

const PopupContext = createContext<{
  showPopup: (_title: string, _content: React.ReactNode, _type?: PopupType, _autoClose?: number) => void
  closePopup: () => void
}>({
  showPopup: () => {},
  closePopup: () => {}
})

export const usePopup = () => useContext(PopupContext)

export function PopupProvider({ children }: { children: ReactNode }) {
  const [popup, setPopup] = useState<PopupData | null>(null)

  const showPopup = (
    title: string, 
    content: ReactNode, 
    type: PopupType = 'info',
    autoClose?: number
  ) => {
    const id = Math.random().toString(36).substring(2, 9)
    setPopup({ id, title, content, type, autoClose })
  }

  const closePopup = () => {
    setPopup(null)
  }

  useEffect(() => {
    if (popup?.autoClose) {
      const timer = setTimeout(() => {
        closePopup()
      }, popup.autoClose)

      return () => clearTimeout(timer)
    }
  }, [popup])

  return (
    <PopupContext.Provider value={{ showPopup, closePopup }}>
      {children}
      {popup && (
        <Popup
          isOpen={!!popup}
          onClose={closePopup}
          title={popup.title}
          type={popup.type}
        >
          {popup.content}
        </Popup>
      )}
    </PopupContext.Provider>
  )
}

/*
INFORMASI PENTING:
------------------
File: PopupManager.tsx
Fungsi: Manajemen popup dan notifikasi di seluruh aplikasi

Fitur Penting:
1. Context provider untuk popup
2. Auto-close functionality
3. Multiple popup types (info, success, warning, error)
4. Custom styling untuk setiap tipe popup
5. Sistem notifikasi global

Catatan Update:
- Jangan hapus type PopupType karena digunakan di seluruh aplikasi
- AutoClose harus dipertahankan untuk UX yang baik
- Selalu gunakan showPopup dari context untuk konsistensi
- Jangan ubah struktur PopupData interface

KETERKAITAN ANTAR FILE:
----------------------
1. src/components/ui/Popup.tsx
   - Popup.tsx adalah komponen UI yang digunakan oleh PopupManager
   - PopupManager mengatur state dan logika, Popup.tsx menangani tampilan
   - Kedua file ini bekerja sama untuk menampilkan notifikasi

2. src/components/ServiceWorkerRegistration.tsx
   - ServiceWorkerRegistration menggunakan PopupManager untuk notifikasi update
   - Menggunakan usePopup hook untuk menampilkan popup update
   - Terkait dengan fitur update PWA

3. src/components/AppProviders.tsx
   - AppProviders mengimpor dan menggunakan PopupProvider
   - PopupProvider membungkus seluruh aplikasi
   - Memungkinkan akses ke popup dari mana saja di aplikasi

4. src/app/sales/page.tsx, src/app/calculator/page.tsx, dll
   - Hampir semua halaman menggunakan PopupManager
   - Menggunakan usePopup hook untuk menampilkan notifikasi
   - Terkait dengan UX dan feedback pengguna

5. src/styles/globals.css
   - Berisi styling untuk popup dan animasi
   - Terkait dengan tampilan popup
   - Menerapkan animasi dan transisi untuk popup
*/

// Contoh penggunaan:
// 1. Bungkus aplikasi dengan PopupProvider di layout.tsx
// 2. Gunakan usePopup() di komponen manapun untuk menampilkan popup
//
// const { showPopup } = usePopup()
// showPopup('Sukses', 'Data berhasil disimpan', 'success')
// showPopup('Error', 'Terjadi kesalahan', 'error')
// showPopup('Peringatan', 'Apakah Anda yakin?', 'warning')
// showPopup('Info', 'Ini adalah informasi', 'info') 