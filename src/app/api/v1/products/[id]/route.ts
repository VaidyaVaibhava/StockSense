import { NextRequest, NextResponse } from 'next/server';
import { getDb, saveDb } from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const db = getDb();
  const product = db.products.find(p => p.id === params.id || p.sku.toUpperCase() === params.id.toUpperCase());
  if (!product) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 });
  }
  return NextResponse.json({ product });
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const db = getDb();
  const product = db.products.find(p => p.id === params.id);
  if (!product) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 });
  }

  try {
    const body = await req.json();
    const {
      name,
      category,
      uom,
      reorder_threshold,
      supplier_id,
      unit_cost,
      unit_price,
      location,
      is_archived,
      batch_tracking_enabled,
      expiry_tracking_enabled,
      burn_rate_daily,
    } = body;

    if (name !== undefined) product.name = name.trim();
    if (category !== undefined) product.category = category.trim();
    if (uom !== undefined) product.uom = uom.trim();
    if (reorder_threshold !== undefined) product.reorder_threshold = Number(reorder_threshold);
    if (supplier_id !== undefined) product.supplier_id = supplier_id;
    if (unit_cost !== undefined) product.unit_cost = Number(unit_cost);
    if (unit_price !== undefined) product.unit_price = Number(unit_price);
    if (location !== undefined) product.location = location;
    if (is_archived !== undefined) product.is_archived = !!is_archived;
    if (batch_tracking_enabled !== undefined) product.batch_tracking_enabled = !!batch_tracking_enabled;
    if (expiry_tracking_enabled !== undefined) product.expiry_tracking_enabled = !!expiry_tracking_enabled;
    if (burn_rate_daily !== undefined) product.burn_rate_daily = Number(burn_rate_daily);

    product.updated_at = new Date().toISOString();
    saveDb(db);

    return NextResponse.json({ success: true, product });
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });
  }
}

// Archive product (FR-06: hides from operational pickers but preserves in historical reports)
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const db = getDb();
  const product = db.products.find(p => p.id === params.id);
  if (!product) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 });
  }

  product.is_archived = true;
  product.updated_at = new Date().toISOString();
  saveDb(db);

  return NextResponse.json({
    success: true,
    message: `Product ${product.sku} has been archived. It is hidden from floor pickers but preserved in ledger history.`,
  });
}
