import { NextRequest, NextResponse } from 'next/server';
import { getDb, saveDb } from '@/lib/db';
import { extractAuthUser } from '@/lib/auth';
import { evaluatePredictiveReordering } from '@/lib/agents/predictiveReordering';
import { DeliveryOrder, StockLedger } from '@/types';

export async function GET() {
  const db = getDb();
  return NextResponse.json({ deliveries: db.deliveries });
}

export async function POST(req: NextRequest) {
  const currentUser = extractAuthUser(req);
  const db = getDb();

  try {
    const { customer_ref, destination, line_items, notes } = await req.json();

    if (!customer_ref || !line_items || line_items.length === 0) {
      return NextResponse.json({ error: 'Customer reference and line items are required' }, { status: 400 });
    }

    const now = new Date();
    const orderNum = `DO-${now.getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    let hasBackorder = false;
    let totalShortfall = 0;

    // Check stock availability and FEFO suggestions (FR-12 & FR-13)
    const processedItems = line_items.map((item: any) => {
      const product = db.products.find(p => p.sku === item.sku);
      const orderedQty = Number(item.ordered_qty || 1);
      const currentStock = product ? product.current_stock : 0;

      let pickedQty = orderedQty;
      if (orderedQty > currentStock) {
        hasBackorder = true;
        totalShortfall += (orderedQty - currentStock);
        pickedQty = Math.max(0, currentStock); // Short-pick partial fulfillment
      }

      // FEFO (First-Expiry-First-Out) batch allocation suggestion
      let allocatedBatches: any[] = [];
      if (product && product.batches && product.batches.length > 0) {
        // Sort batches by earliest expiry date
        const sortedBatches = [...product.batches].sort(
          (a, b) => new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime()
        );
        let remainingToPick = pickedQty;
        for (const b of sortedBatches) {
          if (remainingToPick <= 0) break;
          const take = Math.min(b.quantity, remainingToPick);
          allocatedBatches.push({
            batch_number: b.batch_number,
            qty: take,
            expiry_date: b.expiry_date,
          });
          remainingToPick -= take;
        }
      }

      return {
        sku: item.sku,
        product_name: product ? product.name : item.sku,
        ordered_qty: orderedQty,
        picked_qty: pickedQty,
        unit_price: product ? product.unit_price : 0,
        allocated_batches: allocatedBatches,
      };
    });

    const delivery: DeliveryOrder = {
      id: `do_${Date.now()}`,
      order_number: orderNum,
      customer_ref: customer_ref.trim(),
      destination: destination || 'Standard Customer Dock',
      status: 'pending',
      backorder_flag: hasBackorder,
      backorder_shortfall: hasBackorder ? totalShortfall : undefined,
      line_items: processedItems,
      created_at: now.toISOString(),
      notes: notes || (hasBackorder ? `Backorder shortfall of ${totalShortfall} units flagged (FR-12).` : undefined),
    };

    db.deliveries.unshift(delivery);

    // If backorder shortfall detected, link to Predictive Reordering Agent (FR-12)
    if (hasBackorder) {
      evaluatePredictiveReordering();
    }

    saveDb(db);
    return NextResponse.json({ success: true, delivery }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to create delivery order' }, { status: 500 });
  }
}

// Shipping execution: decrements stock and creates immutable ledger entries
export async function PUT(req: NextRequest) {
  const currentUser = extractAuthUser(req);
  const db = getDb();

  try {
    const { delivery_id, status } = await req.json();
    const delivery = db.deliveries.find(d => d.id === delivery_id);

    if (!delivery) {
      return NextResponse.json({ error: 'Delivery order not found' }, { status: 404 });
    }

    if (delivery.status === 'shipped') {
      return NextResponse.json({ error: 'Delivery order has already been shipped' }, { status: 400 });
    }

    const now = new Date();

    if (status === 'shipped') {
      // Decrement stock in central ledger
      for (const item of delivery.line_items) {
        const product = db.products.find(p => p.sku === item.sku);
        if (product) {
          const qtyToDeduct = item.picked_qty;
          product.current_stock = Math.max(0, product.current_stock - qtyToDeduct);
          product.updated_at = now.toISOString();

          // Deduct from batches if applicable
          if (product.batches && item.allocated_batches) {
            for (const alloc of item.allocated_batches) {
              const b = product.batches.find(batch => batch.batch_number === alloc.batch_number);
              if (b) {
                b.quantity = Math.max(0, b.quantity - alloc.qty);
              }
            }
            product.batches = product.batches.filter(b => b.quantity > 0);
          }

          const ledgerEntry: StockLedger = {
            id: `ledg_${Date.now()}_${item.sku}`,
            sku: product.sku,
            product_name: product.name,
            event_type: 'DELIVERY',
            quantity_delta: -qtyToDeduct,
            resulting_balance: product.current_stock,
            reference_id: delivery.order_number,
            reference_type: 'delivery',
            actor_id: currentUser?.userId || 'usr_wh_01',
            actor_name: currentUser?.name || 'Warehouse Staff',
            location: product.location,
            timestamp: now.toISOString(),
            notes: `Delivery order shipped to ${delivery.customer_ref}`,
          };
          db.ledger.unshift(ledgerEntry);
        }
      }

      delivery.status = 'shipped';
      delivery.shipped_at = now.toISOString();
      delivery.shipped_by = currentUser?.name || 'Carlos Mendez';

      // Re-evaluate predictive reordering since stock level changed
      evaluatePredictiveReordering();
    } else {
      delivery.status = status;
    }

    saveDb(db);
    return NextResponse.json({ success: true, delivery });
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to update delivery order' }, { status: 500 });
  }
}
