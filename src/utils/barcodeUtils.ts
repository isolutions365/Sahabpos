import { InventoryItem } from '../types';

/**
 * Normalizes barcode strings:
 * - Converts Arabic-Indic numerals (٠-٩) and Eastern-Arabic / Persian (۰-۹) to standard ASCII 0-9
 * - Strips invisible control characters (\r, \n, \t, STX, ETX, ESC, etc.)
 * - Trims whitespace
 */
export function normalizeBarcode(raw: string): string {
  if (!raw) return '';
  const arabicIndicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  const easternIndicDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

  let result = String(raw).trim();
  for (let i = 0; i < 10; i++) {
    result = result.replaceAll(arabicIndicDigits[i], String(i));
    result = result.replaceAll(easternIndicDigits[i], String(i));
  }

  // Remove non-printable control characters
  result = result.replace(/[\x00-\x1F\x7F-\x9F]/g, '');
  return result.trim();
}

/**
 * Robust multi-strategy barcode / SKU inventory lookup:
 * 1. Exact match (case-insensitive) on barcode or sku
 * 2. Alphanumeric match (ignoring hyphens, spaces, punctuation)
 * 3. Leading-zero tolerance (UPC-A 12 digits vs EAN-13 13 digits)
 * 4. Stripped leading zeros comparison
 * 5. Fallback match on item ID
 */
export function findItemByBarcodeOrSku(inventory: InventoryItem[], rawQuery: string): InventoryItem | undefined {
  const clean = normalizeBarcode(rawQuery);
  if (!clean) return undefined;

  const upper = clean.toUpperCase();
  const cleanAlphaNum = upper.replace(/[^A-Z0-9]/g, '');
  const cleanNoLeadingZeros = upper.replace(/^0+/, '');

  // 1. Direct exact match (case-insensitive) on barcode or sku
  let found = inventory.find((item) => {
    const itemBc = normalizeBarcode(item.barcode || '').toUpperCase();
    const itemSku = normalizeBarcode(item.sku || '').toUpperCase();
    return itemBc === upper || itemSku === upper;
  });

  // 2. Alphanumeric-only match (e.g. "RCE-001" matches "RCE001")
  if (!found && cleanAlphaNum) {
    found = inventory.find((item) => {
      const itemBc = normalizeBarcode(item.barcode || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
      const itemSku = normalizeBarcode(item.sku || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
      return (itemBc && itemBc === cleanAlphaNum) || (itemSku && itemSku === cleanAlphaNum);
    });
  }

  // 3. Leading zero tolerance (EAN-13 <-> UPC-A):
  // If query is 12 digits, test with leading 0 (13 digits)
  // If query is 13 digits starting with 0, test without leading 0 (12 digits)
  if (!found) {
    if (upper.length === 12) {
      const ean13 = '0' + upper;
      found = inventory.find((item) => {
        const itemBc = normalizeBarcode(item.barcode || '').toUpperCase();
        return itemBc === ean13;
      });
    } else if (upper.length === 13 && upper.startsWith('0')) {
      const upcA = upper.slice(1);
      found = inventory.find((item) => {
        const itemBc = normalizeBarcode(item.barcode || '').toUpperCase();
        return itemBc === upcA;
      });
    }
  }

  // 4. Zero-stripped numeric match (e.g. barcode stored as 123456 vs 00123456)
  if (!found && cleanNoLeadingZeros) {
    found = inventory.find((item) => {
      const itemBcNoZero = normalizeBarcode(item.barcode || '').toUpperCase().replace(/^0+/, '');
      const itemSkuNoZero = normalizeBarcode(item.sku || '').toUpperCase().replace(/^0+/, '');
      return (itemBcNoZero && itemBcNoZero === cleanNoLeadingZeros) || (itemSkuNoZero && itemSkuNoZero === cleanNoLeadingZeros);
    });
  }

  // 5. Fallback match on item ID
  if (!found) {
    found = inventory.find((item) => item.id.toUpperCase() === upper);
  }

  return found;
}
