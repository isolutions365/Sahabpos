import React, { useState } from 'react';
import { Download, Smartphone, X, Check } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already installed, hide the button
  if (isInstalled) {
    return null;
  }

  // Desktop / Android / Chromium flow
  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="flex items-center space-x-1.5 rtl:space-x-reverse px-2.5 py-1.5 bg-amber-400 hover:bg-amber-300 active:bg-amber-500 text-slate-950 rounded-lg text-xs font-bold transition-all shadow-sm border border-amber-500 cursor-pointer animate-pulse"
        title="Install Waseela POS Application"
      >
        <Download className="w-3.5 h-3.5" />
        <span>Install App / تثبيت التطبيق</span>
      </button>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center space-x-1.5 rtl:space-x-reverse px-2.5 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-lg text-xs font-bold transition-all shadow-sm border border-amber-500 cursor-pointer"
          title="Install on iPhone / iPad"
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>Install / تثبيت</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
            <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl text-slate-900 border border-slate-100">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center space-x-2 rtl:space-x-reverse">
                  <div className="w-8 h-8 rounded-lg bg-[#4338CA] text-white flex items-center justify-center font-bold">
                    S
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Install Sahaab POS</h3>
                    <p className="text-[11px] text-slate-500">تثبيت تطبيق سحاب للمبيعات على iPhone / iPad</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mt-4 space-y-3 text-xs text-slate-700">
                <div className="flex items-start space-x-3 rtl:space-x-reverse bg-indigo-50 p-3 rounded-xl border border-indigo-100">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#4338CA] text-white font-bold text-xs">1</span>
                  <p>
                    Tap the <strong>Share</strong> icon (
                    <span className="inline-block px-1 bg-slate-200 rounded font-mono text-[10px]">⎋</span> /
                    <span className="inline-block px-1 bg-slate-200 rounded font-mono text-[10px]">مشاركة</span>) in the Safari toolbar.
                  </p>
                </div>

                <div className="flex items-start space-x-3 rtl:space-x-reverse bg-indigo-50 p-3 rounded-xl border border-indigo-100">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#4338CA] text-white font-bold text-xs">2</span>
                  <p>
                    Scroll down and tap <strong>Add to Home Screen</strong> (
                    <span className="inline-block px-1 bg-slate-200 rounded font-mono text-[10px]">الإضافة إلى الشاشة الرئيسية</span>).
                  </p>
                </div>

                <div className="flex items-start space-x-3 rtl:space-x-reverse bg-indigo-50 p-3 rounded-xl border border-indigo-100">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#4338CA] text-white font-bold text-xs">3</span>
                  <p>
                    Tap <strong>Add</strong> on the top right.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full rounded-xl bg-[#4338CA] py-2.5 text-xs font-bold text-white shadow hover:bg-[#3730A3] transition cursor-pointer"
              >
                Got it / فهمت ذلك
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
