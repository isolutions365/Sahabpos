import React, { useState, useEffect } from 'react';
import {
  FileText,
  Search,
  Plus,
  X,
  Printer,
  Trash2,
  Calendar,
  Building,
  Phone,
  Hash,
  AlertCircle,
  Eye,
  CheckCircle,
  Clock,
  ArrowLeft,
  ChevronRight,
  Users,
  UserCheck,
} from 'lucide-react';
import { BusinessProfile, InventoryItem, UserRole, Quotation, QuotationItem, QuotationClient } from '../types';
import {
  createQuotation,
  deleteQuotation,
  subscribeQuotations,
  subscribeQuotationClients,
  saveOrUpdateQuotationClient,
  deleteQuotationClient,
} from '../services/dbService';
import { MerchantBankDetailsForm } from './MerchantBankDetailsForm';

interface QuotationsScreenProps {
  businessProfile: BusinessProfile;
  userRole: UserRole;
  inventory: InventoryItem[];
  onNewBillClick?: () => void;
  onProfileUpdated?: (updated: BusinessProfile) => void;
  currentUsername?: string;
}

export const QuotationsScreen: React.FC<QuotationsScreenProps> = ({
  businessProfile,
  userRole,
  inventory,
  onNewBillClick,
  onProfileUpdated,
  currentUsername = 'cashier',
}) => {
  // Quotations history
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Navigation / Modal States
  type ViewMode = 'list' | 'quotation';
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [activeQuotationModal, setActiveQuotationModal] = useState<Quotation | null>(null);

  // Saved Quotation Clients state
  const [quotationClients, setQuotationClients] = useState<QuotationClient[]>([]);
  const [showClientSuggestions, setShowClientSuggestions] = useState(false);
  const [showClientsModal, setShowClientsModal] = useState(false);
  const [clientSearchInModal, setClientSearchInModal] = useState('');

  // New client form in modal
  const [modalClientName, setModalClientName] = useState('');
  const [modalClientTax, setModalClientTax] = useState('');
  const [modalClientCr, setModalClientCr] = useState('');
  const [modalClientPhone, setModalClientPhone] = useState('');

  // Form State
  const [clientName, setClientName] = useState('');
  const [clientTaxNumber, setClientTaxNumber] = useState('');
  const [clientCrNumber, setClientCrNumber] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [quotationDate, setQuotationDate] = useState(() => new Date().toISOString().substring(0, 10));
  const [validityDays, setValidityDays] = useState('15'); // default 15 days
  const [notes, setNotes] = useState('');

  // Cart / Items State
  const [quotedItems, setQuotedItems] = useState<QuotationItem[]>([]);
  const [inventorySearch, setInventorySearch] = useState('');

  // Custom Item Fields & Autocomplete State
  const [customItemName, setCustomItemName] = useState('');
  const [customItemPrice, setCustomItemPrice] = useState('');
  const [customItemWeight, setCustomItemWeight] = useState('');
  const [showCustomSuggestions, setShowCustomSuggestions] = useState(false);
  const [selectedCustomInventoryItem, setSelectedCustomInventoryItem] = useState<InventoryItem | null>(null);

  // Manual Bill Toggle State

  // Fetch quotations & quotation clients from Firestore
  useEffect(() => {
    const unsubQuotations = subscribeQuotations((data) => {
      setQuotations(data);
    });
    const unsubClients = subscribeQuotationClients((data) => {
      setQuotationClients(data);
    });
    return () => {
      unsubQuotations();
      unsubClients();
    };
  }, []);

  // Filtered Quotations for History list
  const filteredQuotations = quotations.filter((q) => {
    const term = searchTerm.toLowerCase();
    return (
      q.quotationNumber.toLowerCase().includes(term) ||
      q.clientName.toLowerCase().includes(term) ||
      (q.clientTaxNumber && q.clientTaxNumber.includes(term)) ||
      (q.clientCrNumber && q.clientCrNumber.includes(term))
    );
  });

  // Inventory Search results
  const filteredInventory = inventorySearch.trim() === '' 
    ? [] 
    : inventory.filter((item) => {
        const term = inventorySearch.toLowerCase();
        const eng = (item.productNameEnglish || item.name || '').toLowerCase();
        const ar = (item.productNameArabic || item.nameAr || '').toLowerCase();
        return (
          eng.includes(term) ||
          ar.includes(term) ||
          (item.sku && item.sku.toLowerCase().includes(term)) ||
          (item.barcode && item.barcode.includes(term))
        );
      }).slice(0, 5); // cap results for clean UI

  // Select saved quotation client
  const handleSelectQuotationClient = (client: QuotationClient) => {
    setClientName(client.name);
    setClientTaxNumber(client.taxNumber || '');
    setClientCrNumber(client.crNumber || '');
    setClientPhone(client.phone || '');
    setShowClientSuggestions(false);
  };

  // Custom Item autocomplete suggestions from inventory
  const customItemSuggestions = customItemName.trim() === ''
    ? []
    : inventory.filter((item) => {
        const term = customItemName.toLowerCase();
        const eng = (item.productNameEnglish || item.name || '').toLowerCase();
        const ar = (item.productNameArabic || item.nameAr || '').toLowerCase();
        return (
          eng.includes(term) ||
          ar.includes(term) ||
          (item.sku && item.sku.toLowerCase().includes(term)) ||
          (item.barcode && item.barcode.includes(term))
        );
      }).slice(0, 5);

  const handleSelectCustomSuggestion = (item: InventoryItem) => {
    const eng = item.productNameEnglish || item.name;
    const ar = item.productNameArabic || item.nameAr;
    const displayName = ar ? `${eng} (${ar})` : eng;
    setCustomItemName(displayName);
    setCustomItemPrice(item.price.toString());
    setSelectedCustomInventoryItem(item);
    setShowCustomSuggestions(false);
  };

  // Add item from inventory
  const handleSelectInventoryItem = (item: InventoryItem) => {
    // Check if already exists in quoted items
    const existingIdx = quotedItems.findIndex((q) => q.itemId === item.id);
    const eng = item.productNameEnglish || item.name;
    const ar = item.productNameArabic || item.nameAr;
    const itemNameDisplay = ar ? `${eng} (${ar})` : eng;

    if (existingIdx > -1) {
      const updated = [...quotedItems];
      const exist = updated[existingIdx];
      const newQty = exist.quantity + 1;
      const total = newQty * exist.unitPrice;
      const sub = total / (1 + exist.vatRate / 100);
      const vat = total - sub;
      updated[existingIdx] = {
        ...exist,
        quantity: newQty,
        lineSubtotal: sub,
        lineVat: vat,
        lineTotal: total,
      };
      setQuotedItems(updated);
    } else {
      const total = item.price;
      const sub = total / (1 + (item.vatRate || 15) / 100);
      const vat = total - sub;
      setQuotedItems([
        ...quotedItems,
        {
          itemId: item.id,
          name: itemNameDisplay,
          quantity: 1,
          unitPrice: item.price,
          vatRate: item.vatRate || 15,
          lineSubtotal: sub,
          lineVat: vat,
          lineTotal: total,
          weight: item.hasWeightPricing ? 1 : undefined,
        },
      ]);
    }
    setInventorySearch(''); // Reset search
  };

  // Add custom item
  const handleAddCustomItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customItemName.trim()) return;
    
    const price = parseFloat(customItemPrice) || 0;
    const weightVal = parseFloat(customItemWeight);
    const total = price;
    const vatRate = selectedCustomInventoryItem?.vatRate || businessProfile.defaultVatRate || 15;
    const sub = total / (1 + vatRate / 100);
    const vat = total - sub;

    setQuotedItems([
      ...quotedItems,
      {
        itemId: selectedCustomInventoryItem ? selectedCustomInventoryItem.id : undefined,
        name: customItemName.trim(),
        quantity: 1,
        unitPrice: price,
        vatRate: vatRate,
        lineSubtotal: sub,
        lineVat: vat,
        lineTotal: total,
        weight: isNaN(weightVal) ? undefined : weightVal,
      },
    ]);

    // Reset fields
    setCustomItemName('');
    setCustomItemPrice('');
    setCustomItemWeight('');
    setSelectedCustomInventoryItem(null);
    setShowCustomSuggestions(false);
  };

  // Update item quantity
  const handleUpdateQty = (idx: number, qtyStr: string) => {
    const qty = parseFloat(qtyStr) || 0;
    const updated = [...quotedItems];
    const item = updated[idx];
    const total = qty * item.unitPrice;
    const sub = total / (1 + item.vatRate / 100);
    const vat = total - sub;

    updated[idx] = {
      ...item,
      quantity: qty,
      lineSubtotal: sub,
      lineVat: vat,
      lineTotal: total,
    };
    setQuotedItems(updated);
  };

  // Update item price manually (overridable price)
  const handleUpdateUnitPrice = (idx: number, priceStr: string) => {
    const price = parseFloat(priceStr) || 0;
    const updated = [...quotedItems];
    const item = updated[idx];
    const total = item.quantity * price;
    const sub = total / (1 + item.vatRate / 100);
    const vat = total - sub;

    updated[idx] = {
      ...item,
      unitPrice: price,
      lineSubtotal: sub,
      lineVat: vat,
      lineTotal: total,
    };
    setQuotedItems(updated);
  };

  // Update item weight
  const handleUpdateWeight = (idx: number, weightStr: string) => {
    const weightVal = parseFloat(weightStr);
    const updated = [...quotedItems];
    updated[idx] = {
      ...updated[idx],
      weight: isNaN(weightVal) ? undefined : weightVal,
    };
    setQuotedItems(updated);
  };

  // Remove item
  const handleRemoveItem = (idx: number) => {
    setQuotedItems(quotedItems.filter((_, i) => i !== idx));
  };

  // Calculations
  const runningSubtotal = quotedItems.reduce((acc, item) => acc + item.lineSubtotal, 0);
  const runningVatTotal = quotedItems.reduce((acc, item) => acc + item.lineVat, 0);
  const runningGrandTotal = runningSubtotal + runningVatTotal;

  // Submit Form / Save to Firestore
  const handleSaveQuotation = async () => {
    if (!clientName.trim()) {
      alert('Client Name is required / يرجى إدخال اسم العميل');
      return;
    }
    if (quotedItems.length === 0) {
      alert('Please add at least one item to the quotation / يرجى إضافة بند واحد على الأقل');
      return;
    }

    const quotationNumber = `QTN-${Date.now().toString().slice(-6)}`;
    const validityText = `Valid for ${validityDays} Days / صالح لمدة ${validityDays} يوم`;

    const quotationData: Omit<Quotation, 'id' | 'createdAt'> = {
      quotationNumber,
      businessProfile,
      clientName: clientName.trim(),
      clientTaxNumber: clientTaxNumber.trim() || undefined,
      clientCrNumber: clientCrNumber.trim() || undefined,
      clientPhone: clientPhone.trim() || undefined,
      date: quotationDate,
      validity: validityText,
      items: quotedItems,
      subtotal: runningSubtotal,
      vatTotal: runningVatTotal,
      grandTotal: runningGrandTotal,
      notes: notes.trim() || undefined,
    };

    try {
      // Auto save or update client in quotationClients collection
      await saveOrUpdateQuotationClient({
        name: clientName.trim(),
        taxNumber: clientTaxNumber.trim() || undefined,
        crNumber: clientCrNumber.trim() || undefined,
        phone: clientPhone.trim() || undefined,
      });

      const qId = await createQuotation(quotationData);
      
      // Auto open saved quotation preview
      const savedQuotation: Quotation = {
        id: qId,
        createdAt: new Date().toISOString(),
        ...quotationData,
      };
      
      setActiveQuotationModal(savedQuotation);

      // Reset form & close create state
      setViewMode('list');
      setClientName('');
      setClientTaxNumber('');
      setClientCrNumber('');
      setClientPhone('');
      setQuotedItems([]);
      setNotes('');
      setValidityDays('15');
    } catch (err) {
      console.error('Error saving quotation:', err);
      alert('Failed to save quotation. Please try again.');
    }
  };

  // Add new client from modal form
  const handleAddClientFromModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalClientName.trim()) return;
    try {
      await saveOrUpdateQuotationClient({
        name: modalClientName.trim(),
        taxNumber: modalClientTax.trim() || undefined,
        crNumber: modalClientCr.trim() || undefined,
        phone: modalClientPhone.trim() || undefined,
      });
      setModalClientName('');
      setModalClientTax('');
      setModalClientCr('');
      setModalClientPhone('');
    } catch (err) {
      console.error('Error adding client:', err);
    }
  };

  // Delete Quotation
  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this quotation? / هل أنت متأكد من حذف عرض السعر؟')) {
      try {
        await deleteQuotation(id);
      } catch (err) {
        console.error('Error deleting quotation:', err);
      }
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* 1. MAIN LIST VIEW */}
      {viewMode === 'list' && (
        <>
          {/* Top Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
            <div>
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-6 h-6 text-indigo-600" />
                <span>Quotations / عروض الأسعار</span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Create commercial quotations, print professional estimates, and download PDFs for customers.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowClientsModal(true)}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl border border-slate-200 shadow-sm flex items-center gap-1.5 cursor-pointer transition-all"
              >
                <Users className="w-4 h-4 text-indigo-600" />
                <span>Saved Clients ({quotationClients.length}) / العملاء</span>
              </button>
              <button
                onClick={() => {
                  if (onNewBillClick) {
                    onNewBillClick();
                  } else {
                    console.warn('New Bill navigation not configured.');
                  }
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-bold rounded-xl shadow transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                New Bill / فاتورة يدوية جديدة
              </button>
              <button
                onClick={() => setViewMode('quotation')}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-bold rounded-xl shadow transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                New Quotation / عرض سعر جديد
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
            <Search className="w-5 h-5 text-slate-400 absolute left-6 top-5" />
            <input
              type="text"
              placeholder="Search by quotation #, company, customer name... / ابحث في العروض"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900"
            />
          </div>

          {/* Quotations List Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-950 text-white font-bold uppercase tracking-wider">
                    <th className="p-3.5">Quotation # & Date</th>
                    <th className="p-3.5">Client Name</th>
                    <th className="p-3.5">Validity</th>
                    <th className="p-3.5">Items Count</th>
                    <th className="p-3.5 text-right">Subtotal</th>
                    <th className="p-3.5 text-right">15% VAT</th>
                    <th className="p-3.5 text-right">Grand Total</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredQuotations.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-10 text-center text-slate-400 italic">
                        No quotations registered yet / لا يوجد عروض أسعار مسجلة
                      </td>
                    </tr>
                  ) : (
                    filteredQuotations.map((q) => (
                      <tr key={q.id} className="hover:bg-slate-50 transition-all">
                        {/* Quote # & Date */}
                        <td className="p-3.5">
                          <p className="font-extrabold text-slate-950 text-sm">{q.quotationNumber}</p>
                          <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5 font-mono">
                            <Calendar className="w-3 h-3" />
                            {q.date}
                          </p>
                        </td>

                        {/* Client Name */}
                        <td className="p-3.5">
                          <p className="font-bold text-slate-800">{q.clientName}</p>
                          <div className="flex gap-x-2 text-[10px] text-slate-400 font-mono mt-0.5">
                            {q.clientTaxNumber && <span>VAT: {q.clientTaxNumber}</span>}
                            {q.clientCrNumber && <span>CR: {q.clientCrNumber}</span>}
                          </div>
                        </td>

                        {/* Validity */}
                        <td className="p-3.5 text-slate-600">
                          <span className="bg-amber-50 text-amber-800 border border-amber-200/50 px-2 py-0.5 rounded-full font-bold text-[10px]">
                            {q.validity.split('/')[0].trim()}
                          </span>
                        </td>

                        {/* Items count */}
                        <td className="p-3.5 text-slate-500 font-mono">
                          {q.items.length} items
                        </td>

                        {/* Subtotal */}
                        <td className="p-3.5 text-right font-semibold text-slate-600 font-mono">
                          {q.subtotal.toFixed(2)}
                        </td>

                        {/* VAT */}
                        <td className="p-3.5 text-right font-semibold text-slate-600 font-mono">
                          {q.vatTotal.toFixed(2)}
                        </td>

                        {/* Grand Total */}
                        <td className="p-3.5 text-right font-black text-slate-950 font-mono text-sm">
                          {q.grandTotal.toFixed(2)} SAR
                        </td>

                        {/* Actions */}
                        <td className="p-3.5 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => setActiveQuotationModal(q)}
                              className="p-1.5 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 rounded-lg transition-all flex items-center justify-center border border-slate-200 cursor-pointer"
                              title="View Quotation"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            {userRole === 'ADMIN' && (
                              <button
                                onClick={(e) => handleDelete(q.id, e)}
                                className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition-all flex items-center justify-center border border-rose-100 cursor-pointer"
                                title="Delete Quotation"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* 2. FORM VIEW (NEW QUOTATION) */}
      {viewMode === 'quotation' && (
        <div className="space-y-6">
          {/* Form Header */}
          <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode('list')}
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 transition-all cursor-pointer"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h2 className="text-base font-extrabold text-slate-900">
                  New Quotation / عرض سعر جديد
                </h2>
                <p className="text-[10px] text-slate-400">
                  Fill in client information and select product list or add custom service estimates.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode('list')}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg cursor-pointer"
              >
                Cancel / إلغاء
              </button>
              <button
                onClick={handleSaveQuotation}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-bold rounded-lg flex items-center gap-1 shadow cursor-pointer"
              >
                <CheckCircle className="w-4 h-4" />
                Generate Quotation / حفظ وعرض
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left side: Form Inputs */}
            <div className="lg:col-span-7 space-y-6">
              
              {/* Client Info Block */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-2">
                  <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                    <Building className="w-4 h-4 text-slate-500" />
                    <span>Client Details / بيانات العميل</span>
                  </h3>

                  <button
                    type="button"
                    onClick={() => setShowClientsModal(true)}
                    className="text-xs text-indigo-700 bg-indigo-50 hover:bg-indigo-100 font-bold px-2.5 py-1 rounded-lg border border-indigo-200 flex items-center gap-1 transition-all cursor-pointer self-start sm:self-auto"
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>Saved Clients ({quotationClients.length}) / العملاء المسجلون</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Client Name (Required) with Saved Clients Autocomplete */}
                  <div className="col-span-1 sm:col-span-2 space-y-1 relative">
                    <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex justify-between">
                      <span>Client / Company Name * <span className="text-rose-500">اسم العميل / الشركة *</span></span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="e.g. Saudi Trading Corp / اكتب البحث أو اختر عميل سابق"
                        value={clientName}
                        onFocus={() => setShowClientSuggestions(true)}
                        onChange={(e) => {
                          setClientName(e.target.value);
                          setShowClientSuggestions(true);
                        }}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 pr-8"
                      />
                      {clientName && (
                        <button
                          type="button"
                          onClick={() => {
                            setClientName('');
                            setClientTaxNumber('');
                            setClientCrNumber('');
                            setClientPhone('');
                          }}
                          className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Autocomplete dropdown of saved quotation clients */}
                    {showClientSuggestions && quotationClients.length > 0 && (
                      <div className="absolute z-20 left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg divide-y divide-slate-100 max-h-56 overflow-y-auto">
                        <div className="bg-slate-50 px-3 py-1.5 text-[10px] font-bold text-slate-500 flex justify-between items-center">
                          <span>SAVED QUOTATION CLIENTS</span>
                          <span className="text-[9px] text-indigo-700">Click row to auto-fill details</span>
                        </div>
                        {quotationClients
                          .filter((c) =>
                            clientName.trim() === '' ||
                            c.name.toLowerCase().includes(clientName.toLowerCase()) ||
                            (c.taxNumber && c.taxNumber.includes(clientName)) ||
                            (c.crNumber && c.crNumber.includes(clientName)) ||
                            (c.phone && c.phone.includes(clientName))
                          )
                          .map((client) => (
                            <div
                              key={client.id}
                              onMouseDown={(e) => {
                                e.preventDefault();
                                handleSelectQuotationClient(client);
                              }}
                              className="p-2.5 hover:bg-indigo-50 cursor-pointer flex justify-between items-center transition-all"
                            >
                              <div>
                                <p className="font-bold text-xs text-slate-900 flex items-center gap-1">
                                  <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
                                  {client.name}
                                </p>
                                <div className="flex gap-2 text-[10px] text-slate-400 font-mono mt-0.5">
                                  {client.taxNumber && <span>Tax: {client.taxNumber}</span>}
                                  {client.crNumber && <span>CR: {client.crNumber}</span>}
                                  {client.phone && <span>Tel: {client.phone}</span>}
                                </div>
                              </div>
                              <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                                Auto-fill
                              </span>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>

                  {/* VAT Number (Optional) */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                      Tax/VAT Number <span className="text-slate-400">الرقم الضريبي</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 3000XXXXXXXX"
                      maxLength={15}
                      value={clientTaxNumber}
                      onChange={(e) => setClientTaxNumber(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-slate-900"
                    />
                  </div>

                  {/* CR Number (Optional) */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                      CR Number <span className="text-slate-400">رقم السجل التجاري</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 1010XXXXXX"
                      value={clientCrNumber}
                      onChange={(e) => setClientCrNumber(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-slate-900"
                    />
                  </div>

                  {/* Phone (Optional) */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                      Phone Number <span className="text-slate-400">رقم الهاتف</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 05XXXXXXXX"
                      value={clientPhone}
                      onChange={(e) => setClientPhone(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-slate-900"
                    />
                  </div>

                  {/* Date (Defaults to today) */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                      Quotation Date <span className="text-slate-400">تاريخ العرض</span>
                    </label>
                    <input
                      type="date"
                      value={quotationDate}
                      onChange={(e) => setQuotationDate(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900"
                    />
                  </div>

                  {/* Quotation Validity */}
                  <div className="col-span-1 sm:col-span-2 space-y-1">
                    <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                      Quotation Validity (Days) <span className="text-slate-400">مدة صلاحية عرض السعر (أيام)</span>
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min="1"
                        placeholder="e.g. 15"
                        value={validityDays}
                        onChange={(e) => setValidityDays(e.target.value)}
                        className="w-24 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 text-center font-bold text-slate-900"
                      />
                      <span className="text-xs text-slate-400 self-center">
                        days. Final statement reads: "Valid for {validityDays} Days"
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Item Selection from Inventory (LIST FIRST REQUIREMENT) */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                <h3 className="font-bold text-sm text-slate-900 border-b pb-2 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Search className="w-4 h-4 text-slate-500" />
                    Add from Inventory / إضافة من المنتجات
                  </span>
                  <span className="text-[10px] text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                    Live Catalog
                  </span>
                </h3>

                {/* Inventory Search Input */}
                <div className="relative">
                  <Search className="w-4.5 h-4.5 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    placeholder="Search or barcode scan inventory... / ابحث أو امسح البارشود"
                    value={inventorySearch}
                    onChange={(e) => setInventorySearch(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                      }
                    }}
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900"
                  />
                  {inventorySearch && (
                    <button
                      type="button"
                      onClick={() => setInventorySearch('')}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Search Results list directly below search input */}
                {inventorySearch.trim() !== '' && (
                  <div className="border border-indigo-200 rounded-lg divide-y divide-slate-100 overflow-hidden bg-white shadow-sm space-y-0 mt-2">
                    {filteredInventory.length === 0 ? (
                      <div className="p-3 text-center text-[11px] text-slate-400">
                        No matching inventory items found / لم يتم العثور على نتائج
                      </div>
                    ) : (
                      filteredInventory.map((item) => {
                        const isExactMatch =
                          (item.barcode && item.barcode.trim().toLowerCase() === inventorySearch.trim().toLowerCase()) ||
                          (item.sku && item.sku.trim().toLowerCase() === inventorySearch.trim().toLowerCase());

                        return (
                          <div
                            key={item.id}
                            onClick={() => handleSelectInventoryItem(item)}
                            className={`p-3 flex justify-between items-center hover:bg-indigo-50/60 cursor-pointer transition-all ${
                              isExactMatch ? 'bg-indigo-50/90 border-l-4 border-l-indigo-600' : ''
                            }`}
                          >
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <p className="font-bold text-xs text-slate-900">{item.name}</p>
                                {isExactMatch && (
                                  <span className="text-[9px] bg-indigo-600 text-white font-bold px-1.5 py-0.5 rounded">
                                    Barcode Match / مطابقة البارشود
                                  </span>
                                )}
                              </div>
                              {item.nameAr && <p className="text-[11px] text-indigo-800 font-medium">{item.nameAr}</p>}
                              <div className="flex items-center gap-3 text-[10px] text-slate-500 font-mono pt-0.5">
                                <span>Stock: <strong className={item.currentStock > 0 ? 'text-slate-700' : 'text-rose-600'}>{item.currentStock}</strong></span>
                                <span>•</span>
                                <span>Price: <strong className="text-indigo-700 font-bold">{item.price.toFixed(2)} SAR</strong></span>
                                {item.barcode && <span>• Barcode: {item.barcode}</span>}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectInventoryItem(item);
                              }}
                              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold text-xs rounded-lg shadow-sm flex items-center gap-1 cursor-pointer transition-all"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              Add / إضافة
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

              {/* Manual Custom Line Item Form (AUTOCOMPLETE LINKED REQUIREMENT) */}
              <form onSubmit={handleAddCustomItem} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4 relative">
                <h3 className="font-bold text-sm text-slate-900 border-b pb-2 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Plus className="w-4 h-4 text-indigo-600" />
                    Add Custom Line / إضافة بند مخصص (خدمة / مادة أخرى)
                  </span>
                  {selectedCustomInventoryItem && (
                    <span className="text-[9px] bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded border border-indigo-200">
                      ✓ Linked from Inventory
                    </span>
                  )}
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  {/* Name with Live Inventory Suggestions */}
                  <div className="sm:col-span-6 space-y-1 relative">
                    <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider flex justify-between">
                      <span>Item Name / اسم البند</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Type service name OR search inventory / اكتب اسم الخدمة أو اسم المنتج"
                        value={customItemName}
                        onFocus={() => setShowCustomSuggestions(true)}
                        onChange={(e) => {
                          setCustomItemName(e.target.value);
                          setShowCustomSuggestions(true);
                          if (selectedCustomInventoryItem && e.target.value !== selectedCustomInventoryItem.name && e.target.value !== `${selectedCustomInventoryItem.name} (${selectedCustomInventoryItem.nameAr || ''})`) {
                            setSelectedCustomInventoryItem(null);
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && customItemSuggestions.length > 0 && showCustomSuggestions) {
                            e.preventDefault();
                            handleSelectCustomSuggestion(customItemSuggestions[0]);
                          }
                        }}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 pr-8"
                      />
                      {customItemName && (
                        <button
                          type="button"
                          onClick={() => {
                            setCustomItemName('');
                            setCustomItemPrice('');
                            setSelectedCustomInventoryItem(null);
                          }}
                          className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Autocomplete suggestion dropdown */}
                    {showCustomSuggestions && customItemName.trim() !== '' && customItemSuggestions.length > 0 && (
                      <div className="absolute z-30 left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden divide-y divide-slate-100 max-h-56 overflow-y-auto">
                        <div className="bg-slate-50 px-3 py-1 text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                          Suggested Catalog Items / منتجات من المخزون
                        </div>
                        {customItemSuggestions.map((item) => (
                          <div
                            key={item.id}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              handleSelectCustomSuggestion(item);
                            }}
                            className="p-2.5 hover:bg-indigo-50 cursor-pointer flex justify-between items-center transition-all"
                          >
                            <div>
                              <p className="font-bold text-xs text-slate-900">{item.name}</p>
                              {item.nameAr && <p className="text-[10px] text-slate-500">{item.nameAr}</p>}
                              <p className="text-[9px] text-slate-400 font-mono mt-0.5">
                                Stock: {item.currentStock} | Price: {item.price.toFixed(2)} SAR
                              </p>
                            </div>
                            <span className="text-[10px] bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded border border-indigo-200">
                              {item.price.toFixed(2)} SAR
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Price */}
                  <div className="sm:col-span-3 space-y-1">
                    <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Unit Price / السعر</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={customItemPrice}
                      onChange={(e) => setCustomItemPrice(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-slate-900"
                    />
                  </div>
                  {/* Weight (Optional) */}
                  <div className="sm:col-span-3 space-y-1">
                    <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Weight / الوزن</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Kg (Optional)"
                      value={customItemWeight}
                      onChange={(e) => setCustomItemWeight(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-slate-900"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-lg shadow flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Line / إضافة البند
                  </button>
                </div>
              </form>

              {/* Notes & Terms Field */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                <h3 className="font-bold text-sm text-slate-900 border-b pb-2 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-slate-500" />
                  Notes & Terms / الملاحظات والشروط
                </h3>
                <textarea
                  rows={3}
                  placeholder="e.g. Terms of payment: 50% advance, 50% on delivery. Delivery lead time: 3 weeks. / شروط الدفع والتسليم..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900"
                />
              </div>

            </div>

            {/* Right side: Selected Items Cart & Running Calculations */}
            <div className="lg:col-span-5 space-y-6">
              
              {/* Selected Quotation Lines */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                <h3 className="font-bold text-sm text-slate-900 border-b pb-2 flex items-center justify-between">
                  <span>Selected Items / البنود المضافة</span>
                  <span className="font-mono text-xs text-slate-400">Total lines: {quotedItems.length}</span>
                </h3>

                {quotedItems.length === 0 ? (
                  <div className="p-8 text-center border border-dashed rounded-xl border-slate-200 text-slate-400 text-xs italic">
                    No items added to the quotation yet. Use the search or custom section to populate / لم تتم إضافة أي بنود حتى الآن
                  </div>
                ) : (
                  <div className="space-y-4 divide-y divide-slate-100 max-h-[420px] overflow-y-auto pr-1">
                    {quotedItems.map((item, idx) => (
                      <div key={idx} className={`pt-3 ${idx === 0 ? 'pt-0' : ''} space-y-2`}>
                        <div className="flex justify-between items-start gap-2">
                          <div className="space-y-0.5">
                            <span className="text-slate-400 text-[10px] font-mono">#{idx+1}</span>
                            <h4 className="font-bold text-xs text-slate-800 leading-tight pr-1">
                              {item.name}
                            </h4>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="p-1 hover:bg-rose-50 text-rose-500 hover:text-rose-700 rounded transition-all cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="grid grid-cols-12 gap-2 pt-1 items-center">
                          {/* Qty Input */}
                          <div className="col-span-4 space-y-0.5">
                            <label className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Qty</label>
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={item.quantity}
                              onChange={(e) => handleUpdateQty(idx, e.target.value)}
                              className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded font-bold text-xs text-center font-mono text-slate-900"
                            />
                          </div>

                          {/* Unit Price (Manually Overridable) */}
                          <div className="col-span-4 space-y-0.5">
                            <label className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Price (Override)</label>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.unitPrice}
                              onChange={(e) => handleUpdateUnitPrice(idx, e.target.value)}
                              className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded font-bold text-xs text-center font-mono text-slate-900"
                            />
                          </div>

                          {/* Optional weight pricing */}
                          <div className="col-span-4 space-y-0.5">
                            <label className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Weight (Kg)</label>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="N/A"
                              value={item.weight ?? ''}
                              onChange={(e) => handleUpdateWeight(idx, e.target.value)}
                              className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded font-semibold text-xs text-center font-mono text-slate-900"
                            />
                          </div>
                        </div>

                        <div className="flex justify-between items-center text-[11px] bg-slate-50/50 p-2 rounded border border-slate-150 font-mono text-slate-700">
                          <span>Subtotal: {item.lineSubtotal.toFixed(2)}</span>
                          <span>VAT ({item.vatRate}%): {item.lineVat.toFixed(2)}</span>
                          <span className="font-bold text-slate-900">Total: {item.lineTotal.toFixed(2)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Running Totals Summary Card */}
              <div className="bg-slate-900 text-white p-5 rounded-xl shadow-md border border-slate-800 space-y-4">
                <h3 className="font-bold text-xs uppercase tracking-wider text-indigo-400 border-b border-white/10 pb-2">
                  Quotation Totals / مجاميع عرض السعر
                </h3>

                <div className="space-y-2 text-xs font-mono">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Items Count / البنود</span>
                    <span className="font-bold">{quotedItems.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Running Subtotal / المجموع</span>
                    <span className="font-bold">{runningSubtotal.toFixed(2)} SAR</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">VAT Total ({businessProfile.defaultVatRate || 15}%) / ضريبة القيمة المضافة</span>
                    <span className="font-bold text-indigo-400">{runningVatTotal.toFixed(2)} SAR</span>
                  </div>
                  
                  <div className="pt-3 border-t border-white/10 flex justify-between items-end">
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase tracking-wider">Estimated Grand Total</span>
                      <span className="text-indigo-400 font-sans text-xs">الإجمالي الختامي لعرض السعر</span>
                    </div>
                    <span className="text-2xl font-black text-white">{runningGrandTotal.toFixed(2)} <span className="text-xs">SAR</span></span>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={handleSaveQuotation}
                    disabled={quotedItems.length === 0}
                    className={`w-full py-3 rounded-xl font-bold text-xs shadow flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      quotedItems.length === 0 
                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50' 
                        : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                    }`}
                  >
                    <CheckCircle className="w-4 h-4" />
                    Save & Generate PDF / حفظ وطباعة عرض السعر
                  </button>
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* 3. QUOTATION PRINT VIEW / DIALOG MODAL */}
      {activeQuotationModal && (() => {
        const q = activeQuotationModal;
        const logo = q.businessProfile?.logo || businessProfile.logo;
        const bProfile = q.businessProfile || businessProfile;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 overflow-y-auto print:absolute print:inset-0 print:bg-white print:p-0 print:z-[9999] print:overflow-visible">
            <div className="bg-white rounded-2xl max-w-4xl w-full p-6 shadow-2xl space-y-6 my-8 text-slate-900 print:shadow-none print:border-none print:p-0 print:m-0 print:max-w-none print:w-full">
              
              {/* Control Panel (Hidden during printing) */}
              <div className="flex flex-wrap justify-between items-center gap-3 border-b pb-4 print:hidden">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-indigo-600" />
                    <h3 className="font-extrabold text-slate-900">
                      Quotation Export Center / مركز طباعة عروض الأسعار
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500">
                    Use the browser print manager to save high-fidelity PDF formats or output to your desktop printer.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => window.print()}
                    className="px-4 py-2 bg-[#4338CA] hover:bg-[#3730A3] active:bg-[#312E81] text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow transition-all cursor-pointer"
                  >
                    <Printer className="w-4 h-4" />
                    Print / Download PDF
                  </button>
                  <button
                    onClick={() => setActiveQuotationModal(null)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg border border-slate-200 transition-all cursor-pointer"
                  >
                    Close / إغلاق
                  </button>
                </div>
              </div>

              {/* Instructions Banner (Hidden during printing) */}
              <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl flex items-start gap-2.5 text-xs text-indigo-950 leading-relaxed print:hidden">
                <AlertCircle className="w-4 h-4 text-indigo-700 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Pro Tip / نصيحة:</p>
                  <p className="text-[11px] text-indigo-800">
                    To save this quotation as a digital file, click <strong>Print / Download PDF</strong> and choose <strong>"Save as PDF" / "حفظ بتنسيق PDF"</strong> in your browser's printer destinations. Make sure to enable <strong>"Background graphics"</strong> under print options if the colors are missing.
                  </p>
                </div>
              </div>

              {/* A4 PAGESIZED PRINT CONTAINER (The Sheet) */}
              <div 
                id="printable-quotation-a4" 
                className="bg-white p-8 pb-16 text-slate-900 shadow-xl border border-slate-200 rounded-none w-full max-w-[800px] mx-auto font-sans text-xs print:shadow-none print:border-none print:w-full print:p-0 print:m-0"
              >
                {/* 1. Profile Header block */}
                <div className="flex justify-between items-start gap-4 border-b border-slate-300 pb-5">
                  <div className="space-y-1 text-left">
                    <h1 className="font-black text-lg text-slate-950 uppercase tracking-tight">
                      {bProfile.businessName}
                    </h1>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      {bProfile.address}<br />
                      Phone: {bProfile.phone}<br />
                      CR Number: {bProfile.crNumber || '1010654321'}<br />
                      VAT Number: {bProfile.vatNumber || '300012345600003'}
                    </p>
                  </div>

                  {/* Logo or placeholder logo icon */}
                  {logo ? (
                    <img 
                      src={logo} 
                      alt="Business Logo" 
                      className="max-h-16 max-w-[150px] object-contain rounded-lg"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-14 h-14 bg-slate-100 border-2 border-slate-200 rounded-xl flex items-center justify-center font-bold text-slate-400">
                      LOGO
                    </div>
                  )}

                  <div className="space-y-1 text-right font-sans">
                    <h1 
                      dir="rtl"
                      className="font-extrabold text-base text-indigo-900 leading-snug [word-break:normal] [overflow-wrap:break-word] [text-wrap:balance]"
                    >
                      {(bProfile.businessNameAr || 'مؤسسة المنشأة التجارية').replace(/بقالة/g, 'تموينات')}
                    </h1>
                    <p className="text-[10px] text-slate-500 leading-relaxed" dir="rtl">
                      سجل تجاري: {bProfile.crNumber || '١٠١٠٦٥٤٣٢١'}<br />
                      الرقم الضريبي: {bProfile.vatNumber || '٣٠٠٠١٢٣٤٥٦٠٠٠٠٣'}<br />
                      العنوان: {bProfile.address}
                    </p>
                  </div>
                </div>

                {/* 2. Quotation Title bar */}
                <div className="my-6 bg-slate-100 border border-slate-300 p-4 rounded text-center space-y-1 print:bg-slate-100">
                  <h2 className="text-base font-black text-slate-900 uppercase tracking-wider">
                    QUOTATION / عرض سعر
                  </h2>
                  <p className="text-[10px] text-slate-500 font-mono">
                    Reference / الرقم المرجعي: <span className="font-extrabold text-slate-900 text-sm">{q.quotationNumber}</span>
                  </p>
                </div>

                {/* 3. Meta Data & Customer Details block */}
                <div className="grid grid-cols-2 gap-6 border border-slate-200 rounded-lg p-4 bg-slate-50/50 my-6 print:bg-transparent">
                  {/* Customer / Client */}
                  <div className="space-y-1.5 border-r border-slate-200 pr-4">
                    <h3 className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Quoted To / العميل</h3>
                    <p className="font-extrabold text-slate-950 text-sm">{q.clientName}</p>
                    
                    <div className="space-y-0.5 font-mono text-[10.5px] text-slate-700">
                      {q.clientTaxNumber && <p>VAT ID: {q.clientTaxNumber}</p>}
                      {q.clientCrNumber && <p>CR Number: {q.clientCrNumber}</p>}
                      {q.clientPhone && <p>Phone: {q.clientPhone}</p>}
                    </div>
                  </div>

                  {/* Date & Terms */}
                  <div className="space-y-1.5 pl-4">
                    <h3 className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Details / التفاصيل</h3>
                    <div className="grid grid-cols-2 gap-y-1 text-[11px]">
                      <span className="font-semibold text-slate-500">Date / التاريخ:</span>
                      <span className="font-bold text-slate-950 font-mono text-right">{q.date}</span>

                      <span className="font-semibold text-slate-500">Validity / الصلاحية:</span>
                      <span className="font-bold text-slate-950 text-right">{q.validity.split('/')[0].trim()}</span>
                      
                      {q.validity.includes('/') && (
                        <>
                          <span className="font-semibold text-slate-500"></span>
                          <span className="font-bold text-indigo-800 text-right">{q.validity.split('/')[1]?.trim()}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* 4. Itemized Table */}
                <table className="w-full text-left border-collapse border border-slate-300 text-[11px] leading-tight my-6">
                  <thead>
                    <tr className="bg-slate-950 text-white font-bold uppercase border-b border-slate-300 print:bg-slate-100 print:text-slate-950">
                      <th className="p-2 border-r border-slate-300 w-10 text-center">#</th>
                      <th className="p-2 border-r border-slate-300">Description / البيان</th>
                      <th className="p-2 border-r border-slate-300 w-16 text-center">Qty / الكمية</th>
                      <th className="p-2 border-r border-slate-300 w-24 text-right">Unit Price / السعر</th>
                      <th className="p-2 border-r border-slate-300 w-24 text-right">VAT % / الضريبة</th>
                      <th className="p-2 text-right w-24">Total / الإجمالي</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-300">
                    {q.items.map((item, index) => (
                      <tr key={index} className="hover:bg-slate-50">
                        <td className="p-2 border-r border-slate-300 text-center font-mono text-slate-400">
                          {index + 1}
                        </td>
                        <td className="p-2 border-r border-slate-300">
                          <p className="font-bold text-slate-950">{item.name}</p>
                          {item.weight !== undefined && (
                            <span className="text-[9.5px] text-slate-500 font-mono block">
                              Weight: {item.weight} kg
                            </span>
                          )}
                        </td>
                        <td className="p-2 border-r border-slate-300 text-center font-bold font-mono">
                          {item.quantity}
                        </td>
                        <td className="p-2 border-r border-slate-300 text-right font-mono">
                          {item.unitPrice.toFixed(2)}
                        </td>
                        <td className="p-2 border-r border-slate-300 text-right font-mono">
                          {item.vatRate}%
                        </td>
                        <td className="p-2 text-right font-bold font-mono">
                          {item.lineTotal.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* 5. Totals block */}
                <div className="flex justify-end my-6">
                  <div className="w-80 border border-slate-300 rounded overflow-hidden">
                    <div className="grid grid-cols-2 p-2 border-b border-slate-200 bg-slate-50/50 print:bg-transparent font-mono text-[11px]">
                      <span className="text-slate-500 font-semibold">Subtotal (Excl. VAT) / المجموع:</span>
                      <span className="font-bold text-right text-slate-950">{q.subtotal.toFixed(2)} SAR</span>
                    </div>
                    <div className="grid grid-cols-2 p-2 border-b border-slate-200 bg-slate-50/50 print:bg-transparent font-mono text-[11px]">
                      <span className="text-slate-500 font-semibold">VAT Total ({bProfile.defaultVatRate || 15}%) / الضريبة:</span>
                      <span className="font-bold text-right text-slate-950">{q.vatTotal.toFixed(2)} SAR</span>
                    </div>
                    <div className="grid grid-cols-2 p-2.5 bg-slate-950 text-white font-mono text-xs print:bg-slate-100 print:text-slate-950 font-black">
                      <span>Grand Total / الإجمالي:</span>
                      <span className="text-right text-indigo-400 print:text-slate-950 font-sans font-bold text-sm">
                        {q.grandTotal.toFixed(2)} SAR
                      </span>
                    </div>
                  </div>
                </div>

                {/* 6. Notes & Terms */}
                {q.notes && (
                  <div className="my-6 border border-slate-200 rounded-lg p-4 bg-slate-50/30 print:bg-transparent">
                    <h4 className="font-bold text-[10px] text-slate-400 uppercase tracking-wider mb-1.5">
                      Terms & Notes / الملاحظات والشروط
                    </h4>
                    <p className="text-[11px] text-slate-700 whitespace-pre-line leading-relaxed">
                      {q.notes}
                    </p>
                  </div>
                )}

                {/* 6.1 Merchant Bank Details for Transfer */}
                {(bProfile.bankName || bProfile.accountName || bProfile.iban) && (
                  <div className="my-4 border border-slate-200 rounded-lg p-3.5 bg-slate-50/50 print:bg-transparent space-y-1">
                    <h4 className="font-extrabold text-[10px] text-slate-800 uppercase tracking-wider flex items-center justify-between">
                      <span>Merchant Bank Details for Transfer / بيانات الحساب البنكي للتحويل</span>
                      <span className="text-[9px] text-indigo-800 font-bold">Direct Bank Payment</span>
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-[11px] font-mono text-slate-800 pt-1">
                      {bProfile.bankName && (
                        <div>
                          <span className="text-slate-500 font-sans font-semibold">Bank Name / البنك:</span>{' '}
                          <strong className="text-slate-900">{bProfile.bankName}</strong>
                        </div>
                      )}
                      {bProfile.accountName && (
                        <div>
                          <span className="text-slate-500 font-sans font-semibold">Account / اسم الحساب:</span>{' '}
                          <strong className="text-slate-900">{bProfile.accountName}</strong>
                        </div>
                      )}
                      {bProfile.iban && (
                        <div className="sm:col-span-2 pt-0.5">
                          <span className="text-slate-500 font-sans font-semibold">IBAN / الآيبان:</span>{' '}
                          <strong className="text-indigo-900 text-xs font-mono tracking-wider">{bProfile.iban}</strong>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 7. Footer / Legal / Stamp */}
                <div className="pt-8 border-t border-slate-300 mt-12 grid grid-cols-3 gap-4 text-center text-[10px] text-slate-400 font-medium">
                  <div>
                    <p className="font-bold text-slate-500 mb-10">Prepared By / أعد بواسطة</p>
                    <div className="border-b border-slate-200 mx-6"></div>
                    <p className="text-[9px] mt-1 text-slate-400">{bProfile.businessName}</p>
                  </div>
                  <div>
                    <p className="font-bold text-slate-500 mb-10">Client Approved / موافقة العميل</p>
                    <div className="border-b border-slate-200 mx-6"></div>
                    <p className="text-[9px] mt-1 text-slate-400">Signature / التوقيع</p>
                  </div>
                  <div className="flex flex-col justify-between items-center h-full">
                    <div className="w-14 h-14 border-2 border-slate-200 border-dashed rounded-full flex items-center justify-center font-bold text-slate-300 text-[9px] leading-tight select-none">
                      STAMP<br />الختم
                    </div>
                    <p className="text-[8px] text-slate-400 font-mono">
                      Ref: {q.quotationNumber}
                    </p>
                  </div>
                </div>

              </div>

              {/* Modal Footer Controls (Hidden during printing) */}
              <div className="flex justify-end pt-4 border-t gap-2 print:hidden">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  Print / Save PDF
                </button>
                <button
                  type="button"
                  onClick={() => setActiveQuotationModal(null)}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl shadow-sm border border-slate-200 transition-all cursor-pointer"
                >
                  Close / إغلاق
                </button>
              </div>

            </div>
          </div>
        );
      })()}

      {/* 4. SAVED QUOTATION CLIENTS DIRECTORY MODAL */}
      {showClientsModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-2xl w-full p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-start border-b pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Users className="w-5 h-5 text-indigo-600" />
                  <span>Saved Quotation Clients / عملاء عروض الأسعار المسجلون</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Directory of commercial & corporate clients saved from price estimates. Completely separate from Baqaya credit customers.
                </p>
              </div>
              <button
                onClick={() => setShowClientsModal(false)}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Add Client Form in Modal */}
            <form onSubmit={handleAddClientFromModal} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1">
                <Plus className="w-3.5 h-3.5 text-indigo-600" />
                Add New Quotation Client / إضافة عميل جديد
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2 space-y-0.5">
                  <label className="text-[10px] font-bold text-slate-600">Company / Client Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Al-Faisaliah Construction Est."
                    value={modalClientName}
                    onChange={(e) => setModalClientName(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-indigo-500 text-slate-900"
                  />
                </div>
                <div className="space-y-0.5">
                  <label className="text-[10px] font-bold text-slate-600">Tax/VAT Number</label>
                  <input
                    type="text"
                    placeholder="15-digit Tax #"
                    maxLength={15}
                    value={modalClientTax}
                    onChange={(e) => setModalClientTax(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono focus:ring-2 focus:ring-indigo-500 text-slate-900"
                  />
                </div>
                <div className="space-y-0.5">
                  <label className="text-[10px] font-bold text-slate-600">CR Number</label>
                  <input
                    type="text"
                    placeholder="10-digit CR #"
                    value={modalClientCr}
                    onChange={(e) => setModalClientCr(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono focus:ring-2 focus:ring-indigo-500 text-slate-900"
                  />
                </div>
                <div className="sm:col-span-2 space-y-0.5">
                  <label className="text-[10px] font-bold text-slate-600">Phone Number</label>
                  <input
                    type="text"
                    placeholder="05XXXXXXXX"
                    value={modalClientPhone}
                    onChange={(e) => setModalClientPhone(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono focus:ring-2 focus:ring-indigo-500 text-slate-900"
                  />
                </div>
              </div>
              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg shadow-sm flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Save Client / حفظ العميل
                </button>
              </div>
            </form>

            {/* Search in Modal */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search quotation clients by name, tax #, CR #..."
                value={clientSearchInModal}
                onChange={(e) => setClientSearchInModal(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 text-slate-900"
              />
            </div>

            {/* Clients Directory List */}
            <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto border border-slate-200 rounded-xl bg-white">
              {quotationClients.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs italic">
                  No saved quotation clients yet. Clients are saved automatically when you generate quotations or add them above.
                </div>
              ) : (
                quotationClients
                  .filter((c) => {
                    const term = clientSearchInModal.toLowerCase();
                    return (
                      c.name.toLowerCase().includes(term) ||
                      (c.taxNumber && c.taxNumber.includes(term)) ||
                      (c.crNumber && c.crNumber.includes(term)) ||
                      (c.phone && c.phone.includes(term))
                    );
                  })
                  .map((c) => (
                    <div key={c.id} className="p-3 flex justify-between items-center hover:bg-slate-50 transition-all">
                      <div className="space-y-0.5">
                        <h4 className="font-bold text-xs text-slate-900">{c.name}</h4>
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-slate-500 font-mono">
                          {c.taxNumber && <span>Tax: {c.taxNumber}</span>}
                          {c.crNumber && <span>CR: {c.crNumber}</span>}
                          {c.phone && <span>Tel: {c.phone}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            handleSelectQuotationClient(c);
                            setViewMode('quotation');
                            setShowClientsModal(false);
                          }}
                          className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 text-[11px] font-bold rounded-lg border border-indigo-200 cursor-pointer transition-all"
                        >
                          Use for Quotation
                        </button>
                        <button
                          onClick={async () => {
                            if (confirm(`Delete saved client "${c.name}"?`)) {
                              await deleteQuotationClient(c.id);
                            }
                          }}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-all cursor-pointer"
                          title="Delete Client"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
              )}
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[11px] text-amber-900 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                <strong>Note:</strong> Quotation Clients are strictly maintained for issuing commercial price estimates. They are completely separate from and never affect Baqaya (Credit) balances or store customer ledgers.
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
