import { NextRequest, NextResponse } from 'next/server';
import { updateSupplierPerformanceScores } from '@/lib/agents/supplierScoring';
import { extractAuthUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const currentUser = extractAuthUser(req);
  if (currentUser && currentUser.role === 'warehouse_staff') {
    return NextResponse.json(
      { error: 'Forbidden: Supplier scorecards are restricted for Warehouse Staff' },
      { status: 403 }
    );
  }

  const result = updateSupplierPerformanceScores();
  return NextResponse.json({
    success: true,
    scorecards: result.scorecards,
    evaluated_at: new Date().toISOString(),
  });
}
