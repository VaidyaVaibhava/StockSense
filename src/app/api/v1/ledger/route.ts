import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(req: NextRequest) {
  const db = getDb();
  const searchParams = req.nextUrl.searchParams;
  const sku = searchParams.get('sku');
  const eventType = searchParams.get('event_type');

  let entries = db.ledger;
  if (sku) {
    entries = entries.filter(e => e.sku.toUpperCase() === sku.toUpperCase());
  }
  if (eventType) {
    entries = entries.filter(e => e.event_type === eventType);
  }

  return NextResponse.json({
    ledger: entries,
    total_transactions: entries.length,
  });
}
