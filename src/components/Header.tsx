import React, { useState, useEffect } from 'react';
import { ShoppingCart, Package, Users, Receipt, Settings, ShieldCheck, Store, LogOut, FileText, FileSpreadsheet, KeyRound } from 'lucide-react';
import { UserRole, BusinessProfile } from '../types';
import { PWAInstallButton } from './PWAInstallButton';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  userRole: UserRole;
  businessProfile: BusinessProfile;
  cartCount: number;
  pendingRequestsCount?: number;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  userRole,
  businessProfile,
  cartCount,
  pendingRequestsCount = 0,
  onLogout,
}) => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const hijriFormatter = new Intl.DateTimeFormat('en-SA-u-ca-islamic', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const hijriStr = hijriFormatter.format(currentTime);

  const gregFormatter = new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const gregStr = gregFormatter.format(currentTime);

  const timeFormatter = new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
  const timeStr = timeFormatter.format(currentTime);

  const navItems = [
    { id: 'pos', label: 'POS / Billing', labelAr: 'نقطة البيع', icon: ShoppingCart, badge: cartCount },
    { id: 'inventory', label: 'Inventory & Stock', labelAr: 'المخزون والمنتجات', icon: Package },
    { id: 'customers', label: 'Customers (Baqaya)', labelAr: 'العملاء / الآجل', icon: Users },
    { id: 'invoices', label: 'Invoice History', labelAr: 'سجل الفواتير', icon: Receipt },
    { id: 'manual_bills', label: 'Manual Bills', labelAr: 'الفواتير اليدوية', icon: FileSpreadsheet },
    { id: 'quotations', label: 'Quotations', labelAr: 'عروض الأسعار', icon: FileText },
    { id: 'license_revenue', label: 'License & Revenue', labelAr: 'الترخيص والإيرادات', icon: KeyRound },
    { id: 'settings', label: 'Business Settings', labelAr: 'بيانات المنشأة والبنك', icon: Settings, badge: userRole === 'ADMIN' && pendingRequestsCount > 0 ? pendingRequestsCount : undefined },
  ];

  const businessName = (businessProfile.businessNameAr || businessProfile.businessName)?.replace(/بقالة/g, 'تموينات');

  return (
    <header className="bg-[#4338CA] text-white border-b border-[#3730A3] sticky top-0 z-30 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Business Name */}
          <div className="flex items-center space-x-3 rtl:space-x-reverse">
            <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-white shadow overflow-hidden shrink-0">
              {businessProfile.logo ? (
                <img
                  src={businessProfile.logo}
                  alt="Logo"
                  className="w-full h-full object-contain bg-white/10 p-0.5"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span className="font-black text-white text-base">S</span>
              )}
            </div>
            <div>
              <div className="flex items-center space-x-2 rtl:space-x-reverse">
                <span className="font-bold text-base sm:text-lg tracking-tight text-white uppercase">
                  {businessName || 'Sahaab POS'}
                </span>
                <span className="bg-white/10 border border-white/20 text-indigo-100 text-[10px] px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  15% VAT
                </span>
              </div>
              <p className="text-[10px] text-indigo-100/80 font-mono tracking-wider">
                CR: {businessProfile.crNumber || '1010654321'} | VAT: {businessProfile.vatNumber || '300012345600003'}
              </p>
            </div>
          </div>

          {/* Live Date & Time Widget */}
          <div className="hidden md:flex flex-col items-center text-xs font-mono text-indigo-100 bg-[#3730A3]/80 px-3 py-1 rounded-xl border border-white/10 shadow-inner">
            <div className="flex items-center gap-1.5 text-[11px]">
              <span className="text-indigo-200 font-bold">{hijriStr} هـ</span>
              <span className="text-indigo-300/60">|</span>
              <span>{gregStr}</span>
            </div>
            <div className="text-white font-bold tracking-wider text-xs">
              {timeStr}
            </div>
          </div>

          {/* User Info & Logout Button */}
          <div className="flex items-center space-x-2 sm:space-x-3 rtl:space-x-reverse">
            <PWAInstallButton />
            <div className="hidden sm:flex flex-col items-end text-right">
              <span className="text-xs font-bold text-white leading-tight">
                {userRole === 'ADMIN' ? 'Admin / مدير النظام' : 'Cashier / كاشير'}
              </span>
              <span className="text-[10px] text-indigo-200">
                {userRole === 'ADMIN' ? 'admin' : 'cashier'}
              </span>
            </div>
            <button
              onClick={onLogout}
              className="flex items-center space-x-1.5 rtl:space-x-reverse px-3 py-1.5 bg-[#3730A3] hover:bg-[#312E81] active:bg-[#1E1B4B] text-white rounded-lg text-xs font-bold transition-all border border-[#312E81] shadow-sm hover:text-rose-100 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout / خروج</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex space-x-1 sm:space-x-2 overflow-x-auto pb-2 scrollbar-none border-t border-white/10 pt-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center space-x-1.5 rtl:space-x-reverse px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-[#EEF2FF] text-[#4338CA] shadow-sm border border-[#4338CA]/10'
                    : 'text-indigo-100 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#4338CA]' : 'text-indigo-200'}`} />
                <span>{item.label}</span>
                <span className={`text-[9px] font-sans opacity-70 ${isActive ? 'text-[#4338CA]/85' : 'text-indigo-200'}`}>
                  ({item.labelAr})
                </span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="ml-1 bg-amber-400 text-slate-950 font-bold text-[10px] px-1.5 py-0.2 rounded-full">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
