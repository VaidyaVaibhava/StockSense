'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useStockSense } from '@/components/providers/StockSenseProvider';
import {
  Boxes,
  AlertTriangle,
  FileCheck2,
  Truck,
  ArrowLeftRight,
  IndianRupee,
  Bot,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronRight,
  Plus,
  TrendingUp,
} from 'lucide-react';
import { Product, Receipt, DeliveryOrder, PurchaseOrderDraft, StockLedger, AnomalyReport } from '@/types';

export default function DashboardPage() {
  const { user, permissions } = useStockSense();

  const [products, setProducts] = useState<Product[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [deliveries, setDeliveries] = useState<DeliveryOrder[]>([]);
  const [poDrafts, setPoDrafts] = useState<PurchaseOrderDraft[]>([]);
  const [ledger, setLedger] = useState<StockLedger[]>([]);
  const [anomalies, setAnomalies] = useState<AnomalyReport[]>([]);
  const [valuationData, setValuationData] = useState<{ total_valuation: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [decisionFeedback, setDecisionFeedback] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    try {
      const [prodRes, recRes, delRes, agtRes, ledgRes] = await Promise.all([
        fetch('/api/v1/products'),
        fetch('/api/v1/operations/receipts'),
        fetch('/api/v1/operations/deliveries'),
        fetch('/api/v1/agents'),
        fetch('/api/v1/ledger'),
      ]);

      if (prodRes.ok) { const d = await prodRes.json(); setProducts(d.products || []); }
      if (recRes.ok) { const d = await recRes.json(); setReceipts(d.receipts || []); }
      if (delRes.ok) { const d = await delRes.json(); setDeliveries(d.deliveries || []); }
      if (agtRes.ok) { const d = await agtRes.json(); setPoDrafts(d.ma02_all_drafts || []); setAnomalies(d.ma04_anomalies || []); }
      if (ledgRes.ok) { const d = await ledgRes.json(); setLedger((d.ledger || []).slice(0, 8)); }

      if (permissions.canViewFinancialValuation) {
        const valRes = await fetch('/api/v1/analytics/valuation');
        if (valRes.ok) { const valData = await valRes.json(); setValuationData(valData); }
      }
    } catch (err) {
      console.error('Dashboard data error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 3000);
    return () => clearInterval(interval);
  }, [permissions.canViewFinancialValuation]);

  const handlePoDecision = async (draftId: string, decision: 'approve' | 'reject') => {
    try {
      const res = await fetch('/api/v1/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent: 'MA-02',
          action: 'decision',
          draftId,
          decision,
          managerNotes: `${decision === 'approve' ? 'Approved' : 'Declined'} via Dashboard Quick Action`,
        }),
      });
      if (res.ok) {
        setDecisionFeedback(`PO ${decision === 'approve' ? 'Approved' : 'Rejected'} successfully.`);
        setTimeout(() => setDecisionFeedback(null), 4000);
        fetchDashboardData();
      }
    } catch (err) {
      console.error('Failed to submit PO decision:', err);
    }
  };

  const totalProductsCount = products.length;
  const lowStockCount = products.filter(p => p.current_stock <= p.reorder_threshold).length;
  const pendingReceiptsCount = receipts.filter(r => r.status === 'draft' || r.status === 'pending_validation').length;
  const pendingDeliveriesCount = deliveries.filter(d => d.status === 'pending' || d.status === 'picking').length;
  const activeBackordersCount = deliveries.filter(d => d.backorder_flag && d.status !== 'shipped').length;
  const pendingPoDrafts = poDrafts.filter(d => d.status === 'pending');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-3">
          <div className="h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-slate-500">Loading dashboard…</p>
        </div>
      </div>
    );
  }

  const kpiCards = [
    { label: 'Total SKUs', value: totalProductsCount, icon: Boxes, color: 'text-blue-600', bg: 'bg-blue-50', sub: 'Catalog items' },
    { label: 'Low Stock', value: lowStockCount, icon: AlertTriangle, color: lowStockCount > 0 ? 'text-amber-600' : 'text-slate-400', bg: lowStockCount > 0 ? 'bg-amber-50' : 'bg-slate-50', sub: '≤ Reorder level' },
    { label: 'Inbound', value: pendingReceiptsCount, icon: FileCheck2, color: 'text-green-600', bg: 'bg-green-50', sub: 'Pending receipts' },
    { label: 'Outbound', value: pendingDeliveriesCount, icon: Truck, color: 'text-indigo-600', bg: 'bg-indigo-50', sub: 'Fulfillment queue' },
    { label: 'Backorders', value: activeBackordersCount, icon: ArrowLeftRight, color: activeBackordersCount > 0 ? 'text-red-600' : 'text-slate-400', bg: activeBackordersCount > 0 ? 'bg-red-50' : 'bg-slate-50', sub: 'Shortfall queued' },
  ];

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800">
            नमस्ते, {user?.name?.split(' ')[0] || 'User'} 👋
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">स्टॉक डैशबोर्ड — Live updates every 3 seconds</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/agents" className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
            <Bot className="h-4 w-4" />
            AI Agents
          </Link>
          <Link href="/operations" className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors">
            <Plus className="h-4 w-4" />
            New Entry
          </Link>
        </div>
      </div>

      {/* Success Feedback */}
      {decisionFeedback && (
        <div className="p-3 rounded-lg bg-green-50 border border-green-200 text-green-800 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{decisionFeedback}</span>
          </div>
          <button onClick={() => setDecisionFeedback(null)} className="text-green-600 hover:text-green-800 text-xs underline">Dismiss</button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {kpiCards.map((kpi) => (
          <div key={kpi.label} className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-sm transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-500 font-medium">{kpi.label}</span>
              <div className={`h-7 w-7 rounded-lg ${kpi.bg} flex items-center justify-center`}>
                <kpi.icon className={`h-3.5 w-3.5 ${kpi.color}`} />
              </div>
            </div>
            <div className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">{kpi.sub}</div>
          </div>
        ))}
      </div>

      {/* Inventory Value — managers/admins only */}
      {permissions.canViewFinancialValuation && (
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <IndianRupee className="h-4 w-4 text-green-600" />
            <span className="text-sm font-semibold text-slate-700">Total Inventory Value (FIFO)</span>
          </div>
          <div className="text-3xl font-bold text-green-700">
            ₹{valuationData ? valuationData.total_valuation.toLocaleString('en-IN') : '—'}
          </div>
          <p className="text-xs text-slate-400 mt-1">Weighted average cost — role restricted (NFR-02)</p>
        </div>
      )}

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left — AI Drafts + Anomalies */}
        <div className="lg:col-span-7 space-y-5">

          {/* MA-02 PO Drafts */}
          <div className="bg-white border border-slate-200 rounded-xl">
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-blue-50 flex items-center justify-center">
                  <Bot className="h-3.5 w-3.5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-800">MA-02 — Reorder Approvals</h3>
                  <p className="text-[11px] text-slate-400">AI suggestions requiring manager sign-off</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {pendingPoDrafts.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700">
                    {pendingPoDrafts.length} Pending
                  </span>
                )}
                <Link href="/agents" className="text-xs text-blue-600 hover:underline flex items-center gap-0.5">
                  View All <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
            </div>

            <div className="p-4">
              {pendingPoDrafts.length === 0 ? (
                <div className="py-8 text-center border border-dashed border-slate-200 rounded-lg">
                  <CheckCircle2 className="h-7 w-7 text-green-400 mx-auto mb-2" />
                  <p className="text-sm text-slate-500">No pending PO drafts. All buffers healthy.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingPoDrafts.slice(0, 3).map(draft => (
                    <div key={draft.id} className="p-3.5 border border-slate-200 rounded-lg space-y-2 hover:border-slate-300 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-slate-800">{draft.product_name}</span>
                            <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{draft.sku}</span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Supplier: <b className="text-slate-700">{draft.supplier_name}</b> · Confidence: <b className="text-blue-600">{draft.confidence_score}%</b>
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-sm font-bold text-slate-800">{draft.recommended_qty} Units</div>
                          <div className="text-xs text-slate-500">₹{draft.estimated_total.toLocaleString('en-IN')}</div>
                        </div>
                      </div>

                      <p className="text-xs text-slate-600 bg-slate-50 p-2 rounded border border-slate-100">
                        💡 {draft.reasoning}
                      </p>

                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[10px] text-slate-400 font-mono">PO: {draft.po_number}</span>
                        {permissions.canApprovePODrafts ? (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handlePoDecision(draft.id, 'reject')}
                              className="px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 text-xs font-medium flex items-center gap-1 transition-colors"
                            >
                              <XCircle className="h-3.5 w-3.5" />
                              Decline
                            </button>
                            <button
                              onClick={() => handlePoDecision(draft.id, 'approve')}
                              className="px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-semibold flex items-center gap-1 transition-colors"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Approve
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">Manager sign-off required</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* MA-04 Anomalies */}
          <div className="bg-white border border-slate-200 rounded-xl">
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-red-50 flex items-center justify-center">
                  <ShieldAlert className="h-3.5 w-3.5 text-red-600" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-800">MA-04 — Shrinkage Auditor</h3>
                  <p className="text-[11px] text-slate-400">Stock anomaly pattern scan (damage / theft / miscount)</p>
                </div>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${anomalies.length > 0 ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-500'}`}>
                {anomalies.length} Flagged
              </span>
            </div>
            <div className="p-4">
              {anomalies.length === 0 ? (
                <p className="text-sm text-slate-500 py-4 text-center">No shrinkage clusters detected in the last 30 days.</p>
              ) : (
                <div className="space-y-3">
                  {anomalies.map(anom => (
                    <div key={anom.id} className="p-3 border border-red-100 bg-red-50 rounded-lg space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-red-800">{anom.title}</span>
                        <span className="text-[10px] font-bold text-red-600 uppercase bg-red-100 px-2 py-0.5 rounded">{anom.severity}</span>
                      </div>
                      <p className="text-xs text-slate-600">{anom.description}</p>
                      <div className="text-xs text-blue-700 bg-blue-50 border border-blue-100 p-2 rounded">
                        <b>Advisory:</b> {anom.recommendation}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right — Stock Ledger */}
        <div className="lg:col-span-5">
          <div className="bg-white border border-slate-200 rounded-xl h-full">
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-slate-500" />
                <h3 className="text-sm font-semibold text-slate-800">Immutable Stock Ledger</h3>
              </div>
              <span className="text-[10px] text-green-700 font-medium bg-green-50 px-2 py-0.5 rounded-full border border-green-200">
                Audit Trail
              </span>
            </div>

            <div className="p-3 space-y-2 overflow-y-auto max-h-[520px]">
              {ledger.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-8">No ledger entries yet.</p>
              ) : (
                ledger.map(entry => {
                  const isPositive = entry.quantity_delta > 0;
                  const isNeutral = entry.quantity_delta === 0;
                  return (
                    <div key={entry.id} className="p-3 border border-slate-100 rounded-lg hover:border-slate-200 transition-colors text-xs space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-800 truncate max-w-[160px]">{entry.product_name}</span>
                        <span className={`font-mono font-bold px-2 py-0.5 rounded text-xs ${
                          isNeutral ? 'bg-slate-100 text-slate-600'
                          : isPositive ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                        }`}>
                          {isNeutral ? '0' : isPositive ? `+${entry.quantity_delta}` : entry.quantity_delta}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span className="font-mono text-blue-600">{entry.event_type}</span>
                        <span>Balance: <b className="text-slate-700">{entry.resulting_balance}</b></span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100">
                        <span>By {entry.actor_name}</span>
                        <span>{new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="p-3 border-t border-slate-100 text-center">
              <Link href="/operations" className="text-xs text-blue-600 hover:underline">
                View full Ledger & Operations →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
