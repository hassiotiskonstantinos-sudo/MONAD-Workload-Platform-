import { google, calendar_v3 } from 'googleapis';
import { prisma } from './prisma';

const CALENDAR_PREFIX = process.env.CALENDAR_EVENT_PREFIX || '[MONAD]';

async function getCalendarClient(userId: string): Promise<calendar_v3.Calendar | null> {
  const account = await prisma.account.findFirst({
    where: { userId, provider: 'google' },
  });

  if (!account?.access_token) return null;

  const oauth2Client = new google.auth.OAuth2(
    process.env['GOOGLE_CLIENT_ID'],
    process.env['GOOGLE_CLIENT_SECRET']
  );

  oauth2Client.setCredentials({
    access_token: account.access_token,
    refresh_token: account.refresh_token,
    expiry_date: account.expires_at ? account.expires_at * 1000 : undefined,
  });

  // Handle token refresh
  oauth2Client.on('tokens', async (tokens) => {
    const updateData: Record<string, unknown> = {};
    if (tokens.access_token) updateData.access_token = tokens.access_token;
    if (tokens.expiry_date) updateData.expires_at = Math.floor(tokens.expiry_date / 1000);
    if (tokens.refresh_token) updateData.refresh_token = tokens.refresh_token;

    await prisma.account.update({
      where: { id: account.id },
      data: updateData,
    });
  });

  return google.calendar({ version: 'v3', auth: oauth2Client });
}

export async function getCalendarEvents(
  userId: string,
  date: Date
): Promise<calendar_v3.Schema$Event[]> {
  const cal = await getCalendarClient(userId);
  if (!cal) return [];

  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { workloadCalendarId: true },
    });

    const calendarId = user?.workloadCalendarId || 'primary';

    const res = await cal.events.list({
      calendarId,
      timeMin: startOfDay.toISOString(),
      timeMax: endOfDay.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 50,
    });

    return res.data.items || [];
  } catch {
    return [];
  }
}

export async function getFreeBusy(
  userId: string,
  date: Date
): Promise<{ start: string; end: string }[]> {
  const cal = await getCalendarClient(userId);
  if (!cal) return [];

  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  try {
    const res = await cal.freebusy.query({
      requestBody: {
        timeMin: startOfDay.toISOString(),
        timeMax: endOfDay.toISOString(),
        items: [{ id: 'primary' }],
      },
    });

    const busy = res.data.calendars?.primary?.busy || [];
    return busy.map((b) => ({
      start: b.start || '',
      end: b.end || '',
    }));
  } catch {
    return [];
  }
}

export async function createCalendarEvent(
  userId: string,
  params: {
    title: string;
    description?: string;
    startTime: string;
    endTime?: string;
    allDay?: boolean;
  }
): Promise<string | null> {
  const cal = await getCalendarClient(userId);
  if (!cal) return null;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { workloadCalendarId: true },
  });

  const calendarId = user?.workloadCalendarId || 'primary';
  const summary = `${CALENDAR_PREFIX} ${params.title}`;

  try {
    const event: calendar_v3.Schema$Event = {
      summary,
      description: params.description,
    };

    if (params.allDay) {
      const dateStr = params.startTime.split('T')[0];
      event.start = { date: dateStr };
      event.end = { date: dateStr };
    } else {
      event.start = { dateTime: params.startTime };
      event.end = { dateTime: params.endTime || params.startTime };
    }

    const res = await cal.events.insert({
      calendarId,
      requestBody: event,
    });

    return res.data.id || null;
  } catch {
    return null;
  }
}

export async function updateCalendarEvent(
  userId: string,
  eventId: string,
  params: {
    title?: string;
    description?: string;
    startTime?: string;
    endTime?: string;
    allDay?: boolean;
    done?: boolean;
  }
): Promise<boolean> {
  const cal = await getCalendarClient(userId);
  if (!cal) return false;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { workloadCalendarId: true },
  });

  const calendarId = user?.workloadCalendarId || 'primary';

  try {
    const existing = await cal.events.get({ calendarId, eventId });
    const event = existing.data;

    if (params.title) {
      event.summary = params.done
        ? `${CALENDAR_PREFIX} [DONE] ${params.title}`
        : `${CALENDAR_PREFIX} ${params.title}`;
    } else if (params.done && event.summary) {
      if (!event.summary.includes('[DONE]')) {
        event.summary = event.summary.replace(CALENDAR_PREFIX, `${CALENDAR_PREFIX} [DONE]`);
      }
    }

    if (params.description !== undefined) event.description = params.description;

    if (params.allDay && params.startTime) {
      const dateStr = params.startTime.split('T')[0];
      event.start = { date: dateStr };
      event.end = { date: dateStr };
    } else if (params.startTime) {
      event.start = { dateTime: params.startTime };
      if (params.endTime) event.end = { dateTime: params.endTime };
    }

    await cal.events.update({
      calendarId,
      eventId,
      requestBody: event,
    });

    return true;
  } catch {
    return false;
  }
}

export async function deleteCalendarEvent(
  userId: string,
  eventId: string
): Promise<boolean> {
  const cal = await getCalendarClient(userId);
  if (!cal) return false;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { workloadCalendarId: true },
  });

  const calendarId = user?.workloadCalendarId || 'primary';

  try {
    await cal.events.delete({ calendarId, eventId });
    return true;
  } catch {
    return false;
  }
}

export async function createWorkloadCalendar(userId: string): Promise<string | null> {
  const cal = await getCalendarClient(userId);
  if (!cal) return null;

  try {
    const res = await cal.calendars.insert({
      requestBody: {
        summary: 'MONAD Workload',
        description: 'Tasks and deliverables from MONAD Workload Platform',
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
    });

    const calendarId = res.data.id;
    if (calendarId) {
      await prisma.user.update({
        where: { id: userId },
        data: { workloadCalendarId: calendarId },
      });
    }

    return calendarId || null;
  } catch {
    return null;
  }
}
