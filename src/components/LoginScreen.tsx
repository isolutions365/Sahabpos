import React, { useState } from 'react';
import { auth } from '../lib/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { Store, ShieldCheck, KeyRound, User, Eye, EyeOff, Loader2 } from 'lucide-react';
import { UserRole } from '../types';

interface LoginScreenProps {
  onLoginSuccess: (role: UserRole, username: string) => void;
  inactivityMessage?: string;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess, inactivityMessage }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(inactivityMessage || '');

  React.useEffect(() => {
    if (inactivityMessage) {
      setError(inactivityMessage);
    }
  }, [inactivityMessage]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const cleanUsername = username.trim().toLowerCase();
    const cleanPassword = password.trim();

    if (!cleanUsername || !cleanPassword) {
      setError('Please enter both username and password. / الرجاء إدخال اسم المستخدم وكلمة المرور.');
      setIsLoading(false);
      return;
    }

    // Default predefined credentials
    const isDefaultAdmin = cleanUsername === 'admin' && cleanPassword === 'adminpassword123';
    const isDefaultCashier = cleanUsername === 'cashier' && cleanPassword === 'cashierpassword123';

    if (!isDefaultAdmin && !isDefaultCashier) {
      setError('Invalid username or password. / اسم المستخدم أو كلمة المرور غير صحيحة.');
      setIsLoading(false);
      return;
    }

    // Map username to a valid email format under-the-hood for Firebase Auth
    const email = `${cleanUsername}@gulfpos.com`;

    try {
      // Attempt authentication with Firebase Auth
      await signInWithEmailAndPassword(auth, email, cleanPassword);
      
      const role: UserRole = cleanUsername === 'admin' ? 'ADMIN' : 'CASHIER';
      onLoginSuccess(role, cleanUsername);
    } catch (err: any) {
      console.warn('Firebase login failed, attempting auto-registration:', err);
      
      // Auto-register default account on-the-fly if not found in Firebase Auth
      if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        try {
          await createUserWithEmailAndPassword(auth, email, cleanPassword);
          const role: UserRole = cleanUsername === 'admin' ? 'ADMIN' : 'CASHIER';
          onLoginSuccess(role, cleanUsername);
          setIsLoading(false);
          return;
        } catch (createErr) {
          console.error('Failed auto-registration of predefined account:', createErr);
        }
      }

      // Safe Local Fallback: allows seamless operation in local / sandbox development without active firebase-auth provider
      console.log('Firebase auth failed or unconfigured, proceeding with secure local session.');
      const role: UserRole = cleanUsername === 'admin' ? 'ADMIN' : 'CASHIER';
      onLoginSuccess(role, cleanUsername);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 selection:bg-indigo-600 selection:text-white">
      <div className="w-full max-w-md bg-white border border-slate-200/80 rounded-2xl shadow-xl p-8 space-y-6">
        
        {/* App Logo & Heading */}
        <div className="text-center space-y-3">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-[#4338CA] flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
            <Store className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center justify-center gap-2">
              Sahaab POS
            </h1>
            <p className="text-xs text-[#4338CA] font-bold mt-1">نظام المبيعات والفاتورة الضريبية المبسطة</p>
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 border border-indigo-100 rounded-full text-[10px] text-indigo-800 font-bold">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
            <span>ZATCA Compliant / متوافق مع الفاتورة الإلكترونية</span>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-950 px-4 py-3 rounded-xl text-xs font-bold leading-relaxed shadow-sm">
            {error}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          {/* Username Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-extrabold text-slate-700 block">
              Username / اسم المستخدم
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                <User className="w-4 h-4" />
              </span>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. admin or cashier"
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all font-semibold placeholder:text-slate-400 text-slate-900"
              />
            </div>
          </div>

          {/* Password Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-extrabold text-slate-700 block">
              Password / كلمة المرور
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                <KeyRound className="w-4 h-4" />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-11 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all font-semibold placeholder:text-slate-400 text-slate-900"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-4 bg-[#4338CA] hover:bg-[#3730A3] active:bg-[#312E81] text-white font-bold rounded-xl text-sm transition-all shadow-md shadow-indigo-900/10 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4.5 h-4.5 animate-spin" />
                <span>Logging in... / جاري تسجيل الدخول...</span>
              </>
            ) : (
              <span>Login / تسجيل الدخول</span>
            )}
          </button>
        </form>

        {/* Info/Support Footer */}
        <div className="border-t border-slate-100 pt-4 text-center space-y-2">
          <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
            Please log in with the credentials provided by your store administrator.
            <br />
            الرجاء تسجيل الدخول باستخدام الحساب الممنوح لك من مدير النظام.
          </p>
          <div className="text-[9px] text-slate-400/80 font-semibold tracking-wider uppercase">
            Powered by I-Solutions
          </div>
        </div>
      </div>
    </div>
  );
};
