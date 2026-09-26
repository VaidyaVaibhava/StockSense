'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserRole, QueuedTransaction } from '@/types';
import { RBACPermissions, getRolePermissions } from '@/lib/rbac';

export interface UserSession {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  warehouseScope: string;
}

interface StockSenseContextType {
  user: UserSession | null;
  permissions: RBACPermissions;
  isLoading: boolean;
  isOffline: boolean;
  toggleOffline: () => void;
  queuedCount: number;
  syncQueue: () => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  isReauthOpen: boolean;
  openReauth: () => void;
  closeReauth: () => void;
  activeWarehouse: string;
  setActiveWarehouse: (w: string) => void;
  notificationsCount: number;
  setNotificationsCount: React.Dispatch<React.SetStateAction<number>>;
}

const StockSenseContext = createContext<StockSenseContextType | null>(null);

export function StockSenseProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserSession | null>(null);
  const [permissions, setPermissions] = useState<RBACPermissions>(getRolePermissions('inventory_manager'));
  const [isLoading, setIsLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  const [queuedTransactions, setQueuedTransactions] = useState<QueuedTransaction[]>([]);
  const [isReauthOpen, setIsReauthOpen] = useState(false);
  const [activeWarehouse, setActiveWarehouse] = useState('Mumbai Distribution Hub');
  const [notificationsCount, setNotificationsCount] = useState(3);

  const fetchCurrentUser = async () => {
    try {
      const res = await fetch('/api/v1/auth/me');
      if (res.ok) {
        const data = await res.json();
        if (data.authenticated && data.user) {
          setUser(data.user);
          setPermissions(data.permissions);
          return;
        }
      }
    } catch (err) {
      console.error('Error fetching session:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();

    // Check Firebase Auth if configured
    import('@/lib/firebase').then(({ auth, onAuthStateChanged, isFirebaseConfigured }) => {
      if (isFirebaseConfigured && auth) {
        onAuthStateChanged(auth, async (fbUser) => {
          if (fbUser && fbUser.email) {
            // Verify backend session
            fetchCurrentUser();
          }
        });
      }
    }).catch(err => {
      console.warn('Firebase auth listener skipped:', err);
    });
  }, []);

  const logout = async () => {
    try {
      // Also sign out of Firebase if initialized
      const { auth, fbSignOut } = await import('@/lib/firebase');
      if (auth) {
        await fbSignOut(auth).catch(() => {});
      }
    } catch (e) {
      // Ignore
    }
    try {
      await fetch('/api/v1/auth/logout', { method: 'POST' });
      setUser(null);
      window.location.href = '/login';
    } catch (err) {
      console.error('Logout failed:', err);
      window.location.href = '/login';
    }
  };

  const toggleOffline = () => {
    setIsOffline(prev => !prev);
  };

  const syncQueue = async () => {
    if (queuedTransactions.length === 0) return;
    try {
      const res = await fetch('/api/v1/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactions: queuedTransactions }),
      });
      if (res.ok) {
        setQueuedTransactions([]);
      }
    } catch (err) {
      console.error('Failed to sync queue:', err);
    }
  };

  return (
    <StockSenseContext.Provider
      value={{
        user,
        permissions,
        isLoading,
        isOffline,
        toggleOffline,
        queuedCount: queuedTransactions.length,
        syncQueue,
        logout,
        refreshUser: fetchCurrentUser,
        isReauthOpen,
        openReauth: () => setIsReauthOpen(true),
        closeReauth: () => setIsReauthOpen(false),
        activeWarehouse,
        setActiveWarehouse,
        notificationsCount,
        setNotificationsCount,
      }}
    >
      {children}
    </StockSenseContext.Provider>
  );
}

export function useStockSense() {
  const context = useContext(StockSenseContext);
  if (!context) {
    throw new Error('useStockSense must be used within a StockSenseProvider');
  }
  return context;
}
