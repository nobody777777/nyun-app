'use client'
import { ReactNode } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { Fragment } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { 
  InformationCircleIcon, 
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon 
} from '@heroicons/react/24/solid'

type PopupType = 'info' | 'success' | 'warning' | 'error'

interface PopupProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: ReactNode
  type?: PopupType
}

const typeConfig = {
  info: {
    icon: InformationCircleIcon,
    color: 'text-blue-500',
    bgColor: 'bg-blue-50',
  },
  success: {
    icon: CheckCircleIcon,
    color: 'text-green-500',
    bgColor: 'bg-green-50',
  },
  warning: {
    icon: ExclamationTriangleIcon,
    color: 'text-yellow-500', 
    bgColor: 'bg-yellow-50',
  },
  error: {
    icon: XCircleIcon,
    color: 'text-red-500',
    bgColor: 'bg-red-50',
  },
}

export default function Popup({ isOpen, onClose, title, children, type = 'info' }: PopupProps) {
  const { icon: Icon, color, bgColor } = typeConfig[type]

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className={`w-full max-w-md transform overflow-hidden rounded-2xl ${bgColor} p-6 text-left align-middle shadow-xl transition-all`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center">
                    <Icon className={`h-6 w-6 ${color} mr-3`} />
                    <Dialog.Title
                      as="h3"
                      className="text-lg font-medium leading-6 text-gray-900"
                    >
                      {title}
                    </Dialog.Title>
                  </div>
                  <button
                    type="button"
                    className="rounded-md bg-transparent text-gray-400 hover:text-gray-500 focus:outline-none"
                    onClick={onClose}
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                <div className="mt-4">
                  {children}
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}

/*
INFORMASI PENTING:
------------------
File: Popup.tsx
Fungsi: Komponen UI untuk menampilkan popup/notifikasi

Fitur Penting:
1. Animasi transisi smooth
2. Responsive design
3. Custom icons untuk setiap tipe
4. Keyboard accessibility

Catatan Update:
- Jangan hapus typeConfig karena penting untuk styling
- Transisi harus dipertahankan untuk UX yang baik
- Selalu gunakan Dialog dari @headlessui/react
- Jangan ubah struktur props interface

KETERKAITAN ANTAR FILE:
----------------------
1. src/components/ui/PopupManager.tsx
   - PopupManager menggunakan Popup.tsx untuk menampilkan notifikasi
   - PopupManager mengatur state dan logika, Popup.tsx menangani tampilan
   - Kedua file ini bekerja sama untuk menampilkan notifikasi

2. src/styles/globals.css
   - Berisi styling untuk popup dan animasi
   - Menerapkan animasi fadeIn, fadeOut, scaleIn, scaleOut
   - Terkait dengan tampilan dan transisi popup

3. src/components/ServiceWorkerRegistration.tsx
   - ServiceWorkerRegistration menggunakan Popup melalui PopupManager
   - Menampilkan notifikasi update PWA
   - Terkait dengan fitur update aplikasi

4. src/app/sales/page.tsx, src/app/calculator/page.tsx, dll
   - Hampir semua halaman menggunakan Popup melalui PopupManager
   - Menampilkan notifikasi sukses, error, warning, dll
   - Terkait dengan UX dan feedback pengguna

5. @headlessui/react
   - Popup.tsx menggunakan komponen Dialog dari @headlessui/react
   - Menyediakan aksesibilitas dan interaksi keyboard
   - Terkait dengan implementasi popup yang accessible
*/ 