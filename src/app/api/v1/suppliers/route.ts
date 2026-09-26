import { NextRequest, NextResponse } from 'next/server';
import { getDb, saveDb } from '@/lib/db';
import { Supplier } from '@/types';

export async function GET() {
  const db = getDb();
  return NextResponse.json({ suppliers: db.suppliers });
}

export async function POST(req: NextRequest) {
  const db = getDb();
  try {
    const { name, contact_email, contact_phone, avg_lead_time_days } = await req.json();
    if (!name) {
      return NextResponse.json({ error: 'Supplier name is required' }, { status: 400 });
    }

    const newSupplier: Supplier = {
      id: `sup_${Date.now()}`,
      name: name.trim(),
      contact_email: contact_email || '',
      contact_phone: contact_phone || '',
      avg_lead_time_days: Number(avg_lead_time_days || 7),
      on_time_rate: 98.0,
      short_ship_rate: 1.0,
      lead_time_variance_days: 0.5,
      status: 'active',
    };

    db.suppliers.push(newSupplier);
    saveDb(db);

    return NextResponse.json({ success: true, supplier: newSupplier }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to create supplier' }, { status: 500 });
  }
}
