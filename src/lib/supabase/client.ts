import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  import.meta.env.NEXT_PUBLIC_SUPABASE_URL ||
  import.meta.env.VITE_SUPABASE_URL ||
  '';

const supabaseAnonKey =
  import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials missing from environment. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  },
});

export interface DatabaseProfile {
  id: string;
  full_name: string | null;
  email: string | null;
  role?: 'customer' | 'admin';
  preferred_city?: string | null;
  email_2fa_enabled?: boolean;
  created_at: string;
  updated_at: string;
}

export interface DatabaseProduct {
  id: string;
  name: string;
  description: string | null;
  category: string;
  price: number;
  image_url: string | null;
  created_at: string;
}

export interface DatabaseStore {
  id: string;
  name: string;
  city: string;
  address: string;
  created_at: string;
}

export interface DatabaseInventory {
  id: string;
  product_id: string;
  store_id: string;
  stock_quantity: number;
  updated_at: string;
}

export interface DatabaseBasket {
  id: string;
  user_id: string;
  status: 'active' | 'rescued' | 'completed' | 'abandoned';
  created_at: string;
  updated_at: string;
}

export interface DatabaseBasketItem {
  id: string;
  basket_id: string;
  product_id: string;
  quantity: number;
  price: number;
  created_at: string;
  product?: DatabaseProduct;
}

export interface DatabaseRescueEvent {
  id: string;
  basket_id: string;
  unavailable_product_id: string;
  replacement_product_id: string;
  status: 'suggested' | 'accepted' | 'rejected' | 'completed';
  created_at: string;
  unavailable_product?: DatabaseProduct;
  replacement_product?: DatabaseProduct;
}
