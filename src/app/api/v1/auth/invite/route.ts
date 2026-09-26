import { NextRequest, NextResponse } from 'next/server';
import { getDb, saveDb } from '@/lib/db';
import { extractAuthUser, logAuthEvent, getClientFingerprint } from '@/lib/auth';
import { UserInvite } from '@/types';

// Admin creates an invite
export async function POST(req: NextRequest) {
  const currentUser = extractAuthUser(req);
  const fingerprint = getClientFingerprint(req);

  // Check RBAC permission: Only Procurement / Admin can provision accounts (PRD Section 6.2 & 10)
  if (!currentUser || currentUser.role !== 'procurement_admin') {
    return NextResponse.json(
      { error: 'Unauthorized: Account provisioning requires Procurement Admin privileges' },
      { status: 403 }
    );
  }

  try {
    const { email, role, warehouse_scope } = await req.json();

    if (!email || !role) {
      return NextResponse.json({ error: 'Email and role are required' }, { status: 400 });
    }

    const db = getDb();
    const normalizedEmail = email.toLowerCase().trim();

    // Check if user already exists
    if (db.users.some(u => u.email.toLowerCase() === normalizedEmail)) {
      return NextResponse.json({ error: 'A user with this email address already exists' }, { status: 400 });
    }

    // 72-hour invite token per PRD Section 6.2
    const token = `inv_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    const expiresAt = new Date(Date.now() + 72 * 3600000).toISOString();

    const invite: UserInvite = {
      id: `inv_id_${Date.now()}`,
      email: normalizedEmail,
      role: role,
      warehouse_scope: warehouse_scope || 'Dallas Distribution Hub',
      token,
      expires_at: expiresAt,
      status: 'pending',
      created_by: currentUser.email,
      created_at: new Date().toISOString(),
    };

    db.invites.unshift(invite);
    logAuthEvent('INVITE_SENT', normalizedEmail, 'SUCCESS', fingerprint, `Invited as ${role} for ${invite.warehouse_scope}`, currentUser.userId);
    saveDb(db);

    return NextResponse.json({
      success: true,
      message: `Invitation generated for ${normalizedEmail}`,
      invite,
      inviteLink: `/invite/${token}`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to create user invitation' }, { status: 500 });
  }
}

// GET all invites for Admin
export async function GET(req: NextRequest) {
  const currentUser = extractAuthUser(req);
  if (!currentUser || currentUser.role !== 'procurement_admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const db = getDb();
  return NextResponse.json({ invites: db.invites, users: db.users.map(u => ({
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    warehouse_scope: u.warehouse_scope,
    created_at: u.created_at,
    failed_attempts: u.failed_attempts,
    locked_until: u.locked_until
  })) });
}
