import { NextRequest, NextResponse } from 'next/server';
import { getDb, saveDb } from '@/lib/db';
import { extractAuthUser } from '@/lib/auth';
import { InternalTransfer, StockLedger } from '@/types';

export async function GET() {
  const db = getDb();
  return NextResponse.json({ transfers: db.transfers });
}

export async function POST(req: NextRequest) {
  const currentUser = extractAuthUser(req);
  const db = getDb();

  try {
    const { sku, quantity, from_location, to_location, initiated_via } = await req.json();

    if (!sku || !quantity || !from_location || !to_location) {
      return NextResponse.json(
        { error: 'SKU, quantity, source location, and destination location are required' },
        { status: 400 }
      );
    }

    const qtyNum = Number(quantity);
    if (qtyNum <= 0) {
      return NextResponse.json({ error: 'Transfer quantity must be greater than zero' }, { status: 400 });
    }

    const product = db.products.find(p => p.sku.toUpperCase() === sku.toUpperCase());
    if (!product) {
      return NextResponse.json({ error: `Product with SKU ${sku} not found` }, { status: 404 });
    }

    // FR-10 Acceptance Criteria: Transfer of a quantity greater than current location stock is rejected with a clear error
    if (qtyNum > product.current_stock) {
      return NextResponse.json(
        {
          error: `Transfer rejected: requested quantity (${qtyNum} ${product.uom}) exceeds current available stock (${product.current_stock} ${product.uom}) at location ${from_location}.`,
          available: product.current_stock,
          requested: qtyNum,
        },
        { status: 422 }
      );
    }

    const now = new Date();
    const trfNum = `TRF-${now.getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const transfer: InternalTransfer = {
      id: `trf_${Date.now()}`,
      transfer_number: trfNum,
      from_location: from_location.trim(),
      to_location: to_location.trim(),
      sku: product.sku,
      product_name: product.name,
      quantity: qtyNum,
      initiated_via: initiated_via === 'voice' ? 'voice' : 'ui',
      status: 'completed',
      initiated_by: currentUser?.name || 'Warehouse Staff',
      timestamp: now.toISOString(),
    };

    // Update product location
    product.location = to_location.trim();
    product.updated_at = now.toISOString();

    // Log double-entry ledger event (TRANSFER_OUT and TRANSFER_IN) without altering total warehouse inventory count
    const ledgerOut: StockLedger = {
      id: `ledg_${Date.now()}_out`,
      sku: product.sku,
      product_name: product.name,
      event_type: 'TRANSFER_OUT',
      quantity_delta: -qtyNum,
      resulting_balance: product.current_stock,
      reference_id: trfNum,
      reference_type: 'transfer',
      actor_id: currentUser?.userId || 'usr_wh_01',
      actor_name: currentUser?.name || 'Warehouse Staff',
      location: from_location,
      timestamp: now.toISOString(),
      notes: `Transferred to ${to_location}`,
    };

    const ledgerIn: StockLedger = {
      id: `ledg_${Date.now()}_in`,
      sku: product.sku,
      product_name: product.name,
      event_type: 'TRANSFER_IN',
      quantity_delta: qtyNum,
      resulting_balance: product.current_stock,
      reference_id: trfNum,
      reference_type: 'transfer',
      actor_id: currentUser?.userId || 'usr_wh_01',
      actor_name: currentUser?.name || 'Warehouse Staff',
      location: to_location,
      timestamp: now.toISOString(),
      notes: `Transferred from ${from_location}`,
    };

    db.transfers.unshift(transfer);
    db.ledger.unshift(ledgerIn, ledgerOut);
    saveDb(db);

    return NextResponse.json({ success: true, transfer }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to execute internal transfer' }, { status: 500 });
  }
}
