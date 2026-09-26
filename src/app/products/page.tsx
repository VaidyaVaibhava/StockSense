'use client';

import React, { useState, useEffect } from 'react';
import { Boxes, Plus, Upload, Download, Search, AlertTriangle, Archive, CheckCircle2, AlertCircle, X } from 'lucide-react';
import { Product, Supplier } from '@/types';
import { useStockSense } from '@/components/providers/StockSenseProvider';

const INPUT = 'w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors';
const LABEL = 'block text-xs font-semibold text-slate-600 mb-1';
const BTN_PRIMARY = 'px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors disabled:opacity-50';
const BTN_SECONDARY = 'px-4 py-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-medium transition-colors';
const thCls = 'py-3 px-4 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500 bg-slate-50 border-b border-slate-200';
const tdCls = 'py-3 px-4 text-sm';

export default function ProductsPage() {
  const { user } = useStockSense();
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);

  // Form state
  const [formSku, setFormSku] = useState('');
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('Hydraulics');
  const [formUom, setFormUom] = useState('pcs');
  const [formInitialStock, setFormInitialStock] = useState(50);
  const [formReorderThreshold, setFormReorderThreshold] = useState(20);
  const [formSupplierId, setFormSupplierId] = useState('');
  const [formUnitCost, setFormUnitCost] = useState(15.0);
  const [formUnitPrice, setFormUnitPrice] = useState(30.0);
  const [formLocation, setFormLocation] = useState('Rack-A1-Bin1');
  const [formBatchTracking, setFormBatchTracking] = useState(false);
  const [formBurnRate, setFormBurnRate] = useState(2.0);
  const [csvContent, setCsvContent] = useState('');
  const [csvResults, setCsvResults] = useState<any[] | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      const [prodRes, supRes] = await Promise.all([
        fetch(`/api/v1/products?include_archived=${showArchived}`),
        fetch('/api/v1/suppliers'),
      ]);
      if (prodRes.ok) setProducts((await prodRes.json()).products || []);
      if (supRes.ok) {
        const supData = await supRes.json();
        setSuppliers(supData.suppliers || []);
        if (supData.suppliers?.length > 0 && !formSupplierId) setFormSupplierId(supData.suppliers[0].id);
      }
    } catch (err) { console.error('Products load error:', err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [showArchived]);

  const categories = Array.from(new Set(products.map(p => p.category))).filter(Boolean);
  const filteredProducts = products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase()) || p.location.toLowerCase().includes(search.toLowerCase());
    const matchCat = selectedCategory ? p.category === selectedCategory : true;
    return matchSearch && matchCat;
  });

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault(); setSubmitting(true); setFormError(null);
    try {
      const res = await fetch('/api/v1/products', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sku: formSku, name: formName, category: formCategory, uom: formUom, initial_stock: formInitialStock, reorder_threshold: formReorderThreshold, supplier_id: formSupplierId, unit_cost: formUnitCost, unit_price: formUnitPrice, location: formLocation, batch_tracking_enabled: formBatchTracking, burn_rate_daily: formBurnRate }) });
      const data = await res.json();
      if (!res.ok) { setFormError(data.error || 'Failed to create product'); }
      else { setActionMessage(`Product ${formSku} created and posted to ledger!`); setIsAddModalOpen(false); setFormSku(''); setFormName(''); fetchData(); }
    } catch { setFormError('Network error'); }
    finally { setSubmitting(false); }
  };

  const handleArchive = async (id: string, sku: string) => {
    if (!confirm(`Archive ${sku}? It will be hidden from floor pickers but kept in history.`)) return;
    try {
      const res = await fetch(`/api/v1/products/${id}`, { method: 'DELETE' });
      if (res.ok) { setActionMessage(`${sku} archived (FR-06).`); fetchData(); }
    } catch { console.error('Archive failed'); }
  };

  const handleCsvImport = async () => {
    if (!csvContent.trim()) return; setSubmitting(true); setCsvResults(null);
    try {
      const lines = csvContent.trim().split('\n');
      const rows = [];
      const startIndex = lines[0].toLowerCase().includes('sku') ? 1 : 0;
      for (let i = startIndex; i < lines.length; i++) {
        const p = lines[i].split(',').map(s => s.trim().replace(/^[\"']|[\"']$/g, ''));
        if (p.length >= 2) rows.push({ sku: p[0], name: p[1], category: p[2] || 'General', uom: p[3] || 'pcs', initial_stock: p[4] || 0, reorder_threshold: p[5] || 15, unit_cost: p[6] || 10, unit_price: p[7] || 20, location: p[8] || 'Rack-General' });
      }
      const res = await fetch('/api/v1/products', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'import_csv', rows }) });
      const data = await res.json();
      if (res.ok) { setCsvResults(data.results); setActionMessage(`Imported ${data.imported_count} products via CSV.`); fetchData(); }
      else setFormError(data.error);
    } catch { console.error('CSV import failed'); }
    finally { setSubmitting(false); }
  };

  const handleExportCsv = () => {
    const headers = ['SKU', 'Name', 'Category', 'UOM', 'CurrentStock', 'ReorderThreshold', 'UnitCost', 'UnitPrice', 'Location', 'IsArchived'];
    const rows = products.map(p => [p.sku, `"${p.name.replace(/"/g, '""')}"`, p.category, p.uom, p.current_stock, p.reorder_threshold, p.unit_cost, p.unit_price, `"${p.location}"`, p.is_archived ? 'true' : 'false']);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a'); link.href = url; link.download = `StockSense_Catalog_${new Date().toISOString().split('T')[0]}.csv`; link.click();
  };

  return (
    <div className="space-y-5 pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            उत्पाद सूची — Product Catalog
            <span className="text-xs font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{filteredProducts.length} items</span>
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">SKU management · Batch tracking · Reorder thresholds</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setIsCsvModalOpen(true)} className={BTN_SECONDARY + ' flex items-center gap-1.5 text-sm'}>
            <Upload className="h-4 w-4" /> CSV
          </button>
          <button onClick={handleExportCsv} className={BTN_SECONDARY + ' flex items-center gap-1.5 text-sm'}>
            <Download className="h-4 w-4" /> Export
          </button>
          <button onClick={() => setIsAddModalOpen(true)} className={BTN_PRIMARY + ' flex items-center gap-1.5'}>
            <Plus className="h-4 w-4" /> Add Product
          </button>
        </div>
      </div>

      {/* Success/Error Banner */}
      {actionMessage && (
        <div className="p-3 rounded-lg bg-green-50 border border-green-200 text-green-800 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 shrink-0" />{actionMessage}</div>
          <button onClick={() => setActionMessage(null)} className="text-xs underline opacity-70 hover:opacity-100">Dismiss</button>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-64">
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search SKU, name, location…" className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => setSelectedCategory('')} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${selectedCategory === '' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>All</button>
          {categories.map(cat => (
            <button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${selectedCategory === cat ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{cat}</button>
          ))}
          <label className="flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer pl-2 border-l border-slate-200">
            <input type="checkbox" checked={showArchived} onChange={e => setShowArchived(e.target.checked)} className="rounded border-slate-300" />
            Show Archived
          </label>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className={thCls}>SKU / Item</th>
                <th className={thCls}>Category</th>
                <th className={thCls + ' text-center'}>Stock Level</th>
                <th className={thCls + ' text-center'}>Reorder Point</th>
                <th className={thCls}>Location</th>
                <th className={thCls}>Supplier / Lead Time</th>
                <th className={thCls + ' text-right'}>Cost / Price</th>
                <th className={thCls + ' text-center'}>Status</th>
                <th className={thCls + ' text-center'}>Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.length === 0 ? (
                <tr><td colSpan={9} className="py-12 text-center text-slate-400 text-sm">No products matching your filters.</td></tr>
              ) : filteredProducts.map(product => {
                const isLow = product.current_stock <= product.reorder_threshold;
                const supplier = suppliers.find(s => s.id === product.supplier_id);
                return (
                  <tr key={product.id} className={`hover:bg-slate-50 transition-colors ${product.is_archived ? 'opacity-50' : ''}`}>
                    <td className={tdCls}>
                      <div className="font-semibold text-slate-800">{product.name}</div>
                      <div className="font-mono text-[11px] text-blue-600 flex items-center gap-2 mt-0.5">
                        {product.sku}
                        {product.batch_tracking_enabled && <span className="text-[9px] bg-cyan-50 text-cyan-700 px-1.5 py-0.5 rounded border border-cyan-200 font-sans">Batch</span>}
                      </div>
                    </td>
                    <td className={tdCls + ' text-slate-500 text-xs'}>{product.category}</td>
                    <td className={tdCls + ' text-center font-mono font-bold'}>
                      <span className={`px-2.5 py-1 rounded-lg text-sm ${isLow ? 'bg-amber-100 text-amber-700' : 'text-slate-800'}`}>
                        {product.current_stock} {product.uom}
                      </span>
                    </td>
                    <td className={tdCls + ' text-center font-mono text-slate-500 text-xs'}>{product.reorder_threshold} {product.uom}</td>
                    <td className={tdCls + ' font-mono text-slate-500 text-xs'}>{product.location}</td>
                    <td className={tdCls}>
                      <div className="font-medium text-slate-700 text-xs truncate max-w-[140px]">{supplier?.name || '—'}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{supplier ? `${supplier.avg_lead_time_days}d ±${supplier.lead_time_variance_days}d` : '—'}</div>
                    </td>
                    <td className={tdCls + ' text-right font-mono text-xs'}>
                      <div className="text-slate-800">₹{product.unit_cost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                      <div className="text-slate-400">₹{product.unit_price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                    </td>
                    <td className={tdCls + ' text-center'}>
                      {product.is_archived ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-500">Archived</span>
                      ) : isLow ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-700">
                          <AlertTriangle className="h-3 w-3" /> Low Stock
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-100 text-green-700">Healthy</span>
                      )}
                    </td>
                    <td className={tdCls + ' text-center'}>
                      {!product.is_archived ? (
                        <button onClick={() => handleArchive(product.id, product.sku)} title="Archive product" className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                          <Archive className="h-4 w-4" />
                        </button>
                      ) : <span className="text-[10px] text-slate-400">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: ADD PRODUCT */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between p-5 border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-slate-800">Add New Product (FR-06)</h2>
                <p className="text-xs text-slate-400 mt-0.5">Creates SKU and posts opening balance to immutable ledger.</p>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
            </div>

            <div className="p-5">
              {formError && (
                <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />{formError}
                </div>
              )}
              <form onSubmit={handleCreateProduct} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={LABEL}>SKU Code * (unique)</label>
                    <input type="text" required value={formSku} onChange={e => setFormSku(e.target.value)} placeholder="e.g. SKU-SEN-801" className={INPUT + ' font-mono'} />
                    <p className="text-[10px] text-slate-400 mt-1">Duplicate SKUs are rejected (FR-07)</p>
                  </div>
                  <div>
                    <label className={LABEL}>Product Name *</label>
                    <input type="text" required value={formName} onChange={e => setFormName(e.target.value)} placeholder="e.g. Optical Distance Sensor 0-50m" className={INPUT} />
                  </div>
                  <div>
                    <label className={LABEL}>Category *</label>
                    <input type="text" required value={formCategory} onChange={e => setFormCategory(e.target.value)} placeholder="e.g. Hydraulics, Sensors" className={INPUT} />
                  </div>
                  <div>
                    <label className={LABEL}>Unit of Measure (UOM)</label>
                    <select value={formUom} onChange={e => setFormUom(e.target.value)} className={INPUT}>
                      <option value="pcs">Pieces (pcs)</option>
                      <option value="box">Box</option>
                      <option value="pack">Pack</option>
                      <option value="kg">Kilogram (kg)</option>
                      <option value="pallet">Pallet</option>
                    </select>
                  </div>
                  <div>
                    <label className={LABEL}>Opening Stock</label>
                    <input type="number" min={0} value={formInitialStock} onChange={e => setFormInitialStock(parseInt(e.target.value) || 0)} className={INPUT + ' font-mono'} />
                  </div>
                  <div>
                    <label className={LABEL}>Reorder Threshold *</label>
                    <input type="number" min={1} value={formReorderThreshold} onChange={e => setFormReorderThreshold(parseInt(e.target.value) || 1)} className={INPUT + ' font-mono'} />
                  </div>
                  <div>
                    <label className={LABEL}>Supplier</label>
                    <select value={formSupplierId} onChange={e => setFormSupplierId(e.target.value)} className={INPUT}>
                      {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={LABEL}>Warehouse Location</label>
                    <input type="text" value={formLocation} onChange={e => setFormLocation(e.target.value)} placeholder="e.g. Rack-A1-Bin1" className={INPUT + ' font-mono'} />
                  </div>
                  <div>
                    <label className={LABEL}>Unit Cost (₹)</label>
                    <input type="number" min={0} step={0.01} value={formUnitCost} onChange={e => setFormUnitCost(parseFloat(e.target.value) || 0)} className={INPUT + ' font-mono'} />
                  </div>
                  <div>
                    <label className={LABEL}>Unit Price (₹)</label>
                    <input type="number" min={0} step={0.01} value={formUnitPrice} onChange={e => setFormUnitPrice(parseFloat(e.target.value) || 0)} className={INPUT + ' font-mono'} />
                  </div>
                  <div>
                    <label className={LABEL}>Burn Rate (units/day)</label>
                    <input type="number" min={0.1} step={0.1} value={formBurnRate} onChange={e => setFormBurnRate(parseFloat(e.target.value) || 0.1)} className={INPUT + ' font-mono'} />
                  </div>
                  <div className="flex items-center gap-2 pt-2">
                    <input type="checkbox" id="batchTracking" checked={formBatchTracking} onChange={e => setFormBatchTracking(e.target.checked)} className="rounded border-slate-300" />
                    <label htmlFor="batchTracking" className="text-sm text-slate-600 cursor-pointer">Enable Batch / Lot Tracking</label>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={() => setIsAddModalOpen(false)} className={BTN_SECONDARY}>Cancel</button>
                  <button type="submit" disabled={submitting} className={BTN_PRIMARY}>{submitting ? 'Creating…' : 'Create Product'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CSV IMPORT */}
      {isCsvModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl shadow-xl">
            <div className="flex items-start justify-between p-5 border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-slate-800">CSV Bulk Import (FR-07a)</h2>
                <p className="text-xs text-slate-400 mt-0.5">Format: SKU, Name, Category, UOM, Stock, Reorder, Cost, Price, Location</p>
              </div>
              <button onClick={() => setIsCsvModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              <textarea
                rows={6}
                value={csvContent}
                onChange={e => setCsvContent(e.target.value)}
                placeholder="SKU-NEW-001,New Product,Sensors,pcs,100,20,500.00,1000.00,Rack-A1"
                className={INPUT}
              />
              {csvResults && (
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {csvResults.map((r, i) => (
                    <div key={i} className={`text-xs p-2 rounded ${r.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                      {r.sku}: {r.success ? 'Imported ✓' : r.error}
                    </div>
                  ))}
                </div>
              )}
              <div className="flex justify-end gap-2">
                <button onClick={() => setIsCsvModalOpen(false)} className={BTN_SECONDARY}>Close</button>
                <button onClick={handleCsvImport} disabled={submitting || !csvContent.trim()} className={BTN_PRIMARY}>{submitting ? 'Importing…' : 'Import CSV'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
