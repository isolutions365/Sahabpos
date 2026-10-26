import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  where,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { BusinessProfile, Customer, InventoryItem, Invoice, StockLog, Quotation, QuotationItem, QuotationClient, ManualBillClient, BankEditPermission } from '../types';
import { DEFAULT_BUSINESS_PROFILE, INITIAL_CUSTOMERS, INITIAL_INVENTORY } from '../lib/sampleData';
import { decodeZatcaTlvBase64 } from '../utils/zatca';
import { isAiStudioEnvironment } from '../utils/envUtils';

// Collections
const COLLECTION_CUSTOMERS = 'customers';
const COLLECTION_INVENTORY = 'inventory';
const COLLECTION_STOCK_LOGS = 'stockLogs';
const COLLECTION_INVOICES = 'invoices';
const COLLECTION_SETTINGS = 'settings';
const COLLECTION_MERCHANT_SETTINGS = 'merchantSettings';
const COLLECTION_QUOTATIONS = 'quotations';
const COLLECTION_QUOTATION_CLIENTS = 'quotationClients';
const COLLECTION_MANUAL_BILLS = 'manualBills';
const COLLECTION_MANUAL_BILL_CLIENTS = 'manualBillClients';
const COLLECTION_BANK_PERMISSIONS = 'accessRequests';
const COLLECTION_BANK_PERMISSIONS_LEGACY = 'bankEditPermissions';

// Recursive helper to clean undefined properties so Firestore doesn't crash
function cleanUndefined<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => cleanUndefined(item)) as any;
  }
  if (typeof obj === 'object' && !(obj instanceof Date)) {
    const cleaned: any = {};
    for (const [key, val] of Object.entries(obj)) {
      if (val !== undefined) {
        cleaned[key] = cleanUndefined(val);
      }
    }
    return cleaned;
  }
  return obj;
}

// Normalization helper for inventory items fetched from Firestore
function normalizeInventoryDoc(docId: string, data: any): InventoryItem {
  const nameEn = data.name || data.productNameEnglish || data.productName || data.title || 'Unnamed Item';
  const nameAr = data.nameAr || data.productNameArabic || data.arabicName || '';
  const priceVal = Number(data.price ?? data.unitPrice ?? data.cost ?? 0);
  const purchasePriceVal = data.purchasePrice !== undefined ? Number(data.purchasePrice) : (data.cost !== undefined ? Number(data.cost) : undefined);
  const currentStockVal = Number(data.currentStock ?? data.stock ?? data.quantity ?? 0);
  const stockInVal = Number(data.stockIn ?? currentStockVal);
  const stockOutVal = Number(data.stockOut ?? 0);
  const sizeVal = data.size || data.unit || data.packageSize || '1 Unit';
  const vatRateVal = data.vatRate !== undefined ? Number(data.vatRate) : 15;

  return {
    id: docId,
    name: nameEn,
    nameAr: nameAr,
    productNameEnglish: nameEn,
    productNameArabic: nameAr,
    size: sizeVal,
    price: isNaN(priceVal) ? 0 : priceVal,
    purchasePrice: purchasePriceVal !== undefined && !isNaN(purchasePriceVal) ? purchasePriceVal : undefined,
    hasWeightPricing: Boolean(data.hasWeightPricing),
    priceUnit: data.priceUnit || 'piece',
    stockIn: isNaN(stockInVal) ? 0 : stockInVal,
    stockOut: isNaN(stockOutVal) ? 0 : stockOutVal,
    currentStock: isNaN(currentStockVal) ? 0 : currentStockVal,
    vatRate: isNaN(vatRateVal) ? 15 : vatRateVal,
    category: data.category || 'General',
    sku: data.sku || '',
    barcode: data.barcode || '',
    lowStockThreshold: data.lowStockThreshold !== undefined ? Number(data.lowStockThreshold) : undefined,
    createdAt: data.createdAt || new Date().toISOString(),
    updatedAt: data.updatedAt || new Date().toISOString(),
    createdBy: data.createdBy,
    createdRole: data.createdRole,
  };
}

// Normalization helper for invoice items fetched from Firestore
function normalizeInvoiceDoc(docId: string, data: any): Invoice {
  return {
    id: docId,
    invoiceNumber: data.invoiceNumber || data.number || `INV-${docId.slice(0, 6)}`,
    customTitle: data.customTitle,
    businessProfile: data.businessProfile || DEFAULT_BUSINESS_PROFILE,
    customer: data.customer || undefined,
    isWalkIn: data.isWalkIn !== undefined ? data.isWalkIn : !data.customer,
    items: Array.isArray(data.items) ? data.items : [],
    subtotal: Number(data.subtotal || 0),
    vatTotal: Number(data.vatTotal || 0),
    grandTotal: Number(data.grandTotal || 0),
    paymentMethod: data.paymentMethod || 'CASH',
    paymentStatus: data.paymentStatus || 'PAID',
    cashierRole: data.cashierRole || 'Cashier',
    cashierName: data.cashierName,
    createdAt: data.createdAt || new Date().toISOString(),
    publicUrl: data.publicUrl || `https://sahaab-pos.web.app/invoice/${docId}`,
    invoiceStatus: data.invoiceStatus || 'Active',
    cancelledAt: data.cancelledAt,
    cancelledBy: data.cancelledBy,
    cancellationReason: data.cancellationReason,
    stockRestored: data.stockRestored,
  };
}

// Seed Initial Data if collections are empty
export async function seedInitialDataIfNeeded(): Promise<void> {
  try {
    // 1. Business Profile & Merchant Settings
    const profileRef = doc(db, COLLECTION_SETTINGS, 'business');
    const profileSnap = await getDoc(profileRef);
    if (!profileSnap.exists()) {
      await setDoc(profileRef, cleanUndefined(DEFAULT_BUSINESS_PROFILE));
    } else {
      const snapData = profileSnap.data();
      const profileUpdates: any = {};
      if (!snapData?.address || snapData?.address === 'Riyadh, Kingdom of Saudi Arabia') {
        profileUpdates.address = DEFAULT_BUSINESS_PROFILE.address;
      }
      if (snapData?.businessNameAr && snapData.businessNameAr.includes('بقالة')) {
        profileUpdates.businessNameAr = snapData.businessNameAr.replace(/بقالة/g, 'تموينات');
      }

      // When running in AI Studio, automatically sync updates made to DEFAULT_BUSINESS_PROFILE
      if (isAiStudioEnvironment()) {
        const isDefaultDifferent =
          (DEFAULT_BUSINESS_PROFILE.businessName && DEFAULT_BUSINESS_PROFILE.businessName !== snapData.businessName) ||
          (DEFAULT_BUSINESS_PROFILE.businessNameAr && DEFAULT_BUSINESS_PROFILE.businessNameAr !== snapData.businessNameAr) ||
          (DEFAULT_BUSINESS_PROFILE.crNumber && DEFAULT_BUSINESS_PROFILE.crNumber !== snapData.crNumber) ||
          (DEFAULT_BUSINESS_PROFILE.vatNumber && DEFAULT_BUSINESS_PROFILE.vatNumber !== snapData.vatNumber);

        if (isDefaultDifferent) {
          Object.assign(profileUpdates, {
            businessName: DEFAULT_BUSINESS_PROFILE.businessName,
            businessNameAr: DEFAULT_BUSINESS_PROFILE.businessNameAr,
            crNumber: DEFAULT_BUSINESS_PROFILE.crNumber,
            vatNumber: DEFAULT_BUSINESS_PROFILE.vatNumber,
            address: DEFAULT_BUSINESS_PROFILE.address || snapData.address,
            phone: DEFAULT_BUSINESS_PROFILE.phone || snapData.phone,
          });
        }
      }

      if (Object.keys(profileUpdates).length > 0) {
        await updateDoc(profileRef, cleanUndefined(profileUpdates));
      }
    }

    const merchantRef = doc(db, COLLECTION_MERCHANT_SETTINGS, 'profile');
    const merchantSnap = await getDoc(merchantRef);
    if (!merchantSnap.exists()) {
      await setDoc(
        merchantRef,
        cleanUndefined({
          bankName: DEFAULT_BUSINESS_PROFILE.bankName || 'Al Rajhi Bank / مصرف الراجحي',
          accountName: DEFAULT_BUSINESS_PROFILE.accountName || 'Sahaab Commercial Cities Est.',
          iban: DEFAULT_BUSINESS_PROFILE.iban || 'SA0380000000108012345678',
          businessName: DEFAULT_BUSINESS_PROFILE.businessName,
          businessNameAr: DEFAULT_BUSINESS_PROFILE.businessNameAr,
          vatNumber: DEFAULT_BUSINESS_PROFILE.vatNumber,
          crNumber: DEFAULT_BUSINESS_PROFILE.crNumber,
          address: DEFAULT_BUSINESS_PROFILE.address,
          phone: DEFAULT_BUSINESS_PROFILE.phone,
          updatedAt: new Date().toISOString(),
        })
      );
    }
  } catch (error: any) {
    if (error?.code === 'permission-denied' || error?.message?.includes('Missing or insufficient permissions')) {
      console.warn('Firestore permissions notice: Database requires security rules update in Firebase Console.');
    } else if (error?.code === 'unavailable' || error?.message?.includes('offline')) {
      console.warn('Firestore is currently offline; initial seeding skipped until online.');
    } else {
      console.warn('Notice: Firestore initial data check notice:', error?.message || error);
    }
  }
}

// ---------------- Business Profile Settings ----------------
export async function getBusinessProfile(): Promise<BusinessProfile> {
  try {
    const docRef = doc(db, COLLECTION_SETTINGS, 'business');
    const snap = await getDoc(docRef);
    let data: BusinessProfile | null = null;

    if (snap.exists()) {
      data = snap.data() as BusinessProfile;
    } else {
      // Migration fallback
      const oldDocRef = doc(db, COLLECTION_SETTINGS, 'businessProfile');
      const oldSnap = await getDoc(oldDocRef);
      if (oldSnap.exists()) {
        data = oldSnap.data() as BusinessProfile;
      }
    }

    if (!data) {
      data = { ...DEFAULT_BUSINESS_PROFILE };
    }

    if (!data.businessNameAr || data.businessNameAr === 'سحاب المدن التجارية' || data.businessNameAr.includes('تموينات')) {
      data.businessNameAr = 'البقالة سحاب المدن التجارية';
      await setDoc(docRef, cleanUndefined(data), { merge: true });
    }

    if (!data.address || data.address === 'Riyadh, Kingdom of Saudi Arabia') {
      data.address = DEFAULT_BUSINESS_PROFILE.address;
      await setDoc(docRef, cleanUndefined(data), { merge: true });
    }

    if (!data.vatNumber || data.vatNumber === '310987654300003' || data.vatNumber === '310802395800003') {
      data.vatNumber = '3112939551900003';
      await setDoc(docRef, cleanUndefined(data), { merge: true });
    }

    if (!data.crNumber || data.crNumber === '1010894521' || data.crNumber === '2050158575') {
      data.crNumber = '7029190803';
      await setDoc(docRef, cleanUndefined(data), { merge: true });
    }

    if (!data.phone || data.phone === '+966 11 456 7890') {
      data.phone = '0580588437';
      await setDoc(docRef, cleanUndefined(data), { merge: true });
    }

    // Try fetching merchantSettings collection for additional bank detail synchronization
    try {
      const merchantSnap = await getDoc(doc(db, COLLECTION_MERCHANT_SETTINGS, 'profile'));
      if (merchantSnap.exists()) {
        const merchantData = merchantSnap.data();
        if (merchantData.bankName && !data.bankName) data.bankName = merchantData.bankName;
        if (merchantData.accountName && !data.accountName) data.accountName = merchantData.accountName;
        if (merchantData.iban && !data.iban) data.iban = merchantData.iban;
      }
    } catch (e) {
      // optional fallback ignore
    }

    if (!data.publicSiteDomain || data.publicSiteDomain.trim() === '' || data.publicSiteDomain.includes('ai.studio')) {
      data.publicSiteDomain = 'sahaab-pos.web.app';
      await setDoc(docRef, cleanUndefined(data), { merge: true });
    }

    return data;
  } catch (err: any) {
    if (err?.code === 'unavailable' || err?.message?.includes('offline')) {
      console.warn('Firestore offline; using default business profile.');
    } else {
      console.warn('Notice: Could not fetch business profile from Firestore, using default profile:', err?.message || err);
    }
    return DEFAULT_BUSINESS_PROFILE;
  }
}

export function subscribeBusinessProfile(callback: (profile: BusinessProfile) => void): () => void {
  const docRef = doc(db, COLLECTION_SETTINGS, 'business');
  return onSnapshot(
    docRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as BusinessProfile;
        callback({
          ...DEFAULT_BUSINESS_PROFILE,
          ...data,
        });
      } else {
        callback(DEFAULT_BUSINESS_PROFILE);
      }
    },
    (err) => {
      console.warn('Real-time business profile subscription notice:', err?.message || err);
    }
  );
}

export async function saveBusinessProfile(profile: BusinessProfile): Promise<void> {
  const docRef = doc(db, COLLECTION_SETTINGS, 'business');
  await setDoc(docRef, cleanUndefined(profile), { merge: true });

  try {
    const merchantPayload = cleanUndefined({
      bankName: profile.bankName || '',
      accountName: profile.accountName || '',
      iban: profile.iban || '',
      businessName: profile.businessName || '',
      businessNameAr: profile.businessNameAr || '',
      vatNumber: profile.vatNumber || '',
      crNumber: profile.crNumber || '',
      address: profile.address || '',
      phone: profile.phone || '',
      updatedAt: new Date().toISOString(),
      updatedBy: 'admin',
    });
    await setDoc(doc(db, COLLECTION_MERCHANT_SETTINGS, 'profile'), merchantPayload, { merge: true });
    await setDoc(doc(db, COLLECTION_MERCHANT_SETTINGS, 'business'), merchantPayload, { merge: true });
  } catch (err) {
    console.warn('Notice: Failed to update merchantSettings collection in Firestore:', err);
  }
}

export function subscribeBankEditPermissions(callback: (perms: BankEditPermission[]) => void): () => void {
  const q = query(collection(db, COLLECTION_BANK_PERMISSIONS));
  return onSnapshot(
    q,
    (snapshot) => {
      const perms: BankEditPermission[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<BankEditPermission, 'id'>),
      }));
      perms.sort((a, b) => new Date(b.createdAt || b.requestedAt || 0).getTime() - new Date(a.createdAt || a.requestedAt || 0).getTime());
      callback(perms);
    },
    (err) => {
      console.warn('Access requests snapshot error:', err?.message || err);
    }
  );
}

export async function requestBankEditPermission(userId: string, userName?: string): Promise<string> {
  const now = new Date().toISOString();
  
  // Check for existing pending request
  const q = query(
    collection(db, COLLECTION_BANK_PERMISSIONS),
    where('userId', '==', userId)
  );
  const snap = await getDocs(q);
  const pendingDoc = snap.docs.find(d => {
    const st = String(d.data().status).toLowerCase();
    return st === 'pending';
  });

  if (pendingDoc) {
    return pendingDoc.id;
  }

  const payload = cleanUndefined({
    userId,
    userName: userName || userId,
    permissionType: 'MERCHANT_BANK_DETAILS_ONE_TIME_EDIT',
    status: 'PENDING',
    used: false,
    consumedAt: null,
    usedAt: null,
    createdAt: now,
    requestedAt: now,
  });

  const docRef = await addDoc(collection(db, COLLECTION_BANK_PERMISSIONS), payload);
  await updateDoc(docRef, { id: docRef.id });

  // Also sync to legacy collection if needed
  try {
    await setDoc(doc(db, COLLECTION_BANK_PERMISSIONS_LEGACY, docRef.id), { ...payload, id: docRef.id }, { merge: true });
  } catch (e) {
    // optional sync
  }

  return docRef.id;
}

export async function updateBankEditPermissionStatus(
  id: string,
  status: 'APPROVED' | 'REJECTED' | 'REVOKED' | 'approved' | 'rejected' | 'revoked',
  adminName: string
): Promise<void> {
  const normalizedStatus = status.toUpperCase() as 'APPROVED' | 'REJECTED' | 'REVOKED';
  const docRef = doc(db, COLLECTION_BANK_PERMISSIONS, id);
  const now = new Date().toISOString();
  
  const updates: any = {
    status: normalizedStatus,
    statusLower: normalizedStatus.toLowerCase(),
  };

  if (normalizedStatus === 'APPROVED') {
    updates.grantedBy = adminName;
    updates.grantedAt = now;
    updates.approvedBy = adminName;
    updates.approvedAt = now;
  } else if (normalizedStatus === 'REJECTED') {
    updates.rejectedBy = adminName;
    updates.rejectedAt = now;
    updates.approvedBy = adminName; // for fallback
    updates.approvedAt = now;      // for fallback
  }

  await updateDoc(docRef, cleanUndefined(updates));

  try {
    await updateDoc(doc(db, COLLECTION_BANK_PERMISSIONS_LEGACY, id), cleanUndefined(updates));
  } catch (e) {
    // optional
  }
}

export async function updatePermissionRequestStatus(
  id: string,
  status: 'APPROVED' | 'REJECTED' | 'REVOKED' | 'approved' | 'rejected' | 'revoked',
  adminName: string
): Promise<void> {
  return updateBankEditPermissionStatus(id, status, adminName);
}

export async function saveBusinessProfileWithPermissionCheck(
  newProfile: BusinessProfile,
  userRole: string,
  userId: string
): Promise<void> {
  if (userRole.toUpperCase() === 'ADMIN') {
    await saveBusinessProfile(newProfile);
    return;
  }

  const docRef = doc(db, COLLECTION_SETTINGS, 'business');
  const currentSnap = await getDoc(docRef);
  const currentProfile = currentSnap.exists() ? (currentSnap.data() as BusinessProfile) : DEFAULT_BUSINESS_PROFILE;

  const bankDetailsChanged =
    newProfile.bankName !== currentProfile.bankName ||
    newProfile.accountName !== currentProfile.accountName ||
    newProfile.iban !== currentProfile.iban;

  if (!bankDetailsChanged) {
    await saveBusinessProfile(newProfile);
    return;
  }

  const q = query(
    collection(db, COLLECTION_BANK_PERMISSIONS),
    where('userId', '==', userId)
  );
  const snap = await getDocs(q);

  const activeDoc = snap.docs.find((d) => {
    const data = d.data();
    const st = String(data.status).toUpperCase();
    const isUsed = data.used === true || st === 'USED';
    return st === 'APPROVED' && !isUsed;
  });

  if (!activeDoc) {
    throw new Error('Unauthorized: You do not have an active approved one-time permission to edit Merchant Bank Details. Please request access from Admin.');
  }

  await saveBusinessProfile(newProfile);

  const now = new Date().toISOString();
  const updatePayload = {
    used: true,
    status: 'CONSUMED',
    usedAt: now,
    consumedAt: now,
  };

  await updateDoc(doc(db, COLLECTION_BANK_PERMISSIONS, activeDoc.id), updatePayload);

  try {
    await updateDoc(doc(db, COLLECTION_BANK_PERMISSIONS_LEGACY, activeDoc.id), updatePayload);
  } catch (e) {
    // optional
  }
}

// ---------------- Customers ----------------
export function subscribeCustomers(
  callback: (customers: Customer[]) => void,
  onError?: (error: Error) => void
): () => void {
  const q = query(collection(db, COLLECTION_CUSTOMERS));
  return onSnapshot(
    q,
    (snapshot) => {
      const customers: Customer[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Customer, 'id'>),
      }));
      callback(customers);
    },
    (err) => {
      console.warn('Customer snapshot status:', err?.message || err);
      if (onError) onError(err);
    }
  );
}

export async function addCustomer(customer: Omit<Customer, 'id' | 'createdAt'>): Promise<string> {
  const docRef = await addDoc(collection(db, COLLECTION_CUSTOMERS), cleanUndefined({
    ...customer,
    createdAt: new Date().toISOString(),
  }));
  return docRef.id;
}

export async function updateCustomer(id: string, updates: Partial<Customer>): Promise<void> {
  const docRef = doc(db, COLLECTION_CUSTOMERS, id);
  await updateDoc(docRef, cleanUndefined(updates));
}

export async function deleteCustomer(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION_CUSTOMERS, id));
}

// ---------------- Inventory ----------------
export async function getInventoryItems(): Promise<InventoryItem[]> {
  try {
    const snap = await getDocs(collection(db, COLLECTION_INVENTORY));
    const items: InventoryItem[] = snap.docs.map((d) => normalizeInventoryDoc(d.id, d.data()));
    console.log(`Directly loaded ${items.length} inventory items from Firestore.`);
    return items;
  } catch (err: any) {
    console.error('Error directly loading inventory items from Firestore:', err);
    throw err;
  }
}

export function subscribeInventory(
  callback: (items: InventoryItem[]) => void,
  onError?: (error: Error) => void
): () => void {
  const q = query(collection(db, COLLECTION_INVENTORY));
  return onSnapshot(
    q,
    (snapshot) => {
      const items: InventoryItem[] = snapshot.docs.map((d) => normalizeInventoryDoc(d.id, d.data()));
      try {
        localStorage.setItem('cached_inventory', JSON.stringify(items));
      } catch {}
      callback(items);
    },
    (err) => {
      console.warn('[Firestore Realtime] Inventory snapshot notice:', err?.message || err);
      // Fallback: If permissions denied or offline, load from cached_inventory if present
      try {
        const localSaved = localStorage.getItem('cached_inventory');
        if (localSaved) {
          const parsed = JSON.parse(localSaved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            callback(parsed);
            if (onError) onError(err);
            return;
          }
        }
      } catch {}
      callback([]);
      if (onError) onError(err);
    }
  );
}

export async function addInventoryItem(item: Omit<InventoryItem, 'id' | 'updatedAt'>): Promise<string> {
  const now = new Date().toISOString();
  const payload = cleanUndefined({
    ...item,
    createdAt: (item as any).createdAt || now,
    updatedAt: now,
  });
  console.log('[Firestore Write] Adding inventory item:', payload);
  try {
    const docRef = await addDoc(collection(db, COLLECTION_INVENTORY), payload);
    console.log('[Firestore Write] Inventory item saved successfully with ID:', docRef.id);
    return docRef.id;
  } catch (err) {
    console.error('[Firestore Write] Failed to add inventory item to Firestore:', err);
    throw err;
  }
}

export async function updateInventoryItem(id: string, updates: Partial<InventoryItem>): Promise<void> {
  if (!id) throw new Error('Cannot update inventory item without document ID.');
  const now = new Date().toISOString();
  const payload = cleanUndefined({
    ...updates,
    updatedAt: now,
  });
  console.log(`[Firestore Update] Updating inventory item ${id}:`, payload);
  try {
    const docRef = doc(db, COLLECTION_INVENTORY, id);
    await updateDoc(docRef, payload);
    console.log(`[Firestore Update] Inventory item ${id} updated successfully.`);
  } catch (err) {
    console.error(`[Firestore Update] Failed to update inventory item ${id} in Firestore:`, err);
    throw err;
  }
}

export async function deleteInventoryItem(id: string): Promise<void> {
  if (!id) throw new Error('Cannot delete inventory item without document ID.');
  console.log(`[Firestore Delete] Deleting inventory item ${id}...`);
  try {
    const docRef = doc(db, COLLECTION_INVENTORY, id);
    await deleteDoc(docRef);
    console.log(`[Firestore Delete] Inventory item ${id} deleted successfully.`);
  } catch (err) {
    console.error(`[Firestore Delete] Failed to delete inventory item ${id} from Firestore:`, err);
    throw err;
  }
}

// Stock Adjustment (In / Out)
export async function adjustStock(
  itemId: string,
  itemName: string,
  adjustmentType: 'IN' | 'OUT',
  quantity: number,
  reason: string,
  performedBy: string = 'Cashier'
): Promise<void> {
  if (!itemId) return;
  try {
    const itemRef = doc(db, COLLECTION_INVENTORY, itemId);
    const itemSnap = await getDoc(itemRef);

    if (!itemSnap.exists()) {
      console.warn(`Stock adjustment skipped: Item ID ${itemId} (${itemName}) not found in database.`);
      return;
    }

    const currentData = itemSnap.data() as InventoryItem;
    const previousStock = currentData.currentStock || 0;

    let newStock = previousStock;
    let newStockIn = currentData.stockIn || 0;
    let newStockOut = currentData.stockOut || 0;

    if (adjustmentType === 'IN') {
      newStock += quantity;
      newStockIn += quantity;
    } else {
      newStock = Math.max(0, previousStock - quantity);
      newStockOut += quantity;
    }

    // 1. Update inventory
    await updateDoc(itemRef, {
      currentStock: newStock,
      stockIn: newStockIn,
      stockOut: newStockOut,
      updatedAt: new Date().toISOString(),
    });

    // 2. Add Stock Log
    const log: Omit<StockLog, 'id'> = {
      itemId,
      itemName,
      type: adjustmentType,
      quantity,
      previousStock,
      newStock,
      reason,
      timestamp: new Date().toISOString(),
      performedBy,
    };

    await addDoc(collection(db, COLLECTION_STOCK_LOGS), cleanUndefined(log));
  } catch (err) {
    console.warn(`Notice: Adjust stock issue for ${itemName}:`, err);
  }
}

export function subscribeStockLogs(callback: (logs: StockLog[]) => void): () => void {
  const q = query(collection(db, COLLECTION_STOCK_LOGS));
  return onSnapshot(
    q,
    (snapshot) => {
      const logs: StockLog[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<StockLog, 'id'>),
      }));
      // Sort newest first
      logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      callback(logs);
    },
    (err) => {
      console.warn('Stock logs snapshot status:', err?.message || err);
    }
  );
}

// ---------------- Invoices ----------------
export function formatPublicInvoiceUrl(invoiceId: string, profile?: { publicSiteDomain?: string }): string {
  const domain = profile?.publicSiteDomain?.trim();
  if (domain) {
    let cleanDomain = domain.replace(/^(https?:\/\/)?/, '');
    if (cleanDomain.endsWith('/')) {
      cleanDomain = cleanDomain.slice(0, -1);
    }
    return `https://${cleanDomain}/invoice/${invoiceId}`;
  }
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}/invoice/${invoiceId}`;
  }
  return `https://sahaab-pos.web.app/invoice/${invoiceId}`;
}

export async function createInvoice(invoiceData: Omit<Invoice, 'id'> & { createdAt?: string }, skipStockDeduction: boolean = false): Promise<string> {
  const now = (invoiceData as any).createdAt || new Date().toISOString();
  
  // 1. Generate unique document reference & ID client-side instantly
  const newDocRef = doc(collection(db, COLLECTION_INVOICES));
  const invoiceId = newDocRef.id;

  // 2. Format public site domain URL directly
  let publicUrl = `https://sahaab-pos.web.app/invoice/${invoiceId}`;
  if (invoiceData?.businessProfile?.publicSiteDomain?.trim()) {
    publicUrl = formatPublicInvoiceUrl(invoiceId, invoiceData.businessProfile);
  }

  // 3. Clean data object to remove any undefined fields
  const cleanedData = cleanUndefined({
    ...invoiceData,
    paymentStatus: invoiceData.paymentMethod === 'CREDIT_BAQAYA' ? 'UNPAID' : (invoiceData.paymentStatus || 'PAID'),
    id: invoiceId,
    publicUrl,
    createdAt: now,
  });

  // 4. Save to Firestore (directly setDoc to guarantee document persists to top-level invoices collection)
  try {
    await setDoc(newDocRef, cleanedData);
    console.log(`[Firestore Write] Invoice ${invoiceId} saved successfully to '${COLLECTION_INVOICES}' collection.`);
  } catch (e) {
    console.warn('Notice: Invoice save warning on setDoc, storing in local fallback:', e);
  }

  // Update local cache so invoice is immediately available offline or during sync
  try {
    const existingStr = localStorage.getItem('cached_invoices');
    const existingInvoices: Invoice[] = existingStr ? JSON.parse(existingStr) : [];
    if (!existingInvoices.some((inv) => inv.id === invoiceId)) {
      existingInvoices.unshift({ ...cleanedData, id: invoiceId } as Invoice);
      localStorage.setItem('cached_invoices', JSON.stringify(existingInvoices));
    }
  } catch (localErr) {
    console.warn('Failed to cache invoice locally:', localErr);
  }

  // 5. Asynchronously deduct inventory stock for sold items without blocking sale response
  if (!skipStockDeduction && Array.isArray(invoiceData.items)) {
    Promise.all(
      invoiceData.items.map(async (cartItem) => {
        if (!cartItem?.item?.id) return;
        try {
          await adjustStock(
            cartItem.item.id,
            cartItem.item.name,
            'OUT',
            cartItem.quantity || 1,
            `POS Invoice #${invoiceData.invoiceNumber}`,
            invoiceData.cashierRole || 'Cashier'
          );
        } catch (e) {
          console.warn(`Stock deduction notice for ${cartItem.item.name}:`, e);
        }
      })
    ).catch((e) => {
      console.warn('Background inventory adjustment notice:', e);
    });
  }

  return invoiceId;
}

export async function updateInvoice(id: string, updates: Partial<Invoice>): Promise<void> {
  const docRef = doc(db, COLLECTION_INVOICES, id);
  await updateDoc(docRef, cleanUndefined(updates));
}

export async function updateInvoiceDate(id: string, newCreatedAt: string): Promise<void> {
  if (!id) return;
  try {
    const docRef = doc(db, COLLECTION_INVOICES, id);
    await updateDoc(docRef, { createdAt: newCreatedAt });
  } catch (err) {
    console.warn(`Notice updating invoice date for ${id}:`, err);
  }

  try {
    const existingStr = localStorage.getItem('cached_invoices');
    if (existingStr) {
      const existingInvoices: Invoice[] = JSON.parse(existingStr);
      const idx = existingInvoices.findIndex((inv) => inv.id === id);
      if (idx !== -1) {
        existingInvoices[idx].createdAt = newCreatedAt;
        localStorage.setItem('cached_invoices', JSON.stringify(existingInvoices));
      }
    }
  } catch {}
}

export async function cancelInvoice(
  invoice: Invoice,
  cancelledBy: string = 'Admin',
  cancellationReason: string = 'Cancelled by user',
  restoreStock: boolean = true
): Promise<void> {
  if (!invoice || !invoice.id) throw new Error('Invalid invoice object provided for cancellation.');

  const now = new Date().toISOString();
  const updates: Partial<Invoice> = {
    invoiceStatus: 'Cancelled',
    cancelledAt: now,
    cancelledBy,
    cancellationReason,
    stockRestored: restoreStock,
  };

  // 1. Update invoice status in Firestore
  const docRef = doc(db, COLLECTION_INVOICES, invoice.id);
  await updateDoc(docRef, cleanUndefined(updates));
  console.log(`[Firestore Cancel] Invoice ${invoice.id} (${invoice.invoiceNumber}) status set to Cancelled.`);

  // 2. Automatically restore inventory stock if selected
  if (restoreStock && Array.isArray(invoice.items)) {
    for (const cartItem of invoice.items) {
      if (!cartItem?.item?.id) continue;
      try {
        await adjustStock(
          cartItem.item.id,
          cartItem.item.name,
          'IN',
          cartItem.quantity || 1,
          `Cancelled Invoice #${invoice.invoiceNumber}: ${cancellationReason}`,
          cancelledBy
        );
      } catch (err) {
        console.warn(`[Firestore Cancel] Notice restoring stock for item ${cartItem.item.name}:`, err);
      }
    }
  }
}

export async function getInvoiceById(id: string): Promise<Invoice | null> {
  if (!id) return null;
  const decodedId = decodeURIComponent(id).trim();

  try {
    // 1. Direct document ID lookup in Firestore
    const docRef = doc(db, COLLECTION_INVOICES, decodedId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() } as Invoice;
    }

    // 2. Query by invoiceNumber (e.g. "INV-1001" or "1001")
    const q1 = query(collection(db, COLLECTION_INVOICES), where('invoiceNumber', '==', decodedId));
    const snap1 = await getDocs(q1);
    if (!snap1.empty) {
      const d = snap1.docs[0];
      return { id: d.id, ...d.data() } as Invoice;
    }

    // 3. Query by internal 'id' field
    const q2 = query(collection(db, COLLECTION_INVOICES), where('id', '==', decodedId));
    const snap2 = await getDocs(q2);
    if (!snap2.empty) {
      const d = snap2.docs[0];
      return { id: d.id, ...d.data() } as Invoice;
    }

    // 4. Query with/without 'INV-' prefix
    const invPrefixed = decodedId.startsWith('INV-') ? decodedId.replace('INV-', '') : `INV-${decodedId}`;
    const q3 = query(collection(db, COLLECTION_INVOICES), where('invoiceNumber', '==', invPrefixed));
    const snap3 = await getDocs(q3);
    if (!snap3.empty) {
      const d = snap3.docs[0];
      return { id: d.id, ...d.data() } as Invoice;
    }

    // 5. Query all docs in invoices collection as fallback match
    const allSnap = await getDocs(collection(db, COLLECTION_INVOICES));
    const foundDoc = allSnap.docs.find((d) => {
      const data = d.data() as Invoice;
      return (
        d.id === decodedId ||
        data.id === decodedId ||
        data.invoiceNumber === decodedId ||
        data.invoiceNumber === invPrefixed
      );
    });
    if (foundDoc) {
      return { id: foundDoc.id, ...foundDoc.data() } as Invoice;
    }

    // 5b. Search in manualBills collection
    const mbDocRef = doc(db, COLLECTION_MANUAL_BILLS, decodedId);
    const mbSnap = await getDoc(mbDocRef);
    if (mbSnap.exists()) {
      return { id: mbSnap.id, ...mbSnap.data() } as Invoice;
    }

    const qMb1 = query(collection(db, COLLECTION_MANUAL_BILLS), where('invoiceNumber', '==', decodedId));
    const snapMb1 = await getDocs(qMb1);
    if (!snapMb1.empty) {
      const d = snapMb1.docs[0];
      return { id: d.id, ...d.data() } as Invoice;
    }

    const qMb2 = query(collection(db, COLLECTION_MANUAL_BILLS), where('id', '==', decodedId));
    const snapMb2 = await getDocs(qMb2);
    if (!snapMb2.empty) {
      const d = snapMb2.docs[0];
      return { id: d.id, ...d.data() } as Invoice;
    }

    const qMb3 = query(collection(db, COLLECTION_MANUAL_BILLS), where('invoiceNumber', '==', invPrefixed));
    const snapMb3 = await getDocs(qMb3);
    if (!snapMb3.empty) {
      const d = snapMb3.docs[0];
      return { id: d.id, ...d.data() } as Invoice;
    }

    const allMbSnap = await getDocs(collection(db, COLLECTION_MANUAL_BILLS));
    const foundMbDoc = allMbSnap.docs.find((d) => {
      const data = d.data() as Invoice;
      return (
        d.id === decodedId ||
        data.id === decodedId ||
        data.invoiceNumber === decodedId ||
        data.invoiceNumber === invPrefixed
      );
    });
    if (foundMbDoc) {
      return { id: foundMbDoc.id, ...foundMbDoc.data() } as Invoice;
    }

    // 6. Check if decodedId is a ZATCA Base64 TLV payload
    const zatcaFields = decodeZatcaTlvBase64(decodedId);
    if (zatcaFields && zatcaFields.sellerName && zatcaFields.totalWithVat) {
      const total = Number(zatcaFields.totalWithVat) || 0;
      const vat = Number(zatcaFields.vatTotal) || 0;
      const subtotal = total - vat;

      const dynamicInvoice: Invoice = {
        id: decodedId,
        invoiceNumber: 'ZATCA-E-INVOICE',
        paymentMethod: 'MADA',
        paymentStatus: 'PAID',
        isWalkIn: true,
        items: [
          {
            item: {
              id: 'zatca-item-1',
              name: 'ZATCA E-Invoice Transaction',
              size: '1 Item',
              price: subtotal,
              category: 'Taxable Goods / Services',
              currentStock: 1,
              stockIn: 1,
              stockOut: 0,
              vatRate: 15,
              updatedAt: zatcaFields.timestamp || new Date().toISOString(),
              hasWeightPricing: false,
            },
            quantity: 1,
            unitPrice: subtotal,
            vatRate: 15,
            lineSubtotal: Number(subtotal.toFixed(2)),
            lineVat: Number(vat.toFixed(2)),
            lineTotal: Number(total.toFixed(2)),
          },
        ],
        subtotal: Number(subtotal.toFixed(2)),
        vatTotal: Number(vat.toFixed(2)),
        grandTotal: Number(total.toFixed(2)),
        createdAt: zatcaFields.timestamp || new Date().toISOString(),
        cashierRole: 'Cashier',
        businessProfile: {
          businessName: zatcaFields.sellerName,
          businessNameAr: zatcaFields.sellerName,
          crNumber: '',
          vatNumber: zatcaFields.vatNumber,
          phone: '',
          address: 'Saudi Arabia',
          currency: 'SAR',
          defaultVatRate: 15,
          publicSiteDomain: 'sahaab-pos.web.app',
        },
      };
      return dynamicInvoice;
    }

    return null;
  } catch (err) {
    console.error('Error fetching invoice by ID:', err);
    return null;
  }
}

export function subscribeInvoices(
  callback: (invoices: Invoice[]) => void,
  onError?: (error: Error) => void
): () => void {
  const q = query(collection(db, COLLECTION_INVOICES));
  return onSnapshot(
    q,
    (snapshot) => {
      const invoices: Invoice[] = snapshot.docs.map((d) => normalizeInvoiceDoc(d.id, d.data()));

      // Merge with offline cached invoices if any doc hasn't synced yet
      try {
        const localSaved = localStorage.getItem('cached_invoices');
        if (localSaved) {
          const cachedInvoices: Invoice[] = JSON.parse(localSaved);
          if (Array.isArray(cachedInvoices)) {
            for (const cached of cachedInvoices) {
              if (cached?.id && !invoices.some((inv) => inv.id === cached.id)) {
                invoices.push(cached);
              }
            }
          }
        }
      } catch {}

      // Sort newest first
      invoices.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      try {
        localStorage.setItem('cached_invoices', JSON.stringify(invoices));
      } catch {}

      callback(invoices);
    },
    (err) => {
      console.warn('Invoices snapshot status:', err?.message || err);
      try {
        const localSaved = localStorage.getItem('cached_invoices');
        if (localSaved) {
          const cachedInvoices: Invoice[] = JSON.parse(localSaved);
          if (Array.isArray(cachedInvoices) && cachedInvoices.length > 0) {
            callback(cachedInvoices);
            if (onError) onError(err);
            return;
          }
        }
      } catch {}
      callback([]);
      if (onError) onError(err);
    }
  );
}

// ---------------- Quotations ----------------
export async function createQuotation(quotationData: Omit<Quotation, 'id' | 'createdAt'>): Promise<string> {
  const now = new Date().toISOString();
  const docRef = await addDoc(collection(db, COLLECTION_QUOTATIONS), cleanUndefined({
    ...quotationData,
    createdAt: now,
  }));
  const id = docRef.id;
  await updateDoc(docRef, { id });
  return id;
}

export async function deleteQuotation(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION_QUOTATIONS, id));
}

export function subscribeQuotations(callback: (quotations: Quotation[]) => void): () => void {
  const q = query(collection(db, COLLECTION_QUOTATIONS));
  return onSnapshot(
    q,
    (snapshot) => {
      const quotations: Quotation[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Quotation, 'id'>),
      }));
      // Sort newest first
      quotations.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      callback(quotations);
    },
    (err) => {
      console.warn('Quotations snapshot status:', err?.message || err);
    }
  );
}

// ---------------- Quotation Clients ----------------
export function subscribeQuotationClients(callback: (clients: QuotationClient[]) => void): () => void {
  const q = query(collection(db, COLLECTION_QUOTATION_CLIENTS));
  return onSnapshot(
    q,
    (snapshot) => {
      const clients: QuotationClient[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<QuotationClient, 'id'>),
      }));
      clients.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      callback(clients);
    },
    (err) => {
      console.warn('Quotation Clients snapshot status:', err?.message || err);
    }
  );
}

export async function saveOrUpdateQuotationClient(client: {
  name: string;
  taxNumber?: string;
  crNumber?: string;
  phone?: string;
}): Promise<string> {
  const nameTrimmed = client.name.trim();
  if (!nameTrimmed) return '';

  const snap = await getDocs(collection(db, COLLECTION_QUOTATION_CLIENTS));
  const existingDoc = snap.docs.find(
    (d) => ((d.data() as QuotationClient).name || '').trim().toLowerCase() === nameTrimmed.toLowerCase()
  );

  const now = new Date().toISOString();
  if (existingDoc) {
    const existingId = existingDoc.id;
    const docRef = doc(db, COLLECTION_QUOTATION_CLIENTS, existingId);
    const updates: Partial<QuotationClient> = {
      updatedAt: now,
    };
    if (client.taxNumber !== undefined) updates.taxNumber = client.taxNumber.trim() || undefined;
    if (client.crNumber !== undefined) updates.crNumber = client.crNumber.trim() || undefined;
    if (client.phone !== undefined) updates.phone = client.phone.trim() || undefined;

    await updateDoc(docRef, cleanUndefined(updates));
    return existingId;
  } else {
    const newDocData: Omit<QuotationClient, 'id'> = {
      name: nameTrimmed,
      taxNumber: client.taxNumber?.trim() || undefined,
      crNumber: client.crNumber?.trim() || undefined,
      phone: client.phone?.trim() || undefined,
      createdAt: now,
      updatedAt: now,
    };
    const docRef = await addDoc(collection(db, COLLECTION_QUOTATION_CLIENTS), cleanUndefined(newDocData));
    await updateDoc(docRef, { id: docRef.id });
    return docRef.id;
  }
}

export async function deleteQuotationClient(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION_QUOTATION_CLIENTS, id));
}

// ---------------- Manual Bills ----------------
export async function createManualBill(invoiceData: Omit<Invoice, 'id' | 'createdAt'>): Promise<string> {
  const now = new Date().toISOString();
  
  // 1. Generate unique document reference & ID client-side instantly
  const newDocRef = doc(collection(db, COLLECTION_MANUAL_BILLS));
  const billId = newDocRef.id;

  // 2. Format public site domain URL directly
  let publicUrl = `https://sahaab-pos.web.app/invoice/${billId}`;
  if (invoiceData?.businessProfile?.publicSiteDomain?.trim()) {
    publicUrl = formatPublicInvoiceUrl(billId, invoiceData.businessProfile);
  }

  // 3. Clean data object to remove any undefined fields
  const cleanedData = cleanUndefined({
    ...invoiceData,
    paymentStatus: invoiceData.paymentMethod === 'CREDIT_BAQAYA' ? 'UNPAID' : (invoiceData.paymentStatus || 'PAID'),
    id: billId,
    publicUrl,
    createdAt: now,
  });

  // 4. Save to Firestore
  try {
    const savePromise = setDoc(newDocRef, cleanedData);
    const fastTimeout = new Promise((resolve) => setTimeout(resolve, 2000));
    await Promise.race([savePromise, fastTimeout]);
  } catch (e) {
    console.warn('Notice: Manual Bill save proceeding locally / in background:', e);
  }

  return billId;
}

export async function deleteManualBill(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION_MANUAL_BILLS, id));
}

export function subscribeManualBills(callback: (bills: Invoice[]) => void): () => void {
  const q = query(collection(db, COLLECTION_MANUAL_BILLS));
  return onSnapshot(
    q,
    (snapshot) => {
      const bills: Invoice[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Invoice, 'id'>),
      }));
      // Sort newest first
      bills.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      callback(bills);
    },
    (err) => {
      console.warn('Manual Bills snapshot status:', err?.message || err);
    }
  );
}

// ---------------- Manual Bill Clients ----------------
export function subscribeManualBillClients(callback: (clients: ManualBillClient[]) => void): () => void {
  const q = query(collection(db, COLLECTION_MANUAL_BILL_CLIENTS));
  return onSnapshot(
    q,
    (snapshot) => {
      const clients: ManualBillClient[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<ManualBillClient, 'id'>),
      }));
      clients.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      callback(clients);
    },
    (err) => {
      console.warn('Manual Bill Clients snapshot status:', err?.message || err);
    }
  );
}

export async function saveOrUpdateManualBillClient(client: {
  name: string;
  taxNumber?: string;
  crNumber?: string;
  phone?: string;
}): Promise<string> {
  const nameTrimmed = client.name.trim();
  if (!nameTrimmed) return '';

  const snap = await getDocs(collection(db, COLLECTION_MANUAL_BILL_CLIENTS));
  const existingDoc = snap.docs.find(
    (d) => ((d.data() as ManualBillClient).name || '').trim().toLowerCase() === nameTrimmed.toLowerCase()
  );

  const now = new Date().toISOString();
  if (existingDoc) {
    const existingId = existingDoc.id;
    const docRef = doc(db, COLLECTION_MANUAL_BILL_CLIENTS, existingId);
    const updates: Partial<ManualBillClient> = {
      updatedAt: now,
    };
    if (client.taxNumber !== undefined) updates.taxNumber = client.taxNumber.trim() || undefined;
    if (client.crNumber !== undefined) updates.crNumber = client.crNumber.trim() || undefined;
    if (client.phone !== undefined) updates.phone = client.phone.trim() || undefined;

    await updateDoc(docRef, cleanUndefined(updates));
    return existingId;
  } else {
    const newDocData: Omit<ManualBillClient, 'id'> = {
      name: nameTrimmed,
      taxNumber: client.taxNumber?.trim() || undefined,
      crNumber: client.crNumber?.trim() || undefined,
      phone: client.phone?.trim() || undefined,
      createdAt: now,
      updatedAt: now,
    };
    const docRef = await addDoc(collection(db, COLLECTION_MANUAL_BILL_CLIENTS), cleanUndefined(newDocData));
    await updateDoc(docRef, { id: docRef.id });
    return docRef.id;
  }
}

export async function deleteManualBillClient(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION_MANUAL_BILL_CLIENTS, id));
}

// ---------------- Database Backup & Migration (Export / Import) ----------------
export async function exportDatabaseBackup(): Promise<any> {
  const [
    settingsSnap,
    merchantSnap,
    inventorySnap,
    customersSnap,
    invoicesSnap,
    quotationsSnap,
    manualBillsSnap,
  ] = await Promise.all([
    getDocs(collection(db, COLLECTION_SETTINGS)),
    getDocs(collection(db, COLLECTION_MERCHANT_SETTINGS)),
    getDocs(collection(db, COLLECTION_INVENTORY)),
    getDocs(collection(db, COLLECTION_CUSTOMERS)),
    getDocs(collection(db, COLLECTION_INVOICES)),
    getDocs(collection(db, COLLECTION_QUOTATIONS)),
    getDocs(collection(db, COLLECTION_MANUAL_BILLS)),
  ]);

  const backupData = {
    backupVersion: '1.0',
    exportedAt: new Date().toISOString(),
    settings: settingsSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
    merchantSettings: merchantSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
    inventory: inventorySnap.docs.map((d) => ({ id: d.id, ...d.data() })),
    customers: customersSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
    invoices: invoicesSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
    quotations: quotationsSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
    manualBills: manualBillsSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
  };

  if (typeof window !== 'undefined') {
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sahab-pos-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return backupData;
}

export async function importDatabaseBackup(backup: any): Promise<{ importedCount: number }> {
  if (!backup || typeof backup !== 'object') {
    throw new Error('Invalid backup file format / صيغة ملف النسخة الاحتياطية غير صالحة');
  }

  let count = 0;

  if (Array.isArray(backup.settings)) {
    for (const item of backup.settings) {
      const { id, ...data } = item;
      if (id) {
        await setDoc(doc(db, COLLECTION_SETTINGS, id), cleanUndefined(data), { merge: true });
        count++;
      }
    }
  }

  if (Array.isArray(backup.merchantSettings)) {
    for (const item of backup.merchantSettings) {
      const { id, ...data } = item;
      if (id) {
        await setDoc(doc(db, COLLECTION_MERCHANT_SETTINGS, id), cleanUndefined(data), { merge: true });
        count++;
      }
    }
  }

  if (Array.isArray(backup.inventory)) {
    for (const item of backup.inventory) {
      const { id, ...data } = item;
      if (id) {
        await setDoc(doc(db, COLLECTION_INVENTORY, id), cleanUndefined(data), { merge: true });
        count++;
      }
    }
  }

  if (Array.isArray(backup.customers)) {
    for (const item of backup.customers) {
      const { id, ...data } = item;
      if (id) {
        await setDoc(doc(db, COLLECTION_CUSTOMERS, id), cleanUndefined(data), { merge: true });
        count++;
      }
    }
  }

  if (Array.isArray(backup.invoices)) {
    for (const item of backup.invoices) {
      const { id, ...data } = item;
      if (id) {
        await setDoc(doc(db, COLLECTION_INVOICES, id), cleanUndefined(data), { merge: true });
        count++;
      }
    }
  }

  if (Array.isArray(backup.quotations)) {
    for (const item of backup.quotations) {
      const { id, ...data } = item;
      if (id) {
        await setDoc(doc(db, COLLECTION_QUOTATIONS, id), cleanUndefined(data), { merge: true });
        count++;
      }
    }
  }

  if (Array.isArray(backup.manualBills)) {
    for (const item of backup.manualBills) {
      const { id, ...data } = item;
      if (id) {
        await setDoc(doc(db, COLLECTION_MANUAL_BILLS, id), cleanUndefined(data), { merge: true });
        count++;
      }
    }
  }

  return { importedCount: count };
}


