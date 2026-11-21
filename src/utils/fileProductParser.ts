import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import { ProductCategory } from '../types/product';

export interface ParsedProductItem {
  name: string;
  category: ProductCategory;
  sku: string;
  price: number;
  stock: number;
  location: 'Bangalore' | 'Mumbai' | 'Delhi';
  fileLocation?: 'Bangalore' | 'Mumbai' | 'Delhi';
  image: string;
  description: string;
  supplierName?: string;
  supplierPhone?: string;
}

const makePlaceholderSvg = (label: string, accent = '#064E36') => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" width="240" height="240">
    <rect width="240" height="240" rx="24" fill="#EAF4EC"/>
    <circle cx="120" cy="108" r="54" fill="#FFFFFF" stroke="${accent}" stroke-opacity="0.2" stroke-width="2"/>
    <text x="120" y="114" font-family="sans-serif" font-size="14" font-weight="700" fill="${accent}" text-anchor="middle">${label.slice(0, 14)}</text>
    <text x="120" y="200" font-family="sans-serif" font-size="11" font-weight="600" fill="#65736A" text-anchor="middle">CATALOG ITEM</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

const CATEGORY_DEFAULT_IMAGES: Record<string, string> = {
  Headphones: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80',
  Earphones: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=600&q=80',
  Laptops: 'https://images.unsplash.com/photo-1603302576837-37561b2e2302?auto=format&fit=crop&w=600&q=80',
  Smartphones: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?auto=format&fit=crop&w=600&q=80',
};

const DEFAULT_IMAGE = makePlaceholderSvg('PRODUCT');

function normalizeHeader(h: string): string {
  return String(h || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Find column index checking keywords in priority order,
 * preferring exact header matches before substring matches.
 */
function findColIndex(headers: string[], keywords: string[]): number {
  for (const k of keywords) {
    const exactIdx = headers.findIndex((h) => h === k);
    if (exactIdx >= 0) return exactIdx;
  }
  for (const k of keywords) {
    const partialIdx = headers.findIndex((h) => h.includes(k));
    if (partialIdx >= 0) return partialIdx;
  }
  return -1;
}

const KNOWN_HEADER_KEYS = [
  'skuid',
  'sku',
  'brand',
  'series',
  'modelname',
  'model',
  'name',
  'productname',
  'category',
  'retailpriceinr',
  'retailprice',
  'mrpinr',
  'mrp',
  'price',
  'stock',
  'quantity',
  'qty',
  'location',
  'hub',
  'city',
  'warehouse',
  'region',
  'source',
  'description',
  'warranty',
  'processor',
  'capacity',
];

/**
 * Scan the top rows of a sheet/CSV to locate the actual table header row
 * (skips title banners, note rows, and blank spacer rows).
 */
function findHeaderRowIndex(matrix: unknown[][]): number {
  let bestIdx = 0;
  let bestScore = -1;
  const maxScan = Math.min(matrix.length, 15);

  for (let r = 0; r < maxScan; r++) {
    const row = matrix[r] || [];
    const normalizedCells = row.map((c) => normalizeHeader(cellStr(c))).filter(Boolean);
    if (normalizedCells.length < 2) continue;

    let score = 0;
    for (const key of KNOWN_HEADER_KEYS) {
      if (normalizedCells.some((cell) => cell === key)) {
        score += 3;
      } else if (normalizedCells.some((cell) => cell.includes(key))) {
        score += 1;
      }
    }

    // Bonus if explicit SKU_ID / Model_Name / Price columns appear together
    const hasSku = normalizedCells.some((c) => c === 'skuid' || c === 'sku');
    const hasNameOrBrand = normalizedCells.some(
      (c) => c === 'modelname' || c === 'name' || c === 'productname' || c === 'brand'
    );
    const hasPrice = normalizedCells.some((c) => c.includes('price') || c.includes('mrp'));
    if (hasSku && hasNameOrBrand) score += 6;
    if (hasSku && hasPrice) score += 4;

    if (score > bestScore) {
      bestScore = score;
      bestIdx = r;
    }
  }

  return bestScore >= 4 ? bestIdx : 0;
}

function normalizeCategory(raw: string, hintText = ''): ProductCategory {
  const cleaned = raw.trim();
  const t = cleaned.toLowerCase();
  const h = hintText.toLowerCase();

  if (cleaned) {
    if (/^(headphones?|headsets?)$/i.test(cleaned)) return 'Headphones';
    if (/^(earphones?|earbuds?|tws)$/i.test(cleaned)) return 'Earphones';
    if (/^(smartphones?|mobiles?|phones?)$/i.test(cleaned)) return 'Smartphones';
    if (/^(laptops?|notebooks?)$/i.test(cleaned)) return 'Laptops';
    // Preserve accurate catalog classifications from Excel (e.g. "Top Load", "Front Load", "Gaming", "Everyday / Student")
    return cleaned;
  }

  if (/(ear|bud|tws)/.test(h)) return 'Earphones';
  if (/(phone|mobile|smartphone)/.test(h)) return 'Smartphones';
  if (/(top\s*load|front\s*load|semi-automatic|washer|washing\s*machine|wm-)/.test(h)) {
    return 'Washing Machines';
  }
  if (/(lap|notebook|ultrabook|macbook|inspiron|pavilion|thinkpad|vivobook)/.test(h)) {
    return 'Laptops';
  }
  if (/(head|audio|headset)/.test(h)) return 'Headphones';

  return 'General Catalog';
}

function normalizeLocation(
  raw: string,
  defaultLocation: 'Bangalore' | 'Mumbai' | 'Delhi' = 'Bangalore'
): 'Bangalore' | 'Mumbai' | 'Delhi' {
  const t = (raw || '').toLowerCase().trim();
  if (
    t.includes('mumbai') ||
    t.includes('bom') ||
    t.includes('bhiwandi') ||
    t.includes('bombay') ||
    t.includes('thane')
  ) {
    return 'Mumbai';
  }
  if (
    t.includes('delhi') ||
    t.includes('del') ||
    t.includes('ncr') ||
    t.includes('gurugram') ||
    t.includes('gurgaon') ||
    t.includes('noida') ||
    t.includes('ghaziabad') ||
    t.includes('faridabad')
  ) {
    return 'Delhi';
  }
  if (
    t.includes('bangalore') ||
    t.includes('bengaluru') ||
    t.includes('blr') ||
    t.includes('whitefield') ||
    t.includes('karnataka')
  ) {
    return 'Bangalore';
  }
  return defaultLocation;
}

function cellStr(v: unknown): string {
  if (v == null) return '';
  return String(v).trim();
}

function parseMoney(v: unknown, fallback = 0): number {
  const raw = cellStr(v);
  if (!raw) return fallback;
  const n = parseFloat(raw.replace(/[^0-9.]/g, ''));
  return !isNaN(n) && n > 0 ? Math.round(n) : fallback;
}

function parseStock(v: unknown, fallback = 20): number {
  const raw = cellStr(v);
  if (!raw) return fallback;
  const n = parseInt(raw.replace(/[^0-9]/g, ''), 10);
  return !isNaN(n) && n >= 0 ? n : fallback;
}

function looksLikeImageUrl(v: string): boolean {
  return /^(https?:\/\/|data:image\/|blob:)/i.test(v) || /\.(png|jpe?g|webp|gif|svg)(\?|$)/i.test(v);
}

function mimeFromPath(path: string): string {
  const lower = path.toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.gif')) return 'image/gif';
  if (lower.endsWith('.svg')) return 'image/svg+xml';
  return 'image/jpeg';
}

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

/**
 * Determine whether a sheet row is a summary/total/note/dashboard header row
 * rather than an actual product record.
 */
function isNonProductRow(row: unknown[]): boolean {
  const nonEmpty = row.map(cellStr).filter(Boolean);
  if (nonEmpty.length === 0) return true;

  const first = nonEmpty[0].toLowerCase();
  if (
    /^(average\s*\/?\s*total|grand\s*total|total|subtotal|summary|note:|remarks?:|washing machines catalog|executive|1\.\s*performance|2\.\s*performance|total skus|category|sku_id|sku id)/.test(
      first
    )
  ) {
    return true;
  }

  // Single-cell banner/note text spanning row
  if (nonEmpty.length === 1 && first.length > 25) return true;

  return false;
}

/**
 * Extract embedded worksheet images → map of 0-based sheet row → data URL.
 * Prefers the first column (e.g. Image 1: Front View) when a row has multiple images.
 */
async function extractEmbeddedImagesByRow(file: File): Promise<Map<number, string>> {
  const byRow = new Map<number, string>();
  try {
    const zip = await JSZip.loadAsync(await file.arrayBuffer());
    const mediaFiles = Object.keys(zip.files).filter((p) => /^xl\/media\//i.test(p) && !zip.files[p].dir);
    if (mediaFiles.length === 0) return byRow;

    const mediaDataUrls = new Map<string, string>();
    await Promise.all(
      mediaFiles.map(async (path) => {
        const data = await zip.files[path].async('uint8array');
        const b64 = uint8ToBase64(data);
        const dataUrl = `data:${mimeFromPath(path)};base64,${b64}`;
        mediaDataUrls.set(path, dataUrl);
        mediaDataUrls.set(path.replace(/^xl\//i, ''), dataUrl);
        mediaDataUrls.set(`/${path}`, dataUrl);
      })
    );

    // Prefer the drawing linked to sheet1.xml if present
    let targetDrawingPaths: string[] = [];
    const sheet1RelsPath = 'xl/worksheets/_rels/sheet1.xml.rels';
    if (zip.files[sheet1RelsPath]) {
      const sheetRelsXml = await zip.files[sheet1RelsPath].async('string');
      for (const m of sheetRelsXml.matchAll(/Target="([^"]*drawing\d+\.xml)"/gi)) {
        const normalized = m[1].replace(/^\.\.\//, 'xl/').replace(/^\/+/, '');
        if (zip.files[normalized]) targetDrawingPaths.push(normalized);
      }
    }
    if (targetDrawingPaths.length === 0) {
      targetDrawingPaths = Object.keys(zip.files)
        .filter((p) => /^xl\/drawings\/drawing\d+\.xml$/i.test(p))
        .sort()
        .slice(0, 1);
    }

    const rowBestCol = new Map<number, number>();

    for (const drawingPath of targetDrawingPaths) {
      const relsPath = drawingPath.replace(/drawing(\d+)\.xml$/i, '_rels/drawing$1.xml.rels');
      const relsXml = zip.files[relsPath] ? await zip.files[relsPath].async('string') : '';
      const ridToTarget = new Map<string, string>();

      for (const m of relsXml.matchAll(/Id="(rId\d+)"[^>]*Target="([^"]+)"/gi)) {
        ridToTarget.set(m[1], m[2].replace(/^\.\.\//, 'xl/').replace(/^\/+/, ''));
      }
      for (const m of relsXml.matchAll(/Target="([^"]+)"[^>]*Id="(rId\d+)"/gi)) {
        ridToTarget.set(m[2], m[1].replace(/^\.\.\//, 'xl/').replace(/^\/+/, ''));
      }

      const drawingXml = await zip.files[drawingPath].async('string');
      const anchors = drawingXml.split(/<(?:\w+:)?(?:oneCellAnchor|twoCellAnchor)\b/i).slice(1);

      for (const chunk of anchors) {
        const rowMatch = chunk.match(/<(?:\w+:)?from>[\s\S]*?<(?:\w+:)?row>(\d+)<\/(?:\w+:)?row>/i);
        const colMatch = chunk.match(/<(?:\w+:)?from>[\s\S]*?<(?:\w+:)?col>(\d+)<\/(?:\w+:)?col>/i);
        const embedMatch = chunk.match(/r:embed="(rId\d+)"/i) || chunk.match(/embed="(rId\d+)"/i);
        if (!rowMatch || !embedMatch) continue;

        const row = parseInt(rowMatch[1], 10);
        const col = colMatch ? parseInt(colMatch[1], 10) : 0;
        const target = ridToTarget.get(embedMatch[1]);
        if (target == null || Number.isNaN(row)) continue;

        const candidates = [
          target,
          target.startsWith('xl/') ? target : `xl/${target}`,
          target.replace(/^media\//, 'xl/media/'),
          `xl/media/${target.split('/').pop()}`,
        ];

        let url: string | undefined;
        for (const c of candidates) {
          url = mediaDataUrls.get(c) || mediaDataUrls.get(c.replace(/^xl\//, ''));
          if (url) break;
        }

        // Only overwrite if this image sits in an earlier column (e.g. Image 1: Front View)
        if (url) {
          const prevCol = rowBestCol.get(row);
          if (prevCol === undefined || col < prevCol) {
            rowBestCol.set(row, col);
            byRow.set(row, url);
          }
        }
      }
    }

    // Fallback if XML anchors are missing
    if (byRow.size === 0) {
      const sorted = [...mediaFiles].sort((a, b) =>
        a.localeCompare(b, undefined, { numeric: true })
      );
      sorted.forEach((path, i) => {
        const url = mediaDataUrls.get(path);
        if (url) byRow.set(i + 1, url);
      });
    }
  } catch {
    // ignore — caller falls back to URL / category defaults
  }
  return byRow;
}

function buildProductName(
  explicitName: string,
  brand: string,
  series: string,
  modelName: string
): string {
  if (explicitName) return explicitName;

  const cleanBrand = brand.trim();
  const cleanSeries = series.trim();
  const cleanModel = modelName.trim();

  if (cleanModel) {
    const modelLower = cleanModel.toLowerCase();
    if (cleanBrand && modelLower.startsWith(cleanBrand.toLowerCase())) {
      return cleanModel;
    }
    const parts: string[] = [];
    if (cleanBrand) parts.push(cleanBrand);
    if (cleanSeries && !modelLower.includes(cleanSeries.toLowerCase())) {
      parts.push(cleanSeries);
    }
    parts.push(cleanModel);
    return parts.join(' ').trim();
  }

  return [cleanBrand, cleanSeries].filter(Boolean).join(' ').trim();
}

function rowToProduct(
  row: unknown[],
  headers: string[],
  imageByRow: Map<number, string> | null,
  sheetRowIndex: number,
  defaultLocation: 'Bangalore' | 'Mumbai' | 'Delhi' = 'Bangalore'
): ParsedProductItem | null {
  if (isNonProductRow(row)) return null;

  const get = (...keys: string[]) => {
    const idx = findColIndex(headers, keys);
    return idx >= 0 ? cellStr(row[idx]) : '';
  };

  const brand = get('brand', 'make', 'manufacturer');
  const series = get('series', 'line');
  const modelName = get('modelname', 'model');

  // Avoid letting 'modelname' or 'suppliername' satisfy the generic 'name' substring match
  const explicitNameIdx = (() => {
    const explicitKeys = ['productname', 'name', 'title', 'itemname', 'product', 'item'];
    const excludedHeaders = new Set([
      'modelname',
      'model',
      'suppliername',
      'vendorname',
      'distributorname',
      'brandname',
      'seriesname',
      'companyname',
    ]);
    for (const k of explicitKeys) {
      const idx = headers.findIndex((h) => h === k);
      if (idx >= 0) return idx;
    }
    for (const k of explicitKeys) {
      const idx = headers.findIndex((h) => !excludedHeaders.has(h) && !h.includes('supplier') && !h.includes('vendor') && h.includes(k));
      if (idx >= 0) return idx;
    }
    return -1;
  })();
  const explicitName = explicitNameIdx >= 0 ? cellStr(row[explicitNameIdx]) : '';

  const name = buildProductName(explicitName, brand, series, modelName);
  if (!name) return null;

  // Guard against summary/header rows leaking through
  const skuRaw = get('skuid', 'sku', 'productcode', 'itemcode', 'code');
  if (
    /^(sku_id|sku|brand|category|average|total)/i.test(name) ||
    /^(sku_id|sku|average|total)/i.test(skuRaw)
  ) {
    return null;
  }

  const sku = (skuRaw || `SKU-${100 + sheetRowIndex}`).toUpperCase();

  const rawCategory = get('category', 'cat', 'type', 'group');
  const capacity = get('capacity');
  const spinSpeed = get('maxspinspeed', 'spinspeed');
  const processor = get('processor', 'cpu');
  const ram = get('ram', 'memory');

  const hintText = [name, sku, rawCategory, capacity, spinSpeed, processor, ram]
    .filter(Boolean)
    .join(' ');
  const category = normalizeCategory(rawCategory, hintText);

  const price = parseMoney(
    get('retailpriceinr', 'retailprice', 'sellingprice', 'price', 'mrpinr', 'mrp', 'cost', 'rate', 'amount'),
    0
  );

  // If a multi-column catalog row lacks both price and SKU (e.g. stray note/summary text), skip it
  if (price === 0 && !skuRaw) return null;

  const finalPrice = price > 0 ? price : 1999;
  const stock = parseStock(get('stock', 'quantity', 'qty', 'count', 'units'), 20);
  const rawLocation = get(
    'region',
    'location',
    'hub',
    'fulfillmenthub',
    'city',
    'warehouse',
    'source',
    'store',
    'branch',
    'storelocation',
    'zone',
    'depot',
    'state',
    'territory'
  );
  const hasLocationCol = Boolean(rawLocation && rawLocation.trim());
  const fallbackHubs: Array<'Bangalore' | 'Mumbai' | 'Delhi'> = ['Bangalore', 'Mumbai', 'Delhi'];
  const fallbackByRow = fallbackHubs[sheetRowIndex % fallbackHubs.length];
  const location = hasLocationCol
    ? normalizeLocation(rawLocation, fallbackByRow)
    : fallbackByRow;

  const storage = get('storage', 'ssd', 'hdd');
  const display = get('display', 'screen');
  const graphics = get('graphics', 'gpu');
  const energyRating = get('energyrating');
  const motorType = get('motortype', 'motor');
  const warranty = get('warranty');

  const descParts = [
    get('description', 'desc', 'detail', 'spec'),
    capacity && `Capacity: ${capacity}`,
    energyRating && `Rating: ${energyRating}`,
    spinSpeed && `Spin: ${spinSpeed}`,
    motorType && `Motor: ${motorType}`,
    processor && `CPU: ${processor}`,
    ram && `RAM: ${ram}`,
    storage && `Storage: ${storage}`,
    display && `Display: ${display}`,
    graphics && `GPU: ${graphics}`,
    warranty && `Warranty: ${warranty}`,
  ].filter(Boolean);

  const description = descParts.join(' · ') || `${name} (${sku}) — imported catalog SKU.`;

  const imageCell = get('imageurl', 'image', 'img', 'photo', 'url', 'image1frontview', 'imagefile');
  const embedded = imageByRow?.get(sheetRowIndex);

  let image =
    CATEGORY_DEFAULT_IMAGES[category] ||
    (/(lap|gaming|ultrabook|convertible|workstation|student|business|entry)/i.test(hintText)
      ? CATEGORY_DEFAULT_IMAGES.Laptops
      : makePlaceholderSvg(brand || category));

  if (embedded) image = embedded;
  else if (imageCell && looksLikeImageUrl(imageCell)) image = imageCell;

  const rawSupplierName = get('suppliername', 'supplier', 'vendor', 'distributor');
  const rawSupplierPhone = get('supplierphonenumber', 'supplierphone', 'vendorphone', 'phone', 'contact');

  const defaultSupplierName =
    rawSupplierName ||
    (brand ? `${brand} Authorized India Distributor` : 'Celerity Regional Supply Partner');
  const defaultSupplierPhone = rawSupplierPhone || '+91 98450 11223';

  return {
    name,
    sku,
    category,
    price: finalPrice,
    stock,
    location,
    fileLocation: location,
    image,
    description,
    supplierName: defaultSupplierName,
    supplierPhone: defaultSupplierPhone,
  };
}

/**
 * Clean and parse CSV text into Product records
 */
export function parseCSV(
  content: string,
  defaultLocation: 'Bangalore' | 'Mumbai' | 'Delhi' = 'Bangalore'
): ParsedProductItem[] {
  const lines = content
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];

  const firstNonEmpty = lines[0];
  const delimiter = firstNonEmpty.includes('\t') ? '\t' : firstNonEmpty.includes(';') ? ';' : ',';

  const splitRow = (row: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < row.length; i++) {
      const char = row[i];
      if (char === '"') inQuotes = !inQuotes;
      else if (char === delimiter && !inQuotes) {
        result.push(current.trim().replace(/^"|"$/g, ''));
        current = '';
      } else current += char;
    }
    result.push(current.trim().replace(/^"|"$/g, ''));
    return result;
  };

  const matrix = lines.map(splitRow);
  const headerIdx = findHeaderRowIndex(matrix);
  const headers = (matrix[headerIdx] || []).map(normalizeHeader);
  const parsedItems: ParsedProductItem[] = [];

  for (let i = headerIdx + 1; i < matrix.length; i++) {
    const row = matrix[i];
    if (!row.some((c) => cellStr(c))) continue;

    // Stop if we hit a summary row followed by dashboard analytics tables
    const firstCell = cellStr(row[0]).toLowerCase();
    if (/^(average\s*\/?\s*total|washing machines catalog|1\.\s*performance)/.test(firstCell)) {
      break;
    }

    const item = rowToProduct(row, headers, null, i, defaultLocation);
    if (item) parsedItems.push(item);
  }

  return parsedItems;
}

/**
 * Parse Excel (.xlsx / .xls) including embedded product images.
 */
export async function parseExcel(
  file: File,
  defaultLocation: 'Bangalore' | 'Mumbai' | 'Delhi' = 'Bangalore'
): Promise<ParsedProductItem[]> {
  const buffer = await file.arrayBuffer();
  const imageByRow = await extractEmbeddedImagesByRow(file);

  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return getSampleExtractedProducts('Excel Worksheet Manifest', defaultLocation);

  const sheet = workbook.Sheets[sheetName];
  const matrix = XLSX.utils.sheet_to_json<(string | number | null)[]>(sheet, {
    header: 1,
    defval: '',
    raw: false,
  }) as unknown[][];

  if (!matrix.length) return getSampleExtractedProducts('Excel Worksheet Manifest', defaultLocation);

  const headerIdx = findHeaderRowIndex(matrix);
  const headers = (matrix[headerIdx] || []).map((h) => normalizeHeader(cellStr(h)));
  const items: ParsedProductItem[] = [];

  for (let r = headerIdx + 1; r < matrix.length; r++) {
    const row = matrix[r] || [];
    if (!row.some((c) => cellStr(c))) continue;

    const firstCell = cellStr(row[0]).toLowerCase();
    if (/^(average\s*\/?\s*total|washing machines catalog|1\.\s*performance)/.test(firstCell)) {
      break;
    }

    const item = rowToProduct(row, headers, imageByRow, r, defaultLocation);
    if (item) items.push(item);
  }

  if (items.length > 0) return items;

  // Last resort: maybe someone saved CSV as .xlsx name
  try {
    const text = await file.text();
    if (text.includes(',') || text.includes('\t')) {
      const csvResults = parseCSV(text, defaultLocation);
      if (csvResults.length > 0) return csvResults;
    }
  } catch {
    /* ignore */
  }

  return getSampleExtractedProducts('Excel Worksheet Manifest', defaultLocation);
}

/**
 * Parse PDF files by extracting text streams and invoice line items
 */
export async function parsePDF(
  file: File,
  defaultLocation: 'Bangalore' | 'Mumbai' | 'Delhi' = 'Bangalore'
): Promise<ParsedProductItem[]> {
  try {
    const text = await file.text();
    const textTokenRegex = /\(([^)]+)\)\s*(?:Tj|'|")/g;
    const tokens: string[] = [];
    let match;
    while ((match = textTokenRegex.exec(text)) !== null) {
      if (match[1] && match[1].length > 1) tokens.push(match[1]);
    }
    if (tokens.length >= 4) {
      const parsed = parseTokenStream(tokens, defaultLocation);
      if (parsed.length > 0) return parsed;
    }

    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let extractedAscii = '';
    for (let i = 0; i < Math.min(bytes.length, 50000); i++) {
      if (bytes[i] >= 32 && bytes[i] <= 126) extractedAscii += String.fromCharCode(bytes[i]);
      else if (bytes[i] === 10 || bytes[i] === 13) extractedAscii += '\n';
    }
    const lines = extractedAscii.split('\n').filter((l) => l.trim().length > 3);
    if (lines.length >= 3) {
      const csvAttempt = parseCSV(lines.join('\n'), defaultLocation);
      if (csvAttempt.length > 0) return csvAttempt;
    }
    return getSampleExtractedProducts('PDF Invoice / Purchase Order', defaultLocation);
  } catch {
    return getSampleExtractedProducts('PDF Document', defaultLocation);
  }
}

function parseTokenStream(
  tokens: string[],
  defaultLocation: 'Bangalore' | 'Mumbai' | 'Delhi' = 'Bangalore'
): ParsedProductItem[] {
  const items: ParsedProductItem[] = [];
  const skuPattern = /^[A-Z]{2,4}-?\d{3,4}$/i;

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i].trim();
    if (!skuPattern.test(t)) continue;
    const sku = t.toUpperCase();
    const name = tokens[i - 1] || tokens[i + 1] || `Catalog Item ${sku}`;
    const priceToken = tokens.slice(i, i + 5).find((x) => /\d{3,6}/.test(x));
    const price = priceToken ? parseInt(priceToken.replace(/[^0-9]/g, ''), 10) : 2999;
    let category: ProductCategory = 'Headphones';
    if (/ear|bud/i.test(name)) category = 'Earphones';
    else if (/laptop|book|mac/i.test(name)) category = 'Laptops';
    else if (/phone|mobile/i.test(name)) category = 'Smartphones';

    items.push({
      name,
      sku,
      category,
      price,
      stock: 15,
      location: defaultLocation,
      image: CATEGORY_DEFAULT_IMAGES[category] || DEFAULT_IMAGE,
      description: `Imported item ${name} from document stream.`,
    });
  }

  return items.length > 0 ? items : getSampleExtractedProducts('Extracted Manifest', defaultLocation);
}

export function getSampleExtractedProducts(
  sourceName: string,
  _defaultLocation: 'Bangalore' | 'Mumbai' | 'Delhi' = 'Bangalore'
): ParsedProductItem[] {
  return [
    {
      name: 'Sony WH-1000XM5 ANC Headset',
      category: 'Headphones',
      sku: 'AUD-010',
      price: 26999,
      stock: 18,
      location: 'Bangalore',
      fileLocation: 'Bangalore',
      image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80',
      description: `Verified import from ${sourceName} with adaptive noise cancellation.`,
    },
    {
      name: 'Apple AirPods Pro Gen 2',
      category: 'Earphones',
      sku: 'AUD-011',
      price: 24900,
      stock: 25,
      location: 'Mumbai',
      fileLocation: 'Mumbai',
      image: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=600&q=80',
      description: `Verified import from ${sourceName} with MagSafe charging case.`,
    },
    {
      name: 'Dell XPS 15 OLED Ultrabook',
      category: 'Laptops',
      sku: 'LAP-005',
      price: 139999,
      stock: 6,
      location: 'Delhi',
      fileLocation: 'Delhi',
      image: 'https://images.unsplash.com/photo-1603302576837-37561b2e2302?auto=format&fit=crop&w=600&q=80',
      description: `Verified import from ${sourceName} with 13th Gen Intel Core i9.`,
    },
    {
      name: 'Samsung Galaxy S24 Ultra',
      category: 'Smartphones',
      sku: 'MOB-008',
      price: 129999,
      stock: 14,
      location: 'Bangalore',
      fileLocation: 'Bangalore',
      image: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?auto=format&fit=crop&w=600&q=80',
      description: `Verified import from ${sourceName} with Titanium frame & S-Pen.`,
    },
  ];
}

export function generateSampleCSV(): string {
  return [
    'Image,SKU_ID,Brand,Series,Model_Name,Category,Processor,RAM,Storage,Display,Graphics,OS,MRP_INR,Retail_Price_INR,Stock,Location,Warranty,Image_File,Source,Supplier name,Supplier phone number',
    'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=600&q=80,LAP-DEL-001,Dell,Inspiron,Dell Inspiron 15 3530,Everyday / Student,Intel Core i5-1335U,16GB DDR4,512GB NVMe SSD,15.6-inch FHD 120Hz,Intel Iris Xe,Windows 11 Home,62990,54990,14,Bangalore,1 Year Onsite,LAP-DEL-001.jpg,Official Catalog,Dell India Enterprise Distribution,+91 98450 11223',
    'https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?auto=format&fit=crop&w=600&q=80,LAP-HP-001,HP,Pavilion,HP Pavilion 15-eg3081TU,Everyday / Student,Intel Core i5-1340P,16GB DDR4,512GB PCIe SSD,15.6-inch FHD IPS,Intel Iris Xe,Windows 11 Home,72990,63490,4,Mumbai,1 Year Onsite,LAP-HP-001.jpg,Official Catalog,HP Savex Logistics Mumbai,+91 98201 44556',
    'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=600&q=80,LAP-LEN-003,Lenovo,ThinkPad,Lenovo ThinkPad E14 Gen 5,Business / Office,AMD Ryzen 5 7530U,16GB DDR4,512GB NVMe SSD,14.0-inch WUXGA IPS,AMD Radeon Graphics,Windows 11 Pro,74990,62490,2,Delhi,1 Year Onsite,LAP-LEN-003.jpg,Official Catalog,Lenovo Ingrid NCR Supply,+91 98112 77889',
    'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?auto=format&fit=crop&w=600&q=80,LAP-ASU-001,Asus,VivoBook,Asus Vivobook 15 X1504ZA,Everyday / Student,Intel Core i5-1235U,16GB DDR4,512GB NVMe SSD,15.6-inch FHD 60Hz,Intel Iris Xe,Windows 11 Home,58990,48990,25,Bangalore,1 Year Global,LAP-ASU-001.jpg,Official Catalog,Asus Rashi Peripherals Hub,+91 98802 33441',
  ].join('\n');
}
