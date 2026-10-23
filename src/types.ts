export interface CustomerPayment {
  id: string;
  amount: number;
  date: string;
  notes?: string;
}

export interface Customer {
  id: string;
  name: string;
  customerNumber?: string; // Optional custom reference/serial
  phone?: string;
  licenseNumber?: string; // License Number (رقم الترخيص)
  crNumber?: string; // Commercial Registration Number (رقم السجل التجاري)
  taxNumber?: string; // Tax/VAT Number (الرقم الضريبي)
  notes?: string;
  createdAt: string;
  paymentHistory?: CustomerPayment[]; // Recorded payment logs
}

export interface InventoryItem {
  id: string;
  name: string; // English Product Name
  nameAr?: string; // Arabic Product Name
  productNameEnglish?: string; // English Name
  productNameArabic?: string; // Arabic Name
  size: string; // e.g. Small, 500g, 25kg, Piece, Box
  price: number; // Selling Unit price in SAR
  purchasePrice?: number; // Purchase / Cost price in SAR
  hasWeightPricing: boolean; // Optional toggle — item can be sold with or without weight-based pricing
  priceUnit?: string; // 'kg', 'g', 'm', 'piece'
  stockIn: number; // Total cumulative stock added
  stockOut: number; // Total cumulative stock removed / sold
  currentStock: number; // Current stock level
  vatRate: number; // Default 15%, editable
  category?: string;
  sku?: string;
  lowStockThreshold?: number; // User-defined minimum threshold for low stock alert
  barcode?: string; // Optional unique barcode identifier
  createdAt?: string;
  updatedAt: string;
  createdBy?: string;
  createdRole?: UserRole;
}

export interface StockLog {
  id: string;
  itemId: string;
  itemName: string;
  type: 'IN' | 'OUT';
  quantity: number;
  previousStock: number;
  newStock: number;
  reason: string;
  timestamp: string;
  performedBy?: string;
}

export interface CartItem {
  item: InventoryItem;
  quantity: number; // Units or quantity multiplier
  weight?: number; // Weight in kg/grams if weight-based
  unitPrice: number;
  vatRate: number; // Default 15% or item-specific
  lineSubtotal: number; // Excl. VAT
  lineVat: number; // VAT Amount
  lineTotal: number; // Incl. VAT
}

export interface BusinessProfile {
  businessName: string;
  businessNameAr: string;
  crNumber: string; // Commercial Registration
  vatNumber: string; // 15-digit Tax/VAT ID
  address: string;
  phone: string;
  currency: string;
  defaultVatRate: number; // 15%
  logo?: string; // Base64 or URL
  publicSiteDomain?: string; // Public Site Domain for QR codes
  bankName?: string;
  accountName?: string;
  iban?: string;
  receiptWidthMm?: number; // Thermal receipt printable width (default 58mm for 72mm paper)
  printRowSpacingMm?: number; // Thermal receipt row gap (default 1.5mm)
}

export interface BankEditPermission {
  id: string;
  userId: string;
  userName?: string;
  permissionType: 'MERCHANT_BANK_DETAILS_ONE_TIME_EDIT' | 'EDIT_BANK_DETAILS';
  status: 'PENDING' | 'APPROVED' | 'USED' | 'REJECTED' | 'pending' | 'approved' | 'rejected' | 'revoked';
  grantedBy?: string;
  grantedAt?: string;
  approvedBy?: string;
  approvedAt?: string;
  used: boolean;
  usedAt?: string | null;
  consumedAt?: string | null;
  createdAt: string;
  requestedAt?: string;
}

export type AccessRequest = BankEditPermission;

export interface MerchantSettings {
  bankName: string;
  accountName: string;
  iban: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  customTitle?: string; // Cashier typed custom display name/title on that invoice
  businessProfile: BusinessProfile;
  customer?: Customer; // Attached saved customer (baqaya) or null for walk-in
  isWalkIn: boolean;
  items: CartItem[];
  subtotal: number; // Subtotal (Excl. VAT)
  vatTotal: number; // Total 15% VAT
  grandTotal: number; // Subtotal + VAT
  paymentMethod: 'CASH' | 'MADA' | 'BANK_TRANSFER' | 'CREDIT_BAQAYA';
  paymentStatus: 'PAID' | 'UNPAID' | 'CREDIT';
  cashierRole: string;
  cashierName?: string;
  createdAt: string;
  publicUrl?: string;
  invoiceStatus?: 'Active' | 'Cancelled';
  cancelledAt?: string;
  cancelledBy?: string;
  cancellationReason?: string;
  stockRestored?: boolean;
}

export type PrintFormat = 'THERMAL_80MM' | 'A4_FULL';

export type UserRole = 'CASHIER' | 'MANAGER' | 'ADMIN';

export interface LicenseKey {
  key: string;
  year: number;
  expiryDate: string; // ISO string e.g. "2026-12-31T23:59:59Z"
  businessName: string;
  status: 'unused' | 'active' | 'expired' | 'revoked';
  generatedDate: string;
  activatedDate: string | null;
  activatedByDeviceId: string | null;
}

export interface QuotationItem {
  itemId?: string; // Optional if custom item
  name: string;
  quantity: number;
  unitPrice: number;
  vatRate: number;
  lineSubtotal: number;
  lineVat: number;
  lineTotal: number;
  weight?: number;
}

export interface Quotation {
  id: string;
  quotationNumber: string;
  businessProfile: BusinessProfile;
  clientName: string;
  clientTaxNumber?: string;
  clientCrNumber?: string;
  clientPhone?: string;
  date: string;
  validity: string; // e.g. "Valid for 15 days"
  items: QuotationItem[];
  subtotal: number;
  vatTotal: number;
  grandTotal: number;
  notes?: string;
  createdAt: string;
}

export interface QuotationClient {
  id: string;
  name: string;
  taxNumber?: string;
  crNumber?: string;
  phone?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ManualBillClient {
  id: string;
  name: string;
  taxNumber?: string;
  crNumber?: string;
  phone?: string;
  createdAt: string;
  updatedAt?: string;
}


