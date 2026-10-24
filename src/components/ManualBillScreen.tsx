import React, { useState, useMemo, useEffect } from 'react';
import { ArrowLeft, Building, CheckCircle, Plus, Printer, Search, Trash2, FileText, Receipt, Users, X } from 'lucide-react';
import { BusinessProfile, CartItem, InventoryItem, Invoice, UserRole, ManualBillClient } from '../types';
import {
  createManualBill,
  subscribeManualBills,
  subscribeManualBillClients,
  saveOrUpdateManualBillClient,
  deleteManualBillClient
} from '../services/dbService';
import { InvoiceReceiptModal } from './InvoiceReceiptModal';

interface ManualBillScreenProps {
  businessProfile: BusinessProfile;
  userRole: UserRole;
  inventory: InventoryItem[];
  onClose: () => void;
  onInvoiceCreated?: (invoice: Invoice) => void;
  onProfileUpdated?: (updated: BusinessProfile) => void;
  currentUsername?: string;
}

export const ManualBillScreen: React.FC<ManualBillScreenProps> = ({
  businessProfile,
  userRole,
  inventory,
  onClose,
  onInvoiceCreated,
  onProfileUpdated,
  currentUsername = 'cashier',
}) => {
  // Navigation / View state
  type ViewMode = 'list' | 'create';
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [searchTerm, setSearchTerm] = useState('');

  // Firestore Realtime Collections
  const [manualBills, setManualBills] = useState<Invoice[]>([]);
  const [manualBillClients, setManualBillClients] = useState<ManualBillClient[]>([]);

  // Modals / Suggestions States
  const [activeManualBillModal, setActiveManualBillModal] = useState<Invoice | null>(null);
  const [showClientsModal, setShowClientsModal] = useState(false);
  const [clientSearchInModal, setClientSearchInModal] = useState('');
  const [showClientSuggestions, setShowClientSuggestions] = useState(false);

  // New Client Form inside Modal
  const [modalClientName, setModalClientName] = useState('');
  const [modalClientTax, setModalClientTax] = useState('');
  const [modalClientCr, setModalClientCr] = useState('');
  const [modalClientPhone, setModalClientPhone] = useState('');

  // Create Form State
  const [mbCustomerName, setMbCustomerName] = useState('');
  const [mbTaxNumber, setMbTaxNumber] = useState('');
  const [mbCrNumber, setMbCrNumber] = useState('');
  const [mbPhone, setMbPhone] = useState('');
  const [mbInvoiceDate, setMbInvoiceDate] = useState(() => new Date().toISOString().substring(0, 10));
  const [mbInvoiceTime, setMbInvoiceTime] = useState(() => new Date().toTimeString().substring(0, 5));
  const [mbPaymentMethod, setMbPaymentMethod] = useState<'CASH' | 'MADA' | 'BANK_TRANSFER' | 'CREDIT_BAQAYA'>('CASH');

  // Cart / Item State
  const [mbItems, setMbItems] = useState<CartItem[]>([]);
  const [mbInventorySearch, setMbInventorySearch] = useState('');

  // Custom One-off Item State
  const [showManualItemForm, setShowManualItemForm] = useState(false);
  const [manualItemName, setManualItemName] = useState('');
  const [manualItemQty, setManualItemQty] = useState('1');
  const [manualItemPrice, setManualItemPrice] = useState('');

  // 1. Subscribe to Firestore on mount
  useEffect(() => {
    const unsubBills = subscribeManualBills((data) => {
      setManualBills(data);
    });
    const unsubClients = subscribeManualBillClients((data) => {
      setManualBillClients(data);
    });
    return () => {
      unsubBills();
      unsubClients();
    };
  }, []);

  // 2. Client selection from suggestions
  const handleSelectManualClient = (client: ManualBillClient) => {
    setMbCustomerName(client.name);
    setMbTaxNumber(client.taxNumber || '');
    setMbCrNumber(client.crNumber || '');
    setMbPhone(client.phone || '');
    setShowClientSuggestions(false);
  };

  // 3. Client suggestions filtered list
  const suggestedClients = useMemo(() => {
    if (!mbCustomerName.trim()) return [];
    return manualBillClients.filter((c) =>
      c.name.toLowerCase().includes(mbCustomerName.toLowerCase())
    ).slice(0, 5);
  }, [mbCustomerName, manualBillClients]);

  // 4. Inventory suggestions list
  const filteredMbInventory = useMemo(() => {
    if (!mbInventorySearch.trim()) return [];
    const term = mbInventorySearch.toLowerCase();
    return inventory.filter(
      (item) =>
        item.name.toLowerCase().includes(term) ||
        (item.productNameEnglish && item.productNameEnglish.toLowerCase().includes(term)) ||
        (item.sku && item.sku.toLowerCase().includes(term)) ||
        (item.barcode && item.barcode.toLowerCase().includes(term))
    ).slice(0, 5);
  }, [mbInventorySearch, inventory]);

  // Helper: DateTime ISO
  const getMbDateTimeIso = () => {
    if (!mbInvoiceDate) return new Date().toISOString();
    const timeStr = mbInvoiceTime ? mbInvoiceTime : '00:00';
    const d = new Date(`${mbInvoiceDate}T${timeStr}:00`);
    return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
  };

  // Add inventory item to bill
  const handleAddInventoryItemToMb = (item: InventoryItem) => {
    const existingIdx = mbItems.findIndex((i) => i.item.id === item.id);
    const vatRate = item.vatRate ?? businessProfile.defaultVatRate ?? 15;

    if (existingIdx >= 0) {
      const updated = [...mbItems];
      const newQty = updated[existingIdx].quantity + 1;
      const total = newQty * updated[existingIdx].unitPrice;
      const sub = total / (1 + vatRate / 100);
      const vat = total - sub;

      updated[existingIdx].quantity = newQty;
      updated[existingIdx].lineSubtotal = Number(sub.toFixed(2));
      updated[existingIdx].lineVat = Number(vat.toFixed(2));
      updated[existingIdx].lineTotal = Number(total.toFixed(2));
      setMbItems(updated);
    } else {
      const unitPrice = item.price;
      const total = 1 * unitPrice;
      const sub = total / (1 + vatRate / 100);
      const vat = total - sub;

      const cartItem: CartItem = {
        item,
        quantity: 1,
        unitPrice,
        vatRate,
        lineSubtotal: Number(sub.toFixed(2)),
        lineVat: Number(vat.toFixed(2)),
        lineTotal: Number(total.toFixed(2)),
      };
      setMbItems([...mbItems, cartItem]);
    }
    setMbInventorySearch('');
  };

  // Add custom manual item
  const handleAddManualItem = () => {
    if (!manualItemName.trim()) {
      alert('Please enter item name / يرجى إدخال اسم الصنف');
      return;
    }
    const qty = Math.max(1, parseInt(manualItemQty) || 1);
    const price = Math.max(0, parseFloat(manualItemPrice) || 0);

    const vatRate = businessProfile.defaultVatRate ?? 15;
    const dummyInventoryItem: InventoryItem = {
      id: `manual-item-${Date.now()}`,
      name: manualItemName.trim(),
      productNameEnglish: manualItemName.trim(),
      size: 'Piece',
      sku: 'MANUAL',
      price: price,
      purchasePrice: price,
      hasWeightPricing: false,
      stockIn: 0,
      stockOut: 0,
      currentStock: 9999,
      category: 'General',
      vatRate,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const total = qty * price;
    const sub = total / (1 + vatRate / 100);
    const vat = total - sub;

    const cartItem: CartItem = {
      item: dummyInventoryItem,
      quantity: qty,
      unitPrice: price,
      vatRate,
      lineSubtotal: Number(sub.toFixed(2)),
      lineVat: Number(vat.toFixed(2)),
      lineTotal: Number(total.toFixed(2)),
    };

    setMbItems([...mbItems, cartItem]);
    setManualItemName('');
    setManualItemQty('1');
    setManualItemPrice('');
    setShowManualItemForm(false);
  };

  const handleUpdateMbQty = (idx: number, newQtyStr: string) => {
    const qty = Math.max(1, parseInt(newQtyStr) || 1);
    const updated = [...mbItems];
    const item = updated[idx];
    const total = qty * item.unitPrice;
    const sub = total / (1 + item.vatRate / 100);
    const vat = total - sub;

    updated[idx].quantity = qty;
    updated[idx].lineSubtotal = Number(sub.toFixed(2));
    updated[idx].lineVat = Number(vat.toFixed(2));
    updated[idx].lineTotal = Number(total.toFixed(2));
    setMbItems(updated);
  };

  const handleUpdateMbUnitPrice = (idx: number, newPriceStr: string) => {
    const price = Math.max(0, parseFloat(newPriceStr) || 0);
    const updated = [...mbItems];
    const item = updated[idx];
    const total = item.quantity * price;
    const sub = total / (1 + item.vatRate / 100);
    const vat = total - sub;

    updated[idx].unitPrice = price;
    updated[idx].lineSubtotal = Number(sub.toFixed(2));
    updated[idx].lineVat = Number(vat.toFixed(2));
    updated[idx].lineTotal = Number(total.toFixed(2));
    setMbItems(updated);
  };

  const handleRemoveMbItem = (idx: number) => {
    setMbItems(mbItems.filter((_, i) => i !== idx));
  };

  // Totals calculations
  const mbSubtotal = mbItems.reduce((acc, i) => acc + (i.lineSubtotal || 0), 0);
  const mbVatTotal = mbItems.reduce((acc, i) => acc + (i.lineVat || 0), 0);
  const mbGrandTotal = mbSubtotal + mbVatTotal;

  // Invoice preview data
  const previewInvoice: Invoice | null = useMemo(() => {
    if (!mbCustomerName.trim() || mbItems.length === 0) return null;
    const nowIso = getMbDateTimeIso();
    return {
      id: `preview-${Date.now()}`,
      invoiceNumber: `INV-M-PREVIEW`,
      businessProfile,
      customer: {
        id: `cust-temp-${Date.now()}`,
        name: mbCustomerName.trim(),
        taxNumber: mbTaxNumber.trim() || undefined,
        crNumber: mbCrNumber.trim() || undefined,
        phone: mbPhone.trim() || undefined,
        createdAt: nowIso,
      },
      isWalkIn: false,
      items: mbItems,
      subtotal: Number(mbSubtotal.toFixed(2)),
      vatTotal: Number(mbVatTotal.toFixed(2)),
      grandTotal: Number(mbGrandTotal.toFixed(2)),
      paymentMethod: mbPaymentMethod,
      paymentStatus: mbPaymentMethod === 'CREDIT_BAQAYA' ? 'UNPAID' : 'PAID',
      createdAt: nowIso,
    };
  }, [mbCustomerName, mbTaxNumber, mbCrNumber, mbPhone, mbItems, mbSubtotal, mbVatTotal, mbGrandTotal, mbPaymentMethod]);

  // Action: Handle print execution after ensuring all images in #printable-a4 are loaded
  const handlePrint = () => {
    const printableA4Container = document.querySelector('#printable-a4');
    if (!printableA4Container) {
      try {
        window.print();
      } catch (err) {
        console.error('Error invoking window.print():', err);
      }
      return;
    }

    const images = printableA4Container.querySelectorAll('img');
    const imagePromises = Array.from(images).map((img) => {
      const htmlImg = img as HTMLImageElement;
      if (htmlImg.complete) {
        return Promise.resolve();
      }
      return new Promise<void>((resolve) => {
        htmlImg.onload = () => resolve();
        htmlImg.onerror = () => resolve();
      });
    });

    const timeoutPromise = new Promise<void>((resolve) => setTimeout(resolve, 300));

    Promise.race([Promise.all(imagePromises), timeoutPromise]).then(() => {
      try {
        window.print();
      } catch (err) {
        console.error('Error invoking window.print():', err);
      }
    });
  };

  // Action: Print Preview of currently drafting manual bill (Saves first to guarantee permanent ID & valid QR code)
  const handlePrintManualBillPreview = () => {
    handleSaveManualBill();
  };

  // Action: Save Manual Bill and save/update client
  const handleSaveManualBill = async () => {
    if (!mbCustomerName.trim()) {
      alert('Please enter customer name / يرجى إدخال اسم العميل');
      return;
    }
    if (mbItems.length === 0) {
      alert('Please add at least one item / يرجى إضافة صنف واحد على الأقل');
      return;
    }

    const nowIso = getMbDateTimeIso();
    const invNum = `INV-M-${Date.now().toString().slice(-6)}`;

    const invoiceData: Omit<Invoice, 'id' | 'createdAt'> = {
      invoiceNumber: invNum,
      businessProfile,
      customer: {
        id: `cust-temp-${Date.now()}`,
        name: mbCustomerName.trim(),
        taxNumber: mbTaxNumber.trim() || undefined,
        crNumber: mbCrNumber.trim() || undefined,
        phone: mbPhone.trim() || undefined,
        createdAt: nowIso,
      },
      isWalkIn: false,
      items: mbItems,
      subtotal: Number(mbSubtotal.toFixed(2)),
      vatTotal: Number(mbVatTotal.toFixed(2)),
      grandTotal: Number(mbGrandTotal.toFixed(2)),
      paymentMethod: mbPaymentMethod,
      paymentStatus: mbPaymentMethod === 'CREDIT_BAQAYA' ? 'UNPAID' : 'PAID',
      cashierRole: userRole,
    };

    try {
      // 1. Save Manual Bill
      const billId = await createManualBill(invoiceData);
      
      // 2. Save Client to separate collection
      await saveOrUpdateManualBillClient({
        name: mbCustomerName.trim(),
        taxNumber: mbTaxNumber.trim() || undefined,
        crNumber: mbCrNumber.trim() || undefined,
        phone: mbPhone.trim() || undefined,
      });

      const savedInvoice: Invoice = {
        id: billId,
        createdAt: nowIso,
        ...invoiceData,
      };

      if (onInvoiceCreated) {
        onInvoiceCreated(savedInvoice);
      }

      // Open print modal for the final saved bill
      setActiveManualBillModal(savedInvoice);

      // Reset form & Go back to list dashboard
      setMbCustomerName('');
      setMbTaxNumber('');
      setMbCrNumber('');
      setMbPhone('');
      setMbInvoiceDate(new Date().toISOString().substring(0, 10));
      setMbInvoiceTime(new Date().toTimeString().substring(0, 5));
      setMbItems([]);
      setViewMode('list');
    } catch (err) {
      console.error('Error saving manual bill:', err);
      alert('Failed to save manual bill / فشل حفظ الفاتورة اليدوية');
    }
  };

  // Filtered lists for historical manual bills
  const filteredBills = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return manualBills.filter((b) =>
      b.invoiceNumber.toLowerCase().includes(term) ||
      (b.customer?.name || '').toLowerCase().includes(term) ||
      (b.customer?.taxNumber || '').includes(term)
    );
  }, [searchTerm, manualBills]);

  // Filtered clients list inside modal
  const filteredClientsInModal = useMemo(() => {
    const term = clientSearchInModal.toLowerCase();
    return manualBillClients.filter((c) =>
      c.name.toLowerCase().includes(term) ||
      (c.phone || '').includes(term) ||
      (c.taxNumber || '').includes(term)
    );
  }, [clientSearchInModal, manualBillClients]);

  // Save client from within Modal form
  const handleCreateClientInModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalClientName.trim()) return;
    try {
      await saveOrUpdateManualBillClient({
        name: modalClientName.trim(),
        taxNumber: modalClientTax.trim() || undefined,
        crNumber: modalClientCr.trim() || undefined,
        phone: modalClientPhone.trim() || undefined,
      });
      // Clear fields
      setModalClientName('');
      setModalClientTax('');
      setModalClientCr('');
      setModalClientPhone('');
    } catch (err) {
      alert('Failed to save client / فشل حفظ العميل');
    }
  };

  const handleDeleteClient = async (id: string) => {
    if (confirm('Are you sure you want to delete this client? / هل أنت متأكد من حذف هذا العميل؟')) {
      try {
        await deleteManualBillClient(id);
      } catch (err) {
        alert('Failed to delete / فشل الحذف');
      }
    }
  };

  return (
    <div className="space-y-6">
      {viewMode === 'list' ? (
        /* DASHBOARD HISTORICAL MANUAL BILLS LIST VIEW */
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6 animate-fadeIn">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                <Receipt className="w-6 h-6 text-indigo-600" />
                <span>Manual Bill History / سجل الفواتير اليدوية</span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                View, print, and search past manual bills fetched directly from the dedicated manualBills database collection.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowClientsModal(true)}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl border border-slate-200 shadow-sm flex items-center gap-1.5 cursor-pointer transition-all"
              >
                <Users className="w-4 h-4 text-indigo-600" />
                <span>Manual Clients ({manualBillClients.length}) / العملاء</span>
              </button>
              <button
                onClick={() => setViewMode('create')}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-bold rounded-xl shadow transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                New Manual Bill / فاتورة يدوية جديدة
              </button>
            </div>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="w-5 h-5 text-slate-400 absolute left-4 top-3" />
            <input
              type="text"
              placeholder="Search by Invoice #, Customer, or VAT Number... / ابحث برقم الفاتورة، العميل، أو الرقم الضريبي"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
            />
          </div>

          {/* Table list */}
          <div className="overflow-x-auto rounded-2xl border border-slate-100">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-600 border-b border-slate-100">
                  <th className="py-3 px-4 font-bold">Invoice # / رقم الفاتورة</th>
                  <th className="py-3 px-4 font-bold">Date / التاريخ</th>
                  <th className="py-3 px-4 font-bold">Customer Name / اسم العميل</th>
                  <th className="py-3 px-4 font-bold text-right">VAT / الضريبة</th>
                  <th className="py-3 px-4 font-bold text-right">Total / المجموع</th>
                  <th className="py-3 px-4 font-bold">Method / الدفع</th>
                  <th className="py-3 px-4 font-bold text-center">Action / الإجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredBills.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400 font-medium">
                      No manual bills found / لم يتم العثور على فواتير يدوية
                    </td>
                  </tr>
                ) : (
                  filteredBills.map((bill) => (
                    <tr key={bill.id} className="hover:bg-slate-50/50 transition">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">{bill.invoiceNumber}</td>
                      <td className="py-3 px-4 text-slate-500">
                        {bill.createdAt ? new Date(bill.createdAt).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-800">{bill.customer?.name || 'Walk-in / عميل سفري'}</td>
                      <td className="py-3 px-4 text-right font-mono text-slate-600">{(bill.vatTotal || 0).toFixed(2)}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                        {(bill.grandTotal || 0).toFixed(2)} {businessProfile.currency}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-600">
                        {bill.paymentMethod === 'BANK_TRANSFER' ? 'Bank / تحويل' : bill.paymentMethod}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => setActiveManualBillModal(bill)}
                          className="px-3 py-1 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 font-bold rounded-lg border border-slate-200 hover:border-indigo-200 transition cursor-pointer"
                        >
                          View / Print
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* CREATION MODE FORM VIEW */
        <div className="flex flex-col lg:flex-row gap-6 animate-fadeIn">
          {/* Left Column: Form & Items */}
          <div className="w-full lg:w-2/3 bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setViewMode('list')}
                  className="p-2 hover:bg-slate-200 rounded-lg text-slate-600 transition cursor-pointer"
                  title="Back / العودة"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                  <h2 className="text-base font-extrabold text-slate-900">
                    New Manual Bill (Tax Invoice) / فاتورة ضريبية يدوية
                  </h2>
                  <p className="text-[10px] text-slate-400">
                    Enter customer tax details, search inventory or add custom items, and issue an A4 ZATCA-compliant tax invoice.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setViewMode('list')}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg cursor-pointer"
                >
                  Cancel / إلغاء
                </button>
                <button
                  onClick={handlePrintManualBillPreview}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-bold rounded-lg flex items-center gap-1 shadow cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  Print / Preview
                </button>
                <button
                  onClick={handleSaveManualBill}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-bold rounded-lg flex items-center gap-1 shadow cursor-pointer"
                >
                  <CheckCircle className="w-4 h-4" />
                  Generate & Save
                </button>
              </div>
            </div>

            <div className="space-y-6">
              {/* Customer Details & Payment Method */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4 relative">
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5 border-b pb-2">
                  <Building className="w-4 h-4 text-slate-500" />
                  <span>Customer Details / بيانات العميل</span>
                </h3>

                <div className="space-y-3">
                  <div className="relative">
                    <label className="block text-xs font-bold text-slate-700 mb-1">Customer Name / اسم العميل *</label>
                    <input
                      type="text"
                      placeholder="e.g. Abdullah Trading Est. (Type to search saved clients...)"
                      value={mbCustomerName}
                      onChange={(e) => {
                        setMbCustomerName(e.target.value);
                        setShowClientSuggestions(true);
                      }}
                      onFocus={() => setShowClientSuggestions(true)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                    />

                    {/* Autocomplete dropdown */}
                    {showClientSuggestions && suggestedClients.length > 0 && (
                      <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-30 max-h-48 overflow-y-auto divide-y divide-slate-100">
                        {suggestedClients.map((client) => (
                          <button
                            key={client.id}
                            type="button"
                            onClick={() => handleSelectManualClient(client)}
                            className="w-full text-left px-4 py-2 hover:bg-slate-50 text-xs transition flex flex-col gap-0.5"
                          >
                            <span className="font-bold text-slate-800">{client.name}</span>
                            <span className="text-[10px] text-slate-500 font-mono">
                              {client.taxNumber ? `VAT: ${client.taxNumber}` : ''} {client.phone ? `| Tel: ${client.phone}` : ''}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Tax/VAT Number / الرقم الضريبي (15 digits)</label>
                    <input
                      type="text"
                      placeholder="300000000000003"
                      value={mbTaxNumber}
                      onChange={(e) => setMbTaxNumber(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">CR Number / رقم السجل التجاري</label>
                    <input
                      type="text"
                      placeholder="1010000000"
                      value={mbCrNumber}
                      onChange={(e) => setMbCrNumber(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Mobile Number / رقم الجوال</label>
                    <input
                      type="text"
                      placeholder="0500000000"
                      value={mbPhone}
                      onChange={(e) => setMbPhone(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Invoice Date / تاريخ الفاتورة</label>
                      <input
                        type="date"
                        value={mbInvoiceDate}
                        onChange={(e) => setMbInvoiceDate(e.target.value)}
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Invoice Time / وقت الفاتورة</label>
                      <input
                        type="time"
                        value={mbInvoiceTime}
                        onChange={(e) => setMbInvoiceTime(e.target.value)}
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Payment Method / طريقة الدفع</label>
                    <select
                      value={mbPaymentMethod}
                      onChange={(e: any) => setMbPaymentMethod(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="CASH">Cash / نقدي</option>
                      <option value="MADA">Mada / مدى</option>
                      <option value="BANK_TRANSFER">Bank Transfer / تحويل بنكي</option>
                      <option value="CREDIT_BAQAYA">Credit / آجل</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Inventory Search & Itemized Table */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b pb-2">
                  <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                    <Search className="w-4 h-4 text-slate-500" />
                    <span>Inventory Search & Barcode</span>
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowManualItemForm(!showManualItemForm)}
                    className="text-xs text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 cursor-pointer bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    {showManualItemForm ? 'Close Manual Item' : 'Add Manual Item'}
                  </button>
                </div>

                {showManualItemForm && (
                  <div className="p-3.5 bg-blue-50/60 border border-blue-200 rounded-xl space-y-3">
                    <div className="text-xs font-bold text-blue-900">
                      Add One-off Item / إضافة صنف يدوية
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <input
                        type="text"
                        placeholder="Item Name / اسم الصنف *"
                        value={manualItemName}
                        onChange={(e) => setManualItemName(e.target.value)}
                        className="p-2 bg-white border border-slate-300 rounded-lg text-xs"
                      />
                      <input
                        type="number"
                        min="1"
                        placeholder="Quantity / الكمية"
                        value={manualItemQty}
                        onChange={(e) => setManualItemQty(e.target.value)}
                        className="p-2 bg-white border border-slate-300 rounded-lg text-xs font-mono"
                      />
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Price / السعر (SAR)"
                        value={manualItemPrice}
                        onChange={(e) => setManualItemPrice(e.target.value)}
                        className="p-2 bg-white border border-slate-300 rounded-lg text-xs font-mono"
                      />
                    </div>
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={handleAddManualItem}
                        className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow cursor-pointer"
                      >
                        Add to Bill / إضافة للفاتورة
                      </button>
                    </div>
                  </div>
                )}

                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search inventory by name, SKU, or scan barcode..."
                    value={mbInventorySearch}
                    onChange={(e) => setMbInventorySearch(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const found = inventory.find(
                          (item) => item.barcode === mbInventorySearch.trim() || item.sku === mbInventorySearch.trim()
                        );
                        if (found) {
                          handleAddInventoryItemToMb(found);
                        } else {
                          alert(`SKU/Barcode "${mbInventorySearch}" not found / لم يتم العثور على الباركود`);
                        }
                        setMbInventorySearch('');
                      }
                    }}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500"
                  />

                  {/* Search suggestions dropdown */}
                  {filteredMbInventory.length > 0 && (
                    <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-20 max-h-60 overflow-y-auto divide-y divide-slate-100">
                      {filteredMbInventory.map((item) => {
                        const eng = item.productNameEnglish || item.name;
                        const ar = item.productNameArabic || item.nameAr;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => handleAddInventoryItemToMb(item)}
                            className="w-full text-left px-4 py-3 hover:bg-slate-50 transition text-xs flex justify-between items-center"
                          >
                            <div>
                              <p className="font-bold text-slate-800">{eng}</p>
                              {ar && <p className="text-[10px] text-slate-500">{ar}</p>}
                            </div>
                            <span className="font-bold text-indigo-600 font-mono">
                              {item.price.toFixed(2)} SAR
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Items in drafting bill */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-600 font-bold bg-slate-50/50">
                        <th className="py-2.5 px-3">Item / الصنف</th>
                        <th className="py-2.5 px-3 text-center">Qty / الكمية</th>
                        <th className="py-2.5 px-3 text-right">Price / السعر</th>
                        <th className="py-2.5 px-3 text-right">Total / المجموع</th>
                        <th className="py-2.5 px-3 text-center">Remove / حذف</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {mbItems.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-slate-400 font-medium">
                            No items added yet / لم يتم إضافة أصناف بعد
                          </td>
                        </tr>
                      ) : (
                        mbItems.map((item, idx) => {
                          const name = item.item.productNameEnglish || item.item.name;
                          return (
                            <tr key={idx} className="hover:bg-slate-50/30">
                              <td className="py-2 px-3 font-medium text-slate-800">{name}</td>
                              <td className="py-2 px-3 text-center">
                                <input
                                  type="number"
                                  min="1"
                                  value={item.quantity}
                                  onChange={(e) => handleUpdateMbQty(idx, e.target.value)}
                                  className="w-14 p-1 border rounded text-center text-xs font-mono"
                                />
                              </td>
                              <td className="py-2 px-3 text-right">
                                <input
                                  type="number"
                                  step="0.01"
                                  value={item.unitPrice}
                                  onChange={(e) => handleUpdateMbUnitPrice(idx, e.target.value)}
                                  className="w-20 p-1 border rounded text-right text-xs font-mono"
                                />
                              </td>
                              <td className="py-2 px-3 text-right font-bold text-slate-900 font-mono">
                                {item.lineTotal.toFixed(2)}
                              </td>
                              <td className="py-2 px-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveMbItem(idx)}
                                  className="p-1 hover:bg-rose-50 text-rose-500 hover:text-rose-700 rounded transition cursor-pointer"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Live Bill Blueprint & Preview */}
          <div className="w-full lg:w-1/3 space-y-6">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="font-extrabold text-sm text-slate-900 mb-4 pb-2 border-b">
                Draft Blueprint / مخطط الفاتورة
              </h3>

              {mbItems.length === 0 ? (
                <div className="py-12 text-center text-slate-400 font-medium text-xs">
                  Blueprint will generate here once you add items / سيتم إنشاء المخطط بعد إضافة أصناف
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Metadata block */}
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 space-y-1.5 text-[10px] text-slate-600 font-medium">
                    <p className="font-bold text-slate-800">No: INV-M-[Auto]</p>
                    <p>Date: {mbInvoiceDate} {mbInvoiceTime}</p>
                    <p>Payment: {mbPaymentMethod}</p>
                  </div>

                  {/* Customer details */}
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-[10px] space-y-1">
                    <p className="font-bold text-slate-800 border-b pb-1">Billed To / العميل:</p>
                    <p className="font-bold text-xs text-slate-900 mt-1">{mbCustomerName || 'Unspecified / غير محدد'}</p>
                    {mbTaxNumber && <p><span className="font-semibold text-slate-600">VAT:</span> {mbTaxNumber}</p>}
                    {mbCrNumber && <p><span className="font-semibold text-slate-600">CR:</span> {mbCrNumber}</p>}
                    {mbPhone && <p><span className="font-semibold text-slate-600">Phone:</span> {mbPhone}</p>}
                  </div>

                  {/* Simple compact table */}
                  <table className="w-full text-left text-[10px]">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-600">
                        <th className="pb-1.5">Item</th>
                        <th className="pb-1.5 text-center">Qty</th>
                        <th className="pb-1.5 text-right font-mono">Price</th>
                        <th className="pb-1.5 text-right font-mono">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mbItems.map((item, idx) => (
                        <tr key={idx} className="text-slate-700">
                          <td className="py-1.5 truncate max-w-[120px]" title={item.item.productNameEnglish || item.item.name}>
                            {item.item.productNameEnglish || item.item.name}
                          </td>
                          <td className="py-1.5 text-center">{item.quantity}</td>
                          <td className="py-1.5 text-right font-mono">{item.unitPrice.toFixed(2)}</td>
                          <td className="py-1.5 text-right font-bold text-slate-900 font-mono">{item.lineTotal.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Totals block */}
                  <div className="border-t border-slate-200 pt-3 space-y-1.5 text-[10px] flex flex-col items-end">
                    <div className="flex justify-between w-2/3 lg:w-3/4 xl:w-2/3">
                      <span className="text-slate-600">Subtotal (Excl. VAT):</span>
                      <span className="font-mono">{mbSubtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between w-2/3 lg:w-3/4 xl:w-2/3">
                      <span className="text-slate-600">15% VAT:</span>
                      <span className="font-mono">{mbVatTotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between w-2/3 lg:w-3/4 xl:w-2/3 pt-2 border-t border-slate-300 font-extrabold text-slate-900 text-xs">
                      <span>Grand Total:</span>
                      <span className="font-mono">{mbGrandTotal.toFixed(2)} {businessProfile.currency}</span>
                    </div>
                  </div>

                  {/* Bank Details Blueprint Block */}
                  {(businessProfile.bankName || businessProfile.iban) && (
                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-[9px] text-slate-600 space-y-1 mt-3">
                      <p className="font-bold text-[#4338CA] border-b pb-1">Bank Details / الحساب البنكي:</p>
                      {businessProfile.bankName && <p><span className="font-semibold">Bank:</span> {businessProfile.bankName}</p>}
                      {businessProfile.accountName && <p><span className="font-semibold">Account:</span> {businessProfile.accountName}</p>}
                      {businessProfile.iban && <p className="font-mono break-all"><span className="font-semibold text-slate-500">IBAN:</span> {businessProfile.iban}</p>}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Manual Bill Receipt / View Modal (Locks strictly to A4_FULL as isManualBill resolves true) */}
      {activeManualBillModal && (
        <InvoiceReceiptModal
          invoice={activeManualBillModal}
          businessProfile={businessProfile}
          defaultFormat="A4_FULL"
          onClose={() => setActiveManualBillModal(null)}
        />
      )}

      {/* Manual Bill Clients Modal */}
      {showClientsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white text-slate-900 rounded-2xl shadow-2xl max-w-4xl w-full my-6 overflow-hidden flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center space-x-2 rtl:space-x-reverse">
                <Users className="w-5 h-5 text-indigo-400" />
                <div>
                  <h3 className="font-bold text-base text-slate-100">Saved Manual Bill Clients / قائمة عملاء الفواتير اليدوية</h3>
                  <p className="text-xs text-slate-400">Manage separate clients stored in manualBillClients collection</p>
                </div>
              </div>
              <button
                onClick={() => setShowClientsModal(false)}
                className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 flex flex-col md:flex-row gap-6 overflow-y-auto">
              {/* Form to Create/Update Customer */}
              <div className="w-full md:w-1/3 bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
                <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wider pb-2 border-b">Add New Client / إضافة عميل جديد</h4>
                <form onSubmit={handleCreateClientInModal} className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">Client Name / اسم العميل *</label>
                    <input
                      type="text"
                      placeholder="e.g. Abdullah Trading Est."
                      required
                      value={modalClientName}
                      onChange={(e) => setModalClientName(e.target.value)}
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">VAT/Tax Number / الرقم الضريبي</label>
                    <input
                      type="text"
                      placeholder="e.g. 300000000000003"
                      value={modalClientTax}
                      onChange={(e) => setModalClientTax(e.target.value)}
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">CR Number / رقم السجل التجاري</label>
                    <input
                      type="text"
                      placeholder="e.g. 1010000000"
                      value={modalClientCr}
                      onChange={(e) => setModalClientCr(e.target.value)}
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">Phone Number / رقم الجوال</label>
                    <input
                      type="text"
                      placeholder="e.g. 0500000000"
                      value={modalClientPhone}
                      onChange={(e) => setModalClientPhone(e.target.value)}
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-mono"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-bold rounded-lg transition shadow-sm cursor-pointer"
                  >
                    Save Customer / حفظ العميل
                  </button>
                </form>
              </div>

              {/* Saved Customers List */}
              <div className="flex-1 space-y-4">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search saved clients... / ابحث في العملاء"
                    value={clientSearchInModal}
                    onChange={(e) => setClientSearchInModal(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-100 max-h-[350px] overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-600 border-b border-slate-100 font-bold">
                        <th className="py-2.5 px-3">Name / الاسم</th>
                        <th className="py-2.5 px-3">Tax/VAT / الضريبي</th>
                        <th className="py-2.5 px-3">CR / السجل</th>
                        <th className="py-2.5 px-3">Phone / الجوال</th>
                        <th className="py-2.5 px-3 text-center">Delete / حذف</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {filteredClientsInModal.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-slate-400">
                            No clients saved / لا يوجد عملاء محفوظين
                          </td>
                        </tr>
                      ) : (
                        filteredClientsInModal.map((client) => (
                          <tr key={client.id} className="hover:bg-slate-50/50 transition">
                            <td className="py-2 px-3 font-semibold text-slate-800">{client.name}</td>
                            <td className="py-2 px-3 font-mono text-slate-600">{client.taxNumber || 'N/A'}</td>
                            <td className="py-2 px-3 font-mono text-slate-600">{client.crNumber || 'N/A'}</td>
                            <td className="py-2 px-3 font-mono text-slate-600">{client.phone || 'N/A'}</td>
                            <td className="py-2 px-3 text-center">
                              <button
                                onClick={() => handleDeleteClient(client.id)}
                                className="p-1 hover:bg-rose-50 text-rose-500 hover:text-rose-700 rounded transition cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
