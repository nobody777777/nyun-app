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

export interface Order {
  id: string
  customer_name: string
  total_amount: number
  completed_at: string
  created_at: string
  notes?: string
  status: string
  order_items: OrderItem[]
}

export interface OrderItem {
  id: string
  menu_item_id: string
  menu_item_name: string
  quantity: number
  price: number
  subtotal: number
}

export interface Category {
  id: string
  name: string
}

export interface MenuItem {
  id: string
  name: string
  price: number
  category_id: string
} 