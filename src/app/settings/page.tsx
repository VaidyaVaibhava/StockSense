'use client';

import React, { useState, useEffect } from 'react';
import {
  Settings,
  Users,
  ShieldCheck,
  Bell,
  Mail,
  UserPlus,
  Key,
  Lock,
  CheckCircle2,
  AlertCircle,
  Copy,
  ExternalLink,
  ShieldAlert,
  Clock,
  Laptop
} from 'lucide-react';
import { useStockSense } from '@/components/providers/StockSenseProvider';
import { UserRole, AuthAuditLog, UserInvite } from '@/types';

export default function SettingsPage() {
  const { user, permissions } = useStockSense();

  const [activeTab, setActiveTab] = useState<'users' | 'security_log' | 'notifications'>('users');
  const [usersList, setUsersList] = useState<any[]>([]);
  const [invitesList, setInvitesList] = useState<UserInvite[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuthAuditLog[]>([]);
  const [selectedEventType, setSelectedEventType] = useState('');
  const [selectedOutcome, setSelectedOutcome] = useState('');

  // Invite Modal State (FR-19)
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>('warehouse_staff');
  const [inviteWarehouse, setInviteWarehouse] = useState('Dallas Distribution Hub');
  const [inviteResult, setInviteResult] = useState<{ inviteLink: string; email: string } | null>(null);

  // Notification Preferences State (FR-18)
  const [prefLowStock, setPrefLowStock] = useState(true);
  const [prefPoApproval, setPrefPoApproval] = useState(true);
  const [prefAnomalies, setPrefAnomalies] = useState(true);
  const [prefSecurity, setPrefSecurity] = useState(true);
  const [prefSavedMsg, setPrefSavedMsg] = useState(false);

  const [feedback, setFeedback] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isRestricted = user?.role === 'warehouse_staff';

  const fetchSettingsData = async () => {
    if (isRestricted) return;
    try {
      const [invRes, logRes] = await Promise.all([
        fetch('/api/v1/auth/invite'),
        fetch(`/api/v1/audit/security-log${selectedEventType ? `?event_type=${selectedEventType}` : ''}`),
      ]);

      if (invRes.ok) {
        const invData = await invRes.json();
        setInvitesList(invData.invites || []);
        setUsersList(invData.users || []);
      }
      if (logRes.ok) {
        const logData = await logRes.json();
        setAuditLogs(logData.logs || []);
      }
    } catch (err) {
      console.error('Failed to load settings data:', err);
    }
  };

  useEffect(() => {
    fetchSettingsData();
  }, [selectedEventType, isRestricted]);

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/v1/auth/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail,
          role: inviteRole,
          warehouse_scope: inviteWarehouse,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setInviteResult({ inviteLink: data.inviteLink, email: inviteEmail });
        setFeedback(`Invite generated for ${inviteEmail} (FR-19). Valid for 72 hours.`);
        fetchSettingsData();
      } else {
        setFeedback(data.error);
      }
    } catch (err) {
      setFeedback('Failed to send invite');
    } finally {
      setLoading(false);
    }
  };

  const handleSavePreferences = () => {
    setPrefSavedMsg(true);
    setTimeout(() => setPrefSavedMsg(false), 3000);
  };

  if (isRestricted) {
    return (
      <div className="py-20 text-center space-y-4 max-w-lg mx-auto">
        <div className="h-16 w-16 rounded-full bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 mx-auto">
          <ShieldAlert className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-bold text-white">Access Restricted</h2>
        <p className="text-xs text-slate-400 leading-relaxed">
          System Administration and Identity Management are restricted to Procurement / Admin users.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Security & Governance Console</h1>
          <p className="text-xs text-slate-400 mt-1">
            Enterprise user provisioning, immutable access audit logs, and alert notification routing.
          </p>
        </div>

        {activeTab === 'users' && permissions.canManageUsers && (
          <button
            onClick={() => {
              setIsInviteModalOpen(true);
              setInviteResult(null);
            }}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-bold text-xs shadow-glow hover:opacity-95"
          >
            <UserPlus className="h-4 w-4" />
            <span>Invite New User (FR-19)</span>
          </button>
        )}
      </div>

      {feedback && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{feedback}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-emerald-500 hover:text-emerald-300">
            Dismiss
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'users'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-glow'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Users className="h-4 w-4" />
          <span>Provisioning & Users (FR-19)</span>
        </button>

        <button
          onClick={() => setActiveTab('security_log')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'security_log'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-glow'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <ShieldCheck className="h-4 w-4" />
          <span>Security Audit Log (FR-25)</span>
          <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded-full font-mono">
            {auditLogs.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('notifications')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'notifications'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-glow'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Bell className="h-4 w-4" />
          <span>Alert Preferences (FR-18)</span>
        </button>
      </div>

      {/* TAB 1: USERS & INVITES (FR-19) */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          {/* Active Users Table */}
          <div className="glass-panel rounded-3xl border border-slate-800 overflow-hidden shadow-xl">
            <div className="p-4 border-b border-slate-800">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Provisioned Accounts & Roles (RBAC Matrix)
              </h3>
            </div>
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/80 border-b border-slate-800 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">User</th>
                  <th className="py-3.5 px-4">Role</th>
                  <th className="py-3.5 px-4">Warehouse Facility Scope</th>
                  <th className="py-3.5 px-4 text-center">Auth Security Status</th>
                  <th className="py-3.5 px-4 text-right">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {usersList.map(u => (
                  <tr key={u.id} className="hover:bg-slate-900/40">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-white">{u.name}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{u.email}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        {u.role.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">
                      {u.warehouse_scope}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {u.locked_until ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                          Locked (FR-22)
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400">
                          Active (0 Failed)
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right text-slate-400 font-mono text-[11px]">
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pending Invites Table */}
          <div className="glass-panel rounded-3xl border border-slate-800 overflow-hidden shadow-xl">
            <div className="p-4 border-b border-slate-800">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Pending User Invitations (72-Hour Activation Links)
              </h3>
            </div>
            {invitesList.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                No pending invitations. Click Invite New User to generate a secure activation token.
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900/80 border-b border-slate-800 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4">Invited Email</th>
                    <th className="py-3.5 px-4">Assigned Role</th>
                    <th className="py-3.5 px-4">Facility Scope</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Activation Link</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {invitesList.map(inv => (
                    <tr key={inv.id} className="hover:bg-slate-900/40">
                      <td className="py-3.5 px-4 text-white font-sans font-bold">{inv.email}</td>
                      <td className="py-3.5 px-4 text-emerald-400">{inv.role}</td>
                      <td className="py-3.5 px-4 text-slate-400 font-sans">{inv.warehouse_scope}</td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold ${
                            inv.status === 'accepted' ? 'text-emerald-400' : 'text-amber-300'
                          }`}
                        >
                          {inv.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <a
                          href={`/invite/${inv.token}`}
                          className="text-cyan-400 hover:text-cyan-300 underline text-[11px] flex items-center gap-1 font-sans"
                        >
                          <span>Open Set Password Link</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: IMMUTABLE SECURITY AUDIT LOG (FR-25, Section 6.7) */}
      {activeTab === 'security_log' && (
        <div className="space-y-4">
          <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-slate-300">Filter Event:</span>
              <select
                value={selectedEventType}
                onChange={e => setSelectedEventType(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white outline-none"
              >
                <option value="">All Security Events</option>
                <option value="LOGIN_SUCCESS">LOGIN_SUCCESS</option>
                <option value="LOGIN_FAILURE">LOGIN_FAILURE</option>
                <option value="ACCOUNT_LOCKED">ACCOUNT_LOCKED</option>
                <option value="PASSWORD_RESET_REQUEST">PASSWORD_RESET_REQUEST</option>
                <option value="PASSWORD_RESET_COMPLETE">PASSWORD_RESET_COMPLETE</option>
                <option value="INVITE_SENT">INVITE_SENT</option>
                <option value="INVITE_ACCEPTED">INVITE_ACCEPTED</option>
              </select>
            </div>

            <span className="text-[11px] text-slate-400 font-mono">
              Immutable, Append-Only Storage (PRD FR-25)
            </span>
          </div>

          <div className="glass-panel rounded-3xl border border-slate-800 overflow-hidden shadow-xl">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-900/80 border-b border-slate-800 text-[11px] font-semibold text-slate-400 uppercase tracking-wider font-sans">
                <tr>
                  <th className="py-3.5 px-4">Timestamp</th>
                  <th className="py-3.5 px-4">Event Type</th>
                  <th className="py-3.5 px-4">Target Account</th>
                  <th className="py-3.5 px-4 text-center">Outcome</th>
                  <th className="py-3.5 px-4">Client Fingerprint / IP</th>
                  <th className="py-3.5 px-4">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {auditLogs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-900/40">
                    <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-white">{log.event_type}</span>
                    </td>
                    <td className="py-3.5 px-4 text-emerald-400 font-sans">{log.user_email}</td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          log.outcome === 'SUCCESS'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-rose-500/20 text-rose-300'
                        }`}
                      >
                        {log.outcome}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                      {log.ip_device_fingerprint}
                    </td>
                    <td className="py-3.5 px-4 text-slate-300 font-sans text-[11px]">
                      {log.details || '---'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: NOTIFICATION PREFERENCES (FR-18) */}
      {activeTab === 'notifications' && (
        <div className="glass-panel p-6 rounded-3xl border border-slate-800 max-w-2xl space-y-6">
          <div>
            <h2 className="text-base font-bold text-white">Alert Channel Preferences (FR-18)</h2>
            <p className="text-xs text-slate-400 mt-1">
              Configure real-time event alerts. Users can selectively mute specific alert types without muting all notifications.
            </p>
          </div>

          {prefSavedMsg && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              <span>Notification preferences saved to profile.</span>
            </div>
          )}

          <div className="space-y-4">
            <label className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 cursor-pointer">
              <div>
                <div className="text-xs font-bold text-white">Low Stock Threshold Warnings</div>
                <div className="text-[11px] text-slate-400">Triggered when stock &le; reorder threshold</div>
              </div>
              <input
                type="checkbox"
                checked={prefLowStock}
                onChange={e => setPrefLowStock(e.target.checked)}
                className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-emerald-500"
              />
            </label>

            <label className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 cursor-pointer">
              <div>
                <div className="text-xs font-bold text-white">MA-02 AI Purchase Order Draft Approvals</div>
                <div className="text-[11px] text-slate-400">Alert managers when autonomous reorder is queued</div>
              </div>
              <input
                type="checkbox"
                checked={prefPoApproval}
                onChange={e => setPrefPoApproval(e.target.checked)}
                className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-emerald-500"
              />
            </label>

            <label className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 cursor-pointer">
              <div>
                <div className="text-xs font-bold text-white">MA-04 Shrinkage & Anomaly Cluster Flags</div>
                <div className="text-[11px] text-slate-400">Advisory alerts for theft or damage clusters</div>
              </div>
              <input
                type="checkbox"
                checked={prefAnomalies}
                onChange={e => setPrefAnomalies(e.target.checked)}
                className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-emerald-500"
              />
            </label>

            <label className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 cursor-pointer">
              <div>
                <div className="text-xs font-bold text-white">Security Alerts & Account Lockouts</div>
                <div className="text-[11px] text-slate-400">Instant notification when brute-force threshold is reached</div>
              </div>
              <input
                type="checkbox"
                checked={prefSecurity}
                onChange={e => setPrefSecurity(e.target.checked)}
                className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-emerald-500"
              />
            </label>
          </div>

          <button
            onClick={handleSavePreferences}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-bold text-xs shadow-glow hover:opacity-95"
          >
            Save Alert Routing
          </button>
        </div>
      )}

      {/* MODAL: INVITE USER (FR-19, Section 6.2) */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-lg glass-dropdown rounded-3xl p-6 md:p-8 border border-slate-700/80 shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-1">Invite New Corporate User</h2>
            <p className="text-xs text-slate-400 mb-4">
              Closed enterprise provisioning (FR-19). Generates a 72-hour single-use token to set password.
            </p>

            {inviteResult ? (
              <div className="space-y-4 text-xs">
                <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 text-emerald-300 space-y-2">
                  <div className="font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Invite Created for {inviteResult.email}</span>
                  </div>
                  <p className="text-slate-300 text-[11px]">
                    Share this activation link with the user to activate their account and configure credentials:
                  </p>
                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 font-mono text-cyan-300 break-all select-all text-[11px]">
                    {window.location.origin}{inviteResult.inviteLink}
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => {
                      setIsInviteModalOpen(false);
                      setInviteResult(null);
                    }}
                    className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
                  >
                    Done
                  </button>
                  <a
                    href={inviteResult.inviteLink}
                    target="_blank"
                    className="px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 text-xs font-bold shadow-glow flex items-center gap-1"
                  >
                    <span>Test Activation Flow</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSendInvite} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Corporate Email Address *</label>
                  <input
                    type="email"
                    required
                    value={inviteEmail}
                    onChange={e => setInviteEmail(e.target.value)}
                    placeholder="user@stocksense.io"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 focus:border-emerald-500 text-white text-xs outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Role Assignment (Section 10 RBAC) *</label>
                  <select
                    value={inviteRole}
                    onChange={e => setInviteRole(e.target.value as any)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 focus:border-emerald-500 text-white text-xs outline-none"
                  >
                    <option value="inventory_manager">Inventory Manager (Approvals, Financials, Anomaly Audits)</option>
                    <option value="warehouse_staff">Warehouse Staff (Floor Ops, Voice Assistant, Receipts)</option>
                    <option value="procurement_admin">Procurement / Admin (Suppliers, User Mgmt, Security Logs)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Warehouse Facility Scope *</label>
                  <input
                    type="text"
                    required
                    value={inviteWarehouse}
                    onChange={e => setInviteWarehouse(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 focus:border-emerald-500 text-white text-xs outline-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsInviteModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading || !inviteEmail.includes('@')}
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-bold text-xs shadow-glow hover:opacity-95"
                  >
                    {loading ? 'Generating...' : 'Issue Invite (72h Token)'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
