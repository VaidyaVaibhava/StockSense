'use client';

import React, { useState } from 'react';
import { useStockSense } from '@/components/providers/StockSenseProvider';
import { Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';

export function ReauthModal() {
  const { user, isReauthOpen, closeReauth, logout } = useStockSense();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isReauthOpen || !user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/v1/auth/reauth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user.email,
          password,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Password does not match');
      } else {
        setPassword('');
        closeReauth();
      }
    } catch (err: any) {
      setError('Connection failure during re-authentication');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-xl relative">
        <div className="text-center mb-6">
          <div className="mx-auto h-12 w-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mb-3">
            <Lock className="h-6 w-6" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 tracking-tight">Session Locked</h3>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            Enter your password to unlock your session and continue working.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Account</label>
            <input
              type="text"
              readOnly
              value={user.email}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 text-xs font-mono cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                autoFocus
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:border-emerald-600 focus:bg-white text-slate-900 text-sm outline-none transition-all pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !password}
            className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? 'Verifying...' : 'Unlock Session'}
          </button>

          <div className="text-center pt-2">
            <button
              type="button"
              onClick={logout}
              className="text-xs text-slate-500 hover:text-red-600 transition-colors"
            >
              Or sign out completely
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
