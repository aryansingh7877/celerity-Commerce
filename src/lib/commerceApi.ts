import { api } from './api';
import type { Product } from '../types/product';

type ApiProduct = {
  id: string;
  sku: string;
  name: string;
  brand?: string;
  category: string;
  description?: string;
  price: number | string;
  image_url?: string;
  created_at?: string;
  updated_at?: string;
  inventory?: Array<{ city: string; stock: number; storeId?: string }>;
};

function cityUi(city: string): Product['location'] {
  if (city === 'Bengaluru') return 'Bengaluru';
  if (city === 'Mumbai') return 'Mumbai';
  if (city === 'Delhi') return 'Delhi';
  if (city === 'Bangalore') return 'Bangalore';
  return 'Bengaluru';
}

export function mapApiProducts(products: ApiProduct[]): Product[] {
  const out: Product[] = [];
  for (const p of products) {
    const inv = p.inventory || [];
    if (!inv.length) {
      out.push({
        id: p.id,
        sku: p.sku,
        name: p.name,
        category: p.category,
        price: Number(p.price),
        stock: 0,
        location: 'Bengaluru',
        image: p.image_url || '',
        description: p.description || '',
        createdAt: p.created_at || new Date().toISOString(),
        lastUpdated: p.updated_at || new Date().toISOString(),
      });
      continue;
    }
    for (const row of inv) {
      out.push({
        id: `${p.id}:${row.city}`,
        sku: p.sku,
        name: p.name,
        category: p.category,
        price: Number(p.price),
        stock: Number(row.stock),
        location: cityUi(row.city),
        image: p.image_url || '',
        description: p.description || '',
        createdAt: p.created_at || new Date().toISOString(),
        lastUpdated: p.updated_at || new Date().toISOString(),
      });
    }
  }
  return out;
}

export function productUuid(rowId: string) {
  return rowId.includes(':') ? rowId.split(':')[0] : rowId;
}

export async function fetchAdminProducts(): Promise<Product[]> {
  const res = await api<{ products: ApiProduct[] }>('/api/admin/products');
  return mapApiProducts(res.products || []);
}

export async function createAdminProduct(input: Omit<Product, 'id' | 'createdAt' | 'lastUpdated'>) {
  const city = input.location === 'Bangalore' ? 'Bengaluru' : input.location;
  const brandGuess = input.name.split(/\s+/)[0] || '';
  await api('/api/admin/products', {
    method: 'POST',
    body: JSON.stringify({
      sku: input.sku,
      name: input.name,
      brand: brandGuess,
      category: input.category,
      description: input.description,
      price: input.price,
      imageUrl: input.image,
      city,
      stock: input.stock,
    }),
  });
}

export async function adjustAdminStock(rowId: string, location: string, newStock: number) {
  const city = location === 'Bangalore' ? 'Bengaluru' : location;
  await api('/api/admin/inventory', {
    method: 'POST',
    body: JSON.stringify({
      productId: productUuid(rowId),
      city,
      stock: newStock,
    }),
  });
}

export async function deleteAdminProduct(rowId: string) {
  await api(`/api/admin/products/${productUuid(rowId)}`, { method: 'DELETE' });
}

export async function clearAdminCatalog() {
  return api<{ ok: boolean; cleared: number }>('/api/admin/catalog/clear', {
    method: 'POST',
  });
}

export async function updateAdminProduct(product: Product) {
  await api(`/api/admin/products/${productUuid(product.id)}`, {
    method: 'PUT',
    body: JSON.stringify({
      name: product.name,
      category: product.category,
      description: product.description,
      price: product.price,
      imageUrl: product.image,
    }),
  });
  await adjustAdminStock(product.id, product.location, product.stock);
}

export async function importAdminFile(file: File, kind: 'csv' | 'excel') {
  const fd = new FormData();
  fd.append('file', file);
  return api<{ validRows: number; invalidRows: number; errors: Array<{ rowNumber: number; message: string }> }>(
    kind === 'csv' ? '/api/admin/import/csv' : '/api/admin/import/excel',
    { method: 'POST', formData: fd }
  );
}
