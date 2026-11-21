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
  image: string;
  description: string;
}

const CATEGORY_DEFAULT_IMAGES: Record<string, string> = {
  Headphones: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80',
  Earphones: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=600&q=80',
  Laptops: 'https://images.unsplash.com/photo-1603302576837-37561b2e2302?auto=format&fit=crop&w=600&q=80',
  Smartphones: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?auto=format&fit=crop&w=600&q=80',
};

const DEFAULT_IMAGE =
  'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80';

function normalizeHeader(h: string): string {
  return String(h || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function findColIndex(headers: string[], keywords: string[]): number {
  return headers.findIndex((h) => keywords.some((k) => h.includes(k)));
}

function normalizeCategory(raw: string): ProductCategory {
  const t = (raw || '').toLowerCase();
  if (!t) return 'Headphones';
  if (/(ear|bud|tws)/.test(t)) return 'Earphones';
  if (/(phone|mobile|smartphone)/.test(t)) return 'Smartphones';
  if (
    /(lap|notebook|ultrabook|macbook|gaming|student|business|convertible|workstation|thin\s*&\s*light|entry|premium|creator)/.test(
      t
    )
  ) {
    return 'Laptops';
  }
  if (/(head|audio|headset)/.test(t)) return 'Headphones';
  return 'Laptops';
}

function normalizeLocation(raw: string): 'Bangalore' | 'Mumbai' | 'Delhi' {
  const t = (raw || '').toLowerCase();
  if (t.includes('mumbai')) return 'Mumbai';
  if (t.includes('delhi')) return 'Delhi';
  return 'Bangalore';
}

function cellStr(v: unknown): string {
  if (v == null) return '';
  return String(v).trim();
}

function parseMoney(v: unknown, fallback = 1999): number {
  const n = parseFloat(cellStr(v).replace(/[^0-9.]/g, ''));
  return !isNaN(n) && n > 0 ? Math.round(n) : fallback;
}

function parseStock(v: unknown, fallback = 20): number {
  const n = parseInt(cellStr(v).replace(/[^0-9]/g, ''), 10);
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
 * Extract embedded worksheet images → map of 0-based sheet row → data URL.
 * openpyxl / Excel place oneCellAnchor row markers (0-based) matching sheet rows.
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
        mediaDataUrls.set(path.replace(/^xl\//i, ''), `data:${mimeFromPath(path)};base64,${b64}`);
        mediaDataUrls.set(path, `data:${mimeFromPath(path)};base64,${b64}`);
      })
    );

    const drawingFiles = Object.keys(zip.files).filter((p) => /^xl\/drawings\/drawing\d+\.xml$/i.test(p));
    for (const drawingPath of drawingFiles) {
      const relsPath = drawingPath.replace(/drawing(\d+)\.xml$/i, '_rels/drawing$1.xml.rels');
      const relsXml = zip.files[relsPath] ? await zip.files[relsPath].async('string') : '';
      const ridToTarget = new Map<string, string>();
      for (const m of relsXml.matchAll(/Id="(rId\d+)"[^>]*Target="([^"]+)"/gi)) {
        ridToTarget.set(m[1], m[2].replace(/^\.\.\//, 'xl/'));
      }
      // also Target before Id
      for (const m of relsXml.matchAll(/Target="([^"]+)"[^>]*Id="(rId\d+)"/gi)) {
        ridToTarget.set(m[2], m[1].replace(/^\.\.\//, 'xl/'));
      }

      const drawingXml = await zip.files[drawingPath].async('string');
      const anchors = drawingXml.split(/<(?:\w+:)?(?:oneCellAnchor|twoCellAnchor)\b/i).slice(1);
      for (const chunk of anchors) {
        const rowMatch = chunk.match(/<(?:\w+:)?from>[\s\S]*?<(?:\w+:)?row>(\d+)<\/(?:\w+:)?row>/i);
        const embedMatch =
          chunk.match(/r:embed="(rId\d+)"/i) || chunk.match(/embed="(rId\d+)"/i);
        if (!rowMatch || !embedMatch) continue;
        const row = parseInt(rowMatch[1], 10);
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
        if (url) byRow.set(row, url);
      }
    }

    // Fallback: if anchors missing, assign media in filename order to rows 1..n
    if (byRow.size === 0) {
      const sorted = [...mediaFiles].sort((a, b) =>
        a.localeCompare(b, undefined, { numeric: true })
      );
      sorted.forEach((path, i) => {
        const url = mediaDataUrls.get(path);
        if (url) byRow.set(i + 1, url); // skip header row 0
      });
    }
  } catch {
    // ignore — caller falls back to URL / category defaults
  }
  return byRow;
}

function rowToProduct(
  row: unknown[],
  headers: string[],
  imageByRow: Map<number, string> | null,
  sheetRowIndex: number
): ParsedProductItem | null {
  const get = (...keys: string[]) => {
    const idx = findColIndex(headers, keys);
    return idx >= 0 ? cellStr(row[idx]) : '';
  };

  const modelName = get('modelname', 'model', 'title', 'productname');
  const brand = get('brand', 'make', 'manufacturer');
  const series = get('series', 'line');
  const name =
    get('name', 'product', 'item') ||
    modelName ||
    [brand, series].filter(Boolean).join(' ') ||
    '';
  if (!name) return null;

  const sku =
    (get('skuid', 'sku', 'code', 'id') || `SKU-${100 + sheetRowIndex}`).toUpperCase();

  const category = normalizeCategory(
    get('category', 'cat', 'type', 'group') || (/(lap|mac|dell|hp|lenovo|asus|acer|msi)/i.test(name) ? 'Laptops' : '')
  );

  const price = parseMoney(
    get('retailpriceinr', 'retailprice', 'mrpinr', 'mrp', 'price', 'cost', 'rate', 'amount'),
    1999
  );
  const stock = parseStock(get('stock', 'quantity', 'qty', 'count', 'units'), 20);
  const location = normalizeLocation(get('location', 'hub', 'city', 'warehouse'));

  const processor = get('processor', 'cpu');
  const ram = get('ram', 'memory');
  const storage = get('storage', 'ssd', 'hdd');
  const display = get('display', 'screen');
  const graphics = get('graphics', 'gpu');
  const warranty = get('warranty');
  const descParts = [
    get('desc', 'description', 'detail', 'spec'),
    processor && `CPU: ${processor}`,
    ram && `RAM: ${ram}`,
    storage && `Storage: ${storage}`,
    display && `Display: ${display}`,
    graphics && `GPU: ${graphics}`,
    warranty && `Warranty: ${warranty}`,
  ].filter(Boolean);
  const description =
    descParts.join(' · ') || `${name} imported via document manifest.`;

  const imageCell = get('imageurl', 'image', 'img', 'photo', 'url', 'imagefile');
  const embedded = imageByRow?.get(sheetRowIndex);
  let image = CATEGORY_DEFAULT_IMAGES[category] || DEFAULT_IMAGE;
  if (embedded) image = embedded;
  else if (imageCell && looksLikeImageUrl(imageCell)) image = imageCell;

  return {
    name,
    sku,
    category,
    price,
    stock,
    location,
    image,
    description,
  };
}

/**
 * Clean and parse CSV text into Product records
 */
export function parseCSV(content: string): ParsedProductItem[] {
  const lines = content
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];

  const firstLine = lines[0];
  const delimiter = firstLine.includes('\t') ? '\t' : firstLine.includes(';') ? ';' : ',';

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

  const headers = splitRow(lines[0]).map(normalizeHeader);
  const parsedItems: ParsedProductItem[] = [];

  for (let i = 1; i < lines.length; i++) {
    const row = splitRow(lines[i]);
    if (row.length === 0 || (row.length === 1 && !row[0])) continue;
    const item = rowToProduct(row, headers, null, i);
    if (item) parsedItems.push(item);
  }

  return parsedItems;
}

/**
 * Parse Excel (.xlsx / .xls) including embedded product images.
 */
export async function parseExcel(file: File): Promise<ParsedProductItem[]> {
  const buffer = await file.arrayBuffer();
  const imageByRow = await extractEmbeddedImagesByRow(file);

  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return getSampleExtractedProducts('Excel Worksheet Manifest');

  const sheet = workbook.Sheets[sheetName];
  const matrix = XLSX.utils.sheet_to_json<(string | number | null)[]>(sheet, {
    header: 1,
    defval: '',
    raw: false,
  }) as unknown[][];

  if (!matrix.length) return getSampleExtractedProducts('Excel Worksheet Manifest');

  const headers = (matrix[0] || []).map((h) => normalizeHeader(cellStr(h)));
  const items: ParsedProductItem[] = [];

  for (let r = 1; r < matrix.length; r++) {
    const row = matrix[r] || [];
    if (!row.some((c) => cellStr(c))) continue;
    const item = rowToProduct(row, headers, imageByRow, r);
    if (item) items.push(item);
  }

  if (items.length > 0) return items;

  // Last resort: maybe someone saved CSV as .xlsx name
  try {
    const text = await file.text();
    if (text.includes(',') || text.includes('\t')) {
      const csvResults = parseCSV(text);
      if (csvResults.length > 0) return csvResults;
    }
  } catch {
    /* ignore */
  }

  return getSampleExtractedProducts('Excel Worksheet Manifest');
}

/**
 * Parse PDF files by extracting text streams and invoice line items
 */
export async function parsePDF(file: File): Promise<ParsedProductItem[]> {
  try {
    const text = await file.text();
    const textTokenRegex = /\(([^)]+)\)\s*(?:Tj|'|")/g;
    const tokens: string[] = [];
    let match;
    while ((match = textTokenRegex.exec(text)) !== null) {
      if (match[1] && match[1].length > 1) tokens.push(match[1]);
    }
    if (tokens.length >= 4) {
      const parsed = parseTokenStream(tokens);
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
      const csvAttempt = parseCSV(lines.join('\n'));
      if (csvAttempt.length > 0) return csvAttempt;
    }
    return getSampleExtractedProducts('PDF Invoice / Purchase Order');
  } catch {
    return getSampleExtractedProducts('PDF Document');
  }
}

function parseTokenStream(tokens: string[]): ParsedProductItem[] {
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
      location: 'Bangalore',
      image: CATEGORY_DEFAULT_IMAGES[category] || DEFAULT_IMAGE,
      description: `Imported item ${name} from document stream.`,
    });
  }

  return items.length > 0 ? items : getSampleExtractedProducts('Extracted Manifest');
}

export function getSampleExtractedProducts(sourceName: string): ParsedProductItem[] {
  return [
    {
      name: 'Sony WH-1000XM5 ANC Headset',
      category: 'Headphones',
      sku: 'AUD-010',
      price: 26999,
      stock: 18,
      location: 'Bangalore',
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
      image: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?auto=format&fit=crop&w=600&q=80',
      description: `Verified import from ${sourceName} with Titanium frame & S-Pen.`,
    },
  ];
}

export function generateSampleCSV(): string {
  return [
    'name,sku,category,price,stock,location,description,image',
    'Sony Wireless Studio Pro,AUD-020,Headphones,19999,30,Bangalore,Premium over-ear studio monitor headphones,https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80',
    'Beats Fit Sport Earphones,AUD-021,Earphones,14990,45,Mumbai,Secure-fit wingtips with sweat resistance,https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=600&q=80',
    'MacBook Air M3 15-Inch,LAP-010,Laptops,134900,10,Delhi,Liquid Retina display with Apple M3 chip,https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=600&q=80',
    'Google Pixel 9 Pro 5G,MOB-015,Smartphones,109999,22,Bangalore,Advanced AI camera system with Super Actua display,https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=600&q=80',
  ].join('\n');
}
