import { getDb, saveDb } from '../db';
import { PurchaseOrderDraft } from '@/types';

export interface ReorderEvaluationSummary {
  evaluated_count: number;
  drafts_generated: number;
  drafts: PurchaseOrderDraft[];
}

export function evaluatePredictiveReordering(): ReorderEvaluationSummary {
  const db = getDb();
  const now = new Date();
  const generatedDrafts: PurchaseOrderDraft[] = [];

  for (const product of db.products) {
    if (product.is_archived) continue;

    // Check if an open pending draft already exists for this SKU
    const existingPending = db.po_drafts.find(
      d => d.sku === product.sku && d.status === 'pending'
    );
    if (existingPending) continue;

    const supplier = db.suppliers.find(s => s.id === product.supplier_id) || db.suppliers[0];
    
    // Check open backorders for this SKU
    const backorderDeliveries = db.deliveries.filter(
      d => d.status !== 'shipped' && d.status !== 'cancelled' && d.backorder_flag
    );
    let backorderQty = 0;
    for (const d of backorderDeliveries) {
      const item = d.line_items.find(li => li.sku === product.sku);
      if (item) {
        backorderQty += Math.max(0, item.ordered_qty - item.picked_qty);
      }
    }

    const burnRate = product.burn_rate_daily || 2.0;
    const leadTime = supplier.avg_lead_time_days || 7;
    const variance = supplier.lead_time_variance_days || 1.0;
    const effectiveLeadTime = leadTime + variance;
    
    const leadTimeDemand = Math.ceil(burnRate * effectiveLeadTime);
    const safetyBuffer = product.reorder_threshold;
    const projectedShortfall = (leadTimeDemand + safetyBuffer + backorderQty) - product.current_stock;

    // Trigger reorder if current stock <= threshold OR projected shortfall > 0
    if (product.current_stock <= product.reorder_threshold || projectedShortfall > 0) {
      // Economic order quantity recommendation (typically 30-45 days supply + backorders)
      const targetDaysRunway = 35;
      let recommendedQty = Math.ceil(burnRate * targetDaysRunway) + backorderQty;
      
      // Round to convenient multiples (e.g. 5 or 10)
      if (recommendedQty > 20) {
        recommendedQty = Math.ceil(recommendedQty / 5) * 5;
      }

      // Confidence score calculation based on supplier predictability and data recency
      let confidence = 95.0;
      if (supplier.on_time_rate < 90) confidence -= 5.0;
      if (supplier.short_ship_rate > 3.0) confidence -= 3.0;
      confidence = Math.min(99.0, Math.max(82.0, confidence));

      const estimatedTotal = Number((recommendedQty * product.unit_cost).toFixed(2));
      const poNumber = `DRAFT-PO-${now.getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

      const draft: PurchaseOrderDraft = {
        id: `pod_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        po_number: poNumber,
        sku: product.sku,
        product_name: product.name,
        supplier_id: supplier.id,
        supplier_name: supplier.name,
        current_stock: product.current_stock,
        reorder_threshold: product.reorder_threshold,
        recommended_qty: recommendedQty,
        unit_cost: product.unit_cost,
        estimated_total: estimatedTotal,
        status: 'pending',
        source_agent: 'MA-02',
        confidence_score: Number(confidence.toFixed(1)),
        reasoning: `Current stock (${product.current_stock} ${product.uom}) is at or below threshold (${product.reorder_threshold} ${product.uom}). Burn rate is ${burnRate} ${product.uom}/day with ${leadTime}-day supplier lead time (variance ±${variance}d). ${backorderQty > 0 ? `Includes urgent backorder requirement of ${backorderQty} units.` : 'Provides 35-day operational runway buffer.'}`,
        burn_rate_input: burnRate,
        lead_time_input: leadTime,
        backorder_qty: backorderQty,
        created_at: now.toISOString(),
      };

      db.po_drafts.unshift(draft);
      generatedDrafts.push(draft);

      // Notification for Inventory Manager
      db.notifications.unshift({
        id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
        target_role: 'inventory_manager',
        title: `Reorder Draft: ${product.name}`,
        message: `MA-02 drafted PO for ${recommendedQty} ${product.uom} from ${supplier.name} (₹${estimatedTotal.toLocaleString('en-IN')}). Manager approval required.`,
        type: 'po_approval',
        read: false,
        link: '/agents',
        created_at: now.toISOString(),
      });
    }
  }

  if (generatedDrafts.length > 0) {
    saveDb(db);
  }

  return {
    evaluated_count: db.products.length,
    drafts_generated: generatedDrafts.length,
    drafts: generatedDrafts,
  };
}

export function handlePODraftDecision(
  draftId: string,
  decision: 'approve' | 'reject',
  managerName: string,
  managerNotes?: string
): { success: boolean; message: string; draft?: PurchaseOrderDraft } {
  const db = getDb();
  const draft = db.po_drafts.find(d => d.id === draftId);
  if (!draft) {
    return { success: false, message: 'Draft purchase order not found' };
  }

  const now = new Date().toISOString();
  draft.status = decision === 'approve' ? 'approved' : 'rejected';
  draft.reviewed_by = managerName;
  draft.reviewed_at = now;
  draft.manager_notes = managerNotes || (decision === 'approve' ? 'Approved by manager' : 'Rejected by manager');

  // PRD Feedback Loop: If rejected, adjust threshold model
  if (decision === 'reject') {
    const product = db.products.find(p => p.sku === draft.sku);
    if (product) {
      // Rejection signals threshold was too sensitive; slightly adjust threshold or burn rate expectation
      product.reorder_threshold = Math.max(1, Math.floor(product.reorder_threshold * 0.95));
      product.updated_at = now;
    }
  }

  // Add notification
  db.notifications.unshift({
    id: `notif_${Date.now()}`,
    target_role: 'procurement_admin',
    title: `PO Draft ${draft.po_number} ${decision === 'approve' ? 'Approved' : 'Rejected'}`,
    message: `${managerName} ${decision === 'approve' ? 'approved order for' : 'declined order for'} ${draft.product_name} (₹${draft.estimated_total.toLocaleString('en-IN')}).`,
    type: 'po_approval',
    read: false,
    link: '/agents',
    created_at: now,
  });

  saveDb(db);
  return { success: true, message: `Draft ${draft.po_number} marked as ${draft.status}`, draft };
}
