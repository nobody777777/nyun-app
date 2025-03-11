export interface Sale {
  id: string
  date: string
  total_amount: number
  notes?: string
  created_at: string
}

export interface SaleItem {
  id: string
  sale_id: string
  item_name: string
  quantity: number
  price: number
  subtotal: number
}

export interface DailySales {
  date: string
  total: number
} 