import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { extractAuthUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const currentUser = extractAuthUser(req);
  if (!currentUser || currentUser.role !== 'procurement_admin') {
    return NextResponse.json(
      { error: 'Forbidden: Security Audit Logs are strictly restricted to Procurement / Admin (FR-25)' },
      { status: 403 }
    );
  }

  const db = getDb();
  const searchParams = req.nextUrl.searchParams;
  const eventType = searchParams.get('event_type');
  const outcome = searchParams.get('outcome');

  let logs = db.auth_audit_logs;
  if (eventType) {
    logs = logs.filter(l => l.event_type === eventType);
  }
  if (outcome) {
    logs = logs.filter(l => l.outcome === outcome);
  }

  return NextResponse.json({
    total_events: logs.length,
    logs,
  });
}
