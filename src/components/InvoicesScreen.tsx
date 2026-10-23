import React, { useState } from 'react';
import {
  Receipt,
  Search,
  CheckCircle,
  Clock,
  Eye,
  Calendar,
  Ban,
  AlertTriangle,
  X,
  ShieldAlert,
  Archive,
  FileSpreadsheet,
  PackageCheck,
  UserCheck,
  Coins,
  TrendingDown,
  Info,
} from 'lucide-react';
import { BusinessProfile, Invoice, UserRole } from '../types';
import { cancelInvoice } from '../services/dbService';
import { SaudiRiyalIcon } from './SaudiRiyalIcon';

interface InvoicesScreenProps {
  invoices: Invoice[];
  businessProfile: BusinessProfile;
  userRole?: UserRole;
  onOpenInvoiceModal: (invoice: Invoice) => void;
}

export const InvoicesScreen: React.FC<InvoicesScreenProps> = ({
  invoices,
  businessProfile,
  userRole = 'ADMIN',
  onOpenInvoiceModal,
}) => {
  const isAdminOrManager = userRole === 'ADMIN' || userRole === 'MANAGER';

  // Sub-tab for Admin view: 'ACTIVE' or 'CANCELLED_LOGS'
  const [activeSubTab, setActiveSubTab] = useState<'ACTIVE' | 'CANCELLED_LOGS'>('ACTIVE');

  // Filters for Active tab
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PAID' | 'UNPAID'>('ALL');

  // Cancel Confirmation Modal State
  const [invoiceToCancel, setInvoiceToCancel] = useState<Invoice | null>(null);
  const [cancellationReason, setCancellationReason] = useState('Customer Request / طلب العميل');
  const [restoreStock, setRestoreStock] = useState(true);
  const [isCancelling, setIsCancelling] = useState(false);

  const handleConfirmCancel = async () => {
    if (!invoiceToCancel) return;
    setIsCancelling(true);
    try {
      const cancelledBy = userRole === 'ADMIN' ? 'Admin' : userRole === 'MANAGER' ? 'Manager' : 'Cashier';
      await cancelInvoice(invoiceToCancel, cancelledBy, cancellationReason, restoreStock);
      setInvoiceToCancel(null);
      setCancellationReason('Customer Request / طلب العميل');
    } catch (err) {
      console.error('Error cancelling invoice:', err);
      alert('Failed to cancel invoice. Please try again.');
    } finally {
      setIsCancelling(false);
    }
  };

  // 1. Separate Active vs Cancelled Invoices
  const activeInvoices = invoices.filter((i) => i.invoiceStatus !== 'Cancelled');
  const cancelledInvoices = invoices.filter((i) => i.invoiceStatus === 'Cancelled');

  // 2. Filter Active Invoices
  const filteredActiveInvoices = activeInvoices.filter((inv) => {
    const matchesSearch =
      inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (inv.customTitle && inv.customTitle.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (inv.customer && inv.customer.name.toLowerCase().includes(searchTerm.toLowerCase()));

    let matchesStatus = true;
    if (statusFilter === 'PAID') {
      matchesStatus = inv.paymentStatus === 'PAID';
    } else if (statusFilter === 'UNPAID') {
      matchesStatus = inv.paymentStatus === 'UNPAID';
    }

    return matchesSearch && matchesStatus;
  });

  // 3. Filter Cancelled Invoices for Admin Logs
  const filteredCancelledInvoices = cancelledInvoices.filter((inv) => {
    return (
      inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (inv.customer && inv.customer.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (inv.cancelledBy && inv.cancelledBy.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (inv.cancellationReason && inv.cancellationReason.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  });

  // Active metrics
  const activeCount = activeInvoices.length;
  const paidCount = activeInvoices.filter((i) => i.paymentStatus === 'PAID').length;
  const unpaidCount = activeInvoices.filter((i) => i.paymentStatus === 'UNPAID').length;

  // Cancelled metrics
  const cancelledCount = cancelledInvoices.length;
  const totalCancelledRevenue = cancelledInvoices.reduce((acc, i) => acc + (i.grandTotal || 0), 0);
  const totalCancelledVat = cancelledInvoices.reduce((acc, i) => acc + (i.vatTotal || 0), 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Top Banner & View Navigation */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100/80 flex items-center justify-center text-[#4338CA] shadow-2xs shrink-0">
              <SaudiRiyalIcon className="w-5.5 h-5.5 text-[#4338CA]" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                Tax Invoice Records & History / سجل الفواتير الضريبية
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {isAdminOrManager
                  ? 'Manage active sales, view complete cancellation audit logs, and reprint tax receipts.'
                  : 'View your active sales records and reprint thermal receipts or A4 tax invoices.'}
              </p>
            </div>
          </div>

          {/* Admin Navigation Sub-Tabs */}
          {isAdminOrManager && (
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                onClick={() => setActiveSubTab('ACTIVE')}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 cursor-pointer ${
                  activeSubTab === 'ACTIVE'
                    ? 'bg-slate-900 text-white shadow'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Receipt className="w-4 h-4 text-indigo-400" />
                Active Invoices ({activeCount})
              </button>

              <button
                onClick={() => setActiveSubTab('CANCELLED_LOGS')}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 cursor-pointer ${
                  activeSubTab === 'CANCELLED_LOGS'
                    ? 'bg-rose-600 text-white shadow'
                    : 'text-slate-600 hover:text-rose-600'
                }`}
              >
                <ShieldAlert className="w-4 h-4 text-rose-200" />
                Cancelled Invoice Logs ({cancelledCount})
              </button>
            </div>
          )}
        </div>

        {/* Filter Bar for Active Tab */}
        {(activeSubTab === 'ACTIVE' || !isAdminOrManager) && (
          <div className="flex items-center justify-between flex-wrap gap-3 pt-2 border-t border-slate-100">
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 gap-1 text-xs">
              <button
                onClick={() => setStatusFilter('ALL')}
                className={`px-3 py-1.5 font-bold rounded-lg transition-all ${
                  statusFilter === 'ALL' ? 'bg-slate-900 text-white shadow' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All Active ({activeCount})
              </button>
              <button
                onClick={() => setStatusFilter('PAID')}
                className={`px-3 py-1.5 font-bold rounded-lg transition-all ${
                  statusFilter === 'PAID' ? 'bg-indigo-600 text-white shadow' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Paid ({paidCount})
              </button>
              <button
                onClick={() => setStatusFilter('UNPAID')}
                className={`px-3 py-1.5 font-bold rounded-lg transition-all ${
                  statusFilter === 'UNPAID' ? 'bg-amber-600 text-white shadow' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Credit / Baqaya ({unpaidCount})
              </button>
            </div>

            {/* Role Security Note for Cashier */}
            {!isAdminOrManager && (
              <span className="text-[11px] text-slate-500 bg-slate-50 px-3 py-1 rounded-lg border border-slate-200 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-indigo-600" />
                Cashier View: Showing Active Invoices only.
              </span>
            )}
          </div>
        )}
      </div>

      {/* Admin Cancelled Logs Summary Metric Cards */}
      {isAdminOrManager && activeSubTab === 'CANCELLED_LOGS' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-rose-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500">Total Cancelled Invoices</p>
              <p className="text-2xl font-black text-rose-600 mt-0.5">{cancelledCount}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
              <Ban className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500">Cancelled Sales Volume</p>
              <p className="text-2xl font-black text-slate-900 mt-0.5">
                {totalCancelledRevenue.toFixed(2)} <span className="text-xs font-normal text-slate-500">{businessProfile.currency}</span>
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700">
              <TrendingDown className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500">15% VAT Excluded</p>
              <p className="text-2xl font-black text-slate-900 mt-0.5">
                {totalCancelledVat.toFixed(2)} <span className="text-xs font-normal text-slate-500">{businessProfile.currency}</span>
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-700">
              <PackageCheck className="w-5 h-5" />
            </div>
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div className="relative bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
        <Search className="w-5 h-5 text-slate-400 absolute left-6 top-5" />
        <input
          type="text"
          placeholder={
            activeSubTab === 'CANCELLED_LOGS'
              ? 'Search cancelled logs by invoice #, customer, cashier, or reason... / ابحث في الملغيات'
              : 'Search by invoice #, custom title, customer name... / ابحث في الفواتير'
          }
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-12 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900"
        />
      </div>

      {/* VIEW 1: ACTIVE INVOICES TABLE (Visible to Cashier and Admin) */}
      {(activeSubTab === 'ACTIVE' || !isAdminOrManager) && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-900 text-white font-bold uppercase tracking-wider">
                  <th className="p-3.5">Invoice # & Date</th>
                  <th className="p-3.5">Customer / Title</th>
                  <th className="p-3.5">Items</th>
                  <th className="p-3.5 text-center">Payment Status</th>
                  <th className="p-3.5 text-right">Subtotal</th>
                  <th className="p-3.5 text-right">15% VAT</th>
                  <th className="p-3.5 text-right">Grand Total</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredActiveInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50 transition-all">
                    {/* Invoice # */}
                    <td className="p-3.5">
                      <p className="font-extrabold text-slate-900 text-sm">{inv.invoiceNumber}</p>
                      <p className="text-[10.5px] text-slate-500 flex items-center gap-1 mt-0.5">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        {new Date(inv.createdAt).toLocaleString()}
                      </p>
                    </td>

                    {/* Customer / Title */}
                    <td className="p-3.5">
                      {inv.customTitle ? (
                        <p className="font-bold text-indigo-900 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 text-xs inline-block mb-1">
                          {inv.customTitle}
                        </p>
                      ) : null}

                      <p className="font-semibold text-slate-800 flex items-center flex-wrap gap-1.5">
                        <span>{inv.customer ? inv.customer.name : 'Walk-in Customer (عميل نقدي)'}</span>
                        {inv.customer?.customerNumber && (
                          <span className="px-1 py-0.5 text-[9px] font-bold text-[#4338CA] bg-[#EEF2FF] rounded border border-indigo-200/50 font-mono">
                            Code: {inv.customer.customerNumber}
                          </span>
                        )}
                      </p>
                      {inv.customer?.taxNumber && (
                        <p className="text-[10px] text-slate-400 font-mono">VAT ID: {inv.customer.taxNumber}</p>
                      )}
                    </td>

                    {/* Items Summary */}
                    <td className="p-3.5 text-slate-600">
                      {inv.items.length} item(s) (
                      {inv.items.slice(0, 2).map((i) => i.item.name).join(', ')}
                      {inv.items.length > 2 ? '...' : ''})
                    </td>

                    {/* Payment Status */}
                    <td className="p-3.5 text-center">
                      <span
                        className={`inline-flex items-center gap-1 font-bold text-[10px] px-2.5 py-1 rounded-full ${
                          inv.paymentMethod === 'CREDIT_BAQAYA' || inv.paymentStatus === 'UNPAID'
                            ? 'bg-amber-100 text-amber-900'
                            : 'bg-indigo-100 text-indigo-800'
                        }`}
                      >
                        {inv.paymentMethod === 'CREDIT_BAQAYA' || inv.paymentStatus === 'UNPAID' ? (
                          <Clock className="w-3 h-3 text-amber-600" />
                        ) : (
                          <CheckCircle className="w-3 h-3 text-indigo-600" />
                        )}
                        {inv.paymentMethod} ({inv.paymentMethod === 'CREDIT_BAQAYA' || inv.paymentStatus === 'UNPAID' ? 'CREDIT' : 'PAID'})
                      </span>
                    </td>

                    {/* Financials */}
                    <td className="p-3.5 text-right font-medium text-slate-600">
                      {inv.subtotal.toFixed(2)}
                    </td>
                    <td className="p-3.5 text-right font-medium text-slate-600">
                      {inv.vatTotal.toFixed(2)}
                    </td>
                    <td className="p-3.5 text-right font-extrabold text-slate-900 text-sm">
                      {inv.grandTotal.toFixed(2)} {businessProfile.currency}
                    </td>

                    {/* Actions */}
                    <td className="p-3.5 text-right space-x-1.5 rtl:space-x-reverse">
                      <button
                        onClick={() => onOpenInvoiceModal(inv)}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold shadow transition-all inline-flex items-center gap-1 cursor-pointer"
                        title="View / Print Receipt"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        View / Print
                      </button>

                      {/* Cancel Invoice Option (Cashier & Admin allowed) */}
                      <button
                        onClick={() => setInvoiceToCancel(inv)}
                        className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 hover:text-rose-900 border border-rose-200 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition-all cursor-pointer"
                        title="Cancel / Void Invoice"
                      >
                        <Ban className="w-3.5 h-3.5 text-rose-600" />
                        Cancel
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredActiveInvoices.length === 0 && (
            <div className="bg-white p-12 text-center">
              <p className="text-slate-500 text-sm font-medium">No active tax invoice records found.</p>
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: ADMIN CANCELLED INVOICE LOGS AUDIT TABLE (Admin/Manager Only) */}
      {isAdminOrManager && activeSubTab === 'CANCELLED_LOGS' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-rose-400" />
              <h3 className="font-extrabold text-sm uppercase tracking-wider">
                Audit Trail: Cancelled Invoice Logs / سجل الفواتير الملغاة
              </h3>
            </div>
            <span className="text-xs bg-rose-950/80 text-rose-300 font-mono px-2.5 py-1 rounded-full border border-rose-800">
              {filteredCancelledInvoices.length} Cancelled Log Records
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200">
                  <th className="p-3.5">Invoice # & Orig. Date</th>
                  <th className="p-3.5">Customer / Title</th>
                  <th className="p-3.5">Items Restored</th>
                  <th className="p-3.5 text-right">Amount (VAT)</th>
                  <th className="p-3.5">Cancelled By</th>
                  <th className="p-3.5">Cancelled Date & Reason</th>
                  <th className="p-3.5 text-center">Stock Log</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredCancelledInvoices.map((inv) => (
                  <tr key={inv.id} className="bg-rose-50/30 hover:bg-rose-50/70 transition-all">
                    {/* Invoice # & Original Date */}
                    <td className="p-3.5">
                      <p className="font-extrabold text-slate-800 text-sm line-through decoration-rose-500">
                        {inv.invoiceNumber}
                      </p>
                      <p className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5 font-mono">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        Created: {new Date(inv.createdAt).toLocaleString()}
                      </p>
                    </td>

                    {/* Customer */}
                    <td className="p-3.5">
                      <p className="font-bold text-slate-800">
                        {inv.customer ? inv.customer.name : 'Walk-in Customer'}
                      </p>
                      {inv.paymentMethod && (
                        <p className="text-[10px] text-slate-400 font-mono">
                          Method: {inv.paymentMethod}
                        </p>
                      )}
                    </td>

                    {/* Items */}
                    <td className="p-3.5 text-slate-600">
                      <p className="font-bold text-slate-700">{inv.items.length} line item(s):</p>
                      <p className="text-[10.5px] text-slate-500 truncate max-w-[200px]">
                        {inv.items.map((i) => `${i.item.name} (${i.quantity}x)`).join(', ')}
                      </p>
                    </td>

                    {/* Financials */}
                    <td className="p-3.5 text-right">
                      <p className="font-extrabold text-slate-900 text-sm">
                        {inv.grandTotal.toFixed(2)} {businessProfile.currency}
                      </p>
                      <p className="text-[10px] text-slate-500 font-mono">
                        VAT: {inv.vatTotal.toFixed(2)} SAR
                      </p>
                    </td>

                    {/* Cancelled By */}
                    <td className="p-3.5">
                      <span className="inline-flex items-center gap-1 font-bold text-[10.5px] px-2 py-0.5 rounded-md bg-slate-200 text-slate-800">
                        <UserCheck className="w-3 h-3 text-slate-600" />
                        {inv.cancelledBy || 'Cashier'}
                      </span>
                    </td>

                    {/* Cancelled Timestamp & Reason */}
                    <td className="p-3.5">
                      <p className="text-[10.5px] font-mono text-rose-700 font-semibold">
                        {inv.cancelledAt ? new Date(inv.cancelledAt).toLocaleString() : 'N/A'}
                      </p>
                      <p className="text-[11px] text-slate-600 italic bg-white px-2 py-0.5 rounded border border-slate-200 mt-1 inline-block">
                        "{inv.cancellationReason || 'Cancelled by user'}"
                      </p>
                    </td>

                    {/* Stock Restored Status */}
                    <td className="p-3.5 text-center">
                      {inv.stockRestored !== false ? (
                        <span className="inline-flex items-center gap-1 font-bold text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-300">
                          <PackageCheck className="w-3 h-3 text-indigo-600" />
                          Restored
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 font-semibold text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                          Not Restored
                        </span>
                      )}
                    </td>

                    {/* Action */}
                    <td className="p-3.5 text-right">
                      <button
                        onClick={() => onOpenInvoiceModal(inv)}
                        className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1 cursor-pointer transition-all shadow"
                        title="Inspect / Reprint Cancelled Invoice"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Inspect Receipt
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredCancelledInvoices.length === 0 && (
            <div className="bg-white p-12 text-center">
              <p className="text-slate-500 text-sm font-medium">No cancelled invoice logs found.</p>
            </div>
          )}
        </div>
      )}

      {/* Confirmation Modal for Cancelling Invoice */}
      {invoiceToCancel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5 text-slate-900">
            <div className="flex items-start justify-between border-b pb-3">
              <div className="flex items-center gap-2.5 text-rose-600">
                <ShieldAlert className="w-6 h-6 shrink-0" />
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">Cancel Invoice / إلغاء الفاتورة</h3>
                  <p className="text-xs text-slate-500">Invoice #{invoiceToCancel.invoiceNumber}</p>
                </div>
              </div>
              <button
                onClick={() => setInvoiceToCancel(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl space-y-1 text-xs text-rose-900">
              <p className="font-bold flex items-center gap-1.5 text-rose-800">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                Are you sure you want to cancel this invoice?
              </p>
              <p className="text-rose-700 leading-relaxed pt-1">
                The record will be changed to <span className="font-bold uppercase">CANCELLED</span> and preserved securely in database audit logs. Sold quantities will be returned to inventory.
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Cancellation Reason / سبب الإلغاء:
                </label>
                <input
                  type="text"
                  value={cancellationReason}
                  onChange={(e) => setCancellationReason(e.target.value)}
                  placeholder="e.g. Returned goods, mistake in entry, customer request..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 font-sans text-xs"
                />
              </div>

              {/* Inventory Stock Restoration Option */}
              <div className="flex items-start gap-2.5 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <input
                  type="checkbox"
                  id="restoreStockCheck"
                  checked={restoreStock}
                  onChange={(e) => setRestoreStock(e.target.checked)}
                  className="mt-0.5 w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                />
                <label htmlFor="restoreStockCheck" className="text-xs text-slate-700 font-medium cursor-pointer">
                  <span className="font-bold text-slate-900 block">Restore Inventory Stock / إرجاع الكميات للمخزون</span>
                  Automatically return {invoiceToCancel.items?.length || 0} line item(s) back to current stock.
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t">
              <button
                onClick={() => setInvoiceToCancel(null)}
                disabled={isCancelling}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-all cursor-pointer"
              >
                Keep Active / إلغاء
              </button>
              <button
                onClick={handleConfirmCancel}
                disabled={isCancelling}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isCancelling ? (
                  <span>Processing...</span>
                ) : (
                  <>
                    <Ban className="w-4 h-4" />
                    Confirm Cancellation / تأكيد الإلغاء
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

