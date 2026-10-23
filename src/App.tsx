import React, { useState, useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Header } from './components/Header';
import { PosScreen } from './components/PosScreen';
import { InventoryScreen } from './components/InventoryScreen';
import { CustomerScreen } from './components/CustomerScreen';
import { InvoicesScreen } from './components/InvoicesScreen';
import { SettingsScreen } from './components/SettingsScreen';
import { LoginScreen } from './components/LoginScreen';
import { QuotationsScreen } from './components/QuotationsScreen';
import { ManualBillScreen } from './components/ManualBillScreen';
import { LicenseRevenueScreen } from './components/LicenseRevenueScreen';
import { InvoiceReceiptModal } from './components/InvoiceReceiptModal';
import { PublicInvoiceView } from './components/PublicInvoiceView';
import { SplashScreen } from './components/SplashScreen';
import { OfflineIndicator } from './components/OfflineIndicator';
import { BusinessProfile, Customer, InventoryItem, Invoice, UserRole } from './types';
import { DEFAULT_BUSINESS_PROFILE } from './lib/sampleData';
import {
  seedInitialDataIfNeeded,
  getBusinessProfile,
  subscribeInventory,
  subscribeCustomers,
  subscribeInvoices,
  subscribeBankEditPermissions,
} from './services/dbService';
import { ensureAnonymousAuth } from './lib/firebase';

export default function App() {
  // Check if current URL is a public invoice verification route (/invoice/:id)
  const pathname = window.location.pathname;
  const isPublicInvoiceRoute = pathname.startsWith('/invoice/');
  const publicInvoiceId = isPublicInvoiceRoute ? pathname.split('/invoice/')[1] : null;

  // Main App State
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    return localStorage.getItem('isLoggedIn') === 'true';
  });
  const [activeTab, setActiveTab] = useState<string>('pos');
  const [userRole, setUserRole] = useState<UserRole>(() => {
    return (localStorage.getItem('userRole') as UserRole) || 'CASHIER';
  });
  const [currentUsername, setCurrentUsername] = useState<string>(() => {
    return localStorage.getItem('currentUsername') || 'cashier';
  });
  const [businessProfile, setBusinessProfile] = useState<BusinessProfile>(DEFAULT_BUSINESS_PROFILE);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [isInventoryLoading, setIsInventoryLoading] = useState<boolean>(true);
  const [inventoryError, setInventoryError] = useState<string | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [pendingRequestsCount, setPendingRequestsCount] = useState<number>(0);

  // Subscriptions & DB Initialization State
  const [isProfileInitialized, setIsProfileInitialized] = useState<boolean>(false);
  const [isInventoryInitialized, setIsInventoryInitialized] = useState<boolean>(false);
  const [isCustomersInitialized, setIsCustomersInitialized] = useState<boolean>(false);
  const [isInvoicesInitialized, setIsInvoicesInitialized] = useState<boolean>(false);

  // Active Receipt Modal
  const [activeInvoiceModal, setActiveInvoiceModal] = useState<Invoice | null>(null);

  // Animated Startup / Splash Screen State
  const [showSplash, setShowSplash] = useState<boolean>(true);

  // Inactivity & License Banners State
  const [inactivityError, setInactivityError] = useState<string>('');
  const [showWarningBanner, setShowWarningBanner] = useState<boolean>(true);

  // Combined readiness state for all dbService services & subscriptions
  const isAppReady =
    isProfileInitialized &&
    isInventoryInitialized &&
    isCustomersInitialized &&
    isInvoicesInitialized;

  // Initialize Firestore Data & Subscriptions
  useEffect(() => {
    let isMounted = true;

    async function init() {
      try {
        await ensureAnonymousAuth();
        await seedInitialDataIfNeeded();
        const profile = await getBusinessProfile();
        if (isMounted) {
          setBusinessProfile(profile);
          setIsProfileInitialized(true);
        }
      } catch (err) {
        console.warn('Profile initialization notice:', err);
        if (isMounted) {
          setIsProfileInitialized(true);
        }
      }
    }
    init();

    // Subscribe to real-time collections
    const unsubInv = subscribeInventory(
      (data) => {
        if (!isMounted) return;
        setInventory(data);
        setIsInventoryLoading(false);
        setInventoryError(null);
        setIsInventoryInitialized(true);
      },
      (err) => {
        if (!isMounted) return;
        setIsInventoryLoading(false);
        setInventoryError(err.message || 'Firestore rules pending update in Firebase Console');
        setIsInventoryInitialized(true);
      }
    );

    const unsubCust = subscribeCustomers(
      (data) => {
        if (!isMounted) return;
        setCustomers(data);
        setIsCustomersInitialized(true);
      },
      (err) => {
        if (!isMounted) return;
        setIsCustomersInitialized(true);
      }
    );

    const unsubInvoices = subscribeInvoices(
      (data) => {
        if (!isMounted) return;
        setInvoices(data);
        setIsInvoicesInitialized(true);
      },
      (err) => {
        if (!isMounted) return;
        setIsInvoicesInitialized(true);
      }
    );

    const unsubPerms = subscribeBankEditPermissions((perms) => {
      if (!isMounted) return;
      const count = perms.filter(p => {
        const st = String(p.status).toUpperCase();
        return st === 'PENDING';
      }).length;
      setPendingRequestsCount(count);
    });

    // Safeguard timeout to ensure app unlocks even if offline or slow connection
    const fallbackTimeout = setTimeout(() => {
      if (isMounted) {
        setIsProfileInitialized(true);
        setIsInventoryInitialized(true);
        setIsCustomersInitialized(true);
        setIsInvoicesInitialized(true);
        setIsInventoryLoading(false);
      }
    }, 3500);

    return () => {
      isMounted = false;
      clearTimeout(fallbackTimeout);
      unsubInv();
      unsubCust();
      unsubInvoices();
      unsubPerms();
    };
  }, []);

  // Sync print variables (--receipt-width & --row-gap) to :root for 72mm thermal printer
  useEffect(() => {
    const width = businessProfile?.receiptWidthMm ?? (Number(localStorage.getItem('receipt_width_mm')) || 58);
    const gap = businessProfile?.printRowSpacingMm ?? (Number(localStorage.getItem('print_row_gap_mm')) || 1.5);
    document.documentElement.style.setProperty('--receipt-width', `${width}mm`);
    document.documentElement.style.setProperty('--row-gap', `${gap}mm`);
  }, [businessProfile?.receiptWidthMm, businessProfile?.printRowSpacingMm]);

  // Handle Logout
  const handleLogout = () => {
    setIsLoggedIn(false);
    setUserRole('CASHIER');
    setCurrentUsername('cashier');
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('userRole');
    localStorage.removeItem('currentUsername');
    setInactivityError('');
  };

  // Auto-logout after 15 minutes of inactivity
  useEffect(() => {
    if (!isLoggedIn) return;

    const INACTIVITY_TIMEOUT = 15 * 60 * 1000; // 15 minutes in milliseconds
    let timeoutId: NodeJS.Timeout;

    const resetTimer = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        handleLogout();
        setInactivityError(
          'You have been logged out due to inactivity (15 minutes). / تم تسجيل الخروج تلقائياً لعدم النشاط (15 دقيقة).'
        );
      }, INACTIVITY_TIMEOUT);
    };

    // Listen to user interaction events to reset the timer
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach((event) => {
      window.addEventListener(event, resetTimer);
    });

    // Initialize timer
    resetTimer();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      events.forEach((event) => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [isLoggedIn]);

  // Check License Expiry Status
  const getLicenseInfo = () => {
    try {
      const keysRaw = localStorage.getItem('waseela_license_keys');
      const deviceActRaw = localStorage.getItem('waseela_device_activation');
      if (!keysRaw || !deviceActRaw) {
        return { isExpired: false, daysUntilExpiry: 365, activeKey: null };
      }
      const keys: any[] = JSON.parse(keysRaw);
      const deviceAct = JSON.parse(deviceActRaw);
      const activeKey = keys.find((k) => k.key === deviceAct.key && k.status === 'active');
      if (!activeKey || !activeKey.expiryDate) {
        return { isExpired: true, daysUntilExpiry: -1, activeKey: null };
      }
      const now = new Date().getTime();
      const expiry = new Date(activeKey.expiryDate).getTime();
      const diffDays = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
      const isExpired = diffDays < 0;
      return { isExpired, daysUntilExpiry: diffDays, activeKey };
    } catch (e) {
      return { isExpired: false, daysUntilExpiry: 365, activeKey: null };
    }
  };

  const { isExpired, daysUntilExpiry } = getLicenseInfo();

  useEffect(() => {
    if (isExpired && activeTab !== 'license_revenue' && activeTab !== 'invoices') {
      setActiveTab('license_revenue');
    }
  }, [isExpired, activeTab]);

  // Handle Login Success
  const handleLoginSuccess = (role: UserRole, username: string) => {
    setUserRole(role);
    setCurrentUsername(username);
    setIsLoggedIn(true);
    setInactivityError('');
    localStorage.setItem('isLoggedIn', 'true');
    localStorage.setItem('userRole', role);
    localStorage.setItem('currentUsername', username);
    setActiveTab('pos');
  };

  const handleSetActiveTab = (tab: string) => {
    if (isExpired && tab !== 'license_revenue' && tab !== 'invoices') {
      alert('License expired. POS, Inventory, and other operational tabs are locked until license is renewed. / انتهت صلاحية الترخيص. نقاط البيع والمخزون مقفلة حتى تجديد الترخيص.');
      setActiveTab('license_revenue');
      return;
    }
    setActiveTab(tab);
  };

  // --- EARLY RETURNS SIT BELOW ALL HOOK CALLS ---

  // Handle public invoice route rendering directly (no login needed)
  if (isPublicInvoiceRoute && publicInvoiceId) {
    return <PublicInvoiceView invoiceId={publicInvoiceId} />;
  }

  // Render Animated 3D Startup / Splash Screen on initial application load / reload
  if (showSplash) {
    return (
      <SplashScreen
        isAppReady={isAppReady}
        onFinish={() => setShowSplash(false)}
      />
    );
  }

  // Render Login page if not authenticated
  if (!isLoggedIn) {
    return (
      <LoginScreen
        onLoginSuccess={handleLoginSuccess}
        inactivityMessage={inactivityError}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-900 flex flex-col selection:bg-indigo-600 selection:text-white">
      {/* Expiration Blocking Banner */}
      {isExpired && (
        <div className="bg-rose-50 border-b border-rose-200 px-4 py-4 print:hidden">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-rose-800 text-xs sm:text-sm font-bold">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 animate-bounce" />
              <span>
                License Expired! POS, Inventory, Customers, and Quotations tabs are blocked. Please update your license key below. / انتهت صلاحية الترخيص! تم قفل نقاط البيع والمخزون والعملاء. يرجى إدخال وتفعيل مفتاح ترخيص جديد أدناه.
              </span>
            </div>
            <button
              onClick={() => setActiveTab('license_revenue')}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-xl shadow cursor-pointer whitespace-nowrap"
            >
              Enter License Key / أدخل مفتاح الترخيص
            </button>
          </div>
        </div>
      )}

      {/* 30-Day Warning Banner */}
      {!isExpired && daysUntilExpiry > 0 && daysUntilExpiry <= 30 && showWarningBanner && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-3 print:hidden">
          <div className="max-w-7xl mx-auto flex items-center justify-between text-xs sm:text-sm text-amber-800">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                Your license expires in <strong>{daysUntilExpiry}</strong> days. Please renew. / سينتهي ترخيصك خلال <strong>{daysUntilExpiry}</strong> يومًا. يرجى التجديد.
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setActiveTab('license_revenue')}
                className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg shadow cursor-pointer transition"
              >
                Update License / تحديث الترخيص
              </button>
              <button
                onClick={() => setShowWarningBanner(false)}
                className="text-amber-600 hover:text-amber-900 font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

      {/* App Header & Navigation */}
      <div className="print:hidden">
        <Header
          activeTab={activeTab}
          setActiveTab={handleSetActiveTab}
          userRole={userRole}
          businessProfile={businessProfile}
          cartCount={0}
          pendingRequestsCount={pendingRequestsCount}
          onLogout={handleLogout}
        />
      </div>

      {/* Main Tab Content View */}
      <main className="flex-1 pb-12">
        {activeTab === 'pos' && (
          <PosScreen
            inventory={inventory}
            customers={customers}
            businessProfile={businessProfile}
            userRole={userRole}
            isLoadingInventory={isInventoryLoading}
            inventoryError={inventoryError}
            onInvoiceCreated={(createdInvoice) => setActiveInvoiceModal(createdInvoice)}
            onNavigateToCustomers={() => setActiveTab('customers')}
          />
        )}

        {activeTab === 'inventory' && (
          <InventoryScreen
            inventory={inventory}
            businessProfile={businessProfile}
            userRole={userRole}
            isLoading={isInventoryLoading}
            error={inventoryError}
          />
        )}

        {activeTab === 'customers' && (
          <CustomerScreen
            customers={customers}
            invoices={invoices}
            onSelectCustomerForPos={(customer) => {
              setActiveTab('pos');
            }}
          />
        )}

        {activeTab === 'invoices' && (
          <InvoicesScreen
            invoices={invoices}
            businessProfile={businessProfile}
            userRole={userRole}
            onOpenInvoiceModal={(invoice) => setActiveInvoiceModal(invoice)}
          />
        )}

        {activeTab === 'quotations' && (
          <QuotationsScreen
            businessProfile={businessProfile}
            userRole={userRole}
            inventory={inventory}
            onNewBillClick={() => setActiveTab('manual_bills')}
            onProfileUpdated={(updated) => setBusinessProfile(updated)}
            currentUsername={currentUsername}
          />
        )}

        {(activeTab === 'manual_bill' || activeTab === 'manual_bills') && (
          <ManualBillScreen
            businessProfile={businessProfile}
            userRole={userRole}
            inventory={inventory}
            onClose={() => setActiveTab('quotations')}
            onProfileUpdated={(updated) => setBusinessProfile(updated)}
            currentUsername={currentUsername}
          />
        )}

        {activeTab === 'license_revenue' && (
          <LicenseRevenueScreen
            businessProfile={businessProfile}
            inventory={inventory}
            invoices={invoices}
            userRole={userRole}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsScreen
            businessProfile={businessProfile}
            onProfileUpdated={(updated) => setBusinessProfile(updated)}
            userRole={userRole}
            currentUsername={currentUsername}
          />
        )}
      </main>

      {/* Invoice Receipt Modal Popup */}
      {activeInvoiceModal && (
        <InvoiceReceiptModal
          invoice={activeInvoiceModal}
          onClose={() => setActiveInvoiceModal(null)}
          businessProfile={businessProfile}
        />
      )}

      {/* Offline Status Toast */}
      <OfflineIndicator />
    </div>
  );
}
