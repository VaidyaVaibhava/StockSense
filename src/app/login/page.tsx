'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useStockSense } from '@/components/providers/StockSenseProvider';
import { isFirebaseConfigured, auth, signInWithEmailAndPassword } from '@/lib/firebase';
import {
  Boxes,
  Lock,
  Mail,
  Eye,
  EyeOff,
  AlertCircle,
  Truck,
  Layers,
  Shield,
  ArrowRight,
  Flame,
  CheckCircle2
} from 'lucide-react';

type PortalType = 'warehouse' | 'manager' | 'admin';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refreshUser } = useStockSense();

  const initialPortal = (searchParams.get('portal') as PortalType) || 'warehouse';
  const [activePortal, setActivePortal] = useState<PortalType>(initialPortal);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Set default sample credentials when switching portal for quick testing
  const portalDefaults: Record<PortalType, { email: string; pass: string; title: string; subtitle: string; icon: any; color: string; redirect: string }> = {
    warehouse: {
      email: 'warehouse@stocksense.io',
      pass: 'Warehouse@12345678',
      title: 'Warehouse Floor Login',
      subtitle: 'आवक-जावक एवं गोदाम कामगार पोर्टल (Workers & Floor Operators)',
      icon: Truck,
      color: 'emerald',
      redirect: '/operations',
    },
    manager: {
      email: 'manager@stocksense.io',
      pass: 'Manager@12345678',
      title: 'Inventory Manager Portal',
      subtitle: 'Stock Valuation, PO Approvals & Replenishment Control',
      icon: Layers,
      color: 'blue',
      redirect: '/dashboard',
    },
    admin: {
      email: 'admin@stocksense.io',
      pass: 'Admin@12345678',
      title: 'Procurement & Admin Portal',
      subtitle: 'Supplier Scorecards, Audit Trail & Security Configuration',
      icon: Shield,
      color: 'purple',
      redirect: '/dashboard',
    },
  };

  const currentPortalConfig = portalDefaults[activePortal];

  const handlePortalSwitch = (portal: PortalType) => {
    setActivePortal(portal);
    setError(null);
    setEmail('');
    setPassword('');
  };

  const handleQuickFill = () => {
    setEmail(currentPortalConfig.email);
    setPassword(currentPortalConfig.pass);
    setError(null);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setLoading(true);
    setError(null);

    try {
      let firebaseUid: string | undefined = undefined;

      // 1. Try Firebase Authentication if configured
      if (isFirebaseConfigured && auth) {
        try {
          const userCredential = await signInWithEmailAndPassword(auth, email, password);
          firebaseUid = userCredential.user.uid;
        } catch (fbErr: any) {
          console.warn('Firebase auth attempt returned:', fbErr.message);
          // If Firebase rejects, can fall through to local verification or show error
        }
      }

      // 2. Authenticate through the specific Portal with strict role authorization
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          rememberMe,
          portal: activePortal,
          firebaseUid,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Invalid credentials for this portal');
      } else {
        await refreshUser();
        // Redirect to role-tailored workspace
        router.push(currentPortalConfig.redirect);
      }
    } catch (err: any) {
      setError('Connection error. Please ensure the server is running.');
    } finally {
      setLoading(false);
    }
  };

  const IconComponent = currentPortalConfig.icon;

  return (
    <div className="min-h-screen w-full flex flex-col justify-between items-center p-4 md:p-8 bg-slate-50 text-slate-800">
      {/* Top Header */}
      <div className="w-full max-w-4xl flex justify-between items-center">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-bold shadow-sm">
            <Boxes className="h-5 w-5" />
          </div>
          <div>
            <span className="font-bold text-base tracking-tight text-slate-900">
              StockSense
            </span>
            <span className="block text-[10px] text-slate-500 font-medium">
              Autonomous Inventory System
            </span>
          </div>
        </div>

        {/* Firebase Indicator */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white border border-slate-200 text-[11px] font-medium text-slate-600 shadow-sm">
          <Flame className={`h-3.5 w-3.5 ${isFirebaseConfigured ? 'text-amber-500 fill-amber-500' : 'text-slate-400'}`} />
          <span>{isFirebaseConfigured ? 'Firebase Auth Ready' : 'Local Auth (Firebase Ready)'}</span>
        </div>
      </div>

      {/* Main Container */}
      <div className="w-full max-w-md my-auto py-6 animate-fade-in">
        {/* Portal Selection Tabs (Strictly Separated) */}
        <div className="flex rounded-2xl bg-slate-200/80 p-1 mb-4 border border-slate-200 shadow-inner">
          <button
            type="button"
            onClick={() => handlePortalSwitch('warehouse')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-bold transition-all ${
              activePortal === 'warehouse'
                ? 'bg-white text-emerald-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Truck className="h-3.5 w-3.5" />
            <span>Warehouse</span>
          </button>

          <button
            type="button"
            onClick={() => handlePortalSwitch('manager')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-bold transition-all ${
              activePortal === 'manager'
                ? 'bg-white text-blue-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>Manager</span>
          </button>

          <button
            type="button"
            onClick={() => handlePortalSwitch('admin')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-bold transition-all ${
              activePortal === 'admin'
                ? 'bg-white text-purple-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Shield className="h-3.5 w-3.5" />
            <span>Admin</span>
          </button>
        </div>

        {/* Clean Light Login Card */}
        <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-sm">
          {/* Card Header */}
          <div className="text-center mb-6">
            <div className="inline-flex p-3 rounded-2xl bg-slate-50 border border-slate-100 mb-3 text-slate-800">
              <IconComponent className="h-6 w-6 text-emerald-600" />
            </div>
            <h1 className="text-xl font-bold text-slate-900">{currentPortalConfig.title}</h1>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              {currentPortalConfig.subtitle}
            </p>
          </div>

          {/* Error Notice */}
          {error && (
            <div className="mb-4 p-3 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {activePortal === 'warehouse' ? 'Worker ID / Email (कामगार आईडी)' : 'Work Email'}
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder={currentPortalConfig.email}
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:border-emerald-600 focus:bg-white text-slate-900 text-sm outline-none transition-colors"
                />
                <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700">
                  {activePortal === 'warehouse' ? 'PIN / Password (पासवर्ड)' : 'Password'}
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
                >
                  Forgot?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:border-emerald-600 focus:bg-white text-slate-900 text-sm outline-none transition-colors"
                />
                <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between py-1">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-600">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={e => setRememberMe(e.target.checked)}
                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span>Remember this terminal</span>
              </label>

              <button
                type="button"
                onClick={handleQuickFill}
                className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 underline"
              >
                Auto-fill Demo
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Sign In to {activePortal.toUpperCase()} Portal</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Strict Separation Notice */}
          <div className="mt-5 pt-4 border-t border-slate-100 text-center">
            <p className="text-[11px] text-slate-500">
              🔒 <span className="font-semibold text-slate-700">Strict Role Separation:</span> Each portal authorizes only its assigned job role. Logins do not cross-access.
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="w-full max-w-4xl flex flex-col md:flex-row justify-between items-center gap-2 text-[11px] text-slate-500">
        <div>StockSense India — Minimalist Inventory Management System</div>
        <div className="flex gap-4">
          <span>Enterprise Secure TLS</span>
          <span>Support: support@stocksense.in</span>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <React.Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="h-8 w-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <LoginForm />
    </React.Suspense>
  );
}
