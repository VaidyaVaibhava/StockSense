import { NextRequest, NextResponse } from 'next/server';
import { getDb, saveDb } from '@/lib/db';
import { extractAuthUser } from '@/lib/auth';
import { Product, StockLedger } from '@/types';

export async function GET(req: NextRequest) {
  const db = getDb();
  const searchParams = req.nextUrl.searchParams;
  const search = searchParams.get('search')?.toLowerCase() || '';
  const category = searchParams.get('category') || '';
  const includeArchived = searchParams.get('include_archived') === 'true';

  let products = db.products;

  if (!includeArchived) {
    products = products.filter(p => !p.is_archived);
  }

  if (category) {
    products = products.filter(p => p.category.toLowerCase() === category.toLowerCase());
  }

  if (search) {
    products = products.filter(
      p =>
        p.name.toLowerCase().includes(search) ||
        p.sku.toLowerCase().includes(search) ||
        p.location.toLowerCase().includes(search)
    );
  }

  return NextResponse.json({
    products,
    total: products.length,
    low_stock_count: products.filter(p => p.current_stock <= p.reorder_threshold).length,
  });
}

export async function POST(req: NextRequest) {
  const currentUser = extractAuthUser(req);
  const db = getDb();

  try {
    const body = await req.json();

    // Check for bulk CSV import (FR-07a)
    if (body.action === 'import_csv') {
      const rows = body.rows || [];
      const results: { row: number; sku: string; success: boolean; error?: string }[] = [];
      let importedCount = 0;

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowNum = i + 1;

        if (!row.sku || !row.name) {
          results.push({ row: rowNum, sku: row.sku || 'N/A', success: false, error: 'Mandatory fields SKU and Name cannot be empty' });
          continue;
        }

        const existing = db.products.find(p => p.sku.toUpperCase() === row.sku.toUpperCase());
        if (existing) {
          results.push({ row: rowNum, sku: row.sku, success: false, error: `Duplicate SKU: ${row.sku} already exists` });
          continue;
        }

        const initialStock = Number(row.initial_stock || row.current_stock || 0);
        if (initialStock < 0) {
          results.push({ row: rowNum, sku: row.sku, success: false, error: 'Initial stock cannot be negative' });
          continue;
        }

        const newProd: Product = {
          id: `prod_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          sku: row.sku.toUpperCase().trim(),
          name: row.name.trim(),
          category: row.category || 'General',
          uom: row.uom || 'pcs',
          initial_stock: initialStock,
          current_stock: initialStock,
          reorder_threshold: Number(row.reorder_threshold || 20),
          supplier_id: row.supplier_id || db.suppliers[0]?.id || 'sup_01',
          unit_cost: Number(row.unit_cost || 10.0),
          unit_price: Number(row.unit_price || 20.0),
          location: row.location || 'Rack-General',
          is_archived: false,
          batch_tracking_enabled: !!row.batch_tracking_enabled,
          expiry_tracking_enabled: !!row.expiry_tracking_enabled,
          burn_rate_daily: Number(row.burn_rate_daily || 2.0),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        db.products.push(newProd);

        if (initialStock > 0) {
          const ledgerEntry: StockLedger = {
            id: `ledg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            sku: newProd.sku,
            product_name: newProd.name,
            event_type: 'INITIAL',
            quantity_delta: initialStock,
            resulting_balance: initialStock,
            reference_id: 'CSV_IMPORT',
            reference_type: 'system',
            actor_id: currentUser?.userId || 'system',
            actor_name: currentUser?.name || 'Administrator',
            location: newProd.location,
            timestamp: new Date().toISOString(),
            notes: 'Bulk CSV catalog import',
          };
          db.ledger.unshift(ledgerEntry);
        }

        importedCount++;
        results.push({ row: rowNum, sku: row.sku, success: true });
      }

      saveDb(db);
      return NextResponse.json({
        success: true,
        imported_count: importedCount,
        total_rows: rows.length,
        results,
      });
    }

    // Single Product Creation (FR-06, FR-07)
    const {
      sku,
      name,
      category,
      uom,
      initial_stock,
      reorder_threshold,
      supplier_id,
      unit_cost,
      unit_price,
      location,
      batch_tracking_enabled,
      expiry_tracking_enabled,
      burn_rate_daily,
    } = body;

    // FR-07: Mandatory field validation
    if (!sku || !name || !category || !uom) {
      return NextResponse.json(
        { error: 'Name, SKU, Category, and Unit of Measure are required mandatory fields' },
        { status: 400 }
      );
    }

    const cleanSku = sku.toUpperCase().trim();

    // FR-07: Actionable error for duplicate SKU
    const existingSku = db.products.find(p => p.sku.toUpperCase() === cleanSku);
    if (existingSku) {
      return NextResponse.json(
        {
          error: `SKU '${cleanSku}' is already registered to product '${existingSku.name}'. SKUs must be globally unique.`,
          field: 'sku'
        },
        { status: 409 }
      );
    }

    const initialStockNum = Number(initial_stock || 0);
    if (initialStockNum < 0) {
      return NextResponse.json({ error: 'Initial stock cannot be negative' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const newProduct: Product = {
      id: `prod_${Date.now()}`,
      sku: cleanSku,
      name: name.trim(),
      category: category.trim(),
      uom: uom.trim(),
      initial_stock: initialStockNum,
      current_stock: initialStockNum,
      reorder_threshold: Number(reorder_threshold || 15),
      supplier_id: supplier_id || db.suppliers[0]?.id || 'sup_01',
      unit_cost: Number(unit_cost || 0),
      unit_price: Number(unit_price || 0),
      location: location || 'Rack-A1',
      is_archived: false,
      batch_tracking_enabled: !!batch_tracking_enabled,
      expiry_tracking_enabled: !!expiry_tracking_enabled,
      burn_rate_daily: Number(burn_rate_daily || 2.0),
      created_at: now,
      updated_at: now,
    };

    db.products.push(newProduct);

    // Immutable ledger entry for initial stock (FR-08 / Section 8)
    if (initialStockNum > 0) {
      const ledgerEntry: StockLedger = {
        id: `ledg_${Date.now()}`,
        sku: cleanSku,
        product_name: newProduct.name,
        event_type: 'INITIAL',
        quantity_delta: initialStockNum,
        resulting_balance: initialStockNum,
        reference_id: 'PRODUCT_CREATION',
        reference_type: 'system',
        actor_id: currentUser?.userId || 'system',
        actor_name: currentUser?.name || 'Administrator',
        location: newProduct.location,
        timestamp: now,
        notes: `Created product catalog entry with initial inventory balance`,
      };
      db.ledger.unshift(ledgerEntry);
    }

    saveDb(db);
    return NextResponse.json({ success: true, product: newProduct }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
  }
}
