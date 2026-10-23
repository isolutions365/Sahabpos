import React, { useState } from 'react';
import {
  Users,
  UserPlus,
  Search,
  Phone,
  FileText,
  CreditCard,
  Edit,
  Trash2,
  CheckCircle,
  Building,
  Clock,
  ShieldAlert,
  X,
  Printer,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { Customer, Invoice } from '../types';
import { addCustomer, updateCustomer, deleteCustomer, updateInvoice } from '../services/dbService';

interface CustomerScreenProps {
  customers: Customer[];
  invoices: Invoice[];
  onSelectCustomerForPos?: (customer: Customer) => void;
}

export const CustomerScreen: React.FC<CustomerScreenProps> = ({
  customers,
  invoices,
  onSelectCustomerForPos,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  
  // Payment recorder modal state
  const [paymentModalCustomer, setPaymentModalCustomer] = useState<Customer | null>(null);

  // Statement drill-down modal state
  const [selectedStatementCustomer, setSelectedStatementCustomer] = useState<Customer | null>(null);

  // Manual payment entry form fields
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().substring(0, 10));
  const [paymentNotes, setPaymentNotes] = useState('');

  // Form Fields (Baqaya simplified requirements)
  const [name, setName] = useState('');
  const [customerNumber, setCustomerNumber] = useState(''); // Stores "Customer Code / رمز العميل"
  const [phone, setPhone] = useState(''); // Stores mobile/phone number

  const handleOpenAddModal = () => {
    setEditingCustomer(null);
    setName('');
    setCustomerNumber('');
    setPhone('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (customer: Customer) => {
    setEditingCustomer(customer);
    setName(customer.name);
    setCustomerNumber(customer.customerNumber || '');
    setPhone(customer.phone || '');
    setIsModalOpen(true);
  };

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const code = customerNumber.trim();
    const cleanPhone = phone.trim();

    if (!code) {
      alert('Customer Code / رمز العميل is required.');
      return;
    }

    // Uniqueness validation on the Customer Code (customerNumber)
    const isDuplicate = customers.some(c => 
      c.customerNumber?.trim().toLowerCase() === code.toLowerCase() && 
      c.id !== editingCustomer?.id
    );

    if (isDuplicate) {
      alert(`The Customer Code "${code}" is already assigned to another customer. Please use a unique code.\nرمز العميل "${code}" مخصص بالفعل لعميل آخر. يرجى استخدام رمز فريد.`);
      return;
    }

    const customerData = {
      name,
      customerNumber: code,
      phone: cleanPhone,
      licenseNumber: editingCustomer?.licenseNumber || '',
      crNumber: editingCustomer?.crNumber || '',
      taxNumber: editingCustomer?.taxNumber || '',
      notes: editingCustomer?.notes || '',
    };

    if (editingCustomer) {
      await updateCustomer(editingCustomer.id, customerData);
    } else {
      await addCustomer(customerData);
    }

    setIsModalOpen(false);
  };

  const handleSaveManualPayment = async (customer: Customer) => {
    const amt = parseFloat(paymentAmount);
    if (isNaN(amt) || amt <= 0) {
      alert('Please enter a valid positive payment amount. / يرجى إدخال مبلغ صحيح.');
      return;
    }

    try {
      const newPayment = {
        id: Math.random().toString(36).substring(2, 9),
        amount: amt,
        date: paymentDate,
        notes: paymentNotes || 'Manual Payment / سداد يدوي',
      };

      const updatedHistory = [...(customer.paymentHistory || []), newPayment];
      await updateCustomer(customer.id, { paymentHistory: updatedHistory });

      setPaymentAmount('');
      setPaymentNotes('');
      setPaymentDate(new Date().toISOString().substring(0, 10));
      alert('Payment recorded successfully / تم تسجيل السداد بنجاح');
    } catch (err) {
      console.error('Error saving payment:', err);
      alert('Failed to record payment / فشل تسجيل السداد');
    }
  };

  const handleDeletePaymentLog = async (customer: Customer, paymentId: string) => {
    if (!confirm('Are you sure you want to delete this payment record? / هل أنت متأكد من حذف هذا السداد؟')) {
      return;
    }
    try {
      const updatedHistory = (customer.paymentHistory || []).filter(p => p.id !== paymentId);
      await updateCustomer(customer.id, { paymentHistory: updatedHistory });
    } catch (err) {
      console.error('Error deleting payment:', err);
      alert('Failed to delete payment record.');
    }
  };

  const handleSettleAllInvoices = async (customer: Customer) => {
    try {
      const custInvoices = invoices.filter(inv => inv.customer && inv.customer.id === customer.id && inv.invoiceStatus !== 'Cancelled');
      const unpaid = custInvoices.filter(inv => inv.paymentStatus === 'UNPAID');
      for (const inv of unpaid) {
        await updateInvoice(inv.id, { paymentStatus: 'PAID' });
      }
    } catch (err) {
      console.error('Error settling all invoices:', err);
      alert('Could not update invoice statuses.');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this customer record?')) {
      await deleteCustomer(id);
    }
  };

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.phone && c.phone.includes(searchTerm)) ||
      (c.customerNumber && c.customerNumber.includes(searchTerm))
  );

  return (
    <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 ${selectedStatementCustomer ? 'print:hidden' : ''}`}>
      
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100/80 flex items-center justify-center text-[#4338CA] shadow-2xs shrink-0">
            <Users className="w-5.5 h-5.5 text-[#4338CA]" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              Customer & Credit Management / حسابات العملاء والآجل
            </h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Manage customer credit accounts (Baqaya / آجل) and record payments.
            </p>
          </div>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="px-3.5 py-2 bg-[#4338CA] hover:bg-[#3730A3] text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow transition-all self-start sm:self-auto"
        >
          <UserPlus className="w-3.5 h-3.5" />
          Add Customer Record / إضافة عميل
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative bg-white p-2.5 rounded-xl border border-slate-200 shadow-sm">
        <Search className="w-4 h-4 text-slate-400 absolute left-5.5 top-5" />
        <input
          type="text"
          placeholder="Search by customer name or number... / ابحث عن عميل باسمه أو رقمه"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-11 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#4338CA] focus:border-[#4338CA] text-slate-900"
        />
      </div>

      {/* Customer List Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCustomers.map((customer) => {
          // Find customer's attached invoices (ignoring cancelled ones for balance)
          const customerInvoices = invoices.filter(
            (inv) => inv.customer && inv.customer.id === customer.id && inv.invoiceStatus !== 'Cancelled'
          );
          const unpaidInvoices = customerInvoices.filter((inv) => inv.paymentStatus === 'UNPAID');
          const totalUnpaidInvoices = unpaidInvoices.reduce((acc, inv) => acc + inv.grandTotal, 0);
          const totalPayments = customer.paymentHistory?.reduce((acc, p) => acc + p.amount, 0) || 0;
          const currentBalance = Math.max(0, totalUnpaidInvoices - totalPayments);

          return (
            <div
              key={customer.id}
              className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-between hover:border-[#4338CA] transition-all"
            >
              <div className="space-y-3">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center flex-wrap gap-1.5">
                      <span className="font-bold text-sm text-slate-900 truncate">{customer.name}</span>
                      <span className="px-1.5 py-0.5 text-[10px] font-bold text-[#4338CA] bg-[#EEF2FF] rounded border border-indigo-200 font-mono">
                        Code: {customer.customerNumber || 'N/A'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>Phone / الجوال:</span>
                      <strong className="font-mono text-slate-800 bg-slate-50 px-1.5 py-0.5 border border-slate-200/60 rounded">
                        {customer.phone || 'N/A'}
                      </strong>
                    </p>
                  </div>
                  <div className="flex items-center space-x-1 rtl:space-x-reverse">
                    <button
                      onClick={() => handleOpenEditModal(customer)}
                      className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg"
                      title="Edit Customer"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(customer.id)}
                      className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg"
                      title="Delete Customer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Credit Balance Alert (Baqaya / آجل) */}
                <div
                  className={`p-3 rounded-xl text-xs flex items-center justify-between ${
                    currentBalance > 0
                      ? 'bg-rose-50 border border-rose-200 text-rose-950'
                      : 'bg-indigo-50 border border-indigo-100 text-[#4338CA]'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold">
                    {currentBalance > 0 ? (
                      <Clock className="w-4 h-4 text-rose-600" />
                    ) : (
                      <CheckCircle className="w-4 h-4 text-indigo-600" />
                    )}
                    <span>
                      {currentBalance > 0
                        ? `Baqaya Amount Owed (رصيد آجل): ${currentBalance.toFixed(2)} SAR`
                        : 'No Pending Balance (الحساب سليم)'}
                    </span>
                  </div>
                </div>

                {/* Actions Grid */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setSelectedStatementCustomer(customer)}
                    className="py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-[11px] rounded-lg border border-slate-200 shadow-sm transition-all flex items-center justify-center gap-1 cursor-pointer"
                    title="View Detailed Statement"
                  >
                    <FileText className="w-3.5 h-3.5 text-slate-500" />
                    Statement / كشف حساب
                  </button>
                  <button
                    onClick={() => setPaymentModalCustomer(customer)}
                    className="py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] rounded-lg shadow transition-all flex items-center justify-center gap-1 cursor-pointer"
                    title="Record Payment"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    Payment / سداد
                  </button>
                </div>
              </div>

              {/* POS Quick Attach CTA */}
              {onSelectCustomerForPos && (
                <button
                  onClick={() => onSelectCustomerForPos(customer)}
                  className="mt-4 w-full py-2 bg-[#4338CA] hover:bg-[#3730A3] text-white font-bold text-xs rounded-lg shadow transition-all"
                >
                  Start Sale for {customer.name.split('/')[0]}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {filteredCustomers.length === 0 && (
        <div className="bg-white p-12 rounded-2xl text-center border border-slate-200">
          <p className="text-slate-500 text-sm font-medium">
            No customer records found. Click "Add Customer Record" to create one.
          </p>
        </div>
      )}

      {/* MANUAL ENTRY MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 my-8">
            <h3 className="font-bold text-base text-slate-900 border-b pb-2">
              {editingCustomer ? 'Edit Customer Record' : 'Manual Entry: New Customer / إضافة عميل جديد'}
            </h3>

            <form onSubmit={handleSaveCustomer} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Customer Name / اسم العميل: *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Ahmad Mohammad"
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm font-semibold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Customer Code / رمز العميل: *
                </label>
                <input
                  type="text"
                  required
                  value={customerNumber}
                  onChange={(e) => setCustomerNumber(e.target.value)}
                  placeholder="e.g., C-001"
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 font-mono text-sm font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Customer Number (mobile/phone) / رقم الجوال: *
                </label>
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g., +966 50 123 4567"
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 font-mono text-sm font-bold"
                />
              </div>

              <div className="flex space-x-2 rtl:space-x-reverse pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="w-1/2 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 bg-[#4338CA] hover:bg-[#3730A3] text-white font-bold rounded-xl shadow transition-all cursor-pointer"
                >
                  Save Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RECORD PAYMENT MODAL */}
      {paymentModalCustomer && (() => {
        // Fetch fresh copy from customers list to have live-updating history
        const customer = customers.find(c => c.id === paymentModalCustomer.id) || paymentModalCustomer;
        const customerInvoices = invoices.filter(
          (inv) => inv.customer && inv.customer.id === customer.id
        );
        const unpaidInvoices = customerInvoices.filter((inv) => inv.paymentStatus === 'UNPAID');
        const totalUnpaidInvoices = unpaidInvoices.reduce((acc, inv) => acc + inv.grandTotal, 0);
        const totalPayments = customer.paymentHistory?.reduce((acc, p) => acc + p.amount, 0) || 0;
        const currentBalance = Math.max(0, totalUnpaidInvoices - totalPayments);

        // Precalculate chronological running remaining balance
        const paymentsSortedChronologically = [...(customer.paymentHistory || [])].sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        );

        let runningBalance = totalUnpaidInvoices;
        const paymentsWithBalance = paymentsSortedChronologically.map((pay) => {
          runningBalance = Math.max(0, runningBalance - pay.amount);
          return {
            ...pay,
            remainingBalance: runningBalance,
          };
        });

        // Display latest payments first
        const displayPaymentsList = [...paymentsWithBalance].reverse();

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4 my-8 text-slate-900">
              <div className="flex justify-between items-center border-b pb-3">
                <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-[#4338CA]" />
                  Record Payment / تسجيل سداد دفعة (Baqaya)
                </h3>
                <button
                  onClick={() => {
                    setPaymentModalCustomer(null);
                    setPaymentAmount('');
                    setPaymentNotes('');
                    setPaymentDate(new Date().toISOString().substring(0, 10));
                  }}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Status Header */}
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl text-xs border border-slate-100">
                <div>
                  <p className="text-slate-500 font-semibold">Customer / العميل:</p>
                  <p className="font-bold text-slate-900">{customer.name}</p>
                  <p className="font-mono text-[10px] text-slate-500 mt-0.5">
                    Phone: {customer.phone || 'N/A'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-slate-500 font-semibold">Current Balance / الرصيد الحالي:</p>
                  <p className={`font-black text-sm ${currentBalance > 0 ? 'text-rose-600' : 'text-indigo-700'}`}>
                    {currentBalance.toFixed(2)} SAR
                  </p>
                  <p className="text-[10px] text-slate-400 font-mono">
                    Invoices Unpaid: {totalUnpaidInvoices.toFixed(2)} | Payments: {totalPayments.toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Form to enter payment */}
              <div className="space-y-3 bg-slate-50/50 p-4 rounded-xl border border-slate-200/60 text-xs">
                <h4 className="font-bold text-xs text-slate-800 flex items-center gap-1.5 border-b pb-1.5">
                  <CreditCard className="w-4 h-4 text-[#4338CA]" />
                  Record New Payment / تسجيل دفعة جديدة
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">
                      Payment Amount / مبلغ السداد (SAR): *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      placeholder="e.g. 150.00"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 font-mono font-bold text-sm"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">
                      Payment Date / تاريخ السداد: *
                    </label>
                    <input
                      type="date"
                      required
                      value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)}
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 font-mono font-bold text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Notes / Comments (Optional / اختياري):
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Paid via Cash/Mada"
                    value={paymentNotes}
                    onChange={(e) => setPaymentNotes(e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => handleSaveManualPayment(customer)}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle className="w-4 h-4" />
                  Save Payment / حفظ السداد
                </button>
              </div>

              {/* Payment History Log */}
              <div className="space-y-2 text-xs">
                <h4 className="font-bold text-xs text-slate-800 border-b pb-1 flex items-center justify-between">
                  <span>Payment History / سجل عمليات السداد</span>
                  <span className="text-[10px] font-mono text-slate-400">Total Payments: {customer.paymentHistory?.length || 0}</span>
                </h4>

                {(!customer.paymentHistory || customer.paymentHistory.length === 0) ? (
                  <p className="text-center text-[11px] text-slate-400 py-4 italic bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                    No manual payments logged yet / لا يوجد عمليات سداد مسجلة
                  </p>
                ) : (
                  <div className="max-h-40 overflow-y-auto border border-slate-150 rounded-xl divide-y bg-white text-slate-900">
                    {displayPaymentsList.map((pay) => (
                      <div key={pay.id} className="p-2.5 flex items-center justify-between hover:bg-slate-50/50">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900">{pay.amount.toFixed(2)} SAR</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold border border-slate-200">
                              Balance: {pay.remainingBalance.toFixed(2)} SAR
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-500 mt-1 flex items-center gap-1.5 font-sans">
                            <span className="font-mono bg-slate-50 px-1 py-0.2 rounded border border-slate-100">{pay.date}</span>
                            <span className="text-slate-300">|</span>
                            <span>{pay.notes}</span>
                          </p>
                        </div>
                        <button
                          onClick={() => handleDeletePaymentLog(customer, pay.id)}
                          className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg cursor-pointer"
                          title="Delete Payment Log"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Outstanding Invoices Option */}
              {unpaidInvoices.length > 0 && (
                <div className="bg-amber-50/30 p-3.5 rounded-xl border border-amber-200/50 text-xs space-y-2">
                  <h4 className="font-bold text-amber-900 text-[11px]">Settle Credit Invoices / تسوية الفواتير الآجلة</h4>
                  <p className="text-[10px] text-slate-500">
                    You can also mark all credit invoices as paid in full to reset the outstanding billing.
                  </p>
                  <button
                    onClick={() => {
                      if (confirm('Settle all outstanding invoices for this customer?')) {
                        handleSettleAllInvoices(customer);
                      }
                    }}
                    className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-center shadow-sm cursor-pointer"
                  >
                    Settle All Invoices ({totalUnpaidInvoices.toFixed(2)} SAR)
                  </button>
                </div>
              )}

              <div className="pt-2 border-t text-right">
                <button
                  type="button"
                  onClick={() => {
                    setPaymentModalCustomer(null);
                    setPaymentAmount('');
                    setPaymentNotes('');
                    setPaymentDate(new Date().toISOString().substring(0, 10));
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* DETAILED STATEMENT MODAL */}
      {selectedStatementCustomer && (() => {
        // Fetch fresh copy from customers list to have live-updating history
        const customer = customers.find(c => c.id === selectedStatementCustomer.id) || selectedStatementCustomer;
        
        // Find customer's attached credit invoices (ignoring cancelled ones)
        const customerInvoices = invoices.filter(
          (inv) => inv.customer && inv.customer.id === customer.id && inv.invoiceStatus !== 'Cancelled'
        );

        // Filter and compile ledger entries
        // We only care about CREDIT_BAQAYA invoices
        interface LedgerEntry {
          id: string;
          type: 'PURCHASE' | 'PAYMENT' | 'SETTLEMENT';
          date: string;
          amount: number;
          invoiceNumber?: string;
          items?: any[];
          notes?: string;
          status?: 'PAID' | 'UNPAID';
        }

        const ledgerEntries: LedgerEntry[] = [];

        // 1. Add credit purchases
        customerInvoices.forEach(inv => {
          if (inv.paymentMethod === 'CREDIT_BAQAYA') {
            ledgerEntries.push({
              id: `invoice-${inv.id}`,
              type: 'PURCHASE',
              date: inv.createdAt,
              amount: inv.grandTotal,
              invoiceNumber: inv.invoiceNumber,
              items: inv.items,
              status: inv.paymentStatus,
            });

            if (inv.paymentStatus === 'PAID') {
              // Add offset settlement entry slightly after (1 second) to maintain chronological logic
              const settleDate = new Date(new Date(inv.createdAt).getTime() + 1000).toISOString();
              ledgerEntries.push({
                id: `settle-${inv.id}`,
                type: 'SETTLEMENT',
                date: settleDate,
                amount: -inv.grandTotal,
                invoiceNumber: inv.invoiceNumber,
                notes: 'Invoice Settled / تم تسوية الفاتورة',
              });
            }
          }
        });

        // 2. Add manual payment history
        if (customer.paymentHistory) {
          customer.paymentHistory.forEach(pay => {
            let paymentDateStr = pay.date;
            if (paymentDateStr.length === 10) {
              paymentDateStr = `${paymentDateStr}T12:00:00.000Z`;
            }
            ledgerEntries.push({
              id: `payment-${pay.id}`,
              type: 'PAYMENT',
              date: paymentDateStr,
              amount: -pay.amount,
              notes: pay.notes || 'Recorded Payment / دفعة مسددة',
            });
          });
        }

        // 3. Sort chronologically
        ledgerEntries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        // 4. Compute running balance at each point in time
        let runningAccumulator = 0;
        const ledgerWithBalance = ledgerEntries.map(entry => {
          runningAccumulator += entry.amount;
          return {
            ...entry,
            runningBalance: Math.max(0, runningAccumulator),
          };
        });

        // Calculate summary metrics
        const totalCreditPurchases = ledgerEntries
          .filter(e => e.type === 'PURCHASE')
          .reduce((acc, e) => acc + e.amount, 0);

        const totalPaymentsMade = Math.abs(
          ledgerEntries
            .filter(e => e.type === 'PAYMENT' || e.type === 'SETTLEMENT')
            .reduce((acc, e) => acc + e.amount, 0)
        );

        const outstandingBalance = Math.max(0, totalCreditPurchases - totalPaymentsMade);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 overflow-y-auto print:absolute print:inset-0 print:bg-white print:p-0 print:z-[9999] print:overflow-visible">
            <div className="bg-white rounded-2xl max-w-4xl w-full p-6 shadow-2xl space-y-6 my-8 text-slate-900 print:shadow-none print:border-none print:p-0 print:m-0 print:max-w-none print:w-full">
              
              {/* Header section */}
              <div className="flex justify-between items-start border-b pb-4 print:pb-2 print:border-slate-300">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-[#4338CA] print:hidden" />
                    <h3 className="font-extrabold text-lg text-slate-900">
                      Statement of Account / كشف حساب عميل آجل
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 font-medium print:text-[10px]">
                    Detailed chronological transaction statement and running credit ledger.
                  </p>
                </div>
                <div className="flex items-center gap-2 print:hidden">
                  <button
                    onClick={() => window.print()}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg flex items-center gap-1.5 border border-slate-200 transition-all cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    Print Statement / طباعة
                  </button>
                  <button
                    onClick={() => setSelectedStatementCustomer(null)}
                    className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-all"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Customer Info & Profile */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-150 print:bg-white print:border-slate-200 print:p-3 print:gap-2">
                <div className="space-y-1.5 text-xs">
                  <p className="text-slate-400 font-bold uppercase tracking-wider text-[10px] print:text-[8px]">
                    Customer Details / تفاصيل العميل
                  </p>
                  <h4 className="font-extrabold text-slate-900 text-sm print:text-xs">
                    {customer.name}
                  </h4>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11px] text-slate-600 print:text-[10px]">
                    <span className="flex items-center gap-1">
                      <strong className="text-slate-400 font-medium font-sans">Code:</strong>
                      <span className="font-bold text-slate-800 bg-slate-200/60 px-1 py-0.2 rounded border border-slate-300/40 print:bg-none print:border-none print:p-0">
                        {customer.customerNumber || 'N/A'}
                      </span>
                    </span>
                    <span className="flex items-center gap-1">
                      <strong className="text-slate-400 font-medium font-sans">Phone:</strong>
                      <span className="font-bold text-slate-800">{customer.phone || 'N/A'}</span>
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="bg-white p-2 rounded-lg border border-slate-200/60 flex flex-col justify-center print:border-slate-200 print:p-1.5">
                    <span className="text-slate-400 font-bold text-[9px] uppercase tracking-wider print:text-[8px]">Purchases / المشتريات</span>
                    <span className="font-black text-slate-800 text-xs sm:text-sm mt-0.5 font-mono">
                      {totalCreditPurchases.toFixed(2)}
                    </span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-slate-200/60 flex flex-col justify-center print:border-slate-200 print:p-1.5">
                    <span className="text-slate-400 font-bold text-[9px] uppercase tracking-wider print:text-[8px]">Payments / المدفوعات</span>
                    <span className="font-black text-indigo-700 text-xs sm:text-sm mt-0.5 font-mono">
                      {totalPaymentsMade.toFixed(2)}
                    </span>
                  </div>
                  <div className={`p-2 rounded-lg border flex flex-col justify-center print:p-1.5 ${
                    outstandingBalance > 0
                      ? 'bg-rose-50/50 border-rose-200 text-rose-950 print:bg-white print:border-slate-200'
                      : 'bg-indigo-50/50 border-indigo-200 text-indigo-950 print:bg-white print:border-slate-200'
                  }`}>
                    <span className="text-slate-400 font-bold text-[9px] uppercase tracking-wider print:text-[8px]">Balance / المتبقي</span>
                    <span className={`font-black text-xs sm:text-sm mt-0.5 font-mono ${
                      outstandingBalance > 0 ? 'text-rose-600' : 'text-indigo-700'
                    }`}>
                      {outstandingBalance.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Chronological Ledger Entries List */}
              <div className="space-y-3">
                <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider flex items-center justify-between border-b pb-1.5 border-slate-200">
                  <span>Ledger History / حركة كشف الحساب بالتاريخ</span>
                  <span className="text-[10px] text-slate-400 font-mono">Entries: {ledgerWithBalance.length}</span>
                </h4>

                {ledgerWithBalance.length === 0 ? (
                  <div className="text-center py-10 bg-slate-50 border border-dashed rounded-xl text-slate-400 italic text-xs">
                    No transactions recorded on this credit statement yet. / لا يوجد حركات مسجلة بكشف الحساب.
                  </div>
                ) : (
                  <div className="border border-slate-150 rounded-xl overflow-hidden divide-y divide-slate-100 bg-white print:border-slate-200">
                    {/* Table Header */}
                    <div className="grid grid-cols-12 bg-slate-50 p-3 font-extrabold text-[10px] text-slate-500 uppercase tracking-wider text-left rtl:text-right print:bg-slate-100 print:text-slate-700 print:p-2">
                      <div className="col-span-3 sm:col-span-2">Date / التاريخ</div>
                      <div className="col-span-3 sm:col-span-2">Type / نوع الحركة</div>
                      <div className="col-span-3 sm:col-span-4">Details / التفاصيل</div>
                      <div className="col-span-3 sm:col-span-2 text-right font-mono">Amount / المبلغ</div>
                      <div className="hidden sm:block sm:col-span-2 text-right font-mono">Balance / الرصيد</div>
                    </div>

                    {/* Table Body */}
                    <div className="divide-y divide-slate-100 max-h-[380px] overflow-y-auto print:max-h-none print:overflow-visible text-[11px] text-slate-800">
                      {ledgerWithBalance.map((entry) => {
                        const isIncrease = entry.type === 'PURCHASE';
                        const formattedDate = new Date(entry.date).toLocaleString('en-US', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: false,
                        });

                        return (
                          <div key={entry.id} className="grid grid-cols-12 p-3 items-start hover:bg-slate-50/50 print:p-2 print:hover:bg-transparent">
                            
                            {/* Date */}
                            <div className="col-span-3 sm:col-span-2 font-mono text-slate-500 self-center text-[10px]">
                              {formattedDate}
                            </div>

                            {/* Type */}
                            <div className="col-span-3 sm:col-span-2 self-center">
                              {entry.type === 'PURCHASE' ? (
                                <span className="inline-flex items-center gap-1 font-bold text-rose-700">
                                  <ArrowUpRight className="w-3.5 h-3.5 shrink-0 text-rose-500 print:hidden" />
                                  <span>Debit / فاتورة</span>
                                </span>
                              ) : entry.type === 'PAYMENT' ? (
                                <span className="inline-flex items-center gap-1 font-bold text-indigo-700">
                                  <ArrowDownRight className="w-3.5 h-3.5 shrink-0 text-indigo-500 print:hidden" />
                                  <span>Credit / سداد</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 font-bold text-slate-600">
                                  <CheckCircle className="w-3.5 h-3.5 shrink-0 text-slate-400 print:hidden" />
                                  <span>Settle / تسوية</span>
                                </span>
                              )}
                            </div>

                            {/* Details (Items / Notes) */}
                            <div className="col-span-3 sm:col-span-4 pr-2">
                              {entry.type === 'PURCHASE' ? (
                                <div className="space-y-0.5">
                                  <div className="font-bold text-slate-800">
                                    Invoice {entry.invoiceNumber}
                                  </div>
                                  <div className="text-[10px] text-slate-400 font-sans leading-relaxed flex flex-wrap gap-1">
                                    {entry.items?.map((item, idx) => (
                                      <span key={idx} className="inline-block bg-slate-50 border border-slate-150 px-1 py-0.2 rounded print:border-slate-200 print:bg-white text-[9px]">
                                        {item.name} ({item.quantity}x @ {item.price})
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              ) : (
                                <div className="font-sans text-slate-500 italic">
                                  {entry.notes}
                                </div>
                              )}
                            </div>

                            {/* Amount */}
                            <div className={`col-span-3 sm:col-span-2 text-right font-bold font-mono self-center ${
                              isIncrease ? 'text-rose-600' : 'text-indigo-700'
                            }`}>
                              {isIncrease ? '+' : '-'}{Math.abs(entry.amount).toFixed(2)}
                            </div>

                            {/* Running Balance */}
                            <div className="col-span-12 sm:col-span-2 text-right font-black font-mono self-center sm:text-slate-900 border-t border-slate-100 sm:border-0 pt-1.5 sm:pt-0 mt-1.5 sm:mt-0">
                              <span className="sm:hidden text-slate-400 font-normal mr-1 font-sans">Running Balance:</span>
                              {entry.runningBalance.toFixed(2)} <span className="text-[9px] font-sans font-normal text-slate-400">SAR</span>
                            </div>

                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* End of Statement Box */}
              <div className="p-4 rounded-xl border flex flex-col sm:flex-row items-center justify-between gap-4 print:p-3 print:gap-2 print:border-slate-200 bg-slate-50 border-slate-200">
                <div className="text-center sm:text-left rtl:sm:text-right">
                  <p className="font-bold text-slate-800 text-xs">
                    Current Statement Summary / ملخص كشف الحساب الختامي
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {outstandingBalance > 0 
                      ? 'Total outstanding balance must be settled as per agreed credit terms.'
                      : 'Excellent! No pending balance is registered on this account.'}
                  </p>
                </div>

                <div className="text-center sm:text-right space-y-1">
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Total Balance Owed / إجمالي المبلغ المستحق</span>
                  <p className={`font-black text-lg font-mono sm:text-xl leading-none ${
                    outstandingBalance > 0 ? 'text-rose-600' : 'text-indigo-700'
                  }`}>
                    {outstandingBalance.toFixed(2)} SAR
                  </p>
                  {outstandingBalance === 0 && (
                    <span className="inline-block text-[9px] bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded-full font-bold">
                      Account Settled / الحساب خالص
                    </span>
                  )}
                </div>
              </div>

              {/* Print Footer / Legal */}
              <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center text-[10px] text-slate-400 gap-2 font-medium">
                <div>
                  Statement generated on {new Date().toLocaleDateString('en-US', { dateStyle: 'long' })} at {new Date().toLocaleTimeString('en-US', { timeStyle: 'short' })}
                </div>
                <div className="text-slate-400 font-bold uppercase tracking-wider text-[9px]">
                  Powered by I-Solutions
                </div>
              </div>

              {/* Close Button print:hidden */}
              <div className="flex justify-end print:hidden pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setSelectedStatementCustomer(null)}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl shadow-sm transition-all cursor-pointer"
                >
                  Close / إغلاق
                </button>
              </div>

            </div>
          </div>
        );
      })()}
    </div>
  );
};
