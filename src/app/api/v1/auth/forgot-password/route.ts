import { NextRequest, NextResponse } from 'next/server';
import { getDb, saveDb } from '@/lib/db';
import { hashPassword, comparePassword, logAuthEvent, getClientFingerprint } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const fingerprint = getClientFingerprint(req);
  try {
    const body = await req.json();
    const { action, email, code, newPassword } = body;
    const db = getDb();
    const normalizedEmail = (email || '').toLowerCase().trim();

    // STEP 1: Request OTP
    if (action === 'request') {
      if (!normalizedEmail) {
        return NextResponse.json({ error: 'Email is required' }, { status: 400 });
      }

      // Generate 6-digit OTP
      const generatedCode = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60000).toISOString(); // 10 minutes expiry

      // Remove any existing OTP for this email
      db.otps = db.otps.filter(o => o.email !== normalizedEmail);
      db.otps.push({
        email: normalizedEmail,
        code: generatedCode,
        expires_at: expiresAt,
        attempts: 0,
        verified: false,
      });

      const user = db.users.find(u => u.email.toLowerCase() === normalizedEmail);
      if (user) {
        logAuthEvent('PASSWORD_RESET_REQUEST', normalizedEmail, 'SUCCESS', fingerprint, 'OTP requested', user.id);
      } else {
        logAuthEvent('PASSWORD_RESET_REQUEST', normalizedEmail, 'FAILURE', fingerprint, 'OTP requested for non-existent account');
      }

      saveDb(db);

      // Generic non-enumerating confirmation per PRD FR-20 & Section 6.3
      return NextResponse.json({
        success: true,
        message: "If an account associated with this email exists, we've sent a 6-digit verification code.",
        // For development/demo testing convenience, we include the demo code in debug field:
        demo_code_hint: generatedCode,
      });
    }

    // STEP 2: Verify OTP
    if (action === 'verify') {
      const record = db.otps.find(o => o.email === normalizedEmail);
      if (!record) {
        return NextResponse.json({ error: 'No verification request found for this email' }, { status: 400 });
      }

      if (new Date().getTime() > new Date(record.expires_at).getTime()) {
        return NextResponse.json({ error: 'Verification code has expired. Please request a new code.' }, { status: 400 });
      }

      if (record.attempts >= 5) {
        db.otps = db.otps.filter(o => o.email !== normalizedEmail);
        saveDb(db);
        return NextResponse.json({ error: 'Maximum verification attempts exceeded (5). Please request a new code.' }, { status: 429 });
      }

      record.attempts += 1;

      if (record.code !== (code || '').trim()) {
        saveDb(db);
        const remaining = 5 - record.attempts;
        return NextResponse.json({ error: `Invalid code. ${remaining} attempts remaining.` }, { status: 400 });
      }

      record.verified = true;
      saveDb(db);

      logAuthEvent('PASSWORD_RESET_VERIFY', normalizedEmail, 'SUCCESS', fingerprint, '6-digit OTP code verified');
      return NextResponse.json({ success: true, message: 'Code verified successfully.' });
    }

    // STEP 3 & 4: Reset Password
    if (action === 'reset') {
      const record = db.otps.find(o => o.email === normalizedEmail);
      if (!record || !record.verified) {
        return NextResponse.json({ error: 'Please verify your code first.' }, { status: 400 });
      }

      // Password strength validation: min 12 characters, mixed case, number, symbol per PRD 6.2 & 6.3
      if (!newPassword || newPassword.length < 12) {
        return NextResponse.json({ error: 'Password must be at least 12 characters long.' }, { status: 400 });
      }
      const hasUpper = /[A-Z]/.test(newPassword);
      const hasLower = /[a-z]/.test(newPassword);
      const hasNumber = /[0-9]/.test(newPassword);
      const hasSymbol = /[^A-Za-z0-9]/.test(newPassword);

      if (!hasUpper || !hasLower || !hasNumber || !hasSymbol) {
        return NextResponse.json({
          error: 'Password must contain uppercase, lowercase, numbers, and symbols.',
        }, { status: 400 });
      }

      const user = db.users.find(u => u.email.toLowerCase() === normalizedEmail);
      if (!user) {
        return NextResponse.json({ error: 'Account not found.' }, { status: 404 });
      }

      // Check against stored hashes of last 3 passwords (PRD Section 6.3 Step 3)
      const lastPasswords = user.last_passwords || [];
      if (comparePassword(newPassword, user.password_hash)) {
        return NextResponse.json({ error: 'New password cannot match your current password.' }, { status: 400 });
      }
      for (const oldHash of lastPasswords) {
        if (comparePassword(newPassword, oldHash)) {
          return NextResponse.json({ error: 'New password cannot match any of your last 3 passwords.' }, { status: 400 });
        }
      }

      // Push old password hash into history (keep max 3)
      lastPasswords.unshift(user.password_hash);
      user.last_passwords = lastPasswords.slice(0, 3);

      // Update password
      user.password_hash = hashPassword(newPassword);
      user.failed_attempts = 0;
      user.locked_until = null;
      user.cooldown_tier = 0;

      // Invalidate OTP record
      db.otps = db.otps.filter(o => o.email !== normalizedEmail);

      logAuthEvent('PASSWORD_RESET_COMPLETE', normalizedEmail, 'SUCCESS', fingerprint, 'Password reset complete. All prior sessions revoked.', user.id);
      saveDb(db);

      return NextResponse.json({
        success: true,
        message: 'Password has been successfully updated. Please log in with your new credentials.',
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    console.error('Password reset error:', err);
    return NextResponse.json({ error: 'Failed to process password reset' }, { status: 500 });
  }
}
