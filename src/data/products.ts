export interface Product {
  id: string;
  name: string;
  brand: string;
  category: string;
  price: number;
  image: string;
  city: string;
  stock: number;
  inStock: boolean;
  matchScore?: number;
  reason?: string;
  rating: number;
  reviewsCount: number;
}

export interface BasketItem {
  product: Product;
  quantity: number;
  status: 'available' | 'unavailable' | 'rescued';
}

export const INITIAL_BASKET: BasketItem[] = [
  {
    product: {
      id: 'prod-01',
      name: 'Resurrection Aromatique Hand Balm 75ml',
      brand: 'Aēsop',
      category: 'Personal Care',
      price: 35.00,
      image: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=600&q=80',
      city: 'New York',
      stock: 6,
      inStock: true,
      rating: 4.9,
      reviewsCount: 312
    },
    quantity: 1,
    status: 'available'
  },
  {
    product: {
      id: 'prod-02',
      name: 'Yirgacheffe Single-Origin Cold Brew 750ml',
      brand: 'Celerity Reserve',
      category: 'Specialty Beverage',
      price: 18.50,
      image: 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?auto=format&fit=crop&w=600&q=80',
      city: 'New York (Midtown Hub)',
      stock: 0,
      inStock: false,
      rating: 4.95,
      reviewsCount: 184
    },
    quantity: 1,
    status: 'unavailable'
  },
  {
    product: {
      id: 'prod-03',
      name: 'Cast Iron Pour-Over Ceramic Dripper',
      brand: 'Kinto Japan',
      category: 'Kitchenware',
      price: 44.00,
      image: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=600&q=80',
      city: 'New York',
      stock: 12,
      inStock: true,
      rating: 4.8,
      reviewsCount: 96
    },
    quantity: 1,
    status: 'available'
  }
];

export const SMART_ALTERNATIVES: Product[] = [
  {
    id: 'alt-01',
    name: 'Guji Highland Washed Cold Extraction 750ml',
    brand: 'Celerity Reserve',
    category: 'Specialty Beverage',
    price: 19.00,
    image: 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?auto=format&fit=crop&w=600&q=80',
    city: 'New York (Downtown Hub)',
    stock: 14,
    inStock: true,
    matchScore: 98,
    reason: 'Identical floral tasting profile, same volume, local hub 12m away',
    rating: 4.9,
    reviewsCount: 142
  },
  {
    id: 'alt-02',
    name: 'Kyoto Slow Drip Micro-Lot Reserve 700ml',
    brand: 'Kurasu Artisanal',
    category: 'Specialty Beverage',
    price: 18.00,
    image: 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=600&q=80',
    city: 'New York (Midtown Hub)',
    stock: 8,
    inStock: true,
    matchScore: 94,
    reason: 'Matched price point, smooth dark chocolate undertones',
    rating: 4.75,
    reviewsCount: 89
  },
  {
    id: 'alt-03',
    name: 'Organic Cascara Nitro Sparkling Elixir 500ml',
    brand: 'Botanical Craft',
    category: 'Specialty Beverage',
    price: 16.50,
    image: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=600&q=80',
    city: 'New York (Brooklyn Hub)',
    stock: 22,
    inStock: true,
    matchScore: 89,
    reason: 'Popular high-frequency alternative in Manhattan carts',
    rating: 4.8,
    reviewsCount: 204
  }
];

export const SHOWCASE_PRODUCTS: Product[] = [
  {
    id: 'sc-01',
    name: 'Botanical Body Cleanser No. 4',
    brand: 'Austin Botanics',
    category: 'Skincare',
    price: 38.00,
    image: 'https://images.unsplash.com/photo-1608248597359-bb436d4a52fc?auto=format&fit=crop&w=800&q=80',
    city: 'San Francisco',
    stock: 24,
    inStock: true,
    rating: 4.9,
    reviewsCount: 230
  },
  {
    id: 'sc-02',
    name: 'Tactile Ceramic Teapot & Cup Set',
    brand: 'Studio Orenda',
    category: 'Living',
    price: 88.00,
    image: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=800&q=80',
    city: 'Seattle',
    stock: 3,
    inStock: true,
    rating: 5.0,
    reviewsCount: 84
  },
  {
    id: 'sc-03',
    name: 'Single-Origin Ethiopian Gesha Beans 250g',
    brand: 'Origin Coffee Co.',
    category: 'Specialty Beverage',
    price: 26.00,
    image: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?auto=format&fit=crop&w=800&q=80',
    city: 'Chicago',
    stock: 0,
    inStock: false,
    rating: 4.95,
    reviewsCount: 168
  },
  {
    id: 'sc-04',
    name: 'Solid Brass Geometric Desk Lamp',
    brand: 'Lumen Archetype',
    category: 'Lighting',
    price: 145.00,
    image: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=800&q=80',
    city: 'New York',
    stock: 9,
    inStock: true,
    rating: 4.85,
    reviewsCount: 62
  }
];

export const WORKFLOW_STAGES = [
  {
    step: '01',
    name: 'DISCOVER',
    headline: 'Typo-Tolerant Multi-City Search',
    description: 'Instant querying across distributed warehouse nodes. Customers find exact products even with spelling mistakes, automatically partitioned by local delivery perimeter, inventory depth, and live delivery windows.',
    metric: '4.2ms',
    metricLabel: 'Average query response time across 12 cities',
    features: ['Levenshtein n-gram matching', 'City perimeter geofencing', 'Dynamic price bracket filters']
  },
  {
    step: '02',
    name: 'VALIDATE',
    headline: 'Real-Time PostgreSQL Stock Locks',
    description: 'Zero phantom carts. High-concurrency row locking in PostgreSQL validates real shelf availability in milliseconds right before payment authorization, catching split-second inventory collisions.',
    metric: '99.98%',
    metricLabel: 'Checkout inventory accuracy',
    features: ['Optimistic concurrency locking', 'Split-second shelf synchronization', 'Automated reservation release timeouts']
  },
  {
    step: '03',
    name: 'RESCUE',
    headline: 'Autonomous Vector & Price Matching',
    description: 'When stock drops to zero, the engine instantly ranks substitute items based on sensory attributes, volume, price similarity, customer rating, and local fulfillment proximity.',
    metric: '< 45ms',
    metricLabel: 'Alternative generation latency',
    features: ['Category-affinity scoring', 'Price parity protection (±15%)', 'Proximity hub availability lookup']
  },
  {
    step: '04',
    name: 'RECOVER',
    headline: 'Single-Tap Cart Preservation',
    description: 'No broken checkout flows. Replace the missing item with a single tap, keep applied promo codes and shipping details, and proceed directly to payment without abandoning the order.',
    metric: '87.4%',
    metricLabel: 'Rescued basket checkout conversion',
    features: ['One-click inline swap', 'Zero basket abandonment', 'Preserved promotional rules']
  }
];
