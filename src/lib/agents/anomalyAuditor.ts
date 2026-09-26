import { getDb, saveDb } from '../db';
import { AnomalyReport } from '@/types';

export interface AuditSummary {
  scanned_adjustments: number;
  anomalies_detected: number;
  reports: AnomalyReport[];
}

export function runAnomalyAuditor(): AuditSummary {
  const db = getDb();
  const now = new Date();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);

  // Filter adjustments in the last 30 days
  const recentAdjustments = db.adjustments.filter(
    a => new Date(a.timestamp) >= thirtyDaysAgo
  );

  const detectedAnomalies: AnomalyReport[] = [];

  // 1. Group adjustments by SKU and Reason Code
  const skuTheftMap = new Map<string, typeof recentAdjustments>();
  const zoneDamageMap = new Map<string, typeof recentAdjustments>();

  for (const adj of recentAdjustments) {
    if (adj.reason_code === 'theft') {
      const list = skuTheftMap.get(adj.sku) || [];
      list.push(adj);
      skuTheftMap.set(adj.sku, list);
    } else if (adj.reason_code === 'damage') {
      const zoneKey = adj.location.split('-')[0] || 'Zone-General';
      const list = zoneDamageMap.get(zoneKey) || [];
      list.push(adj);
      zoneDamageMap.set(zoneKey, list);
    }
  }

  // Check for theft clusters (>= 2 theft adjustments on the same SKU in 30 days)
  for (const [sku, adjList] of Array.from(skuTheftMap.entries())) {
    if (adjList.length >= 2) {
      const product = db.products.find(p => p.sku === sku);
      const totalLossQty = adjList.reduce((acc, curr) => acc + Math.abs(curr.delta), 0);
      const unitCost = product?.unit_cost || 50;
      const totalDollarLoss = totalLossQty * unitCost;

      const reportId = `anom_theft_${sku}_${Date.now()}`;
      const report: AnomalyReport = {
        id: reportId,
        detected_at: now.toISOString(),
        title: `Theft Shrinkage Cluster: ${product?.name || sku}`,
        severity: totalDollarLoss > 300 ? 'high' : 'medium',
        zone: adjList[0].location,
        sku: sku,
        pattern_type: 'recurring_theft',
        description: `Detected ${adjList.length} unaccounted shrinkage adjustments marked as theft within 30 days. Total loss: ${totalLossQty} units (₹${totalDollarLoss.toLocaleString('en-IN')}).`,
        recommendation: `Conduct physical cycle count of ${adjList[0].location}; cross-reference facility access card swipes for timestamps of affected adjustments.`,
        affected_adjustments: adjList.map(a => a.id),
        status: 'active',
      };

      // Flag the underlying adjustments
      for (const a of adjList) {
        a.flagged_by_MA04 = true;
      }

      detectedAnomalies.push(report);
    }
  }

  // Check for damage clusters (>= 3 damage events in the same zone)
  for (const [zone, adjList] of Array.from(zoneDamageMap.entries())) {
    if (adjList.length >= 3) {
      const totalDamaged = adjList.reduce((acc, curr) => acc + Math.abs(curr.delta), 0);
      const reportId = `anom_dmg_${zone}_${Date.now()}`;
      const report: AnomalyReport = {
        id: reportId,
        detected_at: now.toISOString(),
        title: `Material Handling Damage Cluster in ${zone}`,
        severity: 'medium',
        zone: zone,
        sku: adjList[0].sku,
        pattern_type: 'damage_cluster',
        description: `${adjList.length} separate damage write-offs logged in ${zone} totalling ${totalDamaged} units damaged during floor operations.`,
        recommendation: `Inspect forklift aisle clearance and pallet wrapping procedures in ${zone}.`,
        affected_adjustments: adjList.map(a => a.id),
        status: 'active',
      };
      detectedAnomalies.push(report);
    }
  }

  // Deduplicate against existing active anomalies
  const newReports: AnomalyReport[] = [];
  for (const r of detectedAnomalies) {
    const exists = db.anomalies.find(
      existing => existing.sku === r.sku && existing.pattern_type === r.pattern_type && existing.status === 'active'
    );
    if (!exists) {
      db.anomalies.unshift(r);
      newReports.push(r);

      // Create notification
      db.notifications.unshift({
        id: `notif_anom_${Date.now()}`,
        target_role: 'inventory_manager',
        title: `Anomaly Auditor: ${r.title}`,
        message: `${r.description} Advisory recommendation: ${r.recommendation}`,
        type: 'anomaly_flag',
        read: false,
        link: '/agents',
        created_at: now.toISOString(),
      });
    }
  }

  saveDb(db);

  return {
    scanned_adjustments: recentAdjustments.length,
    anomalies_detected: newReports.length,
    reports: db.anomalies,
  };
}
