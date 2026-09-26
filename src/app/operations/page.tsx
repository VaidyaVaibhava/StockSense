'use client';

import React, { useState, useEffect } from 'react';
import {
  Truck,
  FileCheck2,
  ArrowLeftRight,
  ClipboardList,
  Plus,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Package,
  Bot,
  Send,
  X,
} from 'lucide-react';
import { Receipt, DeliveryOrder, InternalTransfer, StockAdjustment, Product, Supplier } from '@/types';
import { useStockSense } from '@/components/providers/StockSenseProvider';

// ---- Shared style helpers ---------------------------------------------------
const INPUT = 'w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors';
const LABEL = 'block text-xs font-semibold text-slate-600 mb-1';
const BTN_PRIMARY = 'px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
const BTN_SECONDARY = 'px-4 py-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-medium transition-colors';
const BADGE_STATUS = (status: string) => {
  const map: Record<string, string> = {
    validated: 'bg-green-100 text-green-700',
    shipped: 'bg-green-100 text-green-700',
    pending_validation: 'bg-amber-100 text-amber-700',
    pending: 'bg-amber-100 text-amber-700',
    picking: 'bg-blue-100 text-blue-700',
    draft: 'bg-slate-100 text-slate-600',
    cancelled: 'bg-red-100 text-red-700',
  };
  return map[status] || 'bg-slate-100 text-slate-500';
};

// ---- Modal Wrapper ----------------------------------------------------------
function Modal({ title, subtitle, onClose, children }: { title: string; subtitle?: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl shadow-xl">
        <div className="flex items-start justify-between p-5 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-800">{title}</h2>
            {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors ml-4">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

// ---- Main Component ---------------------------------------------------------
export default function OperationsPage() {
  const { user, permissions } = useStockSense();

  const [activeTab, setActiveTab] = useState<'receipts' | 'deliveries' | 'transfers' | 'adjustments'>('receipts');
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [deliveries, setDeliveries] = useState<DeliveryOrder[]>([]);
  const [transfers, setTransfers] = useState<InternalTransfer[]>([]);
  const [adjustments, setAdjustments] = useState<StockAdjustment[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);

  const [trfSku, setTrfSku] = useState('');
  const [trfQty, setTrfQty] = useState(10);
  const [trfFrom, setTrfFrom] = useState('');
  const [trfTo, setTrfTo] = useState('Rack-B2-Staging');

  const [adjSku, setAdjSku] = useState('');
  const [adjReason, setAdjReason] = useState<'damage' | 'theft' | 'miscount' | 'expiry' | 'other'>('miscount');
  const [adjPhysicalCount, setAdjPhysicalCount] = useState<number>(0);
  const [adjNotes, setAdjNotes] = useState('');

  const [delivCustomer, setDelivCustomer] = useState('');
  const [delivDestination, setDelivDestination] = useState('');
  const [delivSku, setDelivSku] = useState('');
  const [delivQty, setDelivQty] = useState(10);

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchOperationsData = async () => {
    try {
      const [recRes, delRes, trfRes, adjRes, prodRes, supRes] = await Promise.all([
        fetch('/api/v1/operations/receipts'),
        fetch('/api/v1/operations/deliveries'),
        fetch('/api/v1/operations/transfers'),
        fetch('/api/v1/operations/adjustments'),
        fetch('/api/v1/products'),
        fetch('/api/v1/suppliers'),
      ]);
      if (recRes.ok) setReceipts((await recRes.json()).receipts || []);
      if (delRes.ok) setDeliveries((await delRes.json()).deliveries || []);
      if (trfRes.ok) setTransfers((await trfRes.json()).transfers || []);
      if (adjRes.ok) setAdjustments((await adjRes.json()).adjustments || []);
      if (prodRes.ok) {
        const pd = await prodRes.json();
        setProducts(pd.products || []);
        if (pd.products?.length > 0) {
          if (!trfSku) { setTrfSku(pd.products[0].sku); setTrfFrom(pd.products[0].location); }
          if (!adjSku) { setAdjSku(pd.products[0].sku); setAdjPhysicalCount(pd.products[0].current_stock); }
          if (!delivSku) setDelivSku(pd.products[0].sku);
        }
      }
      if (supRes.ok) setSuppliers((await supRes.json()).suppliers || []);
    } catch (err) { console.error('Failed to load operations data:', err); }
  };

  useEffect(() => { fetchOperationsData(); }, []);

  const handleTransferSkuChange = (sku: string) => {
    setTrfSku(sku);
    const p = products.find(prod => prod.sku === sku);
    if (p) setTrfFrom(p.location);
  };
  const handleAdjustmentSkuChange = (sku: string) => {
    setAdjSku(sku);
    const p = products.find(prod => prod.sku === sku);
    if (p) setAdjPhysicalCount(p.current_stock);
  };

  const handleValidateReceipt = async (receiptId: string) => {
    setLoading(true); setFeedback(null);
    try {
      const res = await fetch('/api/v1/operations/receipts', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ receipt_id: receiptId }) });
      const data = await res.json();
      setFeedback(res.ok ? { type: 'success', message: data.message } : { type: 'error', message: data.error || 'Validation failed' });
      if (res.ok) fetchOperationsData();
    } catch { setFeedback({ type: 'error', message: 'Failed to validate receipt' }); }
    finally { setLoading(false); }
  };

  const handleShipDelivery = async (deliveryId: string) => {
    setLoading(true); setFeedback(null);
    try {
      const res = await fetch('/api/v1/operations/deliveries', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ delivery_id: deliveryId, status: 'shipped' }) });
      const data = await res.json();
      setFeedback(res.ok ? { type: 'success', message: `Order ${data.delivery.order_number} shipped. Ledger decremented.` } : { type: 'error', message: data.error });
      if (res.ok) fetchOperationsData();
    } catch { setFeedback({ type: 'error', message: 'Failed to ship delivery' }); }
    finally { setLoading(false); }
  };

  const handleExecuteTransfer = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setFeedback(null);
    try {
      const res = await fetch('/api/v1/operations/transfers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sku: trfSku, quantity: trfQty, from_location: trfFrom, to_location: trfTo, initiated_via: 'ui' }) });
      const data = await res.json();
      if (!res.ok) { setFeedback({ type: 'error', message: data.error || 'Transfer failed' }); }
      else { setFeedback({ type: 'success', message: `Transfer ${data.transfer.transfer_number}: ${trfQty} units moved ${trfFrom} → ${trfTo}.` }); setIsTransferModalOpen(false); fetchOperationsData(); }
    } catch { setFeedback({ type: 'error', message: 'Transfer failed' }); }
    finally { setLoading(false); }
  };

  const handleExecuteAdjustment = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setFeedback(null);
    try {
      const res = await fetch('/api/v1/operations/adjustments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sku: adjSku, reason_code: adjReason, physical_count: adjPhysicalCount, notes: adjNotes }) });
      const data = await res.json();
      if (!res.ok) { setFeedback({ type: 'error', message: data.error }); }
      else { const delta = data.adjustment.delta; setFeedback({ type: 'success', message: `Adjustment: ${delta > 0 ? '+' : ''}${delta} posted to ledger. Reason: ${adjReason.toUpperCase()}.` }); setIsAdjustmentModalOpen(false); setAdjNotes(''); fetchOperationsData(); }
    } catch { setFeedback({ type: 'error', message: 'Adjustment failed' }); }
    finally { setLoading(false); }
  };

  const handleCreateDelivery = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setFeedback(null);
    try {
      const res = await fetch('/api/v1/operations/deliveries', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ customer_ref: delivCustomer, destination: delivDestination, line_items: [{ sku: delivSku, ordered_qty: delivQty }] }) });
      const data = await res.json();
      if (res.ok) { const bo = data.delivery.backorder_flag ? ` (Backorder: ${data.delivery.backorder_shortfall} units queued to MA-02)` : ''; setFeedback({ type: 'success', message: `Delivery ${data.delivery.order_number} created${bo}.` }); setIsDeliveryModalOpen(false); setDelivCustomer(''); fetchOperationsData(); }
      else { setFeedback({ type: 'error', message: data.error }); }
    } catch { setFeedback({ type: 'error', message: 'Delivery creation failed' }); }
    finally { setLoading(false); }
  };

  const tabs = [
    { id: 'receipts', label: 'Inbound Receipts', icon: FileCheck2, count: receipts.length, color: 'text-green-600' },
    { id: 'deliveries', label: 'Deliveries', icon: Truck, count: deliveries.length, color: 'text-indigo-600' },
    { id: 'transfers', label: 'Transfers', icon: ArrowLeftRight, count: transfers.length, color: 'text-cyan-600' },
    { id: 'adjustments', label: 'Adjustments', icon: ClipboardList, count: adjustments.length, color: 'text-amber-600' },
  ] as const;

  const thCls = 'py-3 px-4 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500 bg-slate-50 border-b border-slate-200';
  const tdCls = 'py-3 px-4 text-sm';

  return (
    <div className="space-y-5 pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800">गोदाम संचालन — Warehouse Operations</h1>
          <p className="text-sm text-slate-500 mt-0.5">Receipts · Deliveries · Transfers · Stock Adjustments</p>
        </div>
        <div>
          {activeTab === 'receipts' && (
            <button onClick={() => setIsReceiptModalOpen(true)} className={BTN_PRIMARY + ' flex items-center gap-1.5'}>
              <Plus className="h-4 w-4" /> Manual Receipt
            </button>
          )}
          {activeTab === 'deliveries' && (
            <button onClick={() => setIsDeliveryModalOpen(true)} className={BTN_PRIMARY + ' flex items-center gap-1.5'}>
              <Plus className="h-4 w-4" /> Create Delivery
            </button>
          )}
          {activeTab === 'transfers' && (
            <button onClick={() => setIsTransferModalOpen(true)} className={BTN_PRIMARY + ' flex items-center gap-1.5'}>
              <ArrowLeftRight className="h-4 w-4" /> New Transfer
            </button>
          )}
          {activeTab === 'adjustments' && (
            <button onClick={() => setIsAdjustmentModalOpen(true)} className={BTN_PRIMARY + ' flex items-center gap-1.5'}>
              <ClipboardList className="h-4 w-4" /> Record Adjustment
            </button>
          )}
        </div>
      </div>

      {/* Feedback banner */}
      {feedback && (
        <div className={`p-3 rounded-lg flex items-center justify-between text-sm border ${
          feedback.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
            {feedback.message}
          </div>
          <button onClick={() => setFeedback(null)} className="text-xs underline opacity-70 hover:opacity-100">Dismiss</button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id as any)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === t.id ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <t.icon className={`h-3.5 w-3.5 ${activeTab === t.id ? t.color : ''}`} />
            <span className="hidden sm:inline">{t.label}</span>
            <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded-full font-mono">{t.count}</span>
          </button>
        ))}
      </div>

      {/* Table Container */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">

        {/* TAB 1: RECEIPTS */}
        {activeTab === 'receipts' && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className={thCls}>Receipt #</th>
                  <th className={thCls}>Supplier</th>
                  <th className={thCls}>PO Reference</th>
                  <th className={thCls}>Source</th>
                  <th className={thCls}>Line Items</th>
                  <th className={thCls + ' text-center'}>Status</th>
                  <th className={thCls + ' text-center'}>Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {receipts.map(r => (
                  <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                    <td className={tdCls}>
                      <span className="font-mono font-bold text-slate-800">{r.receipt_number}</span>
                      <div className="text-[10px] text-slate-400">{new Date(r.created_at).toLocaleDateString('en-IN')}</div>
                    </td>
                    <td className={tdCls + ' font-medium text-slate-700'}>{r.supplier_name}</td>
                    <td className={tdCls + ' font-mono text-slate-500 text-xs'}>{r.po_reference || '—'}</td>
                    <td className={tdCls}>
                      {r.source === 'MA-01' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-700">
                          <Bot className="h-3 w-3" /> MA-01
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400">Manual</span>
                      )}
                    </td>
                    <td className={tdCls}>
                      {r.line_items.map((li, idx) => (
                        <div key={idx} className="text-xs text-slate-600">
                          <span className="font-mono text-blue-600 font-medium">{li.sku}</span> · {li.received_qty} units
                        </div>
                      ))}
                    </td>
                    <td className={tdCls + ' text-center'}>
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${BADGE_STATUS(r.status)}`}>
                        {r.status === 'validated' ? 'Validated' : 'Pending'}
                      </span>
                    </td>
                    <td className={tdCls + ' text-center'}>
                      {r.status === 'pending_validation' ? (
                        <button onClick={() => handleValidateReceipt(r.id)} disabled={loading}
                          className="px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-medium transition-colors disabled:opacity-50">
                          Verify & Post
                        </button>
                      ) : (
                        <span className="text-[10px] text-slate-400">By {r.validated_by || 'Staff'}</span>
                      )}
                    </td>
                  </tr>
                ))}
                {receipts.length === 0 && (
                  <tr><td colSpan={7} className="py-10 text-center text-sm text-slate-400">No receipts found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 2: DELIVERIES */}
        {activeTab === 'deliveries' && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className={thCls}>Order #</th>
                  <th className={thCls}>Customer</th>
                  <th className={thCls}>Destination</th>
                  <th className={thCls}>Items</th>
                  <th className={thCls + ' text-center'}>Backorder</th>
                  <th className={thCls + ' text-center'}>Status</th>
                  <th className={thCls + ' text-center'}>Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {deliveries.map(d => (
                  <tr key={d.id} className="hover:bg-slate-50 transition-colors">
                    <td className={tdCls + ' font-mono font-bold text-slate-800'}>{d.order_number}</td>
                    <td className={tdCls + ' font-medium text-slate-700'}>{d.customer_ref}</td>
                    <td className={tdCls + ' text-slate-500 text-xs'}>{d.destination}</td>
                    <td className={tdCls}>
                      {d.line_items.map((item, idx) => (
                        <div key={idx} className="text-xs text-slate-600">
                          <span className="font-mono text-blue-600 font-medium">{item.sku}</span>: {item.picked_qty}/{item.ordered_qty}
                          {item.allocated_batches && item.allocated_batches.length > 0 && (
                            <div className="text-[10px] text-slate-400">FEFO: {item.allocated_batches[0].batch_number}</div>
                          )}
                        </div>
                      ))}
                    </td>
                    <td className={tdCls + ' text-center'}>
                      {d.backorder_flag ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-100 text-red-700">
                          <AlertTriangle className="h-3 w-3" /> {d.backorder_shortfall}
                        </span>
                      ) : <span className="text-[11px] text-slate-400">None</span>}
                    </td>
                    <td className={tdCls + ' text-center'}>
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${BADGE_STATUS(d.status)}`}>
                        {d.status.toUpperCase()}
                      </span>
                    </td>
                    <td className={tdCls + ' text-center'}>
                      {d.status !== 'shipped' ? (
                        <button onClick={() => handleShipDelivery(d.id)} disabled={loading}
                          className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium transition-colors disabled:opacity-50">
                          Ship & Decrement
                        </button>
                      ) : <span className="text-[10px] text-slate-400">By {d.shipped_by || 'Staff'}</span>}
                    </td>
                  </tr>
                ))}
                {deliveries.length === 0 && (
                  <tr><td colSpan={7} className="py-10 text-center text-sm text-slate-400">No deliveries found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 3: TRANSFERS */}
        {activeTab === 'transfers' && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className={thCls}>Transfer #</th>
                  <th className={thCls}>Item</th>
                  <th className={thCls + ' text-center'}>Qty</th>
                  <th className={thCls}>From</th>
                  <th className={thCls}>To</th>
                  <th className={thCls + ' text-center'}>Via</th>
                  <th className={thCls}>By</th>
                  <th className={thCls + ' text-right'}>Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transfers.map(t => (
                  <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                    <td className={tdCls + ' font-mono font-bold text-slate-800 text-xs'}>{t.transfer_number}</td>
                    <td className={tdCls}>
                      <div className="font-medium text-slate-700">{t.product_name}</div>
                      <div className="text-[10px] font-mono text-blue-600">{t.sku}</div>
                    </td>
                    <td className={tdCls + ' text-center font-mono font-bold text-indigo-700'}>{t.quantity}</td>
                    <td className={tdCls + ' font-mono text-slate-500 text-xs'}>{t.from_location}</td>
                    <td className={tdCls + ' font-mono text-green-700 font-semibold text-xs'}>{t.to_location}</td>
                    <td className={tdCls + ' text-center'}>
                      {t.initiated_via === 'voice' ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-cyan-100 text-cyan-700">Voice (MA-03)</span>
                      ) : <span className="text-[10px] text-slate-400">Manual</span>}
                    </td>
                    <td className={tdCls + ' text-slate-600 text-xs'}>{t.initiated_by}</td>
                    <td className={tdCls + ' text-right font-mono text-[11px] text-slate-400'}>
                      {new Date(t.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                ))}
                {transfers.length === 0 && (
                  <tr><td colSpan={8} className="py-10 text-center text-sm text-slate-400">No transfers found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 4: ADJUSTMENTS */}
        {activeTab === 'adjustments' && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className={thCls}>ID</th>
                  <th className={thCls}>SKU / Item</th>
                  <th className={thCls + ' text-center'}>Delta</th>
                  <th className={thCls + ' text-center'}>Result Stock</th>
                  <th className={thCls + ' text-center'}>Reason</th>
                  <th className={thCls}>Location</th>
                  <th className={thCls}>Staff</th>
                  <th className={thCls + ' text-center'}>MA-04 Flag</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {adjustments.map(a => (
                  <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                    <td className={tdCls + ' font-mono text-slate-500 text-[11px]'}>{a.id.slice(0, 12)}…</td>
                    <td className={tdCls}>
                      <div className="font-medium text-slate-700">{a.product_name}</div>
                      <div className="text-[10px] font-mono text-blue-600">{a.sku}</div>
                    </td>
                    <td className={tdCls + ' text-center'}>
                      <span className={`font-mono font-bold px-2 py-0.5 rounded text-xs ${a.delta > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {a.delta > 0 ? `+${a.delta}` : a.delta}
                      </span>
                    </td>
                    <td className={tdCls + ' text-center font-mono font-bold text-slate-800'}>{a.resulting_stock}</td>
                    <td className={tdCls + ' text-center'}>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase font-mono ${
                        a.reason_code === 'theft' ? 'bg-red-100 text-red-700' :
                        a.reason_code === 'damage' ? 'bg-amber-100 text-amber-700' :
                        'bg-slate-100 text-slate-600'
                      }`}>{a.reason_code}</span>
                    </td>
                    <td className={tdCls + ' font-mono text-slate-500 text-xs'}>{a.location}</td>
                    <td className={tdCls + ' text-slate-600 text-xs'}>{a.user_name}</td>
                    <td className={tdCls + ' text-center'}>
                      {a.flagged_by_MA04 ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-100 text-red-700">Flagged</span>
                      ) : <span className="text-[11px] text-slate-400">Clear</span>}
                    </td>
                  </tr>
                ))}
                {adjustments.length === 0 && (
                  <tr><td colSpan={8} className="py-10 text-center text-sm text-slate-400">No adjustments found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL: TRANSFER */}
      {isTransferModalOpen && (
        <Modal title="Internal Location Transfer" subtitle="Moves stock between locations without altering total inventory." onClose={() => setIsTransferModalOpen(false)}>
          <form onSubmit={handleExecuteTransfer} className="space-y-4">
            <div>
              <label className={LABEL}>Select SKU to Move</label>
              <select value={trfSku} onChange={e => handleTransferSkuChange(e.target.value)} className={INPUT}>
                {products.map(p => <option key={p.id} value={p.sku}>{p.sku} — {p.name} ({p.current_stock} {p.uom} @ {p.location})</option>)}
              </select>
            </div>
            <div>
              <label className={LABEL}>Quantity</label>
              <input type="number" min={1} required value={trfQty} onChange={e => setTrfQty(parseInt(e.target.value) || 1)} className={INPUT} />
              <p className="text-[10px] text-slate-400 mt-1">Transfer is rejected if quantity exceeds available location stock (FR-10).</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={LABEL}>From Location</label>
                <input type="text" required value={trfFrom} onChange={e => setTrfFrom(e.target.value)} className={INPUT} />
              </div>
              <div>
                <label className={LABEL}>To Location</label>
                <input type="text" required value={trfTo} onChange={e => setTrfTo(e.target.value)} className={INPUT} />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setIsTransferModalOpen(false)} className={BTN_SECONDARY}>Cancel</button>
              <button type="submit" disabled={loading} className={BTN_PRIMARY}>{loading ? 'Moving…' : 'Commit Transfer'}</button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL: ADJUSTMENT */}
      {isAdjustmentModalOpen && (
        <Modal title="Reconcile Physical Inventory" subtitle="Mandatory reason code required. Patterns monitored by MA-04." onClose={() => setIsAdjustmentModalOpen(false)}>
          <form onSubmit={handleExecuteAdjustment} className="space-y-4">
            <div>
              <label className={LABEL}>Select Item</label>
              <select value={adjSku} onChange={e => handleAdjustmentSkuChange(e.target.value)} className={INPUT}>
                {products.map(p => <option key={p.id} value={p.sku}>{p.sku} — {p.name} (Currently {p.current_stock} {p.uom})</option>)}
              </select>
            </div>
            <div>
              <label className={LABEL}>Physical Count (actual units on floor)</label>
              <input type="number" min={0} required value={adjPhysicalCount} onChange={e => setAdjPhysicalCount(parseInt(e.target.value) || 0)} className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>Reason Code (FR-11) *</label>
              <select value={adjReason} onChange={e => setAdjReason(e.target.value as any)} className={INPUT}>
                <option value="damage">Damage</option>
                <option value="theft">Theft / Shrinkage</option>
                <option value="miscount">Miscount (Cycle Count)</option>
                <option value="expiry">Expiry</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className={LABEL}>Notes</label>
              <textarea rows={2} value={adjNotes} onChange={e => setAdjNotes(e.target.value)} placeholder="Auditor notes, bin findings…" className={INPUT} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setIsAdjustmentModalOpen(false)} className={BTN_SECONDARY}>Cancel</button>
              <button type="submit" disabled={loading} className={BTN_PRIMARY}>{loading ? 'Reconciling…' : 'Record Reconciliation'}</button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL: CREATE DELIVERY */}
      {isDeliveryModalOpen && (
        <Modal title="Create Delivery Order" subtitle="Automatic backorder detection and FEFO batch allocation (FR-09/FR-12/FR-13)." onClose={() => setIsDeliveryModalOpen(false)}>
          <form onSubmit={handleCreateDelivery} className="space-y-4">
            <div>
              <label className={LABEL}>Customer / Reference *</label>
              <input type="text" required value={delivCustomer} onChange={e => setDelivCustomer(e.target.value)} placeholder="e.g. Caterpillar India Ltd (PO #CIL-99)" className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>Shipping Destination</label>
              <input type="text" value={delivDestination} onChange={e => setDelivDestination(e.target.value)} placeholder="e.g. MIDC Plant, Pune" className={INPUT} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={LABEL}>SKU</label>
                <select value={delivSku} onChange={e => setDelivSku(e.target.value)} className={INPUT}>
                  {products.map(p => <option key={p.id} value={p.sku}>{p.sku} ({p.current_stock} avail)</option>)}
                </select>
              </div>
              <div>
                <label className={LABEL}>Quantity</label>
                <input type="number" min={1} required value={delivQty} onChange={e => setDelivQty(parseInt(e.target.value) || 1)} className={INPUT} />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setIsDeliveryModalOpen(false)} className={BTN_SECONDARY}>Cancel</button>
              <button type="submit" disabled={loading || !delivCustomer} className={BTN_PRIMARY}>{loading ? 'Submitting…' : 'Queue Delivery'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
