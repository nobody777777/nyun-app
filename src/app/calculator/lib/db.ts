import { createClient } from '@supabase/supabase-js'
import { ingredients } from '../data/ingredients'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export interface PurchaseItem {
  id: string
  name: string
  quantity: number
  price: number
  total: number
}

export interface PurchaseRecord {
  id: string
  created_at: string
  items: PurchaseItem[]
  total_amount: number
}

export const saveRecord = async (quantities: {[key: string]: number}) => {
  const items = ingredients
    .filter(item => quantities[item.id] > 0)
    .map(item => ({
      id: item.id,
      name: item.name,
      quantity: quantities[item.id],
      price: item.price,
      total: item.price * quantities[item.id]
    }));

  const totalAmount = items.reduce((sum, item) => sum + item.total, 0);

  const { data, error } = await supabase
    .from('purchase_records')
    .insert({
      items,
      total_amount: totalAmount
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const getRecords = async (): Promise<PurchaseRecord[]> => {
  const { data, error } = await supabase
    .from('purchase_records')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
};

export const deleteRecord = async (id: string) => {
  const { error } = await supabase
    .from('purchase_records')
    .delete()
    .eq('id', id);

  if (error) throw error;
};

export const deleteAllRecords = async () => {
  const { error } = await supabase
    .from('purchase_records')
    .delete()
    .neq('id', '');

  if (error) throw error;
}; 