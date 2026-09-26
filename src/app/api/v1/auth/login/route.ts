import { NextRequest, NextResponse } from 'next/server';
import { getDb, saveDb } from '@/lib/db';
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
    const body = await req.json();
    const { email, password, rememberMe, portal, firebaseUid } = body;

    if (!email || (!password && !firebaseUid)) {
      return NextResponse.json(
        { error: 'Email and password (or Firebase Auth) are required' },
        { status: 400 }
      );
    }

    const db = getDb();
    const normalizedEmail = email.toLowerCase().trim();
    const user = db.users.find(u => u.email.toLowerCase() === normalizedEmail);

    // Generic error message per PRD FR-20 to avoid account enumeration
    const genericErrorMsg = 'Email or password is incorrect';

    // Strict separate portal authorization check
    if (portal && user) {
      const portalRoleMap: Record<string, string> = {
        warehouse: 'warehouse_staff',
        manager: 'inventory_manager',
        admin: 'procurement_admin',
      };
      const portalNames: Record<string, string> = {
        warehouse: 'Warehouse Floor Workers',
        manager: 'Inventory Managers',
        admin: 'Procurement & System Admins',
      };

      const requiredRole = portalRoleMap[portal];
      if (requiredRole && user.role !== requiredRole) {
        logAuthEvent('PORTAL_MISMATCH', normalizedEmail, 'DENIED', fingerprint, `Attempted login to ${portal} portal with ${user.role} role`);
        return NextResponse.json(
          {
            error: `Access Denied: This portal is strictly for ${portalNames[portal]}. Your account is assigned to '${user.role.replace('_', ' ')}'. Please log in through your authorized portal.`,
            expectedPortal: user.role === 'warehouse_staff' ? 'warehouse' : (user.role === 'inventory_manager' ? 'manager' : 'admin'),
          },
          { status: 403 }
        );
      }
    }

    // Brute force & lockout protection per PRD 6.5 & FR-22:
    if (user && user.locked_until) {
      const lockExpiry = new Date(user.locked_until).getTime();
      const nowTime = Date.now();
      if (nowTime < lockExpiry) {
        const remainingMinutes = Math.ceil((lockExpiry - nowTime) / 60000);
        logAuthEvent('ACCOUNT_LOCKED', normalizedEmail, 'DENIED', fingerprint, `Attempt during lockout. ${remainingMinutes}m remaining.`, user.id);
        return NextResponse.json(
          {
            error: `Account is temporarily locked due to repeated failed logins. Please try again in ${remainingMinutes} minutes or reset your password.`,
            isLocked: true,
            cooldownTier: user.cooldown_tier,
          },
          { status: 423 }
        );
      } else {
        // Cooldown passed, reset locked_until
        user.locked_until = null;
        saveDb(db);
      }
    }

    // Password validation (or Firebase UID verification)
    const isPasswordValid = firebaseUid ? true : (user ? comparePassword(password, user.password_hash) : false);

    if (!user || !isPasswordValid) {
      if (user) {
        user.failed_attempts = (user.failed_attempts || 0) + 1;
        // Escalating lockout policy (Section 6.5)
        if (user.failed_attempts >= 5) {
          user.cooldown_tier = (user.cooldown_tier || 0) + 1;
          const lockoutMinutes = user.cooldown_tier === 1 ? 5 : (user.cooldown_tier === 2 ? 30 : 60);
          user.locked_until = new Date(Date.now() + lockoutMinutes * 60000).toISOString();

          logAuthEvent('ACCOUNT_LOCKED', normalizedEmail, 'DENIED', fingerprint, `Locked after ${user.failed_attempts} failed attempts (Tier ${user.cooldown_tier}, ${lockoutMinutes}m lockout)`, user.id);

          // Alert other admins (PRD Section 6.5)
          db.notifications.unshift({
            id: `notif_lock_${Date.now()}`,
            target_role: 'procurement_admin',
            title: `Security Alert: Account Lockout`,
            message: `User ${user.email} (${user.role}) has been locked after 5 consecutive failed attempts.`,
            type: 'security_alert',
            read: false,
            link: '/settings',
            created_at: new Date().toISOString(),
          });
        }
        saveDb(db);
      }

      logAuthEvent('LOGIN_FAILURE', normalizedEmail, 'FAILURE', fingerprint, 'Invalid password attempt');
      return NextResponse.json({ error: genericErrorMsg }, { status: 401 });
    }

    // Login Success: Reset failed attempts
    user.failed_attempts = 0;
    user.locked_until = null;
    saveDb(db);

    const accessToken = createAccessToken(user);
    const refreshToken = createRefreshToken(user, !!rememberMe);

    logAuthEvent('LOGIN_SUCCESS', user.email, 'SUCCESS', fingerprint, `Authenticated with role: ${user.role}`, user.id);

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        warehouseScope: user.warehouse_scope,
      },
      accessToken,
      refreshToken,
    });

    // Set secure HTTP-only cookies
    response.cookies.set('stocksense_access_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 15 * 60, // 15 mins
    });

    response.cookies.set('stocksense_refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: rememberMe ? 30 * 86400 : 8 * 3600, // 30 days or 8 hours
    });

    return response;
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal server error during authentication' }, { status: 500 });
  }
}
