import { getDb, saveDb } from '../db';
import { Supplier } from '@/types';

export interface ScorecardUpdateSummary {
  suppliers_evaluated: number;
  scorecards: Supplier[];
}

export function updateSupplierPerformanceScores(supplierId?: string): ScorecardUpdateSummary {
  const db = getDb();

  const suppliersToEvaluate = supplierId
    ? db.suppliers.filter(s => s.id === supplierId)
    : db.suppliers;

  for (const supplier of suppliersToEvaluate) {
    const receipts = db.receipts.filter(r => r.supplier_id === supplier.id && r.status === 'validated');
    if (receipts.length === 0) continue;

    let totalOrdered = 0;
    let totalReceived = 0;

    for (const r of receipts) {
      for (const item of r.line_items) {
        totalOrdered += item.ordered_qty || item.received_qty;
        totalReceived += item.received_qty;
      }
    }

    const shortShipRate = totalOrdered > 0
      ? Number(Math.max(0, ((totalOrdered - totalReceived) / totalOrdered) * 100).toFixed(1))
      : supplier.short_ship_rate;

    // Adjust variance dynamically based on performance
    const leadTimeVariance = shortShipRate > 3.0 ? 2.5 : 0.8;
    const onTimeRate = Number(Math.max(75, 100 - (shortShipRate * 1.5) - (leadTimeVariance * 2)).toFixed(1));

    supplier.short_ship_rate = shortShipRate;
    supplier.lead_time_variance_days = leadTimeVariance;
    supplier.on_time_rate = onTimeRate;
    supplier.status = onTimeRate >= 95 ? 'preferred' : (onTimeRate >= 88 ? 'active' : 'under_review');
  }

  saveDb(db);

  return {
    suppliers_evaluated: suppliersToEvaluate.length,
    scorecards: db.suppliers,
  };
}
