#!/bin/bash
cat << 'INNEREOF' > src/components/ManualBillScreen.tsx
import React, { useState, useMemo } from 'react';
import { ArrowLeft, Building, CheckCircle, Plus, Printer, Search, Trash2, FileText, Receipt } from 'lucide-react';
import { BusinessProfile, CartItem, InventoryItem, Invoice, UserRole } from '../types';
import { createInvoice } from '../services/dbService';
import { InvoiceReceiptModal } from './InvoiceReceiptModal';
import { MerchantBankDetailsForm } from './MerchantBankDetailsForm';

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
  // Customer & Bill Details State
  const [mbCustomerName, setMbCustomerName] = useState('');
  const [mbTaxNumber, setMbTaxNumber] = useState('');
  const [mbCrNumber, setMbCrNumber] = useState('');
  const [mbPhone, setMbPhone] = useState('');
  const [mbInvoiceDate, setMbInvoiceDate] = useState(() => new Date().toISOString().substring(0, 10));
  const [mbInvoiceTime, setMbInvoiceTime] = useState(() => new Date().toTimeString().substring(0, 5));
  const [mbPaymentMethod, setMbPaymentMethod] = useState<'CASH' | 'MADA' | 'BANK_TRANSFER' | 'CREDIT_BAQAYA'>('CASH');

  // Items State
  const [mbItems, setMbItems] = useState<CartItem[]>([]);
  const [mbInventorySearch, setMbInventorySearch] = useState('');

  // Manual Item Form State
  const [showManualItemForm, setShowManualItemForm] = useState(false);
  const [manualItemName, setManualItemName] = useState('');
  const [manualItemQty, setManualItemQty] = useState('1');
  const [manualItemPrice, setManualItemPrice] = useState('');

  // Active Manual Bill Modal State
  const [activeManualBillModal, setActiveManualBillModal] = useState<Invoice | null>(null);

  // Helper for ISO DateTime
  const getMbDateTimeIso = () => {
    if (!mbInvoiceDate) return new Date().toISOString();
    const timeStr = mbInvoiceTime ? mbInvoiceTime : '00:00';
    const d = new Date(`${mbInvoiceDate}T${timeStr}:00`);
    return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
  };

  // Inventory Filter
  const filteredMbInventory = mbInventorySearch.trim()
    ? inventory.filter(
        (item) =>
          item.name.toLowerCase().includes(mbInventorySearch.toLowerCase()) ||
          (item.productNameEnglish && item.productNameEnglish.toLowerCase().includes(mbInventorySearch.toLowerCase())) ||
          (item.sku && item.sku.toLowerCase().includes(mbInventorySearch.toLowerCase())) ||
          (item.barcode && item.barcode.toLowerCase().includes(mbInventorySearch.toLowerCase()))
      )
    : [];

  const handleAddInventoryItemToMb = (item: InventoryItem) => {
    const existingIdx = mbItems.findIndex((i) => i.item.id === item.id);
    if (existingIdx >= 0) {
      const updated = [...mbItems];
      const newQty = updated[existingIdx].quantity + 1;
      const vatRate = updated[existingIdx].vatRate;
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
      const vatRate = item.vatRate ?? businessProfile.defaultVatRate ?? 15;
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

  // Calculations
  const mbSubtotal = mbItems.reduce((acc, i) => acc + (i.lineSubtotal || 0), 0);
  const mbVatTotal = mbItems.reduce((acc, i) => acc + (i.lineVat || 0), 0);
  const mbGrandTotal = mbSubtotal + mbVatTotal;

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
      paymentStatus: 'PAID',
      cashierRole: userRole,
      createdAt: nowIso,
    };
  }, [mbCustomerName, mbTaxNumber, mbCrNumber, mbPhone, mbItems, mbSubtotal, mbVatTotal, mbGrandTotal, mbPaymentMethod, businessProfile, userRole]);

  const handlePrintManualBillPreview = () => {
    if (!mbCustomerName.trim()) {
      alert('Customer Name is required / يرجى إدخال اسم العميل');
      return;
    }
    if (mbItems.length === 0) {
      alert('Please add at least one item to the invoice / يرجى إضافة صنف واحد على الأقل للفاتورة');
      return;
    }
    if (previewInvoice) {
      setActiveManualBillModal(previewInvoice);
    }
  };

  const handleSaveManualBill = async () => {
    if (!mbCustomerName.trim()) {
      alert('Customer Name is required / يرجى إدخال اسم العميل');
      return;
    }
    if (mbItems.length === 0) {
      alert('Please add at least one item / يرجى إضافة صنف واحد على الأقل');
      return;
    }

    const invoiceNumber = `INV-M-${Date.now().toString().slice(-6)}`;
    const nowIso = getMbDateTimeIso();

    const invoiceData: Omit<Invoice, 'id' | 'createdAt'> = {
      invoiceNumber,
      businessProfile,
      customer: {
        id: `cust-manual-${Date.now()}`,
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
      paymentStatus: 'PAID',
      cashierRole: userRole,
    };

    try {
      const savedInvoice = await createInvoice(invoiceData);
      if (onInvoiceCreated) {
        onInvoiceCreated(savedInvoice);
      }
      setActiveManualBillModal(savedInvoice);

      // Reset form
      setMbCustomerName('');
      setMbTaxNumber('');
      setMbCrNumber('');
      setMbPhone('');
      setMbInvoiceDate(new Date().toISOString().substring(0, 10));
      setMbInvoiceTime(new Date().toTimeString().substring(0, 5));
      setMbItems([]);
    } catch (err) {
      console.error('Error saving manual bill:', err);
      alert('Failed to save manual bill / فشل حفظ الفاتورة اليدوية');
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 animate-fadeIn">
      {/* Left Column: Form & Items */}
      <div className="w-full lg:w-2/3 bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-6">
        {/* Manual Bill Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
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
                Enter one-off customer tax details, scan or search inventory, and issue a real ZATCA-compliant tax invoice.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg cursor-pointer"
            >
              Cancel / إلغاء
            </button>
            <button
              onClick={handlePrintManualBillPreview}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold rounded-lg flex items-center gap-1 shadow cursor-pointer"
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
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5 border-b pb-2">
              <Building className="w-4 h-4 text-slate-500" />
              <span>Customer Details / بيانات العميل</span>
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Customer Name / اسم العميل *</label>
                <input
                  type="text"
                  placeholder="e.g. Abdullah Trading Est."
                  value={mbCustomerName}
                  onChange={(e) => setMbCustomerName(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500"
                />
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
                      (i) => (i.barcode && i.barcode.trim().toLowerCase() === mbInventorySearch.trim().toLowerCase()) ||
                             (i.sku && i.sku.trim().toLowerCase() === mbInventorySearch.trim().toLowerCase())
                    );
                    if (found) {
                      handleAddInventoryItemToMb(found);
                    }
                  }
                }}
                className="w-full p-2.5 pl-9 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />

              {filteredMbInventory.length > 0 && (
                <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-60 overflow-y-auto">
                  {filteredMbInventory.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleAddInventoryItemToMb(item)}
                      className="p-2.5 hover:bg-slate-50 cursor-pointer flex items-center justify-between border-b last:border-b-0 text-xs"
                    >
                      <div>
                        <p className="font-bold text-slate-900">{item.productNameEnglish || item.name}</p>
                        <p className="text-[10px] text-slate-400">Stock: {item.currentStock} • Barcode: {item.barcode || 'N/A'}</p>
                      </div>
                      <span className="font-mono font-bold text-blue-600">{item.price.toFixed(2)} SAR</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Items Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden overflow-x-auto">
              <table className="w-full text-left text-xs whitespace-nowrap min-w-[500px]">
                <thead className="bg-slate-900 text-white font-bold">
                  <tr>
                    <th className="p-2.5">Item</th>
                    <th className="p-2.5 w-20 text-center">Qty</th>
                    <th className="p-2.5 w-24 text-right">Price</th>
                    <th className="p-2.5 w-24 text-right">Total</th>
                    <th className="p-2.5 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {mbItems.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-400 italic">
                        No items added yet / لم يتم إضافة بنود
                      </td>
                    </tr>
                  ) : (
                    mbItems.map((ci, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-2.5 font-bold text-slate-800">
                          {ci.item.productNameEnglish || ci.item.name}
                          {ci.item.barcode && <span className="block text-[10px] text-slate-400 font-mono">Barcode: {ci.item.barcode}</span>}
                        </td>
                        <td className="p-2.5 text-center">
                          <input
                            type="number"
                            min="1"
                            value={ci.quantity}
                            onChange={(e) => handleUpdateMbQty(idx, e.target.value)}
                            className="w-16 p-1 text-center bg-slate-50 border border-slate-200 rounded font-mono text-xs"
                          />
                        </td>
                        <td className="p-2.5 text-right font-mono">
                          <input
                            type="number"
                            step="0.01"
                            value={ci.unitPrice}
                            onChange={(e) => handleUpdateMbUnitPrice(idx, e.target.value)}
                            className="w-20 p-1 text-right bg-slate-50 border border-slate-200 rounded font-mono text-xs inline-block"
                          />
                        </td>
                        <td className="p-2.5 text-right font-bold font-mono">
                          {ci.lineTotal.toFixed(2)}
                        </td>
                        <td className="p-2.5 text-right">
                          <button
                            onClick={() => handleRemoveMbItem(idx)}
                            className="p-1 text-rose-500 hover:bg-rose-50 rounded cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Merchant Bank Details Section */}
            <div className="mt-6">
              <MerchantBankDetailsForm
                businessProfile={businessProfile}
                onProfileUpdated={onProfileUpdated}
                userRole={userRole}
                currentUsername={currentUsername}
              />
            </div>

            {/* Totals Summary */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs font-mono">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal (Excl. VAT):</span>
                <span>{mbSubtotal.toFixed(2)} SAR</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>15% VAT Total:</span>
                <span>{mbVatTotal.toFixed(2)} SAR</span>
              </div>
              <div className="flex justify-between text-slate-950 font-bold text-sm border-t pt-2">
                <span>Grand Total (Incl. VAT):</span>
                <span>{mbGrandTotal.toFixed(2)} SAR</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column: Live Preview Pane */}
      <div className="hidden lg:block lg:w-1/3">
        <div className="sticky top-24 bg-slate-100 p-4 rounded-2xl border border-slate-200 space-y-4 shadow-inner min-h-[70vh]">
          <h3 className="font-extrabold text-slate-900 border-b border-slate-200 pb-3 flex items-center justify-between">
            <span className="flex items-center gap-2"><Receipt className="w-5 h-5 text-emerald-600" /> Live A4 Preview</span>
          </h3>
          
          {!previewInvoice ? (
            <div className="flex flex-col items-center justify-center text-center h-[50vh] opacity-60">
               <FileText className="w-16 h-16 text-slate-300 mb-4" />
               <p className="text-sm font-bold text-slate-500">Awaiting Invoice Details</p>
               <p className="text-xs text-slate-400 mt-2 max-w-[200px]">Fill in the customer name and add at least one item to see the live rendering here.</p>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 shadow-sm p-6 rounded-md font-sans text-xs relative max-h-[75vh] overflow-y-auto">
               <div className="text-center pb-4 border-b border-slate-200 mb-4">
                  <h4 className="font-bold text-lg uppercase text-slate-800">Tax Invoice</h4>
                  <p className="text-[10px] text-slate-500">فاتورة ضريبية</p>
               </div>
               
               <div className="flex justify-between mb-4">
                 <div>
                    <p className="font-bold text-slate-800 text-sm">{previewInvoice.businessProfile.businessName}</p>
                    <p className="text-[10px] text-slate-600 mt-1">VAT Number: {previewInvoice.businessProfile.vatNumber}</p>
                    <p className="text-[10px] text-slate-600">CR Number: {previewInvoice.businessProfile.crNumber}</p>
                 </div>
                 <div className="text-right">
                    <p className="font-bold text-slate-800">No: {previewInvoice.invoiceNumber}</p>
                    <p className="text-[10px] text-slate-600 mt-1">Date: {new Date(previewInvoice.createdAt).toLocaleDateString()}</p>
                    <p className="text-[10px] text-slate-600">Payment: {previewInvoice.paymentMethod}</p>
                 </div>
               </div>

               <div className="bg-slate-50 p-3 border border-slate-200 rounded-lg mb-4 text-[10px]">
                 <div className="font-bold text-slate-800 mb-1 border-b pb-1">Billed To / العميل:</div>
                 <p className="font-bold text-sm text-slate-900">{previewInvoice.customer?.name}</p>
                 {previewInvoice.customer?.taxNumber && <p className="mt-1"><span className="font-semibold text-slate-600">VAT:</span> {previewInvoice.customer.taxNumber}</p>}
                 {previewInvoice.customer?.crNumber && <p><span className="font-semibold text-slate-600">CR:</span> {previewInvoice.customer.crNumber}</p>}
                 {previewInvoice.customer?.phone && <p><span className="font-semibold text-slate-600">Phone:</span> {previewInvoice.customer.phone}</p>}
               </div>

               <table className="w-full text-left text-[10px] mb-4">
                 <thead className="border-b border-slate-200 text-slate-600 uppercase">
                   <tr>
                     <th className="py-2">Description</th>
                     <th className="py-2 text-center">Qty</th>
                     <th className="py-2 text-right">Unit Price</th>
                     <th className="py-2 text-right">Total</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                   {previewInvoice.items.map((item, idx) => (
                     <tr key={idx}>
                       <td className="py-2 font-bold text-slate-800">{item.item.productNameEnglish || item.item.name}</td>
                       <td className="py-2 text-center text-slate-600">{item.quantity}</td>
                       <td className="py-2 text-right text-slate-600 font-mono">{item.unitPrice.toFixed(2)}</td>
                       <td className="py-2 text-right font-mono font-bold text-slate-900">{item.lineTotal.toFixed(2)}</td>
                     </tr>
                   ))}
                 </tbody>
               </table>

               <div className="border-t border-slate-200 pt-3 space-y-1.5 text-[10px] flex flex-col items-end">
                 <div className="flex justify-between w-2/3 lg:w-3/4 xl:w-2/3">
                   <span className="text-slate-600">Subtotal (Excl. VAT):</span>
                   <span className="font-mono">{previewInvoice.subtotal.toFixed(2)}</span>
                 </div>
                 <div className="flex justify-between w-2/3 lg:w-3/4 xl:w-2/3">
                   <span className="text-slate-600">15% VAT:</span>
                   <span className="font-mono">{previewInvoice.vatTotal.toFixed(2)}</span>
                 </div>
                 <div className="flex justify-between w-2/3 lg:w-3/4 xl:w-2/3 pt-2 border-t border-slate-300 font-extrabold text-slate-900 text-xs">
                   <span>Grand Total:</span>
                   <span className="font-mono">{previewInvoice.grandTotal.toFixed(2)} {previewInvoice.businessProfile.currency}</span>
                 </div>
               </div>
            </div>
          )}
        </div>
      </div>

      {/* Manual Bill Receipt Modal */}
      {activeManualBillModal && (
        <InvoiceReceiptModal
          invoice={activeManualBillModal}
          businessProfile={businessProfile}
          defaultFormat={activeManualBillModal.id.startsWith('preview-') ? 'A4_FULL' : 'THERMAL_80MM'}
          onClose={() => setActiveManualBillModal(null)}
        />
      )}
    </div>
  );
};
INNEREOF
chmod +x fix_manual_bill.sh
./fix_manual_bill.sh
