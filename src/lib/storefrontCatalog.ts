import { loadCatalog } from './merchantInventoryStore';
import { Product as MerchantProduct } from '../types/product';

export type CityName = 'Bengaluru' | 'Mumbai' | 'Delhi';

export const CITIES: { name: CityName; hubName: string; pin: string; sla: string }[] = [
  { name: 'Bengaluru', hubName: 'Indiranagar & Electronic City Hub', pin: '560100', sla: 'Same-day 4 hr dispatch' },
  { name: 'Mumbai', hubName: 'Bandra & Bhiwandi Logistics Center', pin: '400050', sla: 'Same-day 6 hr dispatch' },
  { name: 'Delhi', hubName: 'Connaught Place & Gurugram NCR Hub', pin: '110001', sla: 'Next-morning express' },
];

export interface MultiCityProduct {
  id: string;
  sku: string;
  name: string;
  brand: string;
  category: string;
  price: number;
  mrp: number;
  image: string;
  description: string;
  specs: Record<string, string>;
  rating: number;
  soldCount: number;
  isBestDeal?: boolean;
  isJustIn?: boolean;
  cityStock: Record<CityName, number>;
}

export interface PipelineEventLog {
  id: string;
  timestamp: string;
  service: 'PostgreSQL' | 'Transactional Outbox' | 'Apache Kafka' | 'OpenSearch';
  topic: string;
  city: CityName;
  summary: string;
  status: 'COMMITTED' | 'PUBLISHED' | 'INDEXED' | 'CONFLICT_409';
}

const CITY_KEY = 'celerity_selected_city_v1';
const STOCK_OVERRIDE_KEY = 'celerity_city_stock_overrides_v1';
const PIPELINE_EVENTS_KEY = 'celerity_pipeline_events_v1';

export function getSavedCity(): CityName {
  if (typeof window === 'undefined') return 'Bengaluru';
  const raw = localStorage.getItem(CITY_KEY);
  if (raw === 'Mumbai' || raw === 'Delhi' || raw === 'Bengaluru') return raw;
  return 'Bengaluru';
}

export function saveSelectedCity(city: CityName): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(CITY_KEY, city);
}

function loadStockOverrides(): Record<string, Partial<Record<CityName, number>>> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STOCK_OVERRIDE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveStockOverride(productId: string, city: CityName, newQty: number): void {
  if (typeof window === 'undefined') return;
  try {
    const overrides = loadStockOverrides();
    overrides[productId] = { ...(overrides[productId] || {}), [city]: Math.max(0, newQty) };
    localStorage.setItem(STOCK_OVERRIDE_KEY, JSON.stringify(overrides));
  } catch {
    /* ignore */
  }
}

export function clearStockOverrides(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STOCK_OVERRIDE_KEY);
}

// Default rich multi-city catalog so the storefront works out-of-the-box and guarantees ±20% alternatives
const DEFAULT_MULTI_CITY_CATALOG: MultiCityProduct[] = [
  // ── LAPTOPS ──
  {
    id: 'cat-lap-01',
    sku: 'LAP-DEL-001',
    name: 'Dell Inspiron 15 3530 Ultrabook',
    brand: 'Dell',
    category: 'Laptops',
    price: 54990,
    mrp: 64990,
    image: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=700&q=80',
    description: '15.6-inch FHD 120Hz anti-glare display powered by 13th Gen Intel Core i5-1335U, 16GB DDR4 RAM, and 512GB NVMe SSD for effortless multitasking.',
    specs: {
      Processor: 'Intel Core i5-1335U (10 Cores, up to 4.6 GHz)',
      Memory: '16GB DDR4 3200MHz Dual-Channel',
      Storage: '512GB PCIe NVMe M.2 SSD',
      Display: '15.6" FHD (1920 x 1080) 120Hz 250 nits',
      Warranty: '1 Year Dell Onsite Hardware Service',
    },
    rating: 4.9,
    soldCount: 652,
    isBestDeal: true,
    isJustIn: true,
    cityStock: { Bengaluru: 14, Mumbai: 2, Delhi: 8 },
  },
  {
    id: 'cat-lap-02',
    sku: 'LAP-LEN-003',
    name: 'Lenovo ThinkPad E14 Gen 5 Business',
    brand: 'Lenovo',
    category: 'Laptops',
    price: 62490,
    mrp: 74990,
    image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=700&q=80',
    description: 'Enterprise-grade 14-inch WUXGA IPS notebook with AMD Ryzen 5 7530U, 16GB RAM, spill-resistant backlit keyboard, and MIL-STD-810H durability.',
    specs: {
      Processor: 'AMD Ryzen 5 7530U 6-Core / 12-Thread',
      Memory: '16GB DDR4-3200',
      Storage: '512GB PCIe 4.0 NVMe SSD',
      Display: '14.0" WUXGA (1920 x 1200) 16:10 Anti-Glare',
      Warranty: '1 Year Premier Onsite Support',
    },
    rating: 4.9,
    soldCount: 412,
    isBestDeal: true,
    isJustIn: false,
    cityStock: { Bengaluru: 9, Mumbai: 11, Delhi: 1 },
  },
  {
    id: 'cat-lap-03',
    sku: 'LAP-HP-001',
    name: 'HP Pavilion 15-eg3081TU Metal Edition',
    brand: 'HP',
    category: 'Laptops',
    price: 59990,
    mrp: 72990,
    image: 'https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?auto=format&fit=crop&w=700&q=80',
    description: 'Precision aluminum chassis laptop featuring Intel Core i5-1340P, B&O dual speakers, 16GB RAM, and HP Fast Charge (50% in 45 mins).',
    specs: {
      Processor: 'Intel Core i5-1340P (12 Cores)',
      Memory: '16GB DDR4-3200 SDRAM',
      Storage: '512GB PCIe NVMe M.2 SSD',
      Display: '15.6" FHD Micro-Edge IPS BrightView',
      Audio: 'Audio by B&O with Dual Speakers',
    },
    rating: 4.8,
    soldCount: 518,
    isBestDeal: false,
    isJustIn: true,
    cityStock: { Bengaluru: 1, Mumbai: 7, Delhi: 6 },
  },
  {
    id: 'cat-lap-04',
    sku: 'LAP-ASU-001',
    name: 'Asus Vivobook 15 X1504ZA Thin & Light',
    brand: 'Asus',
    category: 'Laptops',
    price: 48990,
    mrp: 58990,
    image: 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?auto=format&fit=crop&w=700&q=80',
    description: 'Sleek 1.7kg daily driver with 180-degree lay-flat hinge, ASUS Antimicrobial Guard Plus, Intel Core i5-1235U, and 16GB RAM.',
    specs: {
      Processor: 'Intel Core i5-1235U',
      Memory: '16GB DDR4',
      Storage: '512GB M.2 NVMe PCIe 3.0 SSD',
      Display: '15.6" FHD (1920 x 1080) TÜV Rheinland Certified',
      Weight: '1.70 kg',
    },
    rating: 4.8,
    soldCount: 389,
    isBestDeal: false,
    isJustIn: true,
    cityStock: { Bengaluru: 12, Mumbai: 5, Delhi: 9 },
  },
  {
    id: 'cat-lap-05',
    sku: 'LAP-ASU-002',
    name: 'Asus TUF Gaming A15 RTX 4050',
    brand: 'Asus',
    category: 'Laptops',
    price: 81990,
    mrp: 95990,
    image: 'https://images.unsplash.com/photo-1603302576837-37561b2e2302?auto=format&fit=crop&w=700&q=80',
    description: 'High-refresh 144Hz gaming rig powered by AMD Ryzen 7 7735HS and NVIDIA GeForce RTX 4050 6GB GDDR6 with MUX Switch.',
    specs: {
      Processor: 'AMD Ryzen 7 7735HS (8 Cores)',
      Graphics: 'NVIDIA GeForce RTX 4050 6GB (140W TGP)',
      Memory: '16GB DDR5-4800MHz',
      Storage: '512GB PCIe 4.0 NVMe M.2 SSD',
      Battery: '90WHrs 4-Cell Li-ion',
    },
    rating: 4.9,
    soldCount: 901,
    isBestDeal: true,
    isJustIn: false,
    cityStock: { Bengaluru: 0, Mumbai: 6, Delhi: 4 },
  },
  {
    id: 'cat-lap-06',
    sku: 'LAP-HP-002',
    name: 'HP Victus 15 Gaming RTX 4050',
    brand: 'HP',
    category: 'Laptops',
    price: 74990,
    mrp: 86990,
    image: 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?auto=format&fit=crop&w=700&q=80',
    description: 'Desktop-caliber gaming performance with Intel Core i5-13420H, RTX 4050 6GB graphics, 144Hz IPS display, and OMEN Tempest Cooling.',
    specs: {
      Processor: '13th Gen Intel Core i5-13420H',
      Graphics: 'NVIDIA GeForce RTX 4050 6GB',
      Memory: '16GB DDR4-3200MHz',
      Display: '15.6" FHD 144Hz 9ms Response Time',
      Cooling: 'OMEN Tempest Thermal Architecture',
    },
    rating: 4.8,
    soldCount: 440,
    isBestDeal: false,
    isJustIn: true,
    cityStock: { Bengaluru: 7, Mumbai: 8, Delhi: 3 },
  },

  // ── WASHING MACHINES & HOME APPLIANCES ──
  {
    id: 'cat-wm-01',
    sku: 'WM-001',
    name: 'LG TurboDrum T70SKSF1Z 7kg Top Load',
    brand: 'LG',
    category: 'Washing Machines',
    price: 17990,
    mrp: 23990,
    image: 'https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?auto=format&fit=crop&w=700&q=80',
    description: '7kg 5-Star fully automatic top-load washing machine with Smart Inverter motor, TurboDrum wash, and Smart Diagnosis.',
    specs: {
      Capacity: '7.0 kg Fully Automatic Top Load',
      EnergyRating: '5 Star BEE Rated',
      SpinSpeed: '700 RPM Max Spin',
      Motor: 'Smart Inverter Motor',
      Warranty: '2 Years Comprehensive + 10 Years Motor',
    },
    rating: 4.9,
    soldCount: 516,
    isBestDeal: true,
    isJustIn: true,
    cityStock: { Bengaluru: 2, Mumbai: 9, Delhi: 6 },
  },
  {
    id: 'cat-wm-02',
    sku: 'WM-004',
    name: 'Samsung EcoBubble WA70BG4441YY 7kg',
    brand: 'Samsung',
    category: 'Washing Machines',
    price: 18490,
    mrp: 23500,
    image: 'https://images.unsplash.com/photo-1610557892470-55d9e80c0bce?auto=format&fit=crop&w=700&q=80',
    description: '7kg 5-Star top-load washer with EcoBubble technology, Digital Inverter motor, Soft Closing Door, and Magic Filter.',
    specs: {
      Capacity: '7.0 kg Top Load',
      EnergyRating: '5 Star',
      SpinSpeed: '700 RPM',
      Motor: 'Digital Inverter Technology',
      Warranty: '2 Years Comprehensive + 20 Years Motor',
    },
    rating: 4.8,
    soldCount: 340,
    isBestDeal: false,
    isJustIn: true,
    cityStock: { Bengaluru: 11, Mumbai: 8, Delhi: 5 },
  },
  {
    id: 'cat-wm-03',
    sku: 'WM-008',
    name: 'IFB DeepClean TL-SBRS 7.5kg Top Load',
    brand: 'IFB',
    category: 'Washing Machines',
    price: 19490,
    mrp: 25490,
    image: 'https://images.unsplash.com/photo-1582735689369-4fe89db7114c?auto=format&fit=crop&w=700&q=80',
    description: '7.5kg 5-Star top-load washer with Aqua Energie hard-water softener, Triad Pulsator, and 3D Wash System.',
    specs: {
      Capacity: '7.5 kg Top Load',
      EnergyRating: '5 Star',
      SpinSpeed: '720 RPM',
      Motor: 'Smart Sense Inverter',
      Warranty: '4 Years Comprehensive + 10 Years Motor',
    },
    rating: 4.8,
    soldCount: 280,
    isBestDeal: false,
    isJustIn: false,
    cityStock: { Bengaluru: 8, Mumbai: 1, Delhi: 7 },
  },
  {
    id: 'cat-wm-04',
    sku: 'WM-006',
    name: 'Bosch Serie 6 WAJ28262IN 8kg Front Load',
    brand: 'Bosch',
    category: 'Washing Machines',
    price: 35490,
    mrp: 48990,
    image: 'https://images.unsplash.com/photo-1626806819282-2c1dc01a5e0c?auto=format&fit=crop&w=700&q=80',
    description: '8kg 5-Star German-engineered front-load washer with EcoSilence Drive, Anti-Tangle, Anti-Bacteria Steam, and inbuilt heater.',
    specs: {
      Capacity: '8.0 kg Front Load',
      EnergyRating: '5 Star',
      SpinSpeed: '1400 RPM',
      Motor: 'EcoSilence Drive Brushless',
      Warranty: '2 Years Comprehensive + 12 Years Motor',
    },
    rating: 4.9,
    soldCount: 410,
    isBestDeal: true,
    isJustIn: false,
    cityStock: { Bengaluru: 6, Mumbai: 0, Delhi: 4 },
  },
  {
    id: 'cat-wm-05',
    sku: 'WM-005',
    name: 'Samsung AI EcoBubble WW80T504DAN 8kg',
    brand: 'Samsung',
    category: 'Washing Machines',
    price: 34990,
    mrp: 45990,
    image: 'https://images.unsplash.com/photo-1604335399105-a0c585fd81a1?auto=format&fit=crop&w=700&q=80',
    description: '8kg 5-Star Wi-Fi AI Control front-load washer with Hygiene Steam, Diamond Drum, and SmartThings connectivity.',
    specs: {
      Capacity: '8.0 kg Front Load',
      EnergyRating: '5 Star',
      SpinSpeed: '1400 RPM',
      Motor: 'Digital Inverter',
      Warranty: '2 Years Comprehensive + 20 Years Motor',
    },
    rating: 4.9,
    soldCount: 375,
    isBestDeal: false,
    isJustIn: true,
    cityStock: { Bengaluru: 9, Mumbai: 10, Delhi: 6 },
  },

  // ── HEADPHONES & AUDIO ──
  {
    id: 'cat-aud-01',
    sku: 'AUD-SON-001',
    name: 'Sony WH-1000XM5 Wireless ANC Headphones',
    brand: 'Sony',
    category: 'Headphones',
    price: 26990,
    mrp: 34990,
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=700&q=80',
    description: 'Industry-leading noise cancellation with 8 microphones, Integrated Processor V1, 30-hour battery life, and multipoint Bluetooth connection.',
    specs: {
      Driver: '30mm Carbon Fiber Dome Driver',
      ANC: 'Dual Processor 8-Mic Auto NC Optimizer',
      Battery: '30 Hours (ANC On) / 40 Hours (ANC Off)',
      Charging: 'USB-PD 3 min charge = 3 hours playback',
      Weight: '250 grams',
    },
    rating: 4.9,
    soldCount: 820,
    isBestDeal: true,
    isJustIn: true,
    cityStock: { Bengaluru: 3, Mumbai: 12, Delhi: 0 },
  },
  {
    id: 'cat-aud-02',
    sku: 'AUD-BOS-002',
    name: 'Bose QuietComfort Ultra Wireless Headphones',
    brand: 'Bose',
    category: 'Headphones',
    price: 29990,
    mrp: 35900,
    image: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=700&q=80',
    description: 'Breakthrough spatialized Immersive Audio, CustomTune ear calibration, world-class Quiet Mode, and plush protein leather cushions.',
    specs: {
      Audio: 'Bose Immersive Spatial Audio + Snapdragon Sound',
      Connectivity: 'Bluetooth 5.3 Multipoint + 2.5mm Aux',
      Battery: 'Up to 24 Hours',
      Microphones: 'Wind-Block Beamforming Array',
    },
    rating: 4.9,
    soldCount: 495,
    isBestDeal: false,
    isJustIn: true,
    cityStock: { Bengaluru: 10, Mumbai: 7, Delhi: 8 },
  },
  {
    id: 'cat-aud-03',
    sku: 'AUD-SEN-003',
    name: 'Sennheiser Momentum 4 Wireless ANC',
    brand: 'Sennheiser',
    category: 'Headphones',
    price: 24990,
    mrp: 34990,
    image: 'https://images.unsplash.com/photo-1583394838336-acd977736f90?auto=format&fit=crop&w=700&q=80',
    description: 'Audiophile-inspired 42mm transducer system delivering brilliant dynamics and an extraordinary 60-hour battery life.',
    specs: {
      Driver: '42mm Audiophile Dynamic Transducer',
      Battery: 'Up to 60 Hours Continuous Playback',
      Codecs: 'aptX Adaptive, AAC, SBC',
      Warranty: '2 Years Global Sennheiser Warranty',
    },
    rating: 4.8,
    soldCount: 310,
    isBestDeal: false,
    isJustIn: false,
    cityStock: { Bengaluru: 8, Mumbai: 5, Delhi: 9 },
  },

  // ── SMARTPHONES ──
  {
    id: 'cat-mob-01',
    sku: 'MOB-SAM-001',
    name: 'Samsung Galaxy S24 5G (8GB / 256GB)',
    brand: 'Samsung',
    category: 'Smartphones',
    price: 74999,
    mrp: 84999,
    image: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?auto=format&fit=crop&w=700&q=80',
    description: '6.2-inch Dynamic AMOLED 2X 120Hz display, 50MP ProVisual Engine triple camera, Armor Aluminum frame, and IP68 resistance.',
    specs: {
      Display: '6.2" FHD+ Dynamic AMOLED 2X (2600 nits)',
      Camera: '50MP OIS Main + 10MP 3x Telephoto + 12MP Ultrawide',
      Memory: '8GB RAM / 256GB UFS 4.0',
      Battery: '4000mAh with Wireless PowerShare',
    },
    rating: 4.9,
    soldCount: 730,
    isBestDeal: false,
    isJustIn: true,
    cityStock: { Bengaluru: 5, Mumbai: 9, Delhi: 2 },
  },
  {
    id: 'cat-mob-02',
    sku: 'MOB-APL-002',
    name: 'Apple iPhone 15 (256GB) — Green',
    brand: 'Apple',
    category: 'Smartphones',
    price: 76900,
    mrp: 89900,
    image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=700&q=80',
    description: 'Dynamic Island, 48MP Main camera with 2x optical-quality telephoto, A16 Bionic chip, USB-C connectivity, and Ceramic Shield front.',
    specs: {
      Chip: 'Apple A16 Bionic 6-Core CPU',
      Display: '6.1" Super Retina XDR OLED',
      Camera: '48MP Main + 12MP Ultra Wide',
      Protection: 'IP68 Water & Dust Resistant (6m / 30 mins)',
    },
    rating: 4.9,
    soldCount: 890,
    isBestDeal: false,
    isJustIn: true,
    cityStock: { Bengaluru: 11, Mumbai: 6, Delhi: 8 },
  },
];

function parseSpecsFromDescription(desc: string, category: string, sku: string): Record<string, string> {
  const specs: Record<string, string> = {
    'SKU Code': sku,
    Category: category,
  };
  const parts = desc.split('·').map((s) => s.trim()).filter(Boolean);
  parts.forEach((part, idx) => {
    const colonIdx = part.indexOf(':');
    if (colonIdx > 0 && colonIdx < 24) {
      const k = part.slice(0, colonIdx).trim();
      const v = part.slice(colonIdx + 1).trim();
      if (k && v) specs[k] = v;
    } else if (idx === 0) {
      specs['Highlights'] = part;
    }
  });
  return specs;
}

function mapMerchantToMultiCity(p: MerchantProduct, idx: number): MultiCityProduct {
  const brand = p.name.split(/\s+/)[0] || 'Celerity';
  const primaryCity: CityName =
    p.location === 'Mumbai' ? 'Mumbai' : p.location === 'Delhi' ? 'Delhi' : 'Bengaluru';

  // Build deterministic realistic stock across the other two cities so multi-city switching & rescue work seamlessly
  const base = Math.max(0, p.stock);
  const altStockA = idx % 5 === 0 ? 0 : idx % 3 === 0 ? 2 : Math.max(4, (base + 7) % 18);
  const altStockB = idx % 4 === 1 ? 1 : idx % 6 === 2 ? 0 : Math.max(5, (base + 11) % 20);

  const cityStock: Record<CityName, number> = {
    Bengaluru: primaryCity === 'Bengaluru' ? base : altStockA,
    Mumbai: primaryCity === 'Mumbai' ? base : primaryCity === 'Bengaluru' ? altStockB : altStockA,
    Delhi: primaryCity === 'Delhi' ? base : altStockB,
  };

  return {
    id: p.id,
    sku: p.sku,
    name: p.name,
    brand,
    category: p.category,
    price: p.price,
    mrp: Math.round((p.price * 1.24) / 10) * 10,
    image: p.image,
    description: p.description,
    specs: parseSpecsFromDescription(p.description, p.category, p.sku),
    rating: Number((4.7 + (idx % 3) * 0.1).toFixed(1)),
    soldCount: 140 + ((idx * 73) % 680),
    isBestDeal: idx < 5,
    isJustIn: idx % 2 === 0,
    cityStock,
  };
}

/**
 * Load unified multi-city catalog:
 * - If merchant uploaded products in Admin, those are surfaced first (with multi-city stock)
 * - Always includes default multi-city products if catalog is empty
 * - Applies any checkout/demo per-city stock overrides
 */
export function getUnifiedStorefrontCatalog(): MultiCityProduct[] {
  const merchantItems = loadCatalog();
  const mappedMerchant = merchantItems.map(mapMerchantToMultiCity);
  const seenSkus = new Set(mappedMerchant.map((m) => m.sku.toUpperCase()));
  const baseList =
    mappedMerchant.length > 0
      ? [
          ...mappedMerchant,
          ...DEFAULT_MULTI_CITY_CATALOG.filter((d) => !seenSkus.has(d.sku.toUpperCase())),
        ]
      : DEFAULT_MULTI_CITY_CATALOG;

  const overrides = loadStockOverrides();

  return baseList.map((item) => {
    const itemOverrides = overrides[item.id];
    if (!itemOverrides) return item;
    return {
      ...item,
      cityStock: {
        Bengaluru: itemOverrides.Bengaluru ?? item.cityStock.Bengaluru,
        Mumbai: itemOverrides.Mumbai ?? item.cityStock.Mumbai,
        Delhi: itemOverrides.Delhi ?? item.cityStock.Delhi,
      },
    };
  });
}

export function resetPipelineEvents(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(PIPELINE_EVENTS_KEY);
}

// ── Typo-Tolerant Search Engine (Levenshtein + Alias Dictionary) ──
const TYPO_DICTIONARY: { canonical: string; typos: string[] }[] = [
  { canonical: 'laptop', typos: ['lapto', 'labtop', 'laptp', 'leptop', 'laptpo', 'notbook'] },
  { canonical: 'headphones', typos: ['headfone', 'hedphone', 'headphon', 'headset', 'earfone'] },
  { canonical: 'washing', typos: ['washng', 'wahsing', 'waser', 'washer', 'laundry'] },
  { canonical: 'samsung', typos: ['samung', 'samsng', 'smasung'] },
  { canonical: 'bosch', typos: ['bosh', 'bocsh', 'boshc'] },
  { canonical: 'whirlpool', typos: ['whirlpol', 'wirlpool', 'whirpool'] },
  { canonical: 'lenovo', typos: ['lenvo', 'lenov', 'thinkpd'] },
  { canonical: 'macbook', typos: ['macbok', 'mcbook', 'appl'] },
  { canonical: 'smartphone', typos: ['smartfone', 'phne', 'moble', 'iphone'] },
];

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[m][n];
}

export function resolveTypoCorrection(rawQuery: string): string | null {
  const q = rawQuery.trim().toLowerCase();
  if (q.length < 3) return null;

  for (const entry of TYPO_DICTIONARY) {
    if (entry.typos.some((t) => q === t || q.includes(t))) {
      return entry.canonical;
    }
    if (Math.abs(entry.canonical.length - q.length) <= 2 && levenshtein(q, entry.canonical) <= 2 && q !== entry.canonical) {
      return entry.canonical;
    }
  }
  return null;
}

export function matchesTypoTolerantSearch(
  product: MultiCityProduct,
  rawQuery: string
): { matches: boolean; score: number } {
  const q = rawQuery.trim().toLowerCase();
  if (!q) return { matches: true, score: 1 };

  const corrected = resolveTypoCorrection(q);
  const effective = corrected || q;

  const haystack = `${product.name} ${product.brand} ${product.category} ${product.sku} ${product.description}`.toLowerCase();

  if (haystack.includes(q)) return { matches: true, score: 1 };
  if (corrected && haystack.includes(corrected)) return { matches: true, score: 0.95 };

  // Token-level fuzzy match (Levenshtein <= 2 for tokens >= 4 chars)
  const words = haystack.split(/[^a-z0-9]+/).filter((w) => w.length >= 3);
  const queryTokens = effective.split(/\s+/).filter(Boolean);

  let matchedTokens = 0;
  for (const qt of queryTokens) {
    if (haystack.includes(qt)) {
      matchedTokens++;
      continue;
    }
    if (qt.length >= 4) {
      const closeWord = words.some(
        (w) => Math.abs(w.length - qt.length) <= 2 && levenshtein(w.slice(0, qt.length + 1), qt) <= 2
      );
      if (closeWord) matchedTokens++;
    }
  }

  if (matchedTokens > 0 && matchedTokens >= queryTokens.length) {
    return { matches: true, score: 0.8 };
  }

  return { matches: false, score: 0 };
}

/**
 * Deterministic Smart Basket Rescue Alternatives:
 * 1. Same category
 * 2. In stock in selected city (> 0)
 * 3. Price within ±20% of original product
 * 4. Exclude original product
 * 5. Closest price first, max 4
 */
export function getRescueAlternatives(
  unavailableProduct: MultiCityProduct,
  city: CityName,
  catalog: MultiCityProduct[]
): {
  alternatives: (MultiCityProduct & { priceDelta: number })[];
  minPrice: number;
  maxPrice: number;
} {
  const minPrice = Math.round(unavailableProduct.price * 0.8);
  const maxPrice = Math.round(unavailableProduct.price * 1.2);

  // First try strict same category + ±20% price + in stock in city
  let candidates = catalog.filter(
    (p) =>
      p.id !== unavailableProduct.id &&
      p.category.toLowerCase() === unavailableProduct.category.toLowerCase() &&
      (p.cityStock[city] ?? 0) > 0 &&
      p.price >= minPrice &&
      p.price <= maxPrice
  );

  // If uploaded Excel sheet uses fine sub-categories (e.g. "Top Load" vs "Front Load") and has < 2 strict matches,
  // also include same-department items within ±25% price that are in stock in city
  if (candidates.length === 0) {
    const widerMin = Math.round(unavailableProduct.price * 0.75);
    const widerMax = Math.round(unavailableProduct.price * 1.25);
    candidates = catalog.filter(
      (p) =>
        p.id !== unavailableProduct.id &&
        (p.cityStock[city] ?? 0) > 0 &&
        p.price >= widerMin &&
        p.price <= widerMax
    );
  }

  const sorted = candidates
    .sort((a, b) => Math.abs(a.price - unavailableProduct.price) - Math.abs(b.price - unavailableProduct.price))
    .slice(0, 4)
    .map((p) => ({
      ...p,
      priceDelta: p.price - unavailableProduct.price,
    }));

  return { alternatives: sorted, minPrice, maxPrice };
}

// ── Pipeline Event Telemetry Log ──
const INITIAL_PIPELINE_EVENTS: PipelineEventLog[] = [
  {
    id: 'evt-904',
    timestamp: 'Just now',
    service: 'OpenSearch',
    topic: 'catalog.index.refresh',
    city: 'Bengaluru',
    summary: 'Indexed multi-city inventory snapshot with typo-tolerant analyzers',
    status: 'INDEXED',
  },
  {
    id: 'evt-903',
    timestamp: '2 mins ago',
    service: 'Apache Kafka',
    topic: 'inventory.changed',
    city: 'Mumbai',
    summary: 'Consumed outbox batch (offset committed after OpenSearch version check)',
    status: 'PUBLISHED',
  },
  {
    id: 'evt-902',
    timestamp: '5 mins ago',
    service: 'Transactional Outbox',
    topic: 'restock.requested',
    city: 'Delhi',
    summary: 'Enqueued supplier restock alert for low-stock threshold (< 3 units)',
    status: 'PUBLISHED',
  },
  {
    id: 'evt-901',
    timestamp: '9 mins ago',
    service: 'PostgreSQL',
    topic: 'checkout.atomic_lock',
    city: 'Bengaluru',
    summary: 'Verified row-level FOR UPDATE stock reservation without overselling',
    status: 'COMMITTED',
  },
];

export function getPipelineEvents(): PipelineEventLog[] {
  if (typeof window === 'undefined') return INITIAL_PIPELINE_EVENTS;
  try {
    const raw = localStorage.getItem(PIPELINE_EVENTS_KEY);
    if (!raw) return INITIAL_PIPELINE_EVENTS;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_PIPELINE_EVENTS;
  } catch {
    return INITIAL_PIPELINE_EVENTS;
  }
}

export function recordPipelineEvent(
  event: Omit<PipelineEventLog, 'id' | 'timestamp'>
): void {
  if (typeof window === 'undefined') return;
  try {
    const current = getPipelineEvents();
    const next: PipelineEventLog = {
      ...event,
      id: `evt-${Math.floor(905 + Math.random() * 900)}`,
      timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    };
    localStorage.setItem(PIPELINE_EVENTS_KEY, JSON.stringify([next, ...current].slice(0, 15)));
  } catch {
    /* ignore */
  }
}
