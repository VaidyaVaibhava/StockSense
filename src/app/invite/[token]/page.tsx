'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { Cpu, Lock, Eye, EyeOff, CheckCircle2, AlertCircle, ArrowRight, User } from 'lucide-react';

export default function SetPasswordFromInvitePage() {
  const router = useRouter();
  const params = useParams();
  const token = params?.token as string;

  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Live password strength calculation (PRD Section 6.2)
  const hasMinLength = password.length >= 12;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSymbol = /[^A-Za-z0-9]/.test(password);
  const isMatch = password === confirmPassword && password.length > 0;
  const isStrong = hasMinLength && hasUpper && hasLower && hasNumber && hasSymbol && isMatch;

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isStrong) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/v1/auth/invite/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, name, password }),
      });

      const data = await res.json();
      if (res.ok) {
        setSuccess(true);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Activation failed due to network error.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-between items-center p-4 md:p-8 bg-slate-950 text-slate-100">
      <div className="w-full max-w-6xl flex justify-between items-center z-10">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center shadow-glow">
            <Cpu className="h-5 w-5 text-slate-950 font-bold" />
          </div>
          <div>
            <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
              StockSense
            </span>
            <span className="block text-[10px] text-emerald-400 font-mono tracking-widest uppercase">
              Corporate Account Activation
            </span>
          </div>
        </div>
      </div>

      <div className="w-full max-w-md my-auto z-10 animate-fade-in">
        <div className="glass-dropdown rounded-3xl p-8 border border-slate-800 shadow-2xl">
          {success ? (
            <div className="text-center py-6 space-y-4">
              <div className="mx-auto h-16 w-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-glow">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <h2 className="text-xl font-bold text-white">Account Activated</h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                Your corporate account has been provisioned and password registered. Per security policy (PRD 6.2), your first access requires a deliberate sign-in.
              </p>
              <div className="pt-4">
                <Link
                  href="/login"
                  className="w-full py-3 px-6 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 font-bold text-sm shadow-glow flex items-center justify-center gap-2"
                >
                  <span>Proceed to Sign In</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleActivate} className="space-y-4">
              <div className="text-center mb-6">
                <h1 className="text-xl font-bold text-white">Activate Your Account</h1>
                <p className="text-xs text-slate-400 mt-1">
                  You have been invited to StockSense IMS. Please set your full name and a secure password.
                </p>
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Your Full Name</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="e.g. Alex Johnson"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 focus:border-emerald-500 text-white text-sm outline-none"
                  />
                  <User className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">New Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Min. 12 characters"
                    className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-slate-900 border border-slate-700 focus:border-emerald-500 text-white text-sm outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Confirm Password</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Repeat password"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 focus:border-emerald-500 text-white text-sm outline-none"
                />
              </div>

              {/* Strength Meter Checklist (PRD Section 6.2) */}
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px] space-y-1">
                <div className={hasMinLength ? 'text-emerald-400' : 'text-slate-400'}>
                  {hasMinLength ? '✓' : '○'} Min. 12 characters
                </div>
                <div className={hasUpper && hasLower ? 'text-emerald-400' : 'text-slate-400'}>
                  {hasUpper && hasLower ? '✓' : '○'} Mixed case (A-Z & a-z)
                </div>
                <div className={hasNumber ? 'text-emerald-400' : 'text-slate-400'}>
                  {hasNumber ? '✓' : '○'} At least 1 number
                </div>
                <div className={hasSymbol ? 'text-emerald-400' : 'text-slate-400'}>
                  {hasSymbol ? '✓' : '○'} At least 1 special character
                </div>
                <div className={isMatch ? 'text-emerald-400' : 'text-slate-400'}>
                  {isMatch ? '✓' : '○'} Passwords match
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !isStrong}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 font-bold text-sm shadow-glow transition-all disabled:opacity-40"
              >
                {loading ? 'Activating...' : 'Activate Account'}
              </button>
            </form>
          )}
        </div>
      </div>

      <div className="text-center text-xs text-slate-400 font-mono">
        StockSense Enterprise Provisioning Portal
      </div>
    </div>
  );
}
