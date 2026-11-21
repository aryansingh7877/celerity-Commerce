import { Product as MerchantProduct } from '../types/product';
import type { Product as StorefrontProduct, BasketItem } from '../data/products';

const STORAGE_KEY_PREFIX = 'celerity_merchant_catalog_v2';
const ACTIVE_SCOPE_KEY = 'celerity_active_merchant_scope_v1';
export const CATALOG_UPDATED_EVENT = 'celerity-catalog-updated';

function normalizeScope(scope?: string | null): string {
  const s = (scope || '').trim().toLowerCase();
  if (s) return s;
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem(ACTIVE_SCOPE_KEY);
    if (saved && saved.trim()) return saved.trim().toLowerCase();
  }
  return 'anonymous';
}

function getStorageKey(scope?: string | null): string {
  return `${STORAGE_KEY_PREFIX}:${normalizeScope(scope)}`;
}

export function setActiveMerchantScope(scope?: string | null): void {
  if (typeof window === 'undefined') return;
  const normalized = (scope || '').trim().toLowerCase();
  if (normalized) {
    localStorage.setItem(ACTIVE_SCOPE_KEY, normalized);
  } else {
    localStorage.removeItem(ACTIVE_SCOPE_KEY);
  }
}

function isCorruptedLegacyRow(p: MerchantProduct): boolean {
  const name = (p.name || '').trim();
  const desc = (p.description || '').trim();
  if (/^(average\s*\/?\s*total|note:\s*columns|sku_id)$/i.test(name)) return true;
  if (/^wm-\d+$/i.test(name) && /imported via document/i.test(desc)) return true;
  return false;
}

export function loadCatalog(scope?: string | null): MerchantProduct[] {
  if (typeof window === 'undefined') return [];
  try {
    if (scope) setActiveMerchantScope(scope);
    const key = getStorageKey(scope);
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const valid = parsed.filter(
      (p) => p && typeof p.id === 'string' && typeof p.name === 'string' && !isCorruptedLegacyRow(p)
    ) as MerchantProduct[];
    if (valid.length !== parsed.length) {
      localStorage.setItem(key, JSON.stringify(valid));
    }
    return valid;
  } catch {
    return [];
  }
}

export function saveCatalog(
  products: MerchantProduct[],
  scope?: string | null
): { ok: boolean; error?: string } {
  if (typeof window === 'undefined') return { ok: false, error: 'No window' };
  try {
    if (scope) setActiveMerchantScope(scope);
    const key = getStorageKey(scope);
    localStorage.setItem(key, JSON.stringify(products));
    window.dispatchEvent(new Event(CATALOG_UPDATED_EVENT));
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error:
        (err as Error).name === 'QuotaExceededError'
          ? 'Browser storage is full. Import fewer products or smaller images.'
          : (err as Error).message,
    };
  }
}

export function clearCatalog(scope?: string | null): void {
  if (typeof window === 'undefined') return;
  const key = getStorageKey(scope);
  localStorage.removeItem(key);
  window.dispatchEvent(new Event(CATALOG_UPDATED_EVENT));
}

/** Map merchant inventory → storefront/demo product shape (admin upload only). */
export function toStorefrontProduct(p: MerchantProduct): StorefrontProduct {
  const brandGuess =
    p.name.split(/\s+/).slice(0, 1)[0] ||
    p.sku.split('-')[0] ||
    p.category ||
    'Celerity';

  return {
    id: p.id,
    name: p.name,
    brand: brandGuess,
    category: p.category,
    price: p.price,
    image: p.image,
    city: p.location,
    stock: p.stock,
    inStock: p.stock > 0,
    rating: 4.8,
    reviewsCount: Math.max(8, p.stock * 2),
  };
}

export function loadStorefrontCatalog(): StorefrontProduct[] {
  return loadCatalog().map(toStorefrontProduct);
}

/** Build a live basket + alternatives from admin catalog for Smart Basket Rescue. */
export function buildLiveBasketFromCatalog(): {
  basket: BasketItem[];
  alternatives: StorefrontProduct[];
} {
  const catalog = loadStorefrontCatalog();
  if (catalog.length === 0) {
    return { basket: [], alternatives: [] };
  }

  const primary = catalog.filter((p) => p.inStock).slice(0, 2);
  const oosCandidate =
    catalog.find((p) => !p.inStock) ||
    (catalog.length > 2
      ? { ...catalog[2], stock: 0, inStock: false }
      : null);

  const basket: BasketItem[] = [
    ...primary.map((product) => ({
      product,
      quantity: 1 as const,
      status: 'available' as const,
    })),
  ];

  if (oosCandidate) {
    basket.push({
      product: { ...oosCandidate, stock: 0, inStock: false },
      quantity: 1,
      status: 'unavailable',
    });
  }

  const unavailableId = oosCandidate?.id;
  const alternatives = catalog
    .filter((p) => p.inStock && p.id !== unavailableId)
    .filter((p) =>
      oosCandidate ? p.category === oosCandidate.category || true : true
    )
    .slice(0, 4)
    .map((p, idx) => ({
      ...p,
      matchScore: Math.max(86, 98 - idx * 3),
      reason:
        p.category === oosCandidate?.category
          ? 'Same category · in stock at your hub'
          : 'Nearby hub · price-compatible swap',
    }));

  return { basket, alternatives };
}
