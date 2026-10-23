import React, { useEffect, useState } from 'react';
import {
  ShieldCheck,
  Calendar,
  User,
  Building2,
  FileText,
  AlertCircle,
  Info,
  PhoneCall,
  MapPin,
  CheckCircle,
} from 'lucide-react';
import { Invoice, BusinessProfile } from '../types';
import { getInvoiceById, getBusinessProfile } from '../services/dbService';

interface PublicInvoiceViewProps {
  invoiceId: string;
}

export const PublicInvoiceView: React.FC<PublicInvoiceViewProps> = ({ invoiceId }) => {
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [liveBusiness, setLiveBusiness] = useState<BusinessProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [invoiceData, profileData] = await Promise.all([
          getInvoiceById(invoiceId),
          getBusinessProfile(),
        ]);
        setInvoice(invoiceData);
        setLiveBusiness(profileData);
      } catch (err) {
        console.error('Error loading invoice and business profile:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [invoiceId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-sm font-bold text-slate-800">Verifying Electronic Tax Invoice...</p>
        <p className="text-xs text-slate-400 mt-1 font-sans">جاري التحقق من الفاتورة الإلكترونية...</p>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 text-center">
        <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mb-4 border border-rose-200 shadow-sm">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Invoice Not Found / الفاتورة غير موجودة</h2>
        <p className="text-xs text-slate-500 max-w-md mt-2">
          The requested invoice ID <code className="bg-slate-200 px-1.5 py-0.5 rounded text-slate-800 font-mono text-[11px]">{invoiceId}</code> could not be found or is no longer available.
        </p>
      </div>
    );
  }

  // Determine if there is outstanding balance (Baqaya / آجل)
  const isBaqaya = invoice.paymentMethod === 'CREDIT_BAQAYA' || invoice.paymentStatus === 'UNPAID';

  const activeBusiness = liveBusiness || invoice.businessProfile;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 py-6 px-4 sm:px-6 lg:px-8 font-sans antialiased selection:bg-indigo-600 selection:text-white">
      <div className="max-w-2xl mx-auto space-y-4">
        
        {/* Verification Success Header Banner (Print: hidden) */}
        <div className="bg-indigo-900 text-white p-3.5 rounded-2xl shadow-md border border-indigo-800 flex items-center justify-between print:hidden">
          <div className="flex items-center space-x-3 rtl:space-x-reverse">
            <div className="w-9 h-9 bg-indigo-500/20 text-indigo-100 rounded-xl flex items-center justify-center border border-indigo-500/30">
              <ShieldCheck className="w-5 h-5 text-indigo-300" />
            </div>
            <div>
              <h3 className="font-extrabold text-xs sm:text-sm tracking-tight text-white leading-tight">
                ZATCA Compliant E-Invoice
              </h3>
              <p className="text-[10px] text-indigo-200 font-sans leading-tight">
                فاتورة ضريبية مبسطة معتمدة
              </p>
            </div>
          </div>
        </div>

        {/* Main Document Card */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200/80 p-5 sm:p-8 space-y-6 relative overflow-hidden print:border-0 print:shadow-none print:p-0">
          {/* Subtle top decoration */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-indigo-700"></div>

          {/* Business Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4 border-b border-slate-100 pb-5">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                {activeBusiness.logo ? (
                  <img
                    src={activeBusiness.logo}
                    alt="Logo"
                    className="w-12 h-12 object-contain bg-white border border-slate-200 rounded-xl p-1 shrink-0"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center font-black text-indigo-800 text-sm shrink-0">
                    W
                  </div>
                )}
                <div>
                  <h1 
                    dir="rtl"
                    className="text-base sm:text-lg font-extrabold text-slate-900 leading-snug [word-break:normal] [overflow-wrap:break-word] [text-wrap:balance]"
                  >
                    {activeBusiness.businessNameAr?.replace(/بقالة/g, 'تموينات')}
                  </h1>
                  <p className="text-xs font-semibold text-slate-500 leading-tight">
                    {activeBusiness.businessName}
                  </p>
                </div>
              </div>

              <div className="pt-2 text-[11px] text-slate-600 space-y-0.5">
                <p className="flex items-center gap-1">
                  <span className="font-semibold text-slate-500">Commercial Reg No / رقم السجل:</span>
                  <span className="font-mono font-bold text-slate-800">{activeBusiness.crNumber}</span>
                </p>
                <p className="flex items-center gap-1">
                  <span className="font-semibold text-slate-500">VAT Number / الرقم الضريبي:</span>
                  <span className="font-mono font-bold text-slate-800">{activeBusiness.vatNumber}</span>
                </p>
              </div>
            </div>

            <div className="sm:text-right space-y-2 w-full sm:w-auto">
              {/* Payment status badge */}
              <div className="flex sm:justify-end">
                {isBaqaya ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-bold rounded-lg shadow-sm">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                    <span>Baqaya / Outstanding Balance: {invoice.grandTotal.toFixed(2)} SAR</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 border border-indigo-200 text-indigo-800 text-[11px] font-bold rounded-lg shadow-sm">
                    <CheckCircle className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Paid / تم السداد</span>
                  </span>
                )}
              </div>

              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 inline-block text-left sm:text-right w-full sm:w-auto">
                <p className="text-[10px] font-bold text-indigo-900 tracking-wider uppercase">Simplified Tax Invoice / فاتورة مبسطة</p>
                <p className="text-sm font-extrabold text-slate-900 mt-0.5">#{invoice.invoiceNumber}</p>
                <p className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5 sm:justify-end font-mono">
                  <Calendar className="w-3 h-3 text-slate-400" />
                  {new Date(invoice.createdAt).toLocaleString('en-US', { hour12: true })}
                </p>
              </div>
            </div>
          </div>

          {/* Cashier Metadata */}
          {invoice.cashierName && (
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 bg-slate-50/50 px-3 py-1.5 rounded-lg border border-slate-100">
              <User className="w-3.5 h-3.5 text-slate-400" />
              <span>Cashier / الكاشير: <strong className="text-slate-800 font-bold">{invoice.cashierName}</strong> ({invoice.cashierRole})</span>
            </div>
          )}

          {/* Customer details (if attached) */}
          {invoice.customer && (
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/60 space-y-2 text-xs">
              <h3 className="font-extrabold text-slate-800 flex items-center gap-1.5 border-b pb-1.5 border-slate-200/50">
                <Building2 className="w-3.5 h-3.5 text-indigo-700" />
                Customer Details / بيانات العميل
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                <p><span className="text-slate-500 font-semibold">Name / الاسم:</span> <strong className="text-slate-900 font-bold">{invoice.customer.name}</strong></p>
                {invoice.customer.customerNumber && (
                  <p><span className="text-slate-500 font-semibold">Customer No / رقم العميل:</span> <strong className="text-slate-900 font-mono font-bold bg-white px-1.5 py-0.5 border border-slate-100 rounded">{invoice.customer.customerNumber}</strong></p>
                )}
                {invoice.customer.phone && (
                  <p><span className="text-slate-500 font-semibold">Phone / الهاتف:</span> <span className="font-mono text-slate-700">{invoice.customer.phone}</span></p>
                )}
                {invoice.customer.taxNumber && (
                  <p><span className="text-slate-500 font-semibold">VAT Number / الرقم الضريبي للعميل:</span> <span className="font-mono font-bold text-slate-950">{invoice.customer.taxNumber}</span></p>
                )}
                {invoice.customer.crNumber && (
                  <p><span className="text-slate-500 font-semibold">CR Number / رقم السجل للعميل:</span> <span className="font-mono text-slate-700">{invoice.customer.crNumber}</span></p>
                )}
              </div>
            </div>
          )}

          {/* Custom Invoice Title if present */}
          {invoice.customTitle && (
            <div className="bg-indigo-50 border-l-4 border-indigo-600 p-3 rounded-r-xl text-xs font-bold text-indigo-950">
              Note: {invoice.customTitle}
            </div>
          )}

          {/* Itemized Table */}
          <div className="space-y-2">
            <h3 className="font-extrabold text-xs text-slate-800 border-b pb-1 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-slate-500" />
              Itemized Charges / التفاصيل والرسوم
            </h3>
            
            <div className="overflow-x-auto rounded-xl border border-slate-200/60">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-white font-bold">
                    <th className="p-2.5 text-center w-8">#</th>
                    <th className="p-2.5 text-left">Item Description / وصف المنتج</th>
                    <th className="p-2.5 text-center">Qty/Wt / الكمية/الوزن</th>
                    <th className="p-2.5 text-right">Unit Price / سعر الوحدة</th>
                    <th className="p-2.5 text-right">Total / المجموع</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {invoice.items.map((cartItem, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="p-2.5 text-slate-400 text-center font-mono">{idx + 1}</td>
                      <td className="p-2.5">
                        <p className="font-bold text-slate-900 leading-snug">{cartItem.item.productNameEnglish || cartItem.item.name}</p>
                        {(cartItem.item.productNameArabic || cartItem.item.nameAr) && (
                          <p className="text-[10px] text-indigo-900 font-bold font-sans text-right sm:text-left mt-0.5" dir="rtl">
                            {cartItem.item.productNameArabic || cartItem.item.nameAr}
                          </p>
                        )}
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">{cartItem.item.size}</p>
                      </td>
                      <td className="p-2.5 text-center font-mono font-semibold">
                        {cartItem.weight ? (
                          <span className="bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded text-[10px] font-bold">
                            {cartItem.weight} kg
                          </span>
                        ) : (
                          cartItem.quantity
                        )}
                      </td>
                      <td className="p-2.5 text-right font-mono text-slate-700">{cartItem.unitPrice.toFixed(2)}</td>
                      <td className="p-2.5 text-right font-mono font-bold text-slate-900">
                        {cartItem.lineTotal.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals Summary (Without Nested QR Code) */}
          <div className="pt-3 border-t border-slate-100">
            <div className="bg-slate-50/50 rounded-xl border border-slate-150 p-4 space-y-2.5 text-xs">
              <div className="flex justify-between items-center text-slate-600 text-[11px]">
                <span>Subtotal (Excl. VAT) / المجموع غير شامل الضريبة:</span>
                <span className="font-mono font-bold text-slate-900">{invoice.subtotal.toFixed(2)} {activeBusiness.currency}</span>
              </div>
              
              <div className="flex justify-between items-center text-slate-600 text-[11px]">
                <span>Total VAT ({activeBusiness.defaultVatRate || 15}%) / ضريبة القيمة المضافة:</span>
                <span className="font-mono font-bold text-slate-950">{invoice.vatTotal.toFixed(2)} {activeBusiness.currency}</span>
              </div>

              <div className="pt-2 border-t border-dashed border-slate-200 flex justify-between items-center">
                <div>
                  <span className="font-black text-slate-900 block text-xs tracking-tight">GRAND TOTAL / المجموع الكلي:</span>
                  <span className="text-[10px] text-slate-400 block font-normal">Inclusive of all tax & fees</span>
                </div>
                <div className="text-right">
                  <span className="font-black font-mono text-base text-indigo-900 tracking-tight">
                    {invoice.grandTotal.toFixed(2)} {activeBusiness.currency}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Card Section */}
          <div className="border-t border-slate-100 pt-5 text-center space-y-2">
            <div className="flex items-center justify-center gap-1 text-[10px] text-slate-400">
              <Info className="w-3.5 h-3.5" />
              <span>This is a system-generated verified electronic receipt.</span>
            </div>
            
            <div className="flex flex-wrap items-center justify-center gap-4 text-[10px] text-slate-500 font-semibold bg-slate-50 p-2.5 rounded-xl">
              {activeBusiness.address && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  {activeBusiness.address}
                </span>
              )}
              {activeBusiness.phone && (
                <span className="flex items-center gap-1 font-mono">
                  <PhoneCall className="w-3.5 h-3.5 text-slate-400" />
                  {activeBusiness.phone}
                </span>
              )}
            </div>

            <div className="text-[9px] text-slate-400/80 font-semibold tracking-wider uppercase pt-2">
              Powered by iSolutions
            </div>
          </div>
        </div>

        {/* Browser print settings style overlay */}
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            body {
              background-color: white !important;
              color: black !important;
              padding: 0 !important;
              margin: 0 !important;
            }
            .min-h-screen {
              min-height: auto !important;
              background-color: white !important;
            }
            /* Avoid page cutoffs on headers or images */
            img, table, tr {
              page-break-inside: avoid;
            }
          }
        `}} />
      </div>
    </div>
  );
};
