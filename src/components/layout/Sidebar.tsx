'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useStockSense } from '@/components/providers/StockSenseProvider';
import {
  LayoutDashboard,
  Boxes,
  Truck,
  Bot,
  TrendingUp,
  Settings,
  ChevronLeft,
  ChevronRight,
  Boxes as BoxIcon,
  LogOut,
  ShieldCheck,
  Building,
  UserCheck
} from 'lucide-react';

interface NavItem {
  label: string;
  sublabel?: string;
  href: string;
  icon: any;
}

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useStockSense();
  const [collapsed, setCollapsed] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem('stocksense_sidebar_collapsed');
    if (saved !== null) {
      setCollapsed(saved === 'true');
    }
  }, []);

  const toggleSidebar = () => {
    const nextState = !collapsed;
    setCollapsed(nextState);
    localStorage.setItem('stocksense_sidebar_collapsed', String(nextState));
  };

  const role = user?.role || 'inventory_manager';

  // Role-specific navigation: simple and intuitive for floor workers
  let navItems: NavItem[] = [];

  if (role === 'warehouse_staff') {
    navItems = [
      { label: 'Floor Operations', sublabel: 'आवक-जावक', href: '/operations', icon: Truck },
      { label: 'Stock Lookup', sublabel: 'स्टॉक जांच', href: '/products', icon: Boxes },
      { label: 'Voice Helper', sublabel: 'सहायक', href: '/agents', icon: Bot },
    ];
  } else if (role === 'inventory_manager') {
    navItems = [
      { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      { label: 'Products', href: '/products', icon: Boxes },
      { label: 'Operations', href: '/operations', icon: Truck },
      { label: 'AI Agents', href: '/agents', icon: Bot },
      { label: 'Analytics', href: '/analytics', icon: TrendingUp },
    ];
  } else {
    // Procurement & System Admin
    navItems = [
      { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      { label: 'Products', href: '/products', icon: Boxes },
      { label: 'Operations', href: '/operations', icon: Truck },
      { label: 'AI Agents', href: '/agents', icon: Bot },
      { label: 'Analytics', href: '/analytics', icon: TrendingUp },
      { label: 'Settings', href: '/settings', icon: Settings },
    ];
  }

  const roleBadgeLabel: Record<string, string> = {
    warehouse_staff: 'Warehouse Floor',
    inventory_manager: 'Inventory Manager',
    procurement_admin: 'System Admin',
  };

  return (
    <aside
      className={`fixed top-0 left-0 z-30 h-screen transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] flex flex-col border-r border-slate-200 bg-white shadow-sm ${
        collapsed ? 'w-[68px]' : 'w-60'
      }`}
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-3 border-b border-slate-100">
        <Link href={role === 'warehouse_staff' ? '/operations' : '/dashboard'} className="flex items-center gap-2.5 overflow-hidden">
          <div className="h-9 w-9 shrink-0 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold shadow-sm">
            <Boxes className="h-5 w-5" />
          </div>
          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-sm tracking-tight text-slate-900 leading-none">
                StockSense
              </span>
              <span className="text-[10px] text-emerald-600 font-semibold mt-0.5 truncate">
                {roleBadgeLabel[role] || 'Portal'}
              </span>
            </div>
          )}
        </Link>
        <button
          onClick={toggleSidebar}
          aria-label="Toggle sidebar"
          className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 py-4 px-2 space-y-1.5 overflow-y-auto">
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 relative ${
                isActive
                  ? 'bg-emerald-50 text-emerald-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
              title={collapsed ? `${item.label}${item.sublabel ? ` (${item.sublabel})` : ''}` : undefined}
            >
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-emerald-600 rounded-r-full" />
              )}
              <Icon
                className={`h-5 w-5 shrink-0 transition-colors ${
                  isActive ? 'text-emerald-600' : 'text-slate-400 group-hover:text-slate-600'
                }`}
              />
              {!collapsed && (
                <div className="truncate flex flex-col">
                  <span className="leading-tight">{item.label}</span>
                  {item.sublabel && (
                    <span className="text-[10px] text-slate-400 font-normal">{item.sublabel}</span>
                  )}
                </div>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User & Logout Footer */}
      <div className="p-3 border-t border-slate-100 bg-slate-50/50">
        {!collapsed ? (
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-800 font-bold text-xs">
              {user?.name ? user.name[0] : 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-slate-900 truncate">{user?.name || 'Staff User'}</div>
              <div className="text-[10px] text-slate-500 truncate">
                {roleBadgeLabel[role] || 'Worker'}
              </div>
            </div>
            <button
              onClick={logout}
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
              title="Sign Out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="flex justify-center">
            <button
              onClick={logout}
              className="h-8 w-8 rounded-full bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-600 flex items-center justify-center transition-colors"
              title={`Sign Out: ${user?.name}`}
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
