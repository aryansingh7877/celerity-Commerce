export type ProductCategory = 'Headphones' | 'Earphones' | 'Laptops' | 'Smartphones' | string;

export type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock';

export type StoreLocation = 'Bangalore' | 'Mumbai' | 'Delhi' | 'Bengaluru' | 'All Locations';

export interface PaymentDiscountOffer {
  id: string;
  method: 'Netbanking' | 'Credit Card' | 'Debit Card / EMI' | 'UPI';
  bankName: string;
  discountPct: number;
  maxDiscountInr: number;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  category: ProductCategory;
  price: number;
  stock: number;
  location: 'Bangalore' | 'Mumbai' | 'Delhi' | 'Bengaluru';
  image: string;
  images?: string[];
  description: string;
  supplierName?: string;
  supplierPhone?: string;
  paymentOffers?: PaymentDiscountOffer[];
  createdAt: string;
  lastUpdated: string;
}

export type MerchantTab = 
  | 'overview'
  | 'inventory'
  | 'products'
  | 'categories'
  | 'stock'
  | 'locations'
  | 'orders'
  | 'deadstock'
  | 'suppliers'
  | 'restock'
  | 'notifications'
  | 'settings';

export interface CategorySummary {
  name: string;
  productCount: number;
  totalStock: number;
  totalValue: number;
  iconName: string;
  accentColor: string;
  bgLight: string;
}

export interface HubLocationSummary {
  city: 'Bangalore' | 'Mumbai' | 'Delhi';
  name: string;
  address: string;
  manager: string;
  phone: string;
  activeSkus: number;
  totalUnits: number;
  status: 'Optimal' | 'Rebalancing' | 'High Demand';
  fulfillmentRate: number;
}
