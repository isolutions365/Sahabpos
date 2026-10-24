import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Printer, Sliders, Layout, RefreshCw, ZoomIn, ZoomOut, CheckCircle, AlertTriangle } from 'lucide-react';
import { Invoice, BusinessProfile } from '../types';
import { INVOICE_UI_FLAGS } from '../config/uiFlags';

interface PrintPreviewDialogProps {
  invoice: Invoice;
  qrDataUrl: string;
  onClose: () => void;
  businessProfile?: BusinessProfile;
}

export type PaperSize = 'THERMAL_80MM' | 'THERMAL_58MM' | 'A4_PORTRAIT' | 'A4_LANDSCAPE' | 'A5_PORTRAIT';

export const PrintPreviewDialog: React.FC<PrintPreviewDialogProps> = ({ invoice, qrDataUrl, onClose, businessProfile }) => {
  const activeProfile = businessProfile || invoice?.businessProfile;
  const isManualBill = invoice?.invoiceNumber?.startsWith('INV-M-');
  const [paperSize, setPaperSize] = useState<PaperSize>(isManualBill ? 'A4_PORTRAIT' : 'THERMAL_80MM');
  const [marginSize, setMarginSize] = useState<'none' | 'minimum' | 'standard'>(isManualBill ? 'standard' : 'none');
  const [fontScale, setFontScale] = useState<number>(100); // percentage (80% - 120%)
  const [zoom, setZoom] = useState<number>(100); // preview scale on screen
  const [showMargins, setShowMargins] = useState<boolean>(false);
  const [highContrast, setHighContrast] = useState<boolean>(true);
  const [showSignatures, setShowSignatures] = useState<boolean>(true);
  const [thermalAlignment, setThermalAlignment] = useState<'center' | 'left' | 'full'>('center');
  const [thermalOffsetMm, setThermalOffsetMm] = useState<number>(0); // -5mm to +5mm fine adjustment

  const isThermal = paperSize === 'THERMAL_80MM' || paperSize === 'THERMAL_58MM';

  // Auto-select correct default paper size based on invoice configuration if applicable
  useEffect(() => {
    // If it's a credit sale, A4 is often preferred, but let's default to Thermal 80mm as starting point
  }, []);

  const getOrientation = (): 'portrait' | 'landscape' => {
    return paperSize === 'A4_LANDSCAPE' ? 'landscape' : 'portrait';
  };

  const handlePrint = () => {
    const images = document.querySelectorAll('#print-preview-modal-root img');
    const promises = Array.from(images).map((img) => {
      const htmlImg = img as HTMLImageElement;
      if (htmlImg.complete) {
        return Promise.resolve();
      }
      return new Promise<void>((resolve) => {
        htmlImg.onload = () => resolve();
        htmlImg.onerror = () => resolve();
      });
    });

    Promise.all(promises).then(() => {
      window.print();
    });
  };

  // Dynamic CSS injection for printer settings
  const getPrintStyles = () => {
    let sizeStyle = 'A4 portrait';
    let widthStyle = '210mm';
    let marginStyle = '15mm';

    if (paperSize === 'THERMAL_80MM') {
      sizeStyle = '72mm auto';
      marginStyle = '0';
      widthStyle = '66mm';
    } else if (paperSize === 'THERMAL_58MM') {
      sizeStyle = '58mm auto';
      marginStyle = '0';
      widthStyle = thermalAlignment === 'full' ? '54mm' : thermalAlignment === 'left' ? '50mm' : '52mm';
    } else if (paperSize === 'A4_PORTRAIT') {
      sizeStyle = 'A4 portrait';
      widthStyle = '210mm';
      marginStyle = marginSize === 'none' ? '0' : marginSize === 'minimum' ? '5mm' : '15mm';
    } else if (paperSize === 'A4_LANDSCAPE') {
      sizeStyle = 'A4 landscape';
      widthStyle = '297mm';
      marginStyle = marginSize === 'none' ? '0' : marginSize === 'minimum' ? '5mm' : '15mm';
    } else if (paperSize === 'A5_PORTRAIT') {
      sizeStyle = 'A5 portrait';
      widthStyle = '148mm';
      marginStyle = marginSize === 'none' ? '0' : marginSize === 'minimum' ? '5mm' : '10mm';
    }

    let sheetMarginCSS = '0 auto';
    if (isThermal) {
      if (thermalAlignment === 'left') {
        sheetMarginCSS = `0 0 0 ${Math.max(0, thermalOffsetMm)}mm`;
      } else if (thermalAlignment === 'full') {
        sheetMarginCSS = '0 auto';
      } else {
        if (thermalOffsetMm === 0) {
          sheetMarginCSS = '0 auto';
        } else if (thermalOffsetMm > 0) {
          sheetMarginCSS = `0 auto 0 calc(auto + ${thermalOffsetMm}mm)`;
        } else {
          sheetMarginCSS = `0 calc(auto + ${Math.abs(thermalOffsetMm)}mm) 0 auto`;
        }
      }
    }

    return `
      @media print {
        /* 1. @page { size: 72mm auto; margin: 0; } */
        @page {
          size: ${isThermal ? '72mm auto' : sizeStyle};
          margin: ${marginStyle} !important;
        }

        /* 1. html, body { width: 72mm; margin: 0; padding: 0; } */
        html, body {
          width: ${isThermal ? '72mm' : '100%'} !important;
          height: auto !important;
          margin: 0 !important;
          padding: 0 !important;
          background: #ffffff !important;
          background-color: #ffffff !important;
          color: #000000 !important;
          overflow: visible !important;
          -webkit-print-color-adjust: economy !important;
          print-color-adjust: economy !important;
        }

        /* Hide all page content except the print preview root */
        body > :not(#print-preview-modal-root) {
          display: none !important;
        }

        /* 6. Footer sirf ek baar render ho, duplicate hata do */
        #root,
        #printable-receipt,
        .no-print,
        .duplicate-footer {
          display: none !important;
          visibility: hidden !important;
          height: 0 !important;
          overflow: hidden !important;
        }

        /* Show the active preview root overlaying everything */
        #print-preview-modal-root {
          display: block !important;
          position: absolute !important;
          left: 0 !important;
          top: 0 !important;
          right: 0 !important;
          width: 100% !important;
          height: auto !important;
          min-height: 0 !important;
          background: #ffffff !important;
          background-color: #ffffff !important;
          margin: 0 !important;
          padding: 0 !important;
          overflow: visible !important;
          page-break-inside: avoid !important;
          break-inside: avoid !important;
        }

        /* Hide control panels, sidebars, buttons, and printable guide overlays */
        #print-preview-modal-root .print\\:hidden,
        #print-preview-modal-root button,
        #print-preview-modal-root .print-control-panel,
        #print-preview-modal-root .printable-boundary-guide,
        .printable-boundary-guide {
          display: none !important;
          visibility: hidden !important;
          opacity: 0 !important;
        }

        /* Neutralize ALL workspace wrappers around the sheet so zero padding or transforms affect the print */
        .preview-workspace-wrapper,
        .preview-canvas-outer,
        .preview-transform-node {
          display: block !important;
          position: static !important;
          width: 100% !important;
          max-width: 100% !important;
          margin: 0 !important;
          padding: 0 !important;
          border: none !important;
          box-shadow: none !important;
          background: transparent !important;
          transform: none !important;
          min-height: 0 !important;
          overflow: visible !important;
        }

        /* 2. Receipt container: width 66mm, margin 0 auto, padding 0 3mm, box-sizing: border-box, overflow: visible.
           3. Font: 'Courier New', monospace, font-size 11px, font-weight bold, line-height 1.5, color #000, -webkit-font-smoothing: none.
           8. Print mein sab background/box-shadow/filter hata do (color: #000, background: #fff) */
        /* A.2 & B.2 Receipt container: width var(--receipt-width, 58mm), margin 0 auto, padding 0 2mm */
        #print-preview-sheet-wrapper {
          display: block !important;
          width: ${isThermal ? 'var(--receipt-width, 58mm)' : widthStyle} !important;
          max-width: ${isThermal ? 'var(--receipt-width, 58mm)' : widthStyle} !important;
          min-width: 0 !important;
          height: auto !important;
          min-height: 0 !important;
          max-height: none !important;
          margin: ${isThermal ? '0 auto' : sheetMarginCSS} !important;
          padding: ${isThermal ? '0 1.5mm' : '0'} !important;
          border: none !important;
          box-shadow: none !important;
          filter: none !important;
          -webkit-filter: none !important;
          background: #ffffff !important;
          background-color: #ffffff !important;
          color: #000000 !important;
          transform: none !important;
          box-sizing: border-box !important;
          overflow: visible !important;
          page-break-inside: avoid !important;
          break-inside: avoid !important;
          page-break-after: avoid !important;
          break-after: avoid !important;
          font-family: ${isThermal ? "'Courier New', Courier, monospace !important" : 'inherit'};
          font-size: ${isThermal ? '10px !important' : 'inherit'};
          font-weight: ${isThermal ? 'bold !important' : 'inherit'};
          line-height: ${isThermal ? '1.12 !important' : 'inherit'};
          -webkit-font-smoothing: ${isThermal ? 'none !important' : 'inherit'};
          -webkit-print-color-adjust: economy !important;
          print-color-adjust: economy !important;
        }

        #print-preview-sheet-wrapper,
        #print-preview-sheet-wrapper * {
          color: #000000 !important;
          border-color: #000000 !important;
          background: #ffffff !important;
          background-color: #ffffff !important;
          background-image: none !important;
          box-shadow: none !important;
          text-shadow: none !important;
          filter: none !important;
          -webkit-filter: none !important;
          max-width: 100% !important;
          box-sizing: border-box !important;
          min-width: 0 !important;
          ${isThermal ? `
            font-family: 'Courier New', Courier, monospace !important;
            line-height: 1.12 !important;
            -webkit-font-smoothing: none !important;
          ` : ''}
          -webkit-print-color-adjust: economy !important;
          print-color-adjust: economy !important;
        }

        /* A.4 Company name */
        #print-preview-sheet-wrapper .receipt-company-name {
          text-align: center !important;
          white-space: normal !important;
          word-break: break-word !important;
          font-size: 12px !important;
          font-weight: bold !important;
          padding-bottom: 0.2mm !important;
          line-height: 1.15 !important;
          margin: 0 !important;
        }

        /* B.8 Header block */
        #print-preview-sheet-wrapper .receipt-header-line {
          padding-bottom: 0.2mm !important;
          line-height: 1.1 !important;
          word-break: break-word !important;
          margin: 0 !important;
        }
        #print-preview-sheet-wrapper .receipt-header-block {
          padding-bottom: 0.5mm !important;
          margin-bottom: 0.8mm !important;
        }
        #print-preview-sheet-wrapper .receipt-title-gap {
          padding-top: 0.5mm !important;
          margin-bottom: 0.8mm !important;
          line-height: 1.15 !important;
        }

        /* A.5 & B.3 Row layout: compact layout */
        #print-preview-sheet-wrapper .receipt-row,
        #print-preview-sheet-wrapper .flex.justify-between {
          display: flex !important;
          justify-content: space-between !important;
          align-items: center !important;
          gap: 1mm !important;
          width: 100% !important;
          line-height: 1.12 !important;
          padding: 0.2mm 0 !important;
          margin: 0 !important;
        }

        /* Values par white-space: nowrap; font-size 10px */
        #print-preview-sheet-wrapper .receipt-row-value,
        #print-preview-sheet-wrapper .whitespace-nowrap,
        #print-preview-sheet-wrapper .flex.justify-between > span:last-child {
          white-space: nowrap !important;
          flex-shrink: 0 !important;
          text-align: right !important;
          font-size: 10px !important;
          line-height: 1.12 !important;
        }

        /* B.5 Separators */
        #print-preview-sheet-wrapper .receipt-separator,
        #print-preview-sheet-wrapper .border-dashed {
          padding-top: 0.5mm !important;
          padding-bottom: 0.5mm !important;
          margin-bottom: 0.5mm !important;
        }

        /* B.6 Item qty row */
        #print-preview-sheet-wrapper .receipt-item-qty-row {
          padding-top: 0.2mm !important;
          padding-bottom: 0.4mm !important;
          line-height: 1.12 !important;
        }

        /* B.7 Totals */
        #print-preview-sheet-wrapper .receipt-total-row {
          padding: 0.3mm 0 !important;
          line-height: 1.12 !important;
        }
        #print-preview-sheet-wrapper .receipt-grand-total {
          padding: 0.8mm 0 0.5mm 0 !important;
          font-size: 11.5px !important;
          font-weight: 900 !important;
          line-height: 1.18 !important;
          border-top: 1.5px solid #000000 !important;
        }

        /* B.9 Arabic text: direction: rtl; unicode-bidi: plaintext */
        #print-preview-sheet-wrapper [dir="rtl"],
        #print-preview-sheet-wrapper .arabic-text {
          direction: rtl !important;
          unicode-bidi: plaintext !important;
          line-height: 1.2 !important;
          text-align: right !important;
        }

        /* A.7 QR code: width 28mm, margin 0.5mm auto */
        #print-preview-sheet-wrapper .receipt-qr-wrapper,
        #print-preview-sheet-wrapper .receipt-qr-wrapper img {
          max-width: 28mm !important;
          max-height: 28mm !important;
          width: 26mm !important;
          height: 26mm !important;
          margin: 0.5mm auto 1mm auto !important;
          display: block !important;
        }

        #print-preview-sheet-wrapper .bg-slate-50,
        #print-preview-sheet-wrapper .bg-indigo-50,
        #print-preview-sheet-wrapper .bg-slate-100 {
          background-color: transparent !important;
        }
      }

        #print-preview-sheet-wrapper .bg-slate-50,
        #print-preview-sheet-wrapper .bg-indigo-50,
        #print-preview-sheet-wrapper .bg-slate-100 {
          background-color: transparent !important;
        }
      }
    `;
  };

  // Calculate paper aspect ratio / size representation in pixels for the UI
  const getPaperDimensionsUI = () => {
    switch (paperSize) {
      case 'THERMAL_80MM':
        return { width: '300px', label: '80mm (3.15 in) Thermal POS', type: '80mm POS Roll' };
      case 'THERMAL_58MM':
        return { width: '230px', label: '58mm (2.28 in) Thermal Mini', type: '58mm Mini Roll' };
      case 'A4_PORTRAIT':
        return { width: '560px', aspectRatio: '1/1.414', label: 'A4 Portrait (210 x 297 mm)', type: 'Standard Sheet' };
      case 'A4_LANDSCAPE':
        return { width: '740px', aspectRatio: '1.414/1', label: 'A4 Landscape (297 x 210 mm)', type: 'Wide Sheet' };
      case 'A5_PORTRAIT':
        return { width: '420px', aspectRatio: '1/1.414', label: 'A5 Portrait (148 x 210 mm)', type: 'Compact Sheet' };
      default:
        return { width: '300px', label: 'Thermal 80mm' };
    }
  };

  const uiDim = getPaperDimensionsUI();

  return createPortal(
    <div
      id="print-preview-modal-root"
      className="fixed inset-0 z-[100] flex flex-col md:flex-row bg-slate-900/95 text-slate-100 overflow-hidden"
    >
      {/* Dynamic Print CSS Injector */}
      <style dangerouslySetInnerHTML={{ __html: getPrintStyles() }} />

      {/* LEFT SIDEBAR: Printer Settings Control Panel */}
      <div className="w-full md:w-80 bg-slate-950 border-r border-slate-800 p-5 flex flex-col justify-between overflow-y-auto shrink-0 print-control-panel print:hidden">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Printer className="w-5 h-5 text-indigo-400" />
              <div>
                <h3 className="font-bold text-sm text-slate-100">Print Setup Wizard</h3>
                <p className="text-[10px] text-slate-400">Configure page & device size</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <hr className="border-slate-800" />

          {/* Paper / Printer Size Selection */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300 block">Printer Size (طراز الطابعة / الحجم)</label>
            <div className="grid grid-cols-1 gap-2">
              {!isManualBill ? (
                <>
                  <button
                    onClick={() => {
                      setPaperSize('THERMAL_80MM');
                      setMarginSize('none');
                    }}
                    className={`p-2.5 rounded-xl border text-left transition-all text-xs flex flex-col ${
                      paperSize === 'THERMAL_80MM'
                        ? 'border-indigo-500 bg-indigo-950/40 text-indigo-300'
                        : 'border-slate-800 bg-slate-900/50 hover:bg-slate-900 text-slate-300'
                    }`}
                  >
                    <span className="font-bold">Thermal 80mm (إيصال نقاط بيع)</span>
                    <span className="text-[10px] text-slate-400">Standard POS / Receipt printers (Continuous roll)</span>
                  </button>

                  <button
                    onClick={() => {
                      setPaperSize('THERMAL_58MM');
                      setMarginSize('none');
                    }}
                    className={`p-2.5 rounded-xl border text-left transition-all text-xs flex flex-col ${
                      paperSize === 'THERMAL_58MM'
                        ? 'border-indigo-500 bg-indigo-950/40 text-indigo-300'
                        : 'border-slate-800 bg-slate-900/50 hover:bg-slate-900 text-slate-300'
                    }`}
                  >
                    <span className="font-bold">Thermal 58mm (إيصال صغير)</span>
                    <span className="text-[10px] text-slate-400">Compact Bluetooth belt-printers & mobile devices</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => {
                      setPaperSize('A4_PORTRAIT');
                      if (marginSize === 'none') setMarginSize('standard');
                    }}
                    className={`p-2.5 rounded-xl border text-left transition-all text-xs flex flex-col ${
                      paperSize === 'A4_PORTRAIT'
                        ? 'border-indigo-500 bg-indigo-950/40 text-indigo-300'
                        : 'border-slate-800 bg-slate-900/50 hover:bg-slate-900 text-slate-300'
                    }`}
                  >
                    <span className="font-bold">A4 Portrait (فاتورة ضريبية كاملة)</span>
                    <span className="text-[10px] text-slate-400">Standard desktop laser printer / PDF export</span>
                  </button>

                  <button
                    onClick={() => {
                      setPaperSize('A4_LANDSCAPE');
                      if (marginSize === 'none') setMarginSize('standard');
                    }}
                    className={`p-2.5 rounded-xl border text-left transition-all text-xs flex flex-col ${
                      paperSize === 'A4_LANDSCAPE'
                        ? 'border-indigo-500 bg-indigo-950/40 text-indigo-300'
                        : 'border-slate-800 bg-slate-900/50 hover:bg-slate-900 text-slate-300'
                    }`}
                  >
                    <span className="font-bold">A4 Landscape (فاتورة عرضية)</span>
                    <span className="text-[10px] text-slate-400">Wide-table layouts & landscape orientation printing</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Thermal Receipt Alignment & Hardware Calibration */}
          {isThermal && (
            <div className="space-y-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <Layout className="w-3.5 h-3.5 text-indigo-400" />
                  محاذاة الورق (Receipt Alignment)
                </label>
                <span className="text-[10px] text-indigo-400 font-bold font-mono">
                  {thermalAlignment === 'center' ? 'متوسط' : thermalAlignment === 'left' ? 'يسار 0mm' : 'عرض كامل'}
                </span>
              </div>

              {/* 3 Alignment Modes */}
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setThermalAlignment('center');
                    setThermalOffsetMm(0);
                  }}
                  className={`py-2 px-1 rounded-lg text-xs font-bold transition-all text-center flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                    thermalAlignment === 'center'
                      ? 'bg-indigo-600 text-white shadow-sm ring-1 ring-indigo-400'
                      : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300'
                  }`}
                >
                  <span>متوسط</span>
                  <span className="text-[9px] opacity-80 font-normal">Center</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setThermalAlignment('full');
                    setThermalOffsetMm(0);
                  }}
                  className={`py-2 px-1 rounded-lg text-xs font-bold transition-all text-center flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                    thermalAlignment === 'full'
                      ? 'bg-indigo-600 text-white shadow-sm ring-1 ring-indigo-400'
                      : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300'
                  }`}
                >
                  <span>عرض كامل</span>
                  <span className="text-[9px] opacity-80 font-normal">Full 100%</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setThermalAlignment('left');
                    setThermalOffsetMm(0);
                  }}
                  className={`py-2 px-1 rounded-lg text-xs font-bold transition-all text-center flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                    thermalAlignment === 'left'
                      ? 'bg-indigo-600 text-white shadow-sm ring-1 ring-indigo-400'
                      : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300'
                  }`}
                >
                  <span>محاذاة لليسار</span>
                  <span className="text-[9px] opacity-80 font-normal">Left 0mm</span>
                </button>
              </div>

              {/* Fine Offset Tuning */}
              <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
                <div className="flex justify-between items-center text-[10.5px]">
                  <span className="text-slate-400 font-medium">إزاحة دقيقة (Hardware Offset):</span>
                  <span className="font-mono font-bold text-indigo-400">
                    {thermalOffsetMm > 0 ? `+${thermalOffsetMm}mm يمين` : thermalOffsetMm < 0 ? `${thermalOffsetMm}mm يسار` : '0mm (مضبوط)'}
                  </span>
                </div>
                
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setThermalOffsetMm(Math.max(-5, thermalOffsetMm - 1))}
                    className="flex-1 py-1 px-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded text-[10px] font-bold transition-all cursor-pointer"
                    title="Nudge Left"
                  >
                    ◀ -1mm يسار
                  </button>
                  <button
                    type="button"
                    onClick={() => setThermalOffsetMm(0)}
                    disabled={thermalOffsetMm === 0}
                    className="py-1 px-2 bg-slate-800/50 hover:bg-slate-800 disabled:opacity-40 text-slate-400 hover:text-slate-200 rounded text-[10px] font-mono transition-all cursor-pointer"
                    title="Reset to 0mm"
                  >
                    Reset
                  </button>
                  <button
                    type="button"
                    onClick={() => setThermalOffsetMm(Math.min(5, thermalOffsetMm + 1))}
                    className="flex-1 py-1 px-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded text-[10px] font-bold transition-all cursor-pointer"
                    title="Nudge Right"
                  >
                    +1mm يمين ▶
                  </button>
                </div>
                <p className="text-[9.5px] text-slate-400 leading-tight">
                  إذا كان النص يميل لأحد الجوانب على الورق الحقيقي، استخدم هذه الأزرار لتحريكه وتثبيته في المنتصف بدقة تامة.
                </p>
              </div>
            </div>
          )}

          {/* Margins Selection (A4/A5 only) */}
          {(paperSize === 'A4_PORTRAIT' || paperSize === 'A4_LANDSCAPE' || paperSize === 'A5_PORTRAIT') && (
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 block">Print Margins (هوامش الصفحة)</label>
              <div className="grid grid-cols-3 gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
                <button
                  onClick={() => setMarginSize('none')}
                  className={`py-1 rounded text-[10.5px] font-bold ${
                    marginSize === 'none' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  None
                </button>
                <button
                  onClick={() => setMarginSize('minimum')}
                  className={`py-1 rounded text-[10.5px] font-bold ${
                    marginSize === 'minimum' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  5mm
                </button>
                <button
                  onClick={() => setMarginSize('standard')}
                  className={`py-1 rounded text-[10.5px] font-bold ${
                    marginSize === 'standard' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Standard
                </button>
              </div>
            </div>
          )}

          {/* Font & Content Scale */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-slate-400" />
                Receipt Text Scale (حجم الخط)
              </label>
              <span className="text-[10px] font-mono text-indigo-400 font-bold">{fontScale}%</span>
            </div>
            <input
              type="range"
              min="80"
              max="120"
              step="5"
              value={fontScale}
              onChange={(e) => setFontScale(Number(e.target.value))}
              className="w-full accent-indigo-500 h-1 bg-slate-800 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[9px] text-slate-500">
              <span>80% (Compact)</span>
              <span>100% (Normal)</span>
              <span>120% (Large)</span>
            </div>
          </div>

          {/* Toggles */}
          <div className="space-y-2 bg-slate-900/30 p-3 rounded-xl border border-slate-800/60 text-xs">
            <label className="font-bold text-[10.5px] text-slate-400 block mb-2 uppercase tracking-wide">Layout Enhancements</label>
            
            <label className="flex items-center gap-2 py-1 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showMargins}
                onChange={(e) => setShowMargins(e.target.checked)}
                className="rounded border-slate-800 text-indigo-500 focus:ring-0 focus:ring-offset-0 accent-indigo-500"
              />
              <span className="text-slate-300">Highlight margins / visual guides</span>
            </label>

            <label className="flex items-center gap-2 py-1 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={highContrast}
                onChange={(e) => setHighContrast(e.target.checked)}
                className="rounded border-slate-800 text-indigo-500 focus:ring-0 focus:ring-offset-0 accent-indigo-500"
              />
              <span className="text-slate-300">Thermal high-contrast (pure black text)</span>
            </label>

            {(paperSize === 'A4_PORTRAIT' || paperSize === 'A4_LANDSCAPE' || paperSize === 'A5_PORTRAIT') && (
              <label className="flex items-center gap-2 py-1 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showSignatures}
                  onChange={(e) => setShowSignatures(e.target.checked)}
                  className="rounded border-slate-800 text-indigo-500 focus:ring-0 focus:ring-offset-0 accent-indigo-500"
                />
                <span className="text-slate-300">Include signature blocks</span>
              </label>
            )}
          </div>

          {/* Calibration Alerts & Warnings */}
          <div className="bg-amber-950/30 border border-amber-900/60 p-3 rounded-xl text-[10px] leading-relaxed text-amber-300 space-y-1">
            <div className="flex items-center gap-1 font-bold">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              <span>Printer Alignment Tip</span>
            </div>
            <p>
              Ensure the browser print dialog margins match your settings. For Thermal printers, set margins to <strong className="underline">None</strong> and turn off "Headers/Footers" for continuous rolling printouts.
            </p>
          </div>
        </div>

        {/* Action Button Section */}
        <div className="pt-4 mt-4 border-t border-slate-800 space-y-2">
          <button
            onClick={handlePrint}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all text-xs cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            Proceed to Print / بدء الطباعة
          </button>
          <button
            onClick={onClose}
            className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-all text-xs font-semibold rounded-xl cursor-pointer"
          >
            Adjust Invoice Details
          </button>
        </div>
      </div>

      {/* RIGHT PREVIEW WORKSPACE: Live virtual layout canvas */}
      <div className="preview-workspace-wrapper flex-1 bg-slate-900 overflow-y-auto p-4 md:p-8 flex flex-col items-center print:p-0 print:m-0 print:bg-white print:block">
        {/* Workspace Top Bar (Zoom and scale stats) */}
        <div className="w-full max-w-4xl bg-slate-950/80 border border-slate-800 px-4 py-2.5 rounded-xl mb-6 flex items-center justify-between gap-3 text-xs print:hidden">
          <div className="flex items-center gap-2">
            <span className="inline-block px-2 py-0.5 rounded bg-indigo-950 text-indigo-400 border border-indigo-800 font-mono text-[10px] font-bold uppercase">
              {uiDim.type}
            </span>
            <span className="text-slate-300 font-medium font-sans">
              Paper size: <strong className="font-mono text-slate-100">{uiDim.label}</strong>
            </span>
          </div>

          <div className="flex items-center space-x-2 rtl:space-x-reverse">
            <button
              onClick={() => setZoom(Math.max(50, zoom - 10))}
              disabled={zoom <= 50}
              className="p-1.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 rounded text-slate-300 disabled:opacity-40 transition-all cursor-pointer"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] font-mono text-slate-400 font-bold w-9 text-center">{zoom}%</span>
            <button
              onClick={() => setZoom(Math.min(150, zoom + 10))}
              disabled={zoom >= 150}
              className="p-1.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 rounded text-slate-300 disabled:opacity-40 transition-all cursor-pointer"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoom(100)}
              className="px-2 py-1 text-[9px] bg-slate-900 border border-slate-800 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-200 font-bold transition-all cursor-pointer"
            >
              Reset
            </button>
          </div>
        </div>

        {/* Paper Container Canvas */}
        <div className="preview-canvas-outer flex-1 flex items-start justify-center w-full min-h-[400px] pb-40 print:p-0 print:m-0 print:min-h-0 print:block">
          <div
            style={{
              transform: `scale(${zoom / 100})`,
              transformOrigin: 'top center',
            }}
            className="preview-transform-node transition-transform duration-200 h-auto print:transform-none print:w-full print:block"
          >
            {/* The printable wrapper styled visually for setup feedback */}
            <div
              id="print-preview-sheet-wrapper"
              style={{
                width: isThermal 
                  ? (thermalAlignment === 'full' ? '312px' : thermalAlignment === 'left' ? '296px' : '304px')
                  : uiDim.width,
                fontSize: `${fontScale}%`,
                marginLeft: isThermal && thermalAlignment === 'left' ? `${Math.max(0, thermalOffsetMm * 3.78)}px` : undefined,
                transform: isThermal && thermalOffsetMm !== 0 && thermalAlignment === 'center' ? `translateX(${thermalOffsetMm * 3.78}px)` : undefined,
              }}
              className={`bg-white text-slate-900 font-sans shadow-2xl origin-top transition-all duration-150 relative h-auto min-h-0 ${
                showMargins ? 'border-2 border-indigo-500/40' : 'border border-slate-300'
              } ${highContrast ? 'text-slate-950 font-sans' : 'text-slate-800'}`}
            >
              {/* Optional Margins Highlight Guide (Screen Preview Only - Hidden on Print) */}
              {showMargins && (
                <div className="absolute inset-0 border border-dashed border-red-400/30 pointer-events-none rounded-none m-3 print:hidden printable-boundary-guide">
                  <span className="absolute left-1 top-1 text-[8px] font-mono text-red-500/50 print:hidden">Printable Boundary</span>
                </div>
              )}

              {/* RENDER THE CONTENT BASED ON THERMAL vs SHEET PROFILE */}
              {(paperSize === 'THERMAL_80MM' || paperSize === 'THERMAL_58MM') ? (
                /* THERMAL RECEIPT PREVIEW (80MM & 58MM) - OPTIMIZED FOR CRISP DARK BLACK 80MM THERMAL PRINTS */
                <div className={`receipt-thermal-container p-2 pb-4 print:p-0 print:px-[2mm] print:py-0 print:pb-2 print:w-[var(--receipt-width,58mm)] print:max-w-[var(--receipt-width,58mm)] print:min-w-0 print:box-border print:overflow-visible font-mono leading-tight text-black ${paperSize === 'THERMAL_58MM' ? 'text-[10.5px]' : 'text-[11px]'}`}>
                  {/* Business Header */}
                  <div className="receipt-header-block text-center border-b-2 border-dashed border-black pb-2 mb-[3mm]">
                    <h2 
                      dir="rtl"
                      className="receipt-company-name arabic-text font-sans font-black text-center text-black [word-break:normal] [overflow-wrap:break-word] [text-wrap:balance] max-w-full block mx-auto py-0.5 text-sm"
                    >
                      {(activeProfile?.businessNameAr || invoice.businessProfile?.businessNameAr)?.replace(/بقالة/g, 'تموينات')}
                    </h2>
                    <p className="receipt-company-name font-sans font-extrabold text-black mt-0.5">
                      {activeProfile?.businessName || invoice.businessProfile?.businessName}
                    </p>
                    <div className="mt-1 text-[10.5px] text-black font-sans font-bold leading-tight">
                      {(activeProfile?.crNumber || invoice.businessProfile?.crNumber) && (
                        <p className="receipt-header-line">CR #: {activeProfile?.crNumber || invoice.businessProfile?.crNumber}</p>
                      )}
                      {(activeProfile?.vatNumber || invoice.businessProfile?.vatNumber) && (
                        <p className="receipt-header-line">VAT #: {activeProfile?.vatNumber || invoice.businessProfile?.vatNumber}</p>
                      )}
                      {(activeProfile?.phone || invoice.businessProfile?.phone) && (
                        <p className="receipt-header-line">Phone: {activeProfile?.phone || invoice.businessProfile?.phone}</p>
                      )}
                      {(activeProfile?.address || invoice.businessProfile?.address) && (
                        <p className="receipt-header-line break-words">{activeProfile?.address || invoice.businessProfile?.address}</p>
                      )}
                    </div>
                  </div>

                  {/* Invoice Header */}
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

                  {/* Customer Block */}
                  {invoice.customer && (
                    <div className="receipt-separator border border-black p-2 mb-2 text-[10px] rounded font-sans space-y-0.5 text-black font-bold">
                      <div className="font-black text-black">Customer Details (العميل):</div>
                      <div className="font-extrabold text-black">{invoice.customer.name}</div>
                      {invoice.customer.customerNumber && (
                        <div>ID: {invoice.customer.customerNumber}</div>
                      )}
                      {invoice.customer.phone && (
                        <div>Phone: {invoice.customer.phone}</div>
                      )}
                      {invoice.customer.taxNumber && (
                        <div>VAT ID / الرقم الضريبي: {invoice.customer.taxNumber}</div>
                      )}
                      {invoice.customer.crNumber && (
                        <div>CR No / السجل التجاري: {invoice.customer.crNumber}</div>
                      )}
                    </div>
                  )}

                  {/* Line Items */}
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
                              : `${cartItem.quantity}x ${cartItem.unitPrice.toFixed(2)}`}
                          </span>
                          <span className="receipt-row-value font-black font-mono text-black text-right whitespace-nowrap shrink-0 text-[10.5px]">
                            {cartItem.lineTotal.toFixed(2)} {activeProfile?.currency || invoice.businessProfile.currency}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Financials Totals */}
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
                          alt="ZATCA Verification" 
                          className="w-[30mm] h-[30mm] max-w-[30mm] max-h-[30mm] mx-auto block"
                          style={{ imageRendering: 'pixelated' }} 
                        />
                      </div>
                    )}
                    <p className="receipt-qr-caption text-[10px] font-black text-black mt-2.5">Scan QR Code to Verify</p>
                    <p className="receipt-footer-subtext arabic-text text-[9px] font-bold text-black mt-1">فاتورة إلكترونية معتمدة بهيئة الزكاة والجمارك</p>
                    <p className="receipt-footer-subtext arabic-text text-[9px] font-bold text-black mt-1">Thank you for your visit / شكراً لزيارتكم</p>
                    <div className="text-[8px] text-black mt-1.5 font-bold tracking-wider uppercase text-center">
                      Powered by I-Solutions
                    </div>
                  </div>
                </div>
              ) : (
                /* SHEET FORMAT PREVIEW (A4 PORTRAIT / A4 LANDSCAPE / A5 PORTRAIT) */
                <div className={`p-8 pb-20 ${paperSize === 'A5_PORTRAIT' ? 'p-5 pb-16 text-[11px]' : 'text-xs'}`}>
                  {/* Header Banner */}
                  <div className="flex justify-between items-start border-b-2 border-indigo-700 pb-4 mb-5">
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
                          className="font-sans font-extrabold text-base sm:text-lg text-indigo-950 leading-snug [word-break:normal] [overflow-wrap:break-word] [text-wrap:balance]"
                        >
                          {invoice.businessProfile.businessNameAr?.replace(/بقالة/g, 'تموينات')}
                        </h1>
                        <p className="text-xs font-semibold text-slate-700">
                          {invoice.businessProfile.businessName}
                        </p>
                        <div className="mt-2 text-[10px] text-slate-600 space-y-0.5 font-sans">
                          {invoice.businessProfile.crNumber && (
                            <p><span className="font-semibold">CR No:</span> {invoice.businessProfile.crNumber}</p>
                          )}
                          {invoice.businessProfile.vatNumber && (
                            <p><span className="font-semibold">VAT No:</span> {invoice.businessProfile.vatNumber}</p>
                          )}
                          <p>{invoice.businessProfile.address} | Tel: {invoice.businessProfile.phone}</p>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="inline-block bg-indigo-50 border border-indigo-100 p-2.5 rounded-lg text-center">
                        <h2 className="text-xs font-black text-indigo-900 uppercase">
                          {invoice.customTitle || 'TAX INVOICE / فاتورة ضريبية'}
                        </h2>
                        <p className="text-xs font-mono font-bold text-slate-800 mt-1">
                          #{invoice.invoiceNumber}
                        </p>
                        <p className="text-[9.5px] text-slate-500 font-mono mt-0.5">
                          {new Date(invoice.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Customer and Summary Card */}
                  <div className="grid grid-cols-2 gap-4 mb-5">
                    <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg">
                      <h3 className="font-bold text-[9px] uppercase text-slate-500 mb-1.5 border-b pb-0.5">
                        Customer Info / بيانات العميل
                      </h3>
                      {invoice.customer ? (
                        <div className="space-y-0.5 text-[10.5px]">
                          <p className="font-bold text-slate-900">{invoice.customer.name}</p>
                          {invoice.customer.customerNumber && (
                            <p><span className="text-slate-500">Cust ID:</span> {invoice.customer.customerNumber}</p>
                          )}
                          {invoice.customer.phone && (
                            <p><span className="text-slate-500">Phone:</span> {invoice.customer.phone}</p>
                          )}
                          {invoice.customer.taxNumber && (
                            <p><span className="text-slate-500">VAT ID / الرقم الضريبي:</span> {invoice.customer.taxNumber}</p>
                          )}
                          {invoice.customer.crNumber && (
                            <p><span className="text-slate-500">CR No / السجل التجاري:</span> {invoice.customer.crNumber}</p>
                          )}
                        </div>
                      ) : (
                        <p className="text-slate-500 italic">Walk-In Customer (نقدي عام)</p>
                      )}
                    </div>

                    <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg">
                      <h3 className="font-bold text-[9px] uppercase text-slate-500 mb-1.5 border-b pb-0.5">
                        Invoice Details / ملخص
                      </h3>
                      <div className="space-y-0.5 text-[10.5px]">
                        <p><span className="text-slate-500">Date/Time:</span> {new Date(invoice.createdAt).toLocaleString()}</p>
                        <p>
                          <span className="text-slate-500">Method:</span>{' '}
                          <strong className="text-indigo-800">{invoice.paymentMethod}</strong>
                        </p>
                        <p>
                          <span className="text-slate-500">Status:</span>{' '}
                          <strong className={invoice.paymentMethod === 'CREDIT_BAQAYA' || invoice.paymentStatus === 'UNPAID' ? 'text-amber-700 font-extrabold' : 'text-indigo-700'}>{invoice.paymentMethod === 'CREDIT_BAQAYA' || invoice.paymentStatus === 'UNPAID' ? 'CREDIT' : 'PAID'}</strong>
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Line Items Table */}
                  <table className="w-full border-collapse mb-5 text-[10.5px]">
                    <thead>
                      <tr className="bg-slate-900 text-white font-bold text-left">
                        <th className="p-2 rounded-tl">#</th>
                        <th className="p-2">Item Description / الصنف</th>
                        <th className="p-2 text-center">Qty / الوزن</th>
                        <th className="p-2 text-right">Price</th>
                        <th className="p-2 text-right rounded-tr">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 border-b border-slate-200">
                      {invoice.items.map((cartItem, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="p-2 text-slate-400">{idx + 1}</td>
                          <td className="p-2">
                            <p className="font-bold text-slate-900">{cartItem.item.productNameEnglish || cartItem.item.name}</p>
                            {(cartItem.item.productNameArabic || cartItem.item.nameAr) && (
                              <p className="text-[11px] font-bold text-indigo-800" dir="rtl">
                                {cartItem.item.productNameArabic || cartItem.item.nameAr}
                              </p>
                            )}
                            {cartItem.item.size && <p className="text-[9px] text-slate-500">Size: {cartItem.item.size}</p>}
                          </td>
                          <td className="p-2 text-center font-semibold">
                            {cartItem.weight ? `${cartItem.weight} kg` : cartItem.quantity}
                          </td>
                          <td className="p-2 text-right">{cartItem.unitPrice.toFixed(2)}</td>
                          <td className="p-2 text-right font-bold text-slate-900">
                            {cartItem.lineTotal.toFixed(2)} {invoice.businessProfile.currency}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* ZATCA QR & Financial Calculation */}
                  <div className="flex flex-row justify-between items-start gap-4">
                    <div className="flex items-center gap-3 border border-slate-200 p-2.5 rounded-lg bg-slate-50 max-w-sm">
                      {qrDataUrl && (
                        <img src={qrDataUrl} alt="ZATCA Verification" className="w-16 h-16 rounded border border-slate-200 shrink-0" />
                      )}
                      <div>
                        <p className="font-bold text-[10px] text-slate-900">ZATCA e-Invoice Verification</p>
                        <p className="text-[9px] text-slate-600 leading-tight mt-0.5">
                          Approved electronic invoice meeting ZATCA requirement parameters in Kingdom of Saudi Arabia.
                        </p>
                      </div>
                    </div>

                    <div className="w-56 space-y-1.5 bg-slate-50 border border-slate-200 p-3 rounded-lg">
                      <div className="flex justify-between text-slate-600 text-[10px]">
                        <span>Subtotal (Excl. VAT):</span>
                        <span className="font-semibold">{invoice.subtotal.toFixed(2)} {invoice.businessProfile.currency}</span>
                      </div>
                      <div className="flex justify-between text-slate-600 text-[10px]">
                        <span>Total VAT ({invoice.businessProfile.defaultVatRate || 15}%):</span>
                        <span className="font-semibold">{invoice.vatTotal.toFixed(2)} {invoice.businessProfile.currency}</span>
                      </div>
                      <div className="flex justify-between text-[11px] font-black text-slate-950 pt-1.5 border-t border-slate-200">
                        <span>GRAND TOTAL:</span>
                        <span className="text-indigo-700">{invoice.grandTotal.toFixed(2)} {invoice.businessProfile.currency}</span>
                      </div>
                    </div>
                  </div>

                  {/* Merchant Bank Details Footer */}
                  {(invoice.businessProfile.bankName || invoice.businessProfile.iban) && (
                    <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 space-y-1">
                      <p className="font-bold text-[#4338CA]">Merchant Bank Details / بيانات الحساب البنكي للتاجر</p>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] font-medium">
                        {invoice.businessProfile.bankName && <p><span className="text-slate-500 block text-[10px]">Bank Name / اسم البنك:</span> {invoice.businessProfile.bankName}</p>}
                        {invoice.businessProfile.accountName && <p><span className="text-slate-500 block text-[10px]">Account Name / اسم الحساب:</span> {invoice.businessProfile.accountName}</p>}
                        {invoice.businessProfile.iban && <p className="col-span-1 sm:col-span-3 font-mono font-bold text-slate-900 break-all"><span className="text-slate-500 block font-sans font-normal text-[10px]">IBAN / رقم الآيبان:</span> {invoice.businessProfile.iban}</p>}
                      </div>
                    </div>
                  )}

                  {/* Handover Signatures */}
                  {showSignatures && (
                    <div className="mt-8 pt-4 border-t border-slate-100 flex justify-between text-[9px] text-slate-500">
                      <div>
                        <p className="font-bold text-slate-700">Cashier Signature / توقيع المحاسب</p>
                        <p className="mt-5 border-b border-dashed border-slate-300 w-28"></p>
                      </div>
                      <div>
                        <p className="font-bold text-slate-700">Customer Signature / توقيع العميل</p>
                        <p className="mt-5 border-b border-dashed border-slate-300 w-28"></p>
                      </div>
                    </div>
                  )}

                  <div className="mt-8 pt-4 border-t border-slate-100 text-center text-[9px] text-slate-400 font-semibold tracking-wider uppercase">
                    Powered by I-Solutions
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
