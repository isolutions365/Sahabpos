import QRCode from 'qrcode';
import { Invoice, BusinessProfile } from '../types';

/**
 * ZATCA Phase 1 (Saudi Arabia E-Invoicing) TLV (Tag-Length-Value) Standard Implementation
 *
 * Saudi ZATCA Phase 1 standard specifies that the QR code payload on Tax Invoices and
 * Simplified Tax Invoices MUST be a Base64 encoded TLV binary structure containing 5 mandatory fields:
 * - Tag 1: Seller Name (اسم المورد / الشركة)
 * - Tag 2: Seller VAT Registration Number (الرقم الضريبي للمورد - 15 digits)
 * - Tag 3: Time Stamp in ISO 8601 format (تاريخ وتوقيت الفاتورة)
 * - Tag 4: Invoice Total Amount with VAT (إجمالي الفاتورة مع الضريبة)
 * - Tag 5: VAT Total Amount (إجمالي ضريبة القيمة المضافة)
 */

export interface ZatcaQrFields {
  sellerName: string;
  vatNumber: string;
  timestamp: string;
  totalWithVat: string | number;
  vatTotal: string | number;
}

/**
 * Encodes a single TLV (Tag-Length-Value) field into a Uint8Array byte buffer.
 * - Tag: 1 byte
 * - Length: 1 byte (length of UTF-8 encoded string value in bytes)
 * - Value: N bytes (UTF-8 encoded string bytes)
 */
export function encodeTlvField(tag: number, valueStr: string): Uint8Array {
  const encoder = new TextEncoder();
  const valueBytes = encoder.encode(valueStr || '');
  const length = Math.min(valueBytes.length, 255);

  const field = new Uint8Array(2 + length);
  field[0] = tag;
  field[1] = length;
  field.set(valueBytes.subarray(0, length), 2);
  return field;
}

/**
 * Converts a binary Uint8Array into a standard Base64 string.
 */
export function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Generates the official ZATCA Phase 1 Base64 TLV string from an Invoice object or raw field inputs.
 */
export function generateZatcaTlvBase64(
  invoiceOrFields: Invoice | ZatcaQrFields,
  overrideProfile?: BusinessProfile
): string {
  let sellerName = '';
  let vatNumber = '';
  let timestamp = '';
  let totalWithVat = '0.00';
  let vatTotal = '0.00';

  if ('invoiceNumber' in invoiceOrFields) {
    const inv = invoiceOrFields as Invoice;
    const profile = overrideProfile || inv.businessProfile;

    // Tag 1: Seller Name (preferred Arabic business name if available, fallback to English)
    sellerName = (profile?.businessNameAr || profile?.businessName || 'Waseela POS').replace(/بقالة/g, 'تموينات');

    // Tag 2: VAT Registration Number (15 digits)
    vatNumber = profile?.vatNumber || '';

    // Tag 3: ISO 8601 Timestamp
    try {
      const dateObj = inv.createdAt ? new Date(inv.createdAt) : new Date();
      timestamp = isNaN(dateObj.getTime()) ? new Date().toISOString() : dateObj.toISOString();
    } catch {
      timestamp = new Date().toISOString();
    }

    // Tag 4: Invoice Total (with VAT)
    totalWithVat = Number(inv.grandTotal || 0).toFixed(2);

    // Tag 5: VAT Total
    vatTotal = Number(inv.vatTotal || 0).toFixed(2);
  } else {
    const fields = invoiceOrFields as ZatcaQrFields;
    sellerName = fields.sellerName || '';
    vatNumber = fields.vatNumber || '';
    timestamp = fields.timestamp || new Date().toISOString();
    totalWithVat = Number(fields.totalWithVat || 0).toFixed(2);
    vatTotal = Number(fields.vatTotal || 0).toFixed(2);
  }

  // Build the 5 mandatory ZATCA TLV tags
  const tlv1 = encodeTlvField(1, sellerName);
  const tlv2 = encodeTlvField(2, vatNumber);
  const tlv3 = encodeTlvField(3, timestamp);
  const tlv4 = encodeTlvField(4, totalWithVat);
  const tlv5 = encodeTlvField(5, vatTotal);

  // Concatenate into a single contiguous byte array
  const totalLength = tlv1.length + tlv2.length + tlv3.length + tlv4.length + tlv5.length;
  const tlvBytes = new Uint8Array(totalLength);

  let offset = 0;
  [tlv1, tlv2, tlv3, tlv4, tlv5].forEach((tlv) => {
    tlvBytes.set(tlv, offset);
    offset += tlv.length;
  });

  // Convert binary TLV structure to Base64 payload
  return uint8ArrayToBase64(tlvBytes);
}

/**
 * Decodes a ZATCA Base64 TLV payload back into its structured constituent fields.
 * Useful for verification, debugging, and QR code inspection tools.
 */
export function decodeZatcaTlvBase64(base64Str: string): ZatcaQrFields | null {
  try {
    const binaryStr = atob(base64Str);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }

    const decoder = new TextDecoder();
    const result: Record<number, string> = {};
    let offset = 0;

    while (offset < bytes.length) {
      const tag = bytes[offset];
      const length = bytes[offset + 1];
      if (offset + 2 + length > bytes.length) break;
      
      const valueBytes = bytes.subarray(offset + 2, offset + 2 + length);
      result[tag] = decoder.decode(valueBytes);
      offset += 2 + length;
    }

    return {
      sellerName: result[1] || '',
      vatNumber: result[2] || '',
      timestamp: result[3] || '',
      totalWithVat: result[4] || '',
      vatTotal: result[5] || '',
    };
  } catch (err) {
    console.error('Failed to parse ZATCA TLV Base64 payload:', err);
    return null;
  }
}

/**
 * Helper to generate a Data URL (image) for the ZATCA Phase 1 QR code
 */
export async function generateZatcaQrDataUrl(
  invoice: Invoice,
  options: { width?: number; margin?: number } = {},
  overrideProfile?: BusinessProfile
): Promise<string> {
  const profile = overrideProfile || invoice.businessProfile;
  const domain = profile?.publicSiteDomain?.trim();
  let publicInvoiceUrl = '';
  if (domain) {
    let cleanDomain = domain.replace(/^(https?:\/\/)?/, '');
    if (cleanDomain.endsWith('/')) {
      cleanDomain = cleanDomain.slice(0, -1);
    }
    publicInvoiceUrl = `https://${cleanDomain}/invoice/${invoice.id}`;
  } else if (typeof window !== 'undefined' && window.location?.origin) {
    publicInvoiceUrl = `${window.location.origin}/invoice/${invoice.id}`;
  } else {
    publicInvoiceUrl = `https://waseela-pos.web.app/invoice/${invoice.id}`;
  }

  const width = options.width || 180;
  const margin = options.margin !== undefined ? options.margin : 1;

  try {
    return await QRCode.toDataURL(publicInvoiceUrl, {
      width,
      margin,
      errorCorrectionLevel: 'M',
    });
  } catch (err) {
    console.error('Error generating ZATCA QR code:', err);
    return '';
  }
}
