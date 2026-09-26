import { NextRequest, NextResponse } from 'next/server';
import { getDb, saveDb } from '@/lib/db';
import { hashPassword, logAuthEvent, getClientFingerprint } from '@/lib/auth';
import { User } from '@/types';

export async function POST(req: NextRequest) {
  const fingerprint = getClientFingerprint(req);
  try {
    const { token, name, password } = await req.json();

    if (!token || !password) {
      return NextResponse.json({ error: 'Token and password are required' }, { status: 400 });
    }

    const db = getDb();
    const invite = db.invites.find(i => i.token === token);

    if (!invite) {
      return NextResponse.json({ error: 'Invalid or unrecognized invite link' }, { status: 404 });
    }

    if (invite.status !== 'pending') {
      return NextResponse.json({ error: 'This invitation has already been used or revoked' }, { status: 400 });
    }

    if (new Date().getTime() > new Date(invite.expires_at).getTime()) {
      return NextResponse.json({ error: 'This invitation link has expired. Please contact your administrator for a new invite.' }, { status: 410 });
    }

    // Password strength check (min 12 chars, mixed case, number, symbol)
    if (password.length < 12) {
      return NextResponse.json({ error: 'Password must be at least 12 characters long' }, { status: 400 });
    }
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSymbol = /[^A-Za-z0-9]/.test(password);
    if (!hasUpper || !hasLower || !hasNumber || !hasSymbol) {
      return NextResponse.json({ error: 'Password must contain uppercase, lowercase, numbers, and symbols' }, { status: 400 });
    }

    const newUser: User = {
      id: `usr_${Date.now()}`,
      email: invite.email,
      name: name || invite.email.split('@')[0],
      password_hash: hashPassword(password),
      role: invite.role,
      warehouse_scope: invite.warehouse_scope,
      failed_attempts: 0,
      cooldown_tier: 0,
      created_at: new Date().toISOString(),
    };

    db.users.push(newUser);
    invite.status = 'accepted';

    logAuthEvent('INVITE_ACCEPTED', invite.email, 'SUCCESS', fingerprint, `Activated account with role: ${invite.role}`, newUser.id);
    saveDb(db);

    return NextResponse.json({
      success: true,
      message: 'Account successfully activated. Please log in with your credentials.',
    });
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to activate account' }, { status: 500 });
  }
}
