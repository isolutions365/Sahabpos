import React, { useState, useEffect, useRef } from 'react';
import { Settings, Save, RefreshCw, CheckCircle, Building2, FileText, Phone, MapPin, ShieldAlert, Image, Trash2, Languages, KeyRound, Check, X, AlertCircle, Lock, Unlock, Printer, Download, Upload, Database } from 'lucide-react';
import { BusinessProfile, UserRole, BankEditPermission } from '../types';
import { saveBusinessProfile, seedInitialDataIfNeeded, subscribeBankEditPermissions, requestBankEditPermission, updateBankEditPermissionStatus, updatePermissionRequestStatus, saveBusinessProfileWithPermissionCheck, exportDatabaseBackup, importDatabaseBackup } from '../services/dbService';
import firebaseConfig from '../../firebase-applet-config.json';
import { TranslationManager } from './TranslationManager';
import { MerchantBankDetailsForm } from './MerchantBankDetailsForm';
import { isAiStudioEnvironment, isPublishedEnvironment } from '../utils/envUtils';

interface SettingsScreenProps {
  businessProfile: BusinessProfile;
  onProfileUpdated: (updated: BusinessProfile) => void;
  userRole: UserRole;
  currentUsername?: string;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  businessProfile,
  onProfileUpdated,
  userRole,
  currentUsername = 'cashier',
}) => {
  const isAiStudio = isAiStudioEnvironment();

  const [profile, setProfile] = useState<BusinessProfile>(() => {
    const addr = businessProfile.address === 'Riyadh, Kingdom of Saudi Arabia' || !businessProfile.address
      ? 'Khalidya Janubya AlDammam, Kingdom of Saudi Arabia'
      : businessProfile.address;
    return { ...businessProfile, address: addr };
  });
  const [receiptWidth, setReceiptWidth] = useState<number>(() => {
    return businessProfile.receiptWidthMm ?? (Number(localStorage.getItem('receipt_width_mm')) || 58);
  });
  const [printRowSpacing, setPrintRowSpacing] = useState<number>(() => {
    return businessProfile.printRowSpacingMm ?? (Number(localStorage.getItem('print_row_gap_mm')) || 1.5);
  });
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Database Backup & Account Migration State
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [backupMsg, setBackupMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExportBackup = async () => {
    setIsExporting(true);
    setBackupMsg(null);
    try {
      await exportDatabaseBackup();
      setBackupMsg({
        type: 'success',
        text: 'Backup exported successfully! File downloaded. / تم تنزيل النسخة الاحتياطية بنجاح.',
      });
    } catch (e: any) {
      setBackupMsg({ type: 'error', text: e.message || 'Export failed / فشل تصدير البيانات' });
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!confirm('Are you sure you want to import this backup? It will merge records into the database. / هل أنت متأكد من استيراد هذه النسخة الاحتياطية؟')) {
      e.target.value = '';
      return;
    }
    setIsImporting(true);
    setBackupMsg(null);
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      const res = await importDatabaseBackup(json);
      setBackupMsg({
        type: 'success',
        text: `Import completed! Restored ${res.importedCount} records successfully. / تم استرجاع ${res.importedCount} سجل بنجاح.`,
      });
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (e: any) {
      setBackupMsg({ type: 'error', text: e.message || 'Import failed / فشل استيراد البيانات' });
      setIsImporting(false);
    }
  };

  useEffect(() => {
    setProfile(prev => {
      const addr = businessProfile.address === 'Riyadh, Kingdom of Saudi Arabia' || !businessProfile.address
        ? 'Khalidya Janubya AlDammam, Kingdom of Saudi Arabia'
        : businessProfile.address;
      return { ...businessProfile, address: addr };
    });
  }, [businessProfile]);

  const handleReceiptWidthChange = (val: number) => {
    setReceiptWidth(val);
    setProfile(prev => ({ ...prev, receiptWidthMm: val }));
    localStorage.setItem('receipt_width_mm', String(val));
    document.documentElement.style.setProperty('--receipt-width', `${val}mm`);
  };

  const handlePrintRowSpacingChange = (val: number) => {
    setPrintRowSpacing(val);
    setProfile(prev => ({ ...prev, printRowSpacingMm: val }));
    localStorage.setItem('print_row_gap_mm', String(val));
    document.documentElement.style.setProperty('--row-gap', `${val}mm`);
  };

  // Environment-based freeze: Strictly frozen only when published, editable in development
  const isFrozen = isPublishedEnvironment();

  // Bank edit permissions state
  const [permissions, setPermissions] = useState<BankEditPermission[]>([]);

  useEffect(() => {
    const unsub = subscribeBankEditPermissions((perms) => {
      setPermissions(perms);
    });
    return () => unsub();
  }, []);

  const isAdmin = userRole.toUpperCase() === 'ADMIN';
  const userId = currentUsername.trim().toLowerCase();

  // Find user's active/pending permission
  const userPerms = permissions.filter(p => p.userId.toLowerCase() === userId);
  const activeApprovedPerm = userPerms.find(p => p.status.toLowerCase() === 'approved' && !p.used);
  const pendingPerm = userPerms.find(p => p.status.toLowerCase() === 'pending');

  const canEditBankDetails = isAdmin || Boolean(activeApprovedPerm);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('receipt_width_mm', String(receiptWidth));
    localStorage.setItem('print_row_gap_mm', String(printRowSpacing));
    document.documentElement.style.setProperty('--receipt-width', `${receiptWidth}mm`);
    document.documentElement.style.setProperty('--row-gap', `${printRowSpacing}mm`);

    if (isFrozen) {
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
      return;
    }
    setIsSaving(true);
    setErrorMessage(null);
    try {
      if (isAdmin) {
        await saveBusinessProfile(profile);
      } else {
        await saveBusinessProfileWithPermissionCheck(profile, userRole, userId);
      }
      setIsSaving(false);
      setIsSaved(true);
      onProfileUpdated(profile);
      setTimeout(() => setIsSaved(false), 3000);
    } catch (err: any) {
      setIsSaving(false);
      setErrorMessage(err.message || 'Failed to save settings.');
    }
  };

  const handleRequestAccess = async () => {
    try {
      await requestBankEditPermission(userId);
      alert('One-time edit access request sent to Admin successfully! / تم إرسال طلب إذن التعديل لمدير النظام بنجاح.');
    } catch (err: any) {
      alert('Error requesting access: ' + (err.message || err));
    }
  };

  const handleApprovePerm = async (id: string) => {
    try {
      await updatePermissionRequestStatus(id, 'approved', userId);
    } catch (err: any) {
      alert('Error approving permission: ' + (err.message || err));
    }
  };

  const handleRejectPerm = async (id: string) => {
    try {
      await updatePermissionRequestStatus(id, 'rejected', userId);
    } catch (err: any) {
      alert('Error rejecting permission: ' + (err.message || err));
    }
  };

  const handleRevokePerm = async (id: string) => {
    try {
      await updateBankEditPermissionStatus(id, 'revoked', userId);
    } catch (err: any) {
      alert('Error revoking permission: ' + (err.message || err));
    }
  };

  const handleReSeed = async () => {
    if (confirm('Re-seed initial sample data in Firestore?')) {
      await seedInitialDataIfNeeded();
      alert('Seed process complete. Refresh page to see sample data if empty.');
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isAdmin) return;
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 1024) {
        alert('Logo image size must be under 1MB / يرجى اختيار شعار بحجم أقل من 1 ميجابايت');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfile(prev => ({ ...prev, logo: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Role Notice Banner */}
      {!isAdmin && isAiStudio && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between text-xs text-amber-900 gap-3">
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <span className="font-bold block">Cashier View / لوحة المحاسب (Secured Merchant Bank Details)</span>
              <span>Merchant Bank Details are read-only. Request one-time edit permission from Admin to modify them once.</span>
            </div>
          </div>
          {activeApprovedPerm ? (
            <span className="bg-indigo-600 text-white font-bold px-3 py-1.5 rounded-xl text-[11px] animate-pulse whitespace-nowrap">
              ✓ One-Time Edit Active / إذن تعديل مفعل
            </span>
          ) : pendingPerm ? (
            <span className="bg-amber-600 text-white font-bold px-3 py-1.5 rounded-xl text-[11px] whitespace-nowrap">
              Pending Approval / قيد الانتظار
            </span>
          ) : (
            <button
              type="button"
              onClick={handleRequestAccess}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-extrabold rounded-xl shadow transition-all cursor-pointer whitespace-nowrap"
            >
              Request One-Time Edit Access / طلب إذن تعديل البنك
            </button>
          )}
        </div>
      )}

      {/* Permission Requests Section for Admin */}
      {isAdmin && isAiStudio && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-indigo-600" />
              Permission Requests / طلبات الصلاحيات والإذن
            </h3>
            <span className="text-xs bg-slate-100 text-slate-700 font-bold px-2.5 py-0.5 rounded-full">
              {permissions.filter(p => p.status.toLowerCase() === 'pending').length} Pending Requests
            </span>
          </div>

          <p className="text-xs text-slate-500">
            Manage one-time edit permissions for Merchant Bank Details (Bank Name, Account Name, IBAN).
          </p>

          {permissions.length === 0 ? (
            <div className="text-center py-6 bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <KeyRound className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-medium text-slate-500">No bank edit permission requests found. / لا توجد طلبات إذن تعديل بنكية حالياً.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table id="access-requests-table" className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-700 border-b border-slate-200">
                  <tr>
                    <th className="p-3 font-bold">User ID / الموظف</th>
                    <th className="p-3 font-bold">Status / الحالة</th>
                    <th className="p-3 font-bold">Requested At / وقت الطلب</th>
                    <th className="p-3 font-bold">Consumed / مستهلك</th>
                    <th className="p-3 font-bold text-right">Actions / الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                  {permissions.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="p-3 font-bold">{p.userId}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                          (p.status.toLowerCase() === 'approved' || p.status.toLowerCase() === 'consumed' || p.status.toLowerCase() === 'used') ? 'bg-indigo-100 text-indigo-800' :
                          p.status.toLowerCase() === 'pending' ? 'bg-amber-100 text-amber-800' :
                          p.status.toLowerCase() === 'rejected' ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-800'
                        }`}>
                          {(p.status.toLowerCase() === 'consumed' || p.status.toLowerCase() === 'used') ? 'APPROVED' : p.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="p-3 text-slate-500">{new Date(p.createdAt).toLocaleString()}</td>
                      <td className="p-3">
                        {p.used ? (
                          <span className="text-rose-600 font-bold">Yes (Used)</span>
                        ) : (
                          <span className="text-indigo-600 font-bold">No (Unused)</span>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        {p.status.toLowerCase() === 'pending' ? (
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleApprovePerm(p.id)}
                              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold cursor-pointer transition-colors shadow-sm"
                            >
                              Approve / الموافقة
                            </button>
                            <button
                              onClick={() => handleRejectPerm(p.id)}
                              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-bold cursor-pointer transition-colors shadow-sm"
                            >
                              Reject / الرفض
                            </button>
                          </div>
                        ) : (p.status.toLowerCase() === 'approved' || p.status.toLowerCase() === 'consumed' || p.status.toLowerCase() === 'used') ? (
                          <div className="text-[10px] text-slate-500 space-y-0.5 flex flex-col items-end">
                            <span className="font-bold text-slate-700">Approved on {new Date(p.approvedAt || p.grantedAt || p.updatedAt || p.createdAt).toLocaleString()}</span>
                            <span>Approved by {p.approvedBy || p.grantedBy || 'Admin'}</span>
                            {p.used ? (
                              <>
                                <span className="font-bold text-slate-700 mt-1 border-t pt-1 border-slate-100">Used on {p.usedAt || (p as any).consumedAt ? new Date(p.usedAt || (p as any).consumedAt).toLocaleString() : 'Unknown'}</span>
                                <span>Used by {p.userName || p.userId}</span>
                              </>
                            ) : (
                              <span className="mt-1 font-bold text-indigo-600 border-t pt-1 border-slate-100 block w-full text-right">Unused</span>
                            )}
                          </div>
                        ) : p.status.toLowerCase() === 'rejected' ? (
                          <div className="text-[10px] text-slate-500 space-y-0.5 flex flex-col items-end">
                            <span className="font-bold text-rose-700">Rejected on {new Date(p.rejectedAt || p.updatedAt || p.createdAt).toLocaleString()}</span>
                            <span>Rejected by {p.rejectedBy || p.approvedBy || 'Admin'}</span>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-bold uppercase">{p.status}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-6">
          <div className="flex items-center space-x-3 rtl:space-x-reverse">
            <div className="w-10 h-10 bg-indigo-100 text-indigo-800 rounded-xl flex items-center justify-center font-bold">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Business Profile & Merchant Bank Details / بيانات المنشأة والحساب البنكي
              </h2>
              <p className="text-xs text-slate-500">
                Configure official header information and bank details printed on Thermal 80mm receipts & A4 tax invoices.
              </p>
            </div>
          </div>

          {isSaved && (
            <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-300 flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5" /> Saved Successfully!
            </span>
          )}
        </div>

        {errorMessage && (
          <div className="mb-4 bg-rose-50 border border-rose-200 text-rose-900 px-4 py-3 rounded-xl text-xs font-bold">
            {errorMessage}
          </div>
        )}

      {/* Merchant Bank Details Section */}
      {isAiStudio && (
        <MerchantBankDetailsForm
          businessProfile={profile}
          onProfileUpdated={(updated) => {
            setProfile(updated);
            onProfileUpdated(updated);
          }}
          userRole={userRole}
          currentUsername={currentUsername}
        />
      )}

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-6 text-xs">
          
          {/* Section 2: General Corporate Profile */}
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Building2 className="w-4.5 h-4.5 text-indigo-600" />
                <h3 className="font-bold text-slate-900 text-sm">General Corporate Info (بيانات المنشأة العامة)</h3>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Business Name (Arabic) / اسم المنشأة بالعربي: *
                </label>
                <input
                  type="text"
                  required
                  readOnly={isFrozen || !isAdmin}
                  disabled={isFrozen}
                  value={profile.businessNameAr}
                  onChange={(e) => setProfile({ ...profile, businessNameAr: e.target.value })}
                  className={`w-full p-3 rounded-xl font-bold text-sm ${
                    isFrozen || !isAdmin
                      ? 'bg-slate-100 border border-slate-200 text-slate-600 cursor-not-allowed select-none'
                      : 'bg-slate-50 border border-slate-300 focus:ring-2 focus:ring-indigo-500'
                  }`}
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Business Name (English) / اسم المنشأة بالإنجليزي: *
                </label>
                <input
                  type="text"
                  required
                  readOnly={isFrozen || !isAdmin}
                  disabled={isFrozen}
                  value={profile.businessName}
                  onChange={(e) => setProfile({ ...profile, businessName: e.target.value })}
                  className={`w-full p-3 rounded-xl font-semibold text-sm ${
                    isFrozen || !isAdmin
                      ? 'bg-slate-100 border border-slate-200 text-slate-600 cursor-not-allowed select-none'
                      : 'bg-slate-50 border border-slate-300 focus:ring-2 focus:ring-indigo-500'
                  }`}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Tax / VAT Number (الرقم الضريبي - 15 خانة): *
                </label>
                <input
                  type="text"
                  required
                  readOnly={isFrozen || !isAdmin}
                  disabled={isFrozen}
                  value={profile.vatNumber}
                  onChange={(e) => setProfile({ ...profile, vatNumber: e.target.value })}
                  className={`w-full p-3 rounded-xl font-mono text-slate-900 text-sm ${
                    isFrozen || !isAdmin
                      ? 'bg-slate-100 border border-slate-200 text-slate-600 cursor-not-allowed select-none'
                      : 'bg-slate-50 border border-slate-300 focus:ring-2 focus:ring-indigo-500'
                  }`}
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  CR Number (رقم السجل التجاري): *
                </label>
                <input
                  type="text"
                  required
                  readOnly={isFrozen || !isAdmin}
                  disabled={isFrozen}
                  value={profile.crNumber}
                  onChange={(e) => setProfile({ ...profile, crNumber: e.target.value })}
                  className={`w-full p-3 rounded-xl font-mono text-slate-900 text-sm ${
                    isFrozen || !isAdmin
                      ? 'bg-slate-100 border border-slate-200 text-slate-600 cursor-not-allowed select-none'
                      : 'bg-slate-50 border border-slate-300 focus:ring-2 focus:ring-indigo-500'
                  }`}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Address / العنوان المسجل:
                </label>
                <input
                  type="text"
                  readOnly={isFrozen || !isAdmin}
                  disabled={isFrozen}
                  value={profile.address}
                  onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                  className={`w-full p-3 rounded-xl ${
                    isFrozen || !isAdmin
                      ? 'bg-slate-100 border border-slate-200 text-slate-600 cursor-not-allowed select-none'
                      : 'bg-slate-50 border border-slate-300 focus:ring-2 focus:ring-indigo-500'
                  }`}
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Phone / الهاتف:
                </label>
                <input
                  type="text"
                  readOnly={isFrozen || !isAdmin}
                  disabled={isFrozen}
                  value={profile.phone}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  className={`w-full p-3 rounded-xl ${
                    isFrozen || !isAdmin
                      ? 'bg-slate-100 border border-slate-200 text-slate-600 cursor-not-allowed select-none'
                      : 'bg-slate-50 border border-slate-300 focus:ring-2 focus:ring-indigo-500'
                  }`}
                />
              </div>
            </div>
          </div>

          {/* Section 3: Thermal Printer Print Calibration (72mm Thermal Printer) */}
          <div className="space-y-4 pt-4 border-t border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Printer className="w-4.5 h-4.5 text-indigo-600" />
                <h3 className="font-bold text-slate-900 text-sm">
                  Thermal Printer Calibration (إعدادات قياسات الطابعة الحرارية 72mm)
                </h3>
              </div>
              <span className="text-[10px] bg-indigo-50 text-indigo-800 font-bold px-2.5 py-1 rounded-full border border-indigo-200">
                Print Only / يخص الطباعة فقط
              </span>
            </div>

            <p className="text-slate-500 text-xs leading-relaxed">
              اضبط عرض الفاتورة وتباعد الأسطر بما يتناسب مع طابعتك الحرارية لمنع قص الجانب الأيمن وضمان وضوح الأسطر. التعديلات هنا تخص الطباعة فقط ولا تؤثر على واجهة الشاشة.
              <br />
              Adjust receipt width and row spacing to fit your 72mm thermal printer rolls.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="font-bold text-slate-700 block">
                    Receipt Width (mm) / عرض الفاتورة (ملم):
                  </label>
                  <span className="font-mono font-bold text-indigo-700 bg-white px-2 py-0.5 rounded border border-indigo-200 text-xs">
                    {receiptWidth} mm
                  </span>
                </div>
                <input
                  type="number"
                  min="45"
                  max="72"
                  step="1"
                  value={receiptWidth}
                  onChange={(e) => handleReceiptWidthChange(Number(e.target.value) || 58)}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-mono text-slate-900 text-sm focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  الافتراضي: <strong>58mm</strong> (يتحكم بـ <code className="bg-slate-200 px-1 rounded text-[10px]">--receipt-width</code> لتفادي قص الجهة اليمنى على ورق 72mm).
                </p>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="font-bold text-slate-700 block">
                    Print Row Spacing (mm) / تباعد الأسطر (ملم):
                  </label>
                  <span className="font-mono font-bold text-indigo-700 bg-white px-2 py-0.5 rounded border border-indigo-200 text-xs">
                    {printRowSpacing} mm
                  </span>
                </div>
                <input
                  type="number"
                  min="0.5"
                  max="4.0"
                  step="0.5"
                  value={printRowSpacing}
                  onChange={(e) => handlePrintRowSpacingChange(Number(e.target.value) || 1.5)}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-mono text-slate-900 text-sm focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  الافتراضي: <strong>1.5mm</strong> (يتحكم بـ <code className="bg-slate-200 px-1 rounded text-[10px]">--row-gap</code> لمنع التصاق الأسطر رأسياً).
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between text-xs pt-1 gap-2">
              <span className="text-[11px] text-slate-500">
                التعديلات تنعكس فورياً على الطباعة المباشرة ومعاينة الفاتورة.
              </span>
              <button
                type="button"
                onClick={() => {
                  handleReceiptWidthChange(58);
                  handlePrintRowSpacingChange(1.5);
                }}
                className="text-[11px] font-bold text-indigo-700 hover:text-indigo-900 underline cursor-pointer"
              >
                Reset to Default / استعادة الافتراضي (58mm / 1.5mm)
              </button>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 flex justify-between items-center">
            {isAdmin && !isFrozen && (
              <button
                type="button"
                onClick={handleReSeed}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl flex items-center gap-2 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                Re-Seed Sample Data
              </button>
            )}

            <button
              type="submit"
              disabled={isSaving}
              className="ml-auto px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm rounded-xl shadow-lg flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'Saving...' : 'Save Settings / حفظ التغييرات'}
            </button>
          </div>
        </form>

      </div>

      {/* Database Backup & Firebase Account Migration Card */}
      {isAdmin && isAiStudio && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  Database Backup & Account Migration / النسخ الاحتياطي ونقل البيانات
                </h3>
                <p className="text-xs text-slate-500">
                  Connected Project / المشروع الحالي: <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono text-indigo-700 font-bold">{firebaseConfig.projectId}</code>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportBackup}
                disabled={isExporting}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                {isExporting ? 'Exporting...' : 'Export Backup (JSON) / تصدير نسخة'}
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isImporting}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-1.5 border border-slate-200 transition-all cursor-pointer disabled:opacity-50"
              >
                <Upload className="w-4 h-4" />
                {isImporting ? 'Importing...' : 'Restore / Import JSON / استيراد واسترجاع'}
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleImportBackup}
                className="hidden"
              />
            </div>
          </div>

          {backupMsg && (
            <div
              className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
                backupMsg.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-rose-50 border-rose-200 text-rose-900'
              }`}
            >
              {backupMsg.type === 'success' ? <Check className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
              <span>{backupMsg.text}</span>
            </div>
          )}

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-2">
            <p className="font-bold text-slate-800">
              📌 How to switch/save database to another Firebase account (طريقة ربط حساب فايربيس آخر):
            </p>
            <ol className="list-decimal list-inside space-y-1 text-slate-600 leading-relaxed">
              <li>
                <strong>Step 1:</strong> Click <strong>"Export Backup (JSON)"</strong> above to download all current inventory, customers, invoices, and settings.
              </li>
              <li>
                <strong>Step 2:</strong> In your new Firebase account, create a Web App under <em>Project Settings &gt; General &gt; Your apps</em> and copy the <code className="bg-slate-200 px-1 rounded">firebaseConfig</code> code snippet.
              </li>
              <li>
                <strong>Step 3:</strong> Share the new Firebase configuration here (or paste it in chat), and the app will immediately connect to your new Firebase account.
              </li>
              <li>
                <strong>Step 4:</strong> Click <strong>"Restore / Import JSON"</strong> above to restore all your existing data into the new database instantly!
              </li>
            </ol>
          </div>
        </div>
      )}

      {isAdmin && <TranslationManager />}
    </div>
  );
};
