import { NextRequest, NextResponse } from 'next/server';
import { getDb, saveDb } from '@/lib/db';
import { extractAuthUser } from '@/lib/auth';
import { updateSupplierPerformanceScores } from '@/lib/agents/supplierScoring';
import { Receipt, StockLedger } from '@/types';

export async function GET() {
  const db = getDb();
  return NextResponse.json({ receipts: db.receipts });
}

// Create new receipt (draft or manual)
export async function POST(req: NextRequest) {
  const currentUser = extractAuthUser(req);
  const db = getDb();

  try {
    const { supplier_id, po_reference, line_items, notes, validate_now } = await req.json();

    if (!supplier_id || !line_items || line_items.length === 0) {
      return NextResponse.json({ error: 'Supplier and at least one line item are required' }, { status: 400 });
    }

    const supplier = db.suppliers.find(s => s.id === supplier_id) || db.suppliers[0];
    const now = new Date();
    const receiptNum = `REC-${now.getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const newReceipt: Receipt = {
      id: `rec_${Date.now()}`,
      receipt_number: receiptNum,
      supplier_id: supplier.id,
      supplier_name: supplier.name,
      status: validate_now ? 'validated' : 'draft',
      source: 'manual',
      po_reference: po_reference || `PO-${Math.floor(1000 + Math.random() * 9000)}`,
      line_items,
      created_at: now.toISOString(),
      validated_at: validate_now ? now.toISOString() : undefined,
      validated_by: validate_now ? (currentUser?.name || 'Carlos Mendez') : undefined,
      notes,
    };

    // If validated now, increment stock and write to immutable ledger (FR-08)
    if (validate_now) {
      for (const item of line_items) {
        const product = db.products.find(p => p.sku === item.sku);
        if (product) {
          product.current_stock += item.received_qty;
          product.updated_at = now.toISOString();

          // If batch tracking enabled, append batch
          if (product.batch_tracking_enabled && item.batch_number) {
            if (!product.batches) product.batches = [];
            product.batches.push({
              batch_number: item.batch_number,
              quantity: item.received_qty,
              expiry_date: item.expiry_date || '2028-12-31',
              received_date: now.toISOString(),
            });
          }

          const ledgerEntry: StockLedger = {
            id: `ledg_${Date.now()}_${item.sku}`,
            sku: product.sku,
            product_name: product.name,
            event_type: 'RECEIPT',
            quantity_delta: item.received_qty,
            resulting_balance: product.current_stock,
            reference_id: receiptNum,
            reference_type: 'receipt',
            actor_id: currentUser?.userId || 'usr_wh_01',
            actor_name: currentUser?.name || 'Warehouse Staff',
            location: product.location,
            timestamp: now.toISOString(),
            notes: `Receipt from ${supplier.name} (PO: ${newReceipt.po_reference})`,
          };
          db.ledger.unshift(ledgerEntry);
        }
      }
      updateSupplierPerformanceScores(supplier.id);
    }

    db.receipts.unshift(newReceipt);
    saveDb(db);

    return NextResponse.json({ success: true, receipt: newReceipt }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to create receipt' }, { status: 500 });
  }
}

// Validate an existing receipt (e.g. from MA-01 pending validation draft)
export async function PUT(req: NextRequest) {
  const currentUser = extractAuthUser(req);
  const db = getDb();

  try {
    const { receipt_id, line_items, notes } = await req.json();
    const receipt = db.receipts.find(r => r.id === receipt_id);

    if (!receipt) {
      return NextResponse.json({ error: 'Receipt not found' }, { status: 404 });
    }

    if (receipt.status === 'validated') {
      return NextResponse.json({ error: 'Receipt is already validated and immutable' }, { status: 400 });
    }

    const now = new Date();
    const itemsToProcess = line_items || receipt.line_items;

    // Increment stock and append immutable ledger entries (FR-08)
    for (const item of itemsToProcess) {
      const product = db.products.find(p => p.sku === item.sku);
      if (product) {
        product.current_stock += item.received_qty;
        product.updated_at = now.toISOString();

        if (product.batch_tracking_enabled && item.batch_number) {
          if (!product.batches) product.batches = [];
          product.batches.push({
            batch_number: item.batch_number,
            quantity: item.received_qty,
            expiry_date: item.expiry_date || '2028-12-31',
            received_date: now.toISOString(),
          });
        }

        const ledgerEntry: StockLedger = {
          id: `ledg_${Date.now()}_${item.sku}`,
          sku: product.sku,
          product_name: product.name,
          event_type: 'RECEIPT',
          quantity_delta: item.received_qty,
          resulting_balance: product.current_stock,
          reference_id: receipt.receipt_number,
          reference_type: 'receipt',
          actor_id: currentUser?.userId || 'usr_wh_01',
          actor_name: currentUser?.name || 'Warehouse Staff',
          location: product.location,
          timestamp: now.toISOString(),
          notes: `Validated receipt from ${receipt.supplier_name} (PO: ${receipt.po_reference || 'N/A'})`,
        };
        db.ledger.unshift(ledgerEntry);
      }
    }

    receipt.status = 'validated';
    receipt.validated_at = now.toISOString();
    receipt.validated_by = currentUser?.name || 'Carlos Mendez';
    if (notes) receipt.notes = notes;
    if (line_items) receipt.line_items = line_items;

    // Automatically trigger MA-06 Supplier Scoring update
    updateSupplierPerformanceScores(receipt.supplier_id);

    saveDb(db);
    return NextResponse.json({
      success: true,
      message: `Receipt ${receipt.receipt_number} validated and posted to central immutable ledger`,
      receipt,
    });
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to validate receipt' }, { status: 500 });
  }
}
