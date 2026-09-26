'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { ReauthModal } from '@/components/auth/ReauthModal';

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = pathname === '/login' || pathname === '/forgot-password' || pathname.startsWith('/invite');

  if (isAuthPage) {
    return <main className="min-h-screen bg-slate-50 text-slate-900">{children}</main>;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex">
      <Sidebar />
      <div className="flex-1 flex flex-col pl-[68px] transition-all duration-300">
        <Header />
        <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto animate-fade-in">
          {children}
        </main>
      </div>
      <ReauthModal />
    </div>
  );
}
