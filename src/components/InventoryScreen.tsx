import React, { useState } from 'react';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Scale,
  ArrowUpRight,
  ArrowDownRight,
  History,
  AlertTriangle,
  CheckCircle2,
  Package,
  Languages,
  Camera,
} from 'lucide-react';
import { UserRole, BusinessProfile, InventoryItem, StockLog } from '../types';
import {
  addInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  adjustStock,
  subscribeStockLogs,
} from '../services/dbService';
import { translateEnglishToArabic } from '../utils/translationDictionary';
import { normalizeBarcode } from '../utils/barcodeUtils';
import { CameraBarcodeScannerModal } from './CameraBarcodeScannerModal';

interface InventoryScreenProps {
  inventory: InventoryItem[];
  businessProfile: BusinessProfile;
  userRole?: UserRole;
  isLoading?: boolean;
  error?: string | null;
}

export const InventoryScreen: React.FC<InventoryScreenProps> = ({
  inventory,
  businessProfile,
  userRole,
  isLoading,
  error,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [stockLogs, setStockLogs] = useState<StockLog[]>([]);
  const [showLogsModal, setShowLogsModal] = useState(false);

  // Modal State: Item Add/Edit
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Modal State: Stock Adjustment (In / Out)
  const [adjustingItem, setAdjustingItem] = useState<InventoryItem | null>(null);
  const [adjustType, setAdjustType] = useState<'IN' | 'OUT'>('IN');
  const [adjustQty, setAdjustQty] = useState<string>('10');
  const [adjustReason, setAdjustReason] = useState<string>('New Stock Delivery / توريد شحنة جديدة');

  // Form Fields
  const [nameEnglish, setNameEnglish] = useState('');
  const [nameArabic, setNameArabic] = useState('');
  const [isArabicUserEdited, setIsArabicUserEdited] = useState(false);
  const [size, setSize] = useState('1 Piece');
  const [purchasePrice, setPurchasePrice] = useState('30');
  const [price, setPrice] = useState('50');
  const [hasWeightPricing, setHasWeightPricing] = useState(false);
  const [priceUnit, setPriceUnit] = useState('kg');
  const [currentStock, setCurrentStock] = useState('50');
  const [vatRate, setVatRate] = useState('15');
  const [category, setCategory] = useState('General');
  const [sku, setSku] = useState('');
  const [lowStockThreshold, setLowStockThreshold] = useState('5');
  const [barcode, setBarcode] = useState('');
  const [isCameraScannerOpen, setIsCameraScannerOpen] = useState(false);

  const barcodeInputRef = React.useRef<HTMLInputElement>(null);

  const handleEnglishNameChange = (val: string) => {
    setNameEnglish(val);
    if (!isArabicUserEdited) {
      const autoAr = translateEnglishToArabic(val);
      setNameArabic(autoAr);
    }
  };

  const handleArabicNameChange = (val: string) => {
    setNameArabic(val);
    setIsArabicUserEdited(true);
  };

  const handleTriggerAutoTranslate = () => {
    const autoAr = translateEnglishToArabic(nameEnglish);
    setNameArabic(autoAr);
    setIsArabicUserEdited(false);
  };

  // Auto-focus barcode input when modal opens
  React.useEffect(() => {
    if (isItemModalOpen) {
      setTimeout(() => {
        barcodeInputRef.current?.focus();
      }, 150);
    }
  }, [isItemModalOpen]);

  // Load stock logs on modal open
  React.useEffect(() => {
    if (showLogsModal) {
      const unsubscribe = subscribeStockLogs((logs) => setStockLogs(logs));
      return () => unsubscribe();
    }
  }, [showLogsModal]);

  const handleOpenAddModal = () => {
    setEditingItem(null);
    setNameEnglish('');
    setNameArabic('');
    setIsArabicUserEdited(false);
    setSize('1 Piece');
    setPurchasePrice('30');
    setPrice('50');
    setHasWeightPricing(false);
    setPriceUnit('kg');
    setCurrentStock('50');
    setVatRate('15');
    setCategory('General');
    setSku(`SKU-${Math.floor(1000 + Math.random() * 9000)}`);
    setLowStockThreshold('5');
    setBarcode('');
    setIsItemModalOpen(true);
  };

  const handleOpenEditModal = (item: InventoryItem) => {
    setEditingItem(item);
    setNameEnglish(item.productNameEnglish || item.name || '');
    setNameArabic(item.productNameArabic || item.nameAr || '');
    setIsArabicUserEdited(true);
    setSize(item.size);
    setPurchasePrice(item.purchasePrice !== undefined ? item.purchasePrice.toString() : '');
    setPrice(item.price.toString());
    setHasWeightPricing(item.hasWeightPricing);
    setPriceUnit(item.priceUnit || 'kg');
    setCurrentStock(item.currentStock.toString());
    setVatRate((item.vatRate || 15).toString());
    setCategory(item.category || 'General');
    setSku(item.sku || '');
    setLowStockThreshold((item.lowStockThreshold !== undefined ? item.lowStockThreshold : 5).toString());
    setBarcode(item.barcode || '');
    setIsItemModalOpen(true);
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;

    // Barcode uniqueness check & normalization
    const cleanBarcode = normalizeBarcode(barcode);
    if (cleanBarcode) {
      const duplicate = inventory.find(
        (item) =>
          normalizeBarcode(item.barcode || '').toLowerCase() === cleanBarcode.toLowerCase() &&
          item.id !== editingItem?.id
      );
      if (duplicate) {
        alert(
          `Duplicate Barcode! / رمز باركود مكرر!\n"${cleanBarcode}" is already assigned to: ${duplicate.name}`
        );
        return;
      }
    }

    const itemData = {
      name: nameEnglish.trim(),
      nameAr: nameArabic.trim(),
      productNameEnglish: nameEnglish.trim(),
      productNameArabic: nameArabic.trim(),
      size,
      purchasePrice: parseFloat(purchasePrice) || 0,
      price: parseFloat(price) || 0,
      hasWeightPricing,
      priceUnit,
      stockIn: editingItem ? editingItem.stockIn : parseFloat(currentStock) || 0,
      stockOut: editingItem ? editingItem.stockOut : 0,
      currentStock: parseFloat(currentStock) || 0,
      vatRate: parseFloat(vatRate) || 15,
      category,
      sku,
      lowStockThreshold: parseFloat(lowStockThreshold) !== undefined ? parseFloat(lowStockThreshold) : 5,
      barcode: cleanBarcode,
      updatedAt: new Date().toISOString(),
      createdAt: editingItem?.createdAt || new Date().toISOString(),
      createdBy: editingItem?.createdBy || (userRole === 'CASHIER' ? 'Cashier' : 'Admin'),
      createdRole: editingItem?.createdRole || userRole || 'ADMIN',
    };

    setIsSaving(true);
    try {
      if (editingItem) {
        await updateInventoryItem(editingItem.id, itemData);
      } else {
        await addInventoryItem(itemData);
      }
      setIsItemModalOpen(false);
    } catch (err: any) {
      alert(`Firebase Save Error: ${err?.message || err}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this inventory item? / هل أنت تأكد من حذف هذا المنتج؟')) {
      try {
        await deleteInventoryItem(id);
      } catch (err: any) {
        alert(`Firebase Delete Error: ${err?.message || err}`);
      }
    }
  };

  const handleStockAdjustmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingItem) return;

    const qty = parseFloat(adjustQty) || 0;
    if (qty <= 0) return;

    await adjustStock(
      adjustingItem.id,
      adjustingItem.name,
      adjustType,
      qty,
      adjustReason,
      'Manager'
    );

    setAdjustingItem(null);
  };

  const filteredInventory = inventory.filter((item) => {
    const s = searchTerm.toLowerCase();
    const engMatch = (item.productNameEnglish || item.name || '').toLowerCase().includes(s);
    const arMatch = (item.productNameArabic || item.nameAr || '').includes(searchTerm);
    const skuMatch = item.sku ? item.sku.toLowerCase().includes(s) : false;
    const barcodeMatch = item.barcode ? item.barcode.toLowerCase().includes(s) : false;
    return engMatch || arMatch || skuMatch || barcodeMatch;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Firebase Status Banners */}
      {isLoading && (
        <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl flex items-center justify-between text-xs text-amber-800 animate-pulse">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
            <span className="font-bold">Syncing inventory items from Firebase Firestore... / جاري جلب المنتجات من قاعدة البيانات</span>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-rose-50 border border-rose-200 p-3 rounded-xl flex items-center gap-2 text-xs text-rose-800">
          <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          <span className="font-bold">Firebase Database Warning: {error}</span>
        </div>
      )}

      {/* Top Banner & Control Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100/80 flex items-center justify-center text-[#4338CA] shadow-2xs shrink-0">
            <Package className="w-5.5 h-5.5 text-[#4338CA]" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <span>Inventory & Stock Control / إدارة المخزون</span>
            </h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Manage product prices, weight-based pricing, stock adjustments, and stock logs.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 rtl:space-x-reverse">
          <button
            onClick={() => setShowLogsModal(true)}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all border border-slate-300"
          >
            <History className="w-3.5 h-3.5 text-slate-600" />
            Stock Audit Logs (السجل)
          </button>
          <button
            onClick={handleOpenAddModal}
            className="px-3.5 py-2 bg-[#4338CA] hover:bg-[#3730A3] text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            Add New Item / إضافة منتج
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative bg-white p-2.5 rounded-xl border border-slate-200 shadow-sm">
        <Search className="w-4 h-4 text-slate-400 absolute left-5.5 top-5" />
        <input
          type="text"
          placeholder="Search by product name or SKU... / ابحث باسم المنتج أو الرمز"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-11 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#4338CA] focus:border-[#4338CA] text-slate-900"
        />
      </div>

      {/* Inventory Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#4338CA] text-white font-bold uppercase tracking-wider">
                <th className="p-3">SKU / Item Name</th>
                <th className="p-3">Size & Pricing Type</th>
                <th className="p-3 text-right">Unit Price</th>
                <th className="p-3 text-center">VAT %</th>
                <th className="p-3 text-center">Stock In / Out</th>
                <th className="p-3 text-center">Current Stock</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredInventory.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50 transition-all">
                  
                  {/* Name & SKU */}
                  <td className="p-3">
                    <p className="font-bold text-slate-900 text-sm">{item.productNameEnglish || item.name}</p>
                    {(item.productNameArabic || item.nameAr) && (
                      <p className="font-bold text-indigo-900 text-xs mt-0.5" dir="rtl">
                        {item.productNameArabic || item.nameAr}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-1.5 mt-1 items-center">
                      <span className="text-[10px] text-slate-400">SKU: {item.sku || 'N/A'}</span>
                      {item.barcode && (
                        <span className="text-[10px] text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100 font-mono font-semibold">
                          [|||] {item.barcode}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Size & Weight Pricing */}
                  <td className="p-3">
                    <span className="font-semibold text-slate-700">{item.size}</span>
                    {item.hasWeightPricing && (
                      <span className="ml-2 bg-amber-50 border border-amber-200 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                        <Scale className="w-3 h-3" />
                        Weight ({item.priceUnit || 'kg'})
                      </span>
                    )}
                  </td>

                  {/* Price */}
                  <td className="p-3 text-right font-bold text-[#4338CA] text-sm">
                    {item.price.toFixed(2)} {businessProfile.currency}
                  </td>

                  {/* VAT */}
                  <td className="p-3 text-center font-bold text-slate-700">
                    {item.vatRate || 15}%
                  </td>

                  {/* Stock In / Out */}
                  <td className="p-3 text-center text-[11px] text-slate-500">
                    <span className="text-[#4338CA] font-semibold">+{item.stockIn || 0}</span> /{' '}
                    <span className="text-rose-600 font-semibold">-{item.stockOut || 0}</span>
                  </td>

                  {/* Current Stock */}
                  <td className="p-3 text-center">
                    <div className="flex flex-col items-center gap-1.5">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${
                          item.currentStock <= 0
                            ? 'bg-rose-100 text-rose-800 border border-rose-200'
                            : item.currentStock <= (item.lowStockThreshold !== undefined ? item.lowStockThreshold : 5)
                            ? 'bg-amber-100 text-amber-950 border border-amber-300 animate-pulse'
                            : 'bg-indigo-50 text-[#4338CA] border border-indigo-100'
                        }`}
                      >
                        {item.currentStock <= (item.lowStockThreshold !== undefined ? item.lowStockThreshold : 5) && item.currentStock > 0 && (
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        )}
                        {item.currentStock} {item.hasWeightPricing ? item.priceUnit || 'kg' : 'units'}
                      </span>
                      {item.currentStock > 0 && item.currentStock <= (item.lowStockThreshold !== undefined ? item.lowStockThreshold : 5) && (
                        <span className="text-[10px] text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200/50 flex items-center gap-0.5">
                          Low Stock / حد أدنى: {item.lowStockThreshold !== undefined ? item.lowStockThreshold : 5}
                        </span>
                      )}
                      {item.lowStockThreshold !== undefined && item.currentStock > item.lowStockThreshold && (
                        <span className="text-[9.5px] text-slate-400 font-medium">
                          Min Limit: {item.lowStockThreshold}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="p-3 text-right space-x-1.5 rtl:space-x-reverse">
                    <button
                      onClick={() => {
                        setAdjustingItem(item);
                        setAdjustType('IN');
                        setAdjustQty('10');
                      }}
                      className="px-2.5 py-1.5 bg-[#EEF2FF] hover:bg-indigo-100 text-[#4338CA] rounded-lg text-xs font-bold border border-indigo-200 transition-all inline-flex items-center gap-1"
                    >
                      <ArrowUpRight className="w-3.5 h-3.5" />
                      Adjust
                    </button>
                    <button
                      onClick={() => handleOpenEditModal(item)}
                      className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD / EDIT ITEM MODAL */}
      {isItemModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 my-8">
            <h3 className="font-bold text-lg text-slate-900 border-b pb-2">
              {editingItem ? 'Edit Product / تعديل المنتج' : 'Add New Product / إضافة منتج جديد'}
            </h3>

            <form onSubmit={handleSaveItem} className="space-y-3 text-xs">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-700 block">Barcode Number / رقم الباركود:</label>
                  <button
                    type="button"
                    onClick={() => setIsCameraScannerOpen(true)}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                  >
                    <Camera className="w-3 h-3 text-emerald-600" />
                    <span>Camera Scan / مسح بالكاميرا</span>
                  </button>
                </div>
                <input
                  ref={barcodeInputRef}
                  type="text"
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  placeholder="Scan barcode or type manually... / امسح الباركود أو اكتب يدوياً"
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 font-mono text-indigo-900 font-bold"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  * Position the cursor here and scan a barcode, enter it manually, or click Camera Scan. Must be unique.
                </p>
              </div>

              {/* Bilingual Product Name Fields */}
              <div className="space-y-3 p-3 bg-indigo-50/50 rounded-xl border border-indigo-100">
                <div>
                  <label className="font-bold text-slate-800 flex items-center justify-between mb-1">
                    <span>English Product Name (LTR):</span>
                    <span className="text-[10px] text-indigo-800 font-normal">Direction: LTR</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={nameEnglish}
                    onChange={(e) => handleEnglishNameChange(e.target.value)}
                    placeholder="e.g. Chicken Biryani, Mineral Water..."
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 font-sans"
                    dir="ltr"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-slate-800 flex items-center gap-1" dir="rtl">
                      <span>اسم المنتج بالعربية - اختياري (RTL):</span>
                    </label>
                    <button
                      type="button"
                      onClick={handleTriggerAutoTranslate}
                      className="text-[10px] font-bold text-indigo-800 hover:text-indigo-950 flex items-center gap-1 bg-white px-2 py-0.5 rounded border border-indigo-200"
                      title="Auto-translate using offline dictionary"
                    >
                      <Languages className="w-3 h-3 text-indigo-600" />
                      Auto-Translate / ترجمة آلياً
                    </button>
                  </div>
                  <input
                    type="text"
                    value={nameArabic}
                    onChange={(e) => handleArabicNameChange(e.target.value)}
                    placeholder="مثال: برياني دجاج، مياه معدنية... (اختياري / Optional)"
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 font-sans text-right"
                    dir="rtl"
                  />
                  <p className="text-[9.5px] text-slate-500 mt-1 flex items-center gap-1">
                    <Languages className="w-3 h-3 text-indigo-600 shrink-0" />
                    <span>Auto-generated from built-in offline dictionary (Optional). Editable manually.</span>
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Size / الحجم:</label>
                  <input
                    type="text"
                    required
                    value={size}
                    onChange={(e) => setSize(e.target.value)}
                    placeholder="e.g., 1 kg / Box / 500ml"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Category / التصنيف:</label>
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Purchase Price (SAR) / سعر الشراء:</label>
                  <input
                    type="number"
                    step="0.01"
                    value={purchasePrice}
                    onChange={(e) => setPurchasePrice(e.target.value)}
                    placeholder="e.g. 30"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Selling Price (VAT-Inc, SAR) / سعر البيع:</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 font-bold text-indigo-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Stock Level / الكمية:</label>
                  <input
                    type="number"
                    required
                    value={currentStock}
                    onChange={(e) => setCurrentStock(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 font-bold"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">VAT % / نسبة الضريبة:</label>
                  <select
                    value={vatRate}
                    onChange={(e) => setVatRate(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="15">15%</option>
                    <option value="5">5%</option>
                    <option value="0">0%</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">VAT % / نسبة الضريبة:</label>
                  <select
                    value={vatRate}
                    onChange={(e) => setVatRate(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="15">15%</option>
                    <option value="5">5%</option>
                    <option value="0">0%</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1 text-rose-700">Low Stock Limit / الحد الأدنى للمخزون:</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={lowStockThreshold}
                    onChange={(e) => setLowStockThreshold(e.target.value)}
                    className="w-full p-2.5 bg-rose-50/30 border border-rose-200 rounded-xl focus:ring-2 focus:ring-rose-500 text-rose-950 font-bold"
                  />
                </div>
              </div>

              {/* Weight Pricing Toggle */}
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl space-y-2">
                <label className="flex items-center space-x-2 rtl:space-x-reverse font-bold text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasWeightPricing}
                    onChange={(e) => setHasWeightPricing(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                  />
                  <span>Weight-based Pricing (بيع بالوزن / بالكيلو)</span>
                </label>

                {hasWeightPricing && (
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                      Weight Unit / وحدة الوزن:
                    </label>
                    <select
                      value={priceUnit}
                      onChange={(e) => setPriceUnit(e.target.value)}
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs"
                    >
                      <option value="kg">Kilogram (kg)</option>
                      <option value="g">Gram (g)</option>
                      <option value="m">Meter (m)</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="flex space-x-2 rtl:space-x-reverse pt-2">
                <button
                  type="button"
                  onClick={() => setIsItemModalOpen(false)}
                  className="w-1/2 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow"
                >
                  Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* STOCK ADJUSTMENT MODAL */}
      {adjustingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <h3 className="font-bold text-base text-slate-900 border-b pb-2">
              Adjust Stock: {adjustingItem.name}
            </h3>

            <form onSubmit={handleStockAdjustmentSubmit} className="space-y-3 text-xs">
              <div className="flex bg-slate-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setAdjustType('IN')}
                  className={`w-1/2 py-2 font-bold rounded-lg flex items-center justify-center gap-1 ${
                    adjustType === 'IN' ? 'bg-indigo-600 text-white shadow' : 'text-slate-600'
                  }`}
                >
                  <ArrowUpRight className="w-4 h-4" />
                  Stock IN (+ إضافة)
                </button>
                <button
                  type="button"
                  onClick={() => setAdjustType('OUT')}
                  className={`w-1/2 py-2 font-bold rounded-lg flex items-center justify-center gap-1 ${
                    adjustType === 'OUT' ? 'bg-rose-600 text-white shadow' : 'text-slate-600'
                  }`}
                >
                  <ArrowDownRight className="w-4 h-4" />
                  Stock OUT (- خصم)
                </button>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Quantity / الكمية:</label>
                <input
                  type="number"
                  step="1"
                  required
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 text-base font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Reason / الملاحظات:</label>
                <input
                  type="text"
                  required
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex space-x-2 rtl:space-x-reverse pt-2">
                <button
                  type="button"
                  onClick={() => setAdjustingItem(null)}
                  className="w-1/2 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 bg-indigo-600 text-white font-bold rounded-xl shadow"
                >
                  Confirm Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* STOCK LOGS MODAL */}
      {showLogsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-center pb-3 border-b border-slate-200">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <History className="w-5 h-5 text-indigo-600" />
                Stock Adjustment Logs / سجل حركة المخزون
              </h3>
              <button
                onClick={() => setShowLogsModal(false)}
                className="text-xs font-bold text-slate-500 hover:text-slate-800"
              >
                Close
              </button>
            </div>

            <div className="flex-1 overflow-y-auto my-4 space-y-2 pr-1">
              {stockLogs.length === 0 ? (
                <p className="text-center py-8 text-slate-500 text-xs">No stock movement logs recorded yet.</p>
              ) : (
                stockLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs"
                  >
                    <div>
                      <span
                        className={`font-bold px-2 py-0.5 rounded text-[10px] mr-2 ${
                          log.type === 'IN' ? 'bg-indigo-100 text-indigo-800' : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {log.type === 'IN' ? '+ Stock IN' : '- Stock OUT'} ({log.quantity})
                      </span>
                      <span className="font-bold text-slate-900">{log.itemName}</span>
                      <p className="text-[10.5px] text-slate-500 mt-1">
                        Reason: {log.reason} | By: {log.performedBy || 'System'}
                      </p>
                    </div>

                    <div className="text-right text-[10px] text-slate-400 font-sans">
                      <div>Stock: {log.previousStock} → {log.newStock}</div>
                      <div>{new Date(log.timestamp).toLocaleString()}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Camera Barcode Scanner for Inventory Item */}
      <CameraBarcodeScannerModal
        isOpen={isCameraScannerOpen}
        onClose={() => setIsCameraScannerOpen(false)}
        onScan={(scanned) => {
          setBarcode(normalizeBarcode(scanned));
          setIsCameraScannerOpen(false);
          return true;
        }}
      />
    </div>
  );
};
