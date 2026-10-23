import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Coins,
  Percent,
  Package,
  AlertTriangle,
  FileText,
  Key,
  ShieldCheck,
  Lock,
  Unlock,
  Plus,
  Copy,
  Check,
  RefreshCw,
  Search,
  Calendar,
  Building,
  CheckCircle,
  XCircle,
  ShieldAlert
} from 'lucide-react';
import { BusinessProfile, InventoryItem, Invoice } from '../types';
import { SaudiRiyalIcon } from './SaudiRiyalIcon';

interface LicenseKey {
  key: string;
  year: number;
  expiryDate: string;
  businessName: string;
  status: 'unused' | 'active' | 'expired' | 'revoked';
  generatedDate: string;
  activatedDate: string | null;
  activatedByDeviceId: string | null;
}

interface LicenseRevenueScreenProps {
  businessProfile: BusinessProfile;
  inventory: InventoryItem[];
  invoices: Invoice[];
  userRole: string;
}

export const LicenseRevenueScreen: React.FC<LicenseRevenueScreenProps> = ({
  businessProfile,
  inventory,
  invoices,
  userRole,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'revenue' | 'licenses'>('revenue');

  // Revenue filters
  const [dateRange, setDateRange] = useState<'today' | 'this_month' | 'this_year' | 'all'>('this_month');

  // License keys state
  const [licenseKeys, setLicenseKeys] = useState<LicenseKey[]>(() => {
    try {
      const saved = localStorage.getItem('waseela_license_keys');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    // Default initial sample key for 2026
    return [
      {
        key: 'WSL-2026-AB12-CD34',
        year: 2026,
        expiryDate: '2026-12-31T23:59:59.000Z',
        businessName: businessProfile.businessName || 'Default Branch',
        status: 'active',
        generatedDate: new Date().toISOString(),
        activatedDate: new Date().toISOString(),
        activatedByDeviceId: 'device-master-001',
      },
    ];
  });

  const [deviceActivation, setDeviceActivation] = useState<{
    key: string;
    year: number;
    deviceId: string;
    activatedDate: string;
  } | null>(() => {
    try {
      const saved = localStorage.getItem('waseela_device_activation');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    // Default active device state bound to sample key for seamless testing
    return {
      key: 'WSL-2026-AB12-CD34',
      year: 2026,
      deviceId: 'device-master-001',
      activatedDate: new Date().toISOString(),
    };
  });

  // Admin PIN & Generate Modal state
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(false);
  const [adminPinInput, setAdminPinInput] = useState<string>('');
  const [showAdminPinModal, setShowAdminPinModal] = useState<boolean>(false);
  const [showGenerateModal, setShowGenerateModal] = useState<boolean>(false);
  const [newKeyBusinessName, setNewKeyBusinessName] = useState(businessProfile.businessName || '');
  const [newKeyYear, setNewKeyYear] = useState<number>(new Date().getFullYear());

  // Cashier / User License Entry State
  const [activationInputKey, setActivationInputKey] = useState<string>('');
  const [activationError, setActivationError] = useState<string | null>(null);
  const [showUpdateModal, setShowUpdateModal] = useState<boolean>(false);
  const [updateKeyInput, setUpdateKeyInput] = useState<string>('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Filter search/status for admin license view
  const [licenseSearchYear, setLicenseSearchYear] = useState<string>('');
  const [licenseSearchStatus, setLicenseSearchStatus] = useState<string>('all');

  // If cashier tries to access admin controls or view, force lock admin auth and keep on user view
  useEffect(() => {
    if (userRole && userRole.toUpperCase() === 'CASHIER') {
      setIsAdminAuthenticated(false);
      setShowAdminPinModal(false);
    }
  }, [userRole]);

  useEffect(() => {
    if (deviceActivation) {
      localStorage.setItem('waseela_device_activation', JSON.stringify(deviceActivation));
    } else {
      localStorage.removeItem('waseela_device_activation');
    }
  }, [deviceActivation]);

  // Unique device ID generator
  const getDeviceId = () => {
    let id = localStorage.getItem('waseela_device_uuid');
    if (!id) {
      id = 'dev-' + Math.random().toString(36).substring(2, 10) + '-' + Date.now();
      localStorage.setItem('waseela_device_uuid', id);
    }
    return id;
  };

  // Check if current device license is active and valid for current year
  const currentYear = new Date().getFullYear();
  let isDeviceLicensed = false;
  let activeLicensedYear = currentYear;

  if (deviceActivation) {
    const matchingKeyObj = licenseKeys.find((k) => k.key === deviceActivation.key);
    if (
      matchingKeyObj &&
      matchingKeyObj.status === 'active' &&
      matchingKeyObj.activatedByDeviceId === getDeviceId()
    ) {
      isDeviceLicensed = true;
      activeLicensedYear = matchingKeyObj.year;
    }
  }

  // Handle License Validation & Activation (First time or update)
  const handleValidateAndActivate = (keyToTest: string, isUpdate: boolean = false) => {
    setActivationError(null);
    const cleanKey = keyToTest.trim().toUpperCase();

    // 1. Format check: WSL-{YEAR}-XXXX-XXXX
    const formatRegex = /^WSL-\d{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
    if (!formatRegex.test(cleanKey)) {
      setActivationError('Invalid license key format. Expected: WSL-YYYY-XXXX-XXXX / تنسيق المفتاح غير صحيح');
      return false;
    }

    // 2. Find key in store
    const keyRecord = licenseKeys.find((k) => k.key === cleanKey);
    if (!keyRecord) {
      setActivationError('License key not found in system database / المفتاح غير موجود في النظام');
      return false;
    }

    // 3. Check status
    if (keyRecord.status === 'revoked' || keyRecord.status === 'expired') {
      setActivationError('This license key has been revoked or expired / هذا المفتاح منتهي أو ملغي');
      return false;
    }

    const deviceId = getDeviceId();

    // 4. Check if bound elsewhere
    if (keyRecord.activatedByDeviceId && keyRecord.activatedByDeviceId !== deviceId) {
      setActivationError('This key is already in use on another device / هذا المفتاح مستخدم بالفعل على جهاز آخر');
      return false;
    }

    // 5. Valid! Proceed to activate
    const nowISO = new Date().toISOString();
    const updatedKeys = licenseKeys.map((k) => {
      if (k.key === cleanKey) {
        return {
          ...k,
          status: 'active' as const,
          activatedDate: nowISO,
          activatedByDeviceId: deviceId,
        };
      }
      // If updating, mark old key as expired
      if (isUpdate && deviceActivation && k.key === deviceActivation.key) {
        return {
          ...k,
          status: 'expired' as const,
        };
      }
      return k;
    });

    setLicenseKeys(updatedKeys);
    setDeviceActivation({
      key: cleanKey,
      year: keyRecord.year,
      deviceId,
      activatedDate: nowISO,
    });

    setActivationInputKey('');
    setUpdateKeyInput('');
    setShowUpdateModal(false);
    alert('License activated successfully! / تم تفعيل الترخيص بنجاح');
    return true;
  };

  // Admin PIN Authentication
  const handleAdminPinSubmit = () => {
    // Default admin PIN can be 1234 or configured
    if (adminPinInput.trim() === '1234' || adminPinInput.trim() === '0000') {
      setIsAdminAuthenticated(true);
      setShowAdminPinModal(false);
      setAdminPinInput('');
    } else {
      alert('Incorrect Admin PIN / رقم التعريف غير صحيح (Default: 1234)');
    }
  };

  // Generate New Key (Admin action)
  const handleGenerateKey = () => {
    const rand1 = Math.random().toString(36).substring(2, 6).toUpperCase();
    const rand2 = Math.random().toString(36).substring(2, 6).toUpperCase();
    const generatedKeyStr = `WSL-${newKeyYear}-${rand1}-${rand2}`;

    const newKeyRecord: LicenseKey = {
      key: generatedKeyStr,
      year: Number(newKeyYear),
      expiryDate: `${newKeyYear}-12-31T23:59:59.000Z`,
      businessName: newKeyBusinessName.trim() || businessProfile.businessName || 'Waseela Client',
      status: 'unused',
      generatedDate: new Date().toISOString(),
      activatedDate: null,
      activatedByDeviceId: null,
    };

    setLicenseKeys([newKeyRecord, ...licenseKeys]);
    setShowGenerateModal(false);
    alert(`Successfully generated key: ${generatedKeyStr} / تم إنشاء المفتاح بنجاح`);
  };

  // Revoke Key (Admin action)
  const handleRevokeKey = (keyString: string) => {
    if (confirm(`Are you sure you want to revoke key ${keyString}? / هل أنت متأكد من إلغاء هذا المفتاح؟`)) {
      setLicenseKeys(
        licenseKeys.map((k) => (k.key === keyString ? { ...k, status: 'revoked' as const } : k))
      );
    }
  };

  // Copy key helper
  const handleCopyKey = (keyStr: string) => {
    navigator.clipboard.writeText(keyStr);
    setCopiedKey(keyStr);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // --- REVENUE CALCULATIONS ---
  const activeInvoices = invoices.filter((i) => i.invoiceStatus !== 'Cancelled');

  // Filter invoices based on selected date range
  const now = new Date();
  const filteredInvoices = activeInvoices.filter((inv) => {
    const invDate = new Date(inv.createdAt);
    if (dateRange === 'today') {
      return invDate.toDateString() === now.toDateString();
    }
    if (dateRange === 'this_month') {
      return (
        invDate.getMonth() === now.getMonth() && invDate.getFullYear() === now.getFullYear()
      );
    }
    if (dateRange === 'this_year') {
      return invDate.getFullYear() === now.getFullYear();
    }
    return true; // 'all'
  });

  const totalRevenue = filteredInvoices.reduce((sum, inv) => sum + (inv.grandTotal || 0), 0);
  const totalVatCollected = filteredInvoices.reduce((sum, inv) => sum + (inv.vatTotal || 0), 0);
  const totalItemsSold = filteredInvoices.reduce((sum, inv) => {
    const itemsCount = inv.items?.reduce((isum, item) => isum + (item.quantity || 1), 0) || 0;
    return sum + itemsCount;
  }, 0);

  // Remaining Stock Value
  const remainingStockValue = inventory.reduce((sum, item) => {
    const qty = item.currentStock || 0;
    const price = item.price || 0;
    return sum + qty * price;
  }, 0);

  // Stock Sold Out (remaining quantity = 0)
  const soldOutItems = inventory.filter((item) => (item.currentStock || 0) <= 0);

  // Payable Tax Calculation
  // Output VAT = totalVatCollected
  // Input VAT on purchases = if purchasePrice is stored, sum(purchasePrice * vatRate * stockIn) or similar. Let's compute estimated input VAT if purchasePrice exists.
  const totalInputVat = inventory.reduce((sum, item) => {
    const purchaseCost = item.purchasePrice || (item.price * 0.7); // estimated 70% if not specified
    const qtyIn = item.stockIn || item.currentStock || 0;
    const vatRate = item.vatRate || 15;
    const itemSubtotal = purchaseCost * qtyIn;
    return sum + itemSubtotal * (vatRate / 100);
  }, 0);

  const netPayableTax = Math.max(0, totalVatCollected - totalInputVat);

  // Monthly breakdown for tax filing
  const monthlyTaxMap: { [monthKey: string]: { outputVat: number; inputVat: number; net: number } } = {};
  activeInvoices.forEach((inv) => {
    const d = new Date(inv.createdAt);
    const mKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!monthlyTaxMap[mKey]) {
      monthlyTaxMap[mKey] = { outputVat: 0, inputVat: 0, net: 0 };
    }
    monthlyTaxMap[mKey].outputVat += inv.vatTotal || 0;
  });

  // Assign estimated input VAT proportionally or per month
  Object.keys(monthlyTaxMap).forEach((mKey) => {
    monthlyTaxMap[mKey].inputVat = totalInputVat / Math.max(1, Object.keys(monthlyTaxMap).length);
    monthlyTaxMap[mKey].net = Math.max(0, monthlyTaxMap[mKey].outputVat - monthlyTaxMap[mKey].inputVat);
  });

  // Chart data: revenue per day for filtered range
  const dailyRevenueMap: { [dateStr: string]: number } = {};
  filteredInvoices.forEach((inv) => {
    const dStr = inv.createdAt.split('T')[0];
    dailyRevenueMap[dStr] = (dailyRevenueMap[dStr] || 0) + (inv.grandTotal || 0);
  });
  const sortedDailyRevenue = Object.entries(dailyRevenueMap).sort((a, b) => a[0].localeCompare(b[0]));

  // --- ACCESS BLOCK FOR UNLICENSED CASHIER / USERS ---
  if (!isDeviceLicensed && userRole !== 'ADMIN') {
    return (
      <div className="max-w-xl mx-auto mt-16 p-8 bg-white rounded-2xl shadow-xl border border-slate-200 text-center space-y-6">
        <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto shadow-sm border border-indigo-100">
          <Key className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-extrabold text-slate-950">
            Enter License Key / أدخل مفتاح الترخيص
          </h2>
          <p className="text-xs text-slate-500">
            This POS installation requires a valid annual license key to unlock billing and inventory features.
          </p>
        </div>

        {activationError && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-medium flex items-center justify-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{activationError}</span>
          </div>
        )}

        <div className="space-y-3 text-left">
          <label className="block text-xs font-bold text-slate-700">License Key / مفتاح الترخيص</label>
          <input
            type="text"
            placeholder="WSL-2026-XXXX-XXXX"
            value={activationInputKey}
            onChange={(e) => setActivationInputKey(e.target.value)}
            className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono uppercase tracking-wider focus:ring-2 focus:ring-indigo-500 text-center"
          />
        </div>

        <button
          onClick={() => handleValidateAndActivate(activationInputKey, false)}
          className="w-full py-3 bg-[#4338CA] hover:bg-[#3730A3] text-white font-bold rounded-xl shadow-md transition-all text-xs cursor-pointer flex items-center justify-center gap-2"
        >
          <CheckCircle className="w-4 h-4" />
          <span>Validate & Activate / التحقق والتفعيل</span>
        </button>

        <p className="text-[11px] text-slate-400">
          Contact your system administrator or Waseela POS provider for a valid annual license key.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Banner & Sub-Tab Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-[#4338CA]" />
            <span>License & Revenue / الترخيص والإيرادات</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitor ZATCA VAT calculations, financial KPIs, inventory valuation, and annual software licensing.
          </p>
        </div>

        {/* Sub-tabs */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            onClick={() => setActiveSubTab('revenue')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'revenue'
                ? 'bg-[#4338CA] text-white shadow'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Coins className="w-4 h-4" />
            <span>Revenue & VAT / الإيرادات والضريبة</span>
          </button>
          <button
            onClick={() => setActiveSubTab('licenses')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'licenses'
                ? 'bg-[#4338CA] text-white shadow'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Key className="w-4 h-4" />
            <span>License Keys / مفاتيح الترخيص</span>
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: REVENUE & VAT DASHBOARD */}
      {activeSubTab === 'revenue' && (
        <div className="space-y-6">
          {/* Date Range Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-500" />
              <span className="text-xs font-bold text-slate-700">Filter Period / الفترة الزمنية:</span>
            </div>
            <div className="flex items-center gap-2">
              {[
                { id: 'today', label: 'Today / اليوم' },
                { id: 'this_month', label: 'This Month / هذا الشهر' },
                { id: 'this_year', label: 'This Year / هذه السنة' },
                { id: 'all', label: 'All Time / الكل' },
              ].map((range) => (
                <button
                  key={range.id}
                  onClick={() => setDateRange(range.id as any)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    dateRange === range.id
                      ? 'bg-indigo-50 text-[#4338CA] border border-indigo-200'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  {range.label}
                </button>
              ))}
            </div>
          </div>

          {/* KPI Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Total Revenue */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-bold uppercase tracking-wider">Total Revenue</span>
                <div className="p-2 bg-indigo-50 text-[#4338CA] rounded-xl">
                  <SaudiRiyalIcon className="w-4.5 h-4.5" />
                </div>
              </div>
              <div className="text-2xl font-black font-mono text-slate-900">
                {totalRevenue.toFixed(2)} <span className="text-xs font-normal text-slate-500">SAR</span>
              </div>
              <p className="text-[10px] text-slate-400">إجمالي الإيرادات (شامل الضريبة)</p>
            </div>

            {/* 2. Total VAT Collected */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-bold uppercase tracking-wider">Total VAT Collected</span>
                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                  <Percent className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black font-mono text-slate-900">
                {totalVatCollected.toFixed(2)} <span className="text-xs font-normal text-slate-500">SAR</span>
              </div>
              <p className="text-[10px] text-slate-400">إجمالي الضريبة المحصلة (15% VAT)</p>
            </div>

            {/* 3. Items Sold */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-bold uppercase tracking-wider">Items Sold</span>
                <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                  <Package className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black font-mono text-slate-900">{totalItemsSold}</div>
              <p className="text-[10px] text-slate-400">إجمالي الوحدات المباعة</p>
            </div>

            {/* 4. Remaining Stock Value */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-bold uppercase tracking-wider">Stock Valuation</span>
                <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black font-mono text-slate-900">
                {remainingStockValue.toFixed(2)} <span className="text-xs font-normal text-slate-500">SAR</span>
              </div>
              <p className="text-[10px] text-slate-400">قيمة المخزون الحالي المتبقي</p>
            </div>
          </div>

          {/* VAT Payable & Stock Sold Out Section */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Payable Tax to Government */}
            <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <div>
                  <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-[#4338CA]" />
                    <span>Payable Tax to Government / الضريبة المستحقة للحكومة</span>
                  </h3>
                  <p className="text-[11px] text-slate-400">ZATCA Output VAT minus Input VAT calculation</p>
                </div>
                <span className="px-3 py-1 bg-indigo-50 text-[#4338CA] font-mono font-bold text-xs rounded-full border border-indigo-200">
                  Net: {netPayableTax.toFixed(2)} SAR
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200 text-center font-mono">
                <div>
                  <p className="text-[10px] text-slate-500 font-sans">Output VAT (Sales)</p>
                  <p className="text-base font-bold text-slate-900 mt-1">{totalVatCollected.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 font-sans">Input VAT (Purchases)</p>
                  <p className="text-base font-bold text-blue-600 mt-1">{totalInputVat.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 font-sans">Net Payable</p>
                  <p className="text-base font-black text-indigo-700 mt-1">{netPayableTax.toFixed(2)}</p>
                </div>
              </div>

              {/* Monthly breakdown table */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-700">Monthly VAT Breakdown / تفصيل ضريبة القيمة المضافة الشهري</h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden max-h-56 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-900 text-white font-bold">
                      <tr>
                        <th className="p-2.5">Month / الشهر</th>
                        <th className="p-2.5 text-right">Output VAT</th>
                        <th className="p-2.5 text-right">Input VAT</th>
                        <th className="p-2.5 text-right">Net Payable</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {Object.keys(monthlyTaxMap).length === 0 ? (
                        <tr>
                          <td colSpan={4} className="p-4 text-center text-slate-400 italic font-sans">
                            No VAT records found in history
                          </td>
                        </tr>
                      ) : (
                        Object.entries(monthlyTaxMap).map(([mKey, dat]) => (
                          <tr key={mKey} className="hover:bg-slate-50">
                            <td className="p-2.5 font-bold font-sans text-slate-800">{mKey}</td>
                            <td className="p-2.5 text-right text-slate-700">{dat.outputVat.toFixed(2)}</td>
                            <td className="p-2.5 text-right text-blue-600">{dat.inputVat.toFixed(2)}</td>
                            <td className="p-2.5 text-right font-bold text-indigo-700">{dat.net.toFixed(2)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Stock Sold Out / Out of Stock List */}
            <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-500" />
                  <span>Stock Sold Out / نفدت الكمية ({soldOutItems.length})</span>
                </h3>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-80 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900 text-white font-bold">
                    <tr>
                      <th className="p-2.5">Product / المنتج</th>
                      <th className="p-2.5 text-center">SKU/Barcode</th>
                      <th className="p-2.5 text-right">Price</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {soldOutItems.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="p-6 text-center text-slate-400 italic">
                          All items are currently in stock! / جميع المنتجات متوفرة
                        </td>
                      </tr>
                    ) : (
                      soldOutItems.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50">
                          <td className="p-2.5 font-bold text-slate-800">
                            {item.productNameEnglish || item.name}
                            {item.productNameArabic && (
                              <span className="block text-[10px] text-slate-400">{item.productNameArabic}</span>
                            )}
                          </td>
                          <td className="p-2.5 text-center font-mono text-slate-500">
                            {item.barcode || item.sku || 'N/A'}
                          </td>
                          <td className="p-2.5 text-right font-mono font-bold text-indigo-600">
                            {item.price.toFixed(2)} SAR
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Daily Revenue Chart / Activity */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#4338CA]" />
              <span>Revenue Trend per Day / اتجاه الإيرادات اليومية</span>
            </h3>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-2">
              {sortedDailyRevenue.length === 0 ? (
                <p className="text-xs text-slate-400 italic text-center py-6">No sales revenue recorded for this period.</p>
              ) : (
                sortedDailyRevenue.map(([dateStr, rev]) => {
                  const maxRev = Math.max(...sortedDailyRevenue.map((r) => r[1]), 1);
                  const pct = Math.min(100, Math.max(5, (rev / maxRev) * 100));
                  return (
                    <div key={dateStr} className="space-y-1">
                      <div className="flex justify-between text-xs font-mono">
                        <span className="font-bold text-slate-700">{dateStr}</span>
                        <span className="font-bold text-[#4338CA]">{rev.toFixed(2)} SAR</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                        <div
                          className="bg-[#4338CA] h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: LICENSE KEYS MANAGEMENT & USER STATUS */}
      {activeSubTab === 'licenses' && (
        <div className="space-y-6">
          {/* Cashier / Standard User Status Card View */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-50 text-[#4338CA] rounded-xl flex items-center justify-center font-bold">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900">
                    License Status / حالة الترخيص
                  </h3>
                  <p className="text-xs text-slate-500">Device ID: {getDeviceId()}</p>
                </div>
              </div>

              <span
                className={`px-3 py-1 text-xs font-bold rounded-full ${
                  isDeviceLicensed
                    ? 'bg-indigo-50 text-[#4338CA] border border-indigo-200'
                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                }`}
              >
                {isDeviceLicensed ? 'License Active / ترخيص فعّال' : 'Unlicensed / غير مرخص'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <span className="text-[10px] text-slate-400 block">Status Message</span>
                <span className="text-xs font-bold text-slate-800">
                  {isDeviceLicensed ? 'Fully Licensed & Operational' : 'Activation Required'}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Licensed Year</span>
                <span className="text-xs font-bold font-mono text-slate-800">{activeLicensedYear}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Active Key (Masked)</span>
                <span className="text-xs font-bold font-mono text-slate-800">
                  {deviceActivation ? `WSL-${deviceActivation.year}-••••-` + deviceActivation.key.slice(-4) : 'N/A'}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowUpdateModal(true)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Update License / تحديث الترخيص</span>
              </button>
            </div>
          </div>

          {/* ADMIN VIEW (Gated by Admin PIN) - Hidden for Cashier */}
          {userRole.toUpperCase() !== 'CASHIER' && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center font-bold">
                    <Lock className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900">
                      Admin License Generator & Control / لوحة تحكم وتوليد المفاتيح للآدمن
                    </h3>
                    <p className="text-xs text-slate-500">Manage client licenses, generate annual keys, and revoke installations.</p>
                  </div>
                </div>

                {isAdminAuthenticated ? (
                  <button
                    onClick={() => setIsAdminAuthenticated(false)}
                    className="px-3 py-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg text-xs font-bold border border-rose-200 cursor-pointer"
                  >
                    Lock Admin / قفل لوحة الأدمن
                  </button>
                ) : (
                  <button
                    onClick={() => setShowAdminPinModal(true)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Unlock className="w-4 h-4" />
                    <span>Admin Login / دخول الأدمن (PIN)</span>
                  </button>
                )}
              </div>

              {isAdminAuthenticated ? (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setShowGenerateModal(true)}
                        className="px-4 py-2 bg-[#4338CA] hover:bg-[#3730A3] text-white text-xs font-bold rounded-xl shadow transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Generate New Key / إنشاء مفتاح جديد</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-3">
                      <input
                        type="text"
                        placeholder="Filter by year (e.g. 2026)..."
                        value={licenseSearchYear}
                        onChange={(e) => setLicenseSearchYear(e.target.value)}
                        className="p-2 bg-white border border-slate-300 rounded-xl text-xs font-mono w-40"
                      />
                      <select
                        value={licenseSearchStatus}
                        onChange={(e) => setLicenseSearchStatus(e.target.value)}
                        className="p-2 bg-white border border-slate-300 rounded-xl text-xs font-bold"
                      >
                        <option value="all">All Statuses / جميع الحالات</option>
                        <option value="unused">Unused / غير مستخدم</option>
                        <option value="active">Active / فعّال</option>
                        <option value="expired">Expired / منتهي</option>
                        <option value="revoked">Revoked / ملغي</option>
                      </select>
                    </div>
                  </div>

                  {/* Keys Table */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-900 text-white font-bold">
                        <tr>
                          <th className="p-3">License Key / المفتاح</th>
                          <th className="p-3">Year</th>
                          <th className="p-3">Business Name / المنشأة</th>
                          <th className="p-3 text-center">Status / الحالة</th>
                          <th className="p-3">Generated Date</th>
                          <th className="p-3 text-right">Actions / إجراءات</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono">
                        {licenseKeys
                          .filter((k) => {
                            if (licenseSearchYear && !k.year.toString().includes(licenseSearchYear)) return false;
                            if (licenseSearchStatus !== 'all' && k.status !== licenseSearchStatus) return false;
                            return true;
                          })
                          .map((k) => (
                            <tr key={k.key} className="hover:bg-slate-50">
                              <td className="p-3 font-bold text-slate-900 flex items-center gap-2">
                                <span>{k.key}</span>
                                <button
                                  onClick={() => handleCopyKey(k.key)}
                                  className="p-1 text-slate-400 hover:text-slate-700 rounded transition-colors cursor-pointer"
                                  title="Copy Key"
                                >
                                  {copiedKey === k.key ? <Check className="w-3.5 h-3.5 text-indigo-600" /> : <Copy className="w-3.5 h-3.5" />}
                                </button>
                              </td>
                              <td className="p-3">{k.year}</td>
                              <td className="p-3 font-sans font-medium text-slate-700">{k.businessName}</td>
                              <td className="p-3 text-center">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-sans font-bold ${
                                    k.status === 'active'
                                      ? 'bg-indigo-100 text-indigo-800'
                                      : k.status === 'unused'
                                      ? 'bg-blue-100 text-blue-800'
                                      : k.status === 'expired'
                                      ? 'bg-amber-100 text-amber-800'
                                      : 'bg-rose-100 text-rose-800'
                                  }`}
                                >
                                  {k.status.toUpperCase()}
                                </span>
                              </td>
                              <td className="p-3 text-slate-500 text-[10px]">
                                {new Date(k.generatedDate).toLocaleDateString()}
                              </td>
                              <td className="p-3 text-right space-x-2">
                                {k.status !== 'revoked' && (
                                  <button
                                    onClick={() => handleRevokeKey(k.key)}
                                    className="px-2.5 py-1 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded text-[10px] font-bold cursor-pointer"
                                  >
                                    Revoke / إلغاء
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                  <Lock className="w-8 h-8 text-slate-400 mx-auto" />
                  <p className="text-xs text-slate-600 font-medium">
                    Admin panel is locked. Please enter your Admin PIN to generate keys or manage device licenses.
                  </p>
                  <button
                    onClick={() => setShowAdminPinModal(true)}
                    className="px-4 py-2 bg-blue-600 text-white font-bold text-xs rounded-xl shadow cursor-pointer"
                  >
                    Enter Admin PIN / إدخال رمز الأدمن
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* --- MODALS --- */}

      {/* Admin PIN Modal */}
      {showAdminPinModal && (
        <div className="fixed inset-0 bg-slate-950/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white p-6 rounded-2xl max-w-sm w-full space-y-4 shadow-2xl border border-slate-200">
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
              <Lock className="w-4 h-4 text-blue-600" />
              <span>Admin Authentication / دخول الأدمن</span>
            </h3>
            <p className="text-xs text-slate-500">Enter Admin PIN (default: 1234)</p>
            <input
              type="password"
              placeholder="Enter 4-digit PIN..."
              value={adminPinInput}
              onChange={(e) => setAdminPinInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAdminPinSubmit();
              }}
              className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-center font-mono tracking-widest text-lg"
              autoFocus
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowAdminPinModal(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleAdminPinSubmit}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow cursor-pointer"
              >
                Verify & Login
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Generate Key Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 bg-slate-950/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white p-6 rounded-2xl max-w-md w-full space-y-4 shadow-2xl border border-slate-200">
            <h3 className="font-extrabold text-sm text-slate-900">
              Generate New License Key / إنشاء مفتاح ترخيص جديد
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Business Name / اسم المنشأة</label>
                <input
                  type="text"
                  value={newKeyBusinessName}
                  onChange={(e) => setNewKeyBusinessName(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">License Year / سنة الترخيص</label>
                <input
                  type="number"
                  value={newKeyYear}
                  onChange={(e) => setNewKeyYear(Number(e.target.value))}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowGenerateModal(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerateKey}
                className="px-5 py-2 bg-[#4338CA] hover:bg-[#3730A3] text-white text-xs font-bold rounded-xl shadow cursor-pointer"
              >
                Generate Key / توليد المفتاح
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Update / Enter New License Modal */}
      {showUpdateModal && (
        <div className="fixed inset-0 bg-slate-950/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white p-6 rounded-2xl max-w-md w-full space-y-4 shadow-2xl border border-slate-200">
            <h3 className="font-extrabold text-sm text-slate-900">
              Update License Key / تحديث مفتاح الترخيص
            </h3>
            <p className="text-xs text-slate-500">
              Enter your new annual license key. Once activated, the previous key will be retired permanently.
            </p>

            {activationError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-medium">
                {activationError}
              </div>
            )}

            <input
              type="text"
              placeholder="WSL-2026-XXXX-XXXX"
              value={updateKeyInput}
              onChange={(e) => setUpdateKeyInput(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono uppercase tracking-wider text-center"
              autoFocus
            />

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  setShowUpdateModal(false);
                  setActivationError(null);
                }}
                className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
              >
                Cancel / إلغاء
              </button>
              <button
                onClick={() => handleValidateAndActivate(updateKeyInput, true)}
                className="px-5 py-2 bg-[#4338CA] hover:bg-[#3730A3] text-white text-xs font-bold rounded-xl shadow cursor-pointer"
              >
                Submit & Activate / إرسال وتفعيل
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
