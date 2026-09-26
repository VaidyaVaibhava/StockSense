import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import {
  comparePassword,
  createAccessToken,
  createRefreshToken,
  logAuthEvent,
  getClientFingerprint
} from '@/lib/auth';

export async function POST(req: NextRequest) {
  const fingerprint = getClientFingerprint(req);
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
    }

    const db = getDb();
    const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase().trim());

    if (!user || !comparePassword(password, user.password_hash)) {
      logAuthEvent('LOGIN_FAILURE', email, 'FAILURE', fingerprint, 'Re-auth password mismatch');
      return NextResponse.json({ error: 'Password does not match' }, { status: 401 });
    }

    const accessToken = createAccessToken(user);
    const refreshToken = createRefreshToken(user);

    logAuthEvent('LOGIN_SUCCESS', user.email, 'SUCCESS', fingerprint, 'Lightweight re-auth modal resumed session', user.id);

    const response = NextResponse.json({
      success: true,
      message: 'Session resumed',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        warehouseScope: user.warehouse_scope,
      },
      accessToken,
    });

    response.cookies.set('stocksense_access_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 15 * 60,
    });

    return response;
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to re-authenticate' }, { status: 500 });
  }
}
