import React from 'react';
import { Invoice, BusinessProfile } from '../types';

interface ThermalReceiptProps {
  invoice: Invoice;
  businessProfile?: BusinessProfile;
  qrDataUrl?: string;
}

export const ThermalReceipt: React.FC<ThermalReceiptProps> = ({ invoice, businessProfile, qrDataUrl }) => {
  const activeProfile = businessProfile || invoice.businessProfile;

  return (
    <div
      id="printable-receipt"
      className="bg-white p-2 pb-3 text-black border border-slate-300 shadow-md rounded-none w-full max-w-[300px] font-mono text-[10.5px] leading-tight print:shadow-none print:border-none print:w-[var(--receipt-width,58mm)] print:max-w-[var(--receipt-width,58mm)] print:min-w-0 print:p-0 print:px-[1.5mm] print:py-0 print:m-0 print:mx-auto print:box-border print:overflow-visible print:pb-1"
    >
      {/* Cancelled Banner if applicable */}
      {invoice.invoiceStatus === 'Cancelled' && (
        <div className="bg-rose-600 text-white font-extrabold text-center py-0.5 px-1 rounded mb-1 text-[10px] uppercase">
          *** CANCELLED / ملغاة ***
        </div>
      )}

      {/* Header Block */}
      <div className="receipt-header-block text-center border-b-2 border-dashed border-black pb-1 mb-[1.5mm]">
        <h2 
          dir="rtl"
          className="receipt-company-name arabic-text font-sans font-black text-xs text-center leading-tight text-black [word-break:normal] [overflow-wrap:break-word] [text-wrap:balance] max-w-full block mx-auto py-0.2"
        >
          {(activeProfile?.businessNameAr || invoice.businessProfile.businessNameAr)?.replace(/بقالة/g, 'تموينات')}
        </h2>
        <p className="receipt-company-name font-sans font-extrabold text-black text-[11px] mt-0.2 leading-tight">
          {activeProfile?.businessName || invoice.businessProfile.businessName}
        </p>
        <div className="mt-0.5 text-[10px] text-black font-sans font-bold leading-tight">
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
      <div className="receipt-separator border-b-2 border-dashed border-black pb-1 mb-1 text-[10.5px] font-bold text-black">
        <div className="receipt-title-gap text-center font-black uppercase underline mb-[1mm] text-[11px] text-black tracking-wide">
          {invoice.customTitle || 'SIMPLIFIED TAX INVOICE / فاتورة ضريبية مبسطة'}
        </div>
        <div className="receipt-row flex justify-between items-center text-black leading-tight py-0.2">
          <span className="font-bold shrink-0 text-left">Invoice #:</span>
          <span className="receipt-row-value font-black text-black font-mono text-right whitespace-nowrap shrink-0 text-[10px]">{invoice.invoiceNumber}</span>
        </div>
        <div className="receipt-row flex justify-between items-center text-black leading-tight py-0.2">
          <span className="font-bold shrink-0 text-left">Date:</span>
          <span className="receipt-row-value font-bold text-black text-right whitespace-nowrap shrink-0 text-[10px]">
            {new Date(invoice.createdAt).toLocaleDateString()}
          </span>
        </div>
        <div className="receipt-row flex justify-between items-center text-black leading-tight py-0.2">
          <span className="font-bold shrink-0 text-left">Time:</span>
          <span className="receipt-row-value font-bold text-black text-right whitespace-nowrap shrink-0 text-[10px]">
            {new Date(invoice.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        </div>
        <div className="receipt-row flex justify-between items-center text-black leading-tight py-0.2">
          <span className="font-bold shrink-0 text-left">Payment:</span>
          <span className="receipt-row-value font-black text-black text-right whitespace-nowrap shrink-0 text-[10px]">{invoice.paymentMethod}</span>
        </div>
      </div>

      {/* Customer Info (if attached) */}
      {invoice.customer && (
        <div className="receipt-separator border border-black p-1 mb-1 text-[9.5px] rounded space-y-0.2 font-sans text-black font-bold">
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
      <div className="receipt-separator border-b-2 border-dashed border-black pb-1 mb-1">
        <div className="grid grid-cols-12 font-black text-[10px] uppercase border-y-2 border-black py-0.2 mb-0.5 text-black">
          <span className="col-span-6 text-left">Item</span>
          <span className="col-span-2 text-center">Qty</span>
          <span className="col-span-4 text-right">Total</span>
        </div>

        {invoice.items.map((cartItem, idx) => (
          <div key={idx} className="py-0.2 border-b border-black/30 border-dashed last:border-0 text-[10.5px] text-black">
            <div className="font-black text-black font-sans leading-tight break-words text-left">
              {cartItem.item.productNameEnglish || cartItem.item.name}
            </div>
            {(cartItem.item.productNameArabic || cartItem.item.nameAr) && (
              <div className="arabic-text text-[10px] text-black font-extrabold font-sans text-right mt-0.2 break-words" dir="rtl">
                {cartItem.item.productNameArabic || cartItem.item.nameAr}
              </div>
            )}
            <div className="receipt-row receipt-item-qty-row flex justify-between items-center text-black font-bold text-[10px] mt-0.2 leading-tight">
              <span className="text-left">
                {cartItem.weight
                  ? `${cartItem.weight}kg x ${cartItem.unitPrice.toFixed(2)}`
                  : `${cartItem.quantity} x ${cartItem.unitPrice.toFixed(2)}`}
              </span>
              <span className="receipt-row-value font-black font-mono text-black text-right whitespace-nowrap shrink-0 text-[10px]">
                {cartItem.lineTotal.toFixed(2)} {activeProfile?.currency || invoice.businessProfile.currency}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Financial Totals */}
      <div className="receipt-separator border-b-2 border-dashed border-black pb-1 mb-1 text-[10.5px] font-sans text-black">
        <div className="receipt-row receipt-total-row flex justify-between items-center font-bold text-black leading-tight py-0.2">
          <span className="text-left">Subtotal (غير شامل):</span>
          <span className="receipt-row-value font-black font-mono text-right whitespace-nowrap shrink-0 text-[10px]">{invoice.subtotal.toFixed(2)} {activeProfile?.currency || invoice.businessProfile.currency}</span>
        </div>
        <div className="receipt-row receipt-total-row flex justify-between items-center font-bold text-black leading-tight py-0.2">
          <span className="text-left">VAT ({activeProfile?.defaultVatRate ?? invoice.businessProfile.defaultVatRate ?? 15}%):</span>
          <span className="receipt-row-value font-black font-mono text-right whitespace-nowrap shrink-0 text-[10px]">{invoice.vatTotal.toFixed(2)} {activeProfile?.currency || invoice.businessProfile.currency}</span>
        </div>
        <div className="receipt-row receipt-grand-total flex justify-between items-center font-black text-[11.5px] text-black pt-0.5 border-t-2 border-black leading-tight">
          <span className="text-left">GRAND TOTAL (الإجمالي):</span>
          <span className="receipt-row-value font-black font-mono text-right whitespace-nowrap shrink-0 text-[12px]">{invoice.grandTotal.toFixed(2)} {activeProfile?.currency || invoice.businessProfile.currency}</span>
        </div>
      </div>

      {/* Single Print Footer */}
      <div className="receipt-single-footer text-center pt-1 font-sans text-black">
        {qrDataUrl && (
          <div className="receipt-qr-wrapper inline-block p-0.5 bg-white border border-black rounded mx-auto mb-1 max-w-[28mm]">
            <img 
              src={qrDataUrl} 
              alt="Invoice QR Code" 
              className="w-[26mm] h-[26mm] max-w-[26mm] max-h-[26mm] mx-auto block" 
              style={{ imageRendering: 'pixelated' }}
            />
          </div>
        )}
        <p className="receipt-qr-caption text-[9.5px] font-black text-black mt-1">Scan QR code to verify invoice</p>
        <p className="receipt-footer-subtext arabic-text text-[8.5px] font-bold text-black mt-0.5">فاتورة إلكترونية معتمدة بهيئة الزكاة والجمارك</p>
        <p className="receipt-footer-subtext arabic-text text-[8.5px] font-bold text-black mt-0.5">Thank you for your visit / شكراً لزيارتكم</p>
        <div className="text-[7.5px] text-black mt-1 font-bold tracking-wider uppercase text-center">
          Powered by I-Solutions
        </div>
      </div>
    </div>
  );
};
