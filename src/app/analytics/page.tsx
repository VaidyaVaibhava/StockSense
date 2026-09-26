'use client';

import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  IndianRupee,
  FileSpreadsheet,
  Download,
  Building,
  ShieldAlert,
  CheckCircle2,
  PieChart,
  BarChart3,
} from 'lucide-react';
import { useStockSense } from '@/components/providers/StockSenseProvider';
import { Supplier, StockLedger } from '@/types';

const thCls = 'py-3 px-4 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500 bg-slate-50 border-b border-slate-200';
const tdCls = 'py-3 px-4 text-sm';

export default function AnalyticsPage() {
  const { user, permissions } = useStockSense();

  const [valuationData, setValuationData] = useState<any | null>(null);
  const [movementDays, setMovementDays] = useState(90);
  const [movementRecords, setMovementRecords] = useState<StockLedger[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [activeTab, setActiveTab] = useState<'valuation' | 'movements' | 'suppliers'>('valuation');
  const [loading, setLoading] = useState(true);

  const isRestricted = user?.role === 'warehouse_staff';

  const fetchAnalytics = async () => {
    if (isRestricted) return;
    try {
      const [valRes, movRes, supRes] = await Promise.all([
        fetch('/api/v1/analytics/valuation'),
        fetch(`/api/v1/analytics/movement-history?days=${movementDays}`),
        fetch('/api/v1/analytics/supplier-scorecard'),
      ]);
      if (valRes.ok) setValuationData(await valRes.json());
      if (movRes.ok) { const d = await movRes.json(); setMovementRecords(d.records || []); }
      if (supRes.ok) { const d = await supRes.json(); setSuppliers(d.scorecards || []); }
    } catch (err) { console.error('Analytics load error:', err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAnalytics(); }, [movementDays, isRestricted]);

  const handleExportCsv = () => {
    window.location.href = `/api/v1/analytics/movement-history?days=${movementDays}&format=csv`;
  };

  if (isRestricted) {
    return (
      <div className="py-20 text-center space-y-4 max-w-lg mx-auto">
        <div className="h-14 w-14 rounded-full bg-red-50 border border-red-200 flex items-center justify-center text-red-500 mx-auto">
          <ShieldAlert className="h-7 w-7" />
        </div>
        <h2 className="text-lg font-bold text-slate-800">Access Restricted</h2>
        <p className="text-sm text-slate-500 leading-relaxed">
          Warehouse Staff do not have access to financial valuation or executive analytics (NFR-02, Section 10). Please log in with an Inventory Manager or Procurement Admin account.
        </p>
      </div>
    );
  }

  const tabs = [
    { id: 'valuation', label: 'Inventory Valuation', icon: IndianRupee },
    { id: 'movements', label: 'Movement History', icon: FileSpreadsheet },
    { id: 'suppliers', label: 'Supplier Scorecards', icon: Building },
  ] as const;

  return (
    <div className="space-y-5 pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800">विश्लेषण — Analytics & Valuation</h1>
          <p className="text-sm text-slate-500 mt-0.5">FIFO valuation · Movement history · Supplier scorecards</p>
        </div>
        {activeTab === 'movements' && (
          <button onClick={handleExportCsv} className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors">
            <Download className="h-4 w-4" />
            Export {movementDays}d CSV
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === t.id ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <t.icon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {/* TAB 1: INVENTORY VALUATION */}
      {activeTab === 'valuation' && valuationData && (
        <div className="space-y-5">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Total Portfolio Value</p>
              <div className="text-3xl font-bold text-green-700 font-mono mt-1">
                ₹{valuationData.total_valuation.toLocaleString('en-IN')}
              </div>
              <div className="text-xs text-green-600 mt-1 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> {valuationData.reconciliation_status}
              </div>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Method</p>
              <div className="text-xl font-bold text-slate-800 mt-1">{valuationData.valuation_method}</div>
              <div className="text-xs text-slate-400 mt-1">GAAP / IFRS Compliant</div>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">SKU Coverage</p>
              <div className="text-2xl font-bold text-slate-800 font-mono mt-1">{valuationData.sku_breakdowns.length}</div>
              <div className="text-xs text-slate-400 mt-1">{valuationData.category_breakdown.length} categories tracked</div>
            </div>
          </div>

          {/* Category bars */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
              <PieChart className="h-4 w-4 text-blue-500" /> Capital Allocation by Category
            </h3>
            <div className="space-y-3">
              {valuationData.category_breakdown.map((cat: any) => (
                <div key={cat.category} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-700">{cat.category}</span>
                    <span className="font-mono text-slate-600">₹{cat.total_value.toLocaleString('en-IN')} · {cat.percentage}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${cat.percentage}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* SKU Table */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-800">SKU Valuation Breakdown</span>
              <span className="text-[10px] text-slate-400 font-mono">Sum reconciles within 0.00% tolerance</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className={thCls}>SKU / Item</th>
                    <th className={thCls}>Category</th>
                    <th className={thCls + ' text-center'}>Stock</th>
                    <th className={thCls + ' text-right'}>Unit Cost</th>
                    <th className={thCls + ' text-right'}>Extended Value</th>
                    <th className={thCls + ' text-center'}>Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {valuationData.sku_breakdowns.map((item: any) => (
                    <tr key={item.sku} className="hover:bg-slate-50 transition-colors">
                      <td className={tdCls}>
                        <div className="font-semibold text-slate-800">{item.name}</div>
                        <div className="text-[10px] font-mono text-blue-600">{item.sku}</div>
                      </td>
                      <td className={tdCls + ' text-slate-500 text-xs'}>{item.category}</td>
                      <td className={tdCls + ' text-center font-mono font-bold text-slate-800'}>{item.current_stock} {item.uom}</td>
                      <td className={tdCls + ' text-right font-mono text-slate-600 text-xs'}>₹{item.unit_cost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      <td className={tdCls + ' text-right font-mono font-bold text-green-700'}>₹{item.total_valuation.toLocaleString('en-IN')}</td>
                      <td className={tdCls + ' text-center'}>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${item.status === 'low_stock' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                          {item.status === 'low_stock' ? 'Low Stock' : 'Healthy'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MOVEMENT HISTORY */}
      {activeTab === 'movements' && (
        <div className="space-y-4">
          {/* Filter bar */}
          <div className="bg-white border border-slate-200 rounded-xl p-3 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-600">Time Window:</span>
              {[30, 60, 90, 180].map(days => (
                <button
                  key={days}
                  onClick={() => setMovementDays(days)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    movementDays === days ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {days}d
                </button>
              ))}
            </div>
            <span className="text-xs text-slate-500 font-mono">{movementRecords.length} events</span>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className={thCls}>Timestamp</th>
                    <th className={thCls}>Event</th>
                    <th className={thCls}>SKU / Item</th>
                    <th className={thCls + ' text-center'}>Delta</th>
                    <th className={thCls + ' text-center'}>Balance</th>
                    <th className={thCls}>Reference</th>
                    <th className={thCls}>Actor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-xs">
                  {movementRecords.map(rec => (
                    <tr key={rec.id} className="hover:bg-slate-50 transition-colors">
                      <td className={tdCls + ' text-slate-400 text-[11px]'}>{new Date(rec.timestamp).toLocaleString('en-IN')}</td>
                      <td className={tdCls}>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700">{rec.event_type}</span>
                      </td>
                      <td className={tdCls}>
                        <div className="font-sans font-semibold text-slate-800">{rec.product_name}</div>
                        <div className="text-[10px] text-blue-600">{rec.sku}</div>
                      </td>
                      <td className={tdCls + ' text-center font-bold'}>
                        <span className={rec.quantity_delta > 0 ? 'text-green-700' : 'text-red-600'}>
                          {rec.quantity_delta > 0 ? `+${rec.quantity_delta}` : rec.quantity_delta}
                        </span>
                      </td>
                      <td className={tdCls + ' text-center font-bold text-slate-800'}>{rec.resulting_balance}</td>
                      <td className={tdCls + ' text-slate-400 text-[11px]'}>{rec.reference_id}</td>
                      <td className={tdCls + ' font-sans text-slate-600'}>{rec.actor_name}</td>
                    </tr>
                  ))}
                  {movementRecords.length === 0 && (
                    <tr><td colSpan={7} className="py-10 text-center text-slate-400 font-sans">No movement records in this window.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SUPPLIER SCORECARDS */}
      {activeTab === 'suppliers' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {suppliers.map(s => (
            <div key={s.id} className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-800">{s.name}</h3>
                  <p className="text-xs text-slate-400 font-mono">{s.contact_email}</p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                  s.status === 'preferred' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                }`}>
                  {s.status}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-slate-50 rounded-lg p-3">
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">On-Time</div>
                  <div className="text-xl font-bold text-green-700 font-mono">{s.on_time_rate}%</div>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">Short-Ship</div>
                  <div className="text-xl font-bold text-amber-600 font-mono">{s.short_ship_rate}%</div>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">Lead Var.</div>
                  <div className="text-xl font-bold text-slate-800 font-mono">±{s.lead_time_variance_days}d</div>
                </div>
              </div>

              <p className="text-xs text-slate-500 leading-relaxed">
                Avg lead time: <b className="text-slate-700">{s.avg_lead_time_days} days</b>. Scores feed into MA-02 safety-stock calculations.
              </p>
            </div>
          ))}
          {suppliers.length === 0 && <p className="text-sm text-slate-400 text-center py-10">No supplier scorecards yet.</p>}
        </div>
      )}
    </div>
  );
}
