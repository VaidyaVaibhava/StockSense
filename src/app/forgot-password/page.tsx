'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Cpu,
  Mail,
  KeyRound,
  Lock,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  ShieldCheck
} from 'lucide-react';

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [demoCodeHint, setDemoCodeHint] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Live password strength calculation (min 12 chars, upper, lower, number, symbol per PRD 6.2)
  const hasMinLength = newPassword.length >= 12;
  const hasUpper = /[A-Z]/.test(newPassword);
  const hasLower = /[a-z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const hasSymbol = /[^A-Za-z0-9]/.test(newPassword);
  const isMatch = newPassword === confirmPassword && newPassword.length > 0;
  const isStrong = hasMinLength && hasUpper && hasLower && hasNumber && hasSymbol && isMatch;

  // Step 1: Request OTP
  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/v1/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'request', email }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccessMsg(data.message);
        if (data.demo_code_hint) {
          setDemoCodeHint(data.demo_code_hint);
          setCode(data.demo_code_hint); // Pre-fill for instant seamless developer testing
        }
        setStep(2);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Connection failure. Please retry.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || code.length !== 6) {
      setError('Please enter the 6-digit code');
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/v1/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify', email, code }),
      });
      const data = await res.json();
      if (res.ok) {
        setStep(3);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Verification network failure');
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Reset Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isStrong) {
      setError('Please meet all password complexity criteria');
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/v1/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset', email, code, newPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        setStep(4);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Password reset failed. Please retry.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-between items-center p-4 md:p-8 bg-slate-950 text-slate-100">
      {/* Background glow */}
      <div className="fixed top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="w-full max-w-6xl flex justify-between items-center z-10">
        <Link href="/login" className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center shadow-glow">
            <Cpu className="h-5 w-5 text-slate-950 font-bold" />
          </div>
          <div>
            <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
              StockSense
            </span>
            <span className="block text-[10px] text-emerald-400 font-mono tracking-widest uppercase">
              Identity & Access Management
            </span>
          </div>
        </Link>
        <Link
          href="/login"
          className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Sign In</span>
        </Link>
      </div>

      {/* Main Card */}
      <div className="w-full max-w-md my-auto z-10 animate-fade-in">
        <div className="glass-dropdown rounded-3xl p-8 border border-slate-800/90 shadow-2xl relative">
          {/* Step Progress Tracker */}
          <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-800">
            {[1, 2, 3, 4].map(s => (
              <div key={s} className="flex items-center gap-2">
                <div
                  className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    step === s
                      ? 'bg-emerald-500 text-slate-950 shadow-glow'
                      : step > s
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                      : 'bg-slate-900 text-slate-500 border border-slate-800'
                  }`}
                >
                  {step > s ? <CheckCircle2 className="h-4 w-4" /> : s}
                </div>
                {s < 4 && <div className={`w-8 h-0.5 ${step > s ? 'bg-emerald-500/50' : 'bg-slate-800'}`} />}
              </div>
            ))}
          </div>

          {error && (
            <div className="mb-5 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2.5">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* STEP 1: Enter Email */}
          {step === 1 && (
            <form onSubmit={handleRequestOTP} className="space-y-4">
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold text-white">Reset Account Password</h2>
                <p className="text-xs text-slate-400 mt-1">
                  Enter your registered corporate email to receive a secure 6-digit OTP.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Corporate Email</label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="name@stocksense.io"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700/80 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-white text-sm outline-none transition-all placeholder:text-slate-600"
                  />
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !email.includes('@')}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-slate-950 font-bold text-sm shadow-glow transition-all disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {loading ? 'Sending code...' : 'Request 6-Digit Code'}
              </button>
            </form>
          )}

          {/* STEP 2: Verify OTP */}
          {step === 2 && (
            <form onSubmit={handleVerifyOTP} className="space-y-4">
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold text-white">Enter Verification Code</h2>
                <p className="text-xs text-slate-400 mt-1">
                  Code sent to <span className="text-emerald-400 font-mono">{email}</span>. Valid for 10 minutes.
                </p>
                {demoCodeHint && (
                  <div className="mt-2 text-[11px] text-cyan-400 bg-cyan-950/40 border border-cyan-800/50 p-2 rounded-lg font-mono">
                    Demo Code Detected: <b>{demoCodeHint}</b>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">6-Digit Code</label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={code}
                  onChange={e => setCode(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="123456"
                  className="w-full text-center tracking-widest font-mono text-2xl py-3 rounded-xl bg-slate-900 border border-slate-700/80 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-emerald-400 outline-none transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={loading || code.length !== 6}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-slate-950 font-bold text-sm shadow-glow transition-all disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {loading ? 'Verifying...' : 'Verify Code'}
              </button>
            </form>
          )}

          {/* STEP 3: Choose New Password */}
          {step === 3 && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold text-white">Create New Password</h2>
                <p className="text-xs text-slate-400 mt-1">
                  Must meet strict enterprise complexity criteria and cannot match previous 3 passwords.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">New Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
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
                <label className="block text-xs font-semibold text-slate-300 mb-1">Confirm New Password</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 focus:border-emerald-500 text-white text-sm outline-none"
                />
              </div>

              {/* Live Strength Checklist (PRD 6.2) */}
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px] space-y-1">
                <div className={hasMinLength ? 'text-emerald-400' : 'text-slate-400'}>
                  {hasMinLength ? '✓' : '○'} At least 12 characters
                </div>
                <div className={hasUpper && hasLower ? 'text-emerald-400' : 'text-slate-400'}>
                  {hasUpper && hasLower ? '✓' : '○'} Mixed case letters (A-Z and a-z)
                </div>
                <div className={hasNumber ? 'text-emerald-400' : 'text-slate-400'}>
                  {hasNumber ? '✓' : '○'} At least 1 number (0-9)
                </div>
                <div className={hasSymbol ? 'text-emerald-400' : 'text-slate-400'}>
                  {hasSymbol ? '✓' : '○'} At least 1 special character (!@#$%^&*)
                </div>
                <div className={isMatch ? 'text-emerald-400' : 'text-slate-400'}>
                  {isMatch ? '✓' : '○'} Passwords match
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !isStrong}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-slate-950 font-bold text-sm shadow-glow transition-all disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {loading ? 'Updating...' : 'Update Password & Revoke Sessions'}
              </button>
            </form>
          )}

          {/* STEP 4: Confirmation */}
          {step === 4 && (
            <div className="text-center py-6 space-y-4">
              <div className="mx-auto h-16 w-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-glow">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <h2 className="text-xl font-bold text-white">Password Updated</h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                Your password has been securely updated. In accordance with security policy, all previous active sessions and refresh tokens have been invalidated immediately (FR-02 Step 4).
              </p>
              <div className="pt-4">
                <Link
                  href="/login"
                  className="w-full py-3 px-6 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 font-bold text-sm shadow-glow flex items-center justify-center gap-2"
                >
                  <span>Sign In with New Password</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="text-center text-xs text-slate-400 font-mono">
        StockSense Identity Security • Non-Enumerating OTP Protocol
      </div>
    </div>
  );
}
