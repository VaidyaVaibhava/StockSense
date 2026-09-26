import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { extractAuthUser } from '@/lib/auth';
import { processInboundDocument } from '@/lib/agents/smartIngestion';
import { evaluatePredictiveReordering, handlePODraftDecision } from '@/lib/agents/predictiveReordering';
import { processVoiceOrTextCommand } from '@/lib/agents/conversationalAssistant';
import { runAnomalyAuditor } from '@/lib/agents/anomalyAuditor';
import { runDemandForecasting } from '@/lib/agents/demandForecasting';
import { updateSupplierPerformanceScores } from '@/lib/agents/supplierScoring';

export async function GET() {
  const db = getDb();
  return NextResponse.json({
    ma01_pending_receipts: db.receipts.filter(r => r.status === 'pending_validation' && r.source === 'MA-01'),
    ma02_pending_po_drafts: db.po_drafts.filter(d => d.status === 'pending'),
    ma02_all_drafts: db.po_drafts,
    ma04_anomalies: db.anomalies,
    ma05_forecasts: db.forecasts,
    ma06_suppliers: db.suppliers,
  });
}

export async function POST(req: NextRequest) {
  const currentUser = extractAuthUser(req);
  const userName = currentUser?.name || 'Warehouse Staff';

  try {
    const body = await req.json();
    const { agent, action } = body;

    // MA-01: Smart Inbound Ingestion Workflow
    if (agent === 'MA-01') {
      const { fileName, rawText } = body;
      const result = await processInboundDocument(fileName || 'Inbound_Delivery_Doc.pdf', rawText);
      return NextResponse.json({ success: true, result });
    }

    // MA-02: Predictive Reordering Agent
    if (agent === 'MA-02') {
      if (action === 'evaluate') {
        const result = evaluatePredictiveReordering();
        return NextResponse.json({ success: true, result });
      }

      if (action === 'decision') {
        // FR-03 & Section 10: Warehouse Staff cannot approve/reject PO drafts
        if (currentUser?.role === 'warehouse_staff') {
          return NextResponse.json({ error: 'Warehouse Staff cannot approve or reject PO drafts (Section 10)' }, { status: 403 });
        }
        const { draftId, decision, managerNotes } = body;
        const result = handlePODraftDecision(draftId, decision, userName, managerNotes);
        return NextResponse.json(result);
      }
    }

    // MA-03: Conversational Floor Assistant
    if (agent === 'MA-03') {
      const { command, confirmed, pendingActionPayload } = body;
      if (!command) {
        return NextResponse.json({ error: 'Command input is required' }, { status: 400 });
      }
      const response = processVoiceOrTextCommand(command, userName, !!confirmed, pendingActionPayload);
      return NextResponse.json({ success: true, response });
    }

    // MA-04: Inventory Anomaly & Shrinkage Auditor
    if (agent === 'MA-04') {
      const result = runAnomalyAuditor();
      return NextResponse.json({ success: true, result });
    }

    // MA-05: Demand Forecasting & Seasonal Trend Agent
    if (agent === 'MA-05') {
      const forecasts = runDemandForecasting();
      return NextResponse.json({ success: true, forecasts });
    }

    // MA-06: Supplier Performance Scoring Agent
    if (agent === 'MA-06') {
      const result = updateSupplierPerformanceScores(body.supplierId);
      return NextResponse.json({ success: true, result });
    }

    return NextResponse.json({ error: `Unknown agent identifier: ${agent}` }, { status: 400 });
  } catch (err: any) {
    console.error('Agent execution error:', err);
    return NextResponse.json({ error: 'Failed to execute agent action' }, { status: 500 });
  }
}
