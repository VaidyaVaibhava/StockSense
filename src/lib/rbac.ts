import { UserRole } from '@/types';

export interface RBACPermissions {
  canViewFinancialValuation: boolean;
  canApprovePODrafts: boolean;
  canExecuteOperations: boolean;
  canManageSuppliers: boolean;
  canViewSupplierScorecards: boolean;
  canUseConversationalAssistant: boolean;
  canManageUsers: boolean;
  canViewAuditLogs: boolean;
}

export const ROLE_PERMISSIONS: Record<UserRole, RBACPermissions> = {
  inventory_manager: {
    canViewFinancialValuation: true,
    canApprovePODrafts: true,
    canExecuteOperations: true,
    canManageSuppliers: false, // View only
    canViewSupplierScorecards: true,
    canUseConversationalAssistant: true,
    canManageUsers: false,
    canViewAuditLogs: false,
  },
  warehouse_staff: {
    canViewFinancialValuation: false, // Explicitly restricted per PRD NFR-02 & Section 10
    canApprovePODrafts: false,
    canExecuteOperations: true,
    canManageSuppliers: false,
    canViewSupplierScorecards: false,
    canUseConversationalAssistant: true, // Floor hands-free assistant
    canManageUsers: false,
    canViewAuditLogs: false,
  },
  procurement_admin: {
    canViewFinancialValuation: true,
    canApprovePODrafts: false, // View only per Section 10
    canExecuteOperations: false, // View only per Section 10
    canManageSuppliers: true, // Full management
    canViewSupplierScorecards: true,
    canUseConversationalAssistant: false, // View only
    canManageUsers: true, // Full invite & user management
    canViewAuditLogs: true,
  },
};

export function getRolePermissions(role: UserRole): RBACPermissions {
  return ROLE_PERMISSIONS[role] || {
    canViewFinancialValuation: false,
    canApprovePODrafts: false,
    canExecuteOperations: false,
    canManageSuppliers: false,
    canViewSupplierScorecards: false,
    canUseConversationalAssistant: false,
    canManageUsers: false,
    canViewAuditLogs: false,
  };
}

export function canAccessRoute(role: UserRole, pathname: string): boolean {
  if (role === 'warehouse_staff') {
    // Warehouse staff cannot access financial analytics, user settings, security logs
    if (pathname.startsWith('/analytics') || pathname.startsWith('/settings')) {
      return false;
    }
  }
  return true;
}
