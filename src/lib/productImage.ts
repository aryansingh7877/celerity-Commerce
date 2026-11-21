/** Known broken Unsplash IDs → working replacements */
const BROKEN_IMAGE_FIXES: Record<string, string> = {
  'photo-1525547719571-a2d4ac882e75':
    'https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?auto=format&fit=crop&w=700&q=80',
};

const CATEGORY_FALLBACKS: Record<string, string> = {
  laptops:
    'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=700&q=80',
  headphones:
    'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=700&q=80',
  earphones:
    'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=700&q=80',
  smartphones:
    'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=700&q=80',
  washing:
    'https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?auto=format&fit=crop&w=700&q=80',
  default:
    'https://images.unsplash.com/photo-1603302576837-37561b2e2302?auto=format&fit=crop&w=700&q=80',
};

function categoryKey(category?: string | null): string {
  const c = (category || '').toLowerCase();
  if (c.includes('laptop') || c.includes('notebook') || c.includes('ultrabook')) return 'laptops';
  if (c.includes('headphone') || c.includes('headset')) return 'headphones';
  if (c.includes('earphone') || c.includes('earbuds') || c.includes('airpod')) return 'earphones';
  if (c.includes('phone') || c.includes('mobile') || c.includes('smartphone')) return 'smartphones';
  if (c.includes('wash') || c.includes('laundry')) return 'washing';
  return 'default';
}

export function categoryFallbackImage(category?: string | null): string {
  return CATEGORY_FALLBACKS[categoryKey(category)] || CATEGORY_FALLBACKS.default;
}

/** Normalize merchant/API image URLs; replace empties and known-bad Unsplash IDs. */
export function resolveProductImage(
  src?: string | null,
  category?: string | null
): string {
  const raw = (src || '').trim();
  if (!raw || raw === 'null' || raw === 'undefined') {
    return categoryFallbackImage(category);
  }

  // Truncated / unusable data URLs
  if (raw.startsWith('data:') && raw.length < 80) {
    return categoryFallbackImage(category);
  }

  for (const [brokenId, fixed] of Object.entries(BROKEN_IMAGE_FIXES)) {
    if (raw.includes(brokenId)) return fixed;
  }

  if (raw.startsWith('http://') || raw.startsWith('https://') || raw.startsWith('data:')) {
    return raw;
  }

  // Relative paths from CDN/storage
  if (raw.startsWith('/')) {
    const api =
      import.meta.env.VITE_API_URL ??
      (import.meta.env.PROD ? '' : 'http://127.0.0.1:4000');
    return `${api}${raw}`;
  }

  return categoryFallbackImage(category);
}
