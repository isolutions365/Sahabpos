import React, { useState, useEffect } from 'react';
import { Building2, Save, CheckCircle, ShieldAlert, KeyRound, Lock, Unlock } from 'lucide-react';
import { BusinessProfile, UserRole, BankEditPermission } from '../types';
import {
  saveBusinessProfile,
  saveBusinessProfileWithPermissionCheck,
  subscribeBankEditPermissions,
  requestBankEditPermission,
} from '../services/dbService';

interface MerchantBankDetailsFormProps {
  businessProfile: BusinessProfile;
  onProfileUpdated?: (updated: BusinessProfile) => void;
  userRole: UserRole;
  currentUsername?: string;
  className?: string;
}

export const MerchantBankDetailsForm: React.FC<MerchantBankDetailsFormProps> = ({
  businessProfile,
  onProfileUpdated,
  userRole,
  currentUsername = 'cashier',
  className = '',
}) => {
  const [bankName, setBankName] = useState(businessProfile.bankName || '');
  const [accountName, setAccountName] = useState(businessProfile.accountName || '');
  const [iban, setIban] = useState(businessProfile.iban || '');

  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Bank edit permissions state
  const [permissions, setPermissions] = useState<BankEditPermission[]>([]);

  useEffect(() => {
    setBankName(businessProfile.bankName || '');
    setAccountName(businessProfile.accountName || '');
    setIban(businessProfile.iban || '');
  }, [businessProfile]);

  useEffect(() => {
    const unsub = subscribeBankEditPermissions((perms) => {
      setPermissions(perms);
    });
    return () => unsub();
  }, []);

  const isAdmin = userRole.toUpperCase() === 'ADMIN';
  const userId = currentUsername.trim().toLowerCase();

  // Find user's active/pending permission
  const userPerms = permissions.filter((p) => p.userId.toLowerCase() === userId);
  const activeApprovedPerm = userPerms.find((p) => p.status.toLowerCase() === 'approved' && !p.used);
  const pendingPerm = userPerms.find((p) => p.status.toLowerCase() === 'pending');
  
  const mostRecentPerm = userPerms.sort((a, b) => new Date(b.createdAt || b.requestedAt || 0).getTime() - new Date(a.createdAt || a.requestedAt || 0).getTime())[0];
  const lastWasRejected = mostRecentPerm?.status.toLowerCase() === 'rejected';

  const canEditBankDetails = isAdmin || Boolean(activeApprovedPerm);

  const handleSaveBankDetails = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    setErrorMessage(null);

    const updatedProfile: BusinessProfile = {
      ...businessProfile,
      bankName: bankName.trim(),
      accountName: accountName.trim(),
      iban: iban.trim().toUpperCase(),
    };

    try {
      if (isAdmin) {
        await saveBusinessProfile(updatedProfile);
      } else {
        await saveBusinessProfileWithPermissionCheck(updatedProfile, userRole, userId);
      }

      setIsSaving(false);
      setIsSaved(true);
      if (onProfileUpdated) {
        onProfileUpdated(updatedProfile);
      }
      setTimeout(() => setIsSaved(false), 3500);
    } catch (err: any) {
      setIsSaving(false);
      setErrorMessage(err?.message || 'Failed to save Merchant Bank Details / فشل حفظ بيانات البنك.');
    }
  };

  const handleRequestAccess = async () => {
    try {
      await requestBankEditPermission(userId);
      alert(
        'One-time edit access request sent to Admin successfully! / تم إرسال طلب إذن تعديل بيانات البنك لمدير النظام بنجاح.'
      );
    } catch (err: any) {
      alert('Error requesting access: ' + (err?.message || err));
    }
  };

  return (
    <div className={`bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4 text-xs ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3">
        <div>
          <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-indigo-600" />
            <span>Merchant Bank Details / بيانات الحساب البنكي للتاجر</span>
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Bank details for direct bank transfer payments on commercial quotations and A4 documents.
          </p>
        </div>

        <div>
          {!isAdmin && (
            <span
              className={`text-[10px] font-extrabold px-2.5 py-1 rounded-lg flex items-center gap-1 ${
                canEditBankDetails
                  ? 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                  : 'bg-slate-100 text-slate-600 border border-slate-200'
              }`}
            >
              {canEditBankDetails ? (
                <>
                  <Unlock className="w-3 h-3 text-indigo-700" /> One-Time Edit Active
                </>
              ) : (
                <>
                  <Lock className="w-3 h-3 text-slate-500" /> Read-Only
                </>
              )}
            </span>
          )}
        </div>
      </div>

      {/* Cashier Permission Notice Banner if Read-Only */}
      {!isAdmin && !canEditBankDetails && (
        <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl flex flex-col sm:flex-row items-center justify-between text-[11px] text-amber-900 gap-2">
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Bank account details are locked for Cashiers. Request Admin one-time approval to edit.</span>
            </div>
            {lastWasRejected && !pendingPerm && (
              <span className="text-rose-600 font-bold ml-6">Permission request rejected by Admin. / تم رفض طلب الإذن من قبل المدير.</span>
            )}
          </div>
          {pendingPerm ? (
            <span className="bg-amber-600 text-white font-bold px-3 py-1 rounded-lg text-[10px] whitespace-nowrap">
              Request Pending / قيد الانتظار
            </span>
          ) : (
            <button
              type="button"
              onClick={handleRequestAccess}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-extrabold rounded-lg shadow-sm transition-all cursor-pointer whitespace-nowrap"
            >
              Request Access / طلب إذن تعديل
            </button>
          )}
        </div>
      )}

      {/* Success Notification */}
      {isSaved && (
        <div className="bg-indigo-50 border border-indigo-200 text-indigo-900 px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 animate-fadeIn">
          <CheckCircle className="w-4 h-4 text-indigo-600 shrink-0" />
          <span>Merchant Bank Details Saved Successfully! / تم حفظ بيانات الحساب البنكي للتاجر بنجاح</span>
        </div>
      )}

      {/* Error Notification */}
      {errorMessage && (
        <div className="bg-rose-50 border border-rose-200 text-rose-900 px-4 py-2.5 rounded-xl font-bold flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Form Fields */}
      <form onSubmit={handleSaveBankDetails} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Bank Name */}
          <div>
            <label className="font-bold text-slate-700 block mb-1 text-[11px] uppercase tracking-wider">
              Bank Name / اسم البنك
            </label>
            <input
              type="text"
              readOnly={!canEditBankDetails}
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              placeholder="e.g. Al Rajhi Bank / مصرف الراجحي"
              className={`w-full p-2.5 rounded-xl font-semibold text-xs transition-all ${
                canEditBankDetails
                  ? 'bg-slate-50 border border-slate-300 focus:bg-white focus:ring-2 focus:ring-indigo-500 text-slate-900'
                  : 'bg-slate-100 border border-slate-200 text-slate-600 cursor-not-allowed'
              }`}
            />
          </div>

          {/* Account Name */}
          <div>
            <label className="font-bold text-slate-700 block mb-1 text-[11px] uppercase tracking-wider">
              Account Name / اسم الحساب
            </label>
            <input
              type="text"
              readOnly={!canEditBankDetails}
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              placeholder="e.g. Waseela Al-Sadara Est."
              className={`w-full p-2.5 rounded-xl font-semibold text-xs transition-all ${
                canEditBankDetails
                  ? 'bg-slate-50 border border-slate-300 focus:bg-white focus:ring-2 focus:ring-indigo-500 text-slate-900'
                  : 'bg-slate-100 border border-slate-200 text-slate-600 cursor-not-allowed'
              }`}
            />
          </div>
        </div>

        {/* IBAN Number */}
        <div>
          <label className="font-bold text-slate-700 block mb-1 text-[11px] uppercase tracking-wider">
            IBAN Number / رقم الآيبان البنكي
          </label>
          <input
            type="text"
            readOnly={!canEditBankDetails}
            value={iban}
            onChange={(e) => setIban(e.target.value)}
            placeholder="SA0380000000108012345678"
            className={`w-full p-2.5 rounded-xl font-mono font-bold text-xs transition-all ${
              canEditBankDetails
                ? 'bg-slate-50 border border-slate-300 focus:bg-white focus:ring-2 focus:ring-indigo-500 text-slate-900'
                : 'bg-slate-100 border border-slate-200 text-slate-600 cursor-not-allowed'
            }`}
          />
          <p className="text-[10px] text-slate-400 mt-1">Saudi IBAN format starting with SA (24 characters)</p>
        </div>

        {/* Submit / Action Button */}
        <div className="flex justify-end pt-2">
          {canEditBankDetails ? (
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-extrabold text-xs rounded-xl shadow transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Saving...' : 'Save Merchant Bank Details / حفظ بيانات البنك'}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleRequestAccess}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-extrabold text-xs rounded-xl shadow transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Request Edit Access / طلب إذن التعديل</span>
            </button>
          )}
        </div>
      </form>
    </div>
  );
};
