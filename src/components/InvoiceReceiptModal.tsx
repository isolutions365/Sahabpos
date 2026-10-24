import React, { useState, useEffect } from 'react';
import { X, Printer, Download, CheckCircle, ExternalLink, FileText, QrCode as QrIcon, ShieldCheck, ChevronDown, ChevronUp } from 'lucide-react';
import { Invoice, PrintFormat, BusinessProfile } from '../types';
import { PrintPreviewDialog } from './PrintPreviewDialog';
import { formatPublicInvoiceUrl } from '../services/dbService';
import { generateZatcaQrDataUrl, generateZatcaTlvBase64, decodeZatcaTlvBase64, ZatcaQrFields } from '../utils/zatca';
import { INVOICE_UI_FLAGS } from '../config/uiFlags';

interface InvoiceReceiptModalProps {
  invoice: Invoice;
  onClose: () => void;
  businessProfile?: BusinessProfile;
  defaultFormat?: PrintFormat;
}

export const InvoiceReceiptModal: React.FC<InvoiceReceiptModalProps> = ({ invoice, onClose, businessProfile, defaultFormat = 'THERMAL_80MM' }) => {
  const isManualBill = invoice.invoiceNumber.startsWith('INV-M-');
  const [printFormat, setPrintFormat] = useState<PrintFormat>(isManualBill ? 'A4_FULL' : 'THERMAL_80MM');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [zatcaBase64, setZatcaBase64] = useState<string>('');
  const [zatcaFields, setZatcaFields] = useState<ZatcaQrFields | null>(null);
  const [showZatcaInspector, setShowZatcaInspector] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const activeProfile = businessProfile || invoice.businessProfile;
  const publicInvoiceUrl = formatPublicInvoiceUrl(invoice.id, activeProfile);

  useEffect(() => {
    let isMounted = true;
    
    // Generate Base64 TLV payload
    const base64Payload = generateZatcaTlvBase64(invoice, activeProfile);
    if (isMounted) {
      setZatcaBase64(base64Payload);
      setZatcaFields(decodeZatcaTlvBase64(base64Payload));
    }

    // Render ZATCA Phase 1 Base64 TLV QR Code
    generateZatcaQrDataUrl(invoice, { width: 180, margin: 1 }, activeProfile).then((url) => {
      if (isMounted && url) {
        setQrDataUrl(url);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [invoice, activeProfile]);

  const checkIsExpired = () => {
    try {
      const keysRaw = localStorage.getItem('sahaab_license_keys');
      const deviceActRaw = localStorage.getItem('sahaab_device_activation');
      if (!keysRaw || !deviceActRaw) return false;
      const keys: any[] = JSON.parse(keysRaw);
      const deviceAct = JSON.parse(deviceActRaw);
      const activeKey = keys.find((k) => k.key === deviceAct.key && k.status === 'active');
      if (!activeKey || !activeKey.expiryDate) return true;
      return new Date(activeKey.expiryDate).getTime() < new Date().getTime();
    } catch (e) {
      return false;
    }
  };

  const handlePrint = () => {
    if (checkIsExpired()) {
      alert('License expired. Printing and downloading invoices is blocked until license is renewed. / الترخيص منتهي. الطباعة والتنزيل معطلة حتى تجديد الترخيص.');
      return;
    }
    setIsPreviewOpen(true);
  };

  return (
    <>
      <div className={`fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-2 sm:p-4 overflow-y-auto ${isPreviewOpen ? 'print:hidden no-print hidden' : 'print:p-0 print:m-0 print:bg-white print:static print:w-full'}`}>
        <div className="bg-white text-slate-900 rounded-2xl shadow-2xl max-w-4xl w-full my-6 overflow-hidden flex flex-col max-h-[90vh] print:shadow-none print:border-none print:m-0 print:p-0 print:max-w-full print:rounded-none print:max-h-none print:overflow-visible">
        {/* Modal Top Control Bar (Hidden on Print) */}
        <div className="bg-slate-900 text-white px-6 py-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 print:hidden">
          <div className="flex items-center space-x-2 rtl:space-x-reverse">
            <CheckCircle className="w-5 h-5 text-indigo-400" />
            <div>
              <h3 className="font-bold text-base text-slate-100">
                {invoice.customTitle || `Invoice #${invoice.invoiceNumber}`}
              </h3>
              <p className="text-xs text-slate-400">
                Issued: {new Date(invoice.createdAt).toLocaleString('en-US')}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2 rtl:space-x-reverse">
            {INVOICE_UI_FLAGS.showZatcaButton && (
              <button
                onClick={() => setShowZatcaInspector(!showZatcaInspector)}
                className={`px-3 py-2 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all border ${
                  showZatcaInspector
                    ? 'bg-indigo-950 border-indigo-500 text-indigo-300'
                    : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
                }`}
                title="Inspect ZATCA Phase 1 TLV Fields"
              >
                <ShieldCheck className="w-4 h-4 text-indigo-400" />
                <span>ZATCA Phase 1</span>
                {showZatcaInspector ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            )}
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              Print / طباعة
            </button>
            {INVOICE_UI_FLAGS.showPublicLink && (
              <a
                href={publicInvoiceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-xl flex items-center gap-1.5 transition-all"
              >
                <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                Public Link
              </a>
            )}
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ZATCA Phase 1 TLV Payload Inspector Panel */}
        {INVOICE_UI_FLAGS.showZatcaButton && showZatcaInspector && (
          <div className="bg-slate-950 text-slate-200 border-b border-slate-800 p-4 px-6 text-xs font-sans print:hidden animate-in slide-in-from-top-2">
            <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-indigo-400" />
                <span className="font-bold text-slate-100 text-xs">
                  ZATCA Phase 1 (E-Invoicing) TLV QR Encoder / ترميز هيئة الزكاة والضريبة والجمارك
                </span>
              </div>
              <span className="px-2 py-0.5 bg-indigo-900/60 border border-indigo-500/50 text-indigo-300 font-mono text-[10px] rounded-full font-bold">
                Phase 1 Validated
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 mb-3 text-[11px]">
              <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 block font-semibold">Tag 1: Seller Name</span>
                <span className="font-bold text-slate-200 truncate block mt-0.5" dir="rtl">
                  {zatcaFields?.sellerName || '-'}
                </span>
              </div>
              <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 block font-semibold">Tag 2: VAT Reg #</span>
                <span className="font-mono font-bold text-indigo-400 block mt-0.5">
                  {zatcaFields?.vatNumber || '-'}
                </span>
              </div>
              <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 block font-semibold">Tag 3: ISO Timestamp</span>
                <span className="font-mono text-[10.5px] text-slate-300 block mt-0.5 truncate" title={zatcaFields?.timestamp}>
                  {zatcaFields?.timestamp || '-'}
                </span>
              </div>
              <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 block font-semibold">Tag 4: Total (Incl. VAT)</span>
                <span className="font-mono font-bold text-slate-100 block mt-0.5">
                  {zatcaFields?.totalWithVat} {invoice.businessProfile.currency}
                </span>
              </div>
              <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 block font-semibold">Tag 5: VAT Amount</span>
                <span className="font-mono font-bold text-indigo-400 block mt-0.5">
                  {zatcaFields?.vatTotal} {invoice.businessProfile.currency}
                </span>
              </div>
            </div>

            <div className="bg-slate-900 p-2 rounded-lg border border-slate-800 flex items-center justify-between gap-2">
              <div className="overflow-hidden flex-1">
                <span className="text-[9px] text-slate-500 font-mono block uppercase tracking-wider">Base64 TLV Encoded String:</span>
                <code className="text-[10px] font-mono text-slate-300 break-all select-all block mt-0.5">
                  {zatcaBase64}
                </code>
              </div>
            </div>
          </div>
        )}

        {/* Scrollable Printable Document Container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 pb-24 bg-slate-100 flex justify-center items-start print:p-0 print:bg-white print:overflow-visible">
          {printFormat === 'THERMAL_80MM' ? (
            /* THERMAL 80MM RECEIPT FORMAT - HIGH CONTRAST DARK BLACK 80MM THERMAL FIT */
            <div
              id="printable-receipt"
              className="bg-white p-3 pb-6 text-black border border-slate-300 shadow-md rounded-none w-full max-w-[300px] font-mono text-xs leading-tight print:shadow-none print:border-none print:w-[var(--receipt-width,58mm)] print:max-w-[var(--receipt-width,58mm)] print:min-w-0 print:p-0 print:px-[2mm] print:py-0 print:m-0 print:mx-auto print:box-border print:overflow-visible print:pb-2 text-[11px]"
            >
              {/* Receipt Business Header */}
              {invoice.invoiceStatus === 'Cancelled' && (
                <div className="bg-rose-600 text-white font-extrabold text-center py-1 px-2 rounded mb-3 tracking-widest text-xs uppercase shadow-sm">
                  *** CANCELLED / ملغاة ***
                </div>
              )}
              <div className="receipt-header-block text-center border-b-2 border-dashed border-black pb-2 mb-[3mm]">
                <h2 
                  dir="rtl"
                  className="receipt-company-name arabic-text font-sans font-black text-sm text-center leading-snug text-black [word-break:normal] [overflow-wrap:break-word] [text-wrap:balance] max-w-full block mx-auto py-0.5"
                >
                  {(activeProfile?.businessNameAr || invoice.businessProfile.businessNameAr)?.replace(/بقالة/g, 'تموينات')}
                </h2>
                <p className="receipt-company-name font-sans font-extrabold text-black mt-0.5">
                  {activeProfile?.businessName || invoice.businessProfile.businessName}
                </p>
                <div className="mt-1 text-[10.5px] text-black font-sans font-bold leading-tight">
                  {(activeProfile?.crNumber || invoice.businessProfile.crNumber) && (
                    <p className="receipt-header-line">CR #: {activeProfile?.crNumber || invoice.businessProfile.crNumber}</p>
                  )}
                  {(activeProfile?.vatNumber || invoice.businessProfile.vatNumber) && (
                    <p className="receipt-header-line">VAT #: {activeProfile?.vatNumber || invoice.businessProfile.vatNumber}</p>
                  )}
                  {(activeProfile?.phone || invoice.businessProfile.phone) && (
                    <p className="receipt-header-line">Phone: {activeProfile?.phone || invoice.businessProfile.phone}</p>
                  )}
                  {(activeProfile?.address || invoice.businessProfile.address) && (
                    <p className="receipt-header-line break-words">{activeProfile?.address || invoice.businessProfile.address}</p>
                  )}
                </div>
              </div>

              {/* Invoice Title & Metadata */}
              <div className="receipt-separator border-b-2 border-dashed border-black pb-2 mb-2 text-[11px] font-bold text-black">
                {/* 3mm gap between address block and heading */}
                <div className="receipt-title-gap text-center font-black uppercase underline mb-[2mm] text-xs text-black tracking-wide">
                  {invoice.customTitle || 'SIMPLIFIED TAX INVOICE / فاتورة ضريبية مبسطة'}
                </div>
                {/* Distinct rows: Invoice #, Date, Time, Payment on separate lines */}
                <div className="receipt-row flex justify-between items-center text-black leading-tight py-0.5">
                  <span className="font-bold shrink-0 text-left">Invoice #:</span>
                  <span className="receipt-row-value font-black text-black font-mono text-right whitespace-nowrap shrink-0 text-[10.5px]">{invoice.invoiceNumber}</span>
                </div>
                <div className="receipt-row flex justify-between items-center text-black leading-tight py-0.5">
                  <span className="font-bold shrink-0 text-left">Date:</span>
                  <span className="receipt-row-value font-bold text-black text-right whitespace-nowrap shrink-0 text-[10.5px]">
                    {new Date(invoice.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="receipt-row flex justify-between items-center text-black leading-tight py-0.5">
                  <span className="font-bold shrink-0 text-left">Time:</span>
                  <span className="receipt-row-value font-bold text-black text-right whitespace-nowrap shrink-0 text-[10.5px]">
                    {new Date(invoice.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </div>
                <div className="receipt-row flex justify-between items-center text-black leading-tight py-0.5">
                  <span className="font-bold shrink-0 text-left">Payment:</span>
                  <span className="receipt-row-value font-black text-black text-right whitespace-nowrap shrink-0 text-[10.5px]">{invoice.paymentMethod}</span>
                </div>
              </div>

              {/* Customer Info (if attached) */}
              {invoice.customer && (
                <div className="receipt-separator border border-black p-2 mb-2 text-[10px] rounded space-y-0.5 font-sans text-black font-bold">
                  <div className="font-black text-black">Customer (العميل):</div>
                  <div className="font-extrabold text-black">{invoice.customer.name}</div>
                  {invoice.customer.taxNumber && (
                    <div>Tax ID: {invoice.customer.taxNumber}</div>
                  )}
                  {invoice.customer.crNumber && (
                    <div>CR #: {invoice.customer.crNumber}</div>
                  )}
                </div>
              )}

              {/* Line Items Table */}
              <div className="receipt-separator border-b-2 border-dashed border-black pb-1.5 mb-1.5">
                <div className="grid grid-cols-12 font-black text-[10.5px] uppercase border-y-2 border-black py-0.5 mb-1 text-black">
                  <span className="col-span-6 text-left">Item</span>
                  <span className="col-span-2 text-center">Qty</span>
                  <span className="col-span-4 text-right">Total</span>
                </div>

                {invoice.items.map((cartItem, idx) => (
                  <div key={idx} className="py-0.5 border-b border-black/40 border-dashed last:border-0 text-[11px] text-black">
                    <div className="font-black text-black font-sans leading-tight break-words text-left">
                      {cartItem.item.productNameEnglish || cartItem.item.name}
                    </div>
                    {(cartItem.item.productNameArabic || cartItem.item.nameAr) && (
                      <div className="arabic-text text-[10.5px] text-black font-extrabold font-sans text-right mt-0.5 break-words" dir="rtl">
                        {cartItem.item.productNameArabic || cartItem.item.nameAr}
                      </div>
                    )}
                    <div className="receipt-row receipt-item-qty-row flex justify-between items-center text-black font-bold text-[10.5px] mt-0.5 leading-tight">
                      <span className="text-left">
                        {cartItem.weight
                          ? `${cartItem.weight}kg x ${cartItem.unitPrice.toFixed(2)}`
                          : `${cartItem.quantity} x ${cartItem.unitPrice.toFixed(2)}`}
                      </span>
                      <span className="receipt-row-value font-black font-mono text-black text-right whitespace-nowrap shrink-0 text-[10.5px]">
                        {cartItem.lineTotal.toFixed(2)} {activeProfile?.currency || invoice.businessProfile.currency}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Financial Totals */}
              <div className="receipt-separator border-b-2 border-dashed border-black pb-1.5 mb-1.5 text-[11px] font-sans text-black">
                <div className="receipt-row receipt-total-row flex justify-between items-center font-bold text-black leading-tight py-0.5">
                  <span className="text-left">Subtotal (غير شامل):</span>
                  <span className="receipt-row-value font-black font-mono text-right whitespace-nowrap shrink-0 text-[10.5px]">{invoice.subtotal.toFixed(2)} {activeProfile?.currency || invoice.businessProfile.currency}</span>
                </div>
                <div className="receipt-row receipt-total-row flex justify-between items-center font-bold text-black leading-tight py-0.5">
                  <span className="text-left">VAT ({activeProfile?.defaultVatRate ?? invoice.businessProfile.defaultVatRate ?? 15}%):</span>
                  <span className="receipt-row-value font-black font-mono text-right whitespace-nowrap shrink-0 text-[10.5px]">{invoice.vatTotal.toFixed(2)} {activeProfile?.currency || invoice.businessProfile.currency}</span>
                </div>
                <div className="receipt-row receipt-grand-total flex justify-between items-center font-black text-xs text-black pt-1 border-t-2 border-black leading-tight">
                  <span className="text-left">GRAND TOTAL (الإجمالي):</span>
                  <span className="receipt-row-value font-black font-mono text-right whitespace-nowrap shrink-0 text-[12.5px]">{invoice.grandTotal.toFixed(2)} {activeProfile?.currency || invoice.businessProfile.currency}</span>
                </div>
              </div>

              {/* Single Print Footer */}
              <div className="receipt-single-footer text-center pt-2 font-sans text-black">
                {qrDataUrl && (
                  <div className="receipt-qr-wrapper inline-block p-1 bg-white border border-black rounded mx-auto mb-2.5 max-w-[32mm]">
                    <img 
                      src={qrDataUrl} 
                      alt="Invoice QR Code" 
                      className="w-[30mm] h-[30mm] max-w-[30mm] max-h-[30mm] mx-auto block" 
                      style={{ imageRendering: 'pixelated' }}
                    />
                  </div>
                )}
                <p className="receipt-qr-caption text-[10px] font-black text-black mt-2.5">Scan QR code to verify invoice</p>
                <p className="receipt-footer-subtext arabic-text text-[9px] font-bold text-black mt-1">فاتورة إلكترونية معتمدة بهيئة الزكاة والجمارك</p>
                <p className="receipt-footer-subtext arabic-text text-[9px] font-bold text-black mt-1">Thank you for your visit / شكراً لزيارتكم</p>
                <div className="text-[8px] text-black mt-1.5 font-bold tracking-wider uppercase text-center">
                  Powered by I-Solutions
                </div>
              </div>
            </div>
          ) : (
            /* A4 FULL TAX INVOICE FORMAT */
            <div
              id="printable-a4"
              className="bg-white p-8 pb-20 text-slate-900 shadow-xl border border-slate-200 rounded-none w-full max-w-[800px] font-sans text-xs print:shadow-none print:border-none print:w-full print:p-0 print:m-0 relative"
            >
              {invoice.invoiceStatus === 'Cancelled' && (
                <div className="bg-rose-600 text-white font-extrabold text-center py-2 px-4 rounded-xl mb-4 tracking-widest text-sm uppercase shadow">
                  *** INVOICE CANCELLED / فاتورة ملغاة ***
                  {invoice.cancelledAt && (
                    <span className="block text-[10px] font-normal normal-case opacity-90">
                      Cancelled on {new Date(invoice.cancelledAt).toLocaleString()} by {invoice.cancelledBy || 'Admin'}
                      {invoice.cancellationReason ? ` (${invoice.cancellationReason})` : ''}
                    </span>
                  )}
                </div>
              )}
              {/* Header Banner */}
              <div className="flex justify-between items-start border-b-2 border-indigo-700 pb-4 mb-6">
                <div className="flex items-start gap-3.5">
                  {invoice.businessProfile.logo ? (
                    <img
                      src={invoice.businessProfile.logo}
                      alt="Logo"
                      className="w-12 h-12 object-contain bg-white border border-slate-200 rounded-xl p-1 shrink-0"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center font-black text-indigo-800 text-sm shrink-0">
                      W
                    </div>
                  )}
                  <div>
                    <h1 
                      dir="rtl"
                      className="font-sans font-extrabold text-lg sm:text-xl text-slate-900 leading-snug [word-break:normal] [overflow-wrap:break-word] [text-wrap:balance]"
                    >
                      {(activeProfile?.businessNameAr || invoice.businessProfile.businessNameAr)?.replace(/بقالة/g, 'تموينات')}
                    </h1>
                    <p className="text-sm font-semibold text-slate-700">
                      {invoice.businessProfile.businessName}
                    </p>
                    <div className="mt-2 text-xs text-slate-600 space-y-0.5">
                      <p><span className="font-semibold">CR Number / رقم السجل التجاري:</span> {invoice.businessProfile.crNumber}</p>
                      <p><span className="font-semibold">VAT Number / الرقم الضريبي:</span> {invoice.businessProfile.vatNumber}</p>
                      <p>{invoice.businessProfile.address} | Tel: {invoice.businessProfile.phone}</p>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="inline-block bg-indigo-50 border border-indigo-200 p-3 rounded-xl text-center">
                    <h2 className="text-base font-extrabold text-indigo-900">
                      TAX INVOICE / فاتورة ضريبية
                    </h2>
                    <p className="text-xs font-bold text-slate-800 mt-1">
                      #{invoice.invoiceNumber}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {new Date(invoice.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Custom Title if set */}
              {invoice.customTitle && (
                <div className="bg-slate-100 border-l-4 border-indigo-600 p-3 mb-6 rounded-r-lg font-bold text-sm text-slate-800">
                  {invoice.customTitle}
                </div>
              )}

              {/* Customer & Payment Info Cards */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl">
                  <h3 className="font-bold text-xs uppercase text-slate-500 mb-2 border-b pb-1">
                    Customer Details / بيانات العميل
                  </h3>
                  {invoice.customer ? (
                    <div className="space-y-1 text-xs">
                      <p className="font-bold text-slate-900">{invoice.customer.name}</p>
                      {invoice.customer.taxNumber && (
                        <p><span className="text-slate-500">VAT ID / الرقم الضريبي:</span> {invoice.customer.taxNumber}</p>
                      )}
                      {invoice.customer.crNumber && (
                        <p><span className="text-slate-500">CR No / السجل التجاري:</span> {invoice.customer.crNumber}</p>
                      )}
                      {invoice.customer.licenseNumber && (
                        <p><span className="text-slate-500">License / رقم الترخيص:</span> {invoice.customer.licenseNumber}</p>
                      )}
                      {invoice.customer.phone && (
                        <p><span className="text-slate-500">Phone:</span> {invoice.customer.phone}</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-slate-500 italic">Cash / Walk-in Customer (عميل نقدي)</p>
                  )}
                </div>

                <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl">
                  <h3 className="font-bold text-xs uppercase text-slate-500 mb-2 border-b pb-1">
                    Invoice Summary / ملخص الفاتورة
                  </h3>
                  <div className="space-y-1 text-xs">
                    <p><span className="text-slate-500">Date & Time:</span> {new Date(invoice.createdAt).toLocaleString()}</p>
                    <p><span className="text-slate-500">Payment Method:</span> <span className="font-bold text-indigo-800">{invoice.paymentMethod}</span></p>
                    <p><span className="text-slate-500">Status:</span> <span className={`font-semibold ${invoice.paymentMethod === 'CREDIT_BAQAYA' || invoice.paymentStatus === 'UNPAID' ? 'text-amber-700 font-extrabold' : 'text-indigo-700'}`}>{invoice.paymentMethod === 'CREDIT_BAQAYA' || invoice.paymentStatus === 'UNPAID' ? 'CREDIT' : 'PAID'}</span></p>
                    <p><span className="text-slate-500">Issued By:</span> {invoice.cashierRole}</p>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <table className="w-full border-collapse mb-6 text-xs">
                <thead>
                  <tr className="bg-slate-900 text-white font-bold text-left">
                    <th className="p-2.5 rounded-tl-lg">#</th>
                    <th className="p-2.5">Item Description / الصنف</th>
                    <th className="p-2.5 text-center">Qty / الوزن</th>
                    <th className="p-2.5 text-right">Unit Price / سعر الوحدة</th>
                    <th className="p-2.5 text-right rounded-tr-lg">Total / المجموع</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 border-b border-slate-300">
                  {invoice.items.map((cartItem, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="p-2.5 text-slate-500">{idx + 1}</td>
                      <td className="p-2.5">
                        <p className="font-bold text-slate-900">{cartItem.item.productNameEnglish || cartItem.item.name}</p>
                        {(cartItem.item.productNameArabic || cartItem.item.nameAr) && (
                          <p className="text-[11px] font-bold text-indigo-900" dir="rtl">
                            {cartItem.item.productNameArabic || cartItem.item.nameAr}
                          </p>
                        )}
                        <p className="text-[10px] text-slate-500">Size: {cartItem.item.size}</p>
                      </td>
                      <td className="p-2.5 text-center font-medium">
                        {cartItem.weight ? `${cartItem.weight} kg` : cartItem.quantity}
                      </td>
                      <td className="p-2.5 text-right">{cartItem.unitPrice.toFixed(2)}</td>
                      <td className="p-2.5 text-right font-bold text-slate-900">
                        {cartItem.lineTotal.toFixed(2)} {invoice.businessProfile.currency}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals & QR Section */}
              <div className="flex flex-col sm:flex-row justify-between items-start gap-6 pt-2">
                <div className="flex items-center space-x-4 rtl:space-x-reverse border border-slate-200 p-3 rounded-xl bg-slate-50">
                  {qrDataUrl && (
                    <img src={qrDataUrl} alt="ZATCA Verification QR" className="w-24 h-24 rounded border border-slate-300" />
                  )}
                  <div className="space-y-1 text-xs">
                    <p className="font-bold text-slate-900 flex items-center gap-1">
                      <QrIcon className="w-3.5 h-3.5 text-indigo-600" />
                      ZATCA QR Code / رمز التحقق
                    </p>
                    <p className="text-[10.5px] text-slate-600 leading-tight">
                      Scan to verify electronic invoice on public domain.
                    </p>
                    <p className="text-[10px] text-slate-500">
                      مطابق لمتطلبات هيئة الزكاة والضريبة والجمارك
                    </p>
                  </div>
                </div>

                <div className="w-full sm:w-72 space-y-2 bg-slate-50 border border-slate-200 p-4 rounded-xl">
                  <div className="flex justify-between text-slate-700 text-xs">
                    <span>Subtotal (Excl. VAT):</span>
                    <span className="font-semibold">{invoice.subtotal.toFixed(2)} {invoice.businessProfile.currency}</span>
                  </div>
                  <div className="flex justify-between text-slate-700 text-xs">
                    <span>Total VAT ({invoice.businessProfile.defaultVatRate || 15}% ضريبة):</span>
                    <span className="font-semibold">{invoice.vatTotal.toFixed(2)} {invoice.businessProfile.currency}</span>
                  </div>
                  <div className="flex justify-between text-sm font-extrabold text-slate-950 pt-2 border-t border-slate-300">
                    <span>GRAND TOTAL:</span>
                    <span className="text-indigo-700">{invoice.grandTotal.toFixed(2)} {invoice.businessProfile.currency}</span>
                  </div>
                </div>
              </div>

              {/* Merchant Bank Details Footer */}
              {(activeProfile.bankName || activeProfile.iban) && (
                <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 space-y-1">
                  <p className="font-bold text-[#4338CA]">Merchant Bank Details / بيانات الحساب البنكي للتاجر</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] font-medium">
                    {activeProfile.bankName && <p><span className="text-slate-500 block text-[10px]">Bank Name / اسم البنك:</span> {activeProfile.bankName}</p>}
                    {activeProfile.accountName && <p><span className="text-slate-500 block text-[10px]">Account Name / اسم الحساب:</span> {activeProfile.accountName}</p>}
                    {activeProfile.iban && <p className="col-span-1 sm:col-span-3 font-mono font-bold text-slate-900 break-all"><span className="text-slate-500 block font-sans font-normal text-[10px]">IBAN / رقم الآيبان:</span> {activeProfile.iban}</p>}
                  </div>
                </div>
              )}

              {/* Signatures & Footer */}
              <div className="mt-10 pt-4 border-t border-slate-200 flex justify-between text-[10px] text-slate-500 pb-2">
                <div>
                  <p className="font-bold text-slate-700">Cashier Signature / توقيع المحاسب</p>
                  <p className="mt-6 border-b border-dashed border-slate-400 w-32"></p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-slate-700">Customer Signature / توقيع العميل</p>
                  <p className="mt-6 border-b border-dashed border-slate-400 w-32 ml-auto"></p>
                </div>
              </div>

              <div className="mt-6 pt-3 border-t border-slate-100 text-center text-[9px] text-slate-400 font-semibold tracking-wider uppercase">
                Powered by I-Solutions
              </div>
            </div>
          )}
        </div>
      </div>
    </div>

      {isPreviewOpen && (
        <PrintPreviewDialog
          invoice={invoice}
          qrDataUrl={qrDataUrl}
          businessProfile={activeProfile}
          onClose={() => setIsPreviewOpen(false)}
        />
      )}
    </>
  );
};
