import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(req: NextRequest) {
  const db = getDb();
  const searchParams = req.nextUrl.searchParams;
  const days = Number(searchParams.get('days') || 90);
  const format = searchParams.get('format') || 'json';
  const cutoff = new Date(Date.now() - days * 86400000);

  const filtered = db.ledger.filter(entry => new Date(entry.timestamp) >= cutoff);

  if (format === 'csv') {
    const headers = ['ID', 'Timestamp', 'SKU', 'Product Name', 'Event Type', 'Quantity Delta', 'Resulting Balance', 'Reference ID', 'Actor', 'Location', 'Notes'];
    const rows = filtered.map(e => [
      e.id,
      e.timestamp,
      e.sku,
      `"${e.product_name.replace(/"/g, '""')}"`,
      e.event_type,
      e.quantity_delta,
      e.resulting_balance,
      e.reference_id,
      `"${e.actor_name}"`,
      `"${e.location || ''}"`,
      `"${(e.notes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="StockSense_Movement_History_${days}d.csv"`,
      },
    });
  }

  return NextResponse.json({
    total_records: filtered.length,
    period_days: days,
    records: filtered,
  });
}
