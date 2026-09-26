import { NextRequest, NextResponse } from 'next/server';
import { getDb, saveDb } from '@/lib/db';
import { extractAuthUser } from '@/lib/auth';
import { QueuedTransaction, StockLedger } from '@/types';

export async function POST(req: NextRequest) {
  const currentUser = extractAuthUser(req);
  const db = getDb();

  try {
    const { transactions } = await req.json();

    if (!Array.isArray(transactions) || transactions.length === 0) {
      return NextResponse.json({ error: 'Array of queued transactions required' }, { status: 400 });
    }

    const results: { idempotency_key: string; status: 'synced' | 'duplicate_ignored' | 'failed'; message: string }[] = [];
    const now = new Date();

    for (const tx of transactions) {
      const { idempotency_key, type, payload } = tx;

      // Check if already processed (Idempotency check per NFR-03 & Section 15 Risk Register)
      const existingTx = db.queued_transactions.find(q => q.idempotency_key === idempotency_key && q.status === 'synced');
      if (existingTx) {
        results.push({
          idempotency_key,
          status: 'duplicate_ignored',
          message: 'Transaction already processed by idempotency key',
        });
        continue;
      }

      try {
        if (type === 'adjustment') {
          const product = db.products.find(p => p.sku === payload.sku);
          if (product) {
            product.current_stock += payload.delta;
            product.updated_at = now.toISOString();

            const ledgerEntry: StockLedger = {
              id: `ledg_${Date.now()}_sync`,
              sku: product.sku,
              product_name: product.name,
              event_type: 'ADJUSTMENT',
              quantity_delta: payload.delta,
              resulting_balance: product.current_stock,
              reference_id: idempotency_key,
              reference_type: 'adjustment',
              actor_id: currentUser?.userId || 'offline_sync',
              actor_name: currentUser?.name || 'Warehouse Staff (Offline Sync)',
              location: product.location,
              timestamp: now.toISOString(),
              notes: `Offline synced adjustment: ${payload.reason_code}`,
            };
            db.ledger.unshift(ledgerEntry);
          }
        }

        const record: QueuedTransaction = {
          id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          idempotency_key,
          type,
          payload,
          created_at: now.toISOString(),
          status: 'synced',
        };
        db.queued_transactions.push(record);

        results.push({
          idempotency_key,
          status: 'synced',
          message: 'Processed and reconciled to central ledger',
        });
      } catch (itemErr: any) {
        results.push({
          idempotency_key,
          status: 'failed',
          message: itemErr.message || 'Processing failed',
        });
      }
    }

    saveDb(db);
    return NextResponse.json({
      success: true,
      synced_count: results.filter(r => r.status === 'synced').length,
      total_received: transactions.length,
      results,
    });
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to process offline sync' }, { status: 500 });
  }
}
