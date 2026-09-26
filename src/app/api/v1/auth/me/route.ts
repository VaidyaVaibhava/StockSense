import { NextRequest, NextResponse } from 'next/server';
import { extractAuthUser } from '@/lib/auth';
import { getRolePermissions } from '@/lib/rbac';
import { getDb } from '@/lib/db';

export async function GET(req: NextRequest) {
  const tokenUser = extractAuthUser(req);
  if (!tokenUser) {
    return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
  }

  const db = getDb();
  const dbUser = db.users.find(u => u.id === tokenUser.userId);
  if (!dbUser) {
    return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
  }

  const permissions = getRolePermissions(dbUser.role);

  return NextResponse.json({
    authenticated: true,
    user: {
      id: dbUser.id,
      email: dbUser.email,
      name: dbUser.name,
      role: dbUser.role,
      warehouseScope: dbUser.warehouse_scope,
    },
    permissions,
  });
}
