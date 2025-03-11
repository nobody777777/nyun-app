'use client'
import { createContext, useContext, useState, ReactNode, useEffect } from 'react'
import Popup from './Popup'

type PopupType = 'info' | 'success' | 'warning' | 'error'

interface PopupData {
  id: string
  title: string
  content: ReactNode
  type: PopupType
  autoClose?: number // Durasi dalam milidetik
}

interface PopupContextType {
  showPopup: (title: string, content: ReactNode, type?: PopupType, autoClose?: number) => void
  closePopup: () => void
}

const PopupContext = createContext<PopupContextType>({
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

// Contoh penggunaan:
// 1. Bungkus aplikasi dengan PopupProvider di layout.tsx
// 2. Gunakan usePopup() di komponen manapun untuk menampilkan popup
//
// const { showPopup } = usePopup()
// showPopup('Sukses', 'Data berhasil disimpan', 'success')
// showPopup('Error', 'Terjadi kesalahan', 'error')
// showPopup('Peringatan', 'Apakah Anda yakin?', 'warning')
// showPopup('Info', 'Ini adalah informasi', 'info') 