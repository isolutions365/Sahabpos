import React, { useState, useEffect } from 'react';
import {
  Monitor,
  ScanBarcode,
  Receipt,
  Package,
  TrendingUp,
  Zap,
  Boxes,
  Users,
  BarChart3,
  ShieldCheck,
  Store,
  CheckCircle2,
} from 'lucide-react';

interface SplashScreenProps {
  isAppReady: boolean;
  onFinish: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ isAppReady, onFinish }) => {
  const [phase, setPhase] = useState<number>(0);
  const [progress, setProgress] = useState<number>(0);
  const [isFadingOut, setIsFadingOut] = useState<boolean>(false);
  const [reducedMotion, setReducedMotion] = useState<boolean>(false);

  // Check prefers-reduced-motion
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mediaQuery.matches);
  }, []);

  // Timeline driver for animations
  useEffect(() => {
    if (reducedMotion) {
      const quickProgress = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            clearInterval(quickProgress);
            return 100;
          }
          return prev + 25;
        });
      }, 80);

      const timeout = setTimeout(() => {
        setIsFadingOut(true);
        setTimeout(onFinish, 300);
      }, 1000);

      return () => {
        clearInterval(quickProgress);
        clearTimeout(timeout);
      };
    }

    // Standard Animation Timeline (0 to 5 seconds)
    // 0-1s: Clean light background fades in (phase 0)
    // 1-2s: I-SOLUTIONS logo smoothly appears and slightly scales (phase 1 at 800ms)
    // 2-3s: Brand text appears (phase 2 at 1800ms)
    // 3-4s: Subtle POS elements & feature labels appear (phase 3 at 2700ms & phase 4 at 3500ms)
    // 4-5s: Loading progress finishes and transitions (phase 5 at 4500ms)
    const t1 = setTimeout(() => setPhase(1), 800);
    const t2 = setTimeout(() => setPhase(2), 1800);
    const t3 = setTimeout(() => setPhase(3), 2700);
    const t4 = setTimeout(() => setPhase(4), 3500);
    const t5 = setTimeout(() => setPhase(5), 4500);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearTimeout(t5);
    };
  }, [reducedMotion, onFinish]);

  // Progress Bar Animation (0% -> 100%)
  useEffect(() => {
    if (reducedMotion) return;

    const interval = setInterval(() => {
      setProgress((prev) => {
        let next = prev + 1.25;
        if (next > 95 && !isAppReady) {
          return 95;
        }
        if (next >= 100) {
          clearInterval(interval);
          return 100;
        }
        return next;
      });
    }, 40);

    return () => clearInterval(interval);
  }, [isAppReady, reducedMotion]);

  // Handle exit when progress reaches 100% and phase >= 5
  useEffect(() => {
    if (progress >= 100 && (phase >= 5 || reducedMotion) && !isFadingOut) {
      const exitTimeout = setTimeout(() => {
        setIsFadingOut(true);
        setTimeout(onFinish, 500);
      }, 250);
      return () => clearTimeout(exitTimeout);
    }
  }, [progress, phase, isFadingOut, onFinish, reducedMotion]);

  const features = [
    { icon: Zap, label: 'FAST BILLING' },
    { icon: Boxes, label: 'INVENTORY MANAGEMENT' },
    { icon: Users, label: 'CUSTOMER MANAGEMENT' },
    { icon: BarChart3, label: 'SALES REPORTS' },
    { icon: ShieldCheck, label: 'SECURE & RELIABLE' },
  ];

  return (
    <div
      className={`fixed inset-0 z-[9999] overflow-hidden bg-slate-50 text-slate-900 font-sans select-none transition-all duration-700 ease-out flex flex-col justify-between ${
        isFadingOut ? 'opacity-0 scale-102 pointer-events-none' : 'opacity-100 scale-100'
      }`}
    >
      {/* SUBTLE CLEAN BACKGROUND GRADIENTS & WATERMARKS */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Soft Radial Ambient Lights */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-indigo-50/40 opacity-90" />
        <div className="absolute -top-32 -left-32 w-[500px] h-[500px] bg-indigo-100/50 rounded-full blur-[100px]" />
        <div className="absolute -bottom-32 -right-32 w-[500px] h-[500px] bg-slate-200/50 rounded-full blur-[100px]" />

        {/* Subtle Professional Grid Pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(to right, #0F172A 1px, transparent 1px), linear-gradient(to bottom, #0F172A 1px, transparent 1px)`,
            backgroundSize: '48px 48px',
          }}
        />

        {/* SUBTLE BACKGROUND POS GRAPHICS (Light Floating Watermarks) */}
        <div className="absolute inset-0 flex items-center justify-between px-8 sm:px-16 pointer-events-none opacity-20">
          <div className="hidden lg:flex flex-col gap-12 text-indigo-800 transform -translate-y-4">
            <div className="p-4 bg-white/80 rounded-2xl shadow-sm border border-indigo-100 flex items-center gap-3">
              <Monitor className="w-6 h-6 text-[#4338CA]" />
              <span className="text-xs font-bold tracking-wider">POS Terminal</span>
            </div>
            <div className="p-4 bg-white/80 rounded-2xl shadow-sm border border-indigo-100 flex items-center gap-3">
              <ScanBarcode className="w-6 h-6 text-[#4338CA]" />
              <span className="text-xs font-bold tracking-wider">Barcode Scanner</span>
            </div>
          </div>

          <div className="hidden lg:flex flex-col gap-12 text-slate-800 transform translate-y-4">
            <div className="p-4 bg-white/80 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-3">
              <Receipt className="w-6 h-6 text-slate-700" />
              <span className="text-xs font-bold tracking-wider">Thermal Receipt</span>
            </div>
            <div className="p-4 bg-white/80 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-3">
              <TrendingUp className="w-6 h-6 text-slate-700" />
              <span className="text-xs font-bold tracking-wider">Sales Analytics</span>
            </div>
          </div>
        </div>
      </div>

      {/* TOP HEADER BRANDING */}
      <div className="relative z-10 w-full px-6 py-4 flex items-center justify-between border-b border-slate-200/60 bg-white/60 backdrop-blur-md">
        <div className="flex items-center space-x-2.5 rtl:space-x-reverse">
          <div className="w-2.5 h-2.5 rounded-full bg-[#4338CA] animate-pulse" />
          <span className="text-[11px] font-mono tracking-widest text-slate-600 uppercase font-bold">
            I-SOLUTIONS POS • SYSTEM READY
          </span>
        </div>
        <div className="text-[11px] font-mono font-bold text-[#4338CA] bg-indigo-50 px-3 py-0.5 rounded-full border border-indigo-200/80">
          ENTERPRISE EDITION
        </div>
      </div>

      {/* CENTER CONTENT CONTAINER */}
      <div className="relative z-10 my-auto w-full max-w-4xl mx-auto px-4 sm:px-6 flex flex-col items-center justify-center text-center space-y-7">
        
        {/* 1. I-SOLUTIONS LOGO EMBLEM (0-2s Reveal with smooth scale & soft 3D depth) */}
        <div className="py-2">
          <div
            className={`relative transition-all duration-1000 ease-out transform ${
              phase >= 1
                ? 'scale-100 opacity-100 translate-y-0'
                : 'scale-85 opacity-0 translate-y-6'
            }`}
          >
            {/* Soft Professional Glow behind logo */}
            <div className="absolute -inset-4 bg-gradient-to-r from-indigo-500/20 via-[#4338CA]/30 to-slate-900/10 rounded-3xl blur-2xl opacity-60" />

            {/* Crisp Logo Badge Container */}
            <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-white p-2.5 shadow-[0_20px_50px_rgba(67,56,202,0.18)] border border-indigo-100/80 flex items-center justify-center">
              <div className="w-full h-full rounded-2xl bg-gradient-to-br from-[#4338CA] via-[#3730A3] to-[#1E1B4B] flex items-center justify-center relative overflow-hidden shadow-inner">
                {/* Subtle sheen highlight */}
                <div className="absolute -top-12 -left-12 w-24 h-24 bg-white/20 rounded-full blur-md" />
                
                {/* SVG I-SOLUTIONS Emblem Mark */}
                <div className="flex flex-col items-center justify-center text-white">
                  <span className="font-black text-3xl sm:text-4xl tracking-tighter leading-none drop-shadow-md">
                    I<span className="text-indigo-400 font-extrabold">-</span>S
                  </span>
                  <span className="text-[8px] sm:text-[9px] font-mono tracking-widest font-bold opacity-90 uppercase mt-0.5">
                    SOLUTIONS
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 2. BRAND TYPOGRAPHY REVEAL (2-3s) */}
        <div className="space-y-2">
          {/* Main Brand Title */}
          <h1
            className={`text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-slate-900 transition-all duration-700 ease-out transform ${
              phase >= 2
                ? 'opacity-100 translate-y-0'
                : 'opacity-0 translate-y-4'
            }`}
          >
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-slate-900 via-slate-800 to-[#4338CA]">
              I-SOLUTIONS
            </span>
          </h1>

          {/* Tagline 1 */}
          <div
            className={`transition-all duration-700 delay-100 ease-out transform ${
              phase >= 2
                ? 'opacity-100 translate-y-0'
                : 'opacity-0 translate-y-3'
            }`}
          >
            <p className="text-xs sm:text-sm font-extrabold tracking-[0.22em] text-[#4338CA] uppercase">
              SMART POS • SMART BUSINESS
            </p>
          </div>

          {/* Tagline 2 */}
          <div
            className={`transition-all duration-700 delay-200 ease-out transform ${
              phase >= 2
                ? 'opacity-100 translate-y-0'
                : 'opacity-0 translate-y-2'
            }`}
          >
            <p className="text-[11px] sm:text-xs font-mono tracking-widest text-slate-500 uppercase font-bold">
              POINT OF SALE SYSTEM
            </p>
          </div>
        </div>

        {/* 3. SUBTLE POS HARDWARE CARDS (Phase 3) */}
        <div
          className={`w-full transition-all duration-700 ease-out transform ${
            phase >= 3
              ? 'opacity-100 translate-y-0 scale-100'
              : 'opacity-0 translate-y-4 scale-95'
          }`}
        >
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 max-w-xl mx-auto my-1">
            <div className="bg-white/90 border border-slate-200/80 rounded-xl p-2.5 shadow-sm flex flex-col items-center justify-center space-y-1">
              <Monitor className="w-5 h-5 text-[#4338CA]" />
              <span className="text-[10px] sm:text-xs font-bold text-slate-700">POS Terminal</span>
            </div>

            <div className="bg-white/90 border border-slate-200/80 rounded-xl p-2.5 shadow-sm flex flex-col items-center justify-center space-y-1">
              <ScanBarcode className="w-5 h-5 text-[#4338CA]" />
              <span className="text-[10px] sm:text-xs font-bold text-slate-700">Barcode Scanner</span>
            </div>

            <div className="bg-white/90 border border-slate-200/80 rounded-xl p-2.5 shadow-sm flex flex-col items-center justify-center space-y-1">
              <Receipt className="w-5 h-5 text-[#4338CA]" />
              <span className="text-[10px] sm:text-xs font-bold text-slate-700">Thermal Printer</span>
            </div>

            <div className="bg-white/90 border border-slate-200/80 rounded-xl p-2.5 shadow-sm flex flex-col items-center justify-center space-y-1">
              <Package className="w-5 h-5 text-[#4338CA]" />
              <span className="text-[10px] sm:text-xs font-bold text-slate-700">Inventory Sync</span>
            </div>
          </div>
        </div>

        {/* 4. FEATURE BADGES REVEAL (Phase 4 - 3.5s) */}
        <div
          className={`w-full transition-all duration-700 ease-out transform ${
            phase >= 4
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 translate-y-3'
          }`}
        >
          <div className="flex flex-wrap items-center justify-center gap-2 max-w-2xl mx-auto">
            {features.map((feat) => {
              const IconComp = feat.icon;
              return (
                <div
                  key={feat.label}
                  className="flex items-center space-x-1.5 rtl:space-x-reverse bg-white border border-indigo-100/90 px-3 py-1 rounded-full text-[10px] sm:text-[11px] font-bold text-slate-700 shadow-sm"
                >
                  <IconComp className="w-3.5 h-3.5 text-[#4338CA]" />
                  <span>{feat.label}</span>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* FOOTER & PROGRESS BAR AREA (4-5s) */}
      <div className="relative z-10 w-full max-w-md mx-auto px-6 pb-8 space-y-2.5">
        <div className="flex items-center justify-between text-xs font-mono text-slate-600 font-bold">
          <span className="flex items-center space-x-2 rtl:space-x-reverse">
            <span className="w-2 h-2 rounded-full bg-[#4338CA] animate-ping" />
            <span>Loading I-SOLUTIONS POS...</span>
          </span>
          <span className="text-[#4338CA] font-extrabold">{Math.round(progress)}%</span>
        </div>

        <div className="w-full h-2.5 bg-slate-200/80 rounded-full overflow-hidden p-0.5 border border-slate-300/60 shadow-inner">
          <div
            className="h-full bg-gradient-to-r from-[#4338CA] via-indigo-600 to-violet-500 rounded-full transition-all duration-150 ease-out shadow-sm"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="text-center pt-2 text-[10px] font-mono text-slate-400 tracking-wider">
          I-SOLUTIONS POS SYSTEM • Version 1.0.0 • All rights reserved
        </div>
      </div>

    </div>
  );
};
