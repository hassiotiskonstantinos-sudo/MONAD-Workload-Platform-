import { NextRequest } from 'next/server';
import { getSession, requireAuth, jsonOk, jsonError } from '@/lib/api-utils';
import { getCalendarEvents, getFreeBusy } from '@/lib/google-calendar';
import { prisma } from '@/lib/prisma';
import { UserRole } from '@prisma/client';

// GET /api/calendar/events?userId=xxx&date=2024-01-15
export async function GET(req: NextRequest) {
  const session = await getSession();
  const authErr = requireAuth(session);
  if (authErr) return authErr;

  const userId = req.nextUrl.searchParams.get('userId');
  const dateStr = req.nextUrl.searchParams.get('date');

  if (!userId) return jsonError('userId is required');

  const isManager = session!.user.role === UserRole.MANAGER;
  const isSelf = session!.user.id === userId;

  // Members can only see their own calendar
  if (!isManager && !isSelf) {
    return jsonError('Forbidden', 403);
  }

  const date = dateStr ? new Date(dateStr) : new Date();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { showEventTitles: true },
  });

  // Managers always see full details; members see their own; respect showEventTitles for others
  const showTitles = isSelf || user?.showEventTitles;

  if (showTitles) {
    const events = await getCalendarEvents(userId, date);
    return jsonOk({
      type: 'events',
      items: events.map((e) => ({
        id: e.id,
        summary: e.summary || 'Busy',
        start: e.start?.dateTime || e.start?.date,
        end: e.end?.dateTime || e.end?.date,
        status: e.status,
      })),
    });
  } else {
    const busy = await getFreeBusy(userId, date);
    return jsonOk({
      type: 'freeBusy',
      items: busy.map((b) => ({
        summary: 'Busy',
        start: b.start,
        end: b.end,
      })),
    });
  }
}
