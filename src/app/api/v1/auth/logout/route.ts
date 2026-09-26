import { NextRequest, NextResponse } from 'next/server';
import { extractAuthUser, logAuthEvent, getClientFingerprint } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const user = extractAuthUser(req);
  const fingerprint = getClientFingerprint(req);

  if (user) {
    logAuthEvent('LOGOUT', user.email, 'SUCCESS', fingerprint, 'User logged out', user.userId);
  }

  const response = NextResponse.json({ success: true, message: 'Logged out successfully' });
  response.cookies.delete('stocksense_access_token');
  response.cookies.delete('stocksense_refresh_token');

  return response;
}
