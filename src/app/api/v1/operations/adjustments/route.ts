import { NextRequest, NextResponse } from 'next/server';
import { getDb, saveDb } from '@/lib/db';
import { extractAuthUser } from '@/lib/auth';
import { evaluatePredictiveReordering } from '@/lib/agents/predictiveReordering';
import { StockAdjustment, StockLedger } from '@/types';

const CONTROLLED_REASONS = ['damage', 'theft', 'miscount', 'expiry', 'other'] as const;

export async function GET() {
  const db = getDb();
  return NextResponse.json({ adjustments: db.adjustments });
}

export async function POST(req: NextRequest) {
  const currentUser = extractAuthUser(req);
  const db = getDb();

  try {
    const { sku, delta, reason_code, notes, physical_count } = await req.json();

    if (!sku || reason_code === undefined) {
      return NextResponse.json({ error: 'SKU and Reason Code are required' }, { status: 400 });
    }

    // FR-11 Acceptance criteria: mandatory reason code from controlled list
    if (!CONTROLLED_REASONS.includes(reason_code)) {
      return NextResponse.json(
        {
          error: `Invalid reason code '${reason_code}'. Must be one of: ${CONTROLLED_REASONS.join(', ')}`,
        },
        { status: 400 }
      );
    }

    const product = db.products.find(p => p.sku.toUpperCase() === sku.toUpperCase());
    if (!product) {
      return NextResponse.json({ error: `Product with SKU ${sku} not found` }, { status: 404 });
    }

    let deltaNum = 0;
    if (physical_count !== undefined) {
      deltaNum = Number(physical_count) - product.current_stock;
    } else if (delta !== undefined) {
      deltaNum = Number(delta);
    }

    if (deltaNum === 0) {
      return NextResponse.json({ error: 'Adjustment delta cannot be zero (physical count matches recorded count)' }, { status: 400 });
    }

    // Check preventing negative stock
    if (product.current_stock + deltaNum < 0) {
      return NextResponse.json(
        {
          error: `Adjustment rejected: reducing stock by ${Math.abs(deltaNum)} would result in negative inventory (${product.current_stock + deltaNum}).`,
        },
        { status: 422 }
      );
    }

    const now = new Date();
    product.current_stock += deltaNum;
    product.updated_at = now.toISOString();

    const adjustment: StockAdjustment = {
      id: `adj_${Date.now()}`,
      sku: product.sku,
      product_name: product.name,
      delta: deltaNum,
      resulting_stock: product.current_stock,
      reason_code,
      location: product.location,
      notes: notes || `Reconciled physical count (${deltaNum > 0 ? '+' : ''}${deltaNum} ${product.uom})`,
      user_id: currentUser?.userId || 'usr_wh_01',
      user_name: currentUser?.name || 'Warehouse Staff',
      flagged_by_MA04: false,
      timestamp: now.toISOString(),
    };

    const ledgerEntry: StockLedger = {
      id: `ledg_${Date.now()}_adj`,
      sku: product.sku,
      product_name: product.name,
      event_type: 'ADJUSTMENT',
      quantity_delta: deltaNum,
      resulting_balance: product.current_stock,
      reference_id: adjustment.id,
      reference_type: 'adjustment',
      actor_id: currentUser?.userId || 'usr_wh_01',
      actor_name: currentUser?.name || 'Warehouse Staff',
      location: product.location,
      timestamp: now.toISOString(),
      notes: `Adjustment Reason: ${reason_code.toUpperCase()}. ${notes || ''}`,
    };

    db.adjustments.unshift(adjustment);
    db.ledger.unshift(ledgerEntry);

    // Event-driven re-evaluation of MA-02 predictive reordering (PRD Section 7 MA-02 Trigger)
    evaluatePredictiveReordering();

    saveDb(db);
    return NextResponse.json({ success: true, adjustment }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to record stock adjustment' }, { status: 500 });
  }
}
