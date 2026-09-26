import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { NextRequest } from 'next/server';
import { User, AuthAuditLog, UserRole } from '@/types';
import { getDb, saveDb } from './db';

const JWT_SECRET = process.env.JWT_SECRET || 'stocksense_super_secure_jwt_secret_key_2026';
const REFRESH_SECRET = process.env.REFRESH_SECRET || 'stocksense_super_secure_refresh_secret_key_2026';

export interface TokenPayload {
  userId: string;
  email: string;
  role: UserRole;
  name: string;
  warehouseScope: string;
}

export function createAccessToken(user: User): string {
  const payload: TokenPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
    warehouseScope: user.warehouse_scope,
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' }); // 15-minute access token per PRD 6.4
}

export function createRefreshToken(user: User, rememberMe: boolean = false): string {
  const payload: TokenPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
    warehouseScope: user.warehouse_scope,
  };
  // 30 days if rememberMe, otherwise 8 hours per PRD 6.4
  const expiresIn = rememberMe ? '30d' : '8h';
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn });
}

export function verifyAccessToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch (err) {
    return null;
  }
}

export function verifyRefreshToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, REFRESH_SECRET) as TokenPayload;
  } catch (err) {
    return null;
  }
}

export function hashPassword(plain: string): string {
  return bcrypt.hashSync(plain, 10);
}

export function comparePassword(plain: string, hash: string): boolean {
  return bcrypt.compareSync(plain, hash);
}

export function logAuthEvent(
  eventType: AuthAuditLog['event_type'],
  email: string,
  outcome: 'SUCCESS' | 'DENIED' | 'FAILURE',
  fingerprint: string,
  details?: string,
  userId?: string
): void {
  const db = getDb();
  const entry: AuthAuditLog = {
    id: `aud_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    user_id: userId,
    user_email: email,
    event_type: eventType,
    ip_device_fingerprint: fingerprint,
    outcome,
    details,
    timestamp: new Date().toISOString(),
  };
  db.auth_audit_logs.unshift(entry);
  saveDb(db);
}

export function getClientFingerprint(req: NextRequest): string {
  const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
  const ua = req.headers.get('user-agent') || 'Unknown Device';
  // Shorten UA for clean log presentation
  let browser = 'Desktop Browser';
  if (ua.includes('Chrome')) browser = 'Chrome';
  else if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('Safari')) browser = 'Safari';
  else if (ua.includes('Edge')) browser = 'Edge';

  let os = 'Windows';
  if (ua.includes('Macintosh')) os = 'macOS';
  else if (ua.includes('Linux')) os = 'Linux';
  else if (ua.includes('Android')) os = 'Android Mobile';
  else if (ua.includes('iPhone')) os = 'iOS Mobile';

  return `${ip} (${browser} / ${os})`;
}

export function extractAuthUser(req: NextRequest): TokenPayload | null {
  // Check authorization header or cookie
  const authHeader = req.headers.get('authorization');
  let token: string | null = null;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else {
    token = req.cookies.get('stocksense_access_token')?.value || null;
  }

  if (!token) return null;
  return verifyAccessToken(token);
}
