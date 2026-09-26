import { NextRequest, NextResponse } from 'next/server';
import { getDb, saveDb } from '@/lib/db';
import { extractAuthUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const currentUser = extractAuthUser(req);
  const db = getDb();

  let notifications = db.notifications;
  if (currentUser) {
    notifications = notifications.filter(
      n => n.target_role === 'all' || n.target_role === currentUser.role
    );
  }

  const unreadCount = notifications.filter(n => !n.read).length;

  return NextResponse.json({
    notifications,
    unread_count: unreadCount,
  });
}

export async function PUT(req: NextRequest) {
  const db = getDb();
  try {
    const { notification_id, mark_all_read } = await req.json();

    if (mark_all_read) {
      db.notifications.forEach(n => { n.read = true; });
    } else if (notification_id) {
      const target = db.notifications.find(n => n.id === notification_id);
      if (target) target.read = true;
    }

    saveDb(db);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to update notifications' }, { status: 500 });
  }
}
