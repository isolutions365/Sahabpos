import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  UserCheck,
  UserPlus,
  Scale,
  Edit3,
  Check,
  CreditCard,
  Banknote,
  Building,
  Clock,
  Barcode,
  AlertTriangle,
  Package,
} from 'lucide-react';
import { BusinessProfile, CartItem, Customer, InventoryItem, Invoice, UserRole } from '../types';
import { createInvoice } from '../services/dbService';

interface PosScreenProps {
  inventory: InventoryItem[];
  customers: Customer[];
  businessProfile: BusinessProfile;
  userRole: UserRole;
  isLoadingInventory?: boolean;
  inventoryError?: string | null;
  onInvoiceCreated: (invoice: Invoice) => void;
  onNavigateToCustomers: () => void;
}

export const PosScreen: React.FC<PosScreenProps> = ({
  inventory,
  customers,
  businessProfile,
  userRole,
  isLoadingInventory,
  inventoryError,
  onInvoiceCreated,
  onNavigateToCustomers,
}) => {

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('posCart');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error('Failed to parse saved cart from localStorage', e);
      return [];
    }
  });

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('posCart', JSON.stringify(cart));
    } catch (e) {
      console.error('Failed to save cart to localStorage', e);
    }
  }, [cart]);
  
  // Customer Selection (Walk-in or saved customer)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerType, setCustomerType] = useState<'WALK_IN' | 'BAQAYA' | 'CUSTOM_CASH'>('WALK_IN');
  const [customCustomerName, setCustomCustomerName] = useState('');
  const [customCustomerTax, setCustomCustomerTax] = useState('');
  const [customCustomerCr, setCustomCustomerCr] = useState('');
  const [dropdownSearchQuery, setDropdownSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Customize Invoice Title
  const [isCustomTitleEnabled, setIsCustomTitleEnabled] = useState(false);
  const [customTitle, setCustomTitle] = useState('');

  // Weight Entry Modal State
  const [weightModalItem, setWeightModalItem] = useState<InventoryItem | null>(null);
  const [inputWeight, setInputWeight] = useState<string>('1');

  // Payment Method
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'MADA' | 'BANK_TRANSFER' | 'CREDIT_BAQAYA'>('MADA');
  const [lastNonCreditPaymentMethod, setLastNonCreditPaymentMethod] = useState<'CASH' | 'MADA' | 'BANK_TRANSFER'>('MADA');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  // Track last used non-credit payment method
  useEffect(() => {
    if (paymentMethod !== 'CREDIT_BAQAYA') {
      setLastNonCreditPaymentMethod(paymentMethod);
    }
  }, [paymentMethod]);

  const prevCustomerType = useRef(customerType);

  // Auto-sync customer type and payment method
  useEffect(() => {
    if (prevCustomerType.current !== customerType) {
      if (customerType === 'BAQAYA') {
        setPaymentMethod('CREDIT_BAQAYA');
      } else {
        if (paymentMethod === 'CREDIT_BAQAYA') {
          setPaymentMethod(lastNonCreditPaymentMethod);
        }
        setIsCustomTitleEnabled(false);
        setCustomTitle('');
      }
      prevCustomerType.current = customerType;
    }
  }, [customerType, lastNonCreditPaymentMethod, paymentMethod]);

  // Keep safety enforcer to prevent credit for cash customers
  useEffect(() => {
    if ((customerType === 'WALK_IN' || customerType === 'CUSTOM_CASH') && paymentMethod === 'CREDIT_BAQAYA') {
      setPaymentMethod(lastNonCreditPaymentMethod);
    }
  }, [customerType, paymentMethod, lastNonCreditPaymentMethod]);

  // Barcode Scanner Integration
  const [manualBarcode, setManualBarcode] = useState('');
  const [lastScannedItem, setLastScannedItem] = useState<{ name: string; sku: string } | null>(null);
  const [scanStatus, setScanStatus] = useState<'success' | 'not_found' | null>(null);
  const scannerBuffer = useRef<string>('');
  const lastKeyTime = useRef<number>(0);

  // Clean scanAndAddToCart function to avoid stale closures
  const scanAndAddToCart = (item: InventoryItem) => {
    if (item.hasWeightPricing) {
      setWeightModalItem(item);
      setInputWeight('1');
      return;
    }

    setCart((prevCart) => {
      const existingIndex = prevCart.findIndex((c) => c.item.id === item.id);
      if (existingIndex > -1) {
        const existing = prevCart[existingIndex];
        const newQty = existing.quantity + 1;
        const updatedItem = calculateCartItem(item, newQty, undefined, existing.vatRate);
        const newCart = [...prevCart];
        newCart[existingIndex] = updatedItem;
        return newCart;
      } else {
        const newItem = calculateCartItem(item, 1, undefined, item.vatRate ?? businessProfile.defaultVatRate ?? 15);
        return [...prevCart, newItem];
      }
    });
  };

  const handleScanOrTypeBarcode = (barcodeVal: string): boolean => {
    const cleanBarcode = barcodeVal.trim();
    if (!cleanBarcode) return false;

    const foundItem = inventory.find(
      (item) =>
        (item.barcode && item.barcode.trim().toUpperCase() === cleanBarcode.toUpperCase()) ||
        (item.sku && item.sku.trim().toUpperCase() === cleanBarcode.toUpperCase())
    );

    if (foundItem) {
      scanAndAddToCart(foundItem);
      setLastScannedItem({ name: foundItem.name, sku: foundItem.barcode || foundItem.sku || '' });
      setScanStatus('success');
      setTimeout(() => {
        setScanStatus((prev) => (prev === 'success' ? null : prev));
      }, 3000);
      return true;
    } else {
      setLastScannedItem({ name: 'Barcode not recognized / الباركود غير معروف', sku: cleanBarcode });
      setScanStatus('not_found');
      setTimeout(() => {
        setScanStatus((prev) => (prev === 'not_found' ? null : prev));
      }, 4000);
      return false;
    }
  };

  const handleManualBarcodeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const success = handleScanOrTypeBarcode(manualBarcode);
      if (success) {
        setManualBarcode('');
      }
    }
  };

  const cartRef = useRef(cart);
  cartRef.current = cart;
  const isSubmittingRef = useRef(isSubmitting);
  isSubmittingRef.current = isSubmitting;
  const weightModalItemRef = useRef(weightModalItem);
  weightModalItemRef.current = weightModalItem;
  const handleCheckoutRef = useRef<() => void>(() => {});

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore modifier keys
      if (e.ctrlKey || e.altKey || e.metaKey) {
        return;
      }

      const activeEl = document.activeElement;
      const isInputFocused = activeEl && (
        activeEl.tagName === 'INPUT' || 
        activeEl.tagName === 'TEXTAREA' || 
        activeEl.getAttribute('contenteditable') === 'true'
      );

      const now = Date.now();
      const diff = now - lastKeyTime.current;
      lastKeyTime.current = now;

      // Reset buffer if delay since last keypress is too long
      if (diff > 1000) {
        scannerBuffer.current = '';
      }

      if (e.key === 'Enter') {
        const barcode = scannerBuffer.current.trim();
        if (barcode.length > 0) {
          e.preventDefault();
          handleScanOrTypeBarcode(barcode);
          scannerBuffer.current = '';
        } else if (!isInputFocused && !weightModalItemRef.current && cartRef.current.length > 0 && !isSubmittingRef.current) {
          e.preventDefault();
          handleCheckoutRef.current();
        }
      } else if (e.key === 'Delete') {
        if (!isInputFocused && !weightModalItemRef.current && cartRef.current.length > 0 && !isSubmittingRef.current) {
          e.preventDefault();
          setCart([]);
        }
      } else if (e.key.length === 1) {
        // Collect alphanumeric, space, hyphens or dashes
        const isAlphanumericOrSymbol = /^[a-zA-Z0-9\-_ ]$/.test(e.key);
        if (isAlphanumericOrSymbol) {
          if (isInputFocused) {
            // Speed constraint: USB scanner types key events almost instantly (diff <= 50ms)
            if (diff <= 50) {
              scannerBuffer.current += e.key;
            } else {
              scannerBuffer.current = ''; // Reset buffer on manual typing
            }
          } else {
            scannerBuffer.current += e.key;
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [inventory, businessProfile]);

  // Categories list
  const categories = ['ALL', ...Array.from(new Set(inventory.map((i) => i.category || 'General')))];

  // Filter items
  const filteredInventory = inventory.filter((item) => {
    const term = searchTerm.toLowerCase();
    const engName = (item.productNameEnglish || item.name || '').toLowerCase();
    const arName = (item.productNameArabic || item.nameAr || '');
    const sku = (item.sku || '').toLowerCase();
    const barcode = (item.barcode || '').toLowerCase();

    const matchesSearch =
      engName.includes(term) ||
      arName.includes(searchTerm) ||
      sku.includes(term) ||
      barcode.includes(term);

    const matchesCategory = selectedCategory === 'ALL' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Filter customers for dropdown
  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
      (c.phone && c.phone.includes(customerSearch)) ||
      (c.taxNumber && c.taxNumber.includes(customerSearch))
  );

  // Helper to calculate totals for a item
  const calculateCartItem = (
    item: InventoryItem,
    quantity: number,
    weight?: number,
    vatRate: number = businessProfile.defaultVatRate ?? 15
  ): CartItem => {
    const safePrice = Number(item.price) || 0;
    const safeVatRate = Number(vatRate) || 15;
    const safeQty = Number(quantity) || 1;
    const safeWeight = weight !== undefined ? Number(weight) || 0 : undefined;

    const isWeight = item.hasWeightPricing && safeWeight !== undefined && safeWeight > 0;
    const lineTotal = isWeight ? safeWeight * safePrice : safeQty * safePrice;
    const lineSubtotal = lineTotal / (1 + safeVatRate / 100);
    const lineVat = lineTotal - lineSubtotal;

    return {
      item,
      quantity: isWeight ? 1 : safeQty,
      weight: isWeight ? safeWeight : undefined,
      unitPrice: safePrice,
      vatRate: safeVatRate,
      lineSubtotal: Number(lineSubtotal.toFixed(4)),
      lineVat: Number(lineVat.toFixed(4)),
      lineTotal: Number(lineTotal.toFixed(2)),
    };
  };

  // Add Item to Cart
  const handleItemClick = (item: InventoryItem) => {
    if (item.hasWeightPricing) {
      setWeightModalItem(item);
      setInputWeight('1');
      return;
    }

    const existingIndex = cart.findIndex((c) => c.item.id === item.id);
    if (existingIndex > -1) {
      const existing = cart[existingIndex];
      const newQty = existing.quantity + 1;
      const updatedItem = calculateCartItem(item, newQty, undefined, existing.vatRate);
      const newCart = [...cart];
      newCart[existingIndex] = updatedItem;
      setCart(newCart);
    } else {
      const newItem = calculateCartItem(item, 1, undefined, item.vatRate ?? businessProfile.defaultVatRate ?? 15);
      setCart([...cart, newItem]);
    }
  };

  // Confirm Weight Modal
  const handleConfirmWeight = () => {
    if (!weightModalItem) return;
    const weightNum = parseFloat(inputWeight) || 1;

    const existingIndex = cart.findIndex((c) => c.item.id === weightModalItem.id);
    if (existingIndex > -1) {
      const existing = cart[existingIndex];
      const newWeight = (existing.weight || 0) + weightNum;
      const updatedItem = calculateCartItem(weightModalItem, 1, newWeight, existing.vatRate);
      const newCart = [...cart];
      newCart[existingIndex] = updatedItem;
      setCart(newCart);
    } else {
      const newItem = calculateCartItem(weightModalItem, 1, weightNum, weightModalItem.vatRate ?? businessProfile.defaultVatRate ?? 15);
      setCart([...cart, newItem]);
    }

    setWeightModalItem(null);
  };

  // Update Cart Quantity
  const updateQuantity = (index: number, delta: number) => {
    const cartItem = cart[index];
    if (cartItem.item.hasWeightPricing && cartItem.weight !== undefined) {
      // Delta adjusts weight by 0.5kg
      const newWeight = Math.max(0.1, +(cartItem.weight + delta * 0.5).toFixed(2));
      const updated = calculateCartItem(cartItem.item, 1, newWeight, cartItem.vatRate);
      const newCart = [...cart];
      newCart[index] = updated;
      setCart(newCart);
    } else {
      const newQty = cartItem.quantity + delta;
      if (newQty <= 0) {
        removeFromCart(index);
        return;
      }
      const updated = calculateCartItem(cartItem.item, newQty, undefined, cartItem.vatRate);
      const newCart = [...cart];
      newCart[index] = updated;
      setCart(newCart);
    }
  };

  // Update Item VAT Rate live
  const updateItemVat = (index: number, newVat: number) => {
    const cartItem = cart[index];
    const updated = calculateCartItem(
      cartItem.item,
      cartItem.quantity,
      cartItem.weight,
      newVat
    );
    const newCart = [...cart];
    newCart[index] = updated;
    setCart(newCart);
  };

  const removeFromCart = (index: number) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  // Cart Running Totals
  const subtotal = cart.reduce((acc, c) => acc + c.lineSubtotal, 0);
  const vatTotal = cart.reduce((acc, c) => acc + c.lineVat, 0);
  const grandTotal = subtotal + vatTotal;

  // Submit Invoice / Complete Checkout
  const handleCheckout = async () => {
    handleCheckoutRef.current = handleCheckout;
    if (cart.length === 0 || isSubmitting) return;

    setCheckoutError(null);

    // Validate CREDIT_BAQAYA payment method
    if (paymentMethod === 'CREDIT_BAQAYA' && customerType !== 'BAQAYA') {
      const msg = 'Credit (Baqaya) payment method can only be used with registered Baqaya customers.\nيجب اختيار عميل آجل عند تحديد طريقة الدفع آجل (Baqaya).';
      setCheckoutError(msg);
      alert(msg);
      setIsSubmitting(false);
      return;
    }
    if (paymentMethod === 'CREDIT_BAQAYA' && !selectedCustomer) {
      const msg = 'Please select a Baqaya customer for Credit sales.\nالرجاء اختيار العميل للبيع الآجل.';
      setCheckoutError(msg);
      alert(msg);
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(true);
    try {
      const invNum = `INV-${Date.now().toString().slice(-6)}`;
      
      let invoiceCustomer: Customer | undefined = undefined;
      let isWalkInVal = true;

      if (customerType === 'BAQAYA') {
        invoiceCustomer = selectedCustomer || undefined;
        isWalkInVal = paymentMethod !== 'CREDIT_BAQAYA' || !selectedCustomer;
      } else if (customerType === 'CUSTOM_CASH') {
        invoiceCustomer = {
          id: 'custom-cash',
          name: customCustomerName.trim() || 'Custom Customer / عميل مخصص',
          taxNumber: customCustomerTax.trim() || undefined,
          crNumber: customCustomerCr.trim() || undefined,
          createdAt: new Date().toISOString(),
        };
        isWalkInVal = true;
      } else {
        // WALK_IN
        invoiceCustomer = undefined;
        isWalkInVal = true;
      }

      const invoiceData: Omit<Invoice, 'id' | 'createdAt'> = {
        invoiceNumber: invNum,
        customTitle: isCustomTitleEnabled && customTitle.trim() ? customTitle.trim() : undefined,
        businessProfile,
        customer: invoiceCustomer,
        isWalkIn: isWalkInVal,
        items: cart,
        subtotal,
        vatTotal,
        grandTotal,
        paymentMethod,
        paymentStatus: paymentMethod === 'CREDIT_BAQAYA' ? 'UNPAID' : 'PAID',
        cashierRole: userRole,
        invoiceStatus: 'Active',
      };

      // 12-second timeout safety guard
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error('Connection timeout (12s). Something went wrong, please try again / تعذر إكمال العملية، يرجى المحاولة مرة أخرى'));
        }, 12000);
      });

      const newId = await Promise.race([createInvoice(invoiceData), timeoutPromise]);

      const createdInvoice: Invoice = {
        ...invoiceData,
        id: newId,
        createdAt: new Date().toISOString(),
        publicUrl: `https://waseela-pos.web.app/invoice/${newId}`,
      };

      // Clear cart
      setCart([]);
      setIsCustomTitleEnabled(false);
      setCustomTitle('');
      setSelectedCustomer(null);
      setCustomerType('WALK_IN');
      setCustomCustomerName('');
      setCustomCustomerTax('');
      setCustomCustomerCr('');
      setCheckoutError(null);

      // Trigger receipt popup modal
      onInvoiceCreated(createdInvoice);
    } catch (err: any) {
      console.error('POS Checkout Error details:', err);
      const msg = err?.message || 'Something went wrong, please try again / حدث خطأ أثناء الحفظ، يرجى المحاولة مرة أخرى';
      setCheckoutError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">


      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: PRODUCTS GRID (7 Cols on desktop) */}
        <div className="lg:col-span-7 flex flex-col space-y-4">
          


          {/* Scanning Alerts */}
          {scanStatus && (
            <div
              className={`p-3 rounded-xl border flex items-center justify-between shadow-sm animate-in fade-in slide-in-from-top-3 duration-250 ${
                scanStatus === 'success'
                  ? 'bg-indigo-50 border-indigo-200 text-indigo-950'
                  : 'bg-rose-50 border-rose-200 text-rose-950'
              }`}
            >
              <div className="flex items-center space-x-3 rtl:space-x-reverse">
                <div
                  className={`p-1.5 rounded-lg ${
                    scanStatus === 'success' ? 'bg-indigo-100 text-indigo-700' : 'bg-rose-100 text-rose-700'
                  }`}
                >
                  {scanStatus === 'success' ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <AlertTriangle className="w-4 h-4" />
                  )}
                </div>
                <div>
                  <span className="text-[9px] uppercase tracking-wider font-extrabold block opacity-75">
                    {scanStatus === 'success' ? 'Product Scanned / تم مسح المنتج بنجاح' : 'Product Not Found / لم يتم العثور على المنتج'}
                  </span>
                  <span className="text-xs font-bold block leading-tight">
                    {lastScannedItem?.name}
                  </span>
                  {lastScannedItem?.sku && (
                    <span className="text-[9.5px] font-mono text-slate-500 block">
                      SKU/Code: {lastScannedItem.sku}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => setScanStatus(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm px-2 py-1"
              >
                ✕
              </button>
            </div>
          )}
          
          {/* Search & Category Filter */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 space-y-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  placeholder="Search items by name, SKU, category... / ابحث عن منتج"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#4338CA] focus:border-[#4338CA] transition-all text-slate-900"
                />
              </div>

              {/* Barcode Focus/Input Field */}
              <div className="relative w-full sm:w-64">
                <Barcode className="w-4 h-4 text-[#4338CA] absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  placeholder="Scan or type barcode... / الباركود"
                  value={manualBarcode}
                  onChange={(e) => setManualBarcode(e.target.value)}
                  onKeyDown={handleManualBarcodeKeyDown}
                  className="w-full pl-11 pr-4 py-2.5 bg-indigo-50/50 border border-indigo-200 rounded-lg text-xs font-mono font-bold text-indigo-950 placeholder-indigo-600/60 focus:outline-none focus:ring-1 focus:ring-[#4338CA] focus:border-[#4338CA] transition-all"
                />
              </div>
            </div>

            {/* Category Pills */}
            <div className="flex space-x-2 overflow-x-auto pb-1 scrollbar-none">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                    selectedCategory === cat
                      ? 'bg-[#4338CA] text-white shadow'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cat === 'ALL' ? 'All Items (الكل)' : cat}
                </button>
              ))}
            </div>
          </div>

          {/* Product Items Cards Grid */}
          {isLoadingInventory ? (
            <div className="bg-white border border-slate-200 rounded-xl p-8 text-center space-y-2">
              <div className="w-6 h-6 border-2 border-[#4338CA] border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-xs font-bold text-slate-700">Loading live inventory from Firebase... / جاري جلب المخزون من قاعدة البيانات</p>
            </div>
          ) : inventoryError ? (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-xs text-rose-900 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0" />
              <div>
                <p className="font-bold">Firebase Inventory Sync Warning</p>
                <p className="text-[11px] text-rose-700">{inventoryError}</p>
              </div>
            </div>
          ) : filteredInventory.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-8 text-center space-y-2">
              <Package className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-xs font-bold text-slate-700">No inventory items found / لا يوجد منتجات في المخزون</p>
              <p className="text-[11px] text-slate-400">Add products in the Inventory tab to start selling / أضف منتجات من شاشة المخزون</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {filteredInventory.map((item) => {
                const isLowStock = item.currentStock <= (item.lowStockThreshold !== undefined ? item.lowStockThreshold : 5);
                const isOutOfStock = item.currentStock <= 0;

                return (
                  <button
                    key={item.id}
                    onClick={() => !isOutOfStock && handleItemClick(item)}
                    disabled={isOutOfStock}
                    className={`text-left p-3 rounded-xl border transition-all flex flex-col justify-between relative group ${
                      isOutOfStock
                        ? 'bg-slate-100 border-slate-200 opacity-60 cursor-not-allowed'
                        : 'bg-white border-slate-200 hover:border-[#4338CA] hover:shadow-sm active:scale-98'
                    }`}
                  >
                    {/* Badges */}
                    <div className="flex items-center justify-between w-full mb-2">
                      {item.hasWeightPricing ? (
                        <span className="bg-amber-50 border border-amber-200 text-amber-800 text-[9px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-1">
                          <Scale className="w-2.5 h-2.5" />
                          By Weight ({item.priceUnit || 'kg'})
                        </span>
                      ) : (
                        <span className="text-[9px] font-semibold text-slate-400">
                          {item.size}
                        </span>
                      )}

                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                          isOutOfStock
                            ? 'bg-rose-50 text-rose-700'
                            : isLowStock
                            ? 'bg-amber-50 text-amber-800'
                            : 'bg-[#EEF2FF] text-[#4338CA]'
                        }`}
                      >
                        {isOutOfStock ? 'Out of Stock' : `Stock: ${item.currentStock}`}
                      </span>
                    </div>

                    {/* Title & Price */}
                    <div>
                      <h4 className="font-bold text-xs sm:text-sm text-slate-900 line-clamp-1 leading-snug">
                        {item.productNameEnglish || item.name}
                      </h4>
                      {(item.productNameArabic || item.nameAr) && (
                        <p className="font-bold text-[11px] text-indigo-900 line-clamp-1 mt-0.5" dir="rtl">
                          {item.productNameArabic || item.nameAr}
                        </p>
                      )}
                      <p className="text-[#4338CA] font-extrabold text-sm sm:text-base mt-1.5">
                        {item.price.toFixed(2)}{' '}
                        <span className="text-xs font-normal text-slate-500 font-mono">
                          {businessProfile.currency} {item.hasWeightPricing ? `/${item.priceUnit || 'kg'}` : ''}
                        </span>
                      </p>
                    </div>

                    {/* Quick Add Overlay Icon */}
                    <div className="mt-3 pt-2 border-t border-slate-100 flex justify-between items-center text-[10px] text-slate-500 font-medium group-hover:text-[#4338CA]">
                      <span>+ Add to Cart</span>
                      <Plus className="w-3.5 h-3.5 text-[#4338CA]" />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: POS CART & BILLING PANEL (5 Cols on desktop) */}
        <div className="lg:col-span-5 flex flex-col space-y-4">
          
          <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-4 sm:p-5 flex flex-col justify-between min-h-[550px]">
            
            {/* Header: Customer Attach & Custom Title Toggle */}
            <div className="space-y-3 pb-4 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-[#4338CA]" />
                  Current Invoice / Cart
                </h3>
                {cart.length > 0 && (
                  <button
                    onClick={() => setCart([])}
                    className="text-xs text-rose-600 hover:underline font-semibold flex items-center gap-1"
                  >
                    Clear All <span className="text-[10px] font-mono bg-rose-50 border border-rose-200 px-1 rounded text-rose-700">[Delete]</span>
                  </button>
                )}
              </div>

              {/* Customer Selection Box */}
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl space-y-3 relative">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-[#4338CA]" />
                    Customer (العميل):
                  </label>
                  <button
                    onClick={onNavigateToCustomers}
                    className="text-[11px] text-[#4338CA] hover:underline font-bold flex items-center gap-1"
                  >
                    <UserPlus className="w-3 h-3" />
                    New Customer
                  </button>
                </div>

                {/* 3-way toggle buttons */}
                <div className="grid grid-cols-3 gap-1 bg-slate-200/80 p-1 rounded-lg">
                  <button
                    type="button"
                    onClick={() => {
                      setCustomerType('WALK_IN');
                      setSelectedCustomer(null);
                    }}
                    className={`py-1.5 px-0.5 text-[10px] sm:text-xs font-bold rounded-md transition-all text-center cursor-pointer ${
                      customerType === 'WALK_IN'
                        ? 'bg-white text-[#4338CA] shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Walk-in / نقدي
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCustomerType('CUSTOM_CASH');
                      setSelectedCustomer(null);
                    }}
                    className={`py-1.5 px-0.5 text-[10px] sm:text-xs font-bold rounded-md transition-all text-center cursor-pointer ${
                      customerType === 'CUSTOM_CASH'
                        ? 'bg-white text-[#4338CA] shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Custom / نقدي مخصص
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCustomerType('BAQAYA');
                    }}
                    className={`py-1.5 px-0.5 text-[10px] sm:text-xs font-bold rounded-md transition-all text-center cursor-pointer ${
                      customerType === 'BAQAYA'
                        ? 'bg-white text-[#4338CA] shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Baqaya / آجل
                  </button>
                </div>

                {/* Walk-in View */}
                {customerType === 'WALK_IN' && (
                  <div className="bg-slate-100/50 border border-slate-200/60 p-2 rounded-lg text-center">
                    <p className="text-[11px] text-slate-500 font-semibold">
                      Walk-in Customer / عميل نقدي (No Record)
                    </p>
                  </div>
                )}

                {/* Customized Cash Invoice Name Entry */}
                {customerType === 'CUSTOM_CASH' && (
                  <div className="space-y-1.5">
                    <input
                      type="text"
                      placeholder="One-off customer/business name / اسم العميل"
                      value={customCustomerName}
                      onChange={(e) => setCustomCustomerName(e.target.value)}
                      className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#4338CA] font-bold text-slate-800"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Tax/VAT Number / الرقم الضريبي"
                        value={customCustomerTax}
                        onChange={(e) => setCustomCustomerTax(e.target.value)}
                        className="w-full text-[11px] p-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#4338CA] text-slate-800 font-medium"
                      />
                      <input
                        type="text"
                        placeholder="CR Number / رقم السجل التجاري"
                        value={customCustomerCr}
                        onChange={(e) => setCustomCustomerCr(e.target.value)}
                        className="w-full text-[11px] p-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#4338CA] text-slate-800 font-medium"
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 leading-tight">
                      * Printed on this invoice only. Won't create any Baqaya balance.
                    </p>
                  </div>
                )}

                {/* Baqaya / Saved Customer Selection */}
                {customerType === 'BAQAYA' && selectedCustomer && (
                  <div className="bg-[#EEF2FF] border border-indigo-200 p-2.5 rounded-lg flex items-center justify-between">
                    <div>
                      <p className="font-bold text-xs text-[#4338CA]">{selectedCustomer.name}</p>
                      <p className="text-[10px] text-indigo-900">
                        Code: {selectedCustomer.customerNumber || 'N/A'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedCustomer(null)}
                      className="text-xs text-rose-600 hover:bg-rose-100 px-2 py-1 rounded font-bold"
                    >
                      Clear / تغيير
                    </button>
                  </div>
                )}

                {customerType === 'BAQAYA' && !selectedCustomer && (
                  <div className="relative space-y-1.5">
                    {/* Backdrop click-away helper */}
                    {isDropdownOpen && (
                      <div
                        className="fixed inset-0 z-20"
                        onClick={() => setIsDropdownOpen(false)}
                      />
                    )}

                    {/* Search Input */}
                    <div className="relative z-30">
                      <input
                        type="text"
                        placeholder="Search name or Customer Number... / ابحث باسم العميل أو رقمه"
                        value={dropdownSearchQuery}
                        onChange={(e) => {
                          setDropdownSearchQuery(e.target.value);
                          setIsDropdownOpen(true);
                        }}
                        onFocus={() => setIsDropdownOpen(true)}
                        className="w-full text-xs p-2 pl-8 pr-8 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#4338CA]"
                      />
                      <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
                      {dropdownSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setDropdownSearchQuery('')}
                          className="absolute right-2.5 top-2 text-slate-500 hover:text-slate-800 font-bold text-sm cursor-pointer"
                        >
                          ×
                        </button>
                      )}
                    </div>

                    {/* Filtered Dropdown List */}
                    {isDropdownOpen && (
                      <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-48 overflow-y-auto z-30 divide-y divide-slate-100">
                        {/* Walk-in option directly at top of dropdown */}
                        <button
                          type="button"
                          onClick={() => {
                            setCustomerType('WALK_IN');
                            setSelectedCustomer(null);
                            setIsDropdownOpen(false);
                            setDropdownSearchQuery('');
                          }}
                          className="w-full text-left px-3 py-2 text-xs font-bold text-[#4338CA] hover:bg-[#EEF2FF] transition-colors"
                        >
                          Walk-in Customer / عميل نقدي (No Record)
                        </button>

                        {/* Filtered Customers List */}
                        {customers
                          .filter((c) => {
                            const q = dropdownSearchQuery.toLowerCase();
                            const matchesName = c.name.toLowerCase().includes(q);
                            const matchesNo = (c.customerNumber || '').toLowerCase().includes(q);
                            const matchesPhone = (c.phone || '').toLowerCase().includes(q);
                            return matchesName || matchesNo || matchesPhone;
                          })
                          .map((c) => (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => {
                                setSelectedCustomer(c);
                                setIsDropdownOpen(false);
                                setDropdownSearchQuery('');
                              }}
                              className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 transition-colors flex justify-between items-center"
                            >
                              <span className="font-bold text-slate-800">{c.name}</span>
                              <span className="text-[10px] font-bold text-slate-500 font-mono bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200/50">
                                Code: {c.customerNumber || 'N/A'}
                              </span>
                            </button>
                          ))}

                        {/* Empty Search Results state */}
                        {customers.filter((c) => {
                          const q = dropdownSearchQuery.toLowerCase();
                          return (
                            c.name.toLowerCase().includes(q) ||
                            (c.customerNumber || '').toLowerCase().includes(q) ||
                            (c.phone || '').toLowerCase().includes(q)
                          );
                        }).length === 0 && (
                          <div className="px-3 py-3 text-xs text-slate-400 text-center">
                            No customers found / لم يتم العثور على عملاء
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* "Customize Invoice" Toggle */}
              {customerType === 'BAQAYA' && (
                <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isCustomTitleEnabled}
                        onChange={(e) => setIsCustomTitleEnabled(e.target.checked)}
                        className="rounded border-slate-300 text-[#4338CA] focus:ring-[#4338CA] w-4 h-4"
                      />
                      <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                      Customize Invoice Title / مسمى خاص بالفاتورة
                    </label>
                  </div>
   
                  {isCustomTitleEnabled && (
                    <input
                      type="text"
                      placeholder="e.g., Supply Contract Invoice #99 / فاتورة توريد خاصة"
                      value={customTitle}
                      onChange={(e) => setCustomTitle(e.target.value)}
                      className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#4338CA]"
                    />
                  )}
                </div>
              )}
            </div>
 
            {/* Cart Items List */}
            <div className="flex-1 overflow-y-auto my-3 space-y-2 max-h-[280px] pr-1">
              {cart.length === 0 ? (
                <div className="text-center py-12 text-slate-400 space-y-2">
                  <ShoppingCart className="w-10 h-10 mx-auto opacity-30" />
                  <p className="text-xs">Cart is empty. Tap items to add to order.</p>
                </div>
              ) : (
                cart.map((cartItem, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs"
                  >
                    <div className="flex-1 pr-2">
                      <h5 className="font-bold text-slate-900">{cartItem.item.productNameEnglish || cartItem.item.name}</h5>
                      {(cartItem.item.productNameArabic || cartItem.item.nameAr) && (
                        <p className="text-[11px] font-bold text-indigo-900" dir="rtl">
                          {cartItem.item.productNameArabic || cartItem.item.nameAr}
                        </p>
                      )}
                      <p className="text-[10.5px] text-slate-500 mt-0.5">
                        {cartItem.unitPrice.toFixed(2)} {businessProfile.currency}
                        {cartItem.weight ? ` x ${cartItem.weight} kg` : ` x ${cartItem.quantity}`}
                      </p>
                    </div>
 
                    {/* Quantity / Weight Controls */}
                    <div className="flex items-center space-x-2 rtl:space-x-reverse">
                      <div className="flex items-center border border-slate-300 rounded-lg bg-white overflow-hidden">
                        <button
                          onClick={() => updateQuantity(idx, -1)}
                          className="px-2 py-1 text-slate-600 hover:bg-slate-100"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="px-2 font-bold text-slate-800">
                          {cartItem.weight ? `${cartItem.weight}kg` : cartItem.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(idx, 1)}
                          className="px-2 py-1 text-slate-600 hover:bg-slate-100"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
 
                      {/* Line Total */}
                      <span className="font-extrabold text-[#4338CA] w-16 text-right">
                        {cartItem.lineTotal.toFixed(2)}
                      </span>

                      <button
                        onClick={() => removeFromCart(idx)}
                        className="text-slate-400 hover:text-rose-600 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
 
            {/* Payment Method & Totals Panel */}
            <div className="pt-3 border-t border-slate-200 space-y-3">
              
              {/* Payment Methods Toggle */}
              <div>
                <label className="text-[11px] font-bold text-slate-600 mb-1.5 block">
                  Payment Method / طريقة الدفع:
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  <button
                    onClick={() => setPaymentMethod('MADA')}
                    className={`py-2 px-1 text-[11px] font-bold rounded-lg border flex flex-col items-center gap-1 ${
                      paymentMethod === 'MADA'
                        ? 'bg-[#4338CA] text-white border-[#4338CA] shadow'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    Mada/Card
                  </button>
                  <button
                    onClick={() => setPaymentMethod('CASH')}
                    className={`py-2 px-1 text-[11px] font-bold rounded-lg border flex flex-col items-center gap-1 ${
                      paymentMethod === 'CASH'
                        ? 'bg-[#4338CA] text-white border-[#4338CA] shadow'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <Banknote className="w-3.5 h-3.5" />
                    Cash
                  </button>
                  <button
                    onClick={() => setPaymentMethod('BANK_TRANSFER')}
                    className={`py-2 px-1 text-[11px] font-bold rounded-lg border flex flex-col items-center gap-1 ${
                      paymentMethod === 'BANK_TRANSFER'
                        ? 'bg-[#4338CA] text-white border-[#4338CA] shadow'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <Building className="w-3.5 h-3.5" />
                    Transfer
                  </button>
                  <button
                    onClick={() => setPaymentMethod('CREDIT_BAQAYA')}
                    className={`py-2 px-1 text-[11px] font-bold rounded-lg border flex flex-col items-center gap-1 ${
                      paymentMethod === 'CREDIT_BAQAYA'
                        ? 'bg-amber-600 text-white border-amber-600 shadow'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    Credit (آجل)
                  </button>
                </div>
              </div>
 
              {/* Running Totals Box */}
              <div className="bg-slate-900 text-white p-4 rounded-xl space-y-2">
                <div className="flex justify-between text-xs text-slate-300 font-mono">
                  <span>Subtotal (غير شامل الضريبة):</span>
                  <span className="font-semibold">{subtotal.toFixed(2)} {businessProfile.currency}</span>
                </div>
                <div className="flex justify-between text-xs text-slate-300 font-mono">
                  <span>{businessProfile.defaultVatRate}% VAT (ضريبة القيمة المضافة):</span>
                  <span className="font-semibold">{vatTotal.toFixed(2)} {businessProfile.currency}</span>
                </div>
                <div className="flex justify-between text-base font-extrabold text-white pt-2 border-t border-slate-800 font-mono">
                  <span>GRAND TOTAL (الإجمالي):</span>
                  <span className="text-indigo-400">{grandTotal.toFixed(2)} {businessProfile.currency}</span>
                </div>
              </div>
 
              {/* Checkout Error Alert Banner */}
              {checkoutError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-950 p-3 rounded-xl flex items-start justify-between text-xs font-semibold shadow-sm animate-in fade-in">
                  <div className="flex items-start space-x-2 rtl:space-x-reverse">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-rose-950">Checkout Failed / فشل إصدار الفاتورة</p>
                      <p className="text-[11px] text-rose-800 leading-snug mt-0.5">{checkoutError}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setCheckoutError(null)}
                    className="text-rose-400 hover:text-rose-700 font-bold text-sm px-1 cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Checkout CTA */}
              <button
                onClick={handleCheckout}
                disabled={cart.length === 0 || isSubmitting}
                className="w-full py-3 bg-[#4338CA] hover:bg-[#3730A3] disabled:opacity-50 text-white font-bold text-xs rounded-lg shadow transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    Processing Sale... / جاري إصدار الفاتورة
                  </span>
                ) : (
                  <span className="flex items-center justify-between w-full px-4">
                    <span>Complete Sale & Print Receipt / إصدار الفاتورة</span>
                    <span className="text-[10px] font-mono bg-indigo-900/60 border border-indigo-400/40 text-indigo-200 px-1.5 py-0.5 rounded font-bold">[Enter]</span>
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* WEIGHT ENTRY MODAL */}
      {weightModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex items-center space-x-2 rtl:space-x-reverse text-amber-600">
              <Scale className="w-6 h-6" />
              <h3 className="font-bold text-base text-slate-900">Enter Item Weight / أدخل الوزن</h3>
            </div>

            <p className="text-xs text-slate-600 font-medium">
              Product: <span className="font-bold text-slate-900">{weightModalItem.name}</span> (Price: {weightModalItem.price} {businessProfile.currency}/{weightModalItem.priceUnit || 'kg'})
            </p>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Weight in ({weightModalItem.priceUnit || 'kg'}):
              </label>
              <input
                type="number"
                step="0.05"
                min="0.01"
                value={inputWeight}
                onChange={(e) => setInputWeight(e.target.value)}
                autoFocus
                className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl font-bold text-lg text-slate-900 focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex space-x-2 rtl:space-x-reverse">
              <button
                onClick={() => setWeightModalItem(null)}
                className="w-1/2 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmWeight}
                className="w-1/2 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow"
              >
                Confirm & Add
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
