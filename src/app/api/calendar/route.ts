import { NextRequest } from 'next/server';
import { getSession, requireManager, jsonOk, jsonError } from '@/lib/api-utils';
import { getCalendarEvents, getFreeBusy, createWorkloadCalendar } from '@/lib/google-calendar';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const session = await getSession();
  const err = requireManager(session);
  if (err) return err;

  const userId = req.nextUrl.searchParams.get('userId');
  const dateStr = req.nextUrl.searchParams.get('date');

  if (!userId) return jsonError('userId is required');

  const date = dateStr ? new Date(dateStr) : new Date();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { showEventTitles: true },
  });

  if (user?.showEventTitles) {
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

export async function POST(req: NextRequest) {
  const session = await getSession();
  const err = requireManager(session);
  if (err) return err;

  const body = await req.json();
  const { action, userId } = body;

  if (action === 'createWorkloadCalendar') {
    if (!userId) return jsonError('userId is required');
    const calendarId = await createWorkloadCalendar(userId);
    if (!calendarId) return jsonError('Failed to create calendar');
    return jsonOk({ calendarId });
  }

  return jsonError('Unknown action');
}
