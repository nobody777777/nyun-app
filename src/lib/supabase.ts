'use client'

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true
  }
})

/*
INFORMASI PENTING:
------------------
File: lib/supabase.ts
Fungsi: Konfigurasi dan fungsi Supabase

Fitur Penting:
1. Konfigurasi client
2. Fungsi fetch data
3. Error handling
4. Type safety
5. Data validation

Catatan Update:
- Jangan hapus konfigurasi
- Pertahankan fungsi fetch
- Selalu gunakan error handling
- Jangan ubah struktur client

KETERKAITAN ANTAR FILE:
----------------------
1. src/contexts/SalesContext.tsx
   - Menggunakan client
   - Terkait dengan data
   - Mempengaruhi context

2. src/app/dashboard/page.tsx
   - Tidak langsung terkait
   - Terkait dengan tampilan
   - Mempengaruhi data penjualan

3. src/components/charts/SalesChart.tsx
   - Tidak langsung terkait
   - Terkait dengan visualisasi
   - Mempengaruhi data grafik

4. src/app/calculator/page.tsx
   - Tidak langsung terkait
   - Terkait dengan fitur kalkulator
   - Mempengaruhi data penjualan

5. src/styles/dashboard.css
   - Tidak langsung terkait
   - Terkait dengan styling
   - Mempengaruhi UI/UX
*/
