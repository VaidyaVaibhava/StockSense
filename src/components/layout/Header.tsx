'use client';

import React, { useState, useEffect } from 'react';
import { useStockSense } from '@/components/providers/StockSenseProvider';
import { Notification } from '@/types';
import {
  Bell,
  Wifi,
  WifiOff,
  Building2,
  ChevronDown,
  LogOut,
  RefreshCw,
  CheckCircle2,
  Clock,
  Shield,
  Truck,
  Layers
} from 'lucide-react';

const WAREHOUSES = [
  'Mumbai Distribution Hub',
  'Delhi NCR Logistics Center',
  'Bangalore Tech Park Facility',
  'Chennai Port Warehouse',
];

export function Header() {
  const {
    user,
    logout,
    isOffline,
    toggleOffline,
    queuedCount,
    syncQueue,
    activeWarehouse,
    setActiveWarehouse,
    openReauth,
  } = useStockSense();

  const [showWarehouseMenu, setShowWarehouseMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [syncing, setSyncing] = useState(false);

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/v1/notifications');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unread_count || 0);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await fetch('/api/v1/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mark_all_read: true }),
      });
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark notifications read:', err);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    await syncQueue();
    setSyncing(false);
  };

  const role = user?.role || 'warehouse_staff';
  const portalLabel = role === 'warehouse_staff' 
    ? 'Warehouse Floor' 
    : role === 'inventory_manager' 
    ? 'Inventory Manager' 
    : 'System Administrator';

  return (
    <header className="sticky top-0 z-20 h-16 w-full border-b border-slate-200 bg-white/95 backdrop-blur-md px-4 md:px-6 flex items-center justify-between">
      {/* Left: Warehouse Facility Selector & Role Tag */}
      <div className="flex items-center gap-3">
        {/* Role Portal Indicator Badge */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-xs font-bold text-slate-800">
          {role === 'warehouse_staff' ? (
            <Truck className="h-4 w-4 text-emerald-600" />
          ) : role === 'inventory_manager' ? (
            <Layers className="h-4 w-4 text-blue-600" />
          ) : (
            <Shield className="h-4 w-4 text-purple-600" />
          )}
          <span>{portalLabel}</span>
        </div>

        {/* Warehouse Selector */}
        <div className="relative">
          <button
            onClick={() => setShowWarehouseMenu(!showWarehouseMenu)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:border-slate-300 text-xs font-semibold text-slate-700 transition-colors shadow-sm"
          >
            <Building2 className="h-3.5 w-3.5 text-slate-500" />
            <span className="truncate max-w-[150px] md:max-w-none">{activeWarehouse}</span>
            <ChevronDown className="h-3 w-3 text-slate-400" />
          </button>

          {showWarehouseMenu && (
            <div className="absolute left-0 mt-2 w-64 bg-white border border-slate-200 rounded-xl p-1.5 z-50 animate-fade-in shadow-xl">
              <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Select Facility
              </div>
              {WAREHOUSES.map(w => (
                <button
                  key={w}
                  onClick={() => {
                    setActiveWarehouse(w);
                    setShowWarehouseMenu(false);
                  }}
                  className={`w-full text-left px-2.5 py-2 rounded-lg text-xs font-medium flex items-center justify-between transition-colors ${
                    activeWarehouse === w
                      ? 'bg-emerald-50 text-emerald-800 font-semibold'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span>{w}</span>
                  {activeWarehouse === w && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Offline / Online Status */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleOffline}
            title={isOffline ? 'Offline mode active. Click to reconnect.' : 'Connected to live cloud.'}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all border ${
              isOffline
                ? 'bg-amber-50 border-amber-300 text-amber-800'
                : 'bg-emerald-50 border-emerald-200 text-emerald-700'
            }`}
          >
            {isOffline ? <WifiOff className="h-3 w-3 text-amber-600" /> : <Wifi className="h-3 w-3 text-emerald-600" />}
            <span>{isOffline ? 'Offline' : 'Online'}</span>
          </button>

          {queuedCount > 0 && (
            <button
              onClick={handleSync}
              disabled={isOffline || syncing}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`h-3 w-3 ${syncing ? 'animate-spin' : ''}`} />
              <span>Sync ({queuedCount})</span>
            </button>
          )}
        </div>
      </div>

      {/* Right: Notifications & User Profile */}
      <div className="flex items-center gap-3">
        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            aria-label="Toggle notifications"
            className="relative p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors border border-slate-200 bg-white"
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-emerald-600 text-white font-bold text-[10px] flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 md:w-96 bg-white border border-slate-200 rounded-2xl p-3.5 z-50 animate-fade-in shadow-2xl">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs text-slate-900">Notifications</span>
                  {unreadCount > 0 && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800">
                      {unreadCount} New
                    </span>
                  )}
                </div>
                <button
                  onClick={handleMarkAllRead}
                  className="text-xs text-emerald-700 hover:text-emerald-800 font-semibold"
                >
                  Mark all read
                </button>
              </div>

              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {notifications.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400">No new notifications</div>
                ) : (
                  notifications.map(n => (
                    <div
                      key={n.id}
                      className={`p-2.5 rounded-xl border transition-all text-xs ${
                        n.read
                          ? 'bg-slate-50/50 border-slate-100 text-slate-500'
                          : 'bg-emerald-50/40 border-emerald-200 text-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-between font-semibold mb-1">
                        <span className={n.read ? 'text-slate-600' : 'text-emerald-900'}>{n.title}</span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-[11px] leading-relaxed text-slate-600">{n.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Lock Session */}
        <button
          onClick={openReauth}
          title="Lock Session"
          className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-slate-200 bg-white transition-colors"
        >
          <Clock className="h-4 w-4" />
        </button>

        {/* User Info & Logout */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
          <div className="hidden sm:block text-right">
            <div className="text-xs font-bold text-slate-900 leading-tight">{user?.name}</div>
            <div className="text-[10px] text-slate-500">{user?.email}</div>
          </div>
          <button
            onClick={logout}
            title="Sign out"
            className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 border border-slate-200 bg-white transition-colors"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
